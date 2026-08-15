# Noland Field Companion App Release Channel

The in-app **App Update** card checks the website’s `fieldQuote.latestVersion` endpoint. That endpoint reads the latest non-draft GitHub release whose tag starts with `mobile-v`, finds its APK attachment, and provides the download URL to the phone.

## Release Process

1. Update the companion app source and run `pnpm run build` in `noland-earthworks-mobile`.
2. Build and sign a new Android APK only when an Android release is approved.
3. Create a non-draft, non-prerelease GitHub release using a tag in this format: `mobile-vX.Y.Z-buildN`.
4. Attach the signed APK. Name it `noland-field-vX.Y.Z.apk` when possible.
5. Open Noland Field on the phone. The Profile page or session update check will find the higher version and the **Update Available** button will open the APK download.
6. Android will require the user to approve installation of the downloaded signed APK. App-code changes cannot be silently installed without this Android permission step.

## Offline Request Behavior

When the companion app has no connection, the field request is saved locally with Capacitor Preferences. Once the app reconnects, it automatically submits queued requests through the authenticated field-app API. Offline requests intentionally exclude photos because they are not uploaded until a connected session is available.
