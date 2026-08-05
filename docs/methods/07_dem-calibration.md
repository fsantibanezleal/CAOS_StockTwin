# Method 7: the discrete-element calibration heap

**Family:** segregation · **Rung:** SOTA · **Tier:** precompute · **Status: LANE PRESENT, NOT RUN IN THIS RELEASE**

## What it is for

**Two anchored constants, and everything else is geometry or a conservation law.** As of engine
0.07.000 the segregation number is no longer set directly: it is derived from the flowing layer's own
path length, thickness and velocity, so the free quantities are the two coefficients underneath that
derivation. The honesty of the whole segregation tier reduces to where each of them comes from and
what the error on it is.

| constant | what it is | where it sits | anchored to |
|---|---|---|---|
| `PERCOLATION_COEFFICIENT` | `kappa` in `q = kappa (U/H) d`, the percolation velocity as a multiple of the shear rate times the grain size | `bedblend/facesegregation.py` | set so `Sr` for a reference dump lands inside the range of Gray and Thornton's worked examples |
| `PECLET_DEFAULT` | `Pe = Sr / Dr`, sieving against diffusive remixing | `bedblend/segregation.py` | the middle of the range Gray and Chugunov fit against chute experiments |

Neither is fitted to this material, both are named in the code with their reasoning beside them, and
this lane is what would replace them with a measurement.

A small bidisperse pour in a discrete-element engine gives a measured apex-to-toe coarse-fraction
profile, and `data-pipeline/pipeline/calibrate.py::fit` grid-searches the coefficients whose continuum
profile best matches it, publishing the fit residual as the honest error bar.

With the remixing term in the model the same pour constrains the Peclet number as well, since the two
act on different features of the profile: `Sr` sets how far down the face the separation completes, and
`Pe` sets how sharp the interface is when it gets there. A single measured profile therefore pins both,
which it could not have done before, because the pure hyperbolic model has only one shape.

**The fitter is real and is tested by recovery**, which is the only check that separates a working fit
from a plausible one: a profile synthesised at `Sr = 2.40, Pe = 14.0` is recovered at 2.397 and 14.01.
A profile reversed to put coarse at the CREST, which kinetic sieving cannot produce, must fit an order
of magnitude worse, so the residual means something. The search is a bounded two-pass grid rather than
an optimiser, because an optimiser's convergence path is not reproducible across implementations.

## Why the lane is separate

PyChrono is published only on conda-forge and has no pip wheel. Folding it into the main precompute
lane would make the entire offline pipeline conda-only for the sake of one calibration that runs once
per release, so it lives in `environment-dem.yml`.

## The kill criterion, and where it stands

The plan is explicit: if the environment cannot be built on the host, method 7 is DELISTED from the
ladder, the calibration falls back to published experimental segregation distances, and the Benchmark
page says so rather than the product continuing to describe itself as DEM-calibrated.

**In this release the DEM heap has not been run.** The calibration therefore uses the published
anchors in the table above. Gray and Thornton's figure 4 shows a layer segregating completely within
one non-dimensional path length at `Sr = 1`, which is a statement of the model rather than an
independent measurement, and the Peclet range is fitted by Gray and Chugunov to their own chute data
rather than to run-of-mine rock. The product does NOT describe its segregation as DEM-calibrated
anywhere, and the segregation number is reported per load in the artifact so a reader can see what
the choice costs rather than being told it is small.

**What the anchor does and does not control.** It sets the MAGNITUDE. It does not set the direction of
any published effect, and it does not set the shape of the profile: those come from the conservation
law, which is why wiring the real solver mattered independently of calibrating it. The one place the
model now disagrees with a source, the face-angle dependence of on-face sieving, is a consequence of
the equation rather than of these two numbers, and no choice of either would remove it. See method 4.

## References

Project Chrono, PyChrono installation: https://api.projectchrono.org/pychrono_installation.html

Gray, J.M.N.T. and Thornton, A.R. (2005). doi:10.1098/rspa.2004.1420, section 4 and figure 4.

Gray, J.M.N.T. and Chugunov, V.A. (2006). Particle-size segregation and diffusive remixing in shallow
granular avalanches. J. Fluid Mech. 569, 365-398. doi:10.1017/S0022112006002977
