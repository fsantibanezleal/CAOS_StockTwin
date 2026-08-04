# Method 14: measured dump-profile geometry

**Family:** geometry · **Rung:** SOTA · **Tier:** precomputed · `bedblend/dump.py`

## What it computes

The shape a single truckload actually leaves on the ground, chosen from four measured profiles and
sized so that the result lands inside a published survey envelope rather than inside an assumption.

| profile | when it is used |
|---|---|
| oval | well back from the crest: the load stands where it fell, roughly symmetric |
| comet | approaching the crest: the load elongates downslope with a tail |
| rectangular | at the crest, contained: the tray empties into a bounded footprint |
| sloughed heap | over the crest, running out: the load collapses down the face |
| paddock | no face within reach at all: an elliptical frustum sized by the truck body |

The choice is made by DISTANCE TO THE LIVE CREST, measured on the terrain at the moment the truck
arrives, not by the label the plan attached to the tip.

## The measured envelope

Twenty-eight haul-truck dumps surveyed by UAV photogrammetry:

| dimension | range |
|---|---|
| length | 13 to 46 m |
| width | 11 to 23 m |
| thickness | 0.368 to 2.032 m |
| angle | 12 to 36 degrees |
| volume | 94 to 155 cubic metres |

The engine's placed dumps are checked against this envelope over a whole build, not on a single clean
call, because a geometry that is right in isolation and wrong under a campaign is wrong.

## Width is calibrated to the survey, not to the truck bed

This is a small point with a large consequence. It is tempting to set the dump width to the truck's
bed width, which is 7.3 m on the reference machine. The surveyed width is 11 to 23 m. A load does not
stay as wide as the tray: it spreads. Using the bed width produced dumps a third of the measured
width and a crest that advanced far too slowly for the volume being placed.

## The shape functions

A dump is placed as a mass distribution over cells rather than as a solid. Two shape functions
combine: one across the dump, one along it.

    m(s, w) = A(s) * B(w)

`s` runs from the tray to the far end of the run-out and `B` is a half-width profile. For a sloughed
heap the mass is biased down-slope by a slough extent of 0.85, which is what makes the toe of a
cascading dump reach further than its crest.

The placement records `s_frac` per cell, the fractional position along the run-out. That is what the
segregation solver in [method 4](04_segregation.md) marches along, so the two methods are coupled
through this return value rather than through a shared assumption.

## Every edge dump runs perpendicular to the crest tangent

The heading is not the truck's approach heading and it is not a plan parameter. It is the outward
normal of the crest at the spot, computed from the terrain. A dump that runs along the crest instead
of over it would not cascade at all, and the direction of every deposit would look arbitrary rather
than determined.

## Sources

Young and Rogers, *Mining* 2(1), 2022, doi:10.3390/mining2010006, table 5 for the measured envelope
and the four profile classes.

The dataset itself is published: doi:10.3390/min11060636 supplementary, as surveyed DWG surfaces.

## Where it fails

**The engine is fitted to the published TABLE, not to the surfaces.** The DWG surfaces were located
and are cited, and the profile functions were calibrated against the tabulated envelope rather than
against the point clouds. Fitting to the surfaces directly would be a stronger calibration and it has
not been done. This is a stated gap, not an oversight discovered later.

**All twenty-eight surveyed dumps came from one class of machine.** Whether the geometry scales with
the truck or was fitted to that one corpus is a question this product can pose but not answer from
the data it has.
