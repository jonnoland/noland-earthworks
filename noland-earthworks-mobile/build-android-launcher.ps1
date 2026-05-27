#Requires -Version 5.1
<#
.SYNOPSIS
    Noland Field - Android Build Launcher

.DESCRIPTION
    One-click script. Run this from ANYWHERE on your machine.
    It will:
      1. Navigate to the correct repo directory
      2. Run git pull to get the latest code
      3. Navigate into the mobile project
      4. Run the full Android build (debug APK by default)
      5. Optionally install the APK to a connected phone

    Edit the $RepoPath variable below to match where you cloned the repo.

.PARAMETER Release
    Build a release artifact instead of a debug APK.

.PARAMETER Apk
    Force APK output for release builds (default is AAB for Play Store).

.PARAMETER Install
    Install the finished APK directly to a connected Android phone via adb.

.EXAMPLE
    .\build-android-launcher.ps1
    Pull latest code and build a debug APK.

.EXAMPLE
    .\build-android-launcher.ps1 -Install
    Pull latest code, build debug APK, and install to phone.

.EXAMPLE
    .\build-android-launcher.ps1 -Release -Apk -Install
    Pull latest code, build release APK, and install to phone.
#>

[CmdletBinding()]
param(
    [switch]$Release,
    [switch]$Apk,
    [switch]$Install
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# CONFIGURE THIS: Set the path to where you cloned the repo
# ---------------------------------------------------------------------------
$RepoPath   = "E:\Noland Earthworks\Field App\noland-earthworks-mobile"
$MobilePath = Join-Path $RepoPath "noland-earthworks-mobile"
# ---------------------------------------------------------------------------

function Write-Info  { param($Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Cyan }
function Write-Ok    { param($Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Write-Step  { param($Msg) Write-Host "" ; Write-Host "--- $Msg ---" -ForegroundColor White }
function Write-Fail  {
    param($Msg)
    Write-Host ""
    Write-Host "[ERROR] $Msg" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to close..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Banner
Write-Host ""
Write-Host "  =====================================" -ForegroundColor DarkGreen
Write-Host "   Noland Field - Android Build         " -ForegroundColor DarkGreen
Write-Host "  =====================================" -ForegroundColor DarkGreen
Write-Host ""

# Step 1: Validate repo path
Write-Step "Locating repo"
Write-Info "Looking for repo at: $RepoPath"

if (-not (Test-Path $RepoPath)) {
    Write-Fail "Repo not found at: $RepoPath`n`nEdit the RepoPath variable at the top of this script to match your local path."
}

$GitDir = Join-Path $RepoPath ".git"
if (-not (Test-Path $GitDir)) {
    Write-Fail "Directory exists but is NOT a git repo: $RepoPath`n`nThe .git folder is missing. Make sure RepoPath points to the cloned repo root, not a parent folder."
}

Write-Ok "Repo found: $RepoPath"

# Step 2: Git pull
Write-Step "Pulling latest code from GitHub"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Fail "git is not installed or not on PATH. Install Git from https://git-scm.com"
}

Set-Location $RepoPath
$PullOutput = git pull 2>&1
Write-Info $PullOutput

if ($LASTEXITCODE -ne 0) {
    Write-Fail "git pull failed. Check your internet connection or repo credentials."
}
Write-Ok "Repo is up to date."

# Step 3: Confirm mobile project exists
Write-Step "Locating mobile project"

if (-not (Test-Path $MobilePath)) {
    Write-Fail "Mobile project not found at: $MobilePath"
}

$BuildScript = Join-Path $MobilePath "build-android.ps1"
if (-not (Test-Path $BuildScript)) {
    Write-Fail "build-android.ps1 not found at: $BuildScript"
}

Write-Ok "Mobile project found: $MobilePath"
Set-Location $MobilePath

# Step 4: Hand off to the main build script
Write-Step "Starting Android build"
Write-Host ""

$BuildArgs = @()
if ($Release) { $BuildArgs += "-Release" }
if ($Apk)     { $BuildArgs += "-Apk" }
if ($Install)  { $BuildArgs += "-Install" }

. $BuildScript @BuildArgs

# Done
Write-Host ""
Write-Host "Press any key to close..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
