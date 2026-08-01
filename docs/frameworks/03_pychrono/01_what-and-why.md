# PyChrono, what it is and why this one

## What it is

A multi-physics engine with a discrete-element module. Used here for one narrow
purpose: a bidisperse heap simulation whose measured segregation distance calibrates the
Gray-Thornton segregation number `Sr` that the continuum solver takes as a parameter. BSD-3-Clause.

## Why this and not something else

`Sr` is a non-dimensional group, not a measurement, and a product that sweeps it
without ever anchoring it is sweeping an abstraction. DEM is the only way to get a number from
particle properties rather than from a fit.

PyChrono rather than YADE or LIGGGHTS because it is the only one of the three with a supported
win-64 build; the others need WSL, which has blocked this line before.

It is a calibration tier and nothing more. It never runs in the product, never runs in CI, and never
touches a canonical artifact. If the calibration cannot be made to run, the method is DELISTED from
the ladder and the Benchmark page says so, rather than the number being quietly assumed.
