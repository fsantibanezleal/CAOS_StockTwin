# Realistic multi-element assay for a Chilean porphyry ROM stockpile

Research pass, 2026-08-03. Persisted before implementation, per the standing rule that a plan is
built from sources on disk and not from memory.

**Why this exists.** The product carried ONE variable per column, a copper grade, and the whole point
of stockpile characterisation is what is actually inside the pile. A stockpile is not characterised
by its copper grade; it is characterised by everything the plant will meet when the material arrives,
and by the fact that those quantities are distributed in three dimensions because they were placed
there load by load.

## The variables, with sources and ranges

### Primary, intrinsic to the rock

| variable | unit | range used | basis |
|---|---|---|---|
| Cu | % | 0.30 to 1.10, mean 0.55 | Porphyry feed averages 0.4 to 0.8 percent Cu in large-scale operations; a typical large porphyry is around 0.5 percent, with core zones delivering 0.8 to 1.2 percent when mined selectively |
| Mo | ppm | 20 to 450, mean 180 | Chilean porphyries are molybdenum-rich. Superleached capping at Escondida measured 10 to 480 ppm Mo; El Salvador carries 0.022 percent, which is 220 ppm |
| Au | g/t | 0.01 to 0.30, mean 0.08 | Porphyry Cu-Au deposits run 0.2 to 2.0 g/t Au. A Chilean Cu-Mo porphyry is an order of magnitude below that, so the range is set well under the Cu-Au band rather than borrowed from it |
| Ag | g/t | 0.5 to 6.0, mean 2.2 | Silver is a routine by-product credit of the Chilean porphyries |
| Fe | % | 1.5 to 7.0, mean 3.4 | Pyrite plus magnetite. Reported here because iron is a dilutant in the concentrate, not because it is a product |
| clay | % | 1 to 18, mean 6.5 | Clay minerals in Chilean porphyry deposits range from simple kaolinite to complex chamosite and illite-group minerals; kaolinite, chlorite, illite and montmorillonite are all present across porphyry ores |
| pH | 1 to 14 | 4.0 to 8.5, mean 7.2 | Fresh sulphide is near neutral; oxidising pyrite drives it acid, so pH is generated ANTI-correlated with Fe |
| moisture | % | 1.5 to 12.0, mean 4.5 | Fine kaolinite holds water to about 50 percent of the solids weight and montmorillonite to about 70, so moisture is generated correlated with clay |

### Response, derived from the primaries

**Estimated recovery, percent.** The geometallurgical literature models recovery as a response
variable predicted from primary variables, exactly as done at Olympic Dam where relationships were
built from 204 input variables onto six performance variables including copper recovery and acid
consumption. The form used here is the standard one: recovery rises with head grade and is penalised
by the two known deleterious constituents.

    R = R0 + k_cu * (Cu - Cu_ref) - k_clay * clay - k_fe * max(0, Fe - Fe_ref)

with `R0 = 88.5`, `k_cu = 9.0` per percent Cu, `k_clay = 0.55` per percent clay, `k_fe = 0.9` per
percent Fe above 3.0, clipped to [58, 94].

The clay penalty is the best supported of the three. Swelling clays adversely affect flotation mainly
by adsorbing water, changing the rheology and the froth stability, and reducing both grade and
recovery; increasing bentonite reduces the amount of froth and decreases copper recovery. Kaolinite
increases froth stability and reduces the flotation GRADE while illite shows the least effect on
flotation, so a single clay percentage is a simplification and is labelled as one in the product.

**What is NOT claimed.** This is a plausible, sourced, seeded synthetic assay. It is not a fitted
model of any deposit, no operation's data was used, and the recovery expression is a teaching form
with published coefficients' signs rather than a calibrated geometallurgical model. Every scenario is
labelled synthetic in the app for that reason.

## The correlation structure, and why it is not a covariance matrix

The variables are generated from a small number of shared latent factors rather than by imposing a
correlation matrix, because the correlations in a real deposit come from shared geology and that is
what should be in the model:

- a **hydrothermal intensity** factor drives Cu, Mo, Ag and Au together
- a **sulphide** factor drives Fe up and pH down
- an **alteration** factor drives clay up, and moisture follows clay

Each variable then takes its own independent component on top. The result is that Cu and Mo correlate
positively and moderately, Fe and pH correlate negatively and strongly, and clay and moisture
correlate positively and strongly, all of which are the relationships the sources describe, without
anyone typing a correlation coefficient.

## What this changes in the product

1. Every load carries an assay, not a grade. The ledger records it per lot.
2. The artifact ships the pile as a VOLUME: per column, the ordered lots with their z interval and
   their assay, so the browser can cut the pile open at any depth and colour the section by any
   variable. Shipping only the surface was the defect this research pass exists to correct.
3. The colour map covers elevation and every assay variable, with level sets on elevation.

## Sources

- [USGS, Porphyry Copper Deposits of the World: Database, Map, and Grade and Tonnage Models (OF 2005-1060)](https://pubs.usgs.gov/of/2005/1060/of2005-1060.pdf)
- [Porter, T.M., The Escondida Porphyry Copper Deposit, Northern Chile](https://portergeo.com.au/full_text/Porter_Escondida-PGC_Publishing.pdf)
- [Chuquicamata porphyry copper deposit, USGS SIR 2010-5090Z record](https://mrdata.usgs.gov/sir20105090z/show-sir20105090z.php?id=286)
- [The different effects of bentonite and kaolin on copper flotation, Applied Clay Science](https://www.sciencedirect.com/science/article/abs/pii/S0169131715001763)
- [Effects of aluminosilicate minerals on copper-molybdenum flotation from Sarcheshmeh porphyry ores, Minerals Engineering](https://www.sciencedirect.com/science/article/abs/pii/S0892687511000239)
- [A review of phyllosilicate minerals in flotation: mechanisms of deleterious effect and mitigation, Minerals Engineering](https://www.sciencedirect.com/science/article/abs/pii/S0892687525000081)
- [Geometallurgical Modeling at Olympic Dam Mine, South Australia](https://www.researchgate.net/publication/257619917_Geometallurgical_Modeling_at_Olympic_Dam_Mine_South_Australia)
- [Geometallurgical simulation of the work index in a porphyry copper deposit](https://dialnet.unirioja.es/descarga/articulo/9589650.pdf)
