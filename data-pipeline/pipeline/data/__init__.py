"""The three input lanes, and why there are three rather than one.

A stockpile model is only as honest as the stream it is driven with, and no single source can be both
fully controllable and fully real. Rather than pick one and quietly generalise from it, this product
runs three lanes and labels every case with the one that produced it.

* **live** (`..model.stream`) is the exact exponential process the browser reproduces bit for bit.
  Cheap, reproducible in both languages, and honestly labelled as a process, not an ore body.
* **synthetic** (`oreblocks_lane`) drives the stream from a seeded three-dimensional ore body with
  bench structure, an economic pit and a dig sequence. The autocorrelation of the resulting truck
  stream is then an EMERGENT property of deposit geometry and mining order, not an imposed AR(1)
  parameter. That is the difference between a stream that looks correlated and one that is.
* **controlled** (`gstools_lane`) uses sequential Gaussian simulation with a DECLARED variogram, so
  the variogram the app recovers from the stream can be checked against a known truth.
* **real** (`minelib_lane`) uses published block models. It is fetch-at-runtime only: MineLib grants
  academic download with no redistribution, so no instance file is ever committed or bundled.

The three offline lanes are optional dependencies (`requirements-offline.txt`). The core lane runs on
numpy alone so a broken heavy engine can never make the science look broken; importing a lane whose
engine is absent raises with the install line rather than silently falling back to the cheap
generator, because a silent fallback would mislabel the result.
"""
from __future__ import annotations

LANES: dict[str, str] = {
    "live": "the exact exponential process, reproduced bit for bit in the browser",
    "synthetic": "a seeded 3-D ore body with bench structure and a dig sequence (oreblocks)",
    "controlled": "sequential Gaussian simulation with a declared variogram (GSTools)",
    "real": "a published MineLib block model, fetched at runtime and never redistributed",
}

__all__ = ["LANES"]
