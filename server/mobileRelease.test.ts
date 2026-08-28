import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getNolandFieldRelease } from "./mobileRelease";

const root = resolve(import.meta.dirname, "..");

describe("Noland Field mobile release channel", () => {
  it("points the in-app update channel to the current signed rate-sync APK", () => {
    expect(getNolandFieldRelease()).toEqual({
      version: "0.4.14",
      downloadUrl: "/manus-storage/noland-field_v0.4.14_59232714.apk",
      releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
      notes: expect.stringContaining("reconnect Sync Now"),
      highlights: expect.arrayContaining([expect.stringContaining("Offline estimates")]),
    });
  });

  it("keeps Android package version metadata aligned with the published update channel", () => {
    const gradle = readFileSync(resolve(root, "noland-earthworks-mobile/android/app/build.gradle"), "utf8");
    const packageJson = readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8");

    expect(gradle).toContain("versionCode 16");
    expect(gradle).toContain('versionName "0.4.14"');
    expect(packageJson).toContain('"version": "0.4.14"');
  });
});
