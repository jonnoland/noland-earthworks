#!/usr/bin/env bash
# =============================================================================
# build-android.sh — Noland Field Android Build Script
#
# Automates the full build pipeline:
#   1. Dependency install
#   2. Web asset build (Vite)
#   3. Capacitor sync to Android platform
#   4. Gradle build (debug APK or release AAB/APK)
#   5. Optional: install directly to a connected device
#
# Usage:
#   ./build-android.sh                  # debug APK (default)
#   ./build-android.sh --release        # release AAB (for Play Store)
#   ./build-android.sh --apk            # release APK (for direct install)
#   ./build-android.sh --install        # debug APK + install to connected device
#   ./build-android.sh --release --install  # release APK + install
#
# Requirements:
#   - Node.js 18+, pnpm
#   - Android Studio with SDK installed
#   - ANDROID_HOME or ANDROID_SDK_ROOT set in your environment
#   - For release builds: keystore file + signing env vars (see below)
#
# Release signing env vars (set before running --release):
#   KEYSTORE_PATH     Absolute path to your .jks / .keystore file
#   KEYSTORE_PASS     Keystore password
#   KEY_ALIAS         Key alias inside the keystore
#   KEY_PASS          Key password
# =============================================================================

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}── $* ──${RESET}"; }

# ── Argument parsing ──────────────────────────────────────────────────────────
BUILD_TYPE="debug"
BUILD_FORMAT="apk"
INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --release)  BUILD_TYPE="release" ;;
    --apk)      BUILD_FORMAT="apk" ;;
    --install)  INSTALL=true ;;
    --help|-h)
      echo "Usage: $0 [--release] [--apk] [--install]"
      echo ""
      echo "  (no flags)        Debug APK"
      echo "  --release         Release AAB (Play Store)"
      echo "  --release --apk   Release APK (direct install)"
      echo "  --install         Install to connected device after build"
      exit 0
      ;;
    *) warn "Unknown argument: $arg (ignored)" ;;
  esac
done

# Release builds default to AAB unless --apk is also passed
if [[ "$BUILD_TYPE" == "release" && "$BUILD_FORMAT" != "apk" ]]; then
  BUILD_FORMAT="aab"
fi

# ── Script location ───────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
OUTPUT_DIR="$SCRIPT_DIR/build-output"

# ── Prerequisite checks ───────────────────────────────────────────────────────
step "Checking prerequisites"

command -v node  >/dev/null 2>&1 || error "Node.js is not installed. Install from https://nodejs.org"
command -v pnpm  >/dev/null 2>&1 || error "pnpm is not installed. Run: npm install -g pnpm"
command -v npx   >/dev/null 2>&1 || error "npx not found. Reinstall Node.js."

# Locate Android SDK
if [[ -n "${ANDROID_HOME:-}" ]]; then
  SDK_ROOT="$ANDROID_HOME"
elif [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
  SDK_ROOT="$ANDROID_SDK_ROOT"
elif [[ -d "$HOME/Library/Android/sdk" ]]; then
  SDK_ROOT="$HOME/Library/Android/sdk"
elif [[ -d "$HOME/Android/Sdk" ]]; then
  SDK_ROOT="$HOME/Android/Sdk"
else
  error "Android SDK not found. Set ANDROID_HOME or install Android Studio."
fi

export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
info "Android SDK: $SDK_ROOT"

# Locate Java (required by Gradle)
if ! command -v java >/dev/null 2>&1; then
  # Android Studio bundles a JDK — try to find it
  if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    export PATH="$JAVA_HOME/bin:$PATH"
    info "Using Android Studio bundled JDK: $JAVA_HOME"
  else
    error "Java not found. Install a JDK or open Android Studio once to set it up."
  fi
fi

NODE_VER=$(node --version)
info "Node.js: $NODE_VER"
info "Build type: ${BUILD_TYPE} / Format: ${BUILD_FORMAT}"
[[ "$INSTALL" == true ]] && info "Will install to connected device after build."

# ── Release signing validation ────────────────────────────────────────────────
if [[ "$BUILD_TYPE" == "release" ]]; then
  step "Validating release signing config"

  : "${KEYSTORE_PATH:?Set KEYSTORE_PATH to your .jks file path}"
  : "${KEYSTORE_PASS:?Set KEYSTORE_PASS to your keystore password}"
  : "${KEY_ALIAS:?Set KEY_ALIAS to your key alias}"
  : "${KEY_PASS:?Set KEY_PASS to your key password}"

  [[ -f "$KEYSTORE_PATH" ]] || error "Keystore not found at: $KEYSTORE_PATH"
  success "Keystore found: $KEYSTORE_PATH"

  # Write a temporary signing config into local.properties so Gradle picks it up
  PROPS_FILE="$ANDROID_DIR/local.properties"
  cat >> "$PROPS_FILE" <<EOF

# Auto-generated by build-android.sh — do not commit
storeFile=$KEYSTORE_PATH
storePassword=$KEYSTORE_PASS
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASS
EOF
  info "Signing config written to local.properties"
fi

# ── Step 1: Install dependencies ──────────────────────────────────────────────
step "Installing Node dependencies"
cd "$SCRIPT_DIR"
pnpm install --frozen-lockfile
success "Dependencies installed."

# ── Step 2: Build web assets ──────────────────────────────────────────────────
step "Building web assets (Vite)"
pnpm build
success "Web assets built → dist/"

# ── Step 3: Capacitor sync ────────────────────────────────────────────────────
step "Syncing to Android platform"
npx cap sync android
success "Capacitor sync complete."

# ── Step 4: Gradle build ──────────────────────────────────────────────────────
step "Running Gradle build"
cd "$ANDROID_DIR"

# Make gradlew executable (sometimes lost on Windows → Unix copy)
chmod +x gradlew

if [[ "$BUILD_TYPE" == "debug" ]]; then
  ./gradlew assembleDebug --no-daemon --quiet
  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
  ARTIFACT="$APK_PATH"

elif [[ "$BUILD_TYPE" == "release" && "$BUILD_FORMAT" == "apk" ]]; then
  ./gradlew assembleRelease --no-daemon --quiet
  APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
  ARTIFACT="$APK_PATH"

elif [[ "$BUILD_TYPE" == "release" && "$BUILD_FORMAT" == "aab" ]]; then
  ./gradlew bundleRelease --no-daemon --quiet
  AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
  ARTIFACT="$AAB_PATH"
fi

# ── Step 5: Copy artifact to output directory ─────────────────────────────────
step "Copying artifact to build-output/"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="noland-field_${BUILD_TYPE}_${TIMESTAMP}.${BUILD_FORMAT}"
cp "$ARTIFACT" "$OUTPUT_DIR/$FILENAME"

success "Build complete!"
echo ""
echo -e "  Artifact: ${BOLD}$OUTPUT_DIR/$FILENAME${RESET}"
echo -e "  Size:     $(du -sh "$OUTPUT_DIR/$FILENAME" | cut -f1)"
echo ""

# ── Step 6 (optional): Install to device ─────────────────────────────────────
if [[ "$INSTALL" == true ]]; then
  step "Installing to connected Android device"

  ADB="$SDK_ROOT/platform-tools/adb"
  [[ -x "$ADB" ]] || error "adb not found at $ADB. Install Android Platform Tools."

  DEVICES=$("$ADB" devices | grep -v "List of devices" | grep "device$" | wc -l | tr -d ' ')
  if [[ "$DEVICES" -eq 0 ]]; then
    error "No Android device connected. Connect your phone via USB and enable USB Debugging."
  elif [[ "$DEVICES" -gt 1 ]]; then
    warn "Multiple devices connected. Installing to the first one."
  fi

  if [[ "$BUILD_FORMAT" == "aab" ]]; then
    warn "AAB files cannot be installed directly via adb. Use bundletool or upload to Play Store."
    warn "To install a release build on a device, re-run with: --release --apk --install"
  else
    "$ADB" install -r "$OUTPUT_DIR/$FILENAME"
    success "Installed on device."
    echo ""
    echo -e "  App ID:  ${BOLD}com.nolandearthworks.field${RESET}"
    echo -e "  Launch:  ${BOLD}$ADB shell monkey -p com.nolandearthworks.field -c android.intent.category.LAUNCHER 1${RESET}"
  fi
fi

# ── Cleanup: remove signing config from local.properties ─────────────────────
if [[ "$BUILD_TYPE" == "release" ]]; then
  # Remove the 5 lines we appended (comment + 4 signing keys)
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' -e '/# Auto-generated by build-android.sh/,+4d' "$ANDROID_DIR/local.properties"
  else
    sed -i '/# Auto-generated by build-android.sh/,+4d' "$ANDROID_DIR/local.properties"
  fi
  info "Signing config removed from local.properties."
fi

echo ""
echo -e "${GREEN}${BOLD}All done.${RESET}"
