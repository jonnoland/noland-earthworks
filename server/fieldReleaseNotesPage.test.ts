import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isKnownSpaRoute } from "./publicRoutePolicy";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field release notes and updater feedback", () => {
  it("publishes the release notes route that the mobile updater links to", () => {
    const app = source("client/src/App.tsx");
    const page = source("client/src/pages/FieldReleaseNotes.tsx");

    expect(app).toContain('path="/field-release-notes"');
    expect(page).toContain("v{version} Release Notes");
    expect(page).toContain("trpc.fieldQuote.latestVersion.useQuery");
    expect(page).toContain("Install the update");
    expect(isKnownSpaRoute("/field-release-notes")).toBe(true);
  });

  it("uses native transfer progress and an installer handoff instead of an untracked browser download", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");
    const updateCheck = source("noland-earthworks-mobile/src/hooks/useUpdateCheck.ts");

    expect(profile).toContain("FileTransfer.addListener");
    expect(profile).toContain("FileTransfer.downloadFile");
    expect(profile).toContain("FileViewer.openDocumentFromLocalPath");
    expect(profile).toContain("actual signed package transfer");
    expect(profile).toContain("What’s new in v");
    expect(updateCheck).toContain('label: "View update"');
    expect(updateCheck).toContain('window.location.assign("/profile")');
  });
});
