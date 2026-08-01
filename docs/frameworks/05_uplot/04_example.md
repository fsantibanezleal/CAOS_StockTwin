# uPlot, a runnable example

```ts
// frontend/src/viz/UPlotChart.tsx
// resolve the theme token to a real colour: a canvas cannot read a CSS variable
const css = getComputedStyle(document.documentElement);
const accent = css.getPropertyValue("--color-accent").trim() || "#58a6ff";

const opts: uPlot.Options = {
  width, height,
  scales: { x: { time: false } },
  series: [{}, { stroke: accent, width: 1.5, label: "VRR" }],
  cursor: { drag: { x: true, y: false } },   // brush to zoom, per the rubric
};
```
