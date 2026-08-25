export const NOLAND_FIELD_LATEST_RELEASE = {
  version: "0.4.12",
  downloadUrl: "/manus-storage/noland-field-v0.4.12_aa16c9a2.apk",
  releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
  notes: "Voice Bid microphone permission and recovery improvements.",
} as const;

/**
 * The Noland Field APK is intentionally delivered by this website rather than
 * the GitHub Releases API. The repository is private, so an Android device
 * cannot use GitHub's unauthenticated release endpoint to discover updates.
 */
export function getNolandFieldRelease() {
  return NOLAND_FIELD_LATEST_RELEASE;
}
