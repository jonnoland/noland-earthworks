#Requires -Version 5.1
<#
.SYNOPSIS
    Noland Field -- Android Build Script (Windows / PowerShell)

.DESCRIPTION
    Automates the full Android build pipeline:
      1. Dependency install (pnpm)
      2. Web asset build (Vite)
      3. Capacitor sync to Android platform
      4. Gradle build (debug APK or release AAB/APK)
      5. Optional: install directly to a connected device via adb

.PARAMETER Release
    Build a release artifact instead of a debug APK.
    Defaults to AAB (Play Store). Combine with -Apk for a release APK.

.PARAMETER Apk
    Force APK output even for release builds.

.PARAMETER Install
    Install the finished APK to a connected Android device via adb.
    Not available for AAB output.

.EXAMPLE
    .\build-android.ps1
    Debug APK -- fastest, no signing required.

.EXAMPLE
    .\build-android.ps1 -Install
    Debug APK, then install to connected phone.

.EXAMPLE
    .\build-android.ps1 -Release
    Release AAB for Play Store submission.

.EXAMPLE
    .\build-android.ps1 -Release -Apk -Install
    Release APK, then install to connected phone.

.NOTES
    Release signing -- set these environment variables before running:
        $env:KEYSTORE_PATH  = "C:\path\to\noland-field.jks"
        $env:KEYSTORE_PASS  = "your-keystore-password"
        $env:KEY_ALIAS      = "noland-field"
        $env:KEY_PASS       = "your-key-password"

    Requirements:
        - Node.js 18+  (https://nodejs.org)
        - pnpm         (npm install -g pnpm)
        - Android Studio with SDK installed
        - ANDROID_HOME or ANDROID_SDK_ROOT set, OR Android Studio at default path
#>

[CmdletBinding()]
param(
    [switch]$Release,
    [switch]$Apk,
    [switch]$Install
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -- Colour helpers -------------------------------------------------------------
function Write-Info    { param($Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Cyan }
function Write-Ok      { param($Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Write-Warn    { param($Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Write-Step    { param($Msg) Write-Host "`n-- $Msg --" -ForegroundColor White }
function Write-Fail    {
    param($Msg)
    Write-Host "[ERROR] $Msg" -ForegroundColor Red
    exit 1
}

# -- Determine build type -------------------------------------------------------
$BuildType   = if ($Release) { "release" } else { "debug" }
$BuildFormat = if ($Release -and -not $Apk) { "aab" } else { "apk" }

Write-Host ""
Write-Host "  Noland Field -- Android Build" -ForegroundColor White
Write-Host "  Build: $BuildType  |  Format: $BuildFormat" -ForegroundColor DarkGray
Write-Host ""

# -- Locate script root ---------------------------------------------------------
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$AndroidDir  = Join-Path $ScriptDir "android"
$OutputDir   = Join-Path $ScriptDir "build-output"

# -- Prerequisite checks --------------------------------------------------------
Write-Step "Checking prerequisites"

foreach ($Cmd in @("node", "pnpm", "npx")) {
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
        Write-Fail "$Cmd is not installed or not on PATH. Install Node.js from https://nodejs.org"
    }
}
Write-Info "Node.js: $(node --version)"

# Locate Android SDK
$SdkRoot = $null
if ($env:ANDROID_HOME)      { $SdkRoot = $env:ANDROID_HOME }
elseif ($env:ANDROID_SDK_ROOT) { $SdkRoot = $env:ANDROID_SDK_ROOT }
else {
    # Android Studio default install paths on Windows
    $Candidates = @(
        "$env:LOCALAPPDATA\Android\Sdk",
        "$env:USERPROFILE\AppData\Local\Android\Sdk"
    )
    foreach ($Path in $Candidates) {
        if (Test-Path $Path) { $SdkRoot = $Path; break }
    }
}

if (-not $SdkRoot -or -not (Test-Path $SdkRoot)) {
    Write-Fail "Android SDK not found. Set ANDROID_HOME or install Android Studio."
}

$env:ANDROID_HOME     = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
Write-Info "Android SDK: $SdkRoot"

# Locate Java -- try JAVA_HOME, PATH, then Android Studio bundled JDK
# Also ensure JAVA_HOME is set correctly for Gradle (Gradle reads JAVA_HOME directly)
$JavaBin = $null

# 1. Check if java is already on PATH
if (Get-Command java -ErrorAction SilentlyContinue) {
    $JavaBin = (Get-Command java).Source
    # Ensure JAVA_HOME is set so Gradle can find it
    if (-not $env:JAVA_HOME) {
        # Walk up from java.exe -> bin -> JDK root
        $env:JAVA_HOME = Split-Path (Split-Path $JavaBin -Parent) -Parent
        Write-Info "JAVA_HOME auto-set to: $env:JAVA_HOME"
    }
}

# 2. Try well-known JDK install locations if not found
if (-not $JavaBin) {
    $PF  = $env:ProgramFiles
    $LA  = $env:LOCALAPPDATA
    $JdkCandidates = @(
        # Adoptium / Eclipse Temurin (parent dir — script searches one level deeper)
        "$PF\Eclipse Adoptium",
        "$PF\Microsoft",
        "$PF\Java",
        # Android Studio bundled JBR
        "$PF\Android\Android Studio\jbr",
        "$LA\Programs\Android Studio\jbr"
    )
    foreach ($Candidate in $JdkCandidates) {
        # Expand wildcards
        $Expanded = Get-Item $Candidate -ErrorAction SilentlyContinue
        foreach ($Dir in $Expanded) {
            # Could be the JDK root or a parent containing versioned subdirs
            $JavaExe = Join-Path $Dir "bin\java.exe"
            if (-not (Test-Path $JavaExe)) {
                # Try one level deeper (e.g. Eclipse Adoptium\jdk-21.0.x)
                $SubDirs = Get-ChildItem $Dir -Directory -ErrorAction SilentlyContinue
                foreach ($Sub in $SubDirs) {
                    $JavaExe = Join-Path $Sub "bin\java.exe"
                    if (Test-Path $JavaExe) {
                        $Dir = $Sub
                        break
                    }
                    $JavaExe = $null
                }
            }
            if ($JavaExe -and (Test-Path $JavaExe)) {
                $env:JAVA_HOME = $Dir.FullName
                $env:PATH = "$($Dir.FullName)\bin;$env:PATH"
                $JavaBin = $JavaExe
                Write-Info "Java found at: $env:JAVA_HOME"
                break
            }
        }
        if ($JavaBin) { break }
    }
}

if (-not $JavaBin) {
    Write-Fail "Java not found. Install a JDK or open Android Studio once to set it up."
}

Write-Info "Java: $JavaBin"
Write-Info "JAVA_HOME: $env:JAVA_HOME"

# -- Release signing validation -------------------------------------------------
$LocalPropsPath  = Join-Path $AndroidDir "local.properties"
$SigningAppended = $false

if ($Release) {
    Write-Step "Validating release signing config"

    foreach ($Var in @("KEYSTORE_PATH","KEYSTORE_PASS","KEY_ALIAS","KEY_PASS")) {
        if (-not (Get-Item "env:$Var" -ErrorAction SilentlyContinue)) {
            Write-Fail "`$env:$Var is not set. See script header for instructions."
        }
    }

    $KeystorePath = $env:KEYSTORE_PATH
    if (-not (Test-Path $KeystorePath)) {
        Write-Fail "Keystore not found at: $KeystorePath"
    }
    Write-Ok "Keystore found: $KeystorePath"

    # Append signing config to local.properties (forward slashes required by Gradle)
    $KeystoreGradlePath = $KeystorePath -replace "\\", "/"
    $SigningBlock = @"

# Auto-generated by build-android.ps1 -- do not commit
storeFile=$KeystoreGradlePath
storePassword=$($env:KEYSTORE_PASS)
keyAlias=$($env:KEY_ALIAS)
keyPassword=$($env:KEY_PASS)
"@
    Add-Content -Path $LocalPropsPath -Value $SigningBlock
    $SigningAppended = $true
    Write-Info "Signing config written to local.properties"
}

# -- Helper: Remove signing config from local.properties ----------------------
function Remove-SigningConfig {
    param([string]$PropsFile)
    if (Test-Path $PropsFile) {
        $Lines    = Get-Content $PropsFile
        $StartIdx = ($Lines | Select-String -Pattern "# Auto-generated by build-android.ps1").LineNumber
        if ($StartIdx) {
            # LineNumber is 1-based; remove from that line through the next 4
            $Keep = $Lines[0..($StartIdx - 2)] + $Lines[($StartIdx + 3)..($Lines.Count - 1)]
            Set-Content -Path $PropsFile -Value $Keep
            Write-Info "Signing config removed from local.properties."
        }
    }
}

# -- Step 1: Install dependencies -----------------------------------------------
Write-Step "Installing Node dependencies"
Set-Location $ScriptDir
& pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { Write-Fail "pnpm install failed." }
Write-Ok "Dependencies installed."

# -- Step 2: Build web assets ---------------------------------------------------
Write-Step "Building web assets (Vite)"
& pnpm build
if ($LASTEXITCODE -ne 0) { Write-Fail "pnpm build failed." }
Write-Ok "Web assets built -> dist/"

# -- Step 3: Capacitor sync -----------------------------------------------------
Write-Step "Syncing to Android platform"
& npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Fail "Capacitor sync failed." }
Write-Ok "Capacitor sync complete."

# -- Step 4: Gradle build -------------------------------------------------------
Write-Step "Running Gradle build"
Set-Location $AndroidDir

$GradleTask = switch ("$BuildType-$BuildFormat") {
    "debug-apk"    { "assembleDebug" }
    "release-apk"  { "assembleRelease" }
    "release-aab"  { "bundleRelease" }
    default        { "assembleDebug" }
}

Write-Info "Gradle task: $GradleTask"
& .\gradlew.bat $GradleTask --no-daemon --quiet
if ($LASTEXITCODE -ne 0) {
    # Clean up signing config before exiting
    if ($SigningAppended) { Remove-SigningConfig $LocalPropsPath }
    Write-Fail "Gradle build failed. Run without --quiet for full output."
}

# -- Step 5: Copy artifact to output directory ----------------------------------
Write-Step "Copying artifact to build-output\"

$ArtifactSource = switch ("$BuildType-$BuildFormat") {
    "debug-apk"    { Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk" }
    "release-apk"  { Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk" }
    "release-aab"  { Join-Path $AndroidDir "app\build\outputs\bundle\release\app-release.aab" }
    default        { Join-Path $AndroidDir "app\build\outputs\apk\debug\app-debug.apk" }
}

if (-not (Test-Path $ArtifactSource)) {
    if ($SigningAppended) { Remove-SigningConfig $LocalPropsPath }
    Write-Fail "Expected artifact not found at: $ArtifactSource"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$Timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$OutFile    = Join-Path $OutputDir "noland-field_${BuildType}_${Timestamp}.$BuildFormat"
Copy-Item $ArtifactSource $OutFile

$SizeMB = [math]::Round((Get-Item $OutFile).Length / 1MB, 2)
Write-Ok "Build complete!"
Write-Host ""
Write-Host "  Artifact : $OutFile" -ForegroundColor White
Write-Host "  Size     : ${SizeMB} MB" -ForegroundColor White
Write-Host ""

# -- Step 6 (optional): Install to device --------------------------------------
if ($Install) {
    Write-Step "Installing to connected Android device"

    if ($BuildFormat -eq "aab") {
        Write-Warn "AAB files cannot be installed via adb. Re-run with -Release -Apk -Install."
    } else {
        $AdbPath = Join-Path $SdkRoot "platform-tools\adb.exe"
        if (-not (Test-Path $AdbPath)) {
            Write-Fail "adb not found at $AdbPath. Install Android Platform Tools via SDK Manager."
        }

        $Devices = @(& $AdbPath devices | Select-String "device$")
        if ($Devices.Count -eq 0) {
            Write-Fail "No Android device connected. Connect via USB and enable USB Debugging."
        }
        if ($Devices.Count -gt 1) {
            Write-Warn "Multiple devices connected. Installing to the first one."
        }

        & $AdbPath install -r $OutFile
        if ($LASTEXITCODE -ne 0) { Write-Fail "adb install failed." }
        Write-Ok "Installed on device."
        Write-Host ""
        Write-Host "  App ID : com.nolandearthworks.field" -ForegroundColor White
    }
}

# -- Cleanup: remove signing config ---------------------------------------------
if ($SigningAppended) {
    Remove-SigningConfig $LocalPropsPath
}

Write-Host ""
Write-Host "  All done." -ForegroundColor Green
Write-Host ""
