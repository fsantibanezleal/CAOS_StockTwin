#!/usr/bin/env bash
# StockTwin, step 0: system-level prerequisites.
#
# The bash parity of 00_install-prereqs.ps1. On Linux and macOS there is no single package manager to
# assume, so this CHECKS and tells you what to install rather than installing it for you. That is the
# honest behaviour: a script that guesses your package manager and is wrong is worse than one that
# says what is missing.
set -euo pipefail

PY_MIN_MAJOR=3; PY_MIN_MINOR=12
NODE_MIN=22

ok=1
say() { printf '  %s\n' "$1"; }

ver() { "$@" 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1; }

printf '\nStockTwin prerequisites\n\n'

if command -v python3 >/dev/null 2>&1; then PY=python3; elif command -v python >/dev/null 2>&1; then PY=python; else PY=""; fi
if [ -n "$PY" ]; then
  v=$(ver "$PY" --version); maj=${v%%.*}; min=${v##*.}
  if [ "$maj" -gt "$PY_MIN_MAJOR" ] || { [ "$maj" -eq "$PY_MIN_MAJOR" ] && [ "$min" -ge "$PY_MIN_MINOR" ]; }; then
    say "Python $v, at or above the ${PY_MIN_MAJOR}.${PY_MIN_MINOR} CI pin"
  else
    say "Python $v is below the ${PY_MIN_MAJOR}.${PY_MIN_MINOR} CI pin"; ok=0
  fi
else
  say "Python not found"; ok=0
fi

if command -v node >/dev/null 2>&1; then
  v=$(ver node --version); maj=${v%%.*}
  if [ "$maj" -ge "$NODE_MIN" ]; then say "Node $v, at or above the ${NODE_MIN} CI pin"
  else say "Node $v is below the ${NODE_MIN} CI pin"; ok=0; fi
else
  say "Node not found"; ok=0
fi

command -v git >/dev/null 2>&1 && say "git present" || { say "git not found"; ok=0; }

printf '\n'
if [ "$ok" -eq 1 ]; then
  printf '  All prerequisites present.\n  Next:  ./scripts/local/01_init.sh\n\n'
else
  printf '  Install what is missing, then re-run. Suggestions:\n'
  printf '    Debian/Ubuntu:  sudo apt install python3 python3-venv nodejs npm git\n'
  printf '    macOS:          brew install python@3.13 node git\n\n'
  exit 1
fi

printf '  NOT checked, and deliberately: conda. The DEM calibration lane needs PyChrono, which is\n'
printf '  published only on conda-forge, and nothing in the main build depends on it.\n'
printf '  See docs/guides/03_dem-lane.md if you need that lane.\n\n'
