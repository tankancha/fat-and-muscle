<#
  refresh.ps1 — one-command refresh of the Stadium Race from the spreadsheet.

  What it does:
    1. Copies your working spreadsheet into the repo (data/Fat_Muscle_Measurements.xlsx)
    2. Regenerates data.js via build_data.py
    3. Commits and pushes — Vercel then redeploys automatically

  Usage (from the repo folder):
    .\refresh.ps1                          # uses the default spreadsheet path + auto commit message
    .\refresh.ps1 -Message "Round 5 data"  # custom commit message
    .\refresh.ps1 -Xlsx "D:\some\Fat_Muscle_Measurements.xlsx"
    .\refresh.ps1 -NoPush                  # build + commit only, push manually later

  Before running: SAVE and CLOSE the spreadsheet in Excel so the copy is current.
#>
param(
  [string]$Xlsx = "C:\Users\Admin\OneDrive\Claude Cowork\03_Projects\Fat and Muscle\Fat and Muscle\Fat_Muscle_Measurements.xlsx",
  [string]$Message = "",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$repo = $PSScriptRoot

if (-not (Test-Path $Xlsx)) {
  Write-Error "Spreadsheet not found: $Xlsx`nPass -Xlsx <path> to point at your file."
  exit 1
}

# 1. Copy the spreadsheet into the repo so the build is reproducible.
New-Item -ItemType Directory -Force -Path "$repo\data" | Out-Null
Copy-Item $Xlsx "$repo\data\Fat_Muscle_Measurements.xlsx" -Force
Write-Host "Copied spreadsheet into repo." -ForegroundColor Green

# 2. Regenerate data.js.
python "$repo\build_data.py"
if ($LASTEXITCODE -ne 0) { Write-Error "build_data.py failed."; exit 1 }

# 3. Commit and push.
git -C $repo add -A
$pending = git -C $repo status --porcelain
if (-not $pending) {
  Write-Host "No changes — data.js already up to date." -ForegroundColor Yellow
  exit 0
}

if (-not $Message) { $Message = "Refresh race data from spreadsheet" }
git -C $repo commit -m $Message
if ($NoPush) {
  Write-Host "Committed. Skipping push (-NoPush). Run 'git push' when ready." -ForegroundColor Yellow
} else {
  git -C $repo push origin main
  Write-Host "Pushed. Vercel will redeploy shortly." -ForegroundColor Green
}
