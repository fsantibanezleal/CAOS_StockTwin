# StockTwin, step 3: run the app locally.
#
# Starts the Vite dev server over the committed artifacts. There is no backend to start: this product
# is a static site, so what you see locally is what the deployed site serves.
#
# ASCII-ONLY STRING LITERALS: PowerShell 5.1 reads a .ps1 as CP-1252 without a UTF-8 BOM.
#
#   .\scripts\local\03_dev.ps1
#   .\scripts\local\03_dev.ps1 -Port 5180
#   .\scripts\local\03_dev.ps1 -Preview      # build, then serve the built site

[CmdletBinding()]
param(
    [int]$Port = 5173,
    [switch]$Preview
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

if (-not (Test-Path "frontend/node_modules")) {
    Write-Error "frontend packages are not installed. Run:  .\scripts\local\01_init.ps1"
}
if (-not (Test-Path "data/derived/index.json")) {
    Write-Error "there are no artifacts in data/derived. Run:  .\scripts\local\02_generate-data.ps1 -Release"
}

# The artifacts live in data/derived and the SPA fetches them from public/data, which is a build-time
# overlay and is gitignored. `copy-data.mjs` COPIES; it never runs science and never writes back into
# data/derived, and keeping those apart is what stops a web build from changing the evidence.
Push-Location frontend
try {
    node copy-data.mjs

    if ($Preview) {
        Write-Host ""
        Write-Host "Building, then serving the built site." -ForegroundColor Cyan
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Error "the build failed" }
        Write-Host ""
        Write-Host ("  http://localhost:{0}" -f $Port) -ForegroundColor Green
        Write-Host ""
        npx vite preview --port $Port --strictPort
    }
    else {
        Write-Host ""
        Write-Host ("  http://localhost:{0}" -f $Port) -ForegroundColor Green
        Write-Host "  Ctrl+C to stop." -ForegroundColor DarkGray
        Write-Host ""
        npx vite --port $Port --strictPort
    }
}
finally { Pop-Location }
