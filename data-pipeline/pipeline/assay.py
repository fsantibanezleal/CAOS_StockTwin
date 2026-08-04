"""A multi-element assay for each load, generated from shared geological factors.

WHY THIS IS NOT ONE NUMBER. A stockpile is not characterised by its copper grade. It is characterised
by everything the plant will meet when the material arrives, and by the fact that those quantities sit
at different places inside the pile because they were put there load by load. Shipping a single grade
per column was the reason the product could not answer the question it exists for.

WHY LATENT FACTORS AND NOT A CORRELATION MATRIX. The correlations in a real deposit come from shared
geology, so that is what is modelled: a hydrothermal intensity that drives the metals together, a
sulphide content that drives iron up and pH down, and an alteration intensity that drives clay up with
moisture following it. Each variable then takes its own independent component. Copper and molybdenum
end up correlated because they came from the same hydrothermal system, not because anyone typed a
coefficient.

THE RANGES ARE SOURCED, and the sources are in `wip/stocktwin/multi-element-assay-2026-08-03.md`
with their links. In brief: porphyry feed averages 0.4 to 0.8 percent Cu; Chilean porphyries are
molybdenum-rich, with Escondida's superleached capping measured at 10 to 480 ppm Mo and El Salvador
carrying 220 ppm; a Cu-Mo porphyry sits an order of magnitude below the 0.2 to 2.0 g/t Au of a Cu-Au
porphyry; clay minerals in Chilean porphyry deposits run from simple kaolinite to complex
chamosite and illite groups.

WHAT IS NOT CLAIMED. This is a plausible, sourced, seeded synthetic assay. No operation's data was
used, nothing here is fitted to a deposit, and the recovery expression is a teaching form that carries
the SIGNS the literature establishes rather than calibrated coefficients. Every scenario is labelled
synthetic in the app for exactly this reason.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

# Variables the product reports, with the unit and the range the generator targets. The app reads
# this table so the selector, the units and the documentation cannot drift from the generator.
VARIABLES: list[dict] = [
    {"key": "cu", "label": "Cu", "unit": "%", "lo": 0.30, "hi": 1.10, "decimals": 3},
    {"key": "mo", "label": "Mo", "unit": "ppm", "lo": 20.0, "hi": 450.0, "decimals": 0},
    {"key": "au", "label": "Au", "unit": "g/t", "lo": 0.01, "hi": 0.30, "decimals": 3},
    {"key": "ag", "label": "Ag", "unit": "g/t", "lo": 0.5, "hi": 6.0, "decimals": 2},
    {"key": "fe", "label": "Fe", "unit": "%", "lo": 1.5, "hi": 7.0, "decimals": 2},
    {"key": "clay", "label": "clay", "unit": "%", "lo": 1.0, "hi": 18.0, "decimals": 1},
    {"key": "ph", "label": "natural pH", "unit": "", "lo": 4.0, "hi": 8.5, "decimals": 2},
    {"key": "moisture", "label": "moisture", "unit": "%", "lo": 1.5, "hi": 12.0, "decimals": 2},
    {"key": "recovery", "label": "estimated recovery", "unit": "%", "lo": 58.0, "hi": 94.0, "decimals": 1},
]

KEYS: tuple[str, ...] = tuple(v["key"] for v in VARIABLES)


@dataclass(frozen=True)
class Assay:
    """One load's full assay. `cu` is the same quantity the blending metric is computed on."""

    cu: float
    mo: float
    au: float
    ag: float
    fe: float
    clay: float
    ph: float
    moisture: float
    recovery: float

    def as_dict(self) -> dict[str, float]:
        return {k: getattr(self, k) for k in KEYS}


class _Gauss:
    """Box-Muller over a seeded LCG. Reproducible without numpy, which the pipeline does not need."""

    def __init__(self, seed: int) -> None:
        self._x = (seed * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)
        self._spare: float | None = None

    def _u(self) -> float:
        self._x = (self._x * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)
        return ((self._x >> 11) + 0.5) / float(1 << 53)

    def next(self) -> float:
        if self._spare is not None:
            v, self._spare = self._spare, None
            return v
        a, b = self._u(), self._u()
        r = math.sqrt(-2.0 * math.log(a))
        self._spare = r * math.sin(2.0 * math.pi * b)
        return r * math.cos(2.0 * math.pi * b)


def _clip(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else hi if v > hi else v


def assay_for(cu: float, *, block: int, seed: int) -> Assay:
    """The full assay for a load whose copper grade has already been decided.

    Copper comes IN rather than being generated here, because it is produced by the dig-sequence
    model and carries the shovel-dwell autocorrelation that the whole blending argument rests on.
    Everything else is generated around it, sharing the same block-level factors so that material
    from one dig block is geologically coherent.
    """
    # Block-level factors: material from the same dig block shares its geology.
    gb = _Gauss(seed * 1_000_003 + block)
    hydro_b = gb.next()
    sulph_b = gb.next()
    alter_b = gb.next()

    # Load-level noise: within a block, individual loads still differ.
    gl = _Gauss(seed * 7_919 + block * 131 + int(cu * 1e6))
    hydro = 0.75 * hydro_b + 0.25 * gl.next()
    sulph = 0.75 * sulph_b + 0.25 * gl.next()
    alter = 0.75 * alter_b + 0.25 * gl.next()

    # The metals ride the hydrothermal factor together, and each keeps its own component.
    mo = _clip(180.0 + 95.0 * hydro + 45.0 * gl.next(), 20.0, 450.0)
    au = _clip(0.080 + 0.045 * hydro + 0.022 * gl.next(), 0.010, 0.300)
    ag = _clip(2.20 + 1.10 * hydro + 0.55 * gl.next(), 0.50, 6.00)

    # Iron is sulphide, and oxidising sulphide is what drives the ground acid. One factor, two
    # variables, opposite signs: that is the whole reason pH belongs in the same generator.
    fe = _clip(3.40 + 1.30 * sulph + 0.45 * gl.next(), 1.50, 7.00)
    ph = _clip(7.20 - 0.95 * sulph + 0.30 * gl.next(), 4.00, 8.50)

    # Alteration produces the clay, and clay is what holds the water: fine kaolinite holds water to
    # about half the solids weight and montmorillonite to about seventy percent.
    clay = _clip(6.5 + 3.6 * alter + 1.4 * gl.next(), 1.0, 18.0)
    moisture = _clip(4.5 + 0.28 * (clay - 6.5) + 0.9 * gl.next(), 1.5, 12.0)

    # RECOVERY IS A RESPONSE VARIABLE, predicted from the primaries, which is how a geometallurgical
    # block model is actually built. Recovery rises with head grade and is penalised by the two known
    # deleterious constituents: clay, which adsorbs water and destroys the froth, and pyritic iron,
    # which dilutes the concentrate.
    recovery = _clip(
        88.5 + 9.0 * (cu - 0.55) - 0.55 * clay - 0.9 * max(0.0, fe - 3.0) + 0.4 * gl.next(),
        58.0, 94.0,
    )

    return Assay(
        cu=round(cu, 4), mo=round(mo, 0), au=round(au, 4), ag=round(ag, 3),
        fe=round(fe, 3), clay=round(clay, 2), ph=round(ph, 2),
        moisture=round(moisture, 2), recovery=round(recovery, 2),
    )
