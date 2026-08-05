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
recorded. About 17 percent of the offered loads are refused in most of the shipped scenarios, and the
number is reported rather than hidden: the plan is generated once while the pile grows away from it, a
real operation re-plans, and saying so is more useful than quietly teleporting a truck somewhere it
could not have driven. Where the figure is far higher it is the scenario's subject, not a defect:
`intensive_feed` offers twice what the footprint can hold at repose, so 58.7 percent of it has
nowhere to go, and that ceiling is the thing the case exists to demonstrate.

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
fraction across a shipped pile spans 0.137 to 0.940 rather than sitting at the feed's uniform 0.350.

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

Twenty-two cases across six axes, against the ADR-0056 floor of a dozen. Each states in advance why it is
in the product and what result would mean the code is wrong, and the bake gate enforces that on the
ACTUAL artifact rather than on the code that wrote it.

| scenario | axis | placed | refused | peak | stream range | pairs over repose |
|---|---|---|---|---|---|---|
| `single` | reference | 744 | 17.3% | 13.7 m | 5242 t | 0 |
| `short_dwell` | feed | 744 | 17.3% | 13.7 m | 852 t | 0 |
| `long_dwell` | feed | 744 | 17.3% | 13.7 m | 13826 t | 0 |
| `trending` | feed | 744 | 17.3% | 13.7 m | 5242 t | 0 |
| `erratic_feed` | feed | 744 | 17.3% | 13.7 m | 5374 t | 0 |
| `yard` | yard | 2232 | 17.3% | 14.0 m | 4480 t | 0 |
| `yard_five` | yard | 3383 | 24.8% | 14.4 m | 4226 t | 0 |
| `misrouted` | yard | 2223 | 17.7% | 14.3 m | 4480 t | 0 |
| `sidehill` | landform | 744 | 17.3% | 21.5 m | 5242 t | 0 |
| `valley` | landform | 744 | 17.3% | 27.0 m | 5242 t | 0 |
| `cross_valley` | landform | 744 | 17.3% | 25.5 m | 5242 t | 0 |
| `rough_ground` | landform | 744 | 17.3% | 17.4 m | 5242 t | 0 |
| `intensive_feed` | campaign | 744 | 58.7% | 13.7 m | 5610 t | 0 |
| `intensive_drain` | campaign | 744 | 17.3% | 13.6 m | 5242 t | 0 |
| `light_drain` | campaign | 744 | 17.3% | 13.7 m | 5242 t | 0 |
| `two_phase` | campaign | 1488 | 17.3% | 14.5 m | 5610 t | 0 |
| `concurrent` | campaign | 744 | 17.3% | 12.5 m | 5242 t | 0 |
| `surge` | campaign | 744 | 17.3% | 12.5 m | 5242 t | 0 |
| `short_bench` | operations | 545 | 39.4% | 11.6 m | 5242 t | 0 |
| `narrow_ramp` | operations | 744 | 17.3% | 12.5 m | 5242 t | 0 |
| `seldom_dozed` | operations | 744 | 17.3% | 13.0 m | 5242 t | 0 |
| `wet_material` | operations | 881 | 2.1% | 15.8 m | 5242 t | 0 |

**The kill criteria held.** Shovel dwell moves the measured stream range from 852 t at four loads per
dig block, through 5242 at twenty, to 13826 at sixty, with the geometry and the seed held identical:
the blending result follows the dig sequence and not the ore. Confinement takes the valley to 27.0 m
against the flat pad's 13.7 from the same load budget. Wet material at 43 degrees of repose stands at
15.8 m where the same tonnage at 37 stands at 13.7. A narrower ramp and a slower dozer both cost
placement, and neither improves it.

**Every one of the twenty-two relaxes to zero cell pairs over the angle of repose.**

The gate, run on the artifact rather than on the code that wrote it:

- zero cell pairs standing more than the stability tolerance over the imposed angle of repose
- the lot ledger agreeing with the terrain column by column
- mass conserved to one part in a million of the volume placed
- no cell below its original ground

The predecessor to this engine finished with 446 over-steep pairs, the worst at 55.9 degrees against
an imposed 37, which is what the pile rendered as spikes.

**Two withdrawn scenarios, and what that costs.** A steep sidehill and a ridge crest will not relax:
after the sweeps stop making progress and a stalled cascade is reseeded, they leave 22 pairs at 45.9
degrees and 1 pair at 41.5 respectively. They are withdrawn rather than shipped with a surface the
product's own invariant rejects, and rather than widening the tolerance to fit them. The consequence
is that the matrix covers heaped, sidehill, valley and cross-valley ground, plus unprepared rough
ground, and NOT all five published fill types. Recorded as finding F-020.

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

Everything is in [`scripts/local/`](scripts/local/), numbered in the order you run it. PowerShell is
the primary shell; every script has a `.sh` twin with the same behaviour.

```powershell
.\scripts\local\00_install-prereqs.ps1     # check Python 3.12+, Node 22+, git. Installs nothing without -Install
.\scripts\local\01_init.ps1                # both venvs, the frontend packages. Idempotent
.\scripts\local\03_dev.ps1                 # http://localhost:5173
```

```bash
./scripts/local/00_install-prereqs.sh
./scripts/local/01_init.sh
./scripts/local/03_dev.sh
```

**A fresh clone runs without generating anything.** There is no `.env`, no backend, no database and no
secret: the 22 baked scenarios are committed in `data/derived/`, so `01_init` then `03_dev` is the
whole path from clone to a running app.

To regenerate the artifacts, which takes about half an hour for all 22:

```powershell
.\scripts\local\02_generate-data.ps1                 # all, into build/local, nothing tracked touched
.\scripts\local\02_generate-data.ps1 -Scenario yard  # one case
.\scripts\local\02_generate-data.ps1 -Release        # all, then install as canonical
```

[`scripts/local/README.md`](scripts/local/README.md) documents each script, its options, and how to
run the release gates.

The canonical bake, the web build and the deploy are separate operations. Deployment verifies the
committed artifacts and publishes them; it never runs science.

## Documentation

The [`docs/`](docs/) wiki carries the theory, the equations, the real DOIs and the caveats: a page per
method, a page per scenario, and one per framework the offline lane depends on. Start at
[`docs/README.md`](docs/README.md).

## License

MIT. Developed by Felipe Santibáñez-Leal.
