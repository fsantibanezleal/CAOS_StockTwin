# StockTwin

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_StockTwin/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_StockTwin/actions)
[![License](https://img.shields.io/github/license/fsantibanezleal/CAOS_StockTwin)](LICENSE)
[![Version](https://img.shields.io/github/v/tag/fsantibanezleal/CAOS_StockTwin?label=version&sort=semver)](https://github.com/fsantibanezleal/CAOS_StockTwin/tags)

**A stockpile you can watch being built and taken apart, with every reclaimed tonne traced back to the
trucks it came from.**

Haul trucks deposit loads onto a pad. The pile relaxes to its angle of repose. Granular size
segregation redistributes material along every avalanche path, so the toe ends up coarser than the
crest. A reclaimer takes cuts that blend the stacked layers back together, and how well it blends
depends entirely on how the pile was built and how far the machine can reach into it.

StockTwin simulates that, measures it, and shows the working.

## The three questions it answers

**How much does a stockpile homogenize the feed?** As the variance reduction ratio,

```
VRR = var_out / var_in            lower is better
```

always with a multi-seed credible band, and always drawn against the independent-layer bound `1 / N`.
Never alone: if the `N` layers a cut crosses were independent the ideal would be `1/N`, and real
blending beds recover only about a quarter to a third of that. A number without that comparison
overstates the benefit by roughly an order of magnitude.

**Where did this reclaimed tonne come from?** Every pad cell owns an ordered stack of lots, each
carrying the deposition event it came from. A reclaim cut reports the fraction of its tonnage that came
from each dump, and those fractions sum to one, checked numerically on every cut of every case.

**How much is size segregation biasing the cut?** The flowing layer on each avalanche is solved with
the Gray and Thornton kinetic-sieving model, so coarse-at-the-toe is an OUTPUT of the physics rather
than a rule written into the code.

## What it is not

- Not in-plant metal accounting. No metal balance, no plant mass balance, no production ledger.
- Not a comminution or flotation model.
- Not a blending optimizer. It exposes the per-cell grade field and the reclaim-front state an
  optimizer would consume; it does not solve the linear program.
- It emits no plant setpoint.

## The method ladder

Fifteen methods, two of them learned. Each has to pass a vertical acceptance gate before it may appear
as a tab: a real engine, pinned dependencies, calibration where applicable, inference, held-out
evaluation, artifacts, tests, and a documentation page. A name in a selector is not a method.

| Rung | Methods |
|---|---|
| **Classical** | relaxation with an imposed angle of repose; five stacking geometries (chevron, windrow, cone shell, strata, chevcon); four reclaim geometries (full-face, bucket wheel, end, front-end loader); the variance reduction ratio; experimental variograms; the `1/N` independent-layer bound; the residence-time distribution; geostatistical stream synthesis |
| **SOTA** | Gray-Thornton kinetic segregation solved as a conservation law; the Makse stratification regime; the depth-averaged mu(I) reclaim-face slump; a discrete-element ground-truth heap; the per-cell lot ledger with reclaim provenance |
| **Beyond the published state of this problem** | a learned variance-reduction surrogate and a learned segregation-profile surrogate, both conditional on beating a multiple-regression baseline on the same corpus, and both reported as a negative result if they do not |

## The case matrix

Seventeen cases in five categories, three of them controls with numerical kill criteria.

| Category | Cases |
|---|---|
| Stacking geometry | chevron, windrow, cone shell, strata, chevcon |
| Reclaim method | bucket wheel, end reclaim, front-end loader (chevron plus full-face is the reference) |
| Input variability | short range, long range, trending, bimodal |
| Segregation regime | strong kinetic sieving, the stratifying regime |
| Controls | perfect mixer, zero segregation, starvation |

The controls are what make the rest believable. The perfect mixer must reproduce the `1/N` bound inside
its band; the zero-segregation control must leave every lot's size split exactly untouched; the
starvation control must empty the pile and say so, without a negative or NaN tonnage.

## Benchmark anchors

The stacking axis is scored against published results, not only against itself:

| Anchor | Value | Source |
|---|---|---|
| Cone shell, circular pile, optimised | VRR 0.232 | Loubser and de Korte 2015, doi:10.17159/2411-9717/2015/v115n8a15 |
| Chevcon, circular pile, optimised | VRR 0.121 | the same, Table IV |
| Chevcon plus a full-face reclaimer | about ten to one variance reduction | Bond, Coursaux and Worthington 2000 |
| A real blending bed | mixing effect 5 to 7.5 at 200 to 600 layers | Schramm, AT MINERALS PROCESSING 06/2021 |

Those digits are NOT reproduction targets: they come from a differently dimensioned circular pile, and
the source is internally inconsistent about them. The test is ordinal and magnitude-level, it is written
down before the run, and it either passes or is reported as a failure.

## Data

**Synthetic lane, committed:** ore bodies from
[`oreblocks`](https://github.com/fsantibanezleal/CAOS_OreBlocks) plus an exponential-covariance grade
stream, both seeded and byte-reproducible, labelled synthetic everywhere.

**Real lane, never committed:** MineLib published block models carry real copper grades and tonnages.
MineLib grants academic download only, with no redistribution, so the instances are fetched at runtime
into browser memory and appear nowhere in this repository or in the built bundle.

There is no open truck-by-truck dump log with grades at a usable licence. That was searched and the
verdict recorded. A dump log is a derived artefact of a block model plus a dig sequence, so the product
generates one rather than pretending a public one exists.

## Run it locally

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m ruff check data-pipeline tests

# a sandboxed bake; NEVER omit --output unless this is an intentional release bake
.\.venv\Scripts\python.exe -m stlab.pipeline G01_chevron --output build\smoke --band-seeds 3
```

The canonical bake, the web build and the deploy are separate operations. Deployment verifies the
committed artifacts and publishes them; it never runs science.

## Documentation

The [`docs/`](docs/) wiki carries the theory, the equations, the real DOIs and the caveats: a page per
method, a page per case, and one per framework the offline lane depends on. Start at
[`docs/README.md`](docs/README.md).

## License

MIT. Developed by Felipe Santibáñez-Leal.
