#!/usr/bin/env python3
"""CONTRACT 2 gate: the committed artifacts must be complete, well formed and internally consistent.

WHY THIS EXISTS SEPARATELY FROM THE TESTS. The test suite bakes into a sandbox and checks what it
produced. This checks what is actually COMMITTED, which is what the deployed site will serve. Those
are the same thing only if nobody has hand-edited a file, re-baked half the tree, or committed a
partial run, and all three have happened to this product line before.

It also enforces the split that makes the numbers falsifiable: the trace carries events and geometry,
and it must NOT carry the verdicts. A baked variance-reduction ratio would be unfalsifiable, because a
reader could not tell a real result from a typo.

    python scripts/check_artifacts.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DERIVED = ROOT / "data" / "derived"

REQUIRED_FILES = ("manifest.json", "plan.json", "loads.json", "field.json", "cuts.json", "sectors.json")

# Keys that must NEVER appear in an artifact. Each one is a verdict the browser is supposed to compute.
FORBIDDEN_KEYS = ("vrr", "variance_reduction", "efficiency", "ideal", "var_out")


def fail(msg: str) -> None:
    print(f"::error::{msg}")
    sys.exit(1)


def main() -> None:
    if not DERIVED.exists():
        fail(f"no artifact tree at {DERIVED.relative_to(ROOT)}; run python data-pipeline/run.py all")

    index_path = DERIVED / "index.json"
    if not index_path.exists():
        fail("data/derived/index.json is missing, so the app has nothing to enumerate")
    index = json.loads(index_path.read_text(encoding="utf-8"))

    ids = [s["id"] for s in index.get("scenarios", [])]
    if not ids:
        fail("the index lists no scenarios")

    on_disk = sorted(p.name for p in DERIVED.iterdir() if p.is_dir())
    if sorted(ids) != on_disk:
        fail(f"the index lists {sorted(ids)} but the tree holds {on_disk}")

    # WHAT THE REGISTRY DECLARES, AGAINST WHAT THE TREE SHIPS.
    #
    # Everything above this point compares the artifact with itself, and a check that iterates the
    # output can only ever confirm the output is well formed: it cannot know something is ABSENT.
    # That is not hypothetical. Twenty-two scenarios were declared, all twenty-two baked with exit
    # zero, and TWO were never assembled into the tree. The index is built from the manifests present
    # on disk, deliberately, so a partial bake refreshes what it rebuilt and leaves the rest alone,
    # which means two missing folders produce a perfectly valid smaller product. Every gate passed.
    # Every page said "twenty", because every page had been written from the same shipped artifact.
    # The two missing cases were the only ones modelling a pile fed and drawn at the same time, and
    # they were found by a reader asking whether the product covered that, not by any check here.
    sys.path.insert(0, str(ROOT / "data-pipeline"))
    try:
        from pipeline.scenarios import SCENARIOS  # noqa: PLC0415
    except ModuleNotFoundError as e:  # the engine is a separate published package
        fail(f"cannot read the scenario registry to compare against the artifacts: {e}")
    declared = sorted(s.id for s in SCENARIOS)
    if declared != sorted(ids):
        missing = sorted(set(declared) - set(ids))
        extra = sorted(set(ids) - set(declared))
        parts = []
        if missing:
            parts.append(f"DECLARED BUT NOT SHIPPED: {missing} (re-bake them, or remove them from "
                         f"the registry if they are withdrawn)")
        if extra:
            parts.append(f"SHIPPED BUT NOT DECLARED: {extra} (a stale folder from an earlier matrix)")
        fail("; ".join(parts))

    total = 0
    for sid in ids:
        d = DERIVED / sid
        for f in REQUIRED_FILES:
            p = d / f
            if not p.exists():
                fail(f"{sid} is missing {f}")
            try:
                json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError as e:
                fail(f"{sid}/{f} is not valid JSON: {e}")

        m = json.loads((d / "manifest.json").read_text(encoding="utf-8"))
        g = m["gate"]

        # The invariants, re-read from what was committed rather than trusted from the run that made it.
        if g["pairs_over_repose"] != 0:
            fail(
                f"{sid}: {g['pairs_over_repose']} cell pairs stand over the angle of repose, worst "
                f"{g['worst_local_slope_deg']} deg. This is the defect that rendered as spikes."
            )
        if not g["ledger_agrees_with_terrain"]:
            fail(f"{sid}: the block ledger does not agree with the terrain")
        if g["mass_residual_rel"] > 1e-6:
            fail(f"{sid}: mass residual {g['mass_residual_rel']:.3g} exceeds one part in a million")
        if g["loads_placed"] < 1:
            fail(f"{sid}: nothing was placed")

        loads = json.loads((d / "loads.json").read_text(encoding="utf-8"))
        placed = [x for x in loads if x["placed"]]
        if len(placed) != g["loads_placed"]:
            fail(f"{sid}: the manifest says {g['loads_placed']} placed, the log holds {len(placed)}")
        if not all("approach" in x and "departure" in x for x in placed):
            fail(f"{sid}: a placed load carries no truck path, so the site view cannot draw it")

        # THE PILE MUST BE WATCHABLE COMING DOWN, not only going up.
        #
        # Twenty of the twenty-two shipped artifacts carried NO reclaim frames and cuts with no
        # position at all: the app's whole reclaim half was dead on every sequential case, the orange
        # loader never drew, and nothing failed, because a cut with a tonnage and a grade is still a
        # valid cut and a frames file with no `reclaim` key is still valid JSON. They had been baked
        # before the pipeline learned to record any of it and were never re-baked. Absence again, and
        # again invisible to a check that only asks whether what is present is well formed.
        frames = json.loads((d / "frames.json").read_text(encoding="utf-8"))
        cuts = json.loads((d / "cuts.json").read_text(encoding="utf-8"))
        concurrent = m["reclaim"].get("mode") == "concurrent"
        if not frames.get("frames"):
            fail(f"{sid}: no build frames, so the pile cannot be watched going up")
        if concurrent:
            # The build chain already carries the bites, so the timeline is the build alone and a
            # separate reclaim chain would be a second, contradictory story.
            if not all("at" in c for c in cuts):
                fail(f"{sid}: a concurrent campaign has a cut with no `at`, so it cannot be placed "
                     f"on the build timeline")
        else:
            if not frames.get("reclaim"):
                fail(f"{sid}: no reclaim frames, so the pile is never seen coming down. Re-bake it: "
                     f"this artifact predates the reclaim recording.")
            if any("at" in c for c in cuts):
                fail(f"{sid}: a sequential campaign records `at` on a cut, which only means "
                     f"something while the pile is still being fed")
        for i, c in enumerate(cuts):
            missing = [k for k in ("x", "y", "cells") if k not in c]
            if missing:
                fail(f"{sid}: cut {i} is missing {missing}, so the app cannot draw the loader where "
                     f"it stood")

        # AND SOMETHING HAS TO COME FOR THE MATERIAL.
        #
        # A cut used to record a tonnage and a centroid and nothing else: the ore left the ledger and
        # no vehicle on site carried it away, so the pile lost volume with no machine in the picture.
        # Every cut now carries its haul cycle, an empty truck in and a loaded truck out over the
        # sited loading point. A cut with no `stand` is a real refusal, the campaign having cut
        # away its own access, and a whole scenario of them means the reclaim is unserved.
        served = [c for c in cuts if c.get("stand")]
        if not served:
            fail(f"{sid}: not one cut has a truck routed to it, so nothing carries the reclaimed "
                 f"material off site. Re-bake: this artifact predates the reclaim haulage.")
        if len(served) < 0.5 * len(cuts):
            fail(f"{sid}: only {len(served)} of {len(cuts)} cuts could be reached by a truck, so "
                 f"most of the reclaim has no way off site")
        for i, c in enumerate(served):
            for leg in ("in", "out"):
                if len(c.get(leg) or []) < 2:
                    fail(f"{sid}: cut {i} has no `{leg}` route, so the truck teleports")

        field = json.loads((d / "field.json").read_text(encoding="utf-8"))
        n = field["nx"] * field["ny"]
        for key in ("z", "z0", "grade", "coarse"):
            if len(field[key]) != n:
                fail(f"{sid}: field.{key} has {len(field[key])} values for a {n}-cell pad")
        if any(z - z0 < -1e-6 for z, z0 in zip(field["z"], field["z0"], strict=True)):
            fail(f"{sid}: a cell sits below its original ground, which is excavation nobody performed")

        blob = (d / "manifest.json").read_text(encoding="utf-8")
        for k in FORBIDDEN_KEYS:
            if f'"{k}"' in blob:
                fail(
                    f"{sid}: the manifest carries a baked verdict ({k!r}). Verdicts are recomputed in "
                    f"the browser from the events; a baked one is unfalsifiable."
                )

        total += len(placed)
        print(
            f"  OK {sid}: {len(placed)} loads placed, {g['refusal_rate']:.1%} refused, "
            f"0 pairs over repose, mass residual {g['mass_residual_rel']:.1g}"
        )

    if "topography" not in index:
        fail("the index carries no topography report")

    print(f"CONTRACT 2 OK: {len(ids)} scenarios, {total} placed loads, every gate green.")


if __name__ == "__main__":
    main()
