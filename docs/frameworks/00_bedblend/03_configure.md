# bedblend, configuration that matters

**There is no single config object.** The engine takes plain arguments, and the product's control
surface is `Scenario` in `data-pipeline/pipeline/scenarios.py`, which holds the knobs for one case and
hands them to the engine's functions. An earlier version of this page described a `RunConfig` and a
`PadSpec` that never existed in this engine.

## What the engine takes

| call | what you give it |
|---|---|
| `Terrain.flat(nx, ny, cell_m)` or `topography.ground(...)` | the pad, in cells of `cell_m` metres |
| `rectangular_yard(n_areas=, area_width_m=, area_length_m=, bench_height_m=, n_benches=, gap_m=, classes=, repose_deg=, ramp_width_m=, margin_m=)` | the dump plan |
| `Fleet.of(n_trucks, TruckSpec(), shovel_xy, repose_deg=)` | the machines and where they load |
| `dig_sequence(n_loads=, seed=, loads_per_block=, mean_grade=, block_sd=, bench_trend=, n_benches=)` then `payloads_from(seq, seed=)` | the incoming stream |
| `build(terrain, plan, fleet, payloads, repose_deg=, face_angle_deg=, seed=, paddock_frac=, max_spot_offset_m=, after_load=, snapshot_every=, material=, route=)` | the build loop |
| `ReclaimFace(method=, position_m=, direction=, depth_m=, width_m=, max_face_m=, loader=, centre_t_m=)` and `campaign(..., cut_tonnes=, n_cuts=, repose_deg=, exit_xy=, max_grade=)` | the reclaim |

## The parameters that change an answer rather than a picture

| knob | where | what it decides |
|---|---|---|
| `n_loads`, `loads_per_block` | the stream | how many layers there are and how correlated they are. This is the dominant term in every blending result, and the `1/N` bound is set by it |
| `n_benches`, `bench_height_m` | the plan | how many lifts a vertical cut crosses. One bench means a full-height cut crosses one lift and the extraction order stops mattering |
| `paddock_frac` | the build | how much of a bench goes down as base layer before the edge campaign starts. Set it too high and the edge campaign, which is where segregation happens, never runs |
| `cut_tonnes`, `n_cuts` | the reclaim | the parcel the plant receives, and how much of the pile comes back out |
| `reclaim_mode` | the product | `after` runs the campaign once the build is finished; `concurrent` interleaves it, so the reclaim works a pile that is still growing |
| `LoaderSpec.dig_radius_m`, `max_cut_height_m` | the machine | how much ground one cut can touch. Nothing else bounds the footprint |
| `ReclaimMethod` | the reclaim | LIFO, FIFO or FULL_HEIGHT. Only distinguishable when `max_face_m` is shorter than the column |
| `repose_deg` | the material | the imposed critical slope, and through it trafficability: a truck climbs about two thirds of it, so this decides what the pile lets you do |
| `Material.d50_mm`, `coarse_fraction` | the material | the size split the segregation solver sorts, and the grain floor on the flowing layer |

## What is NOT a knob

The **segregation number is not an input.** It is derived per load by `avalanche_state` from the drop,
the face angle and the material. The two coefficients underneath it, `PERCOLATION_COEFFICIENT` and
`PECLET_DEFAULT`, are module constants anchored to the literature rather than run parameters; see
[../../methods/07_dem-calibration.md](../../methods/07_dem-calibration.md) for what would replace them.

The **seed** is not a knob in the sense the others are. It selects one realisation; changing it should
change the numbers within the band and not the conclusion, which is what the multi-seed band is for.
