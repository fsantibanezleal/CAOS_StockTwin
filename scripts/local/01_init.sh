#!/usr/bin/env bash
# StockTwin, step 1: one-stop setup from a fresh clone. Idempotent. Bash parity of 01_init.ps1.
#
#   ./scripts/local/01_init.sh            # normal
#   FORCE=1 ./scripts/local/01_init.sh    # rebuild venvs and node_modules
#   WITH_DATA=1 ./scripts/local/01_init.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

FORCE="${FORCE:-0}"; WITH_DATA="${WITH_DATA:-0}"
if command -v python3 >/dev/null 2>&1; then PY=python3; else PY=python; fi

printf '\nStockTwin init\n\n'

v=$("$PY" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
nv=$(node --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
printf '  [1/5] Python %s, Node %s\n' "$v" "$nv"

[ "$FORCE" = "1" ] && rm -rf .venv
[ -d .venv ] || "$PY" -m venv .venv
VR=".venv/bin/python"; [ -x "$VR" ] || VR=".venv/Scripts/python.exe"
"$VR" -m pip install --upgrade pip -q
"$VR" -m pip install -q -r requirements.txt -r requirements-dev.txt
printf '  [2/5] .venv ready, engine bedblend %s\n' "$("$VR" -c 'import bedblend;print(bedblend.__version__)')"

[ "$FORCE" = "1" ] && rm -rf .venv-pipeline
[ -d .venv-pipeline ] || "$PY" -m venv .venv-pipeline
VP=".venv-pipeline/bin/python"; [ -x "$VP" ] || VP=".venv-pipeline/Scripts/python.exe"
"$VP" -m pip install --upgrade pip -q
"$VP" -m pip install -q -r requirements-precompute.txt -r requirements-dev.txt
printf '  [3/5] .venv-pipeline ready\n'

( cd frontend
  [ "$FORCE" = "1" ] && rm -rf node_modules
  if [ ! -d node_modules ]; then
    if [ -f package-lock.json ]; then npm ci; else npm install; fi
  fi )
printf '  [4/5] frontend packages installed\n'

# THERE IS NO .env AND NOTHING TO PROVISION. No backend, no database, no secret: a static site over
# committed artifacts, so a fresh clone is already runnable.
if [ "$WITH_DATA" = "1" ] || [ "$FORCE" = "1" ] || [ ! -f data/derived/index.json ]; then
  printf '  [5/5] generating the artifacts\n'
  RELEASE=1 ./scripts/local/02_generate-data.sh
else
  printf '  [5/5] %s scenarios already committed in data/derived, nothing to generate\n' "$(find data/derived -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
  printf '        (WITH_DATA=1 to regenerate them anyway)\n'
fi

printf '\n  Ready. Next:  ./scripts/local/03_dev.sh\n\n'
