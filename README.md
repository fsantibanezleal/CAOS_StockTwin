# StockTwin

[![CI](https://img.shields.io/github/actions/workflow/status/fsantibanezleal/CAOS_StockTwin/ci.yml?branch=main&label=CI)](https://github.com/fsantibanezleal/CAOS_StockTwin/actions)
[![License](https://img.shields.io/github/license/fsantibanezleal/CAOS_StockTwin)](LICENSE)
[![Version](https://img.shields.io/github/v/tag/fsantibanezleal/CAOS_StockTwin?label=version&sort=semver)](https://github.com/fsantibanezleal/CAOS_StockTwin/tags)

**A run-of-mine stockpile built the way one is actually built: by trucks, one load at a time,
following a dump plan, on ground they have to be able to climb.**

A truck routes over the trafficable surface, spots against the working face, tips, and leaves. The
material stands at its angle of repose. A dozer turns the tipped heaps into a floor so the next lift
can start higher than the last. Size segregation sorts each load down the face it ran out on, so the
toe ends up coarser than the crest. A reclaim campaign then takes cuts through the layers, and how
well it blends depends entirely on how the pile was built.

**A stockpile is the inverse of an open pit.** Benches go up instead of down, with the same
primitives: a working level, a face at repose, a berm, an overall slope, and a ramp with a width and
a gradient. Material is placed in a designed order for the same reason it is extracted in one.

StockTwin simulates that, measures it, and shows the working.

## The fact the whole product turns on

Fresh material stands at about 37 degrees. A haul truck climbs about two thirds of that. **So a truck
never stands on fresh material.**

That is why there is a plan at all. Tip positions are not arbitrary points on a pad: they are laid out
inside designed areas, in benches, reachable from an access point over a ramp the dozer maintains. As
the pile grows, what a truck can reach changes, and a tip it can no longer reach is REFUSED and
recorded. Between 41 and 53 percent of planned tips are refused in the shipped scenarios. That number
is reported rather than hidden: the plan is generated once while the pile grows away from it, a real
operation re-plans, and saying so is more useful than quietly teleporting a truck somewhere it could
not have driven.

## The three questions it answers

**How much does a stockpile homogenize the feed?** As the variance reduction ratio,

```
VRR = var_out / var_in            lower is better
```

drawn against the independent-layer bound `1 / N`. If the `N` layers a cut crosses were independent
the ideal would be `1/N`, and real blending beds recover only about a quarter to a third of that. A
number without that comparison overstates the benefit by roughly an order of magnitude. Where the
effective layer count cannot be estimated reliably the bound is WITHHELD rather than shown wrong.

**Where did this reclaimed tonne come from?** Every pad cell owns an ordered stack of lots, each
carrying the deposition event it came from. A reclaim cut reports the fraction of its tonnage that came
from each dump, and those fractions sum to one, checked numerically on every cut of every scenario.

**How much is size segregation biasing the cut?** The flowing layer on each avalanche is solved with
the Gray and Thornton kinetic-sieving model, down a REAL face taken from the terrain rather than down a
nominal slope. A load that never ran out on a face is not sorted at all, which is why the coarse
fraction across a shipped pile spans 0.000 to 0.483 rather than sitting at a uniform 0.350.

## How the pile is built

Two phases, because that is how a bench is built.

**Phase one, paddock dumps.** The truck tips short of the crest and the load stands as an elliptical
frustum sized by the truck body, initially near 2:1 and settling to repose. A dozer levels the heaps
into a floor.

**Phase two, edge dumping.** The truck backs to the crest and tips over it. Each dump runs
perpendicular to the crest tangent, and the campaign advances the crest in radial sweeps until the
designed bench volume is filled.

Four measured dump profiles, selected by distance to the crest, calibrated against a published
envelope rather than invented: oval well back from the crest, comet approaching it, rectangular at
it, sloughed heap over it.

| dimension | measured envelope |
|---|---|
| length | 13 to 46 m |
| width | 11 to 23 m |
| thickness | 0.368 to 2.032 m |
| angle | 12 to 36 degrees |
| volume | 94 to 155 cubic metres |

## The engine is a separate package

The physics lives in [`bedblend`](https://pypi.org/project/bedblend/), published from its own
repository and consumed here as a pinned dependency. **This repository declares no package of its
own.** A product is deployed, not packaged; a reusable engine gets its own repo and its own PyPI
project.

`data-pipeline/` is a folder of product scripts invoked by path, not an importable module.

## The scenarios are the validation design

Six of them. Each states, in advance, why it is in the product and what result would mean the code is
wrong, and the bake gate enforces that on the ACTUAL artifact.

| scenario | what it is for | placed | refused | peak |
|---|---|---|---|---|
| `single` | one working stock, the reference case for reading the physics | 298 | 46.8% | 10.8 m |
| `yard` | three areas, loads routed to an area by their ore-control class | 419 | 53.4% | 11.1 m |
| `sidehill` | built against real relief, because only one of the five published fill types is a flat pad | 326 | 41.8% | 19.8 m |
| `valley` | confined on two sides, so the same tonnage stands higher | 328 | 41.4% | 26.6 m |
| `ridge` | the ground sheds material instead of holding it, and buildable ground is a strip | 329 | 41.2% | 29.8 m |
| `short_dwell` | changes ONLY the shovel dwell, to show the blending result follows the dig sequence | 298 | 46.8% | 10.8 m |

**The kill criteria held.** `valley` stands at 26.6 m against `single`'s 10.8 m from the same load
budget, which is what confinement means. `ridge` and `valley` both start from ground that is only 71.9
percent buildable before a single load is placed, against 100 percent for a flat pad. And
`short_dwell` is identical to `single` in every respect except the dwell, and its measured stream
range falls from 5956 t to 903 t.

The gate, run on the artifact rather than on the code that wrote it:

- zero cell pairs standing over the imposed angle of repose
- the lot ledger agreeing with the terrain column by column
- mass conserved to one part in a million of the volume placed
- no cell below its original ground

The predecessor to this engine finished with 446 over-steep pairs, the worst at 55.9 degrees against
an imposed 37, which is what the pile rendered as spikes. The cause was that a toppling cell gets
lower and destabilises the cells ABOVE it, while only the receivers were re-queued.

## Grade autocorrelation is an output, not a knob

A stockpile can only help to the extent that consecutive trucks differ. Consecutive trucks come from
the same dig block until the shovel moves, so the autocorrelation of the feed EMERGES from shovel
dwell rather than being set by a variogram parameter. `short_dwell` exists to demonstrate exactly
that, and the measured range moves by a factor of six and a half when nothing else does.

Sampling density is the reason the question matters at all. A per-truck record is one sample per 100
to 400 tonnes; conventional practice is closer to one per 175,000.

## What it is not

- Not in-plant metal accounting. No metal balance, no plant mass balance, no production ledger.
- Not a comminution or flotation model.
- Not a blending optimizer. It exposes the per-cell grade field and the reclaim-front state an
  optimizer would consume; it does not solve the linear program.
- Not a conveyor-stacker product. Chevron, windrow and cone shell are stacker geometries; trucks do
  not build a chevron bed, and offering those geometries alongside trucks is a category error that an
  earlier version of this product made.
- It emits no plant setpoint.

## Data

**Synthetic lane, committed:** seeded and byte-reproducible, labelled synthetic everywhere.

**Real lane, never committed:** MineLib published block models carry real copper grades and tonnages.
MineLib grants academic download only, with no redistribution, so the instances are fetched at runtime
into browser memory and appear nowhere in this repository or in the built bundle.

There is no open truck-by-truck dump log with grades at a usable licence. That was searched and the
verdict recorded. A dump log is a derived artefact of a block model plus a dig sequence, so the product
generates one rather than pretending a public one exists. The generated log follows the schema a
fleet-management system already emits: timestamp, grade identifier, assay, the name and bench height
of the dump location polygon, easting and northing, tonnage.

## Run it locally

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m ruff check data-pipeline tests scripts

# a sandboxed bake; NEVER omit --output unless this is an intentional release bake.
# invoked BY PATH: this repo declares no package.
.\.venv\Scripts\python.exe data-pipeline\run.py single --output build\smoke

cd frontend ; npm ci ; npm run dev
```

The canonical bake, the web build and the deploy are separate operations. Deployment verifies the
committed artifacts and publishes them; it never runs science.

## Documentation

The [`docs/`](docs/) wiki carries the theory, the equations, the real DOIs and the caveats: a page per
method, a page per scenario, and one per framework the offline lane depends on. Start at
[`docs/README.md`](docs/README.md).

## License

MIT. Developed by Felipe Santibáñez-Leal.
