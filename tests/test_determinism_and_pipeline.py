"""Determinism, the case registry, and a sandboxed pipeline smoke run.

DETERMINISM IS NOT A NICETY HERE. ADR-0054 makes the committed trace the source of truth, so a run
that is not a pure function of ``(params, seed)`` makes every committed artifact unreproducible and
every number in the app unverifiable. Hidden randomness is the failure this file exists to catch.

THE SMOKE RUN WRITES ONLY TO A SANDBOX. A pytest run once overwrote a committed bake in another
repository on this product line and two releases shipped it. The output root is a tmp_path and the
test asserts that the canonical tree was not touched.
"""
from __future__ import annotations

import json

from bedblend.run import simulate
from bedblend.stream import generate_stream
from pipeline import registry
from pipeline.cases.definitions import CATEGORIES
from pipeline.pipeline import DERIVED, precompute
from pipeline.stages import dataset, validate


def test_the_same_seed_gives_the_same_stream():
    a = generate_stream(n_dumps=120, seed=3, structure="stationary")
    b = generate_stream(n_dumps=120, seed=3, structure="stationary")
    assert [d.grade_cu_pct for d in a] == [d.grade_cu_pct for d in b]
    assert [d.coarse_frac for d in a] == [d.coarse_frac for d in b]


def test_a_different_seed_gives_a_different_stream():
    a = generate_stream(n_dumps=120, seed=3, structure="stationary")
    b = generate_stream(n_dumps=120, seed=4, structure="stationary")
    assert [d.grade_cu_pct for d in a] != [d.grade_cu_pct for d in b]


def test_the_same_configuration_gives_an_identical_run():
    case = registry.get_case("R04_loader")
    a = simulate(case.config(11), case.dumps(11))
    b = simulate(case.config(11), case.dumps(11))
    assert a.height_final == b.height_final
    assert [(c.cut_id, c.tonnes, c.grade_cu_pct, c.n_layers) for c in a.cuts] == \
           [(c.cut_id, c.tonnes, c.grade_cu_pct, c.n_layers) for c in b.cuts]
    assert a.metrics == b.metrics


def test_every_case_declares_what_adr_0069_requires():
    for case in registry.list_cases():
        assert case.category in CATEGORIES, case.id
        assert len(case.reason) > 40, f"{case.id} has no scientific reason for inclusion"
        assert len(case.expected_band) > 20, f"{case.id} has no expected behaviour"
        assert len(case.kill_criterion) > 20, f"{case.id} has no kill criterion"
        assert case.split == "holdout", f"{case.id} must be held out of surrogate training"


def test_the_matrix_covers_every_axis_and_carries_three_controls():
    by_cat = registry.list_categories()
    assert set(by_cat) == set(CATEGORIES)
    assert len(by_cat["stacking-geometry"]) == 5
    assert len(by_cat["reclaim-method"]) == 3, "chevron plus full-face is G01, not a duplicated R01"
    assert len(by_cat["input-variability"]) == 4
    assert len(by_cat["segregation-regime"]) == 2
    assert len(registry.controls()) == 3
    assert len(registry.list_cases()) == 17


def test_the_split_never_leaks_a_seed_and_structure_group():
    corpus = [{"seed": s, "structure": st, "y": 0.1}
              for s in range(40) for st in ("stationary", "short_range", "long_range")]
    split = dataset.run(corpus)
    dataset.assert_no_leak(split)
    counts = split.counts()
    assert counts["train"] > 0 and counts["test"] > 0


def test_pipeline_smoke_writes_only_to_the_sandbox(tmp_path):
    before = sorted(p.name for p in DERIVED.glob("*")) if DERIVED.exists() else []
    manifest, row = precompute("C02_no_segregation", seed=5, output_root=tmp_path, band_seeds=3)

    trace = tmp_path / manifest["artifact"]["path"]
    assert trace.exists() and trace.stat().st_size == manifest["artifact"]["bytes"]
    assert manifest["lane"] in ("live", "precompute")
    assert row["case_id"] == "C02_no_segregation"

    metrics = json.loads((tmp_path / "C02_no_segregation" / "metrics.json").read_text(encoding="utf-8"))
    assert metrics["control"]["pass"], metrics["control"]
    assert all(c["pass"] for c in metrics["invariants"].values()), metrics["invariants"]

    after = sorted(p.name for p in DERIVED.glob("*")) if DERIVED.exists() else []
    assert before == after, "the smoke run touched the canonical bake"


def test_the_release_gate_rejects_an_incomplete_tree(tmp_path):
    precompute("C03_starvation", seed=5, output_root=tmp_path, band_seeds=3)
    rep = validate.run(tmp_path, tmp_path / "manifests", ["C03_starvation", "G01_chevron"])
    assert not rep["ok"]
    assert any("G01_chevron" in p for p in rep["problems"])
    assert any("index.json" in p for p in rep["problems"])
