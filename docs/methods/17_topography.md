# Method 17: topography and the five published fill types

**Family:** geometry · **Rung:** classical · **Tier:** precomputed · `bedblend/topography.py`

## What it computes

The ground a stockpile is built on, as one of the five published fill types, plus the numbers that
say how much that ground matters before a single load is placed.

| fill type | the ground |
|---|---|
| heaped | a flat prepared pad. The only flat one |
| sidehill | a single slope, filled against the hill |
| valley | confined on two sides, draining along the third |
| cross-valley | falls along one axis and rises across it |
| ridge crest | falls away on both sides; the buildable ground is a strip |

**Only one of the five is a flat pad.** A product that models a flat pad and calls it a stockpile is
modelling one member of a taxonomy and presenting it as the subject.

**Four of the five are in the shipped matrix**, plus an unprepared rough-ground case. The ridge crest
is NOT: the relaxation leaves one cell pair of a three thousand six hundred cell pad at 41.5 degrees
against an imposed 37, and the scenario is withdrawn rather than shipped with a surface the product's
own invariant rejects. The engine still implements it and it is still described here, because the
taxonomy is what the method is about; the scenario matrix is a separate question. See finding F-020.

## What is reported before anything is built

    relief_m         the vertical range of the landform
    max_slope_deg    the steepest natural gradient anywhere on it
    buildable_fraction  the share of cells a truck could stand on, at g_max, on the BARE ground

These are computed and written into the artifact rather than asserted in prose, because the
difference between the fill types is a number:

| fill | relief | max slope | buildable |
|---|---|---|---|
| heaped | 0.0 m | 0.0 deg | 1.000 |
| sidehill | 29.6 m | 13.6 deg | 1.000 |
| valley | 29.2 m | 30.5 deg | 0.719 |
| cross-valley | 32.2 m | 23.8 deg | 1.000 |
| ridge crest | 29.2 m | 30.5 deg | 0.719 |

A valley and a ridge start with 28 percent of their ground already too steep to drive on. A sidehill,
despite thirty metres of relief, does not: a uniform slope of 13.6 degrees is comfortably inside a
truck's limit. Relief and difficulty are not the same thing, and the table is how the product says so.

## Confinement is why the taxonomy exists

The ground does not merely tilt the pile. It holds it. A valley takes the same tonnage and stands it
markedly higher and narrower than a pad does, which changes the drop height, and drop height is one
of the three drivers of size segregation. A ridge does the opposite: material that overruns a toe is
gone down a hillside rather than sitting at the foot of the pile.

The `valley` and `cross_valley` scenarios exist to measure that, and each one's kill criterion is
written against it: the valley must stand HIGHER than the flat-pad case from the same load budget.
Measured, it does, at 27.0 m against 13.7 from the same 900 offered loads. The ridge crest would have
been the opposite case and it is withdrawn; see above.

## The ground is a FLOOR, everywhere

Every operation that moves material takes the original surface as a hard floor:

- relaxation cannot cascade a cell below `z0`
- the dozer can only push PLACED material, never the ground it sits on
- the ramp cut stops at `z0`

This was not free. Selecting high cells by elevation alone is correct on a flat pad and catastrophic
on a slope: on a sidehill the high ground IS the hill, and the blade drove a cell 4.43 m below the
original surface, which is excavation nobody performed and which broke the ledger against the
terrain.

## The angle of repose is a property of loose material, not of bedrock

A natural hillside is entitled to stand steeper than any ore will. The stability invariant therefore
skips a cell carrying no material, and skips a pair whose steepness would survive removing the
material entirely. Without the second test a cell carrying a thin skin over steep ground is flagged
and NOTHING can clear it: shedding every grain it has leaves the ground, and the ground is still over
the angle. Measured on a sidehill: 65 pairs, worst 49.1 degrees, every one inherited from the
landform, on a surface that was as relaxed as it can physically be.

## Sources

The five fill types: standard waste-dump and stockpile design taxonomy, as set out in the Baffinland
Life-of-Mine Waste Rock Management Plan (2017) and in general dump-design practice.

## Where it fails

**The landforms are synthetic.** They are parameterised surfaces with a relief and a roughness, not
surveyed terrain. A real site has drainage, benches from previous work, and a property boundary. The
fill type captures the shape of the constraint, not a place.

**Ground water, foundation strength and settlement are not modelled.** A real dump on soft ground
settles into it. Here the floor is rigid.
