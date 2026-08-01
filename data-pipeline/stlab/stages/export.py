"""Stage 9, export: the committed web artifacts and their manifests.

The processing-to-web contract. What leaves this stage is what the browser fetches, and nothing else
in the repository is allowed to be a source of truth for the app.

WHAT IS EXPORTED, AND WHAT IS NOT. The trace carries the EVENTS: the dumps, the cuts with their
provenance fractions, and a handful of height snapshots. It does NOT carry the verdicts. The variance
reduction ratio, the variograms, the efficiency against the ideal bound, the residence-time character
and the recommendation are all recomputed in the browser from these events. A reader can therefore
change a control, watch a number move, and know it was derived rather than looked up. A trace that
shipped a baked variance reduction ratio would be a slide, and its number would be unfalsifiable.

The multi-seed BANDS are the one exception, and for a stated reason: producing them needs thirty-plus
full simulations, which is a compute bomb on a slider. They are computed offline, shipped in
``metrics.json``, and the live single-seed result is drawn AGAINST them.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core.gate import LIVE_RUNTIME, classify_lane
from ..core.manifest import build_case_manifest, content_hash
from ..core.trace import build_trace
from ..io.formats import write_json


def run(
    *,
    case: Any,
    run_data: dict,
    band: dict,
    seed: int,
    flags: list[dict],
    invariants: dict,
    control: dict | None,
    derived_dir: str | Path,
    manifests_dir: str | Path,
    provenance: dict,
) -> dict:
    """Write ``trace.json`` and ``metrics.json`` for one case and return its manifest."""
    result = run_data["result"]
    derived = Path(derived_dir)
    manifests = Path(manifests_dir)

    trace = build_trace(result, seed=seed, sr=case.sr, n_passes=case.n_passes)
    trace_path = derived / case.id / "trace.json"
    trace_bytes = write_json(trace_path, trace)
    trace_sha = content_hash(trace)

    m = result.metrics
    metrics = {
        "case_id": case.id,
        "vrr": m.vrr, "vrr_band": [band["vrr"]["p05"], band["vrr"]["p95"]],
        "vrr_ideal": m.vrr_ideal, "n_layers_mean": m.n_layers_mean,
        "efficiency": m.efficiency,
        "efficiency_band": [band["efficiency"]["p05"], band["efficiency"]["p95"]],
        "mixing_effect": run_data["mixing_effect"],
        "var_in": m.var_in, "var_out": m.var_out, "mean_in": m.mean_in, "mean_out": m.mean_out,
        "toe_apex_grade_delta": m.toe_apex_grade_delta,
        "segregation_index": m.segregation_index,
        "segregation_band": [band["segregation_index"]["p05"], band["segregation_index"]["p95"]],
        "mass_residual_t": m.mass_residual_t,
        "variogram_in": run_data["vario_in"],
        "variogram_out": run_data["vario_out"],
        "rtd": run_data["rtd"],
        "invariants": invariants,
        "control": control,
        "seeds": band["vrr"]["n"],
    }
    write_json(derived / case.id / "metrics.json", metrics)

    gate = classify_lane(runtime=LIVE_RUNTIME, run_ms=run_data["run_ms"], trace_bytes=trace_bytes)
    manifest = build_case_manifest(
        case=case, seed=seed, artifact_rel=f"{case.id}/trace.json",
        trace_bytes=trace_bytes, trace_sha256=trace_sha, gate=gate, flags=flags,
        metrics={k: metrics[k] for k in ("vrr", "vrr_band", "vrr_ideal", "efficiency",
                                         "mixing_effect", "segregation_index", "n_layers_mean")},
        provenance=provenance,
    )
    write_json(manifests / f"{case.id}.json", manifest)
    return manifest
