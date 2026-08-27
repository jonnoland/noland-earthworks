import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field official branding", () => {
  it("uses the official Noland Earthworks mark across visible companion screens", () => {
    const brandLogo = source("noland-earthworks-mobile/src/components/BrandLogo.tsx");
    const splash = source("noland-earthworks-mobile/src/components/SplashScreen.tsx");
    const home = source("noland-earthworks-mobile/src/pages/Home.tsx");
    const pinLogin = source("noland-earthworks-mobile/src/pages/PinLogin.tsx");
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");

    expect(brandLogo).toContain("noland-logo-transparent_783e5c7b.png");
    expect(splash).toContain("<BrandLogo />");
    expect(home).toContain("<BrandLogo />");
    expect(pinLogin).toContain("<BrandLogo />");
    expect(profile).toContain("<BrandLogo />");
  });

  it("ships an official-logo native launcher and splash for the v0.4.13 release", () => {
    const packageJson = source("noland-earthworks-mobile/package.json");
    const androidBuild = source("noland-earthworks-mobile/android/app/build.gradle");
    const launcherBackground = source("noland-earthworks-mobile/android/app/src/main/res/values/ic_launcher_background.xml");

    expect(packageJson).toContain('"version": "0.4.13"');
    expect(androidBuild).toContain('versionName "0.4.13"');
    expect(androidBuild).toContain("versionCode 15");
    expect(launcherBackground).toContain("#15110D");
    expect(existsSync(resolve(root, "noland-earthworks-mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"))).toBe(true);
    expect(existsSync(resolve(root, "noland-earthworks-mobile/android/app/src/main/res/drawable-port-xxhdpi/splash.png"))).toBe(true);
  });
});
