# Changelog

All notable changes to StockTwin. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
newest on top. Versions are `X.XX.XXX` (major.minor.patch, zero-padded); the Python and npm manifests
carry the PEP 440 and semver forms with the zeros dropped. Every release carries a matching git tag,
and `tools/version-audit/check_version_coherence.py` is run before tagging.

While the product is pre-release and its at-bar review is open, the version stays in `0.x`.

## [Unreleased]

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
