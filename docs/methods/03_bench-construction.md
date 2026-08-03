# Method 3: two-phase bench construction, paddock then edge

**Family:** planning · **Rung:** SOTA · **Tier:** precomputed · `bedblend/build.py`, `bedblend/dump.py`

## What it computes

How a bench actually gets built, in the two phases a surveyed operation uses, rather than as material
appearing at a coordinate.

**Phase one, the paddock campaign.** The truck tips short of any face and the load stands where it
fell, as an elliptical frustum sized by the truck body. A dozer then levels the field of heaps into a
floor. Without this phase there is no continuous crest to dump over and nothing for a truck to drive
on.

**Phase two, the edge campaign.** The truck reverses to the crest and tips over it. The load runs out
down the face, and it is on that face and only on that face that size segregation happens
([method 4](04_segregation.md)). The campaign advances the crest in radial sweeps from a seed cluster
until the bench volume is filled.

## Why two phases and not one

A face has to exist before anything can be tipped over it. On a prepared pad there is no face, so the
first material placed cannot be an edge dump under any circumstances. This is not a modelling
convenience: it is why the surveyed operation describes the base layer as "a series of paddock dumps"
and the upper layer as a radial progression from an initial cluster point.

`paddock_frac` is how much of a bench's designed volume goes down as base layer before the edge
campaign starts. The source describes the base layer without quantifying it, so this is an exposed
parameter with a stated default rather than a number presented as measured. The default is 0.18: the
base layer is ONE lift of heaps, roughly a couple of metres over the footprint, which against an 18 m
bench is about a sixth of its volume. An earlier default of 0.35 was a guess and it starved the edge
campaign, consuming the entire load budget in paddock dumps on a tall bench so that no face was ever
formed to cascade over.

## The operator is chosen by the terrain, not by the label

A tip nominally in the edge campaign that has no face in front of it is a heap, because that is what
the material does. The code checks the measured distance to the live crest and runs the paddock
operator if there is nothing to cascade over. The plan proposes; the ground decides.

## The run-out of a bench

A bench's run-out depends on ITS OWN height, not on how high its top sits above the pad. The second
lift of a two-lift pile cascades over its own face, not over both:

    run_out = H_bench / tan(theta_face)

This is why bench height is not cosmetic. An 8 m bench cascades about 12 m, which sits BELOW the 13
to 46 m envelope measured off a 30 m dump crest, and below the 10 to 12 m threshold at which
percolation segregation becomes significant. A short bench produces a geometry that is correct for
itself and comparable to nothing. 18 m puts both in range, and the `short_bench` and `tall_bench`
scenarios are the two ends of that lever.

## The sweep pattern

Each sweep is an arc at a fixed radius from the seed, clipped to the area, and the radius grows by a
fraction of the load's run-out per sweep so that successive arcs overlap rather than leaving gaps.
Arc length between tips is held at the lattice spacing, so outer sweeps carry more loads than inner
ones. That is the correct behaviour: a longer crest needs more dumps to advance it by the same
amount.

The heading of each tip is provisional in the plan and RESOLVED AT EXECUTION against the live crest
normal, because the measurement specifies the dump as running perpendicular to the crest tangent, and
the crest is a property of the terrain at the moment the truck arrives.

## Sources

Young and Rogers, *Minerals* 11(6), 636, 2021, doi:10.3390/min11060636. Section 3.2 for the paddock
campaign and the perimeter-only dozer work; section 3.3 for the edge campaign, the radial sweeps and
the dozer's role in keeping the cascade clean; figure 12 for the nested-arc pattern.

## Where it fails

**The phase split is per bench, not per lift.** A real operation may paddock-dump a repair into the
middle of an edge campaign. Here the base layer goes in first and then the campaign runs.

**Compaction from truck traffic is applied as a density multiplier, not as a spatial field.** Real
compaction is heaviest where the trucks actually drive, which is the haul route and the tip head, and
lightest at the toe. The density chain in [method 18](18_material.md) carries the magnitude but not
that spatial variation.
