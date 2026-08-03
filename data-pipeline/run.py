#!/usr/bin/env python3
"""Bake the product's scenarios into the artifacts the app renders.

INVOKED BY PATH, never as a module. This repo declares no package of its own, because a product that
declares a package advertises a library nobody can install. The engine is `bedblend`, published from
its own repository and consumed pinned; everything under `data-pipeline/pipeline/` is product-specific
plumbing invoked from here.

    python data-pipeline/run.py all --output build/check
    python data-pipeline/run.py yard --output build/check

Omit --output only for an intentional canonical bake into `frontend/public/data`. A test run that
writes the committed artifacts is how a pytest run once clobbered a release, so the default is
deliberately the one that hurts if you get it wrong, and CI always passes --output.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

try:
    import bedblend  # noqa: F401
except ModuleNotFoundError:
    sys.exit(
        "bedblend is not installed.\n\n"
        "  The stockpile engine is a separate published package, not part of this repo.\n"
        "  Install the pinned version:  pip install -r requirements.txt\n"
    )

from pipeline.bake import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main())
