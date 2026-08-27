export const NOLAND_FIELD_LATEST_RELEASE = {
  version: "0.4.13",
  downloadUrl: "/manus-storage/noland-field-v0.4.13-replacement_ea279acc.apk",
  releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
  notes: "Replacement-signed test release with Linear Foot quote calculation, acreage conversion, clearing-width quick-select, AI Suggest alignment, and site-verification warnings. Uninstall the prior Noland Field app before installing this replacement build.",
} as const;

/**
 * The Noland Field APK is intentionally delivered by this website rather than
 * the GitHub Releases API. The repository is private, so an Android device
 * cannot use GitHub's unauthenticated release endpoint to discover updates.
 */
export function getNolandFieldRelease() {
  return NOLAND_FIELD_LATEST_RELEASE;
}
