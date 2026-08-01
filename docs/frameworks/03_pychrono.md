# PyChrono

**Lane:** offline, conda only · **Install:** `conda env create -f environment-dem.yml`

## What it is

The Python module of Project Chrono, a multi-physics engine with a discrete-element solver. Conda
packages exist for win-64, Linux and macOS; there is no pip wheel.

## Why it is here, and why the lane is separate

The Gray-Thornton segregation number is the only free parameter in the live segregation model, so the
honesty of that tier reduces to where the number comes from. A small bidisperse pour gives a measured
apex-to-toe profile to calibrate against.

The lane is separate because the main precompute lane must stay pip-installable: a reader should be able
to reproduce the whole bake without conda, and making the entire offline pipeline conda-only for one
calibration that runs once per release would be a bad trade.

## Honest status

Not run in this release. The kill criterion in the plan applies: the calibration falls back to published
segregation distances and the product does NOT describe itself as DEM-calibrated. See
[method 07](../methods/07_dem-calibration.md).

## Install

```bash
conda env create -f environment-dem.yml
conda activate stocktwin-dem
python -m stlab.stages.dem --out models/dem
```
