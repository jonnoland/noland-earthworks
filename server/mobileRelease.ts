export const NOLAND_FIELD_LATEST_RELEASE = {
  version: "0.4.15",
  downloadUrl: "/manus-storage/noland-field_v0.4.15_730c0427.apk",
  releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
  notes: "Adds in-app release notes, visible signed-APK download progress, clear download status, and Android installer handoff. It also includes the v0.4.14 offline Operations pricing fallback and reconnect Sync Now control.",
  highlights: [
    "The updater now shows per-byte download progress and clear status messages for the signed Android package.",
    "When the transfer finishes, Noland Field opens the local package for Android installation with a clear saved-file fallback.",
    "The update notice opens Profile so the release notes and download state stay in one place.",
    "Offline estimates use only the last successful Operations rate sync and remain clearly labeled as cached.",
    "A reconnect Sync Now control refreshes the saved Operations pricing snapshot and its timestamp.",
  ],
  history: [
    {
      version: "0.4.15",
      title: "Updater feedback",
      notes: "Adds release notes in the update flow, measured signed-APK download progress, status messages, and Android installer handoff.",
    },
    {
      version: "0.4.14",
      title: "Offline Operations pricing",
      notes: "Adds offline Operations pricing fallback and a reconnect Sync Now control to refresh cached rates. Cached estimates remain clearly labeled and require live verification before sending.",
    },
  ],
} as const;

/**
 * The Noland Field APK is intentionally delivered by this website rather than
 * the GitHub Releases API. The repository is private, so an Android device
 * cannot use GitHub's unauthenticated release endpoint to discover updates.
 */
export function getNolandFieldRelease() {
  return NOLAND_FIELD_LATEST_RELEASE;
}
