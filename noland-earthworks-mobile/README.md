# Noland Field — Mobile Companion App

A Capacitor-based mobile app for Noland Earthworks, LLC. Built for iOS and Android. Lets Jon capture GPS coordinates, photos, and site conditions in the field, then submit a structured quote directly to the ops dashboard at nolandearthworks.com.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + Tailwind CSS 4 |
| Routing | React Router v7 |
| API | tRPC 11 + TanStack Query 5 |
| Native | Capacitor 8 (Camera, Geolocation, Network, Preferences) |
| Build | Vite 8 + TypeScript 6 |

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Xcode 15+ (for iOS builds)
- Android Studio Ladybug+ (for Android builds)
- A Mac is required for iOS builds

---

## Local Development (Browser)

```bash
# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

The app runs at `http://localhost:5173`. In the browser, native Capacitor plugins (Camera, Geolocation) fall back to browser APIs — camera uses `<input type="file">` and geolocation uses the browser's `navigator.geolocation`.

### API Connection

The app connects to the Noland Earthworks backend at `https://nolandearth-pymczdcn.manus.space`. This is configured in `src/lib/trpc.ts`. For local backend development, change the `BASE_URL` to `http://localhost:3000`.

---

## Building for iOS

```bash
# 1. Build the web assets
pnpm build

# 2. Sync to the iOS project
npx cap sync ios

# 3. Open in Xcode
npx cap open ios
```

In Xcode:
- Set the Bundle Identifier to `com.nolandearthworks.field`
- Set the Development Team to your Apple Developer account
- Select a real device or simulator and press Run

### Required iOS Permissions (already in `ios/App/App/Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>Noland Field uses your camera to capture site photos for field quotes.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Noland Field accesses your photo library to attach site photos to field quotes.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Noland Field uses your location to auto-fill the site address on field quotes.</string>
```

---

## Building for Android

```bash
# 1. Build the web assets
pnpm build

# 2. Sync to the Android project
npx cap sync android

# 3. Open in Android Studio
npx cap open android
```

In Android Studio:
- Wait for Gradle sync to complete
- Select a device or emulator and press Run

### Required Android Permissions (already in `android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

---

## App Structure

```
src/
  App.tsx              — Router setup and bottom navigation layout
  main.tsx             — tRPC client + React root
  index.css            — Global styles and Tailwind config
  lib/
    trpc.ts            — tRPC client pointing to production API
    utils.ts           — cn() helper and shared utilities
  components/
    BottomNav.tsx      — 4-tab bottom navigation bar
    PageHeader.tsx     — Consistent page header with back button
  pages/
    Home.tsx           — Recent submissions list (dashboard)
    NewQuote.tsx       — Full field quote form with GPS + camera
    QuotesList.tsx     — All submitted quotes with AI score badges
    QuoteDetail.tsx    — Single quote detail view
    Profile.tsx        — App info and settings
```

---

## Key Features

### Field Quote Form (`/new-quote`)

- **GPS auto-fill**: Taps Capacitor Geolocation to get coordinates, then calls `fieldQuote.reverseGeocode` to resolve a human-readable address
- **Camera capture**: Uses Capacitor Camera plugin to capture photos, converts to base64, uploads to S3 via `fieldQuote.uploadPhoto`, and attaches the returned CDN URL to the quote
- **Photo strip**: Up to 6 photos shown as a horizontal scroll strip with remove buttons
- **Offline drafts**: Incomplete forms are saved to `localStorage` via Capacitor Preferences. A draft badge appears on the Home tab when a draft is pending
- **AI scoring**: After submission, the server runs AI lead qualification and creates an ops lead in the CRM automatically

### Ops Dashboard Integration

Field quotes appear in the **Field** tab on `/ops/quotes` in the main dashboard at nolandearthworks.com. Each card shows:
- Client name, service type, acreage, terrain
- GPS address
- AI score badge (Strong / Marginal / Weak)
- AI flags
- Photo count
- Contact links (tap to call / tap to email)
- Draft response (expandable)
- "Build Quote in Jobber" button

---

## API Endpoints Used

All calls go through tRPC at `https://nolandearth-pymczdcn.manus.space/api/trpc`.

| Procedure | Description |
|---|---|
| `fieldQuote.submit` | Submit a new field quote |
| `fieldQuote.list` | List submitted field quotes (auth required) |
| `fieldQuote.get` | Get a single field quote by ID (auth required) |
| `fieldQuote.uploadPhoto` | Upload a base64 photo to S3, returns CDN URL |
| `fieldQuote.reverseGeocode` | Convert GPS coordinates to address |

---

## Updating the App

After making code changes:

```bash
# Rebuild web assets
pnpm build

# Sync to native projects
npx cap sync

# Open in Xcode or Android Studio to run
npx cap open ios
npx cap open android
```

---

## App Store Submission Notes

- **iOS App Store**: Archive in Xcode (Product → Archive), then distribute via App Store Connect
- **Google Play**: Generate a signed APK or AAB in Android Studio (Build → Generate Signed Bundle/APK)
- The app does not require a backend server of its own — it connects to the existing Noland Earthworks API
- No push notification setup is required for the initial release

---

## Troubleshooting

**Camera not working on iOS simulator**: Use a real device. The iOS simulator does not have a camera.

**Geolocation returns null**: On iOS, ensure location permissions are granted in Settings → Privacy → Location Services. On Android, grant location permission when prompted.

**Photos not uploading**: Check that the device has an active internet connection. The app shows a toast error if the upload fails.

**API connection errors**: Verify the production site is live at `https://nolandearth-pymczdcn.manus.space`. The app does not fall back to a local server.
