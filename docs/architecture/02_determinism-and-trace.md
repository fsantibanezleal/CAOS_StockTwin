# Determinism and the artifacts

A bake is a pure function of `(scenario, seed)`.

That is not a convenience. The committed artifacts are the source of truth for everything the app
shows, so a bake that is not reproducible makes every artifact unreproducible and every number
unverifiable. Hidden randomness is the failure this contract exists to catch.

## What that requires

* **One seed per scenario, carried explicitly.** `Scenario.seed` in
  `data-pipeline/pipeline/scenarios.py` is the only entropy in a bake. `pipeline/bake.py::run` reads
  it, adds an optional `seed_offset` used by the multi-seed band, and passes that single value into
  both the dig sequence and the build. There is no ambient randomness below it.

* **A generator a browser can reproduce.** The incoming stream uses a 32-bit xorshift written out by
  hand, `bedblend.Xorshift`, and the build's profile choice uses the same algorithm inline as
  `bedblend.build._Rand`. Neither Python's `random` nor numpy's `Generator` can be reproduced bit for
  bit in another language, and the engine is dependency-free precisely so its arithmetic is portable.

* **The only stochastic choice in the build is which of the three at-crest profiles forms**, drawn
  from their measured frequencies because the source is explicit that position alone does not
  determine it. Everything else follows deterministically from the plan and the terrain.

* **No wall clock, no host name, no iteration over an unordered map** in anything that reaches an
  artifact. `pipeline/bake.py` states this at the top of the module, and the manifest carries no
  timestamp, which is what makes a re-bake a no-op in git when nothing has changed.

## What the manifest carries, and what it deliberately does not

The manifest records the scenario, its seed, the build summary, the material, the pad, the reclaim
campaign, and a `gate` block. It carries **no timing**. A manifest that changed on every re-bake would
dirty git and make a real change indistinguishable from a re-run.

The `gate` block is physical rather than operational: `loads_offered`, `loads_placed`,
`refusal_rate`, `mass_residual_rel`, `pairs_over_repose`, `worst_local_slope_deg`,
`stable_tolerance_deg`, `ledger_agrees_with_terrain`, and the scenario's own `kill_criterion`. Those
are invariants of the physics, not budgets for the renderer.

It also carries no VERDICT. A baked variance-reduction ratio would be unfalsifiable, because a reader
could not tell a real result from a typo, so the ratio is recomputed in the browser from the events
and `scripts/check_artifacts.py` fails the build if a forbidden key appears in a manifest.

## How reproducibility is enforced

`scripts/check_artifacts.py` is the release gate over the committed tree: every scenario the registry
declares is present, no verdict is baked, and the physical invariants hold.

`scripts/install_bake.py` refuses a partial bake. A killed run's stragglers once kept appending to a
completion log, so a line count reached 22 while only 15 distinct scenarios had finished. The
installer reads that log as a set, requires every registry scenario present and exit-zero, and
replaces the tree wholesale so it cannot end up mixing two engine versions, which is the failure no
per-scenario check can see.

The test suite adds that a bake at a reduced budget writes into a sandbox and never the canonical
tree. A pytest run that wrote the committed artifacts is how a release was once clobbered, so
`data-pipeline/run.py` makes the destructive default the one that hurts if you get it wrong, and CI
always passes `--output`.
