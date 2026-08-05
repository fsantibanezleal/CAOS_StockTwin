# StockTwin, step 1: one-stop setup from a fresh clone.
#
# Idempotent. Everything it does is "already done?" first, so re-running costs seconds. Use -Force to
# rebuild the virtual environments and regenerate the artifacts from scratch.
#
# ASCII-ONLY STRING LITERALS: PowerShell 5.1 reads a .ps1 as CP-1252 without a UTF-8 BOM.
#
#   .\scripts\local\01_init.ps1
#   .\scripts\local\01_init.ps1 -Force

[CmdletBinding()]
param(
    [switch]$Force,
    # The committed artifacts are the ones the deployed site serves, so a fresh clone does NOT need to
    # bake anything to run the app. Pass -WithData to regenerate them anyway.
    [switch]$WithData
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$PythonMin = [version]"3.12"
$NodeMin = [version]"22.0"

# RUNNING A NATIVE EXECUTABLE, SAFELY. Windows PowerShell 5.1 turns every line a native program writes
# to stderr into an ErrorRecord, and with $ErrorActionPreference = "Stop" that ABORTS the script. A
# single harmless `pip` warning about a leftover distribution was enough to kill this script halfway
# through, which is not a failure mode a setup script may have. So native calls run with the
# preference relaxed and are judged on their EXIT CODE, which is the only thing that actually means
# failure.
function Invoke-Native {
    param([Parameter(Mandatory)][string]$Exe, [string[]]$Arguments = @(), [string]$What = "")
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $Exe @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $prev }
    if ($code -ne 0) {
        $label = if ($What) { $What } else { "$Exe $($Arguments -join ' ')" }
        throw "$label failed with exit code $code"
    }
}

function Get-VenvPy($dir) {
    $p = Join-Path $dir "Scripts\python.exe"
    if (Test-Path $p) { return $p }
    $p = Join-Path $dir "bin/python"
    if (Test-Path $p) { return $p }
    return $null
}

function Get-Ver($exe, $arg) {
    try {
        $raw = & $exe $arg 2>&1 | Out-String
        $m = [regex]::Match($raw, "(\d+)\.(\d+)")
        if ($m.Success) { return [version]("{0}.{1}" -f $m.Groups[1].Value, $m.Groups[2].Value) }
    } catch { }
    return $null
}

Write-Host ""
Write-Host "StockTwin init" -ForegroundColor Cyan
Write-Host ""

# --- 1. the prerequisites this script assumes -----------------------------------------------------
$pyVer = Get-Ver "python" "--version"
if (-not $pyVer -or $pyVer -lt $PythonMin) {
    Write-Error "Python $PythonMin or newer is required. Run:  .\scripts\local\00_install-prereqs.ps1"
}
$nodeVer = Get-Ver "node" "--version"
if (-not $nodeVer -or $nodeVer -lt $NodeMin) {
    Write-Error "Node $NodeMin or newer is required. Run:  .\scripts\local\00_install-prereqs.ps1"
}
Write-Host ("  [1/5] Python {0}, Node {1}" -f $pyVer, $nodeVer) -ForegroundColor Green

# --- 2. the runtime venv, which is what ships -----------------------------------------------------
if ($Force -and (Test-Path ".venv")) { Remove-Item -Recurse -Force ".venv" }
if (-not (Test-Path ".venv")) { Invoke-Native "python" @("-m","venv",".venv") -What "creating .venv" }
$vr = Get-VenvPy ".venv"
Invoke-Native $vr @("-m","pip","install","--upgrade","pip","-q") -What "upgrading pip in .venv"
Invoke-Native $vr @("-m","pip","install","-q","-r","requirements.txt","-r","requirements-dev.txt") -What "installing the runtime lane"
$engine = (& $vr -c "import bedblend; print(bedblend.__version__)").Trim()
Write-Host ("  [2/5] .venv ready, engine bedblend {0}" -f $engine) -ForegroundColor Green

# --- 3. the offline venv, for the bake ------------------------------------------------------------
# Kept separate because the offline lane may carry heavy dependencies the shipped runtime must not.
if ($Force -and (Test-Path ".venv-pipeline")) { Remove-Item -Recurse -Force ".venv-pipeline" }
if (-not (Test-Path ".venv-pipeline")) { Invoke-Native "python" @("-m","venv",".venv-pipeline") -What "creating .venv-pipeline" }
$vp = Get-VenvPy ".venv-pipeline"
Invoke-Native $vp @("-m","pip","install","--upgrade","pip","-q") -What "upgrading pip in .venv-pipeline"
Invoke-Native $vp @("-m","pip","install","-q","-r","requirements-precompute.txt","-r","requirements-dev.txt") -What "installing the offline lane"
Write-Host "  [3/5] .venv-pipeline ready" -ForegroundColor Green

# --- 4. the frontend ------------------------------------------------------------------------------
Push-Location frontend
try {
    if ($Force -and (Test-Path "node_modules")) { Remove-Item -Recurse -Force "node_modules" }
    if (-not (Test-Path "node_modules")) {
        if (Test-Path "package-lock.json") { Invoke-Native "npm" @("ci") -What "npm ci" }
        else { Invoke-Native "npm" @("install") -What "npm install" }
    }
} finally { Pop-Location }
Write-Host "  [4/5] frontend packages installed" -ForegroundColor Green

# --- 5. the data ----------------------------------------------------------------------------------
# THERE IS NO .env AND NOTHING TO PROVISION. This product has no backend, no database and no secret:
# it is a static site over committed artifacts, so a fresh clone is already runnable. That is worth
# stating rather than leaving a reader to wonder which env file they forgot.
$derived = Join-Path "data" "derived"
$haveData = (Test-Path (Join-Path $derived "index.json"))
if ($WithData -or $Force -or -not $haveData) {
    Write-Host "  [5/5] generating the artifacts" -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot "02_generate-data.ps1") -Release
}
else {
    $n = (Get-ChildItem $derived -Directory).Count
    Write-Host ("  [5/5] {0} scenarios already committed in data/derived, nothing to generate" -f $n) -ForegroundColor Green
    Write-Host "        (pass -WithData to regenerate them anyway)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Ready. Next:  .\scripts\local\03_dev.ps1" -ForegroundColor Green
Write-Host ""
