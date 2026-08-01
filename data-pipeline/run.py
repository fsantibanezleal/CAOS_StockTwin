#!/usr/bin/env python3
"""Run the StockTwin offline pipeline for one case, or for the whole matrix.

This is the entry point BY PATH, not a console script and not `python -m <package>`. The product
declares no package (`conventions/no-internal-packages.md`); the bed-blending physics it consumes is
the separately published `bedblend` library, and everything under this folder is product-specific
scripts.

    python data-pipeline/run.py                     # the whole case matrix, the canonical bake
    python data-pipeline/run.py G01_chevron         # one case
    python data-pipeline/run.py G01_chevron --output build/check --band-seeds 3

Omit `--output` only for an intentional canonical release bake. A run is a pure function of
(parameters, seed), so two runs of the same case produce a byte-identical trace.
"""
from __future__ import annotations

import sys
from pathlib import Path

# the pipeline is a folder, so it is put on the path here rather than installed
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    import bedblend  # noqa: F401
except ModuleNotFoundError:  # pragma: no cover - the message IS the behaviour under test
    sys.exit(
        "bedblend is not installed.\n"
        "  The pile engine is a separate published library, not part of this repository.\n"
        "  pip install -r requirements.txt\n"
        "  (for local development against a working copy: pip install -e ../CAOS_BedBlend)"
    )

from pipeline.pipeline import main  # noqa: E402

if __name__ == "__main__":
    main()
