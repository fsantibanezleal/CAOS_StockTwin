"""CONTRACT 1, ingestion.

Good rows validate, bad rows are rejected with a reason, suspicious rows are flagged and kept.

Nothing here is coerced into range. A coerced row looks like data and is not, and the whole point of a
bring-your-own-data gate is that a reader learns what their file actually contained.
"""
from __future__ import annotations

from pipeline.io.contract import contract_doc, validate_rows


def _row(**kw):
    base = {"timestamp": 0.0, "tonnes": 220.0, "grade_cu_pct": 0.6}
    base.update(kw)
    return base


def test_a_good_row_is_accepted_with_its_defaults_recorded():
    rep = validate_rows([_row()])
    assert rep.ok and len(rep.accepted) == 1 and not rep.rejected
    assert rep.defaulted.get("coarse_frac") == 1, "a defaulted column must be counted, not hidden"
    assert "defaulted" in rep.summary()


def test_out_of_range_rows_are_rejected_with_a_stated_reason():
    rows = [
        _row(timestamp=0.0, tonnes=-5.0),                 # negative tonnage
        _row(timestamp=1.0, tonnes=9000.0),               # larger than any haul truck
        _row(timestamp=2.0, grade_cu_pct=95.0),           # a percentage that is not one
        _row(timestamp=3.0, tonnes="not a number"),       # non-numeric
        {"timestamp": 4.0, "tonnes": 220.0},              # missing a required column
    ]
    rep = validate_rows(rows)
    assert len(rep.rejected) == len(rows), rep.rejected
    assert all(r["reason"] for r in rep.rejected)
    assert not rep.accepted


def test_rows_out_of_time_order_are_rejected():
    rep = validate_rows([_row(timestamp=100.0), _row(timestamp=50.0)])
    assert len(rep.accepted) == 1 and len(rep.rejected) == 1
    assert "precedes" in rep.rejected[0]["reason"]


def test_a_dump_outside_the_pad_is_rejected():
    rep = validate_rows([_row(dump_easting=1000.0, dump_northing=5.0)], pad_extent_m=(100.0, 100.0))
    assert not rep.accepted and "off the pad" in rep.rejected[0]["reason"]


def test_a_grade_outlier_is_flagged_and_kept():
    rows = [_row(timestamp=float(i), grade_cu_pct=0.60 + 0.001 * (i % 5)) for i in range(60)]
    rows.append(_row(timestamp=99.0, grade_cu_pct=3.5))
    rep = validate_rows(rows)
    assert len(rep.accepted) == 61, "a flagged row is kept, not thrown away"
    assert any("robust sigma" in f["flag"] for f in rep.flagged)


def test_wet_material_is_flagged_because_the_repose_angle_stops_being_valid():
    rep = validate_rows([_row(moisture_pct=26.0)])
    assert len(rep.accepted) == 1
    assert any("angle of repose" in f["flag"] for f in rep.flagged)


def test_the_documented_contract_matches_the_enforced_one():
    """The table the app renders is generated from the code that enforces it, so it cannot drift."""
    doc = contract_doc()
    names = {r["column"] for r in doc}
    assert {"timestamp", "tonnes", "grade_cu_pct", "coarse_frac", "moisture_pct"} <= names
    assert all(r["unit"] and r["rule"] for r in doc)


def test_the_shipped_example_passes_contract_1_and_exercises_every_outcome():
    """`data/examples/truck_log_example.csv` is the bring-your-own-data door, so it must work.

    The instantiate guide asks for a tiny sample that passes CONTRACT 1. A sample where every row is
    clean would prove only that the happy path works, and the outlier policy is the part a reader
    needs to trust, so this one deliberately carries all three outcomes: a hard range violation that
    is REJECTED with a reason, a grade far from the file's own robust centre that is FLAGGED and kept,
    and wet material that is FLAGGED because the dry angle of repose stops being valid above 20
    percent moisture.

    Asserting the counts here means a change to the policy either keeps this behaviour or updates the
    example deliberately; it cannot silently start accepting the row it is supposed to reject.
    """
    import csv
    from pathlib import Path

    path = Path(__file__).resolve().parent.parent / "data" / "examples" / "truck_log_example.csv"
    assert path.exists(), "the bring-your-own-data example is missing"
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    assert len(rows) == 24

    rep = validate_rows(rows)
    assert len(rep.accepted) == 23, rep.summary()
    assert len(rep.rejected) == 1, rep.summary()
    assert len(rep.flagged) == 2, rep.summary()

    # nothing is silently coerced: a rejection carries the reason and the offending value
    assert "tonnes" in rep.rejected[0]["reason"]
    assert "outside" in rep.rejected[0]["reason"]

    # the two soft checks are the ones a reader has to understand, so they are named explicitly
    flags = " ".join(f["flag"] for f in rep.flagged)
    assert "robust sigma" in flags, "the MAD-based grade outlier check did not fire"
    assert "wet handling" in flags, "the moisture check did not fire"

    # and the accepted rows are usable: they are what the engine consumes
    assert all(d.tonnes > 0 and d.grade_cu_pct >= 0 for d in rep.accepted)
