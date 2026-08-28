export const NOLAND_FIELD_LATEST_RELEASE = {
  version: "0.4.14",
  downloadUrl: "/manus-storage/noland-field_v0.4.14_59232714.apk",
  releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
  notes: "Adds offline Operations pricing fallback and a reconnect Sync Now control to refresh cached rates. Cached estimates remain clearly labeled and require live verification before sending.",
} as const;

/**
 * The Noland Field APK is intentionally delivered by this website rather than
 * the GitHub Releases API. The repository is private, so an Android device
 * cannot use GitHub's unauthenticated release endpoint to discover updates.
 */
export function getNolandFieldRelease() {
  return NOLAND_FIELD_LATEST_RELEASE;
}
