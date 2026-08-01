"""Standard-format readers and writers. No bespoke ad-hoc formats.

CSV in for the truck dump log, because that is what a fleet-management or grade-control export
produces and what a reader will actually have. Compact JSON out for the committed replay artifact,
because it is what the browser fetches and because a diffable text artifact keeps the git history of
the scientific evidence readable.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


def read_csv_rows(path: str | Path) -> list[dict[str, str]]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def write_csv_rows(path: str | Path, rows: list[dict[str, Any]], columns: list[str]) -> int:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=columns)
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in columns})
    return p.stat().st_size


def write_json(path: str | Path, obj: Any) -> int:
    """Write compact JSON and return the byte size, which the gate and the manifest both need."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(obj, separators=(",", ":"), ensure_ascii=False)
    encoded = data.encode("utf-8")
    p.write_bytes(encoded)
    return len(encoded)


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))
