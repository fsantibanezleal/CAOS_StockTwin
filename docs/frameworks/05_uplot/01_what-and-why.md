# uPlot, what it is and why this one

## What it is

A small, fast Canvas2D charting library. Every line and series view in the product
is uPlot: the input and reclaimed streams, the variograms, the residence-time distribution, the
achieved-against-ideal comparison. MIT.

## Why this and not something else

The rubric prescribes it by data type, and the reason is a hard constraint rather
than a preference: browsers cap WebGL contexts at roughly 8 to 16, and a page of many small WebGL
charts fails silently once that budget is spent. uPlot is Canvas2D, so the instance count is
unlimited, and it is the fastest cursor and zoom of any JS chart library.

The rubric also forbids the alternative directly: a static chart image is a defect, not a feature.
