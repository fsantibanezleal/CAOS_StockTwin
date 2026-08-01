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

`timestamp` is seconds on the pad clock and must be non-decreasing. Optional columns are
`truck_id`, `source_block_id`, `grade_au_gpt`, `coarse_frac`, `moisture_pct`, `size_p80_mm`,
`dump_easting`, `dump_northing`. The full table of units and ranges is in
[data-contract.md](../data-contract.md), generated from the code that enforces it.

## Validate it

```python
from stlab.stages import ingest

report = ingest.from_csv("my_shift.csv", pad_extent_m=(192.0, 72.0))
print(report.summary())
for r in report.rejected[:10]:
    print("rejected:", r["reason"])
for f in report.flagged[:10]:
    print("flagged:", f["flag"])
```

## What the gate will and will not do

It **rejects** a row failing a hard range, with the reason recorded, and it counts it. It **flags** a
grade more than four robust sigmas from the file's own median, and moisture above 20 percent. It
**coerces nothing**: a coerced row looks like data and is not.

It rejects rows out of time order, because a stockpile is a sequence, and dumps outside the declared pad
extent, because a dump with no cell to land in has no meaning in this model.

## Run your data through the pile

```python
from stlab.model.run import RunConfig, simulate
from stlab.io.schema import PadSpec

cfg = RunConfig(case_id="my_shift", pad=PadSpec(nx=64, ny=24, cell_m=3.0, repose_deg=37.0),
                stacking="chevron", reclaim="fullface", n_passes=24, sr=1.0)
result = simulate(cfg, report.accepted)
print(result.metrics)
```

## Honest limits on your own data

The angle of repose is IMPOSED and must be set for your material; the default 37 degrees is a handbook
mid-range value for crushed copper ore, not a measurement of yours. The segregation number has to be
calibrated or left at its published anchor, and the product reports which. And the grade field is only
as good as the sampling that produced it: a variance reduction computed from biased grade-control data
inherits that bias exactly.
