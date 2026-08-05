# Guide: bring your own data

The product reads a truck dump log through the same gate it uses internally. Nothing about a real
dispatch export is special-cased.

## The minimum file

A CSV with three required columns:

```csv
timestamp,tonnes,grade_cu_pct
0,220.4,0.61
90,218.7,0.58
180,221.9,0.64
```

`timestamp` is seconds on the pad clock and must be non-decreasing. The optional columns are
`truck_id`, `source_block_id`, `grade_au_gpt`, `coarse_frac`, `moisture_pct`, `size_p80_mm`,
`dump_easting`, `dump_northing`, `dump_area`, `dump_bench`. The full table of units and ranges is in
[../data-contract.md](../data-contract.md), and it is generated from
`data-pipeline/pipeline/io/contract.py::contract_doc`, which is the same code that enforces it.

## Validate it

```python
import sys
sys.path.insert(0, "data-pipeline")           # this repo declares no package; the bake is on the path

from pipeline.io.contract import validate_rows
from pipeline.io.formats import read_csv_rows

rows = read_csv_rows("my_shift.csv")
report = validate_rows(rows, pad_extent_m=(150.0, 150.0))

print(report.summary())
for r in report.rejected[:10]:
    print("rejected:", r["reason"])
for f in report.flagged[:10]:
    print("flagged:", f["flag"])
print("defaulted:", report.defaulted)
```

Run against a four-row file with a deliberately out-of-order timestamp, an over-range tonnage and a
wet load, that prints:

```
2 accepted, 2 rejected, 1 flagged; coarse_frac defaulted on 3 rows, grade_au_gpt defaulted on 3 rows,
moisture_pct defaulted on 2 rows
  rejected: timestamp 60 precedes the previous row
  rejected: tonnes=900 outside [1, 500]
  flagged:  moisture_pct=24.0 exceeds 20; the imposed angle of repose is not valid for wet handling
  defaulted: {'grade_au_gpt': 3, 'coarse_frac': 3, 'moisture_pct': 2}
```

## What the gate will and will not do

It **rejects** a row failing a hard range, with the reason recorded, and it counts it. It **flags** a
grade far from the file's own robust median, and moisture above 20 percent, because past saturation the
imposed angle of repose is not valid and the geometry the model produces is not trustworthy. It
**defaults** an absent optional column and REPORTS how many rows it defaulted, which is the difference
between a stated assumption and a silent one.

It rejects rows out of time order, because a stockpile is a sequence and the order of arrival is the
whole subject. It rejects dumps outside the declared pad extent, because a dump with no cell to land
in has no meaning in this model.

It **coerces nothing**. A coerced row looks like data and is not.

## Turning accepted rows into a pile

The engine takes `Payload` objects, not `DumpRecord`s, so an adapter is one comprehension. The fields
you must map are the grade, the tonnage and the source block; the grade uncertainty has no counterpart
in a dispatch export and has to be a stated assumption.

```python
import bedblend as bb

terrain = bb.Terrain.flat(60, 60, 2.5)
plan = bb.rectangular_yard(n_areas=1, area_width_m=90.0, area_length_m=90.0,
                           bench_height_m=6.0, n_benches=2, margin_m=30.0)
fleet = bb.Fleet.of(4, bb.TruckSpec(), (15.0, 75.0), repose_deg=37.0)

# `source_id` groups loads that came from the same dig block, which is what provenance rolls up to.
blocks = {sid: i for i, sid in enumerate(dict.fromkeys(r.source_id for r in report.accepted))}
loads = [
    bb.Payload(
        tonnes=r.tonnes,
        grade=r.grade_cu_pct,
        source_block=blocks[r.source_id],
        grade_uncertainty=0.12,        # a STATED assumption: no dispatch export carries this
    )
    for r in report.accepted
]

built = bb.build(terrain, plan, fleet, loads, repose_deg=37.0, seed=20260801)
print(f"{len(built.placed)} placed, {built.refusal_rate:.1%} refused")
```

`Payload` has exactly four fields, `tonnes`, `grade`, `source_block` and `grade_uncertainty`, and
that is the whole boundary. Check it rather than trusting this page:

```python
import dataclasses, bedblend
print([f.name for f in dataclasses.fields(bedblend.Payload)])
```

## Units, once, so there is no ambiguity

Distances are **metres** in pad coordinates with the origin at a corner. Masses are **tonnes**. Angles
are **degrees**. Grades and size splits are **fractions of one**, not percentages, once inside the
engine; the CSV carries `grade_cu_pct` as a percentage and the adapter is where that conversion
belongs if your grades are expressed that way. Time is **seconds** on the pad clock, and it is used
only for ordering.

## Honest limits on your own data

The angle of repose is IMPOSED and must be set for your material; the default 37 degrees is a handbook
mid-range value for crushed hard rock, not a measurement of yours.

The segregation coefficients are anchored to the literature rather than fitted to your material, and
the product says so on the Benchmark page rather than in a footnote. See
[03_calibration and the DEM lane](03_dem-lane.md) and
[../methods/07_dem-calibration.md](../methods/07_dem-calibration.md).

The grade field is only as good as the sampling that produced it. A variance reduction computed from
biased grade-control data inherits that bias exactly, and the engine cannot tell you that has happened.

Finally, the engine models one truck class and no fleet scheduling. If your question is about queueing,
cycle time or dispatch, this is the wrong tool: it measures what the PILE does to the grade, not what
the fleet does to the schedule.
