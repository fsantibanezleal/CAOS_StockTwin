"""Stage 4, features: the design matrix the surrogates learn from.

WHAT THE SURROGATE IS ASKED TO PREDICT, and why these are the inputs. The question a planner actually
has is "given how variable my feed is, and how I intend to build and reclaim this pile, what variance
reduction will I get?". The inputs are therefore the things a planner knows BEFORE building: the
variogram of the incoming stream, the stacking method, the pass count, the reclaim method, the
segregation number, and the pad aspect. Nothing derived from the run's own output may appear here, or
the surrogate would be predicting a result from itself.

The categorical variables are one-hot rather than ordinal. Encoding five stacking methods as 0 to 4
would tell the model that chevcon is "more" than chevron, which is meaningless and which a linear
baseline would happily fit.
"""
from __future__ import annotations

import math

from bedblend.run import RECLAIM_METHODS
from bedblend.stacking import METHODS as STACK_METHODS

FEATURE_NAMES: tuple[str, ...] = (
    "log_range_t",          # log10 of the input variogram practical range, in tonnes
    "sill_norm",            # input variance divided by the squared mean, a dimensionless spread
    "log_n_passes",         # log10 of the stacker pass count
    "sr",                   # Gray-Thornton segregation number
    "log_layer_tonnes",     # log10 of the tonnage laid down per pass; range over this is what matters
    "aspect",               # pad length over width
    *(f"stack_{m}" for m in STACK_METHODS),
    *(f"reclaim_{m}" for m in RECLAIM_METHODS),
)


def row(*, range_t: float, var_in: float, mean_in: float, n_passes: int, sr: float,
        total_tonnes: float, nx: int, ny: int, stacking: str, reclaim: str) -> list[float]:
    """One feature vector, in the fixed order of ``FEATURE_NAMES``."""
    layer_t = max(1.0, total_tonnes / max(1, n_passes))
    base = [
        math.log10(max(1.0, range_t)),
        (var_in / (mean_in * mean_in)) if mean_in > 0 else 0.0,
        math.log10(max(1.0, float(n_passes))),
        float(sr),
        math.log10(layer_t),
        float(nx) / float(max(1, ny)),
    ]
    base += [1.0 if stacking == m else 0.0 for m in STACK_METHODS]
    base += [1.0 if reclaim == m else 0.0 for m in RECLAIM_METHODS]
    return base


def target_vrr(vrr: float) -> float:
    """The surrogate learns log10(VRR), not VRR.

    VRR spans two orders of magnitude across the corpus and is bounded below by zero. Regressing it
    directly makes the loss dominated by the worst-blending configurations, and lets a model predict a
    negative variance ratio, which is not a number. In log space the target is unbounded, roughly
    symmetric, and a fixed relative error costs the same everywhere.
    """
    return math.log10(max(1e-6, vrr))


def inverse_vrr(y: float) -> float:
    return 10.0 ** y
