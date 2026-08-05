# scripts/local

Everything needed to run StockTwin on a fresh machine, in numeric order.

All scripts resolve paths relative to the repo root, so they can be invoked from anywhere. PowerShell
is the primary shell; each script has a `.sh` twin with the same behaviour, differing only where the
platform forces it.

They run under **Windows PowerShell 5.1**, which is what ships with Windows, as well as PowerShell 7.
That is why every string literal in them is plain ASCII: 5.1 reads a `.ps1` as CP-1252 unless the file
carries a UTF-8 BOM, so an em-dash inside a string can silently terminate it.

**On a fresh machine, run them in order:**

    00_install-prereqs  ->  01_init  ->  03_dev

`02_generate-data` is invoked automatically by `01_init` when `data/derived/` is empty. Run it on its
own only when you want to regenerate the artifacts.

## Two things worth knowing before you start

**There is no `.env` and nothing to provision.** This product has no backend, no database and no
secret. It is a static site over committed artifacts, so a fresh clone is already runnable and there
is no config file you forgot.

**The artifacts are committed.** `data/derived/` holds the 22 baked scenarios the deployed site
serves, so you do not need to generate anything to run the app. Generating takes about half an hour;
running takes seconds.

---

## `00_install-prereqs`

System-level prerequisites. Python 3.12 or newer and Node 22 or newer, matching what CI pins, plus
git. Idempotent.

```powershell
.\scripts\local\00_install-prereqs.ps1
```

```bash
./scripts/local/00_install-prereqs.sh
```

**Both versions only CHECK. Neither installs anything unless you ask.** On PowerShell, `-Install`
lets it use `winget`; on Linux and macOS there is no package manager to assume, so the bash version
only ever names what is missing.

```powershell
.\scripts\local\00_install-prereqs.ps1 -Install
```

Checking is the default because the first version of this script had a bug that reported an already
installed Python 3.13 as missing and reinstalled it. A setup script that replaces working system
software without being asked is a hazard, not a convenience.

If Python or Node was just installed, open a new terminal and re-run so `PATH` refreshes.

Conda is deliberately not installed. The DEM calibration lane needs PyChrono, which is published only
on conda-forge, and nothing in the main build depends on it. See
[`docs/guides/03_dem-lane.md`](../../docs/guides/03_dem-lane.md).

## `01_init`

One-stop setup from a fresh clone. Idempotent; every step checks first, so re-running costs seconds.

1. validates the Python and Node versions
2. creates `.venv`, the runtime lane, and installs `requirements.txt` plus dev tooling
3. creates `.venv-pipeline`, the offline lane, and installs `requirements-precompute.txt`
4. installs the frontend packages with `npm ci`
5. generates the artifacts only if `data/derived/` is empty

```powershell
.\scripts\local\01_init.ps1
.\scripts\local\01_init.ps1 -Force        # rebuild venvs and node_modules
.\scripts\local\01_init.ps1 -WithData     # regenerate the artifacts too
```

```bash
./scripts/local/01_init.sh
FORCE=1 ./scripts/local/01_init.sh
WITH_DATA=1 ./scripts/local/01_init.sh
```

**Why two virtual environments.** `.venv` is the runtime lane, and it is what ships and what CI
installs: the pinned `bedblend` engine and nothing heavy. `.venv-pipeline` is the offline lane, for
anything too heavy to be a runtime dependency. Keeping them apart is what stops a development
convenience becoming a deployment weight.

## `02_generate-data`

Creates the scientific artifacts: builds every stockpile with the `bedblend` engine, runs the reclaim
campaign, and writes what the app renders.

```powershell
.\scripts\local\02_generate-data.ps1                  # all, into build/local
.\scripts\local\02_generate-data.ps1 -Scenario yard   # one case
.\scripts\local\02_generate-data.ps1 -Release         # all, then install as canonical
```

```bash
./scripts/local/02_generate-data.sh
SCENARIO=yard ./scripts/local/02_generate-data.sh
RELEASE=1 ./scripts/local/02_generate-data.sh
```

**The default writes to a sandbox and touches nothing tracked.** Overwriting the committed artifacts
needs `-Release`, and that is deliberate: a run that wrote them is how a release was once clobbered.
Even then, `scripts/install_bake.py` refuses a partial bake, because a tree mixing two engine versions
passes every per-scenario check there is.

`-Release` will not bake a single case, for the same reason.

All 22 scenarios take roughly half an hour. A single case takes seconds to a couple of minutes;
`sidehill` and `yard_five` are the slow ones at several minutes each.

## `03_dev`

Runs the app locally against the committed artifacts. No backend is started, because there is none:
what you see locally is what the deployed site serves.

```powershell
.\scripts\local\03_dev.ps1
.\scripts\local\03_dev.ps1 -Port 5180
.\scripts\local\03_dev.ps1 -Preview     # build, then serve the built site
```

```bash
./scripts/local/03_dev.sh
PORT=5180 ./scripts/local/03_dev.sh
PREVIEW=1 ./scripts/local/03_dev.sh
```

Use `-Preview` when you want to check the production bundle rather than the dev server, which is what
the release gates run against.

---

## Verifying a change

The scripts above are for running. To check a change, run what CI runs:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check data-pipeline tests scripts
.\.venv\Scripts\python.exe scripts\check_artifacts.py        # CONTRACT 2 over the committed tree
.\.venv\Scripts\python.exe scripts\check_method_ladder.py    # every SOTA method is code the bake runs
.\.venv\Scripts\python.exe scripts\gen_docs.py --check
cd frontend ; npm test
```

The two browser gates need a served build, which `03_dev.ps1 -Preview` provides:

```bash
node frontend/test/focus-flow.mjs      http://127.0.0.1:4173
node frontend/test/reclaim-visible.mjs http://127.0.0.1:4173
```

[`docs/architecture/03_the-gate.md`](../../docs/architecture/03_the-gate.md) explains what each gate
catches and, for most of them, the defect that made it necessary.

## The older scripts beside this folder

`scripts/setup`, `scripts/precompute`, `scripts/dev` and `scripts/smoke` are the product archetype's
shape and still work; the numbered scripts here call them or do the same work. If you are new to the
repo, use the numbered ones: they are ordered, they check their prerequisites, and they tell you what
to run next.
