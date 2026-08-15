# Noland Field: Signed APK and GitHub Release Walkthrough

This procedure publishes a **new Android companion-app release** after source changes have been approved. It does not publish automatically. Building and signing are required whenever the phone needs new native code, such as changes to GPS, camera, offline storage, screens, or installed plugins.

> The in-app update button reads the latest non-draft GitHub release whose tag begins with `mobile-v` and opens its APK attachment. The website can announce and deliver the update, but Android still requires the user to approve installation of the signed APK.

## 1. Prepare the release

| Item | Required state |
| --- | --- |
| Source changes | Reviewed, committed, and validated with `pnpm run build` from `noland-earthworks-mobile` |
| Version | Increase `noland-earthworks-mobile/package.json` from the current version to the approved release version |
| Android synchronization | Run `npx cap sync android` after the web bundle succeeds |
| Release version | Use `X.Y.Z` with a higher version than the one installed on the phone |

From the companion-app folder, run:

```bash
pnpm run build
npx cap sync android
```

## 2. Configure Android signing once

Android release builds need a private keystore. Store it **outside the repository** and keep its password private. Never commit the keystore or its passwords.

Create a keystore once on the secure build computer:

```bash
keytool -genkeypair -v \
  -keystore ~/noland-field-release.keystore \
  -alias noland-field \
  -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties` locally, without committing it:

```properties
storeFile=/absolute/path/to/noland-field-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=noland-field
keyPassword=YOUR_KEY_PASSWORD
```

Then configure the Android Gradle release signing configuration to read that local file. Keep `keystore.properties` and `*.keystore` in `.gitignore`.

## 3. Build and verify the signed APK

From `noland-earthworks-mobile/android`:

```bash
./gradlew assembleRelease
```

Rename the generated release APK to the format consumed by the update endpoint:

```bash
cp app/build/outputs/apk/release/app-release.apk \
  ../dist/noland-field-vX.Y.Z.apk
```

Verify the APK signature before distribution:

```bash
apksigner verify --verbose --print-certs \
  ../dist/noland-field-vX.Y.Z.apk
```

Install the candidate APK on one test Android device before release. Confirm that login, GPS, address lookup, service-area map, offline saving, reconnect synchronization, and the Profile update card still work.

## 4. Create the GitHub release

The production update channel expects a **non-draft, non-prerelease** release tag in this format:

```text
mobile-vX.Y.Z-buildN
```

Example release creation with GitHub CLI:

```bash
gh release create mobile-v0.4.0-build1 \
  ../dist/noland-field-v0.4.0.apk \
  --title "Noland Field v0.4.0" \
  --notes "Location workflow, supported-area map, offline request sync, and update status improvements."
```

Use a release title and notes that accurately describe the release. Do not mark the release as draft or prerelease, because the app intentionally ignores those releases.

## 5. Verify the phone update path

Open Noland Field on the phone while connected to the internet. On app launch, a newer release triggers an **update badge** on the Profile tab and an update notification. On Profile, select **Update Available** to open the signed APK download.

Android will prompt the user to allow installation from the download source if needed. After installation, reopen the app and confirm the installed version matches the release version.

## One-time replacement install for this new signing identity

This first `v0.4.0` APK uses a new personal-use signing identity. Android will not install it over the older companion app if that older app was signed with a different key.

1. On the phone, confirm that any important draft work in the existing companion app has reached Ops.
2. Uninstall the currently installed Noland Field app.
3. Open the APK download from the `mobile-v0.4.0-build1` GitHub release on the phone.
4. If Android asks, allow the browser or file manager to install unknown apps for this one installation.
5. Install the new Noland Field APK and sign in using the field PIN.
6. Verify a location lookup and a test field request. The app uses the same backend and Ops dashboard.

After this one-time replacement, future releases signed with the same `noland-field-release.jks` identity can be installed through the Profile tab’s **Install Update** action without uninstalling the app first.

## 6. If no APK is needed

Website/backend changes, service-area rules, live map data, quote routing, and other server-driven behavior can update without an APK when the installed app reads the new data from the backend. A signed APK is only required when the installed native app or its bundled web code changes.
