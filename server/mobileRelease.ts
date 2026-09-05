export const NOLAND_FIELD_LATEST_RELEASE = {
  version: "0.4.20",
  downloadUrl: "/manus-storage/Noland-Field-v0.4.20_4b36ee5f.apk",
  releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
  notes: "Noland Field v0.4.20: Save GPX & Open onX now writes the property waypoint to Documents/Noland Field/onx-site-walk before launching onX Offroad. Import remains a required onX My Content step because onX does not provide an automated import interface.",
  highlights: [
    "Detect My Location requests device location, identifies the current Tennessee county, and selects it when it is in the configured service area.",
    "Select any of the standard service-area counties directly in a quote before looking up a Parcel ID.",
    "Work-Area Acreage now stays separate from deeded acreage and updates the estimate from current Operations rates.",
    "Share the selected property waypoint to onX Offroad, walk the job boundary, and enter the measured work area in the quote.",
    "The updater now shows per-byte download progress and clear status messages for the signed Android package.",
    "When the transfer finishes, Noland Field opens the local package for Android installation with a clear saved-file fallback.",
    "The update notice opens Profile so the release notes and download state stay in one place.",
    "Offline estimates use only the last successful Operations rate sync and remain clearly labeled as cached.",
    "A reconnect Sync Now control refreshes the saved Operations pricing snapshot and its timestamp.",
  ],
  history: [
    {
      version: "0.4.20",
      title: "Noland Field update",
      notes: "Noland Field v0.4.20: Save GPX & Open onX now writes the property waypoint to Documents/Noland Field/onx-site-walk before launching onX Offroad. Import remains a required onX My Content step because onX does not provide an automated import interface.",
    },
    {
      version: "0.4.19",
      title: "Noland Field update",
      notes: "Noland Field v0.4.19: Fixes Detect My Location by declaring Android fine and coarse GPS permissions. Includes the current onX handoff, county detection, work-area acreage, and quote workflow updates.",
    },
    {
      version: "0.4.19",
      title: "Noland Field update",
      notes: "Fixes Detect My Location by declaring Android fine and coarse GPS permissions. Includes the current onX handoff, county detection, work-area acreage, and quote workflow updates.",
    },
    {
      version: "0.4.18",
      title: "Noland Field update",
      notes: "Adds direct onX Offroad detection and launch. Noland Field now opens the installed onX app when available, while retaining the GPX share and onX My Content import workflow.",
    },
    {
      version: "0.4.17",
      title: "GPS county detection",
      notes: "Adds a Detect My Location control beside the service-area county selector. It uses device GPS and reverse geocoding to select the current served county, with clear permission and out-of-area feedback.",
    },
    {
      version: "0.4.16",
      title: "Field measurement and county selection",
      notes: "Adds a service-area county dropdown for Parcel ID lookup, the dedicated Work-Area Acreage estimate preview, and onX Offroad property-waypoint handoff.",
    },
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
