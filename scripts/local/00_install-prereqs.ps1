# StockTwin, step 0: system-level prerequisites.
#
# Installs what a bare Windows machine is missing, via winget, and nothing else. Idempotent: every
# check is "is it already here and new enough", so re-running is free.
#
# ASCII-ONLY STRING LITERALS. PowerShell 5.1 reads a .ps1 as CP-1252 unless the file carries a UTF-8
# BOM, so an em-dash or an arrow inside a string can silently terminate it.
#
#   .\scripts\local\00_install-prereqs.ps1

[CmdletBinding()]
param(
    # CHECKING IS THE DEFAULT AND INSTALLING IS OPT-IN. A first version of this script had a bug that
    # made it report an installed Python 3.13 as missing and reinstall it through winget. Nothing was
    # damaged, but a setup script that silently replaces working system software is not a setup
    # script, it is a hazard. It now reports what is missing and stops; pass -Install to let it act.
    [switch]$Install
)

$ErrorActionPreference = "Stop"

# CI pins these, so local should match rather than drift ahead of what is actually tested.
$PythonMin = [version]"3.12"
$NodeMin = [version]"22.0"

function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# NOT named $args. `$args` is a PowerShell automatic variable holding a function's unbound arguments,
# so a parameter of that name never binds: the call ran the interpreter with NO arguments, parsed
# nothing, and reported an installed Python 3.13 as "not found", then reinstalled it through winget.
# Caught by running the script rather than by reading it.
function Get-Ver($exe, $verArg) {
    try {
        $raw = & $exe $verArg 2>&1 | Out-String
        $m = [regex]::Match($raw, "(\d+)\.(\d+)(\.(\d+))?")
        if ($m.Success) { return [version]("{0}.{1}" -f $m.Groups[1].Value, $m.Groups[2].Value) }
    } catch { }
    return $null
}

$missing = $false

if ($Install -and -not (Test-Cmd "winget")) {
    Write-Error "winget is not available. Install App Installer from the Microsoft Store, then re-run."
}

Write-Host ""
Write-Host "StockTwin prerequisites" -ForegroundColor Cyan
Write-Host ""

# --- Python -------------------------------------------------------------------------------------
# `py`, the Windows launcher, is checked first: a bare `python` on Windows can resolve to the Store
# app-execution-alias stub, which exits without printing a version and looks exactly like an absence.
$pyVer = $null
if (Test-Cmd "py") { $pyVer = Get-Ver "py" "--version" }
if (-not $pyVer -and (Test-Cmd "python")) { $pyVer = Get-Ver "python" "--version" }
if ($pyVer -and $pyVer -ge $PythonMin) {
    Write-Host ("  Python {0}, at or above the {1} CI pin" -f $pyVer, $PythonMin) -ForegroundColor Green
}
else {
    if ($pyVer) { Write-Host ("  Python {0} is below the {1} CI pin" -f $pyVer, $PythonMin) -ForegroundColor Yellow }
    else { Write-Host "  Python not found" -ForegroundColor Yellow }
    if (-not $Install) {
        Write-Host "        install it, or re-run this script with -Install to let winget do it" -ForegroundColor DarkGray
        $script:missing = $true
    }
    else {
        winget install --id Python.Python.3.13 -e --source winget --accept-package-agreements --accept-source-agreements
        Write-Host "  Python installed. OPEN A NEW TERMINAL and re-run so PATH refreshes." -ForegroundColor Yellow
        exit 0
    }
}

# --- Node ---------------------------------------------------------------------------------------
$nodeVer = $null
if (Test-Cmd "node") { $nodeVer = Get-Ver "node" "--version" }
if ($nodeVer -and $nodeVer -ge $NodeMin) {
    Write-Host ("  Node {0}, at or above the {1} CI pin" -f $nodeVer, $NodeMin) -ForegroundColor Green
}
else {
    if ($nodeVer) { Write-Host ("  Node {0} is below the {1} CI pin" -f $nodeVer, $NodeMin) -ForegroundColor Yellow }
    else { Write-Host "  Node not found" -ForegroundColor Yellow }
    if (-not $Install) {
        Write-Host "        install it, or re-run this script with -Install to let winget do it" -ForegroundColor DarkGray
        $script:missing = $true
    }
    else {
        winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
        Write-Host "  Node installed. OPEN A NEW TERMINAL and re-run so PATH refreshes." -ForegroundColor Yellow
        exit 0
    }
}

# --- git, for provenance rather than for the build ------------------------------------------------
if (Test-Cmd "git") {
    Write-Host "  git present" -ForegroundColor Green
}
else {
    Write-Host "  git not found" -ForegroundColor Yellow
    if (-not $Install) {
        Write-Host "        install it, or re-run this script with -Install to let winget do it" -ForegroundColor DarkGray
        $script:missing = $true
    }
    else {
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    }
}

Write-Host ""
if ($missing) {
    Write-Host "  Something is missing. Nothing was installed." -ForegroundColor Yellow
    Write-Host "  Re-run with -Install to let winget install it:" -ForegroundColor Yellow
    Write-Host "    .\scripts\local\00_install-prereqs.ps1 -Install"
    Write-Host ""
    exit 1
}
Write-Host "  All prerequisites present. Nothing installed." -ForegroundColor Green
Write-Host "  Next:  .\scripts\local\01_init.ps1"
Write-Host ""
Write-Host "  NOT installed here, and deliberately: conda. The DEM calibration lane needs PyChrono," -ForegroundColor DarkGray
Write-Host "  which is published only on conda-forge, and nothing in the main build depends on it." -ForegroundColor DarkGray
Write-Host "  See docs/guides/03_dem-lane.md if you need that lane." -ForegroundColor DarkGray
Write-Host ""
