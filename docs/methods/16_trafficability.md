# Method 16: trafficability, reachability and routing

**Family:** operations · **Rung:** SOTA · **Tier:** precomputed · `bedblend/truck.py`

## What it computes

Three questions, and keeping them separate is the whole method.

1. **Can a truck STAND here?** The local surface gradient at a cell.
2. **Can a truck GET here from the loading point?** A flood fill over drivable ground.
3. **What route did it drive?** An A-star solve from the shovel to the spot, and back out.

## The fact everything rests on

Fresh material stands at its angle of repose, about 37 degrees. A haul truck climbs roughly

    g_max = tan(theta_repose) / 1.5

which is about 0.50, or 27 degrees. **A truck therefore never stands on fresh material.** Everywhere
it can go, it can go because the original ground was drivable, or the dozer made it drivable.

## Standing is a CENTRAL DIFFERENCE, not the steepest neighbour

This was wrong, and it was wrong in a way that quietly disabled the whole model.

The first version marked a cell undrivable if ANY of its eight neighbours was steep. That measure is
correct for an angle-of-repose check and wrong for trafficability, and the difference is not subtle:
on a pile at repose it condemns the whole perimeter, the whole crest and the toe of every face,
because each of those cells has one steep neighbour. **The working level was therefore unreachable by
construction.** Measured on a clean 8 m platform with a correctly graded ramp cut into it: 30 of 1296
cells reachable, and the ramp cells themselves read as impassable while their along-ramp gradient was
exactly at the limit, because the SPOIL BESIDE THEM was not.

A central difference asks what a truck actually cares about, which is how the ground tilts underneath
it:

    g(c) = | ( dz/dx , dz/dy ) |

With that, the same platform came out 1286 of 1296 reachable.

## Reaching is a PER-STEP test

Whether the next cell can be driven to is a different question from whether either cell is standable,
and it is asked separately, per step, by both the flood fill and the router:

    | z(b) - z(a) | / run(a, b)  <=  g_max

A gentle shelf on the far side of a six-metre step is standable and unreachable, and only the
per-step test says so. The router uses the same rule as the flood fill, deliberately, so that
"reachable" and "routable" cannot disagree and strand a load the mask promised was servable.

## Why a flood fill rather than repeated routing

Choosing where a truck can spot means asking "is this reachable" for many candidate positions.
Answering that with one A-star solve per candidate is quadratic, and it was measured taking a build
from 40 seconds to over 500. One flood fill answers it for every cell on the pad at once, after which
a single A-star produces the path that is actually drawn.

## The goal cell is exempt

A truck spots AT the crest, and a crest is by definition steep on one side. Requiring the discharge
cell to be flat would make it impossible to ever tip over an edge, which is the entire edge-dumping
campaign. The flood fill therefore includes one ring of cells adjacent to the reachable set, and the
router exempts the goal.

## Spotting, and the offset that is recorded

The planned tip is tried first, so a feasible plan is followed exactly. If it cannot be reached the
truck spots at the nearest workable ground, which is what happens on site, where "dozer operators
determine how haul trucks access the dump or stockpile and in what order". The deviation is RECORDED,
because the gap between planned and actual dump locations is real, is what a fleet-management export
shows, and is a genuine measure of how good the plan was.

**The alternative spot has to be inside the dump area.** Without that constraint the offset is a
licence to tip in the haul road: measured on the reference scenario, 284 of 402 placed loads landed
outside their own area, the road silted up, the loading point was buried under material nobody
planned to put there, and from that moment the flood fill returned nothing reachable anywhere on the
pad and every remaining load was refused.

## Refusal is a result, not an error

A tip that cannot be reached is refused and recorded with a reason. Refusals are the honest measure
of a plan laid out once against a pile that grows away from it. They are reported in the manifest, in
the app, and on this page rather than being smoothed away.

## Sources

Dozer operators determining truck access and order: Baffinland, Life-of-Mine Waste Rock Management
Plan, 2017.

The dump record a fleet-management system emits, which is what the planned-versus-actual comparison
is written against: Young and Rogers, *Minerals* 11(6), 636, 2021, doi:10.3390/min11060636.

## Where it fails

**The gradient limit is one number for one machine class.** Real trafficability depends on the
surface, the weather, the tyre and the load, and a laden truck climbing differs from an empty one
descending. The model uses one limit in both directions.

**There is no traffic.** Trucks do not queue, pass, or wait for each other, and the fleet exists only
so that consecutive loads carry different truck identities. Cycle time is not modelled.
