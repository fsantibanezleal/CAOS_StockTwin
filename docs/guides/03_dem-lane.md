# Guide: the discrete-element lane

## What it is for

Calibrating the Gray-Thornton segregation number `Sr` against a measured apex-to-toe coarse-fraction
profile from a small bidisperse pour. See [method 07](../methods/07_dem-calibration.md).

## Why it is a separate environment

PyChrono is published only on conda-forge and has no pip wheel. The main precompute lane must stay
pip-installable so the whole bake is reproducible without conda.

```bash
conda env create -f environment-dem.yml
conda activate stocktwin-dem
python -c "import pychrono; print(pychrono.__file__)"
```

## The kill criterion

If the environment cannot be built on the host, method 7 is DELISTED from the ladder, the calibration
falls back to published experimental segregation distances, and the Benchmark page says so rather than
the product continuing to describe itself as DEM-calibrated.

**That is the state of this release.** The fallback is in use and the product does not claim DEM
calibration anywhere.

## Calibrating against a measured profile

If you have a profile from any source, DEM or physical experiment, the fit is one call:

```python
from stlab.stages.calibrate import fit

cal = fit(observed_coarse=[0.22, 0.25, 0.29, 0.34, 0.41, 0.48],
          phi0=0.65, source="my bidisperse pour")
print(cal.as_dict())     # {'sr': ..., 'rmse': ..., 'source': ..., 'n_points': 6}
```

The residual is the honest error bar on every segregation number the product then shows, and it is
carried into the manifest rather than discarded.
