# Method 7: the discrete-element calibration heap

**Family:** segregation · **Rung:** SOTA · **Tier:** precompute · **Status: LANE PRESENT, NOT RUN IN THIS RELEASE**

## What it is for

The Gray-Thornton segregation number `Sr` is the only free quantity in the live segregation model.
Everything else in it is geometry. So the honesty of the whole segregation tier reduces to one
question: where does `Sr` come from, and what is the error on it?

A small bidisperse pour in a discrete-element engine gives a measured apex-to-toe coarse-fraction
profile, and `data-pipeline/pipeline/calibrate.py` grid-searches the `Sr` whose continuum profile best matches
it, publishing the fit residual as the honest error bar.

## Why the lane is separate

PyChrono is published only on conda-forge and has no pip wheel. Folding it into the main precompute
lane would make the entire offline pipeline conda-only for the sake of one calibration that runs once
per release, so it lives in `environment-dem.yml`.

## The kill criterion, and where it stands

The plan is explicit: if the environment cannot be built on the host, method 7 is DELISTED from the
ladder, the calibration falls back to published experimental segregation distances, and the Benchmark
page says so rather than the product continuing to describe itself as DEM-calibrated.

**In this release the DEM heap has not been run.** The calibration therefore uses the published anchor:
Gray and Thornton's figure 4 shows a layer segregating completely within one non-dimensional path
length at `Sr = 1`, which is a statement of the model rather than an independent measurement. The
product does NOT describe its segregation as DEM-calibrated anywhere, and `Sr` is exposed as a control
so a reader can see what the choice costs.

## References

Project Chrono, PyChrono installation: https://api.projectchrono.org/pychrono_installation.html

Gray, J.M.N.T. and Thornton, A.R. (2005). doi:10.1098/rspa.2004.1420, section 4 and figure 4.
