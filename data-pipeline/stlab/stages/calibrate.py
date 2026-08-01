"""Stage 5, calibrate: fix the segregation number Sr against ground truth.

THE PARAMETER. Gray and Thornton's segregation number ``Sr = q L / (H U)`` (their eq 3.19) is the only
free quantity in the live segregation model. Everything else in it is geometry. So the honesty of the
whole segregation tier reduces to one question: where does ``Sr`` come from, and what is the error on
it?

TWO SOURCES, in order of preference.

1. **A discrete-element ground-truth heap.** ``stlab.stages.dem`` runs a small bidisperse pour in
   PyChrono, measures the resulting coarse-fraction profile from apex to toe, and this stage fits the
   ``Sr`` whose continuum solution best matches it. The fit residual is published, and it is the
   honest error bar on every segregation number the product shows.
2. **Published experimental segregation distances**, used when the DEM lane cannot run on the host.
   Gray and Thornton report the downslope distance over which a layer segregates completely as a
   function of ``Sr`` (their section 4 and figure 5), and Gray's 2018 review collects the
   experimental values. Calibrating against those is weaker but is honest as long as the product then
   does NOT describe the method as DEM-calibrated.

The plan's kill criterion for the DEM tier is explicit: if PyChrono cannot be made to run, method 7 is
DELISTED from the ladder, this stage falls back to source 2, and the Benchmark page says so.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..model.segregation import FlowingLayer

# Gray and Thornton (2005) show a layer with inflow concentration phi0 segregating completely at a
# non-dimensional distance of order 1/Sr; their figure 4 uses Sr = 1 and reports full segregation at
# x = 1. The published anchor used by the fallback path is therefore "complete segregation within one
# non-dimensional path length at Sr = 1", which is a statement of the model rather than a measurement.
PUBLISHED_ANCHOR = {"sr": 1.0, "full_segregation_x": 1.0, "source": "Gray and Thornton 2005, fig. 4"}


@dataclass(frozen=True)
class Calibration:
    sr: float
    rmse: float
    source: str
    n_points: int

    def as_dict(self) -> dict:
        return {"sr": self.sr, "rmse": self.rmse, "source": self.source, "n_points": self.n_points}


def profile_for(sr: float, phi0: float, n_steps: int = 24, nz: int = 32) -> list[float]:
    """Coarse fraction deposited at each step along one non-dimensional avalanche path.

    This is exactly what the pile does per dump, run in isolation so it can be compared against a DEM
    heap's measured apex-to-toe profile without the pad geometry in the way.
    """
    layer = FlowingLayer(phi0=phi0, sr=sr, nz=nz)
    dx = 1.0 / n_steps
    out: list[float] = []
    for k in range(n_steps):
        layer.advance(dx)
        # an equal share of the remaining layer is shed at each step
        base = 1.0 / (n_steps - k)
        phi_dep, _ = layer.split_base(min(0.95, base))
        out.append(1.0 - phi_dep)
    return out


def fit(observed_coarse: list[float], phi0: float, *, source: str,
        lo: float = 0.0, hi: float = 8.0, n_grid: int = 81) -> Calibration:
    """Grid-search the ``Sr`` whose continuum profile best matches an observed one.

    A grid search rather than an optimiser, for the same reason the variogram fit uses one: the
    parameter is one-dimensional and bounded, the objective is cheap, and a deterministic search gives
    identical results in the Python and TypeScript lanes where an optimiser's convergence path would
    not.
    """
    n = len(observed_coarse)
    if n < 4:
        return Calibration(sr=PUBLISHED_ANCHOR["sr"], rmse=float("nan"),
                           source=f"{source} (too few points, fell back to the published anchor)",
                           n_points=n)
    best = Calibration(sr=0.0, rmse=float("inf"), source=source, n_points=n)
    for k in range(n_grid):
        sr = lo + (hi - lo) * k / (n_grid - 1)
        pred = profile_for(sr, phi0, n_steps=n)
        err = sum((p - o) ** 2 for p, o in zip(pred, observed_coarse, strict=True)) / n
        rmse = err ** 0.5
        if rmse < best.rmse:
            best = Calibration(sr=sr, rmse=rmse, source=source, n_points=n)
    return best


def fallback() -> Calibration:
    """The published-anchor calibration, used when the DEM lane is unavailable."""
    return Calibration(sr=PUBLISHED_ANCHOR["sr"], rmse=float("nan"),
                       source=PUBLISHED_ANCHOR["source"], n_points=0)
