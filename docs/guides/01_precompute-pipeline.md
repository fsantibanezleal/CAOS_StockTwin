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

This writes one folder per scenario, `data/derived/<case>/{manifest,plan,loads,field,cuts,sectors,
frames,volume}.json`, plus the rolled-up `data/derived/index.json`, and runs the gate on what it
wrote. Twenty-two scenarios, one seed each, and it is not fast: routing every load, flooding the pad
for reachability and relaxing the whole field after every operation is tens of seconds per few
hundred loads, so the full matrix is tens of minutes even run in parallel.

`--output` writes somewhere else and is what CI and every test use. Omitting it writes the CANONICAL
tree, which is the one the site serves, so the default is deliberately the one that hurts if you get
it wrong.

## Validate an existing tree

```bash
python scripts/check_artifacts.py
```

Checks what is COMMITTED rather than what a run had in memory. Completeness in both directions, which
is the half that is easy to miss: every scenario the registry DECLARES must be shipped, not merely
every shipped scenario well formed, because a validator that iterates the output cannot see something
absent. Then the invariants re-read from the files: zero cell pairs over the angle of repose, the
ledger agreeing with the terrain, mass conserved to one part in a million, no cell below original
ground. Then the reclaim must be watchable and served: reclaim frames present on every sequential
case, a position on every cut, and a truck routed to it.

## Regenerate the derived documentation and the case registry

```bash
python scripts/gen_docs.py            # docs/scenarios/*.md and docs/data-contract.md
```

It has a `--check` mode that CI runs, so a stale generated page fails the build instead of quietly
disagreeing with the code.

There is no case-registry export: the TypeScript mirror of the case list is gone with the TypeScript
engine, so there is no second copy to drift. And there is no architecture-diagram generator: ADR-0058
makes those five files hand-authored source, and the generator that used to own them is exactly what
let the whole set drift as one block.
