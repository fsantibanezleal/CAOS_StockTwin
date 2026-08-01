"""Stage 2, preprocess: validated records into canonical units and a regular clock.

Small on purpose. The ingestion contract already rejects what is out of range, so this stage does only
what a real grade-control feed genuinely needs: it fills a missing coarse fraction from the file's own
median rather than from a global default, and it regularises the event clock so that a log recorded
with duplicate timestamps still produces a monotone sequence.
"""
from __future__ import annotations

from bedblend.schema import TruckDump


def run(dumps: list[TruckDump], *, min_gap_s: float = 1.0) -> list[TruckDump]:
    """Return dumps with a strictly increasing clock and no missing size information."""
    if not dumps:
        return []
    known = sorted(d.coarse_frac for d in dumps if d.coarse_frac > 0)
    med = known[len(known) // 2] if known else 0.35

    out: list[TruckDump] = []
    last = float("-inf")
    for d in dumps:
        t = d.t_s if d.t_s > last else last + min_gap_s
        last = t
        cf = d.coarse_frac if d.coarse_frac > 0 else med
        out.append(TruckDump(d.event_id, t, d.truck_id, d.source_id, d.tonnes, d.grade_cu_pct,
                             d.grade_au_gpt, cf, d.moisture_pct, d.x_m, d.y_m))
    return out
