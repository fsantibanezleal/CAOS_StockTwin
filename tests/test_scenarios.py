"""The product's scenarios, and the gates every bake must pass.

These are not the engine's tests. `bedblend` has its own suite for the physics. These check the
things that are this PRODUCT's responsibility: that each shipped scenario runs, that its artifacts
are complete and well formed, that the routing sends each class where it was sent, and that the
invariants hold on the ACTUAL artifact rather than on a synthetic fixture.

A passing unit test on a fixture does not prove the shipped trace is sound, which is the whole reason
these exist separately.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from pipeline.bake import run, topography_report, write
from pipeline.scenarios import SCENARIOS, by_id, class_thresholds, route_to_area

# Loads per scenario in the test suite. AT A REDUCED BUDGET, and the reason matters: these tests
# check that every stage runs and every invariant holds, which a short campaign exercises exactly as
# well as a long one. Baking twenty scenarios at their shipped budget is hours, and it was blocking
# every pull request. The SHIPPED numbers are verified separately, by scripts/check_artifacts.py,
# against the committed artifacts rather than against a fresh bake.
TEST_LOADS = 140


@pytest.fixture(scope="module")
def baked(tmp_path_factory) -> dict:
    """Bake every scenario once, at a reduced budget, into a sandbox.

    NEVER into the committed artifact tree. A pytest run writing the canonical bake is how a release
    once shipped a clobbered artifact, and the fix is that tests cannot reach it.
    """
    out = tmp_path_factory.mktemp("artifacts")
    return {s.id: (run(s.id, n_loads=TEST_LOADS), out) for s in SCENARIOS}


@pytest.fixture(scope="module")
def baked_deep() -> object:
    """One bake deep enough to reach the edge campaign, for the tests that need a face to exist."""
    return run("single", n_loads=520)


def test_the_matrix_meets_the_floor_and_covers_its_axes():
    """ADR-0056 puts the floor at a dozen configurable cases, and an axis needs more than one case."""
    ids = {s.id for s in SCENARIOS}
    assert len(ids) >= 12, f"the matrix has {len(ids)} cases against a floor of 12"
    assert len(ids) == len(SCENARIOS), "two scenarios share an id"

    from collections import Counter

    per_axis = Counter(s.category for s in SCENARIOS)
    assert len(per_axis) >= 5, f"only {len(per_axis)} axes: {sorted(per_axis)}"
    thin = [a for a, n in per_axis.items() if n < 2 and a != "reference"]
    assert not thin, f"these axes carry a single case, which is an illustration not a comparison: {thin}"


def test_every_scenario_declares_why_it_exists_and_what_would_kill_it():
    """A scenario without a kill criterion is a demonstration, not a test."""
    for s in SCENARIOS:
        assert len(s.reason) > 60, f"{s.id} has no real reason for inclusion"
        assert len(s.kill_criterion) > 60, f"{s.id} has no kill criterion"
        assert s.title_en and s.title_es, f"{s.id} is not bilingual"
        assert s.summary_en and s.summary_es, f"{s.id} is not bilingual"


@pytest.mark.parametrize("sid", [s.id for s in SCENARIOS])
def test_the_bake_gate_holds_on_the_real_artifact(baked, sid: str):
    """THE GATE. Zero pairs over repose, ledger agreeing with terrain, mass conserved.

    `run` raises on violation, so reaching this point already means the gate passed; the assertions
    make the numbers visible in the test output rather than implicit in an absence of exceptions.
    """
    bake, _ = baked[sid]
    g = bake.gate
    assert g["pairs_over_repose"] == 0, (
        f"{sid}: {g['pairs_over_repose']} cell pairs over repose, worst "
        f"{g['worst_local_slope_deg']} deg. This is the defect that rendered as spikes."
    )
    assert g["ledger_agrees_with_terrain"]
    assert g["mass_residual_rel"] < 1e-6
    assert g["loads_placed"] > 0


@pytest.mark.parametrize("sid", [s.id for s in SCENARIOS])
def test_every_scenario_places_most_of_what_it_planned(baked, sid: str):
    """Refusals are honest output, but a plan placing almost nothing is a bad plan.

    The threshold is deliberately generous, and the reason is a real finding rather than a tuning
    concession. The plan is generated ONCE, up front, from the area geometry. The pile then grows
    away from it: freshly placed material stands at the angle of repose and a truck climbs about two
    thirds of that, so a growing bench steadily converts planned tips into unreachable ones. On an
    18 m bench that costs around 40 percent of them, and close to 60 on the yard, where three areas
    are built at once so each one's plan ages while the others are being worked. A real operation
    RE-PLANS as the bench develops, which this generator does not do, and the gap between planned and
    actual positions in the app is exactly that effect made visible.
    """
    bake, _ = baked[sid]
    assert bake.result.refusal_rate < 0.65, (
        f"{sid} refused {bake.result.refusal_rate:.0%} of its planned tips"
    )
    assert len(bake.result.placed) > 100, f"{sid} placed only {len(bake.result.placed)} loads"


def test_both_construction_phases_and_the_measured_profiles_appear(baked_deep):
    """A build with no edge dumps never formed a face, so none of the cascade physics ran.

    ON ONE SCENARIO, at a budget deep enough to reach the edge campaign. This is a property of the
    ENGINE and not of any scenario: the base layer is the first fifth of a bench by volume, so a
    reduced bake is ALL paddock by construction and the assertion would be testing the budget. The
    per-scenario tests run at the reduced budget because what they check does not depend on it.
    """
    counts = baked_deep.result.profile_counts()
    assert counts.get("paddock", 0) > 0, "no base layer"
    cascade = sum(v for k, v in counts.items() if k != "paddock")
    assert cascade > 0, "no cascading dumps at all"
    # The three at-crest types are drawn from their measured frequencies, so all three should appear
    # over a few hundred loads.
    assert {"oval", "comet", "rectangular"} <= set(counts), f"profiles: {counts}"


@pytest.mark.parametrize("sid", [s.id for s in SCENARIOS])
def test_the_artifacts_are_complete_and_parse(baked, sid: str, tmp_path):
    bake, _ = baked[sid]
    m = write(bake, tmp_path)
    d = tmp_path / sid
    for f in m["files"] + ["manifest.json"]:
        p = d / f
        assert p.exists(), f"{sid} is missing {f}"
        json.loads(p.read_text(encoding="utf-8"))

    loads = json.loads((d / "loads.json").read_text(encoding="utf-8"))
    placed = [x for x in loads if x["placed"]]
    assert placed
    # THE PATHS. Felipe's requirement: the truck is drawn coming in and going away, so the trace has
    # to carry both, not just the discharge point.
    assert all(len(x["approach"]) >= 1 for x in placed), "a placed load has no approach path"
    assert all("departure" in x for x in placed), "a placed load has no departure path"


def test_the_yard_routes_each_class_to_its_own_area(baked):
    """Routing is the mechanism by which sectors exist. If a class does not end up where it was sent,
    the sector view is comparing nothing."""
    bake, _ = baked["yard"]
    scn = by_id("yard")
    thresholds = class_thresholds(scn)
    for r in bake.result.loads:
        if not r.placed:
            continue
        assert r.area == route_to_area(r.grade, thresholds, scn.classes), (
            f"load {r.seq} at grade {r.grade:.3f} landed in {r.area!r}"
        )


def test_the_yard_areas_actually_differ_in_grade(baked):
    """Routing that produced three identical piles would be routing in name only."""
    from bedblend.sectors import rollup

    bake, _ = baked["yard"]
    scn = by_id("yard")
    rolls = [rollup(bake.result.model, bake.result.terrain, a) for a in scn.plan().areas]
    rolls = [r for r in rolls if r.n > 5]
    assert len(rolls) >= 2
    grades = sorted(r.mean_grade for r in rolls)
    widest = max(r.ci[0.95] for r in rolls)
    assert grades[-1] - grades[0] > widest, (
        f"the areas differ by {grades[-1] - grades[0]:.4f}, inside their own interval {widest:.4f}"
    )


def test_the_sidehill_never_digs_below_original_ground(baked):
    """The kill criterion for the topography case.

    A cell below its starting elevation is excavation nobody performed. Two bugs produced exactly
    that before this case existed: a dozer selecting material by elevation, and a relaxation that
    treated elevation as free-floating.
    """
    bake, _ = baked["sidehill"]
    t = bake.result.terrain
    worst = min(t.z[c] - t.z0[c] for c in range(t.n_cells))
    assert worst >= -1e-6, f"the build cut {abs(worst):.3f} m below original ground"


def test_the_sidehill_has_real_relief_and_the_flat_pads_do_not(baked):
    bake, _ = baked["sidehill"]
    z0 = bake.result.terrain.z0
    assert max(z0) - min(z0) > 10.0, "the sidehill scenario came out flat"
    flat, _ = baked["single"]
    assert max(flat.result.terrain.z0) - min(flat.result.terrain.z0) == pytest.approx(0.0)


def test_segregation_reaches_the_ledger(baked):
    """A flat coarse field would mean the sorting never got past the solver."""
    for sid in ("single", "yard", "sidehill"):
        bake, _ = baked[sid]
        cf = [v for v in bake.result.model.coarse_field() if v is not None]
        assert cf, f"{sid} has no coarse field at all"
        assert max(cf) - min(cf) > 0.01, f"{sid} coarse field is flat, so nothing sorted"


def test_the_topography_report_shows_only_heaped_fill_is_flat():
    rows = {r["fill"]: r for r in topography_report()}
    assert rows["heaped"]["relief_m"] == pytest.approx(0.0)
    assert rows["heaped"]["buildable_fraction"] == pytest.approx(1.0)
    for f in ("sidehill", "valley", "cross_valley", "ridge_crest"):
        assert rows[f]["relief_m"] > 10.0, f"{f} came out flat"
    # Confined landforms restrict buildable ground before a single load is placed.
    assert rows["valley"]["buildable_fraction"] < 1.0


def test_a_bake_is_reproducible_bit_for_bit(tmp_path):
    """The manifest is a pure function of the scenario and its seed: no clock, no host, no path.

    A manifest that changed on every re-bake would make the git history of the evidence useless,
    because a real change would stop being distinguishable from a re-run.
    """
    a = write(run("single", n_loads=TEST_LOADS), tmp_path / "a")
    b = write(run("single", n_loads=TEST_LOADS), tmp_path / "b")
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


def test_the_canonical_artifact_tree_is_never_written_by_a_test():
    """Guard against the failure that clobbered a release: a test run overwriting the committed bake."""
    canonical = Path(__file__).resolve().parents[1] / "data" / "derived"
    before = sorted(p.name for p in canonical.glob("*")) if canonical.exists() else []
    run("single")   # no write() call, so nothing can reach the tree
    after = sorted(p.name for p in canonical.glob("*")) if canonical.exists() else []
    assert before == after
