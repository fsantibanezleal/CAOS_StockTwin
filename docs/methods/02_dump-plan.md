# Method 2: the dump plan, areas, benches, lifts and the access ramp

**Family:** planning · **Rung:** classical · **Tier:** precomputed · `bedblend/design.py`

## What it computes

Where every load is supposed to go, before any load goes anywhere. A yard is divided into rectangular
AREAS, one per declared material class. Each area is divided into BENCHES with a designed top
elevation and a designed volume. Each bench is filled by repeated LIFTS, and each lift is a set of
ordered TIP POSITIONS. Each area reserves an ACCESS corridor with a width and an entrance.

The plan is what makes the rest of the product honest. A truck that arrives at an arbitrary point on
an arbitrary part of the pad is not a stockpile operation; it is a particle emitter.

## Why a plan exists at all

Fresh material stands at its angle of repose, about 37 degrees. A haul truck climbs roughly two
thirds of that. **A truck therefore never stands on fresh material.** Everything a truck can reach it
can reach because something made it reachable: the original ground, a floor the dozer levelled, or a
ramp the dozer cut. Tip positions are consequences of that, not choices.

## The designed volume of a bench

A bench is not a box. Its sides stand at the angle of repose, so the solid is a frustum and it holds
well under the prismatic volume:

    V_bench = W * L * H * u

`u` is the swell utilisation, defaulting to 0.55. It is a blunt but honest constant, and it is a
parameter rather than a literal because the true figure depends on the repose angle and the bench
aspect ratio, which the design layer deliberately does not know about.

The number of tips a bench needs follows from its volume and the truck:

    n_tips = round(V_bench / V_load)

## A bench is filled in LIFTS

This is the correction that mattered most, and it is worth stating plainly because the first version
got it wrong in a way that looked reasonable.

A dump is of the order of a metre thick. A bench is tens of metres tall. Covering the area once
therefore gets nowhere near the designed volume. The first version emitted exactly one paddock
lattice and one set of edge sweeps per bench and then declared the programme complete: on the
reference scenario that was **332 tips against a design of 1360**, so 228 of 560 offered loads were
refused with "this area is built out" while the pile stood at 10.8 m of a designed 36.

The area is now covered repeatedly, each pass laid on the one below, until the designed volume is
met. The ring phase of each lift is rotated so successive lifts do not drop every load on the seam
left by the one beneath it.

## Order of work

**Paddock rows work AWAY FROM THE ACCESS.** The rows furthest from the entrance are filled first, so
the truck never crosses material it has already placed. Filling the near rows first walls the machine
out of its own dump area, and that was the measured cause of a large block of refusals.

Within a row the order is serpentine: the truck that finishes a row is at its far end and the next
row starts from there. This also matters physically, because consecutive loads come from consecutive
trucks and therefore from nearby material in the pit, so the serpentine order is what puts correlated
grades next to each other rather than scattering them.

**Edge sweeps seed at the far corner.** The upper layer starts as a cluster and sweeps outward, so
seeding it beside the entrance buries the entrance first. Starting at the far corner makes the crest
advance back toward the way out, which is also how a tip head is actually worked.

## The access corridor

The corridor is the strip of the area within half a ramp width of the straight line from the entrance
ACROSS the area. Not to its centre: the run available is what limits the lift a ramp can serve, and
at a working gradient near 0.43 a corridor half the area long tops out around 19 m. The full span
roughly doubles it.

The entrance is the midpoint of the area's open edge. It used to default to a corner, and because
areas are laid out from the origin that corner was wedged between the area and the pad boundary with
the pile itself between it and every approach: measured on a 90 m area, no truck could reach the
entrance at all.

**The corridor is not kept empty.** See [method 15](15_dozer.md): the trucks fill the whole area,
corridor included, and the dozer cuts the road back into what they filled. Reserving it as a void
cannot work, and the reason is arithmetic rather than opinion.

## Sources

Dump design reserving access, and access to successive lifts being achieved by establishing ramps of
a suitable width and gradient: standard waste-dump design practice, stated in the Baffinland
Life-of-Mine Waste Rock Management Plan (2017).

The paddock-then-edge sequence, the radial sweep pattern and the per-area dozer cadence: Young and
Rogers, *Minerals* 11(6), 636, 2021, doi:10.3390/min11060636.

## Where it fails

**The plan is generated once, and the pile grows away from it.** A real operation re-plans: it
resurveys the tip head and lays out the next lift against what is actually there. This plan is laid
out against the designed geometry and then executed, so a tip that becomes unreachable is refused
rather than replaced. The refusal rate is reported for exactly that reason. It is the honest measure
of how good a static plan was, and it is not zero.

**Areas are rectangles.** Real dump footprints follow the landform and the property boundary. The
rectangle is what the fill-type module varies around, not a claim about shape.
