# The live lane, in TypeScript

The browser recomputes the VERDICTS on every load: the variance reduction ratio, the independent-layer
bound, the experimental variograms, the sector rollups with their confidence intervals, the
segregation summary and the residence-time distribution. All of them are derived in the page from the
loads and cuts it also displays.

## What is deliberately NOT live

The simulation. It routes every load over the trafficable surface with an A-star search, floods the
pad for reachability, relaxes the whole height field after every operation, and sorts each cascading
load by size down a real face. That is tens of seconds for a few hundred loads.

Running it in a page means one of two things: a frozen tab, or a model simple enough to be fast, which
means simple enough to be wrong. **The previous version of this product chose the second**, and shipped
a pile with 446 cell pairs standing at up to 55.9 degrees against an imposed 37, which rendered as
spikes. The simulation is baked offline by [`bedblend`](https://pypi.org/project/bedblend/) and the
browser reads its trace.

## Why the verdicts are live and not baked

A trace that shipped a variance reduction ratio would be a slide, and its number would be
unfalsifiable: a reader could not tell a real result from a typo. Recomputing in the page means the
reader can switch scenario, watch the number move, and know it was derived.

The trace therefore carries EVENTS and GEOMETRY and no verdicts, and that is enforced by the artifact
schema having nowhere to put one.

## Why TypeScript and not Pyodide for that

The verdicts are reductions over a few thousand events, expressible over typed arrays, and they have
to answer within an interaction budget as the reader switches case. A Pyodide cold start plus
per-load marshalling cannot meet that for work this small. SimLab's Pyodide lane is right for its
problem and wrong for this one.

## The playback lane

Surface snapshots, one per placed load, stored at a coarse cell stride and interpolated back onto the
full grid in the browser. That is what makes one frame per truck affordable: at full resolution a few
hundred frames is megabytes for something that is watched rather than measured.

**The expansion is not optional, and there is a reason to say so.** The renderer indexes the surface
as `z[j * nx + i]`, so a short array does not merely look coarse, it reads the wrong cells entirely.
An earlier version guarded with a length check and fell back to the finished pile, which meant the
transport moved, the load counter counted, and every frame showed the same surface. The visual gate
now scrubs to the first frame and compares canvas pixels against the finished pile, because nothing
short of that catches it.

## A load is an event with a duration

The player runs a continuous clock in units of loads and hands the scene a fractional position: which
load is being worked, and how far through it. The scene walks the truck along the route the engine
solved, tips the tray at the moment the material appears, and drives it out on the departure path.

Treating a load as an instant produced exactly what it sounds like: material appearing out of nothing,
the truck somewhere different every tick, and nothing connecting the two.

## Rendering

Two effects, not one. The first builds the renderer, the camera and the two surface meshes once per
scenario; the second rewrites what is on them. When everything lived in one effect a frame change tore
down the WebGL context and built a new one, which no browser will do fifteen times a second, and it
reset the camera every time a checkbox moved.

The material skin's geometry is allocated once and written in place. Rebuilding a plane geometry and
its colour attribute per frame is avoidable garbage at playback rates.

## Rendering defects the verification gate caught

Each of these passed every check except a pixel sample, which is why the gate takes one.

* **WebGL clears its drawing buffer after every render** unless `preserveDrawingBuffer` is set, so
  `readPixels` and page screenshots both read an empty buffer even when the scene drew correctly. A
  blank-canvas check reported a false failure on a scene that had rendered perfectly well.
* **An empty pad coloured as material at grade zero read as a full pile.** A cell with no material is
  drawn as ground, never as a ramp value. This shipped once and was caught by looking at the deployed
  site rather than by any test.
* **The camera framed the pad rather than the work.** The pad is deliberately larger than the dump
  areas because trucks have to drive somewhere, and centring on it put the pile in a corner with three
  quarters of the screen given to empty ground. It looks at the middle of the planned areas and sits
  back by their extent.
* **The colour ramp had no numbers on it.** The range moves with both the scenario and the variable,
  so it cannot be written into a caption; it is rendered beside the stage.

## Where it fails

**The grade field shown during playback is the FINAL composition.** Only the elevation moves. That is
honest for a replay, because the ledger records the final grade per column and pretending to know an
intermediate one would be inventing data the bake did not record. It does mean the colours during
playback are the answer rather than the state at that moment.

**True scale, no vertical exaggeration.** A pile of 14 m on a pad 150 m across is low, and it is drawn
that way. An earlier version exaggerated the vertical and printed the factor on the legend; that is
defensible, but the honest picture of a stockpile is that it is wide and low, and the fix for it being
hard to read is to frame it properly rather than to stretch it.
