# three.js

**Lane:** live · **Install:** `npm i three`

## What it is

The WebGL scene graph library. Used through the raw API, not react-three-fiber: the product has exactly
two 3-D views with one mesh each, and a declarative reconciler would add a dependency and an abstraction
layer for a scene that is rebuilt wholesale on every parameter change anyway.

## Why 3-D at all

The visualization rubric requires a written justification naming the third independent variable for
every 3-D view, and rejects the rest. Two views qualify:

* **the pile**, where `h(x, y)` is genuinely a function of two independent horizontal coordinates and
  the height IS the data, not a re-encoding of a colour;
* **the cutaway**, where depth carries the deposition ORDER that no surface view can show.

Everything else in the product is 2-D.

## The three configuration facts that matter

* `preserveDrawingBuffer: true`, or `toDataURL` and page screenshots read an empty buffer and no
  verification gate can tell a working stage from a blank one.
* `alpha: true` with a transparent clear, and NO `scene.background`. The shell's palette tokens are
  modern CSS colour functions that `THREE.Color` cannot parse, and an unparseable string silently
  becomes white.
* One WebGL context per route. Browsers cap contexts at roughly eight to sixteen, and a page of WebGL
  charts fails silently; every 2-D chart in this product is Canvas2D.

## Orbit without a dependency

`OrbitControls` is a three example module, not part of the package's public surface, and its path moves
between releases. A hand-rolled drag-to-orbit with keyboard camera controls is twenty lines and is what
the accessibility requirement needs anyway.
