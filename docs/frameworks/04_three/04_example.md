# three.js, a runnable example

```ts
// frontend/src/viz/PileView3D.tsx, the parts that matter
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,                  // let the themed container show through
  preserveDrawingBuffer: true,  // the gate samples pixels to prove the stage drew
});
renderer.setClearColor(0x000000, 0);   // no scene.background: THREE cannot parse the shell tokens

// vertical exaggeration, reported on the legend rather than applied silently
const vex = Math.min(12, Math.max(1, (nx * cellM * 0.2) / Math.max(1e-6, hmax)));
```
