# Public Release Notes URL Check

- Checked: 2026-08-28
- URL: https://nolandearthworks.com/field-release-notes
- Result: The current deployed site returns the application 404 page rather than release notes.
- Required follow-up: Add a public v0.4.14 Noland Field release-notes route and keep the mobile updater link pointed to it.

## Verification

The route was added to the server SPA allowlist and visually verified in the development preview. It now renders the v0.4.14 summary, release highlights, Android installation instructions, and the website-hosted signed APK download instead of a 404 page.
