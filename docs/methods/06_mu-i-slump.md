# Method 6: the depth-averaged reclaim-face slump

**Family:** segregation · **Rung:** SOTA · **Tier:** precompute · **Status: NOT IMPLEMENTED IN THIS RELEASE**

## What it would compute

The slumping of the exposed reclaim face as a shallow granular flow, using the depth-averaged
mu(I)-rheology. It would give a higher-fidelity face geometry than the repose-angle relaxation, which
treats the face as instantaneously at repose.

## Honest status

This method is listed in the plan and is NOT implemented in this release. It has no engine, no
checkpoint, no evaluation and no artifact, so under the vertical-acceptance contract it is not a method
yet, and it does not appear as a tab in the App. Saying so here is the point: a method name in a
selector with no engine behind it is exactly what the acceptance contract exists to forbid.

## What the product uses instead, today

The reclaim face is the repose surface produced by the relaxation solver. That is a defensible
approximation for a face that is not actively flowing, and it is what the reclaim geometry cuts into.
The difference the mu(I) solve would make is to the TRANSIENT shape immediately after a cut, which the
current model does not resolve.

## References

Gray, J.M.N.T. and Edwards, A.N. (2014). A depth-averaged mu(I)-rheology for shallow granular
free-surface flows. J. Fluid Mech. 755, 503-534. doi:10.1017/jfm.2014.450

Jop, P., Forterre, Y. and Pouliquen, O. (2006). A constitutive law for dense granular flows. Nature
441(7094), 727-730. doi:10.1038/nature04801

Note: an earlier search returned pages 297-329 and doi:10.1017/jfm.2014.423 for the Gray and Edwards
title. Crossref gives 755:503-534 and doi:10.1017/jfm.2014.450, and Crossref is taken as authoritative.
