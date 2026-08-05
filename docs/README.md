# StockTwin, the internal wiki

The theory, the equations, the real DOIs and the caveats behind every method the product ships. It is
authored as each unit lands, not bolted on at the end: a method's engine, its invariant tests and its
page here go in the same commit, because the context that makes a page deep is gone by the time the
build is over.

## Where to look

| Theme | What it holds |
|---|---|
| [architecture/](architecture.md) | the repository shape, determinism, the lane gate, the staged pipeline, evaluation, deploy |
| [methods/](methods.md) | one page per method: what it computes, its equation, its source, its lane, and where it fails |
| [cases/](cases/README.md) | the coverage matrix, and one page per case with its kill criterion |
| [frameworks/](frameworks.md) | one card per engine the offline lane depends on: what, why, install, a runnable example |
| [guides/](guides/01_precompute-pipeline.md) | how to run the bake, bring your own data, run the discrete-element lane |
| [data-contract.md](data-contract.md) | both contracts, generated from the code that enforces them |

## The scope guardrail

StockTwin is open-pit stockpile pedagogy: the geometry, the segregation and the grade bookkeeping of a
physical pile. It is NOT in-plant metal accounting, NOT a comminution or flotation model, and NOT a
blending optimizer. It exposes the per-cell grade field and the reclaim-front state an optimizer would
consume, and it emits no plant setpoint.

## The one number to read carefully

    VRR = var_out / var_in            LOWER IS BETTER

The reciprocal convention also circulates in the literature, and the product's own plan was written
against it before the research pass caught it. Building on the wrong direction would have inverted
every number and made every comparison between stacking methods point the wrong way, so the formula
is rendered next to the value on every surface and pinned by a test.
