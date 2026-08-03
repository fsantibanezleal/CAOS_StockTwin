# Method 18: material, the density chain and moisture-dependent repose

**Family:** material · **Rung:** classical · **Tier:** precomputed · `bedblend/material.py`

## What it computes

The properties that turn a tonnage into a volume and a volume into a shape. Three of them matter and
all three are commonly got wrong by using a single density.

## The density chain

A tonne of rock occupies three different volumes over its life, and the model carries all three
rather than collapsing them:

    rho_loose   = rho_insitu / (1 + swell)
    rho_placed  = rho_loose * (1 + compaction)

**Swell** is the bulking that happens when rock is blasted and loaded. For hard rock it runs 30 to 45
percent. Using the in-situ density to size a truckload understates the volume the load occupies on
the ground by nearly a third, which is a third of the way to the wrong dump geometry.

**Compaction** is what haul traffic does afterwards, 5 to 15 percent over 20 to 30 passes. It is
applied as a scalar, and that is a stated limitation: real compaction is heaviest where the trucks
actually drive, which is the haul route and the tip head, and lightest at the toe.

The load volume a truck delivers therefore follows from its PAYLOAD and the loose density, not from
its tray capacity:

    V_load = payload_t / rho_loose

## Repose is moisture-dependent, and not monotonically

This is the part that surprises people, and it is why moisture is a property rather than a constant.

Adding water to a dry granular material RAISES its angle of repose: capillary bridges between grains
add cohesion and the pile stands steeper. That continues up to a point. Past saturation the bridges
are gone, the pore pressure carries part of the load, and the angle COLLAPSES, in the limit to
something a slurry would do.

    theta(w) = theta_dry + k * w        for w below saturation
    theta(w) -> collapses               past it

A model that treats wet material as simply "steeper" or simply "flatter" gets one half of that right
and the other half backwards.

## The angle of repose itself

Published handbook values for ores run from about 34 degrees (copper, Norway) to about 60 (copper,
Peru), and the value moves with particle size, moisture and time since dumping. The product defaults
to 37 degrees and exposes it as a parameter. It is not a universal constant and it is not presented
as one.

## Fresh material stands steeper than it settles

A load that has just left the tray stands at roughly 2:1 before it settles to repose. That is why the
paddock operator places an elliptical frustum at the fresh slope and then relaxes it, rather than
placing it at repose directly: the intermediate shape is what determines where the material ENDS UP,
because relaxation moves it downhill from wherever it first landed.

## The size split

Each load carries a coarse and a fine fraction. The split is a property of the material as it leaves
the shovel, and it is what [method 4](04_segregation.md) redistributes down a face. A load that never
ran out on a face keeps its own split unchanged, which is why the coarse fraction across a shipped
pile spans 0.000 to 0.483 rather than sitting at a uniform value: only the loads that cascaded were
sorted.

## Where it fails

**One material, one size split, one moisture, per scenario.** Real run-of-mine feed varies in all
three from bench to bench, and the variation is correlated with grade, which would couple the
segregation model to the blending model in a way this does not.

**Compaction is a scalar, not a field.** Stated above and worth repeating, because it is the
assumption most likely to matter if anyone tries to use the placed density for a survey
reconciliation.

**Time is not modelled.** Repose changes with time since dumping, and a stockpile that sits through a
wet season is not the pile that was built. Nothing here ages.
