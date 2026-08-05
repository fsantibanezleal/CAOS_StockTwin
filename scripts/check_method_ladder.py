#!/usr/bin/env python3
"""Every method the ladder rates SOTA must name code that the pipeline actually runs.

WHY THIS EXISTS. The engine carried a Gray-Thornton kinetic sieving solver, `bedblend/segregation.py`,
with a Godunov flux, CFL sub-stepping, a conservative deposition split and its own passing test suite.
Method 4 of the ladder cited it, rated it SOTA, and described its equations across the docs, the wiki
and three pages of the app. NOTHING IN ANY SHIPPED PATH CALLED IT. What ran instead was three fitted
curves with six constants in a different module. The directions were right and published, which is
exactly why it survived: a defensible operational model wearing the label of a validated one.

Every existing check passed. The tests passed, because the solver's own tests exercised the solver
directly. The docs were consistent, because they all described the same solver. A documentation audit
made it WORSE, since it was built from a ground-truth file written by reading the docs, so it only
enforced agreement and never correctness.

WHAT WOULD HAVE CAUGHT IT is the question this script answers: a method whose implementation nothing
invokes is the same defect as a selector entry with no engine behind it, and the acceptance contract
already forbids the second. So the ladder's claim is checked against the IMPORT GRAPH walked from the
pipeline entry point.

THE ONE SUBTLETY THAT MAKES IT WORK. Import reachability alone proves nothing here, because
`bedblend/__init__.py` re-exports every module in the package, so everything is reachable from
everything. An edge therefore only counts when the importing module USES one of the imported names as
an identifier in its own code. A re-export lists its names as strings inside `__all__` and never
references them, so `__init__.py` contributes no edges and cannot launder an orphan into the graph.
That is precisely the distinction between shipping a solver and merely publishing it.

    python scripts/check_method_ladder.py
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs" / "methods"

# Where the walk starts: the module the bake actually executes.
ENTRY = ROOT / "data-pipeline" / "pipeline" / "bake.py"

HEADER = re.compile(r"^\*\*Family:\*\*.*$", re.M)
MODULE_REF = re.compile(r"`([A-Za-z0-9_./]+\.py)(?:::[A-Za-z0-9_]+)?`")
RUNG = re.compile(r"\*\*Rung:\*\*\s*([A-Za-z]+)")
TIER = re.compile(r"\*\*Tier:\*\*\s*([a-z ]+)")

# A method may be listed and declared unimplemented. That is honest and the contract allows it, as
# long as it SAYS so; the failure mode this guards is a method that claims to run and does not.
DECLARED_ABSENT = ("NOT IMPLEMENTED", "NOT RUN")


def fail(msg: str) -> None:
    print(f"::error::{msg}")
    sys.exit(1)


def _bedblend_root() -> Path:
    """Where the installed engine lives, so the walk follows the code the pipeline imports."""
    try:
        import bedblend
    except ImportError:
        fail("bedblend is not importable; install the engine before running this gate")
    return Path(bedblend.__file__).resolve().parent


def _used_names(tree: ast.AST) -> set[str]:
    """Identifiers referenced in the module's own code, excluding the import statements themselves.

    `__all__` entries are string literals, not identifiers, so a pure re-export module yields nothing
    here. That is the whole mechanism: re-exports do not create edges.
    """
    out: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            continue
        if isinstance(node, ast.Name):
            out.add(node.id)
        elif isinstance(node, ast.Attribute):
            base = node
            while isinstance(base, ast.Attribute):
                base = base.value
            if isinstance(base, ast.Name):
                out.add(base.id)
    return out


def _edges(path: Path, pkg: Path) -> set[str]:
    """Engine module stems this file both imports from AND actually uses."""
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError) as exc:
        fail(f"cannot parse {path}: {exc}")
    used = _used_names(tree)
    out: set[str] = set()
    for node in ast.walk(tree):
        target: str | None = None
        names: list[str] = []
        if isinstance(node, ast.ImportFrom) and node.module:
            if node.level:                              # from .x import y, inside the package
                target = node.module.split(".")[0]
            elif node.module.startswith("bedblend."):   # from bedblend.x import y
                target = node.module.split(".", 1)[1].split(".")[0]
            names = [a.asname or a.name for a in node.names]
        elif isinstance(node, ast.Import):
            for a in node.names:
                if a.name.startswith("bedblend.") and (a.asname or a.name.split(".")[0]) in used:
                    out.add(a.name.split(".", 1)[1].split(".")[0])
            continue
        if target and (pkg / f"{target}.py").exists() and any(n in used for n in names):
            out.add(target)
    return out


def reachable() -> set[str]:
    """Engine modules the pipeline genuinely runs, by walking used-import edges from the entry."""
    pkg = _bedblend_root()
    if not ENTRY.exists():
        fail(f"no pipeline entry point at {ENTRY.relative_to(ROOT)}")

    seen: set[str] = set()
    frontier = _edges(ENTRY, pkg)
    while frontier:
        stem = frontier.pop()
        if stem in seen:
            continue
        seen.add(stem)
        frontier |= _edges(pkg / f"{stem}.py", pkg) - seen
    return seen


def main() -> None:
    if not DOCS.exists():
        fail(f"no method ladder at {DOCS.relative_to(ROOT)}")

    live = reachable()
    print(f"engine modules reachable from the pipeline: {len(live)}")

    checked = 0
    problems: list[str] = []
    for md in sorted(DOCS.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        m = HEADER.search(text)
        if not m:
            problems.append(f"{md.name}: no `**Family:** ...` header, so its rung cannot be checked")
            continue
        head = m.group(0)
        rung = (RUNG.search(head).group(1) if RUNG.search(head) else "").lower()
        tier = (TIER.search(head).group(1) if TIER.search(head) else "").strip().lower()
        if rung != "sota":
            continue
        if any(flag in head for flag in DECLARED_ABSENT):
            print(f"  -- {md.name}: SOTA, declared absent in this release, allowed")
            continue
        # A live-in-the-browser method is implemented in the frontend, not in the engine.
        if tier.startswith("live"):
            print(f"  -- {md.name}: SOTA, live in the browser, not an engine claim")
            continue

        mods = [r for r in MODULE_REF.findall(head) if r.startswith("bedblend/")]
        if not mods:
            problems.append(
                f"{md.name}: rated SOTA and precomputed but names no engine module, so there is "
                f"nothing to check it against. Name the module in the header."
            )
            continue
        for ref in mods:
            stem = Path(ref).stem
            if stem not in live:
                problems.append(
                    f"{md.name}: claims `{ref}` at rung SOTA, but nothing the pipeline runs calls "
                    f"into it. A method whose implementation is never invoked is a selector entry "
                    f"with no engine behind it."
                )
        checked += 1
        print(f"  OK {md.name}: {', '.join(mods)}")

    if problems:
        for p in problems:
            print(f"::error::{p}")
        fail(f"{len(problems)} method(s) on the ladder are not backed by code the pipeline runs")

    print(f"METHOD LADDER OK: {checked} SOTA methods, every one reachable from the bake.")


if __name__ == "__main__":
    main()
