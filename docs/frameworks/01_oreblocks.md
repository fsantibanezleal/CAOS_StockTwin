# oreblocks

**Lane:** offline · **Install:** `pip install oreblocks`

## What it is

Synthetic three-dimensional ore-body block models of the MineLib nature: four seeded deposit archetypes
(porphyry, vein, layered, core halo), per-block grades, bench structure, slope precedence, ultimate-pit
economics with per-block destination, an exact max-closure solver, and extraction states with loading
faces. Apache-2.0, published with a CC-BY software note at doi:10.5281/zenodo.21512088.

## Why this and not a hand-rolled generator

Per-block ground truth on real mines is licensed or proprietary. oreblocks generates instances of the
same nature with a stamped exact optimum, it is deterministic given `(archetype, dims, seed)`, and it
is already part of this product line. Writing another ore-body generator here would be re-deriving a
shared building block, which the archetype rules forbid.

The piece that matters most for StockTwin is the extraction state with LOADING FACES: it is precisely
the mechanism that turns a block model into an ordered sequence of dig locations, which is what produces
a truck stream with realistic spatial autocorrelation between consecutive loads.

## Runnable example

```python
from oreblocks import make_twin

twin = make_twin("porphyry", dims=(20, 20, 10), seed=42)
print(twin.upit.pit_value, twin.upit.n_in_pit)
twin.write("out/")
```
