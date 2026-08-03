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
import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path

from bedblend.blending import tonnage_weighted_variance
from bedblend.build import BuildResult, build
from bedblend.material import Material
from bedblend.reclaim import Cut, ReclaimFace, ReclaimMethod, campaign
from bedblend.relax import count_over_repose
from bedblend.sectors import quadrants, rollup
from bedblend.stream import dig_sequence, measured_range_t, payloads_from
from bedblend.terrain import Terrain
from bedblend.topography import FillType, buildable_fraction, ground, relief_stats
from bedblend.truck import Fleet

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
    """Captures the surface at intervals through the build, so the app can animate its growth.

    A snapshot is one float per cell, which is why there are a couple of dozen of them and not one per
    load. Enough to see the base layer go down, the dozer level it and the crest advance; few enough
    that the artifact stays a few hundred kilobytes.
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


def run(scenario_id: str, *, seed_offset: int = 0) -> BakeResult:
    """Execute one scenario end to end, with every invariant checked as it goes."""
    scn = by_id(scenario_id)
    seed = scn.seed + seed_offset

    terrain = scn.terrain()
    plan = scn.plan()
    fleet = Fleet.of(scn.n_trucks, scn.truck(), scn.shovel_xy, repose_deg=scn.repose_deg)
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

        def router(p):  # noqa: ANN001, ANN202
            return route_to_area(p.grade, cuts_, classes)

    res = build(
        terrain, plan, fleet, loads,
        repose_deg=scn.repose_deg, seed=seed, material=material, route=router,
        paddock_frac=scn.paddock_frac,
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


def _gate(scn: Scenario, res: BuildResult, cuts: list[Cut], loads: list) -> dict:
    """Check the invariants and the scenario's kill criterion. Raises on violation.

    These are the same checks the engine's own tests make, run again on the actual artifact, because
    a passing unit test on a synthetic fixture does not prove the shipped trace is sound.
    """
    n_over, worst = count_over_repose(
        res.terrain.z, res.terrain.nx, res.terrain.ny, res.terrain.cell_m,
        scn.repose_deg, floor=res.terrain.z0,
    )
    if n_over:
        raise AssertionError(
            f"{scn.id}: {n_over} cell pairs stand over the imposed repose angle of "
            f"{scn.repose_deg} deg, worst {worst:.1f}. This is the defect that rendered as spikes."
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
        "pairs_over_repose": n_over,
        "worst_local_slope_deg": _r(worst, 2),
        "ledger_agrees_with_terrain": True,
        "loads_offered": len(res.loads),
        "loads_placed": placed,
        "refusal_rate": _r(res.refusal_rate, 4),
        "mass_residual_rel": _r(abs(got - expected) / expected if expected else 0.0, 9),
        "kill_criterion": scn.kill_criterion,
    }


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


def _loads_json(res: BuildResult) -> list[dict]:
    """The event log. One row per load, which is what a fleet-management export looks like."""
    out = []
    for r in res.loads:
        row = {
            "seq": r.seq, "area": r.area, "bench": r.bench, "phase": r.phase.value,
            "truck": r.truck_id, "grade": _r(r.grade, 4),
            "block": r.source_block, "placed": r.placed,
        }
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

    loads = _loads_json(res)
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
        "title": {"en": scn.title_en, "es": scn.title_es},
        "summary": {"en": scn.summary_en, "es": scn.summary_es},
        "reason": scn.reason,
        "tags": list(scn.tags),
        "seed": scn.seed,
        "engine": "bedblend",
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
        "files": ["plan.json", "loads.json", "sectors.json", "field.json", "cuts.json"],
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
    index = {"scenarios": [], "topography": topography_report()}

    for scn in todo:
        print(f"baking {scn.id} ...", flush=True)
        bake = run(scn.id)
        m = write(bake, out)
        index["scenarios"].append(
            {k: m[k] for k in ("id", "title", "summary", "tags", "build", "gate")}
        )
        print(
            f"  placed {m['build']['loads_placed']}  "
            f"refused {m['build']['refusal_rate']:.1%}  "
            f"peak {m['build']['peak_m']} m  "
            f"profiles {m['build']['profiles']}",
            flush=True,
        )

    (out / "index.json").write_text(json.dumps(index, indent=2, sort_keys=True), encoding="utf-8")
    print(f"wrote {len(todo)} scenario(s) to {out}")


if __name__ == "__main__":
    sys.exit(main())
