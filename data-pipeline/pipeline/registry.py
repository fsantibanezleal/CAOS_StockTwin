"""The case registry: cases grouped by CATEGORY.

The App shows ONE selected case; Experiments and Benchmark show cross-case summaries grouped by
category. That separation is a rule from the product-quality bar, not a layout preference: a panel
answering "across all scenarios" on the App route is misplaced, because the App is the workbench for
the case the user picked.
"""
from __future__ import annotations

from .cases.definitions import CASES, CATEGORIES, Case

_BY_ID: dict[str, Case] = {c.id: c for c in CASES}


def list_cases() -> list[Case]:
    return list(CASES)


def get_case(case_id: str) -> Case:
    if case_id not in _BY_ID:
        raise KeyError(f"unknown case: {case_id!r}. known: {sorted(_BY_ID)}")
    return _BY_ID[case_id]


def list_categories() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for c in CASES:
        out.setdefault(c.category, []).append(c.id)
    return out


def category_label(category: str) -> str:
    return CATEGORIES.get(category, category)


def controls() -> list[Case]:
    return [c for c in CASES if c.category == "control"]
