# Methods

Nineteen methods in eight families. For each: what it computes, its equation, its source with a real
DOI, which lane it runs in, and where it fails.

Tier: **L** runs live in the browser, **P** is precomputed offline by
[`bedblend`](https://pypi.org/project/bedblend/), **P to L** is trained offline and executed live, and
**NOT IMPLEMENTED** is declared in the plan with no engine behind it. The last is a real value and it
is used: a method name offered as though it ran, with nothing behind it, is what the acceptance
contract forbids.

The split is not arbitrary. Anything that touches the terrain is precomputed, because routing a load
over the trafficable surface, flooding the pad for reachability and relaxing the whole height field
after every operation is tens of seconds for a few hundred loads. Anything that is a VERDICT over the
event log is recomputed in the browser, because a baked number is unfalsifiable: a reader could not
tell a real result from a typo.

| # | Method | Family | Rung | Tier | Page |
|---|---|---|---|---|---|
| 1 | Angle-of-repose relaxation, floor-aware | geometry | classical | P | [01](methods/01_relaxation.md) |
| 2 | The dump plan: areas, benches, lifts, ramp | planning | classical | P | [02](methods/02_dump-plan.md) |
| 3 | Two-phase bench construction | planning | SOTA | P | [03](methods/03_bench-construction.md) |
| 4 | Gray-Thornton kinetic segregation | segregation | SOTA | P | [04](methods/04_segregation.md) |
| 5 | The Makse stratification regime | segregation | SOTA | P | [05](methods/05_stratification.md) |
| 6 | Depth-averaged reclaim-face slump. The face is the repose surface the relaxation solver produces | segregation | SOTA | NOT IMPLEMENTED | [06](methods/06_mu-i-slump.md) |
| 7 | Discrete-element calibration heap | segregation | SOTA | P | [07](methods/07_dem-calibration.md) |
| 8 | Per-cell lot ledger and provenance | traceability | SOTA | P | [08](methods/08_lot-ledger.md) |
| 9 | Variance reduction ratio | blending | classical | L | [09](methods/09_vrr.md) |
| 10 | Experimental variogram | blending | classical | L | [10](methods/10_variogram.md) |
| 11 | The 1/N independent-layer bound | blending | classical | L | [11](methods/11_ideal-bound.md) |
| 12 | Residence-time distribution | traceability | classical | L | [12](methods/12_rtd.md) |
| 13 | Geostatistical stream synthesis from shovel dwell | data | classical | P | [13](methods/13_stream-synthesis.md) |
| 14 | Measured dump-profile geometry | geometry | SOTA | P | [14](methods/14_dump-profiles.md) |
| 15 | Dozer operations and displacement uncertainty | operations | SOTA | P | [15](methods/15_dozer.md) |
| 16 | Trafficability, reachability and routing | operations | SOTA | P | [16](methods/16_trafficability.md) |
| 17 | Topography and the five fill types | geometry | classical | P | [17](methods/17_topography.md) |
| 18 | Material: density chain and moisture-dependent repose | material | classical | P | [18](methods/18_material.md) |
| 19 | Reclaim haulage: loader, truck stand, routed in empty and out loaded | operations | SOTA | P | [19](methods/19_reclaim-haulage.md) |
| 20 | The reclaim face: machine reach bounds a cut, and the stance trams | operations | SOTA | P | [20](methods/20_reclaim-face.md) |

## What changed, and why the ladder looks different

An earlier version of this product listed five stacking geometries (chevron, windrow, cone shell,
strata, chevcon) and four reclaim geometries as its first two methods. **Those are conveyor-stacker
geometries.** Of the five pre-crusher stockpile types only blended-in-blended-out is a chevron bed,
and the software that builds those beds is written for conveyor systems. Trucks do not build a
chevron. Offering the geometries alongside a truck fleet was a category error, and the ladder now
carries the methods a truck-built pile actually needs: a dump plan, a two-phase bench campaign,
measured dump profiles, a dozer, and a trafficability model.

## What "beyond SOTA" would mean here, and what is NOT claimed

Nothing in this ladder is claimed as a new method. Methods 3, 14, 15 and 16 are SOTA in the narrow
sense that they implement published field measurement rather than a rule of thumb: the two-phase
campaign and the radial sweep pattern come from a surveyed operation, the dump profiles are
calibrated against a published envelope, and the dozer's displacement statistic exists because the
same source says in terms that dozing mixes material "in intractable ways".

Two learned surrogates were scoped and are NOT built. They are not listed above, because a name in a
table is not a method, and a Benchmark page that shows an unmeasured model beside measured ones is
worse than one that says the work was not done.

## Where each one fails

Every page ends with that section, and it is not decoration. The two that matter most:

- **Method 9, the variance reduction ratio,** is `var_out / var_in` and it flatters a bed whose input
  carries a trend, because a trend inflates the denominator without being the kind of variability
  blending can remove. The `trending` scenario exists to show exactly that.
- **Method 11, the 1/N bound,** needs an effective count of independent layers, and estimating that
  from a real cut is not reliable in every geometry. Where it is not, the product WITHHOLDS the bound
  rather than printing a number it cannot defend.
