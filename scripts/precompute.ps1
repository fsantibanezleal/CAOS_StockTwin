# Run the offline pipeline (pass-through args). E.g.:  ./scripts/precompute.ps1 single --output build/smoke
#
# Invoked BY PATH, not as `python -m <package>`: this product declares no package
# (conventions/no-internal-packages.md). The pile engine is the separately published `bedblend`
# library, installed into the venv; everything under data-pipeline/ is product scripts.
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
$vp = Join-Path ".venv-pipeline" "Scripts\python.exe"
if (-not (Test-Path $vp)) { $vp = Join-Path ".venv-pipeline" "bin/python" }
if (-not (Test-Path $vp)) { Write-Error "no .venv-pipeline; run ./scripts/setup.ps1 first" }
& $vp data-pipeline/run.py @args
