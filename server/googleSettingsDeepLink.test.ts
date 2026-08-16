import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const settingsPath = fileURLToPath(new URL("../client/src/pages/ops/Settings.tsx", import.meta.url));
const reviewsPath = fileURLToPath(new URL("../client/src/pages/ops/Reviews.tsx", import.meta.url));

describe("Google Business Profile settings access", () => {
  it("supports a direct Integrations deep link after an OAuth return", () => {
    const source = readFileSync(settingsPath, "utf8");

    expect(source).toContain('params.get("tab")');
    expect(source).toContain('requestedTab && tabs.some((tab) => tab.id === requestedTab)');
    expect(source.indexOf("<GoogleBusinessProfileCard />")).toBeLessThan(source.indexOf("{/* ── Twilio ── */}"));
  });

  it("does not show a disconnected notice while connection status is loading", () => {
    const source = readFileSync(reviewsPath, "utf8");

    expect(source).toContain("isLoading: googleStatusLoading");
    expect(source).toContain("!googleStatusLoading && !googleConnected");
    expect(source).toContain('href="/ops/settings?tab=integrations"');
  });
});
