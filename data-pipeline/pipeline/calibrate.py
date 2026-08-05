"""Fit the segregation coefficients to a MEASURED apex-to-toe profile.

WHY THIS EXISTS AS CODE RATHER THAN AS A PLAN. Two documents described this module and it did not
exist: `docs/methods/07_dem-calibration.md` said it grid-searches the segregation number, and
`docs/guides/03_dem-lane.md` quoted an import for it. That is the same defect this product spent a
release cycle removing everywhere else, so the honest repair is to write the module rather than to
soften the sentence.

WHAT IT FITS. `bedblend` derives the segregation number per load from the drop, the face angle and the
material, so `Sr` is not a knob. What IS anchored rather than measured is the pair of coefficients
underneath that derivation:

    PERCOLATION_COEFFICIENT   kappa in q = kappa (U/H) d, in bedblend.facesegregation
    PECLET_DEFAULT            Pe = Sr / Dr, sieving against remixing, in bedblend.segregation

A single measured profile constrains BOTH, because they act on different features of it. `Sr` sets how
far down the face the separation completes; `Pe` sets how sharp the interface is when it gets there.
The pure 2005 model has only one shape and could not separate them, which is another reason the
remixing term earns its place.

WHAT A CALLER SUPPLIES. An observed coarse fraction sampled at evenly spaced stations from apex to toe,
and the material's own fine fraction before it sorted. The source is free text and is carried into the
result so a number can always be traced to the pour it came from.

The fit is a bounded GRID SEARCH, not an optimiser. A gradient method's convergence path differs
between implementations and this product's determinism contract does not allow that.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from bedblend.segregation import NZ_DEFAULT, FlowingLayer

# The published mass distribution of a cascade, the same one `facesegregation` imposes: material
# "aggregates more at the bottom of the dumping area ... and less near the top crest". A calibration
# that used a different deposition profile from the engine would be fitting a different model.
_MASS_LEAN = (0.35, 0.65)

# The search grids. Sr is bounded by the range of the source's own worked examples, widened; Pe by the
# range Gray and Chugunov fit against chute data, widened. Both are coarse-to-fine in two passes, so
# the result is reproducible and the cost is bounded.
SR_BOUNDS = (0.05, 12.0)
PE_BOUNDS = (2.0, 40.0)
GRID = 48


@dataclass(frozen=True)
class Calibration:
    """The fitted coefficients and the honest error bar on them."""

    sr: float
    pe: float
    rmse: float
    n_points: int
    source: str
    phi0: float
    profile: list[float] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "sr": round(self.sr, 4),
            "pe": round(self.pe, 3),
            "rmse": round(self.rmse, 5),
            "n_points": self.n_points,
            "source": self.source,
            "phi0": round(self.phi0, 4),
        }


def profile_at(sr: float, phi0: float, n_bins: int, *, pe: float) -> list[float]:
    """The local COARSE fraction in each station from apex (0) to toe, at a given ``sr`` and ``pe``.

    This is the same march `bedblend.facesegregation.segregate_face` performs, with the overrun left
    out: a laboratory pour has no bench for material to roll beyond, so including a term for it would
    fit the engine's operational estimate rather than the physics the profile measures.
    """
    n = max(int(n_bins), 2)
    lo, span = _MASS_LEAN
    s = [(k + 0.5) / n for k in range(n)]
    w = [lo + span * v for v in s]
    total = sum(w)
    w = [v / total for v in w]

    layer = FlowingLayer(phi0=phi0, sr=max(sr, 0.0), nz=NZ_DEFAULT, pe=pe)
    dx = 1.0 / n
    remaining = 1.0
    out: list[float] = []
    for k in range(n):
        layer.advance(dx)
        deposit = w[k]
        if deposit <= 0.0 or remaining <= 1e-12:
            out.append(0.0)
            continue
        phi_dep, _rest = layer.split_base(min(1.0, deposit / remaining))
        out.append(1.0 - phi_dep)          # coarse is what the fine fraction is not
        remaining -= deposit
    return out


def _rmse(a: list[float], b: list[float]) -> float:
    return (sum((x - y) ** 2 for x, y in zip(a, b, strict=True)) / len(a)) ** 0.5


def _search(observed: list[float], phi0: float, sr_rng, pe_rng, grid: int):
    best = (float("inf"), sr_rng[0], pe_rng[0])
    n = len(observed)
    sr_step = (sr_rng[1] - sr_rng[0]) / max(grid - 1, 1)
    pe_step = (pe_rng[1] - pe_rng[0]) / max(grid - 1, 1)
    for i in range(grid):
        sr = sr_rng[0] + i * sr_step
        for j in range(grid):
            pe = pe_rng[0] + j * pe_step
            err = _rmse(profile_at(sr, phi0, n, pe=pe), observed)
            if err < best[0]:
                best = (err, sr, pe)
    return best


def fit(
    observed_coarse: list[float],
    *,
    phi0: float,
    source: str,
    fit_peclet: bool = True,
    pe: float | None = None,
    grid: int = GRID,
) -> Calibration:
    """Grid-search the coefficients whose continuum profile best matches ``observed_coarse``.

    ``observed_coarse`` is the coarse fraction at evenly spaced stations from APEX to TOE, so it must
    be given toe-last. ``phi0`` is the FINE fraction of the material before it sorted, which is
    ``1 - coarse_fraction``; passing the coarse fraction by mistake is the easiest way to fit
    nonsense, so it is validated.

    ``fit_peclet=False`` with an explicit ``pe`` holds the remixing fixed and fits ``Sr`` alone, which
    is the right call when the profile has too few stations to constrain a shock's thickness.

    ``grid`` is the resolution of each of the two passes. The default costs a couple of minutes, which
    is nothing for something that runs once per release, and the tests drop it so they stay quick.
    """
    if len(observed_coarse) < 3:
        raise ValueError("a profile needs at least three stations to constrain anything")
    if not all(0.0 <= v <= 1.0 for v in observed_coarse):
        raise ValueError("coarse fractions must lie in [0, 1]")
    if not 0.0 < phi0 < 1.0:
        raise ValueError(
            f"phi0={phi0} is the FINE fraction and must be strictly between 0 and 1; "
            f"a material that is all one species cannot segregate"
        )

    pe_rng = PE_BOUNDS if fit_peclet else (pe if pe is not None else 12.0,) * 2
    err, sr, pe_hat = _search(observed_coarse, phi0, SR_BOUNDS, pe_rng, grid)

    # A second, finer pass around the winner. Two coarse-to-fine passes beat one dense grid at the
    # same cost, and both are deterministic.
    span_sr = (SR_BOUNDS[1] - SR_BOUNDS[0]) / grid
    span_pe = (pe_rng[1] - pe_rng[0]) / grid
    err, sr, pe_hat = _search(
        observed_coarse,
        phi0,
        (max(SR_BOUNDS[0], sr - span_sr), min(SR_BOUNDS[1], sr + span_sr)),
        (max(pe_rng[0], pe_hat - span_pe), min(pe_rng[1], pe_hat + span_pe)) if fit_peclet
        else pe_rng,
        grid,
    )

    return Calibration(
        sr=sr,
        pe=pe_hat,
        rmse=err,
        n_points=len(observed_coarse),
        source=source,
        phi0=phi0,
        profile=profile_at(sr, phi0, len(observed_coarse), pe=pe_hat),
    )
