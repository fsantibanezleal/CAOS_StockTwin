"""The measured live-versus-precompute gate (ADR-0054, ADR-0057 clause 5).

A method runs LIVE in the browser only if the measurement says it can. The verdict and the numbers go
into the manifest, and CI fails on a mislabelled lane. This is a measurement, never a hand-wave, and a
method tagged live whose measured runtime breaches the budget is a build failure rather than a warning.

THE BUDGETS, and where they come from rather than being round numbers someone liked:

* ``RUN_MS_GATE`` 100 ms. The slider-to-redraw budget. Above it the App stops feeling like an
  instrument and starts feeling like a form submission, which is the difference the ADR-0070 focus
  route exists to protect.
* ``FRAME_MS_GATE`` 8 ms for one relaxation sweep. Sixty frames a second leaves 16.7 ms for everything,
  and the renderer needs at least half of it. A sweep over budget moves into a worker.
* ``TRACE_BYTES_GATE`` 2 MB. A static bundle on a cold content-delivery network fetch.

WHY THIS PRODUCT'S LIVE LANE IS TYPESCRIPT RATHER THAN PYODIDE. The two live algorithms are a height
field relaxation and a per-column hyperbolic solve, both trivially expressible over typed arrays, and
both needing to answer inside the 100 ms budget on every slider move. A Pyodide cold start plus
per-frame marshalling cannot meet that. The gate records the measured runtime that justifies the
choice, so the decision is evidence rather than preference.
"""
from __future__ import annotations

RUN_MS_GATE = 100.0
FRAME_MS_GATE = 8.0
TRACE_BYTES_GATE = 2 * 1024 * 1024

# The live lane is TypeScript, so there is no wheel set to police. The field is kept because the
# manifest schema is shared across the product line and a consumer reads it positionally.
LIVE_RUNTIME = "typescript"


def classify_lane(
    *,
    runtime: str,
    run_ms: float,
    trace_bytes: int,
    sweep_ms: float | None = None,
) -> dict:
    """Decide the lane from measurements and return the verdict with its evidence.

    The measured ``run_ms`` is used for the DECISION but is deliberately not stored: the committed
    manifest has to be a pure function of ``(params, seed)`` or every re-run dirties git with a
    wall-clock difference. The verdict, the budgets and the deterministic byte count are recorded
    instead, and the live runtime is measured again in the browser where it actually matters.
    """
    reasons: list[str] = []
    live = True
    if runtime != LIVE_RUNTIME:
        live = False
        reasons.append(f"runtime {runtime!r} is not the live lane ({LIVE_RUNTIME!r})")
    if run_ms > RUN_MS_GATE:
        live = False
        reasons.append(f"run exceeds the {RUN_MS_GATE:.0f} ms interaction budget")
    if trace_bytes > TRACE_BYTES_GATE:
        live = False
        reasons.append(f"trace_bytes {trace_bytes} exceeds {TRACE_BYTES_GATE}")
    if sweep_ms is not None and sweep_ms > FRAME_MS_GATE:
        reasons.append(f"relaxation sweep {sweep_ms:.1f} ms exceeds {FRAME_MS_GATE:.0f} ms; "
                       "the sweep belongs in a worker")
    return {
        "lane": "live" if live else "precompute",
        "runtime": runtime,
        "trace_bytes": trace_bytes,
        "run_ms_budget": RUN_MS_GATE,
        "frame_ms_budget": FRAME_MS_GATE,
        "trace_bytes_budget": TRACE_BYTES_GATE,
        "reasons": reasons,
    }
