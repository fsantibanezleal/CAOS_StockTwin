# Model evaluation

Two jobs in one stage, because they are the same question asked twice: is what the product is about to
display actually true?

## The metric matrix

Every case, every metric, with its multi-seed band over 31 seeds. Missing cells fail the completeness
gate; they are not averaged away.

## The invariant audit

| invariant | tolerance | what it catches |
|---|---|---|
| deposited equals in-pile plus reclaimed | 1e-6 t | mass leaking out of the relaxation or the reclaim |
| provenance fractions sum to one per cut | 1e-9 | double-counting or dropped lots in the ledger |
| no negative tonnage | exact | a boundary case producing an impossible cut |
| no NaN grade | exact | a division by an empty column surviving into the artifact |

Measured over a full case the mass residual is of order 1e-11 tonnes and the worst provenance
deviation of order 1e-12.

## The three controls

Each has a numerical kill criterion, stated in advance.

* **C01, the perfect mixer.** A single-cell pad has no geometry, so a cut is the tonnage-weighted mean
  of the whole pile and the achieved ratio must contain the `1/N` bound inside its band. If it does
  not, the ratio implementation is wrong and every number in the product is in doubt.
* **C02, zero segregation.** At `Sr = 0` the solver must not change any lot's size split, so every
  cut's coarse fraction must equal the provenance-weighted mix of its source dumps. Applied at lot
  level, where it is exact, this caught a real modelling error by a quarter of the full range: an
  early version wrote the solver's absolute composition onto lots that had come from earlier dumps.
* **C03, starvation.** Driving the reclaimer three times faster than the stacker must empty the pile
  and report starvation, with no negative or NaN tonnage at the boundary.

## The four benchmark assertions

Written before the run, evaluated in this stage, and published on the Benchmark page whether they pass
or fail. A negative result is a result: a failed assertion is reported with the numbers that failed
it, not tuned until it passes.
