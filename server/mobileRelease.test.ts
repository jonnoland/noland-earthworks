import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getNolandFieldRelease } from "./mobileRelease";

const root = resolve(import.meta.dirname, "..");

describe("Noland Field mobile release channel", () => {
  it("points the in-app update channel to the current signed updater-feedback APK", () => {
    expect(getNolandFieldRelease()).toEqual({
      version: "0.4.17",
      downloadUrl: "/manus-storage/Noland-Field-v0.4.17_d189dc8a.apk",
      releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
      notes: expect.stringContaining("Detect My Location"),
      highlights: expect.arrayContaining([
        expect.stringContaining("Detect My Location"),
        expect.stringContaining("service-area counties"),
        expect.stringContaining("per-byte download progress"),
      ]),
      history: expect.arrayContaining([expect.objectContaining({ version: "0.4.14", title: "Offline Operations pricing" })]),
    });
  });

  it("keeps Android package version metadata aligned with the published update channel", () => {
    const gradle = readFileSync(resolve(root, "noland-earthworks-mobile/android/app/build.gradle"), "utf8");
    const packageJson = readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8");

    expect(gradle).toContain("versionCode 19");
    expect(gradle).toContain('versionName "0.4.17"');
    expect(packageJson).toContain('"version": "0.4.17"');
  });
});
