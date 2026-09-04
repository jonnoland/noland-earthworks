import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getNolandFieldRelease } from "./mobileRelease";

const root = resolve(import.meta.dirname, "..");

describe("Noland Field mobile release channel", () => {
  it("points the in-app update channel to a signed APK matching the mobile package version", () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8")) as { version: string };
    const release = getNolandFieldRelease();

    expect(release.version).toBe(packageJson.version);
    expect(release.downloadUrl).toMatch(new RegExp(`^/manus-storage/Noland-Field-v${packageJson.version.replaceAll(".", "\\.")}_.*\\.apk$`));
    expect(release.releaseNotesUrl).toBe("https://nolandearthworks.com/field-release-notes");
    expect(release.notes).toContain("Noland Field");
    expect(release.highlights.length).toBeGreaterThan(0);
    expect(release.history).toContainEqual(expect.objectContaining({ version: packageJson.version }));
  });

  it("keeps Android package version metadata aligned with the published update channel", () => {
    const gradle = readFileSync(resolve(root, "noland-earthworks-mobile/android/app/build.gradle"), "utf8");
    const packageJson = readFileSync(resolve(root, "noland-earthworks-mobile/package.json"), "utf8");

    const version = JSON.parse(packageJson).version;
    expect(gradle).toContain(`versionName "${version}"`);
    expect(gradle).toMatch(/versionCode\s+\d+/);
  });
});
