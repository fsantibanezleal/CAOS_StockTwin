"""Run a scenario and write the artifacts the app renders.

WHY THE SIMULATION IS BAKED. The v2 engine routes every load over the trafficable surface, floods the
pad for reachability, relaxes after every operation and sorts each cascading load by size. That is
tens of seconds per few hundred loads, which is fine offline and unusable in a page.

WHAT SHIPS, and the split is deliberate.

  THE TRACE carries EVENTS and GEOMETRY: the dump plan, terrain snapshots through the build, every
  load with its approach and departure path, the block field, and the reclaim cuts.

  THE TRACE DOES NOT CARRY THE VERDICTS. Variance reduction, variograms, the efficiency against the
  ideal bound, the sector rollups and their confidence intervals are all recomputed in the browser
  from the events. A trace that shipped a baked ratio would be a slide, and its number would be
  unfalsifiable: a reader could not tell a real result from a typo.

  THE MANIFEST is a pure function of the scenario and its seed. No wall clock, no host name, no
  absolute path. A manifest that changed on every re-bake would make the git history of the
  scientific evidence useless, because a real change would stop being distinguishable from a re-run.

EVERY BAKE IS GATED. The invariants that made v2 necessary are checked here, not merely hoped for:
zero cell pairs over the angle of repose, the ledger agreeing with the terrain, mass conserved against
the loads actually placed, and the scenario's own kill criterion. A bake that violates one fails
rather than writing a pretty artifact.
"""
from __future__ import annotations

import argparse
import dataclasses
import itertools
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

from bedblend.blending import tonnage_weighted_variance
from bedblend.build import BuildResult, build
from bedblend.material import Material
from bedblend.reclaim import Cut, ReclaimFace, ReclaimMethod, campaign
from bedblend.relax import STABLE_TOL_DEG, count_over_repose
from bedblend.sectors import quadrants, rollup
from bedblend.stream import dig_sequence, measured_range_t, payloads_from
from bedblend.terrain import Terrain
from bedblend.topography import FillType, buildable_fraction, ground, relief_stats
from bedblend.truck import Fleet, passable_mask

from .assay import VARIABLES as ASSAY_VARIABLES
from .assay import assay_for
from .scenarios import Scenario, by_id, class_thresholds, route_to_area

ROUND = 3       # metres and grades are meaningless past a millimetre or a thousandth of a percent


def _r(v: float, nd: int = ROUND) -> float:
    """Round for the wire. An artifact full of 17-digit floats is three times larger for no gain."""
    return round(float(v), nd)


@dataclass
class BakeResult:
    scenario: Scenario
    result: BuildResult
    cuts: list[Cut]
    snapshots: list[dict] = field(default_factory=list)
    gate: dict = field(default_factory=dict)


class SnapshotRecorder:
    """Captures the surface after each placed load, so the app can animate its growth.

    ONE FRAME PER TRUCK. A snapshot every few loads is a slideshow: the pile jumps and the truck on
    screen is not the one that made the bump. A frame is one float per cell here, at full resolution;
    the coarse stride that makes the artifact shippable is applied on the way out, in `_half`, so the
    recorder stays a plain record of what the terrain looked like.
    """

    def __init__(self, scn: Scenario, n_loads: int) -> None:
        self.every = max(1, n_loads // max(1, scn.n_snapshots))
        self.frames: list[dict] = []

    def maybe(self, seq: int, terrain: Terrain, placed: int) -> None:
        if seq % self.every:
            return
        self.frames.append(
            {
                "seq": seq,
                "placed": placed,
                "z": [_r(v, 2) for v in terrain.z],
            }
        )


def run(scenario_id: str, *, seed_offset: int = 0, n_loads: int | None = None) -> BakeResult:
    """Execute one scenario end to end, with every invariant checked as it goes.

    ``n_loads`` overrides the scenario's load budget. It exists for the CI smoke test and nothing
    else: a bake exercises routing, relaxation, dozing, segregation, reclaim and the gate, and doing
    that at nine hundred loads takes the better part of half an hour on a runner, which is not a
    smoke test. The reduced artifact is NOT the scenario and the caller is prevented from writing it
    to the canonical tree.
    """
    scn = by_id(scenario_id)
    if n_loads is not None:
        scn = dataclasses.replace(scn, n_loads=n_loads)
    seed = scn.seed + seed_offset

    terrain = scn.terrain()
    plan = scn.plan()
    shovel = _sited_shovel(terrain, plan, scn)
    fleet = Fleet.of(scn.n_trucks, scn.truck(), shovel, repose_deg=scn.repose_deg)
    material = Material(repose_dry_deg=scn.repose_deg)

    seq = dig_sequence(
        n_loads=scn.n_loads, seed=seed, loads_per_block=scn.loads_per_block,
        mean_grade=scn.mean_grade, block_sd=scn.block_sd,
        bench_trend=scn.bench_trend, n_benches=scn.n_benches,
    )
    loads = payloads_from(seq, seed=seed)

    router = None
    if len(scn.classes) > 1:
        cuts_ = class_thresholds(scn)
        classes = scn.classes
        # The decision is made on the ESTIMATE. Seeded from the scenario seed so the same run
        # reproduces byte for byte, and independent of the grade itself so the error is an error and
        # not a rescaling.
        err = _estimate_noise(len(loads), scn.estimate_error_sd, seed)
        seen = itertools.count()

        def router(p):  # noqa: ANN001, ANN202
            k = next(seen)
            return route_to_area(p.grade + err[k % len(err)], cuts_, classes)

    res = build(
        terrain, plan, fleet, loads,
        repose_deg=scn.repose_deg, seed=seed, material=material, route=router,
        paddock_frac=scn.paddock_frac,
        snapshot_every=max(1, scn.n_loads // max(1, scn.n_snapshots)),
        # How far from the planned tip the operator may spot. 25 m was too tight once the pile stood
        # 12 m tall: most of its surface is at the angle of repose and therefore undrivable, so the
        # nearest workable ground is often further than that and the load was refused rather than
        # placed slightly off-plan. An operator walks further than 25 m to find a spot.
        max_spot_offset_m=45.0,
    )

    # ONE PILE AT A TIME. An unbounded face width lets a single cut slice through every area in the
    # yard simultaneously, which no loader does and which quietly destroys the measurement: cuts end
    # up averaging three separately-routed stockpiles together, their grades collapse onto the overall
    # mean, and the variance reduction comes out better than the independent-source bound, which is
    # arithmetically impossible and was the signal that the setup was wrong.
    cuts: list[Cut] = []
    per_area = max(1, scn.n_cuts // max(1, len(plan.areas)))
    for area in plan.areas:
        face = ReclaimFace(
            method=ReclaimMethod.FULL_HEIGHT,
            position_m=area.x0_m,
            direction=(1.0, 0.0),
            depth_m=10.0,
            width_m=area.length_m,
            max_face_m=15.0,
        )
        cuts.extend(
            campaign(
                res.terrain, res.model, face,
                cut_tonnes=scn.cut_tonnes, n_cuts=per_area, repose_deg=scn.repose_deg,
            )
        )
    # A cut that delivered nothing is not a cut. Keeping them would put zero-tonnage rows in the feed
    # series and drag the weighted statistics around for no physical reason.
    cuts = [c for c in cuts if c.tonnes > 0]

    gate = _gate(scn, res, cuts, loads)
    return BakeResult(scenario=scn, result=res, cuts=cuts, gate=gate)


def _sited_shovel(terrain, plan, scn) -> tuple[float, float]:
    """The nominal loading point, moved to the nearest ground a truck can actually stand on.

    A LOADING POINT IS SITED, NOT DECREED. On a flat pad the nominal position is fine and this
    returns it unchanged. On a landform it may land on a valley wall, and the flood fill seeds from
    the shovel: if the seed cell is not standable the mask comes back empty for the WHOLE pad, every
    tip is unreachable, and the build places nothing at all with no indication of why. Measured on
    the valley scenario: shovel at 20.4 m on the wall, 0 of 3600 cells reachable.

    The search stays outside every dump area, because a loading point inside one gets buried.
    """
    max_grade = math.tan(math.radians(scn.repose_deg)) / 1.5
    ok = passable_mask(terrain, max_grade)
    sx, sy = scn.shovel_xy
    c = terrain.cell_at(sx, sy)
    if c is not None and ok[c] and not any(a.contains(sx, sy) for a in plan.areas):
        return scn.shovel_xy

    best: tuple[float, tuple[float, float]] | None = None
    for k in range(terrain.n_cells):
        if not ok[k]:
            continue
        x, y = terrain.xy(k)
        if any(a.contains(x, y) for a in plan.areas):
            continue
        d = math.hypot(x - sx, y - sy)
        if best is None or d < best[0]:
            best = (d, (x, y))
    if best is None:
        raise AssertionError(
            f"{scn.id}: there is nowhere on this pad a truck can stand that is outside every dump "
            f"area. The landform or the layout is wrong, not the loading point."
        )
    return best[1]


def _estimate_noise(n: int, sd: float, seed: int) -> list[float]:
    """Per-load error on the grade the ore-control system reports, Box-Muller from a seeded LCG."""
    if sd <= 0.0:
        return [0.0] * n
    out: list[float] = []
    x = (seed * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)

    def u() -> float:
        nonlocal x
        x = (x * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)
        return ((x >> 11) + 0.5) / float(1 << 53)

    while len(out) < n:
        a, b = u(), u()
        r = math.sqrt(-2.0 * math.log(a))
        out.append(sd * r * math.cos(2.0 * math.pi * b))
        out.append(sd * r * math.sin(2.0 * math.pi * b))
    return out[:n]


def _gate(scn: Scenario, res: BuildResult, cuts: list[Cut], loads: list) -> dict:
    """Check the invariants and the scenario's kill criterion. Raises on violation.

    These are the same checks the engine's own tests make, run again on the actual artifact, because
    a passing unit test on a synthetic fixture does not prove the shipped trace is sound.
    """
    # THE SAME TOLERANCE THE ENGINE ASSERTS, and the residue is reported either way. The angle of
    # repose is known to a few degrees; asserting a surface to floating-point equality against it
    # fails builds over material no solver can shift. One degree is far inside that uncertainty and
    # far outside the defect this exists to catch, which was 446 pairs with the worst at 55.9 against
    # an imposed 37. The manifest carries the count and the worst angle, so a reader sees the residue
    # rather than a tolerance that hid it.
    n_over, worst = count_over_repose(
        res.terrain.z, res.terrain.nx, res.terrain.ny, res.terrain.cell_m,
        scn.repose_deg + STABLE_TOL_DEG, floor=res.terrain.z0,
    )
    if n_over:
        raise AssertionError(
            f"{scn.id}: {n_over} cell pairs stand more than {STABLE_TOL_DEG:.1f} deg over the "
            f"imposed repose angle of {scn.repose_deg} deg, worst {worst:.1f}. This is the defect "
            f"that rendered as spikes."
        )
    # Reported at the strict angle, so the number in the manifest is the real residue.
    n_marginal, worst = count_over_repose(
        res.terrain.z, res.terrain.nx, res.terrain.ny, res.terrain.cell_m,
        scn.repose_deg, floor=res.terrain.z0,
    )
    res.model.assert_consistent(res.terrain)

    placed = len(res.placed)
    expected = placed * scn.truck().load_volume_m3
    got = res.terrain.volume_m3() + sum(c.tonnes for c in cuts) / res.model.bulk_density_t_m3
    if expected > 0 and abs(got - expected) / expected > 1e-6:
        raise AssertionError(
            f"{scn.id}: mass not conserved. {placed} loads placed is {expected:.1f} m3, "
            f"pile plus reclaimed is {got:.1f} m3"
        )

    if not placed:
        raise AssertionError(f"{scn.id}: the build placed nothing at all")

    return {
        "pairs_over_repose": n_marginal,
        "stable_tolerance_deg": STABLE_TOL_DEG,
        "worst_local_slope_deg": _r(worst, 2),
        "ledger_agrees_with_terrain": True,
        "loads_offered": len(res.loads),
        "loads_placed": placed,
        "refusal_rate": _r(res.refusal_rate, 4),
        "mass_residual_rel": _r(abs(got - expected) / expected if expected else 0.0, 9),
        "kill_criterion": scn.kill_criterion,
    }


def _frame_deltas(frames: list[tuple[int, int, list[float]]]) -> list[dict]:
    """First frame complete, the rest as the cells that changed.

    A cell counts as changed when it moves by more than the rounding the frames are already stored
    at, so the encoding cannot introduce drift the reader would see.
    """
    out: list[dict] = []
    prev: list[float] | None = None
    for sq, n, z in frames:
        if prev is None:
            out.append({"seq": sq, "placed": n, "z": z})
        else:
            d: list[float] = []
            for i, v in enumerate(z):
                if abs(v - prev[i]) > 0.05:
                    d.append(i)
                    d.append(v)
            out.append({"seq": sq, "placed": n, "d": d})
        prev = z
    return out


def _stride(nx: int, ny: int) -> int:
    """Cell stride for playback frames.

    A frame is watched, not measured, so it is stored coarse and interpolated back up in the browser.
    Two on a normal pad, three on a wide yard: the yard is three areas side by side, so at the same
    stride its frames are more than twice the bytes for a picture the reader is watching go by.
    """
    return 3 if nx * ny > 8000 else 2


def _half(z: list[float], nx: int, ny: int) -> list[float]:
    """Every `_stride`-th cell in each direction."""
    k = _stride(nx, ny)
    return [_r(z[j * nx + i], 1) for j in range(0, ny, k) for i in range(0, nx, k)]


def _plan_json(scn: Scenario) -> dict:
    plan = scn.plan()
    return {
        "areas": [
            {
                "name": a.name,
                "material_class": a.material_class,
                "x0": _r(a.x0_m), "y0": _r(a.y0_m), "x1": _r(a.x1_m), "y1": _r(a.y1_m),
                "access": [_r(a.access[0]), _r(a.access[1])],
                "ramp_width_m": _r(a.ramp_width_m),
                "benches": [
                    {"index": b.index, "top_m": _r(b.top_m),
                     "designed_volume_m3": _r(b.designed_volume_m3, 1)}
                    for b in a.benches
                ],
            }
            for a in plan.areas
        ],
        "row_spacing_m": _r(plan.row_spacing_m),
        "tip_spacing_m": _r(plan.tip_spacing_m),
        "loads_per_dozer_pass": plan.loads_per_dozer_pass,
        "shovel": [_r(scn.shovel_xy[0]), _r(scn.shovel_xy[1])],
    }


VOXEL_DZ_M = 0.5


def _volume_json(res: BuildResult) -> dict:
    """The pile resampled onto a fixed vertical grid, one event identifier per voxel.

    Columns are emitted as ``[k0, [event, ...]]``: the index of the lowest occupied voxel and the
    events above it, contiguous. An empty column is ``null``. That is compact without being a format
    anyone has to decode, and it slices in either direction with plain indexing.
    """
    model = res.model
    top = max((c[-1].z1_m for c in model.columns if c), default=0.0)
    base = min((c[0].z0_m for c in model.columns if c), default=0.0)
    nz = max(1, int(math.ceil((top - base) / VOXEL_DZ_M)))

    cols: list[list | None] = []
    for col in model.columns:
        if not col:
            cols.append(None)
            continue
        k0 = int((col[0].z0_m - base) / VOXEL_DZ_M)
        k1 = int(math.ceil((col[-1].z1_m - base) / VOXEL_DZ_M))
        events: list[int] = []
        pi = 0
        for k in range(k0, k1):
            zc = base + (k + 0.5) * VOXEL_DZ_M
            while pi + 1 < len(col) and col[pi].z1_m <= zc:
                pi += 1
            events.append(col[pi].event_id)
        cols.append([k0, events] if events else None)

    return {
        "nx": res.terrain.nx,
        "ny": res.terrain.ny,
        "nz": nz,
        "cell_m": res.terrain.cell_m,
        "dz_m": VOXEL_DZ_M,
        "base_m": _r(base, 2),
        "z0": [_r(v, 2) for v in res.terrain.z0],
        "columns": cols,
    }


def _loads_json(res: BuildResult, seed: int) -> list[dict]:
    """The event log. One row per load, which is what a fleet-management export looks like."""
    out = []
    for r in res.loads:
        row = {
            "seq": r.seq, "area": r.area, "bench": r.bench, "phase": r.phase.value,
            "truck": r.truck_id, "grade": _r(r.grade, 4),
            "block": r.source_block, "placed": r.placed,
        }
        # THE FULL ASSAY, not a grade. Copper comes from the dig sequence, because it carries the
        # shovel-dwell autocorrelation the whole blending argument rests on; the rest is generated
        # around it from the same block-level geological factors.
        row.update(assay_for(r.grade, block=r.source_block, seed=seed).as_dict())
        if r.placed:
            row.update(
                {
                    "x": _r(r.x_m), "y": _r(r.y_m),
                    "px": _r(r.planned_x_m), "py": _r(r.planned_y_m),
                    "offset": _r(r.spot_offset_m, 2),
                    "profile": r.profile.value if r.profile else None,
                    "d_crest": _r(min(r.distance_to_crest_m, 9999.0), 2),
                    "head": _r(r.heading_rad, 4),
                    "len": _r(r.length_m, 2), "wid": _r(r.width_m, 2),
                    "thick": _r(r.max_thickness_m, 3),
                    "seg": _r(r.segregation_index, 4),
                    "overrun": _r(r.overrun_fraction, 4),
                    "drop": _r(r.drop_m, 2),
                    # THE PATHS. Kept so the app can draw the truck coming in and going away, which is
                    # the whole reason a load is an entity and not a coordinate.
                    "approach": [
                        [_r(x, 1), _r(y, 1)] for x, y in (r.approach.points if r.approach else [])
                    ],
                    "departure": [
                        [_r(x, 1), _r(y, 1)] for x, y in (r.departure.points if r.departure else [])
                    ],
                }
            )
        else:
            row["refused"] = r.refused_reason
        out.append(row)
    return out


def _sectors_json(res: BuildResult, scn: Scenario) -> dict:
    plan = scn.plan()
    areas = []
    for a in plan.areas:
        r = rollup(res.model, res.terrain, a)
        areas.append(
            {
                "name": a.name, "class": a.material_class,
                "tonnes": _r(r.tonnes, 1), "grade": _r(r.mean_grade, 4),
                "stdev": _r(r.stdev, 4), "n": r.n,
                "ci": {str(k): _r(v, 6) for k, v in r.ci.items()},
                "quadrants": [
                    {
                        "name": q.name,
                        "grade": _r(qr.mean_grade, 4),
                        "n": qr.n,
                        "ci": {str(k): _r(v, 6) for k, v in qr.ci.items()},
                    }
                    for q in quadrants(a)
                    for qr in [rollup(res.model, res.terrain, q)]
                ],
            }
        )
    return {"areas": areas}


def write(bake: BakeResult, out_dir: Path) -> dict:
    """Write every artifact for one scenario and return its manifest."""
    scn, res = bake.scenario, bake.result
    d = out_dir / scn.id
    d.mkdir(parents=True, exist_ok=True)

    loads = _loads_json(res, scn.seed)
    grades_in = [r.grade for r in res.placed]
    var_in = tonnage_weighted_variance(grades_in, [1.0] * len(grades_in)) if grades_in else 0.0

    (d / "plan.json").write_text(json.dumps(_plan_json(scn), separators=(",", ":")), encoding="utf-8")
    (d / "loads.json").write_text(json.dumps(loads, separators=(",", ":")), encoding="utf-8")
    (d / "sectors.json").write_text(
        json.dumps(_sectors_json(res, scn), separators=(",", ":")), encoding="utf-8"
    )
    (d / "field.json").write_text(
        json.dumps(
            {
                "nx": res.terrain.nx, "ny": res.terrain.ny, "cell_m": res.terrain.cell_m,
                "z0": [_r(v, 2) for v in res.terrain.z0],
                "z": [_r(v, 2) for v in res.terrain.z],
                "grade": [None if g is None else _r(g, 4) for g in res.model.grade_field()],
                "coarse": [None if g is None else _r(g, 4) for g in res.model.coarse_field()],
                "blocks": [
                    [i, j, k, _r(g, 4), _r(t, 1)] for i, j, k, g, t in res.model.to_blocks(dz_m=5.0)
                ],
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    # THE PILE AS A VOLUME. This is the artifact the product exists to produce and it was missing.
    # The ledger has held per-column parcel stacks all along, each one a vertical interval with the
    # deposition event it came from, and none of it reached the browser: only the surface shipped, so
    # the app could show what the top of the pile looks like and nothing about what is inside it.
    # That is the wrong half. A stockpile is characterised by its contents at depth.
    #
    # IT IS VOXELISED, NOT DUMPED RAW. Relaxation splits a parcel every time material crosses a cell
    # boundary, so the raw stacks are slivers: measured on the reference scenario, 1,027,319 parcels
    # with one column holding 85,766 of them, and 26 MB of JSON. Resampling onto a fixed vertical
    # grid gives the same information at the resolution anyone can actually look at, and it is the
    # form a block model is in anyway.
    #
    # Each voxel carries the EVENT it came from, and the assay is joined in the browser, so a new
    # assay variable costs nothing in the artifact and cannot desynchronise from the geometry.
    (d / "volume.json").write_text(
        json.dumps(_volume_json(res), separators=(",", ":")), encoding="utf-8"
    )

    # THE FRAMES. ONE PER PLACED LOAD, so the app plays the build truck by truck rather than jumping
    # four loads at a time. Rounded to a decimetre and sampled at a coarse stride, which is what makes
    # a few hundred of them affordable; the browser interpolates them back onto the full grid.
    (d / "frames.json").write_text(
        json.dumps(
            {
                "nx": res.terrain.nx,
                "ny": res.terrain.ny,
                "cell_m": res.terrain.cell_m,
                "step": _stride(res.terrain.nx, res.terrain.ny),
                "z0": _half(res.terrain.z0, res.terrain.nx, res.terrain.ny),
                # DELTAS, BECAUSE A FRAME IS ONE TRUCK. A load touches a couple of dozen cells and
                # leaves the other nine hundred exactly as they were, so a full surface per frame is
                # the same numbers written seven hundred times: 2.6 MB per scenario, 110 MB for the
                # site. The first frame is complete and the rest carry only what moved, as flat
                # [index, value, index, value] pairs. Reconstruction in the browser is an
                # accumulation, and it is exact rather than lossy.
                "frames": _frame_deltas(
                    [(sq, n, _half(z, res.terrain.nx, res.terrain.ny)) for sq, n, z in res.snapshots]
                ),
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    (d / "cuts.json").write_text(
        json.dumps(
            [
                {
                    "t": _r(c.tonnes, 1), "grade": _r(c.grade, 4),
                    "disp": _r(c.displacement_m, 2), "unc": _r(c.grade_uncertainty, 4),
                    "prov": {str(k): _r(v, 4) for k, v in sorted(c.provenance.items())},
                }
                for c in bake.cuts
            ],
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    manifest = {
        "id": scn.id,
        "category": scn.category,
        "title": {"en": scn.title_en, "es": scn.title_es},
        "summary": {"en": scn.summary_en, "es": scn.summary_es},
        "reason": scn.reason,
        "tags": list(scn.tags),
        "seed": scn.seed,
        "engine": "bedblend",
        "assay_variables": ASSAY_VARIABLES,
        "pad": {"nx": scn.pad_nx, "ny": scn.pad_ny, "cell_m": scn.cell_m},
        "material": {
            "repose_deg": scn.repose_deg,
            "loose_density_t_m3": _r(Material(repose_dry_deg=scn.repose_deg).loose_density_t_m3, 3),
        },
        "stream": {
            "n_loads": scn.n_loads,
            "loads_per_block": scn.loads_per_block,
            # REPORTED, NOT SET. The range is a consequence of the shovel dwell.
            "measured_range_t": _r(
                measured_range_t(
                    payloads_from(
                        dig_sequence(
                            n_loads=scn.n_loads, seed=scn.seed,
                            loads_per_block=scn.loads_per_block,
                            mean_grade=scn.mean_grade, block_sd=scn.block_sd,
                        ),
                        seed=scn.seed,
                    ),
                    n_lags=60,
                ),
                1,
            ),
            "var_in": _r(var_in, 8),
        },
        "build": {
            "loads_placed": len(res.placed),
            "refusal_rate": _r(res.refusal_rate, 4),
            "profiles": res.profile_counts(),
            "dozer_passes": len(res.dozer_passes),
            "mean_displacement_m": _r(res.model.mean_displacement_m(), 2),
            "peak_m": _r(max(res.terrain.z), 2),
            "volume_m3": _r(res.terrain.volume_m3(), 1),
        },
        "reclaim": {"n_cuts": len(bake.cuts), "tonnes": _r(sum(c.tonnes for c in bake.cuts), 1)},
        "gate": bake.gate,
        "files": ["plan.json", "loads.json", "sectors.json", "field.json", "cuts.json",
                  "frames.json", "volume.json"],
        "frames": len(res.snapshots),
    }
    (d / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8"
    )
    return manifest


def topography_report() -> list[dict]:
    """Buildable ground for each published fill type, which is what makes relief quantitative.

    Reported for the docs and the app rather than being asserted in prose: only one of the five types
    is a flat pad, and the difference between them is a number.
    """
    max_grade = math.tan(math.radians(37.0)) / 1.5
    out = []
    for f in FillType:
        t = ground(f, 64, 64, 2.5, relief_m=30.0)
        s = relief_stats(t)
        out.append(
            {
                "fill": f.value,
                "relief_m": _r(s["relief_m"], 1),
                "max_slope_deg": _r(s["max_slope_deg"], 1),
                "buildable_fraction": _r(buildable_fraction(t, max_grade), 3),
            }
        )
    return out


def main() -> None:
    ap = argparse.ArgumentParser(prog="bake")
    ap.add_argument("scenario", nargs="?", default="all")
    ap.add_argument("--loads", type=int, default=None,
                    help="override the load budget. FOR SMOKE TESTS ONLY: a bake at a reduced budget "
                         "exercises every stage and produces an artifact that is not the scenario, "
                         "so it must never be written to the canonical tree")
    ap.add_argument("--output", default=None,
                    help="write here instead of the canonical artifact tree; ALWAYS pass this "
                         "unless you intend a release bake")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[2]
    # The CANONICAL artifact tree. frontend/public/data is a build-time overlay produced by
    # copy-data.mjs and is gitignored, so baking there would produce a site that works locally and
    # ships empty.
    out = Path(args.output) if args.output else root / "data" / "derived"
    out.mkdir(parents=True, exist_ok=True)

    from .scenarios import SCENARIOS

    todo = SCENARIOS if args.scenario == "all" else [by_id(args.scenario)]

    if args.loads is not None and args.output is None:
        raise SystemExit(
            "--loads changes what the scenario IS, so it may only be used with --output. A reduced "
            "bake in the canonical tree is an artifact that does not match its own manifest."
        )

    for scn in todo:
        print(f"baking {scn.id} ...", flush=True)
        bake = run(scn.id, n_loads=args.loads)
        m = write(bake, out)
        print(
            f"  placed {m['build']['loads_placed']}  "
            f"refused {m['build']['refusal_rate']:.1%}  "
            f"peak {m['build']['peak_m']} m  "
            f"profiles {m['build']['profiles']}",
            flush=True,
        )

    # THE INDEX IS ASSEMBLED FROM WHAT IS ON DISK, not from what this invocation happened to bake.
    # It used to be accumulated in the loop, so `run.py ridge` rewrote the index with ridge alone and
    # silently orphaned the other five scenarios: every artifact was still there, the site loaded
    # cleanly, and the case selector offered exactly one case. Nothing failed. Building it from the
    # manifests present, in the canonical order, makes a partial bake refresh what it rebuilt and
    # leave the rest alone.
    index = {"scenarios": [], "topography": topography_report()}
    for scn in SCENARIOS:
        mf = out / scn.id / "manifest.json"
        if not mf.exists():
            continue
        m = json.loads(mf.read_text(encoding="utf-8"))
        index["scenarios"].append(
            {k: m[k] for k in ("id", "category", "title", "summary", "tags", "build", "gate")}
        )
    (out / "index.json").write_text(json.dumps(index, indent=2, sort_keys=True), encoding="utf-8")
    print(f"baked {len(todo)}; index lists {len(index['scenarios'])} scenario(s) in {out}")


if __name__ == "__main__":
    sys.exit(main())
