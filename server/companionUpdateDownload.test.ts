import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field update download recovery", () => {
  it("keeps the browser fallback while using native file transfer for an observable APK download", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");
    const packageJson = source("noland-earthworks-mobile/package.json");

    expect(packageJson).toContain('"@capacitor/browser"');
    expect(profile).toContain('import { Browser } from "@capacitor/browser"');
    expect(profile).toContain("new URL(url, UPDATE_SITE_ORIGIN)");
    expect(profile).toContain("await Browser.open({ url: absoluteUrl })");
    expect(profile).toContain('window.open(absoluteUrl, "_system")');
    expect(packageJson).toContain('"@capacitor/file-transfer"');
    expect(packageJson).toContain('"@capacitor/file-viewer"');
    expect(profile).toContain("FileTransfer.addListener");
    expect(profile).toContain("FileTransfer.downloadFile");
    expect(profile).toContain("FileViewer.openDocumentFromLocalPath");
  });

  it("provides an explicit release-page fallback and clear APK installation guidance", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");

    expect(profile).toContain("Open release page instead");
    expect(profile).toContain("Download complete. Opening the Android installer");
    expect(profile).toContain("The progress bar reflects the actual signed package transfer");
    expect(profile).toContain("handleOpenReleasePage");
  });
});
