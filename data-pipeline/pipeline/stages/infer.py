"""Stage 7, infer: run every promised method over the held-out case matrix.

One entry point per method family, so the completeness gate in ``validate`` can check that each of them
actually produced a result for each case rather than being skipped. A method that raises here fails the
bake; a method that is genuinely unavailable on this host (the discrete-element lane, which needs a
conda environment) records an explicit ``unavailable`` verdict with its reason, and the Benchmark page
renders that verdict instead of a number. An empty cell is never averaged away.
"""
from __future__ import annotations

import time
from typing import Any

from bedblend import blending, rtd
from bedblend.run import RunConfig, input_variogram, output_variogram, simulate
from bedblend.stream import cumulative_tonnes


def run_case(case: Any, seed: int) -> dict:
    """Simulate one case and return every measured quantity the product displays.

    The wall-clock is measured here and used for the lane decision, but it is NOT written into the
    committed manifest: a manifest has to be a pure function of parameters and seed, or every re-bake
    dirties the git history of the scientific evidence and a real change becomes indistinguishable
    from a re-run.
    """
    cfg: RunConfig = case.config(seed)
    dumps = case.dumps(seed)
    t0 = time.perf_counter()
    result = simulate(cfg, dumps)
    run_ms = (time.perf_counter() - t0) * 1000.0

    res = [c.residence_s for c in result.cuts]
    wts = [c.tonnes for c in result.cuts]
    hist = rtd.histogram(res, wts)
    refs = rtd.fifo_lifo_references(
        [d.t_s for d in result.dumps], [d.tonnes for d in result.dumps],
        [c.t_s for c in result.cuts], wts)
    pos, label = rtd.character(hist["mean_s"], refs["fifo_mean_s"], refs["lifo_mean_s"])

    return {
        "result": result,
        "run_ms": run_ms,
        "vario_in": input_variogram(result.dumps),
        "vario_out": output_variogram(result.cuts),
        "rtd": {**hist, **refs, "position": pos, "character": label,
                "dimensionless_variance": rtd.dimensionless_variance(hist["mean_s"], hist["var_s2"])},
        "mixing_effect": blending.mixing_effect(result.metrics.var_in, result.metrics.var_out),
        "cum_tonnes": cumulative_tonnes(result.dumps),
    }


def multi_seed(case: Any, seeds: list[int]) -> dict:
    """Repeat a case over several seeds and return the metric distribution, not a point number.

    A point number with no interval is a defect in this product line, and here it would also be an
    inflation: the variance reduction ratio of a single realisation is itself a random variable, and
    quoting whichever draw looks best is the easiest way to overstate what a bed achieves.
    """
    runs = [run_case(case, s) for s in seeds]
    vrrs = sorted(r["result"].metrics.vrr for r in runs)
    effs = sorted(r["result"].metrics.efficiency for r in runs)
    segs = sorted(r["result"].metrics.segregation_index for r in runs)

    def band(xs: list[float]) -> dict:
        n = len(xs)
        return {"p05": xs[max(0, int(0.05 * n))], "p50": xs[n // 2],
                "p95": xs[min(n - 1, int(0.95 * n))], "n": n}

    return {
        "vrr": band(vrrs), "efficiency": band(effs), "segregation_index": band(segs),
        "worst_mass_residual_t": max(abs(r["result"].metrics.mass_residual_t) for r in runs),
        "any_starved": any(r["result"].starved for r in runs),
        "mean_run_ms": sum(r["run_ms"] for r in runs) / len(runs),
    }
