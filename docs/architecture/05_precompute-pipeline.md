# The precompute pipeline

Ten named stages, each a pure, deterministic, seeded, typed and independently testable function with
an explicit contract to the next. None is a no-op and none prints a command it pretends to run.

`ingest -> preprocess -> dataset -> features -> calibrate -> train -> infer -> evaluate -> export -> validate`

`calibrate` is the one domain stage inserted beyond the archetype's frozen list, and it is where the
segregation-number calibration is settled and its residual recorded.

## Running it

```bash
python data-pipeline/run.py                        # every case, canonical bake
python data-pipeline/run.py single
python data-pipeline/run.py single --output build/smoke
python data-pipeline/run.py --validate-only
```

## The sandbox rule

The canonical bake is an explicit release operation and tests MUST pass `--output`. That is not a
style rule: in another repository on this product line a pytest run overwrote a committed bake and two
releases shipped it. One test in this suite asserts that the smoke run did not touch the canonical
tree.

## The three separate operations

The bake writes the artifacts. The web build copies those already-audited artifacts and compiles the
bundle. The deploy verifies the committed hashes and publishes. They never merge, and a deployment is
never an experiment.
