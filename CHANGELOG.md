# Changelog

All notable changes to StockTwin. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
newest on top. Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the Python and npm manifests
carry the PEP 440 and semver forms with the zeros dropped. Every release carries a matching git tag,
and `tools/version-audit/check_version_coherence.py` is run before tagging.

While the product is pre-release and its at-bar review is open, the version stays in `0.x`.

## [Unreleased]

## [0.05.000] - 2026-08-04

The two cases where the pile is fed and drawn at the same time. They existed, they
were baked, and they did not ship.

### Added

- **`concurrent` and `surge`**, the two campaign cases that model a live surge pile: trucks are still
  tipping while the loader is already taking material out. They were declared in the scenario
  registry, baked successfully, and left out of the artifact tree by the assembly step, so the app
  offered twenty cases and neither of the two was among them. Nothing failed: the index is assembled
  from the manifests present on disk, so two missing folders produced a smaller matrix and a clean
  site. The Campaign axis now offers six.
- **Both meet their kill criterion**, on the same seed and geometry as the sequential reference:
  `single` reduces variance to 0.0059 over 16.57 effective sources per cut, `concurrent` to 0.4009
  over 3.38, and `surge` to 0.5162 over 2.36. A cut taken part-way through the build has fewer lifts
  available to cross, so it blends less; drawing faster reduces it again. They are also the cases
  where the 1/N bound is RELIABLE and the efficiency can be shown at all, at 74 percent of ideal on
  `concurrent`, against a sequential case whose bound is withheld.
- **Seven tests** locking the concurrent timeline: that at least two such cases ship, that every cut
  records a load index strictly inside the build and spread through it, that a sequential case
  records none, that the build chain dips in volume where a cut bit into it, that the loader appears
  in the first quarter of playback rather than after it, and that drawing while feeding blends
  measurably worse.

### Fixed

- **The timeline was the wrong shape for a concurrent campaign.** It was the build frames plus the
  reclaim frames unconditionally, with everything past the build treated as reclaim. On a concurrent
  case that plays the whole build and then rewinds to a nearly empty pile and grows it again, because
  the reclaim chain is a parallel recording of the same terrain rather than a continuation of it.
  Measured on the shipped artifact: 32 of the 744 build frames of `concurrent` and 50 of `surge`
  decrease in volume, so the build chain already carries the bites. The timeline is now the build
  alone on those cases, and a cut is drawn where it actually happened.
- **The transport readout** carries both counts at once on a concurrent case rather than pretending
  the reclaim has not started.
- Every literal count in the product, which two more cases made false at once.


## [0.04.000] - 2026-08-04

A 78-agent audit checked all 148 rules of the frontend ADRs against every surface of this product
and confirmed 61 violations, 10 of them blocking. This release is the pass over them, plus the two
further defects the new click-through gate found while it was being written.

### Added

- **Three continuous knobs that recompute the verdict in the browser**, so the App is a parametrized
  instrument rather than a case picker with a layer toggle. Surge averaging, cutoff grade and the
  independent-source threshold are each a decision a plant makes about a pile it did not build, each
  recomputes from the cut ledger on every move, and the 1/N bound moves with them because that is
  the arithmetic. What changes what was BUILT stays a readout, honestly labelled as fixed by the
  bake. A grade-tonnage curve comes with the cutoff.
- **A click-through gate for the focus flow**, which is ADR-0070 clause 8 verified by clicking rather
  than by fetching a URL: load the App, click the entry, assert the focus view, click return, assert
  the App came back on the same scenario with the same parameter values. It runs in both themes,
  asserts the 80 percent focus-stage floor, the 50 percent App-instrument floor and that the rail
  does not scroll, and it is wired into CI.
- **Value readouts under the cursor** on the 3-D stage, resolved by raycast to a cell and reported in
  physical units with the position in metres, and keyboard operation on every instrument: arrows
  orbit or pan, plus and minus zoom, Home recentres.
- **Heatmap interactions the rubric requires**: wheel zoom about the pointer, drag pan, double-click
  reset, adjustable clip percentiles, and a shift-drag region select driving a linked profile chart.
- **A protocol tab on Experiments** carrying the real held-out protocol as a figure with the
  anti-pattern struck out beside it, the metrics as equations with their real constants, and the
  table of what every case was built from.
- **Sixteen equations, eight figures and eight per-section reference rows on Methodology**, one
  Deployment section and five more engine stages on Implementation, and the pipeline as an ordered
  list with a fourteen-symbol glossary on Introduction.

### Fixed

- **The panel furniture was missing entirely.** Nineteen classes every panel asks for were defined
  nowhere: the v1 stylesheet that carried them was culled and the panels were never updated, so every
  table in the workbench rendered as a browser-default table and the focus entry as an unstyled
  button.
- **The focus route was dark in both themes**, because its whole surface was keyed to a custom
  property defined nowhere in the product, so the hardcoded fallback fired every time.
- **The focus stage failed its own 80 percent floor at 1280x800** (77.5 percent) because the rail had
  been under-sized to 288px, below the ADR's 300-340px band. Both hold now: docked at 320px above
  1500px, an overlay drawer over a full-bleed stage below it.
- **The round trip reset the reader's work.** It carried the case id and nothing else; the whole view
  state now travels in the query string in both directions.
- **The colour scale rendered nothing.** The ramp element had a size and no background; it is painted
  from the same colormap array the stage samples.
- **Three copies of a jet-family colour ramp** replaced by viridis from the shared module.
- **Four charts hand-drawn on raw canvas** ported to uPlot, so they gain drag zoom, a cursor readout,
  a reset, a keyboard path and a screen-reader table, with the detections drawn ON them.
- **SitePanels and the focus route were English-only in their entirety**, the App shipped an
  untranslated axis heading and an English-only error branch, and one Spanish string read "the bell"
  where it meant "the campaign".
- **The App instrument at 48.1 percent and the rail overflowing by 135px** at 1280x800, both found by
  the new gate and both re-measured green at 51.3 percent and zero.
- **The architecture diagrams described software that does not exist**: a live TypeScript physics
  engine, conveyor stacking geometries, seventeen cases, and fourteen module paths present in no
  repository. Re-authored, with the generator that owned them deleted per ADR-0058.

### Changed

- The kill criterion is bilingual in the artifact schema and in the twenty baked manifests.
- Citation ids follow the required authorYYYY pattern.
- The footer carries the required engine provenance as one clause.
- Routes are declared once and read by both the nav and the router.


## [0.02.001] - 2026-08-01

Two defects found by LOOKING at the deployed site rather than by reading the build, which passed
every gate with both of them present.

### Fixed

- **The App opened on the middle of the variant family**, so it said "Modified from G01_chevron" with
  a Reset button on first paint and reported a variance reduction of 0.082 where the case's own
  documentation says 0.061. A case now opens on the regime whose override equals the case as
  declared, which is the point its expected band and kill criterion are written about, and the App
  therefore agrees with the baked artifact on first load.
- **The empty pad was coloured as material at height zero.** Feeding 0 into the colour ramp painted
  every un-stacked cell in the ramp's bottom colour, so a bed on a 192 by 72 m pad rendered as a
  saturated slab covering the whole pad with a small ridge on it, and the honest reading of that
  picture is that the pad is full. The empty floor is drawn in a neutral pad colour now, so what is
  coloured is what was actually built.

Neither was caught by the gate, which measures geometry, pixel counts and reachability. Both were
visible in the first screenshot of the live site.


## [0.02.000] - 2026-08-01

The release that makes the product's own claims true. A full audit against the ADRs and conventions
found eight violations; this fixes all of them, and the two that mattered most changed the shape of
the repository rather than only its text.

### Changed

- **The engine is no longer in this repository.** The bed-blending physics is now `bedblend`, a
  separately published library in CAOS_BedBlend, consumed here as a pinned dependency. A product may
  not declare its own package: either the code is a real library in its own repo with a real PyPI
  project, or it is not a package at all. This repository had been in the forbidden middle, declaring
  an unpublished `stlab` that nobody could install. It now declares no package: `data-pipeline/` is a
  folder invoked as `python data-pipeline/run.py <CASE>`, and three CI guards fail the build if a
  `[project]` table, an editable install, or a `python -m` invocation ever reappears.
- **Spanish is written properly.** 425 user-facing strings had no accents at all, which reads as
  broken to any Spanish speaker. Restored by rule rather than by vocabulary, so the fix covers words
  nobody enumerated, with the ambiguous cases (`esta`/`está`, `aun`/`aún`, interrogatives) resolved by
  phrase. 198 capitals-as-emphasis removed from prose in both languages.
- **The regime control is a select in the rail, not a bar above the stage.** Chips above the stage
  cost a permanent row of chrome and took the App instrument from 53 to 44.7 percent of the viewport
  at 1280x800, below the floor. The rail's Case section was then split in two, because a panel that
  cannot show its own controls is a sizing failure rather than something to wrap in a scrollbar.

### Added

- **84 operating regimes**, six for each of the fourteen parametric cases. Each category sweeps the
  knob its own answer turns on: layer count for the stacking axis, parcel size for reclaim, variogram
  range for input variability, and the segregation number from the passive-tracer limit through
  saturation. Selecting one re-runs the real engine in the browser. The three controls carry NO
  regimes, deliberately: a control is one point with a numerical kill criterion, and padding it to
  reach a chip count would be fabricating experiments.
- **The cross-lane parity, measured and published** on the Benchmark page. The browser mirror and the
  canonical engine agree on the input stream to 5.7e-14, deposited tonnage to 1.8e-13, total mass to
  1.1e-11 and the layer count exactly, while the lot size-split composition differs by 9.8e-4 and cut
  grade by 5.4e-4. Mass and geometry are exact; the drift is floating-point accumulation order in the
  segregation path. Reported rather than claimed away, and pinned against regression by a test.
- **A `LICENSE`.** The repository is public and had none, so the code was legally all-rights-reserved.
- **Framework cards as one folder per engine**, 24 pages, with the three Python examples EXECUTED in
  CI. A card whose example no longer runs reads as verified and is not.
- **A bring-your-own-data sample** that exercises all three outcomes of the ingestion contract: one
  hard range violation rejected with its reason, one grade beyond four robust sigmas flagged and kept,
  one wet row flagged because the dry angle of repose stops being valid above 20 percent moisture.

### Fixed

- A cross-lane tie-break defect: the browser heap compared height only, while the canonical engine
  breaks ties by cell index, so equal-height cells toppled in a different order.
- The template-residue guard never scanned `.sh` or `.ps1`, which is how an example-lab invocation
  from the template survived instantiation inside `scripts/precompute.*`.
- `requirements-offline.txt`, a sixth lane file invented where five are defined, folded back into the
  frozen `requirements-precompute.txt`.


### Added

- **The pile engine** (`stlab.model`), the shared analytic core the TypeScript live lane mirrors.
  - Method 1, a mass-conserving relaxation solver with an IMPOSED angle of repose. A priority cascade
    that topples the highest unstable cell first, so the returned transfers are in downslope order and
    are the avalanche path the segregation solver marches along. Mass is conserved to machine
    precision and no slope stands steeper than the material allows; both are tests.
  - Method 2, five stacking geometries as deposition paths: chevron, windrow, cone shell, strata,
    chevcon.
  - Method 3, four reclaim geometries, parameterised by the fraction of the face width the machine
    engages and how far down the column it reaches, which is what decides how many layers a cut
    crosses.
  - Method 4, Gray-Thornton kinetic size segregation, equation (3.20) of Proc. R. Soc. A 461, 1447,
    solved as a scalar conservation law with a Godunov flux on the flowing layer. Coarse at the toe is
    an output of the solver, not a rule in the code. `Sr = 0` degenerates exactly to a passive tracer,
    which is what makes the negative control meaningful.
  - Method 8, the per-cell lot ledger with reclaim provenance. Fractions sum to one on every cut.
  - Methods 9, 10 and 11, the variance reduction ratio on a tonnage base, experimental variograms with
    a fitted nugget-plus-spherical model, and the `1/N` independent-layer bound with the achieved
    efficiency against it.
  - Method 12, the residence-time distribution with pure FIFO and pure LIFO references computed for
    the same event sequence.
  - The incoming stream as an exponential-covariance Gaussian process in cumulative tonnage, exact by
    one-step recursion and reproducible bit for bit in the browser.
- **The two data contracts.** Ingestion validates a truck dump log with an explicit reject-or-flag
  outlier policy, and the documented table is generated from the code that enforces it so the two
  cannot drift. The artifact contract carries events and geometry only: every verdict is recomputed in
  the browser from them.
- **The staged offline pipeline**: ingest, preprocess, dataset, features, calibrate, train, infer,
  evaluate, export, validate. The bake is an explicit release operation and every test writes only to
  a sandbox.
- **Seventeen cases in five categories**, each carrying its scientific reason, expected band, kill
  criterion and split, with three numerical controls.
- **Forty-five tests**, covering mass conservation, the repose angle, species-mass conservation in the
  segregation march, the provenance sum, cross-lane determinism, the ingestion contract, and the three
  control kill criteria.
- Repository instantiated from `template_repo_product/` per ADR-0057, package renamed to `stlab`,
  MIT licensed.

### Notes

- The variance reduction ratio is `var_out / var_in`, lower is better. The reciprocal convention also
  circulates and the plan's original seed used it; building against that would have inverted every
  number in the product. The direction is pinned by a test and the formula is rendered next to the
  number in the app.
- The `1/N` bound is DERIVED from first principles and labelled as derived. The De Wet (1994) design
  equation the literature cites for this relationship could not be verified from a primary source and
  is therefore not reproduced or attributed.
