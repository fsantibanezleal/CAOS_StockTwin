# oreblocks, what it is and why this one

## What it is

Synthetic three-dimensional ore-body block models of the MineLib nature: four seeded
deposit archetypes (porphyry, vein, layered, core halo), per-block grades, bench structure, slope
precedence, ultimate-pit economics with a per-block destination, an exact max-closure solver, and
extraction states with loading faces. Apache-2.0, software note at doi:10.5281/zenodo.21512088.

## Why this and not something else

Per-block ground truth on real mines is licensed or proprietary. oreblocks generates
instances of the same nature with a stamped exact optimum, is deterministic given
`(archetype, dims, seed)`, and is already part of this product line, so using anything else would be
re-deriving a shared building block.

The piece that matters here is the extraction state with LOADING FACES. It is what turns a static
block model into an ordered sequence of dig locations, and that ordering is the whole point: it gives
the truck stream a spatial autocorrelation that comes from geology and mining sequence rather than
from a correlation parameter someone typed.
