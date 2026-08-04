# Method 15: dozer operations, and the displacement uncertainty they create

**Family:** operations · **Rung:** SOTA · **Tier:** precomputed · `bedblend/dozer.py`

## What it computes

Four blade operations, each conserving mass exactly and each returning how far the material it moved
actually travelled.

| operation | what it does |
|---|---|
| `level` | spreads a field of tipped heaps into a working floor |
| `push_to_crest` | shoves material out over the face so the crest advances |
| `build_berm` | raises the safety windrow a reversing truck feels for |
| `build_ramp` | cuts and fills the access corridor into a drivable road |

**Without this module nothing ever finishes a bench.** Paddock dumping leaves a field of separate
heaps. Something has to turn that into a drivable working level with a crest to dump over, and that
something is the dozer. The predecessor engine had no such operator, which is why it had no mechanism
by which a lift was ever completed or the next lift became reachable.

## The ramp is a CUT in the fill, not a void reserved in it

This is the single most consequential thing on this page.

The obvious design reserves the access corridor in plan and keeps every tip off it. It reads as
sensible and it cannot work: a corridor 25 m wide and 58 m long that has to rise to the working level
needs as much material as a sizeable fraction of the lift itself, all of it shoved in sideways by a
blade with a fifteen-metre reach, while the trucks that could have supplied it are forbidden from
driving there. Measured on a 90 m area, the entire 1296-cell area came out unreachable at a peak of
3.2 m, because the corridor stayed a trench with 3 m walls on both sides and there was no way up out
of it.

So the trucks fill the whole area, corridor included, and the dozer cuts the road back into what they
filled, every pass. The material is then always exactly where the blade needs it.

Two further defects in the same operation, both measured:

- **It only ever filled.** Cells BELOW the target profile were raised and cells above it were left
  alone, so a corridor buried level with the platform had no deficit anywhere, the function returned
  zero transfers, and the ramp was never cut at all.
- **It graded to exactly the machine limit.** The measured cross-gradient of a corridor cut at 0.5
  came out 0.50230 against a limit of 0.50237, so whether a cell was drivable was decided by
  floating-point rounding and the ramp read passable, impassable, passable down its length. It is
  built at 85 percent of the limit now, which is also what a real ramp is.

## The target profile

    want(c) = min( z0(c) + along(c) * g_max * f,  top )

`along` is the distance from the entrance measured along the corridor centreline, `g_max` is the
truck's gradient limit, `f` is the grade margin, and `top` is the sixtieth percentile of the material
elevation off the corridor: the level the ramp has to reach to be useful. Cells above `want` are cut,
never below the original ground; cells below it are filled, from the cut first and from the pile
beside them second.

## Donors are LOCAL

Sorting the whole area by elevation and taking the highest first builds the ramp out of the CROWN OF
THE PILE. That was measured lowering the peak from 9.6 m to 5.2 m while making access no better. A
dozer building a ramp shoves material in from the ground beside it, so donors are the nearest cells
standing above the target, and only those within push distance.

The same rule holds for `level`: material moves from cells above the target to the NEAREST cells
below it. That matters for the ledger as much as for the geometry, because a dozer shoves material a
short distance and provenance should smear locally rather than teleport across the pile.

## The dozer relays

An earlier `level` only pushed from cells above the target directly onto cells below it, and it
stalled: after one pass the remaining high ground sat on one edge with no low ground within reach. It
relays now, moving material through intermediate cells, and each cell sheds at most half its height
difference per pass so that levelling is progressive rather than instantaneous.

## Only PLACED material can be pushed

A dozer spreads the stockpile; it does not excavate the ground the stockpile sits on. Selecting high
cells by elevation alone is correct on a flat pad and catastrophic on any of the four sloping fill
types: on a sidehill the high ground IS the hill, and the blade drove a cell 4.43 m below the original
surface, which is excavation nobody performed and which broke the ledger against the terrain.

## The berm is a wall, and that is the point of a berm

A safety windrow at the crest is by construction an obstacle. Run it often enough and it rings the
area. Measured: with the full dozer visit fired on every access refusal, the whole area came out
unreachable and the PEAK DROPPED across the visit, from 3.53 m to 3.21 m, because the blade was
taking the crown to build the thing that was sealing the area off. The berm is built with gaps, and
the on-demand visit that reopens access runs the ramp and the level only.

## And the part that is an honesty requirement rather than a feature

The source is blunt: dozing mixes material from its initial dumping location "in intractable ways",
and dozers "frequently displace stockpiled material from its original dump location, making it hard
to know where material is located within the stockpile".

That sentence is why every pass returns a volume-weighted mean and worst-case displacement rather
than merely performing the movement. The predecessor product printed provenance fractions summing to
one within 1e-12 and presented the number as an answer. With a dozer in the model that precision is a
property of the simulation and not of the world, so the block ledger carries a displacement
uncertainty instead of implying a certainty no real operation has.

## Sources

- Dozer operators determine truck access and order, and material is dumped and spread in shallow
  lifts: Baffinland, Life-of-Mine Waste Rock Management Plan, 2017.
- The cadence, "the material is dozed up the pile after two rows have been dumped": Neufeld, Lyall
  and Deutsch, CCG Report 8 paper 306, 2006.
- Cascade without clumping, compaction, safety berms, and the intractable mixing: Young and Rogers,
  *Minerals* 11(6), 636, 2021, doi:10.3390/min11060636, sections 1.3, 3.2 and 3.3.

## Where it fails

**The cadence is a load count, not a machine schedule.** A real dozer has availability, shifts and
competing tasks. The `seldom_dozed` scenario varies the cadence to show what it costs, but the model
underneath is still "every N loads plus on demand".

**Push distance is a constant.** Forty metres is a typical efficient push for a large track dozer,
and beyond roughly that an operator would rehandle rather than keep pushing. It is an operational
figure, not a measured constant, and it is a parameter everywhere it is used.
