# data-pipeline/, the offline bake

This directory turns the scenario registry into the artifacts the app renders. It is **not a package**
and it is not the physics.

**The physics is [`bedblend`](https://pypi.org/project/bedblend/)**, published from its own repository
and consumed pinned in `requirements.txt`. A product that declares its own package advertises a
library nobody can install, so this repo declares none: `data-pipeline/` is product-specific plumbing
invoked by path.

## Layout

| Path | What it is |
|---|---|
| `run.py` | the CLI, invoked BY PATH: `python data-pipeline/run.py [all\|<case>] --output <dir>` |
| `pipeline/scenarios.py` | the scenario registry, `SCENARIOS`, grouped by category, with every knob per case |
| `pipeline/bake.py` | the orchestrator: builds a pile with `bedblend`, runs the reclaim campaign, writes the artifacts |
| `pipeline/assay.py` | the synthetic multi-element assay, sourced to published porphyry ranges |
| `pipeline/kill_es.py` | the Spanish kill-criterion strings, kept beside the English ones in the registry |
| `pipeline/io/contract.py` | **CONTRACT 1**, the ingestion gate for an external truck dump log |
| `pipeline/io/formats.py` | the standard readers and writers |
| `pipeline/data/` | small reference data committed with the repo |

## Running it

```bash
# every scenario, into a scratch directory
python data-pipeline/run.py all --output build/check

# one scenario
python data-pipeline/run.py yard --output build/check
```

**Omit `--output` only for an intentional canonical bake** into `frontend/public/data`. A test run
that writes the committed artifacts is how a pytest run once clobbered a release, so the default is
deliberately the one that hurts if you get it wrong, and CI always passes `--output`.

To install a completed bake into the committed tree, use `scripts/install_bake.py`, which refuses a
partial one:

```bash
python scripts/install_bake.py <bake-output-dir>
```

## The two lanes

`scripts/setup.{sh,ps1}` creates both:

- **`.venv`** is the runtime lane, `requirements.txt`, which is what ships and what CI installs. It
  carries the pinned `bedblend` and nothing heavy.
- **`.venv-pipeline`** is the offline lane, `data-pipeline/requirements.txt` plus dev tooling, for
  anything too heavy to be a runtime dependency. The DEM calibration lane (`environment-dem.yml`) is
  separate again, because PyChrono is published only on conda-forge.

Then `scripts/precompute.{sh,ps1}` runs the bake. See
[../docs/architecture/05_precompute-pipeline.md](../docs/architecture/05_precompute-pipeline.md) for
what the bake produces, and [../docs/data-contract.md](../docs/data-contract.md) for the contract it
enforces on external data.
