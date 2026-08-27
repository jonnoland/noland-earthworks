import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getNolandFieldRelease } from "./mobileRelease";

const root = resolve(import.meta.dirname, "..");

describe("Noland Field mobile release channel", () => {
  it("points the in-app update channel to the current replacement-signed quote workflow APK", () => {
    expect(getNolandFieldRelease()).toEqual({
      version: "0.4.13",
      downloadUrl: "/manus-storage/noland-field-v0.4.13-replacement_ea279acc.apk",
      releaseNotesUrl: "https://nolandearthworks.com/field-release-notes",
      notes: expect.stringContaining("Uninstall the prior Noland Field app"),
    });
  });

  it("keeps Android package version metadata aligned with the published update channel", () => {
    const gradle = readFileSync(resolve(root, "noland-earthworks-mobile/android/app/build.gradle"), "utf8");
    const packageJson = readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8");

    expect(gradle).toContain("versionCode 15");
    expect(gradle).toContain('versionName "0.4.13"');
    expect(packageJson).toContain('"version": "0.4.13"');
  });
});
