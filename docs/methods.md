# Methods

Fifteen methods in four families. For each: what it computes, its equation, its source with a real
DOI, which lane it runs in, and where it fails.

Tier: **L** runs live in the browser, **P** is precomputed offline, **P to L** is trained offline and
executed live.

| # | Method | Family | Rung | Tier | Page |
|---|---|---|---|---|---|
| 1 | Angle-of-repose relaxation | geometry | classical | L | [01](methods/01_relaxation.md) |
| 2 | Five stacking geometries | geometry | classical | L | [02](methods/02_stacking.md) |
| 3 | Four reclaim geometries | geometry | classical | L | [03](methods/03_reclaim.md) |
| 4 | Gray-Thornton kinetic segregation | segregation | SOTA | L | [04](methods/04_segregation.md) |
| 5 | The Makse stratification regime | segregation | SOTA | L | [05](methods/05_stratification.md) |
| 6 | Depth-averaged reclaim-face slump | segregation | SOTA | P | [06](methods/06_mu-i-slump.md) |
| 7 | Discrete-element calibration heap | segregation | SOTA | P | [07](methods/07_dem-calibration.md) |
| 8 | Per-cell lot ledger and provenance | traceability | SOTA | L | [08](methods/08_lot-ledger.md) |
| 9 | Variance reduction ratio | blending | classical | L | [09](methods/09_vrr.md) |
| 10 | Experimental variogram | blending | classical | L | [10](methods/10_variogram.md) |
| 11 | The 1/N independent-layer bound | blending | classical | L | [11](methods/11_ideal-bound.md) |
| 12 | Residence-time distribution | traceability | classical | L | [12](methods/12_rtd.md) |
| 13 | Geostatistical stream synthesis | data | classical | P | [13](methods/13_stream-synthesis.md) |
| 14 | Learned variance-reduction surrogate | blending | beyond-SOTA here | P to L | [14](methods/14_vrr-surrogate.md) |
| 15 | Learned segregation-profile surrogate | segregation | beyond-SOTA here | P to L | [15](methods/15_segregation-surrogate.md) |

## What "beyond SOTA" means here, and what it does not

Methods 14 and 15 are beyond the published state of THIS specific problem in a narrow, defensible
sense: no paper found in the research pass ships a trained surrogate mapping (input variogram,
stacking method, layer count, reclaim rule) to an achieved variance reduction with an interval.
Marques and Costa (2013) simulate it case by case; Kumral (2006) fits a multiple regression over
stockpile parameters, which is the nearest prior art and the baseline the surrogate must beat.

The claim is therefore "a learned surrogate over a swept corpus, with Kumral's regression as the
baseline it has to beat", not "a new method". If it does not beat that baseline by more than the
baseline's own bootstrap band, the honest report is a negative result on the Benchmark page.
