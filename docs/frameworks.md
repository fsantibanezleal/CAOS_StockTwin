# Frameworks

One folder per engine this product actually uses. Each carries what it is and why this one rather than something else, the lane it is pinned in, the configuration that changes an answer rather than a picture, and a runnable example.

A tool with no folder here is a tool the product does not use. The deep research that chose these is binding: the engines named here are the ones the pipeline calls, and there are no hand-rolled substitutes for any of them.

| engine | lane | install |
|---|---|---|
| [bedblend](00_bedblend/) | offline and live | `pip install bedblend` |
| [oreblocks](01_oreblocks/) | offline | `pip install oreblocks` |
| [GSTools](02_gstools/) | offline | `pip install gstools` |
| [PyChrono](03_pychrono/) | offline, calibration only | `conda install -c projectchrono pychrono` |
| [three.js](04_three/) | live, in the browser | `npm install three` |
| [uPlot](05_uplot/) | live, in the browser | `npm install uplot` |
