# bedblend, a runnable example

Build a real stockpile: a plan with a reserved access ramp, trucks that must reach where they are
going, a dozer that turns the base layer into a floor, then a reclaim campaign.

```python
import bedblend as bb

REPOSE = 37.0

# The site. Only one of the five published stockpile fill types is a flat pad; this is that one.
terrain = bb.Terrain.flat(56, 56, 2.5)

# The plan. Areas are NAMED dump location polygons with a bench schedule, which is how a real
# fleet-management system locates a load: by name and bench height, not by a bare coordinate.
plan = bb.rectangular_yard(n_areas=1, area_width_m=70.0, area_length_m=70.0,
                           bench_height_m=8.0, n_benches=1)
plan.row_spacing_m, plan.tip_spacing_m = 10.0, 8.0
plan.areas[0].access_xy = (70.0, 0.0)     # reserved corridor; nothing is tipped on it

# The stream. Grade autocorrelation is a CONSEQUENCE of how long the shovel dwells in one dig block,
# not an input: consecutive trucks load from the same block, so consecutive grades are similar.
seq = bb.dig_sequence(n_loads=120, seed=7, loads_per_block=20)
loads = bb.payloads_from(seq, seed=7)
print(f"measured stream range {bb.measured_range_t(loads):.0f} t (reported, not set)")

# The fleet. The shovel sits OUTSIDE every dump area: put it inside and the first load buries the
# loading point, after which nothing can leave it.
fleet = bb.Fleet.of(3, bb.TruckSpec(), (130.0, 12.0), repose_deg=REPOSE)

res = bb.build(terrain, plan, fleet, loads, repose_deg=REPOSE)
print(f"{len(res.placed)} loads placed, {res.refusal_rate:.1%} of planned tips refused")
print(f"dump profiles: {res.profile_counts()}")

# The invariants. A pile standing over its angle of repose renders as spikes, and a ledger that has
# drifted from the terrain attaches every reported grade to the wrong place.
bb.assert_stable(res.terrain, REPOSE)
res.model.assert_consistent(res.terrain)
n_over, worst = bb.count_over_repose(res.terrain.z, res.terrain.nx, res.terrain.ny,
                                     res.terrain.cell_m, REPOSE, floor=res.terrain.z0)
print(f"{n_over} cell pairs over repose, worst local slope {worst:.1f} deg")

# Reclaim a vertical face through every lift, which is the only order that blends them. exit_xy and
# max_grade add the haul cycle: an empty truck routed in, a loaded truck routed out, held to the
# same gradient limit as the delivering fleet, tan(37)/1.5 = 0.50. The exit is the SITED LOADING
# POINT, outside every dump area. Omit them and the material leaves the ledger with nothing on site
# carrying it away.
face = bb.ReclaimFace(method=bb.ReclaimMethod.FULL_HEIGHT, depth_m=10.0, width_m=1e6)
cuts = bb.campaign(res.terrain, res.model, face,
                   cut_tonnes=1500.0, n_cuts=10, repose_deg=REPOSE,
                   exit_xy=(130.0, 12.0), max_grade=0.50)

# Every reclaimed tonne traces back to the dig blocks that made it, WITH the distance a dozer has
# shoved it since. Provenance quoted without that displacement claims a precision no operation has.
first = cuts[0]
print(f"cut 0: {first.tonnes:.0f} t at grade {first.grade:.3f}, "
      f"from {len(first.provenance)} dig blocks, "
      f"mean displacement {first.displacement_m:.1f} m")

grades_in = [p.grade for p in loads]
var_in = bb.tonnage_weighted_variance(grades_in, [1.0] * len(grades_in))
var_out = bb.tonnage_weighted_variance([c.grade for c in cuts], [c.tonnes for c in cuts])
print(f"variance reduction {bb.vrr(var_in, var_out):.3f}; "
      f"lower is better and 1.0 means the pile did nothing")
```

This example is executed by `scripts/check_framework_examples.py`, so it cannot rot into an
incantation that no longer runs.
