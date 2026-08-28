import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getNolandFieldRelease } from "./mobileRelease";

const root = resolve(import.meta.dirname, "..");

describe("Noland Field mobile release channel", () => {
  it("points the in-app update channel to the current signed updater-feedback APK", () => {
    expect(getNolandFieldRelease()).toEqual({
      version: "0.4.15",
      downloadUrl: "/manus-storage/noland-field_v0.4.15_730c0427.apk",
      releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
      notes: expect.stringContaining("download progress"),
      highlights: expect.arrayContaining([expect.stringContaining("per-byte download progress")]),
      history: expect.arrayContaining([expect.objectContaining({ version: "0.4.14", title: "Offline Operations pricing" })]),
    });
  });

  it("keeps Android package version metadata aligned with the published update channel", () => {
    const gradle = readFileSync(resolve(root, "noland-earthworks-mobile/android/app/build.gradle"), "utf8");
    const packageJson = readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8");

    expect(gradle).toContain("versionCode 17");
    expect(gradle).toContain('versionName "0.4.15"');
    expect(packageJson).toContain('"version": "0.4.15"');
  });
});
