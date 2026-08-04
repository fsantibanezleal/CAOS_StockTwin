# bedblend, what it is and why this one

## What it is

The bed-blending physics itself: repose-angle deposition, Gray-Thornton kinetic size
segregation, the per-cell lot ledger with provenance, the LIFO, FIFO and full-height reclaim methods
with the haul cycle that carries each cut off site, and
the blending metrics. MIT, published at pypi.org/project/bedblend.

This is the product's own engine, and it is a dependency rather than a folder inside this repository
on purpose. A product may not declare its own package: either the code is a real library in its own
repository, published and consumed pinned, or it is not a package at all. The physics is genuinely
reusable, so it took the first branch and lives in CAOS_BedBlend.

## Why this and not something else

Nothing else models a blending bed at this level. The alternatives are DEM, which
cannot run a 320-truck build interactively and answers a different question, and spreadsheet
variance arithmetic, which assumes the layer independence that is precisely what a real pile does not
give you.

Writing it inside this repository was the original mistake. An unpublished internal package
advertises a library nobody can install, and it hides a genuinely reusable engine inside one
application. Extracting it also forced the boundary to be honest: everything product-specific, the
case registry and the two data contracts, stayed here, and only physics crossed over.
