# Guide: run the precompute pipeline

## Setup

```bash
py -3.13 -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt -r requirements-dev.txt
.venv/Scripts/python -m pytest tests -q
.venv/Scripts/python -m ruff check data-pipeline tests scripts
```

For the offline engines, add `-r requirements-precompute.txt`.

## A sandboxed run

```bash
python data-pipeline/run.py single --output build/smoke
```

`--output` is mandatory for anything that is not an intentional release bake. A pytest run in another
repository on this product line once overwrote a committed bake, and two releases shipped it.

## The canonical bake

```bash
python data-pipeline/run.py
```

This writes `data/derived/<case>/{trace,metrics}.json`, `data/derived/manifests/<case>.json`,
`data/derived/manifests/index.json` and `data/derived/matrix.json`, then runs the release gate. It takes
a few minutes: 17 cases at 31 seeds each.

## Validate an existing tree

```bash
python data-pipeline/run.py --validate-only
```

Checks completeness (every registered case present), integrity (every trace still hashes to what its
manifest recorded), the invariants and control verdicts recorded at bake time, and lane honesty (no case
tagged `live` while the gate recorded a reason it should not be).

## Regenerate the derived documentation and the case registry

```bash
python scripts/export_cases.py        # frontend/src/engine/cases.generated.ts
python scripts/gen_docs.py            # docs/cases/*.md and docs/data-contract.md
python scripts/make_arch_svgs.py      # the five architecture-modal diagrams
```

Each has a `--check` mode that CI runs, so a stale generated file fails the build instead of quietly
disagreeing with the code.
