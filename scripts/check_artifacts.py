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
