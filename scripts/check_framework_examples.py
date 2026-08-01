#!/usr/bin/env python3
"""Execute the runnable examples in the framework cards, so a card cannot rot.

A framework card whose example no longer runs is worse than no card: it reads as verified and it is
not. `docs/guides/00_instantiate.md` step 6 asks each engine card for a runnable example, and this is
what makes the word "runnable" mean something.

Every Python example under `docs/frameworks/<NN>_<tool>/04_example.md` is extracted and executed in a
subprocess. Cards whose example is TypeScript, or which document a tier that is deliberately not
installed (the DEM calibration lives in its own conda environment and must never be a CI dependency),
are skipped by name and the skip is reported rather than hidden.

    python scripts/check_framework_examples.py
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FW = ROOT / "docs" / "frameworks"

#: cards whose example is not executable here, with the reason. Reported, never silently passed.
SKIP = {
    "03_pychrono": "the DEM tier lives in its own conda environment and is never a CI dependency",
    "04_three": "browser-side TypeScript, exercised by the frontend build and the visual gate",
    "05_uplot": "browser-side TypeScript, exercised by the frontend build and the visual gate",
}

BLOCK = re.compile(r"```(?P<lang>python|ts)\n(?P<code>.*?)```", re.S)


def main() -> int:
    cards = sorted(p for p in FW.iterdir() if p.is_dir())
    if not cards:
        print("no framework cards found", file=sys.stderr)
        return 1

    ran = skipped = 0
    failed: list[str] = []
    for card in cards:
        ex = card / "04_example.md"
        if not ex.exists():
            failed.append(f"{card.name}: no 04_example.md")
            continue
        if card.name in SKIP:
            print(f"  SKIP {card.name}: {SKIP[card.name]}")
            skipped += 1
            continue
        m = BLOCK.search(ex.read_text(encoding="utf-8"))
        if not m:
            failed.append(f"{card.name}: 04_example.md has no fenced code block")
            continue
        if m.group("lang") != "python":
            print(f"  SKIP {card.name}: example is {m.group('lang')}")
            skipped += 1
            continue
        proc = subprocess.run([sys.executable, "-c", m.group("code")],
                              capture_output=True, text=True, cwd=ROOT, timeout=300)
        if proc.returncode != 0:
            failed.append(f"{card.name}: example exited {proc.returncode}\n"
                          f"      {proc.stderr.strip().splitlines()[-1] if proc.stderr.strip() else ''}")
            continue
        first = (proc.stdout.strip().splitlines() or [""])[0]
        print(f"  OK   {card.name}: {first}")
        ran += 1

    if failed:
        print(f"\ncheck_framework_examples: {len(failed)} FAILED", file=sys.stderr)
        for f in failed:
            print(f"  {f}", file=sys.stderr)
        return 1
    print(f"check_framework_examples: OK, {ran} example(s) ran, {skipped} skipped with a reason.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
