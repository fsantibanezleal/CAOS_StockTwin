# The lane gate

A method runs live only if the MEASUREMENT allows it. The verdict and the numbers go into the
manifest, and CI fails on a mislabelled lane. A method tagged `live` whose measured runtime breaches
its budget is a build failure, not a warning.

`stlab/core/gate.py::classify_lane()`

## The budgets, and where they come from

| budget | value | why that number |
|---|---|---|
| `run_ms` | 100 ms | the slider-to-redraw budget. Above it the App stops feeling like an instrument. |
| `frame_ms` | 8 ms | sixty frames a second leaves 16.7 ms for everything, and the renderer needs half. |
| `trace_bytes` | 2 MB | a static bundle on a cold content-delivery-network fetch. |

## The one measured exception

Multi-seed credible bands need 31 full simulations. Producing one on every control move would be
exactly the compute bomb the no-autoplay rule exists to prevent, so the bands are baked offline and
the live single-seed result is drawn AGAINST them. That is stated on the page rather than left for a
reader to infer.

## What the gate does not do

It does not decide whether a method is CORRECT, only whether it is affordable. Correctness is the
invariant audit and the control kill criteria in `stages/evaluate.py`.
