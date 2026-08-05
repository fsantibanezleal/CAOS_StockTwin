# StockTwin, step 2: create the scientific artifacts.
#
# This is the science. It builds every stockpile with the `bedblend` engine, runs the reclaim
# campaign, and writes the artifacts the app renders. It takes about half an hour for all 22
# scenarios; a single case takes seconds to a couple of minutes.
#
# THE DEFAULT IS A SANDBOX, and that is deliberate. A run that wrote the committed artifacts is how a
# release was once clobbered, so writing over them is something you have to ask for with -Release, and
# even then the install refuses a partial bake.
#
# ASCII-ONLY STRING LITERALS: PowerShell 5.1 reads a .ps1 as CP-1252 without a UTF-8 BOM.
#
#   .\scripts\local\02_generate-data.ps1                    # all, into build/local
#   .\scripts\local\02_generate-data.ps1 -Scenario yard     # one case
#   .\scripts\local\02_generate-data.ps1 -Release           # all, then install as canonical

[CmdletBinding()]
param(
    [string]$Scenario = "all",
    [switch]$Release,
    [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$vp = Join-Path ".venv-pipeline" "Scripts\python.exe"
if (-not (Test-Path $vp)) { $vp = Join-Path ".venv-pipeline" "bin/python" }
if (-not (Test-Path $vp)) {
    Write-Error "no .venv-pipeline. Run:  .\scripts\local\01_init.ps1"
}

if ($Release) {
    if ($Scenario -ne "all") {
        Write-Error "-Release bakes every scenario. Installing one case over the committed tree would leave it mixing two engine versions, which passes every per-scenario check there is."
    }
    $out = if ($OutDir) { $OutDir } else { "build/release-bake" }
    if (Test-Path $out) { Remove-Item -Recurse -Force $out }

    Write-Host ""
    Write-Host "Baking every scenario. This takes roughly half an hour." -ForegroundColor Yellow
    Write-Host ""
    & $vp data-pipeline/run.py all --output $out
    if ($LASTEXITCODE -ne 0) { Write-Error "the bake failed; the committed artifacts were not touched" }

    Write-Host ""
    Write-Host "Installing over data/derived" -ForegroundColor Yellow
    & $vp scripts/install_bake.py $out
    if ($LASTEXITCODE -ne 0) { Write-Error "the install refused this bake; the committed artifacts are untouched" }

    Write-Host ""
    Write-Host "Installed. Verify before committing:" -ForegroundColor Green
    Write-Host "  .venv\Scripts\python.exe scripts\check_artifacts.py"
}
else {
    $out = if ($OutDir) { $OutDir } else { "build/local" }
    Write-Host ""
    Write-Host ("Sandboxed bake of '{0}' into {1}. Nothing tracked is written." -f $Scenario, $out) -ForegroundColor Cyan
    Write-Host ""
    & $vp data-pipeline/run.py $Scenario --output $out
    if ($LASTEXITCODE -ne 0) { Write-Error "the bake failed" }
    Write-Host ""
    Write-Host ("Done. To make a bake canonical instead: {0} -Release" -f "02_generate-data.ps1") -ForegroundColor Green
}
Write-Host ""
