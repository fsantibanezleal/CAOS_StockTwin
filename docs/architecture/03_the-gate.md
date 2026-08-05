# The gates

Nothing ships that a gate has not agreed to. Every one of these runs in CI on every commit, and a
red one is a build failure rather than a warning.

They are listed here with what each catches, because several of them exist for a defect that actually
reached a release, and the story is the reason the gate is shaped the way it is.

## Over the committed artifacts

**`scripts/check_artifacts.py`, CONTRACT 2.** The artifacts in `data/derived/` are what the deployed
site serves, so this checks what is COMMITTED rather than what a test run produced. Every scenario the
registry declares is present and complete; the physical invariants hold (no cell pair over the repose
angle, the ledger agrees with the terrain, mass residual at zero, no cell below original ground); no
manifest carries a baked verdict, because a baked variance-reduction ratio is unfalsifiable; every
cut carries a truck and both haul legs; every cut delivers feed with a non-zero size split; and a cut
must DIG rather than skim.

That last one is measured as removed depth, tonnage over area over density, and not as an area. The
same honest parcel is a small hole in a tall pile and a wide one in a young thin pile, so an area
limit would fail a correct concurrent scenario and pass a skim on a deep one. Before the loader had a
reach, `intensive_drain` came out at 0.37 m: a seven centimetre skim over half a football pitch.

**`scripts/install_bake.py`.** Not a CI step but the only supported way to put a bake into the tree.
It refuses a partial one. A killed run's stragglers once kept appending to a completion log, so a line
count reached 22 while only 15 distinct scenarios had finished; it now reads that log as a set and
replaces the destination wholesale, because a tree mixing two engine versions passes every
per-scenario check there is.

## Over the claims

**`scripts/check_method_ladder.py`.** Every method the ladder rates SOTA must name a module that the
bake actually reaches. The engine once carried a complete, tested Gray-Thornton solver that nothing in
any shipped path called, while three fitted curves stood in for it and every document described the
solver. No existing check could see that: the tests passed because the solver's own tests exercised
the solver directly, and the docs were consistent because they all described the same solver.

The subtlety that makes it work: an import edge only counts when the importing module USES the
imported name. `bedblend/__init__.py` re-exports every module as strings in `__all__`, so it
contributes no edges and cannot launder an orphan into the graph.

**`scripts/check_content_standards.py`.** No em-dash and no emoji in tracked content. It reads
everything tracked except what is provably binary; it used to read an allow-list of eighteen suffixes
and five files carried eight em-dashes it could not see.

**`scripts/check_template_residue.py`.** The archetype template ships an example lab so a fresh clone
runs end to end, and instantiation is supposed to replace all of it. Five shipped products proved that
is easy to forget.

**`scripts/gen_docs.py --check`.** The generated documentation pages must match the code they are
generated from, so a scenario page cannot drift from the registry it describes.

**`scripts/check_framework_examples.py`.** Every runnable example on a framework card is executed.
Cards whose lane is not installed in CI are skipped BY NAME with a reason, so a skip is a decision
rather than an accident.

## Over the app, by clicking

**`frontend/test/focus-flow.mjs`.** ADR-0070 clause 8: the flow is the feature and it is verified by
clicking. Load the App, click the focus entry, assert the focus view rendered, click return, assert
the App came back on the same scenario with the same parameter values. A reachability check that
fetches the route directly passes on a route no user can reach. It also asserts the two measured
floors, the 80 percent focus stage and the 50 percent App instrument, and that the control rail does
not scroll.

**`frontend/test/reclaim-visible.mjs`.** Something comes for the ore, checked on the stage. The
reclaim shipped for several releases with correct tonnages and no machine attending them.

This one is NOT a pixel sampler, and the failed attempt is worth recording: counting the machines'
orange in the WebGL buffer matched 21022 pixels of TERRAIN with no cut selected, and narrowing to the
livery's hue band did not separate them either, because the light-theme ground sits in the same band.
Both versions would have passed with no machine drawn at all. So the renderer declares what it put on
the stage in `data-machines`, and the gate reads that.

## What the gates do not do

None of them decides whether a method is CORRECT, only whether it is present, affordable, honest and
consistent. Correctness is the invariant audit above, the negative controls in
[06_model-evaluation.md](06_model-evaluation.md), and each scenario's own kill criterion.
