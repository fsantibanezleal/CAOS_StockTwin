# Method 15: the learned segregation-profile surrogate

**Family:** segregation · **Rung:** beyond the published state of this problem · **Tier:** precompute to live
**Status: NOT SHIPPED IN THIS RELEASE**

## What it would do

Predict the apex-to-toe coarse-fraction profile directly from the material and geometry parameters,
skipping the per-column conservation-law solve. Its value would be speed on a very large pad, where the
flowing-layer march is the hot loop.

## Why it is not shipped

Two reasons, both honest rather than convenient.

First, it depends on method 7: a surrogate fitted to the continuum solver alone learns the solver, not
the physics, and adds nothing that the solver does not already give in a few hundred operations. It is
worth training only against DEM ground truth, and the DEM heap has not been run in this release.

Second, the measured cost of the continuum solve does not justify a surrogate. The segregation march is
32 depth cells over 12 downslope bands per dump, well under the interaction budget, so replacing an
exact published model with an approximation of it would trade correctness for a speed-up nobody needs.

## What ships instead

Method 4, the conservation law itself, running live. The product states the segregation number it used
and exposes it as a control.

## References

Gray, J.M.N.T. and Thornton, A.R. (2005). doi:10.1098/rspa.2004.1420
