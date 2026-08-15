# Noland Field Mobile App — TODO

## Implemented
- [x] PIN login with Capacitor Preferences token storage
- [x] Biometric authentication (Face ID / fingerprint)
- [x] Home dashboard with recent quotes
- [x] QuotesList with search
- [x] QuoteDetail view
- [x] NewQuote form with photo upload
- [x] Profile page with logout
- [x] GitHub Actions CI workflow for Android debug APK

## In Progress
- [x] Custom splash screen and loading animation
- [x] Pull-to-refresh on QuotesList (main data view)
- [x] Network status indicator (online/offline banner)

## Companion Workflow Alignment — Aug 2026
- [x] Display structured City, County, and ZIP details after GPS or selected-address lookup
- [x] Show normalized standard service-area status for all supported counties without blocking an internal field quote
- [x] Confirm the existing Profile update card and session update check provide an in-app update action
- [ ] Build and distribute an updated APK only when explicitly requested

## Companion Release Channel, Map & Offline Sync — Aug 2026
- [x] Configure published mobile-release metadata for the in-app update action
- [x] Add a visual map of the supported service area to the location screen
- [x] Store field requests offline and synchronize them when connectivity returns
- [ ] Build and distribute a signed update APK only when explicitly requested
