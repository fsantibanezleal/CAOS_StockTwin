# Guide: the discrete-element lane

**The DEM calibration lane exists and has NOT been run in this release, so the segregation number
`Sr` uses the published Gray and Thornton anchor rather than a measured fit.** What follows is the
lane as it stands, not a record of a calibration that happened.

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

If the environment cannot be built on the host, method 7 is DELISTED from the ladder and the Benchmark
page says so, rather than the product continuing to describe itself as DEM-calibrated.

THAT IS NOT THE STATE TODAY. The environment builds and the fitter exists; what has not happened is a
POUR. So the coefficients are the published anchors rather than a measured fit, the lane is present
rather than delisted, and the product does not claim DEM calibration anywhere. The distinction
matters: a delisted method is one the product no longer offers, and this one is offered, implemented,
and uncounted against a measurement nobody has made yet.

## Calibrating against a measured profile

You do not need DEM for this. Any measured apex-to-toe profile will do, from a discrete-element pour
or a physical one, and the fit is one call:

```python
import sys
sys.path.insert(0, "data-pipeline")
from pipeline.calibrate import fit

cal = fit([0.22, 0.25, 0.29, 0.34, 0.41, 0.48], phi0=0.65, source="my bidisperse pour")
print(cal.as_dict())
```

`phi0` is the FINE fraction before sorting, which is one minus the coarse fraction, and passing the
coarse fraction by mistake is the easiest way to fit nonsense, so it is validated rather than trusted.
The stations run apex first and toe last.

What comes back is the pair of coefficients and the residual:

```
{'sr': 0.3201, 'pe': 2.825, 'rmse': 0.0386, 'n_points': 6, 'source': 'my bidisperse pour', 'phi0': 0.65}
```

**The residual is the honest error bar.** A fit that reports the same residual for a profile the model
can produce and one it cannot is reporting nothing, so there is a test for exactly that: a profile
reversed to put coarse at the CREST, which kinetic sieving cannot produce, must fit an order of
magnitude worse.

A single profile constrains BOTH coefficients, because they act on different features of it. `Sr` sets
how far down the face the separation completes and `Pe` sets how sharp the interface is when it gets
there. The pure 2005 model has only one shape and could not have separated them, which is a second
reason the remixing term earns its place. Pass `fit_peclet=False` with an explicit `pe` when a profile
has too few stations to constrain a shock's thickness.

The search is a bounded two-pass GRID, not an optimiser, because an optimiser's convergence path is not
reproducible across implementations and the determinism contract does not allow that. Recovering a
synthetic profile generated at `Sr = 2.40, Pe = 14.0` returns 2.397 and 14.01 at the default
resolution.
