import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field update download recovery", () => {
  it("uses the native browser handoff rather than relying only on a generic window open", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");
    const packageJson = source("noland-earthworks-mobile/package.json");

    expect(packageJson).toContain('"@capacitor/browser"');
    expect(profile).toContain('import { Browser } from "@capacitor/browser"');
    expect(profile).toContain("await Browser.open({ url })");
    expect(profile).toContain('window.open(url, "_system")');
  });

  it("provides an explicit release-page fallback and clear APK installation guidance", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");

    expect(profile).toContain("Open release page instead");
    expect(profile).toContain("When the download finishes, tap the APK");
    expect(profile).toContain("handleOpenReleasePage");
  });
});
