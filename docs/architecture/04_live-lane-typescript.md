# The live lane, in TypeScript

The whole pile loop runs in the browser and recomputes on every control change: the relaxation
cascade, the five stacking paths, the four reclaim geometries, the lot ledger, the Gray-Thornton
segregation solver, the variance reduction ratio, the variograms and the residence-time distribution.

## Why TypeScript and not Pyodide

The two hot algorithms are a height-field relaxation and a per-column hyperbolic solve, both trivially
expressible over typed arrays, and both of which must answer inside a 100 ms budget on every slider
move. A Pyodide cold start plus per-frame marshalling cannot meet that. SimLab's Pyodide lane is right
for its problem and wrong for this one, and the gate records the measured runtime that justifies the
choice, so the decision is evidence rather than preference.

Measured on the default case at 1600 by 900: about 145 ms for a full build-and-reclaim of 320 dumps,
inside the interaction budget with the recompute debounced by React's own batching.

## Three performance corrections, each with its cause

The relaxation went through three implementations. The first two were correct and unusably slow, both
for the same underlying reason: simultaneous sweeps let a cell receive from several neighbours at once
and overshoot above the neighbour it had just fed, so the pair traded material back and forth. A cone
that should relax in about eight steps took over a hundred sweeps.

1. **A priority cascade instead of sweeps.** Process the highest unstable cell first and apply its
   transfer immediately. The relaxation then marches monotonically downhill, and it delivers the
   transfers in downslope order, which is exactly what the segregation solver needs. The fix improved
   the physics coupling as well as the speed.
2. **Coalescing same-event lots on push.** Every transfer splits the straddling lot, so a column
   accumulated thousands of slivers of the same event and the simulation went quadratic. Merging two
   lots of the SAME event is exactly lossless for provenance.
3. **Precomputing the neighbour table per pad geometry.** Allocating a fresh eight-element list per
   cell, per sweep, per dump dominated everything the science was doing.

And a truck load is not a point source: dropping 220 tonnes on a two-metre cell puts a thirty-metre
spike on the pad that the relaxation then has to demolish. Spreading it over a nine-metre disc is both
faster and what actually happens.

## Four rendering defects the verification gate caught

Each of these passed every check except a pixel sample, which is why the gate takes one.

* **The mesh effect omitted `host` from its dependency array.** The host arrives through a callback
  ref, so the first commit ran both effects with `host` still null and both returned early; the second
  commit created the renderer, but the mesh effect's other dependencies were unchanged so it never
  re-ran. No mesh was ever added and the canvas stayed at its cleared colour.
* **WebGL clears its drawing buffer after every render** unless `preserveDrawingBuffer` is set, so
  `toDataURL` and page screenshots both read an empty buffer even when the scene drew correctly.
* **`THREE.Color` cannot parse the shell's palette tokens** and silently falls back to white, so the
  dark theme rendered a white stage. The renderer is now alpha with a transparent clear and the
  container's own CSS background shows through, which is correct in both themes by construction.
* **The timeline defaulted to the end of the run**, which is the pad AFTER the reclaimer drained it: a
  true picture of the wrong moment. It opens at peak inventory.

## Vertical exaggeration, stated rather than applied quietly

A pile eight metres tall on a pad a hundred and ninety metres long is a sheet of paper at true scale.
The stage applies a vertical exaggeration chosen so the apex is about a fifth of the pad length, the
factor is printed on the legend, and the hover readouts report TRUE heights.
