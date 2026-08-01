# Determinism and the trace

A run is a pure function of `(params, seed)`.

That is not a convenience. The committed trace is the source of truth for everything the app shows,
so a run that is not reproducible makes every artifact unreproducible and every number unverifiable.
Hidden randomness is the failure this contract exists to catch.

## What that requires

* **One seeded stream per concern**, derived with a hash of the concern's name rather than by adding
  one to a base seed, so two concerns cannot silently share a stream if someone reorders them.
  `stlab/core/rng.py::derive`.
* **A generator both languages can reproduce.** The incoming stream uses a 32-bit xorshift feeding a
  Box-Muller transform, written out by hand in Python and TypeScript. Neither Python's `random` nor
  numpy's `Generator` can be reproduced bit for bit in a browser, and the cross-lane test requires
  that they can.
* **Grid searches, not gradient methods**, wherever a fit is needed. The variogram model fit and the
  segregation-number calibration both search a bounded one-dimensional grid, because an optimiser's
  convergence path would differ between the two languages.
* **No wall-clock, no `Math.random`, no iteration over an unordered map** anywhere in the engine.

## The manifest is deterministic too

The measured runtime is used for the lane DECISION but is deliberately not stored. A manifest that
changes on every re-bake dirties git and makes a real change indistinguishable from a re-run, so the
verdict, the budgets and the deterministic byte count are recorded instead. The live runtime is
measured again in the browser, where it actually matters, and the App displays it.

## The tests

* the same seed gives the same stream, and a different seed does not;
* the same configuration gives an identical trace, cut for cut and metric for metric;
* the sandboxed smoke run leaves the canonical tree untouched.
