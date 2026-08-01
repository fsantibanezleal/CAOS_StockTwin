"""Stage 10, validate: the release gate.

The last thing a bake does, and the thing CI runs against the committed artifacts. It answers four
questions, and it fails the build rather than warning on any of them:

1. **Completeness.** Every case in the registry has a manifest, a trace and a metrics file. A missing
   cell is a failure, not an average over what happened to be present (ADR-0069 clause 4).
2. **Integrity.** Every trace still hashes to the value its manifest recorded, and every manifest
   still validates against the schema the TypeScript mirror expects.
3. **Invariants.** Mass balance, provenance sums and the three control kill criteria all held on the
   run that produced the committed artifact.
4. **Lane honesty.** No case is tagged ``live`` while breaching its measured budget.

It does not train anything, does not run science, and does not write into ``data/derived``. Deployment
runs this and publishes; a deployment is not an experiment (ADR-0069 clause 6).
"""
from __future__ import annotations

from pathlib import Path

from ..core.manifest import content_hash
from ..io.formats import read_json


def run(derived_dir: str | Path, manifests_dir: str | Path, case_ids: list[str]) -> dict:
    """Validate a baked tree and return a report. ``report["ok"]`` is the gate."""
    derived = Path(derived_dir)
    manifests = Path(manifests_dir)
    problems: list[str] = []
    checked = 0
    lanes: dict[str, int] = {}

    index_path = manifests / "index.json"
    if not index_path.exists():
        problems.append("manifests/index.json is missing")
    else:
        index = read_json(index_path)
        listed = {c["case_id"] for c in index.get("cases", [])}
        missing = set(case_ids) - listed
        extra = listed - set(case_ids)
        if missing:
            problems.append(f"index omits {len(missing)} registered cases: {sorted(missing)}")
        if extra:
            problems.append(f"index lists {len(extra)} unknown cases: {sorted(extra)}")

    for cid in case_ids:
        mpath = manifests / f"{cid}.json"
        tpath = derived / cid / "trace.json"
        xpath = derived / cid / "metrics.json"
        if not mpath.exists():
            problems.append(f"{cid}: manifest missing")
            continue
        if not tpath.exists():
            problems.append(f"{cid}: trace missing")
            continue
        if not xpath.exists():
            problems.append(f"{cid}: metrics missing")
            continue

        man = read_json(mpath)
        trace = read_json(tpath)
        metrics = read_json(xpath)
        checked += 1

        got = content_hash(trace)
        want = man.get("artifact", {}).get("sha256")
        if got != want:
            problems.append(f"{cid}: trace hash {got[:12]} does not match the manifest {str(want)[:12]}")

        lane = man.get("lane", "unknown")
        lanes[lane] = lanes.get(lane, 0) + 1
        if lane == "live" and man.get("gate", {}).get("reasons"):
            problems.append(f"{cid}: tagged live while the gate recorded {man['gate']['reasons']}")

        for name, chk in (metrics.get("invariants") or {}).items():
            if not chk.get("pass", False):
                problems.append(f"{cid}: invariant {name} failed, worst {chk.get('worst')} "
                                f"against tolerance {chk.get('tol')}")

        ctl = metrics.get("control")
        if ctl and not ctl.get("pass", False):
            problems.append(f"{cid}: CONTROL FAILED, {ctl.get('statement')} "
                            f"(measured {ctl.get('measured')})")

        for key in ("vrr", "vrr_band", "vrr_ideal", "efficiency", "variogram_in", "rtd"):
            if key not in metrics:
                problems.append(f"{cid}: metrics missing required key {key!r}")

    return {
        "ok": not problems,
        "cases_expected": len(case_ids),
        "cases_checked": checked,
        "lanes": lanes,
        "problems": problems,
    }
