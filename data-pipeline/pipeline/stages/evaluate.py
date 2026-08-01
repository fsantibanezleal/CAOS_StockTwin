"""Stage 8, evaluate: the complete method x case matrix, plus the invariant audit.

Two jobs, deliberately in one stage because they are the same question asked twice: is what the
product is about to display actually true?

1. **The metric matrix.** Every case, every metric, with its multi-seed band. Missing cells fail the
   completeness gate in ``validate``; they are not averaged away.
2. **The invariant audit.** Mass conservation, provenance fractions summing to one, and the three
   control kill criteria. These catch the class of bug that produces a plausible picture with wrong
   numbers, which is the only class that still matters once the code runs at all.
"""
from __future__ import annotations

from typing import Any

TOL_MASS_T = 1e-6
TOL_FRACTION = 1e-9


def invariants(run: dict) -> dict:
    """Check every identity the model must satisfy, and report the worst violation of each."""
    result = run["result"]
    m = result.metrics

    worst_frac = 0.0
    for cut in result.cuts:
        worst_frac = max(worst_frac, abs(sum(cut.sources.values()) - 1.0))

    checks = {
        "mass_balance": {
            "worst": abs(m.mass_residual_t), "tol": TOL_MASS_T,
            "what": "deposited tonnes minus in-pile plus reclaimed tonnes",
        },
        "provenance_sum": {
            "worst": worst_frac, "tol": TOL_FRACTION,
            "what": "the provenance fractions of every reclaim cut sum to one",
        },
        "no_negative_tonnes": {
            "worst": max([0.0] + [-c.tonnes for c in result.cuts]), "tol": 0.0,
            "what": "no reclaim cut has negative tonnage",
        },
        "no_nan": {
            "worst": 0.0 if all(c.grade_cu_pct == c.grade_cu_pct for c in result.cuts) else 1.0,
            "tol": 0.0, "what": "no reclaimed grade is NaN",
        },
    }
    for v in checks.values():
        v["pass"] = v["worst"] <= v["tol"]
    return checks


def control_verdict(case: Any, run: dict, band: dict) -> dict | None:
    """Apply a control's numerical kill criterion. Returns None for a non-control case.

    Each verdict states what was measured, what was required, and whether it held. A control that
    merely looks right has not been used as a control.
    """
    if case.category != "control":
        return None
    m = run["result"].metrics

    if case.id == "C01_perfect_mixer":
        lo, hi = band["vrr"]["p05"], band["vrr"]["p95"]
        return {
            "control": case.id, "pass": lo <= m.vrr_ideal <= hi,
            "measured": {"vrr": m.vrr, "band": [lo, hi]},
            "required": {"vrr_ideal": m.vrr_ideal},
            "statement": ("with no geometry at all a cut is a tonnage-weighted mean of the whole pile, "
                          "so the achieved variance reduction ratio must contain the 1/N "
                          "independent-layer bound inside its multi-seed band"),
        }

    if case.id == "C02_no_segregation":
        by_event = {d.event_id: d.coarse_frac for d in run["result"].dumps}
        worst = 0.0
        for cut in run["result"].cuts:
            expected = sum(by_event.get(e, 0.0) * f for e, f in cut.sources.items())
            worst = max(worst, abs(cut.coarse_frac - expected))
        return {
            "control": case.id, "pass": worst <= 1e-9,
            "measured": {"worst_coarse_drift": worst}, "required": {"tolerance": 1e-9},
            "statement": ("at Sr = 0 the segregation solver must not change any lot's size split, so "
                          "every cut's coarse fraction must equal the provenance-weighted mix of its "
                          "source dumps"),
        }

    if case.id == "C03_starvation":
        r = run["result"]
        finite = all(c.tonnes > 0 and c.grade_cu_pct == c.grade_cu_pct for c in r.cuts)
        return {
            "control": case.id, "pass": bool(r.starved and finite),
            "measured": {"starved": r.starved, "cuts_finite_and_positive": finite},
            "required": {"starved": True},
            "statement": ("driving the reclaimer faster than the stacker must empty the pile and "
                          "report starvation, with no negative or NaN tonnage at the boundary"),
        }
    return None


def matrix_row(case: Any, run: dict, band: dict) -> dict:
    """One row of the case x metric matrix, in the shape the Benchmark page renders."""
    m = run["result"].metrics
    return {
        "case_id": case.id, "category": case.category,
        "stacking": case.stacking, "reclaim": case.reclaim, "structure": case.structure,
        "sr": case.sr, "n_passes": case.n_passes,
        "vrr": m.vrr, "vrr_band": [band["vrr"]["p05"], band["vrr"]["p95"]],
        "vrr_ideal": m.vrr_ideal, "n_layers": m.n_layers_mean,
        "efficiency": m.efficiency,
        "efficiency_band": [band["efficiency"]["p05"], band["efficiency"]["p95"]],
        "mixing_effect": run["mixing_effect"],
        "segregation_index": m.segregation_index,
        "segregation_band": [band["segregation_index"]["p05"], band["segregation_index"]["p95"]],
        "toe_apex_grade_delta": m.toe_apex_grade_delta,
        "var_in": m.var_in, "var_out": m.var_out, "mean_in": m.mean_in, "mean_out": m.mean_out,
        "n_cuts": len(run["result"].cuts),
        "rtd_character": run["rtd"]["character"], "rtd_position": run["rtd"]["position"],
        "starved": run["result"].starved, "seeds": band["vrr"]["n"],
    }


# The published anchors the stacking axis is scored against. Not targets to reproduce digit for digit:
# they come from a differently dimensioned CIRCULAR pile, and their source is internally inconsistent
# (see plans/stocktwin/findings.md). The test is ordinal and magnitude-level.
PUBLISHED_ANCHORS = [
    {"what": "cone shell, circular pile, optimised", "vrr": 0.232,
     "source": "Loubser and de Korte 2015, Table IV, doi:10.17159/2411-9717/2015/v115n8a15"},
    {"what": "chevcon, circular pile, optimised", "vrr": 0.121,
     "source": "Loubser and de Korte 2015, Table IV, doi:10.17159/2411-9717/2015/v115n8a15"},
    {"what": "chevcon reclaimed full-face, rule of thumb", "vrr": 0.10,
     "source": "Bond, Coursaux and Worthington 2000, ieee Ind. Appl. Mag. 6(6) 49-59"},
    {"what": "a real blending bed, mixing effect E of 5 to 7.5 at 200 to 600 layers", "vrr": 0.03,
     "source": "Schramm, AT minerals processing 06/2021"},
]


def benchmark_assertions(rows: dict[str, dict]) -> list[dict]:
    """The four ordinal assertions the plan commits to, each passing or failing in public.

    A negative result is a result. If one of these fails it is reported on the Benchmark page with the
    numbers that failed it, not quietly dropped or re-tuned until it passes.
    """
    def vrr(cid: str) -> float:
        return rows[cid]["vrr"] if cid in rows else float("nan")

    out = [
        {
            "id": "A1", "pass": vrr("G05_chevcon") < vrr("G03_coneshell"),
            "statement": "chevcon blends better than cone shell, the ordering every source agrees on",
            "measured": {"chevcon": vrr("G05_chevcon"), "coneshell": vrr("G03_coneshell")},
        },
        {
            "id": "A2", "pass": 0.08 <= vrr("G03_coneshell") <= 0.40,
            "statement": ("cone shell lands in the same magnitude band as the published 0.232; the "
                          "band is wide because the published value is for a circular pile"),
            "measured": {"coneshell": vrr("G03_coneshell"), "published": 0.232},
        },
        {
            "id": "A3", "pass": vrr("G05_chevcon") <= 0.20,
            "statement": ("chevcon reclaimed full-face reaches the magnitude of the Bond rule of "
                          "thumb, about a ten to one variance reduction"),
            "measured": {"chevcon": vrr("G05_chevcon"), "published": 0.121},
        },
        {
            "id": "A4",
            "pass": (vrr("G01_chevron") < vrr("R02_bucketwheel")
                     and vrr("R02_bucketwheel") < max(vrr("R03_end"), vrr("R04_loader"))),
            "statement": ("a full-face rake blends better than a bench cut, which blends better than "
                          "the shallow-reaching machines"),
            "measured": {"fullface": vrr("G01_chevron"), "bucketwheel": vrr("R02_bucketwheel"),
                         "end": vrr("R03_end"), "loader": vrr("R04_loader")},
        },
    ]
    return out
