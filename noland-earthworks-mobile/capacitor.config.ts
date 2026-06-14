import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nolandearthworks.field",
  appName: "Noland Field",
  webDir: "dist",
  server: {
    // During development, point to the live server so hot-reload works
    // Comment this out for production builds
    // url: "https://nolandearthworks.com",
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#121212",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    Camera: {
      // iOS: NSCameraUsageDescription and NSPhotoLibraryUsageDescription
      // are set in ios/App/App/Info.plist
    },
    Geolocation: {
      // iOS: NSLocationWhenInUseUsageDescription set in Info.plist
    },
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
    appendUserPermissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.INTERNET",
    ],
  },
};

export default config;
