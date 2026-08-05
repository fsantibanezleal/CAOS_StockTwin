#!/usr/bin/env bash
# StockTwin, step 2: create the scientific artifacts. Bash parity of 02_generate-data.ps1.
#
# THE DEFAULT IS A SANDBOX. Writing over the committed artifacts is something you ask for.
#
#   ./scripts/local/02_generate-data.sh                  # all, into build/local
#   SCENARIO=yard ./scripts/local/02_generate-data.sh    # one case
#   RELEASE=1 ./scripts/local/02_generate-data.sh        # all, then install as canonical
set -euo pipefail
cd "$(dirname "$0")/../.."

SCENARIO="${SCENARIO:-all}"; RELEASE="${RELEASE:-0}"
VP=".venv-pipeline/bin/python"; [ -x "$VP" ] || VP=".venv-pipeline/Scripts/python.exe"
[ -x "$VP" ] || { echo "no .venv-pipeline. Run: ./scripts/local/01_init.sh" >&2; exit 1; }

if [ "$RELEASE" = "1" ]; then
  if [ "$SCENARIO" != "all" ]; then
    echo "RELEASE=1 bakes every scenario. Installing one case over the committed tree would leave it" >&2
    echo "mixing two engine versions, which passes every per-scenario check there is." >&2
    exit 1
  fi
  OUT="${OUT_DIR:-build/release-bake}"; rm -rf "$OUT"
  printf '\nBaking every scenario. This takes roughly half an hour.\n\n'
  "$VP" data-pipeline/run.py all --output "$OUT"
  printf '\nInstalling over data/derived\n'
  "$VP" scripts/install_bake.py "$OUT"
  printf '\nInstalled. Verify before committing:\n  .venv/bin/python scripts/check_artifacts.py\n\n'
else
  OUT="${OUT_DIR:-build/local}"
  printf '\nSandboxed bake of %s into %s. Nothing tracked is written.\n\n' "$SCENARIO" "$OUT"
  "$VP" data-pipeline/run.py "$SCENARIO" --output "$OUT"
  printf '\nDone. To make a bake canonical instead: RELEASE=1 ./scripts/local/02_generate-data.sh\n\n'
fi
