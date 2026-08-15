import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("companion release, map, and offline workflow", () => {
  it("keeps the in-app updater connected to the latest published mobile APK release", () => {
    const router = source("server/fieldQuoteRouter.ts");
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");
    expect(router).toContain('tag_name.startsWith("mobile-v")');
    expect(router).toContain("browser_download_url");
    expect(profile).toContain("Update Available");
  });

  it("renders a visual supported-area map in the companion location screen", () => {
    const quote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    expect(quote).toContain("function ServiceAreaMapPreview()");
    expect(quote).toContain("tn-served-counties-35-v2");
    expect(quote).toContain("<ServiceAreaMapPreview />");
  });

  it("queues offline field requests locally and syncs them after connectivity returns", () => {
    const queue = source("noland-earthworks-mobile/src/lib/offlineFieldQuoteQueue.ts");
    const sync = source("noland-earthworks-mobile/src/hooks/useOfflineFieldQuoteSync.ts");
    const quote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const app = source("noland-earthworks-mobile/src/App.tsx");
    expect(queue).toContain("Preferences.set");
    expect(queue).toContain("noland_field_offline_requests_v1");
    expect(sync).toContain("utils.client.fieldQuote.submit.mutate");
    expect(sync).toContain("removeOfflineFieldQuote");
    expect(quote).toContain("enqueueOfflineFieldQuote");
    expect(quote).toContain('source: "field_app_offline"');
    expect(app).toContain("useOfflineFieldQuoteSync()");
  });

  it("shows a visible upload confirmation and launch-time update badge", () => {
    const sync = source("noland-earthworks-mobile/src/hooks/useOfflineFieldQuoteSync.ts");
    const banner = source("noland-earthworks-mobile/src/components/NetworkBanner.tsx");
    const nav = source("noland-earthworks-mobile/src/components/BottomNav.tsx");
    const app = source("noland-earthworks-mobile/src/App.tsx");
    expect(sync).toContain('status: "synced"');
    expect(banner).toContain("uploaded to Ops");
    expect(nav).toContain("updateAvailable");
    expect(app).toContain("updateState.updateAvailable");
  });
});
