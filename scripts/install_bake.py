#!/usr/bin/env python3
"""Install a completed bake into the canonical artifact tree, or refuse to.

WHY THIS IS A SCRIPT AND NOT A COPY COMMAND. A bake is 22 independent processes writing 22 output
directories, and the ways it can be PARTIALLY finished all look like success from the outside:

  * a killed run's stragglers keep appending to the completion log, so a line count reaches 22 while
    only 15 distinct scenarios ever finished. That happened, and the only thing that caught it was a
    later step tripping over a missing file;
  * a scenario exits non-zero and its directory is left half written;
  * an earlier bake's output is still sitting in the destination for a scenario this one skipped, so
    the tree ends up mixing two engine versions with nothing to show for it.

The last one is the dangerous one, because the result passes every gate. Each artifact is internally
consistent; they are just not consistent with EACH OTHER, and no per-scenario check can see that.

So this refuses unless the bake is complete, every scenario exited zero, and every scenario in the
registry is present. It replaces the destination wholesale rather than merging into it.

    python scripts/install_bake.py E:/_Temp/rb13
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DERIVED = ROOT / "data" / "derived"


def fail(msg: str) -> None:
    print(f"::error::{msg}")
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: python scripts/install_bake.py <bake-output-dir>")
    src = Path(sys.argv[1])
    if not src.is_dir():
        fail(f"no bake at {src}")

    sys.path.insert(0, str(ROOT / "data-pipeline"))
    from pipeline.scenarios import SCENARIOS  # noqa: PLC0415

    want = [s.id for s in SCENARIOS]

    # THE COMPLETION LOG, read as a SET of scenarios rather than a count of lines. A count of lines is
    # what let a half-finished bake look complete.
    done_file = src / "DONE"
    if not done_file.exists():
        fail(f"{src} has no DONE log, so there is no evidence the bake finished")
    done: dict[str, set[str]] = {}
    for line in done_file.read_text(encoding="utf-8").split("\n"):
        parts = line.split()
        if len(parts) == 2:
            done.setdefault(parts[1], set()).add(parts[0])

    missing = [s for s in want if s not in done]
    if missing:
        fail(f"{len(missing)} scenario(s) never finished: {', '.join(missing)}")
    nonzero = sorted(s for s, codes in done.items() if codes != {"0"})
    if nonzero:
        fail(f"{len(nonzero)} scenario(s) exited non-zero: {', '.join(nonzero)}")
    extra = sorted(set(done) - set(want))
    if extra:
        fail(f"the bake carries {len(extra)} scenario(s) the registry does not declare: {extra}")

    # Every output present and parseable BEFORE anything is deleted, so a bad bake cannot leave the
    # canonical tree in a worse state than it found it.
    staged: list[tuple[str, Path, dict]] = []
    for sid in want:
        d = src / sid / sid
        if not d.is_dir():
            fail(f"{sid} reported success but wrote no output at {d}")
        idx_path = src / sid / "index.json"
        if not idx_path.exists():
            fail(f"{sid} wrote no index.json")
        try:
            idx = json.loads(idx_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            fail(f"{sid} index.json is not valid JSON: {exc}")
        rows = idx.get("scenarios") or []
        if len(rows) != 1 or rows[0].get("id") != sid:
            fail(f"{sid} index.json describes {[r.get('id') for r in rows]} instead of itself")
        for required in ("manifest.json", "plan.json", "loads.json", "field.json", "cuts.json"):
            if not (d / required).exists():
                fail(f"{sid} is missing {required}")
        staged.append((sid, d, idx))

    topo = next((i.get("topography") for _s, _d, i in staged if i.get("topography")), None)
    if not topo:
        fail("no bake carried a topography report")

    # WHOLESALE, not merged. A destination that keeps a scenario this bake did not write is a tree
    # mixing two engine versions, and that passes every gate there is.
    for sid in want:
        dst = DERIVED / sid
        if dst.is_dir():
            shutil.rmtree(dst)
    for stale in sorted(p for p in DERIVED.iterdir() if p.is_dir() and p.name not in want):
        print(f"  removing {stale.name}, which the registry no longer declares")
        shutil.rmtree(stale)

    for sid, d, _idx in staged:
        shutil.copytree(d, DERIVED / sid)

    with (DERIVED / "index.json").open("w", encoding="utf-8") as f:
        json.dump(
            {"scenarios": [i["scenarios"][0] for _s, _d, i in staged], "topography": topo},
            f, indent=1, sort_keys=True,
        )
        f.write("\n")

    print(f"installed {len(staged)} scenarios from {src} into {DERIVED.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
