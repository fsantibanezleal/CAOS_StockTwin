# Overview

## The repository is the product

The website is a companion surface and one consumer of the repository's outputs. A third party should
be able to clone this and, with documented commands, validate data through the ingestion contract,
build the case matrix, bake every case, evaluate every method and reproduce the published benchmark,
without opening a browser once.

## The shape

```
data-pipeline/stlab/
  model/      the shared analytic core: heightfield, segregation, pile, stacking, blending, rtd, stream, run
  io/         contract.py (CONTRACT 1), schema.py, formats.py
  core/       rng.py, trace.py, manifest.py (CONTRACT 2), gate.py
  stages/     the ten named pipeline stages
  cases/      the seventeen-case matrix with its kill criteria
  pipeline.py the orchestrator and CLI
frontend/src/
  engine/     the TypeScript mirror of model/, plus the GENERATED case registry
  pages/      the six pages and the focus route
  viz/        the 3-D pile, the uPlot wrapper, the Sankey, the panels
  lib/        artifact fetchers and the TypeScript mirror of CONTRACT 2
data/derived/ the committed traces, metrics and manifests
tests/        the invariant suite
docs/         this wiki
```

## The rework boundary

The base is instantiated from the product archetype and not re-litigated: the folder layout, the two
contracts, the named staged pipeline, the measured lane gate, the two-venv split, the CI guards. All
the rework lands in the core: the models and algorithms, the visualization, and the content.

## Two guards against drift between the lanes

The same science exists twice, in Python for the bake and in TypeScript for the browser. Two things
keep them from diverging silently:

* **The contract mirror.** `frontend/src/lib/contract.types.ts` restates the artifact schema in
  TypeScript, so a change to the Python writer that the browser does not expect fails `tsc --noEmit`,
  which is part of the build.
* **The generated case registry.** `scripts/export_cases.py` emits the case matrix as TypeScript from
  the Python definitions, and CI re-runs it with `--check` and fails if the file is stale. Without
  this the browser could be running a slightly different experiment from the one the pipeline baked
  while both reported the same case ids, and nothing would notice.

The engine itself is mirrored by hand and read side by side. A generator there would hide the one
thing that matters, which is whether the two actually compute the same numbers; that is asserted by
comparing against a committed trace instead.
