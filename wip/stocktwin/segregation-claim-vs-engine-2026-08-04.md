# The segregation the product documents is not the segregation it runs

**Found:** 2026-08-04, while researching whether particle degradation was worth modelling.
**Status:** VERIFIED by reading the call graph. Decision pending with Felipe.

## What the product claims

`docs/methods/04_segregation.md`, the Methodology page, the architecture modal and the README all
describe the segregation as **Gray and Thornton kinetic sieving, reduced on a flank to a
one-dimensional conservation law in depth, solved with a Godunov flux so the concentration shocks
survive**, rated SOTA on the method ladder. Method 4 carries the equations, the segregation number
`Sr`, the CFL sub-stepping and 32 depth cells.

## What actually runs

    bedblend/build.py:50      from .facesegregation import segregate_face
    bedblend/facesegregation.py   does NOT import segregation.py at all

`bedblend/segregation.py` holds the real machinery: `FlowingLayer`, `segregation_number`, `CFL`,
`NZ_DEFAULT`. It is exported from `__init__.py` and **called by nothing in any shipped code path.**

What `segregate_face` does instead, in full:

```python
h = 1.0 - math.exp(-drop_m / REFERENCE_DROP_M)          # fitted curve
a = clamp((face_angle_deg - 28.0) / (45.0 - 28.0))      # fitted ramp
s = 4.0 * c * (1.0 - c)                                 # "the simplest function with that shape"
g = h * a * s                                           # the intensity

base   = [0.35 + 0.65 * v for v in s]                   # fitted mass distribution
coarse = [b * (1.0 + 2.2 * g * (v - 0.5)) ...]          # 2.2 fitted
fine   = [b * (1.0 - 1.6 * g * (v - 0.5)) ...]          # 1.6 fitted
overrun = min(0.25, 0.30 * g * (1 - exp(-drop / 2R)))   # "an operational judgement"
```

Three heuristic curves and six fitted constants. No `Sr`. No conservation law. No Godunov flux. No
shock. The DIRECTIONS are right and are published (coarse to the toe, stronger with drop and face
angle, zero for a single-sized material), which is why the output looks reasonable and why this
survived: it is a defensible operational model wearing the label of a validated continuum one.

## Why this matters more than a wording error

It is the SOTA rung of the method ladder. It is the justification for the `Sr` calibration lane and
for method 7 existing at all. And the DEM-calibration doc describes calibrating an `Sr` that the
running code does not have.

## How it survived

The same way the parcel-split defect did, and the two were found in the same hour: nothing compares
the code that RUNS with the code that is DOCUMENTED. Every gate checks the artifact against itself.

## The two honest options

**A. Correct the claim.** Rewrite method 4 to describe the heuristic that runs, demote it from SOTA,
and list `segregation.py` as declared-and-not-wired beside mu(I). Small, honest, ships immediately.

**B. Wire the real march.** Make `segregate_face` call the Gray-Thornton solver that is already
written and already tested, so the documentation becomes true. Changes every `coarse` value and every
`seg` index in the artifact, on top of the 40 percent correction from 0.6.1, and needs its own
verification pass against the published concentration profiles.

## The gate that should exist either way

A check that every method the ladder rates SOTA names a module, and that the module is reachable from
`build()` or from the pipeline. A method whose implementation nothing calls is the same defect as a
selector entry with no engine behind it, which the acceptance contract already forbids.
