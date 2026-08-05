# Method 20: the reclaim face, and the machine that bounds a cut

**Family:** operations · **Rung:** SOTA · **Tier:** precomputed · `bedblend/reclaim.py`

## What it computes

Which ground a single reclaim cut disturbs, and how deep into it. Not how much came out, which the
plan asks for, but where the machine had to stand and what it could reach from there.

## Why it exists

It did not, and the gap was invisible because every number downstream of it was right. A cut took its
tonnage proportionally from every cell of the working face, which was `depth_m` deep by the full
`width_m` across. The tonnage was correct, the grade was correct, provenance summed to one, mass
balanced, and the ledger agreed with the terrain. **What was wrong was the shape of the hole.**

Measured on the shipped artifacts, across 632 cuts:

| | before | after |
|---|---|---|
| mean ground disturbed per cut | 594 m2 | see the table below |
| worst case | 900 m2, the entire slab | bounded by the machine's reach |
| `intensive_drain` | 355 t taken off 486 m2 | a cut you could stand next to |
| worst provenance | one 881 t cut from 108 dig blocks | a handful |

A 355 tonne cut spread over 486 square metres is a seven centimetre skim off half a football pitch.
The provenance is the symptom that needs no geometry at all to read: fifteen bucket passes cannot
sample 108 distinct dig blocks. It was found by a reader looking at the pile on screen and saying the
area coming down looked too big for the machine.

## The machine is now explicit

`LoaderSpec` carries the working envelope, and two of its numbers bound a cut:

    dig_radius_m       how far the machine works from one stance before it has to tram
    max_cut_height_m   how high a face it can safely cut in one pass

The defaults are the envelope of the large hydraulic front shovel class used on a pre-crusher
stockpile. They are a PARAMETER of the run, declared and adjustable, not a measured fit to a
particular machine. **The result that does not depend on the exact figures** is the one the previous
model got wrong: the footprint of a cut scales with the tonnage removed and is bounded by the reach of
the machine, instead of being the whole face every time.

## Three positions, not one

The engine used to have a face and nothing else in it. There are now three distinct places, and
keeping them apart is what makes the operation drawable and the constraint real:

| | what it is | where it sits |
|---|---|---|
| the face | the ground the campaign is working | `position_m` deep, `width_m` across |
| the stance | where the machine is parked for THIS cut | at the near edge of the material, `offset_m` across |
| the stand | where the truck waits to be loaded | a trafficable, reachable cell beside the cut |

`position_m` is how far the face has advanced INTO the pile and `offset_m` is where the machine is
standing ACROSS it. The second is what was missing. A loader works the stretch of face it can reach,
then trams along to the next stretch, and only when it has swept the whole width does the face advance
a cut deeper. `ReclaimFace.step` does exactly that, in that order.

The stance is taken from where the MATERIAL is, not from the nominal `width_m` window, because the
window is a bound rather than a description: a caller that wants no across-face limit passes a width
wider than the pad, and deriving the machine's position from that puts it off the edge of the world.

## How a cut is dug

`ReclaimFace.bite` returns the cells and the depth into each:

1. candidates are the cells of the face envelope within `dig_radius_m` of the stance;
2. ordered nearest first, index breaking ties so a run is reproducible;
3. each gives up at most one lift, `min(max_face_m, max_cut_height_m)`;
4. accumulate until the tonnage is met; the last cell is partial, taking only the remainder.

A small cut therefore leaves a small hole. If the ground within reach cannot supply the tonnage, the
cut takes what is there and the machine trams.

## A cut is a quantity of feed, not one bucket from one spot

This is the part that is easy to get wrong, and the first version of it was wrong. The reach of the
machine bounds what it can take from ONE stance. It must not also bound the parcel the plant asked
for. A face whose stance holds ninety tonnes does not turn a nine hundred tonne cut into a ninety
tonne one; it makes the machine tram and keep loading, which is what tramming is for.

`next_cut` therefore takes from the current stance and, while there is still tonnage owed, moves the
machine and takes again, merging everything into one cut. Everything intensive is tonnage-weighted and
the provenance fractions are recombined on the same basis so they still sum to one.

The failure this guards against is measurable rather than theoretical: returning the first non-empty
stance cut the delivered feed to a quarter of what the campaign asked for and left most of the pile
standing.

## The extraction order still matters, but not always

`FULL_HEIGHT` takes a proportional slice of every parcel in the column, which is the vertical approach
that actually blends the lifts. `LIFO` takes from the top and `FIFO` from the bottom.

**When a cut takes a whole column, the three agree**, and that is arithmetic rather than a limitation:
material taken top to bottom is the same material whichever end you start at. The order within a
column can only matter when the face height is shorter than the column, which is what `max_face_m` is
for. The previous proportional skim never took a full column, so the degeneracy could not arise, and
its absence was easy to mistake for the extraction order always mattering. Both the difference and the
degeneracy are now asserted directly.

## Invariants, enforced by tests and by the release gate

* no cell outside the machine's dig radius is ever dug, whatever tonnage is asked for;
* a small cut engages strictly fewer cells than a large one from the same ground, and not merely fewer:
  ten times the tonnage cannot come out of a similar number of cells;
* one cut engages less than a third of the cells its face envelope offers;
* successive cuts in a campaign do not all come from the same place;
* the reclaimed feed carries its size split, on every extraction order.

And on the artifact: the mean cut must disturb under 300 m2, and cuts in the top tonnage quartile must
disturb more ground than those in the bottom quartile. A footprint that does not respond to the tonnage
is the signature of the defect, and either check alone can be argued away where the two together cannot.

## Where it fails

**No fleet, no cycle time, no queue.** One truck is routed per cut and the loading is instantaneous in
the model. The bucket swings in the playback because a reader needs to see the operation, but the
engine takes the cut at once; it does not model bucket passes, spot times, or tonnes per hour.

**One machine class per run**, and its envelope is a declared parameter rather than a measured
specification. Changing it changes the footprint, which is the point, but the product ships one.

**The stance is not optimised.** The machine works the face in a planned order, nearest cell first from
wherever it happens to be standing. It does not choose where to stand to hit a grade target, which
would make reclaim sequencing an optimisation problem rather than the plan it is modelled as here.

## Sources

Reclaim as mining a muck pile, subject to the same ore control and mine planning, and the taxonomy of
last-in-first-out against first-in-first-out for truck-built piles: Young and Rogers, *Minerals* 11(6),
636, 2021, doi:10.3390/min11060636, section 4.1 and figure 1.
