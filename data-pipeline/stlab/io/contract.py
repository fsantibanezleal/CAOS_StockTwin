"""CONTRACT 1, ingestion: raw truck dump log to pipeline. The bring-your-own-data gate.

WHAT THIS IS FOR. A reader with a real dispatch export should be able to load it through the same
reader the product uses internally, and get a clear answer about what was accepted, what was thrown
out, and what was kept but is suspicious. Without that, a product only ever replays its own baked
cases and the "apply this to your data" claim is empty.

THE OUTLIER POLICY, STATED IN WORDS AND NOT ONLY IN CODE (ADR-0057 clause 3 requires this):

* A row failing a HARD range is REJECTED, with the reason recorded and counted. Nothing is silently
  coerced into range, because a coerced row looks like data and is not.
* A row failing a SOFT check is FLAGGED: accepted, counted, carried into the manifest, and rendered
  with a marker in the app so a reader can see it rather than discovering it in a residual.
* A row that lands outside the declared pad extent is REJECTED, because a dump with no cell to land in
  has no meaning in this model.
* Rows out of time order are REJECTED. A stockpile is a sequence; reordering it silently would change
  the answer and the reader would never know.

The columns and ranges are the shape a real grade-control or fleet-management export produces. Where
a column is optional the default is stated and the default is recorded in the report, so a run made
without moisture data is distinguishable from one where moisture was genuinely three percent.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any

from .schema import TruckDump

REQUIRED_COLUMNS: tuple[str, ...] = ("timestamp", "tonnes", "grade_cu_pct")

# name -> (min, max, unit). Outside the range is a REJECT.
RANGES: dict[str, tuple[float, float, str]] = {
    "tonnes": (1.0, 500.0, "t (one truck load; 500 t exceeds the largest haul truck in service)"),
    "grade_cu_pct": (0.0, 20.0, "percent Cu"),
    "grade_au_gpt": (0.0, 200.0, "g/t Au"),
    "coarse_frac": (0.0, 1.0, "volume fraction in the coarse size class"),
    "moisture_pct": (0.0, 30.0, "percent by mass"),
    "size_p80_mm": (1.0, 2000.0, "mm, 80 percent passing size"),
}

# soft checks: accepted, but flagged and shown
GRADE_SOFT_SIGMA = 4.0     # more than this many robust sigmas from the median is suspicious
MOISTURE_SOFT_PCT = 20.0   # above this, handling behaviour changes and the repose angle is not valid

DEFAULTS: dict[str, float] = {
    "grade_au_gpt": 0.0,
    "coarse_frac": 0.35,
    "moisture_pct": 3.0,
}


@dataclass
class ContractReport:
    """What the gate decided, in a form the manifest and the app can both render."""

    accepted: list[TruckDump] = field(default_factory=list)
    rejected: list[dict[str, Any]] = field(default_factory=list)
    flagged: list[dict[str, Any]] = field(default_factory=list)
    defaulted: dict[str, int] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return len(self.accepted) > 0

    def summary(self) -> str:
        d = ", ".join(f"{k} defaulted on {v} rows" for k, v in sorted(self.defaulted.items()))
        base = (f"{len(self.accepted)} accepted, {len(self.rejected)} rejected, "
                f"{len(self.flagged)} flagged")
        return f"{base}; {d}" if d else base


def _median(xs: list[float]) -> float:
    s = sorted(xs)
    n = len(s)
    if n == 0:
        return 0.0
    return s[n // 2] if n % 2 else 0.5 * (s[n // 2 - 1] + s[n // 2])


def _mad_sigma(xs: list[float]) -> float:
    """Robust scale from the median absolute deviation.

    A plain standard deviation would be inflated by the very outliers this check is looking for, so a
    grossly wrong row could hide behind the width it created. The 1.4826 factor makes the MAD a
    consistent estimator of sigma for normally distributed data.
    """
    if len(xs) < 4:
        return 0.0
    m = _median(xs)
    return 1.4826 * _median([abs(x - m) for x in xs])


def validate_rows(
    raw_rows: list[dict[str, Any]],
    *,
    pad_extent_m: tuple[float, float] | None = None,
) -> ContractReport:
    """Apply CONTRACT 1 to raw rows. Pure, deterministic, no input or output.

    ``pad_extent_m`` is ``(x_max, y_max)``; when supplied, dumps outside it are rejected. It is
    optional because a log can legitimately be validated before a pad has been chosen for it.
    """
    rep = ContractReport()
    numeric_cache: list[tuple[int, dict[str, float], dict[str, Any]]] = []
    last_t = -math.inf

    for i, row in enumerate(raw_rows):
        missing = [c for c in REQUIRED_COLUMNS if c not in row or row[c] in (None, "")]
        if missing:
            rep.rejected.append({"row": i, "reason": f"missing or empty required columns: {missing}"})
            continue
        try:
            t_s = float(row["timestamp"])
        except (TypeError, ValueError):
            rep.rejected.append({"row": i, "reason": "timestamp is not a number of seconds"})
            continue
        if t_s < last_t - 1e-9:
            rep.rejected.append({"row": i, "reason": f"timestamp {t_s:g} precedes the previous row"})
            continue

        vals: dict[str, float] = {}
        bad: list[str] = []
        for name, (lo, hi, _unit) in RANGES.items():
            if name in row and row[name] not in (None, ""):
                try:
                    v = float(row[name])
                except (TypeError, ValueError):
                    bad.append(f"{name} is not numeric")
                    continue
                if math.isnan(v) or math.isinf(v):
                    bad.append(f"{name} is NaN or Inf")
                    continue
                if not (lo <= v <= hi):
                    bad.append(f"{name}={v:g} outside [{lo:g}, {hi:g}]")
                    continue
                vals[name] = v
            elif name in DEFAULTS:
                vals[name] = DEFAULTS[name]
                rep.defaulted[name] = rep.defaulted.get(name, 0) + 1
            elif name in REQUIRED_COLUMNS:
                bad.append(f"{name} missing")

        if bad:
            rep.rejected.append({"row": i, "reason": "; ".join(bad)})
            continue

        x = float(row.get("dump_easting", 0.0) or 0.0)
        y = float(row.get("dump_northing", 0.0) or 0.0)
        if pad_extent_m is not None and (x < 0 or y < 0 or x > pad_extent_m[0] or y > pad_extent_m[1]):
            rep.rejected.append({"row": i, "reason": f"dump at ({x:g}, {y:g}) is off the pad"})
            continue

        last_t = t_s
        numeric_cache.append((i, vals, {"t_s": t_s, "x": x, "y": y, "row": row}))

    # soft checks need the whole file, so they run after the per-row pass
    grades = [v["grade_cu_pct"] for _, v, _ in numeric_cache]
    med = _median(grades)
    sig = _mad_sigma(grades)

    for eid, (i, vals, extra) in enumerate(numeric_cache):
        row = extra["row"]
        if sig > 0 and abs(vals["grade_cu_pct"] - med) > GRADE_SOFT_SIGMA * sig:
            rep.flagged.append({
                "row": i, "event_id": eid,
                "flag": (f"grade_cu_pct={vals['grade_cu_pct']:.3f} is more than "
                         f"{GRADE_SOFT_SIGMA:g} robust sigma from the median {med:.3f}"),
            })
        if vals.get("moisture_pct", 0.0) > MOISTURE_SOFT_PCT:
            rep.flagged.append({
                "row": i, "event_id": eid,
                "flag": (f"moisture_pct={vals['moisture_pct']:.1f} exceeds {MOISTURE_SOFT_PCT:g}; "
                         "the imposed angle of repose is not valid for wet handling"),
            })
        rep.accepted.append(TruckDump(
            event_id=eid,
            t_s=extra["t_s"],
            truck_id=str(row.get("truck_id", f"T{eid % 12 + 1:02d}")),
            source_id=str(row.get("source_block_id", row.get("source_id", "unknown"))),
            tonnes=vals["tonnes"],
            grade_cu_pct=vals["grade_cu_pct"],
            grade_au_gpt=vals.get("grade_au_gpt", 0.0),
            coarse_frac=vals.get("coarse_frac", DEFAULTS["coarse_frac"]),
            moisture_pct=vals.get("moisture_pct", DEFAULTS["moisture_pct"]),
            x_m=extra["x"], y_m=extra["y"],
        ))
    return rep


def contract_doc() -> list[dict[str, str]]:
    """The contract as data, so the app renders exactly what the code enforces.

    Documentation that is written out separately from the code it describes drifts. This function is
    the single source for both, so the table on the Implementation page cannot disagree with the gate.
    """
    rows = [
        {"column": "timestamp", "unit": "s (pad clock)", "rule": "required, numeric, non-decreasing"},
        {"column": "truck_id", "unit": "-", "rule": "optional, free text"},
        {"column": "source_block_id", "unit": "-", "rule": "optional, free text"},
    ]
    for name, (lo, hi, unit) in RANGES.items():
        req = "required" if name in REQUIRED_COLUMNS else f"optional, default {DEFAULTS.get(name, '-')}"
        rows.append({"column": name, "unit": unit, "rule": f"{req}, reject outside [{lo:g}, {hi:g}]"})
    rows.append({"column": "dump_easting / dump_northing", "unit": "m",
                 "rule": "optional; reject if outside the declared pad extent"})
    return rows
