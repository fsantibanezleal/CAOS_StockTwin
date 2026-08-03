#!/usr/bin/env bash
# Run the offline pipeline (pass-through args). E.g.:  ./scripts/precompute.sh single --output build/smoke
#
# Invoked BY PATH, not as `python -m <package>`: this product declares no package
# (conventions/no-internal-packages.md). The pile engine is the separately published `bedblend`
# library, installed into the venv; everything under data-pipeline/ is product scripts.
set -euo pipefail
cd "$(dirname "$0")/.."
VP=".venv-pipeline/bin/python"; [ -x "$VP" ] || VP=".venv-pipeline/Scripts/python.exe"
[ -x "$VP" ] || { echo "no .venv-pipeline; run ./scripts/setup.sh first" >&2; exit 1; }
"$VP" data-pipeline/run.py "$@"
