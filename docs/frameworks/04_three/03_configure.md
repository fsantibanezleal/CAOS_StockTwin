# three.js, configuration that matters

`preserveDrawingBuffer: true`, because the verification gate samples canvas
pixels to prove the stage is not blank, and WebGL clears the drawing buffer after each render.

`alpha: true` with a transparent clear and NO `scene.background`. THREE.Color cannot parse the shell's
modern CSS colour tokens and falls back to white silently, which produced a white stage in dark theme;
letting the container's own CSS show through is both correct and theme-aware for free.
