"""Stage 1, ingest: raw records through CONTRACT 1 into validated dumps.

Two sources feed this stage and both go through the same gate, which is the point of having a gate at
all: a synthetic case and a user's real dispatch export must be indistinguishable to everything
downstream.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from bedblend.schema import TruckDump

from ..io.contract import ContractReport, validate_rows
from ..io.formats import read_csv_rows


def run(rows: list[dict[str, Any]], *, pad_extent_m: tuple[float, float] | None = None) -> ContractReport:
    """Validate raw rows and return the acceptance report."""
    return validate_rows(rows, pad_extent_m=pad_extent_m)


def from_csv(path: str | Path, *, pad_extent_m: tuple[float, float] | None = None) -> ContractReport:
    """Read a truck dump log from disk and validate it. The bring-your-own-data entry point."""
    return run(read_csv_rows(path), pad_extent_m=pad_extent_m)


def from_generated(dumps: list[TruckDump]) -> ContractReport:
    """Pass generated dumps through the SAME gate, rather than trusting the generator.

    A generator that quietly produces a negative tonnage or a grade of 40 percent would otherwise
    reach the pile unchallenged, and the resulting picture would look fine. Round-tripping through
    the contract costs microseconds and closes that hole.
    """
    return run([{
        "timestamp": d.t_s, "truck_id": d.truck_id, "source_block_id": d.source_id,
        "tonnes": d.tonnes, "grade_cu_pct": d.grade_cu_pct, "grade_au_gpt": d.grade_au_gpt,
        "coarse_frac": d.coarse_frac, "moisture_pct": d.moisture_pct,
        "dump_easting": d.x_m, "dump_northing": d.y_m,
    } for d in dumps])
