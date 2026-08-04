# Method 8: the per-cell lot ledger and reclaim provenance

**Family:** traceability · **Rung:** SOTA · **Tier:** precomputed · `bedblend/blocks.py`

## The data structure

Every pad cell owns an ordered stack of lots, bottom to top. A lot records which deposition event it
came from, how many tonnes it is, its grades and its coarse fraction. Depositing pushes; the relaxation
cascade moves material from the TOP of a source stack to the top of a destination stack, because that
is what an avalanche does; reclaiming pops according to the geometry of the method.

A cut's provenance is then the tonnage-weighted histogram of the event ids it consumed.

## The published analogue

Cited so the product does not imply it invented this. Zhao, Lu, Koch and Hurdsman model a stockpile as
a grid of voxels each holding a quality composition, and compute a bucket-wheel cut's quality in
advance from it. The near-real-time version, driven by GPS dump and load positions, is Zhao, Lu,
Statsenko and Koch, and it is being translated into operations at OZ Minerals. That paper's abstract
states plainly that tracing ore grade at a run-of-mine stockpile is hard with current fleet-management
systems because the information is not available in real time, which is the gap this product exists to
make visible.

## The invariant that matters most

    sum_e f_e = 1     for every cut, to 1e-12

A ledger that loses or double-counts material still draws a convincing pile and still reports plausible
grades. The only way to know it is wrong is to check the identity numerically, on every cut, on every
case, which the test suite and the app both do. The app SHOWS the sum rather than asserting it.

## One performance decision with no modelling cost

Every transfer splits the straddling lot, so without intervention a column accumulates thousands of
slivers of the same deposition event and the simulation goes quadratic. Lots from the SAME event are
merged on push, with a tonnage-weighted coarse fraction: exactly lossless for provenance and exactly
lossless for species mass. Lots from DIFFERENT events are never merged, because that is precisely the
information the ledger exists to keep.

## Where it fails

The ledger stores a discrete stack per column. A real pile has continuous mixing at every interface
from rolling, avalanching and re-handling, so the model's interfaces are sharper than reality. The
stratigraphic view therefore draws a mixing band at every boundary, the provenance is reported as
FRACTIONS and never as "this cut came from dump 47", and the caveat sits under the view rather than
only in this wiki.

## References

Zhao, S., Lu, T.F., Koch, B. and Hurdsman, A. (2015). doi:10.1016/j.minpro.2015.04.012

Zhao, S., Lu, T.F., Koch, B. and Hurdsman, A. (2015). Automatic quality estimation in blending using a
3D stockpile management model. Adv. Eng. Inform. 29(3), 680-695. doi:10.1016/j.aei.2015.07.002

Zhao, S., Lu, T.F., Statsenko, L. and Koch, B. (2021). A framework for near real-time ROM stockpile
modelling to improve blending efficiency. J. Eng. Des. Technol. 20(2), 497-515. doi:10.1108/JEDT-12-2020-0541
