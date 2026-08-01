# uPlot

**Lane:** live · **Install:** `npm i uplot`

## What it is

A fast Canvas2D charting library for time series and line charts.

## Why it is the prescribed choice

The interactive-visualization rubric names it for interactive 2-D lines with cursors and linked
brushing: it has the fastest zoom and cursor of any JavaScript chart library, it is small, and because
it is Canvas2D there is no WebGL context budget to blow when a page holds many small panels.

## What every chart in this product gets, built into the wrapper

Zoom and pan by drag, double-click to reset, a crosshair with a value readout in physical units, correct
rendering in both themes, and a screen-reader data table with the canvas marked `aria-hidden`. Those are
Tier A of the rubric and they are not optional per chart, so they live in one wrapper rather than being
re-implemented and forgotten.

## The theme rule

A canvas cannot resolve `var(--color-fg)`. Every colour is read from the computed style through
`cssVar()` and the chart is rebuilt on a theme change; a chart with a variable name baked into a stroke
silently draws nothing.

## Marking

The rubric treats an undecorated chart as a defect: if the engine detected something, it must be drawn,
labelled and traceable to the number that produced it. The wrapper takes a `markers` list and draws
horizontal and vertical reference lines with labels in the draw hook.
