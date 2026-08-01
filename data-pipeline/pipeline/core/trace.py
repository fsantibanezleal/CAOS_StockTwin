"""CONTRACT 2, the compact replay artifact.

Its shape is mirrored by the TypeScript type, so a drift fails the web build.

WHAT GOES IN, AND WHAT DELIBERATELY DOES NOT. The trace carries the EVENTS and the GEOMETRY: the truck
dumps, the reclaim cuts with their provenance fractions, and a handful of height snapshots. It does not
carry the verdicts. The variance reduction ratio, the variogram, the efficiency against the ideal bound
and the recommendation are all RECOMPUTED in the browser from these events.

That separation is the RotorVitals principle and it is the reason the numbers on the page are auditable:
a reader can change a control, watch the metric move, and know the metric was derived rather than looked
up. A trace that shipped a baked VRR would be a slide, and its number would be unfalsifiable.

SIZE. The gate caps a committed trace at 2 MB. Snapshots dominate, so they are decimated to a fixed
count and rounded to a centimetre, which is well below the resolution anything in the product reads at.
"""
from __future__ import annotations

from bedblend.schema import RunResult

TRACE_SCHEMA = "stocktwin.trace/v1"


def build_trace(result: RunResult, *, seed: int, sr: float, n_passes: int) -> dict:
    """Serialise one run into the committed replay artifact."""
    pad = result.pad
    return {
        "schema": TRACE_SCHEMA,
        "case_id": result.case_id,
        "seed": seed,
        "pad": {
            "nx": pad.nx, "ny": pad.ny, "cell_m": pad.cell_m,
            "repose_deg": pad.repose_deg, "repose_coarse_deg": pad.repose_coarse_deg,
            "bulk_density_tpm3": pad.bulk_density_tpm3,
        },
        "config": {
            "stacking": result.stacking, "reclaim": result.reclaim,
            "n_passes": n_passes, "sr": sr,
        },
        "events": [
            {
                "id": d.event_id, "t": round(d.t_s, 1), "t_t": round(d.tonnes, 2),
                "cu": round(d.grade_cu_pct, 4), "au": round(d.grade_au_gpt, 4),
                "cf": round(d.coarse_frac, 4),
                "x": round(d.x_m, 2), "y": round(d.y_m, 2),
                "src": d.source_id,
            }
            for d in result.dumps
        ],
        "cuts": [
            {
                "id": c.cut_id, "t": round(c.t_s, 1), "t_t": round(c.tonnes, 2),
                "cu": round(c.grade_cu_pct, 4), "au": round(c.grade_au_gpt, 4),
                "cf": round(c.coarse_frac, 4), "n": c.n_layers,
                "res": round(c.residence_s, 1),
                # provenance as pairs, sorted by fraction so the Sankey draws its ribbons in a stable
                # order; fractions below 0.1 percent are dropped and their mass folded into the rest,
                # which keeps the artifact small without breaking the sum-to-one invariant
                "srcs": _compact_sources(c.sources),
            }
            for c in result.cuts
        ],
        "snapshots": result.height_snapshots,
        "final": {
            "h": result.height_final,
            "cf": result.coarse_final,
            "cu": result.grade_final,
        },
        "starved": result.starved,
    }


def _compact_sources(sources: dict[int, float], floor: float = 1e-3) -> list[list[float]]:
    """Drop negligible provenance fractions and renormalise, so the sum stays exactly one.

    Renormalising rather than simply truncating matters: the sum-to-one identity is a test invariant
    that the browser re-checks, and an artifact that quietly summed to 0.997 would fail it and look
    like a ledger bug rather than a rounding decision.
    """
    kept = {k: v for k, v in sources.items() if v >= floor}
    if not kept:
        kept = dict(sources)
    total = sum(kept.values()) or 1.0
    return [[int(k), round(v / total, 6)] for k, v in sorted(kept.items(), key=lambda kv: -kv[1])]
