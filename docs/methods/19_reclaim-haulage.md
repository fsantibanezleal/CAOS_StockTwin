# Method 19: reclaim haulage, the truck that comes for the material

**Family:** operations · **Rung:** SOTA · **Tier:** precomputed · `bedblend/reclaim.py::haul_cycle`

## What it computes

The haul cycle that takes a reclaimed cut off site: where the truck stands to be loaded, the route it
drove in EMPTY, and the route it drove out LOADED.

## Why it exists

It did not, and the absence was invisible. A cut recorded a tonnage, a grade, a provenance histogram
and the cells it engaged. The ore left the ledger correctly, every downstream number was right, and
**nothing on site carried it away.** Drawn on a stage, the pile lost volume with no machine in the
picture.

The build side had modelled its haul cycle from the first version: every load carries a routed
approach and a routed departure over trafficable ground, and a tip that cannot be reached is refused
with a reason. The reclaim side had none of that, and the asymmetry survived several releases because
the tonnages and the grades were correct. It was found by a reader asking the obvious question:
*how does it reclaim if no truck is coming to the site?*

## The mirror of the build

| | delivering | reclaiming |
|---|---|---|
| arrives | LOADED | EMPTY |
| leaves | EMPTY | LOADED |
| the machine at the pile | the truck itself, rear-dumping | a LOADER working the face |
| where it stands | against the working face, at the tip | beside the face, on drivable ground |
| refusal | no reachable spot for the tip | no reachable spot for the truck |

## The truck does not stand on the face

This is the constraint that makes the model honest rather than decorative. A loader digs a face; a
face stands at the angle of repose and a truck climbs about two thirds of that, which is the same
fact the whole product turns on. So the loader position and the truck position are **separate
fields**: the loader sits on the centroid of the cells the cut engaged, and the truck waits at the
nearest cell that is both

    passable(c)   the local gradient by central differences is within the truck limit
    reachable(c)  a flood fill from the sited loading point reaches it

Only cells satisfying both are candidates. A campaign that has cut away its own access therefore
reports a cut it **cannot serve**, exactly as the build reports a tip it cannot reach, and the
refusal is recorded rather than smoothed away by teleporting the ore off site. That refusal is the
point of modelling the haulage at all.

## The two legs are solved separately

    approach = A*( exit -> stand )      on the surface AFTER the cut
    departure = A*( stand -> exit )     on the same surface

Not one reversed. The cut has just been taken and the face relaxed, so the ground between the face
and the road is not what it was when the truck arrived. Reversing the approach would draw a truck
leaving over material that is no longer there.

Both legs use the same per-step rule the build router uses:

    | z(b) - z(a) | / run(a, b)  <=  g_max

deliberately, so that "a truck can get there" means the same thing in both directions. A reclaim
truck cannot drive anywhere a haul truck could not.

## The exit is the loading point, not the area corridor

A reclaim truck does not get its own road. The exit is the SITED LOADING POINT, outside every dump
area, and the reachability flood fill is run from there, not from the area access corridor: the
corridor was the first choice and it was wrong, because it is a point inside the yard that the pile
grows over. Measured on the finished surfaces, the corridor entrance was not drivable on `yard`,
`rough_ground`, `seldom_dozed` or `short_bench`, so the flood fill from it reached 0.0 percent of the
pad and every cut on those four was refused, which says nothing about the pile and only that the exit
was buried. From the loading point, 72 to 92 percent of the pad is reachable on those same four.
Reclaimed ore leaving by the point the ore arrived from is also the honest model of a pre-crusher
stockpile, which sits between the pit and the plant rather than on its own haul network. Routing the
reclaim over the ground the build already uses is what couples the two halves of the operation, and
it is why a badly ordered campaign can strand its own reclaim.

## It is additive to the engine

`campaign(..., exit_xy=, max_grade=)`. Without the two arguments every tonnage, grade and provenance
fraction is byte-identical to before, and a test asserts that rather than assuming it, because the
engine is consumed pinned by a product that must not shift underneath itself.

## Invariants, enforced by tests

* every served cut records both legs, each beginning and ending within one cell of the points asked
  for, since a route is a walk over cell centres;
* the truck stands on a cell the passability mask accepts, never on the face;
* every step of both legs passes the same gradient rule the build side uses;
* omitting the haulage changes no tonnage and no grade.

And on the artifact, by the release gate: every scenario must have trucks routed to its cuts, and a
scenario where fewer than half the cuts can be reached fails the build rather than shipping a reclaim
with no way off site.

## Where it fails

**There is no fleet and no cycle time.** One truck is routed per cut, and it neither queues, passes,
nor waits for the loader. The build side has the same limitation and for the same reason: the product
measures what the pile does to the grade, not what the fleet does to the schedule.

**The loading itself is instantaneous in the model.** The bucket swings in the playback because a
reader needs to see the operation, but the engine takes the whole cut at once; it does not model
bucket passes, spot times or the tonnage a loader moves per hour.

**One truck class.** The same gradient limit and the same payload as the delivering fleet, which is
usual on a pre-crusher stockpile and is not universal.

## Sources

The access corridor as the ground a dozer keeps drivable, and dozer operators determining how trucks
access the dump: Baffinland, Life-of-Mine Waste Rock Management Plan, 2017.

Reclaim as mining a muck pile, subject to the same ore control and mine planning: Young and Rogers,
*Minerals* 11(6), 636, 2021, doi:10.3390/min11060636, section 4.1.
