import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("viewed quote follow-up tracking", () => {
  it("uses a server-derived 48-hour portal-view threshold and keeps outreach owner-reviewed", () => {
    const router = read("server/opsRouter.ts");
    const nativeRouter = read("server/nativeQuotesRouter.ts");
    const workspace = read("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain("48 * 60 * 60 * 1000");
    expect(router).toContain("lt(nativeQuotes.portalViewedAt, cutoff)");
    expect(router).toContain("hoursSinceViewed");
    expect(nativeRouter).toContain('nextActionType: "follow_up_viewed_48h"');
    expect(nativeRouter).toContain("nextActionDueAt: new Date(viewedAt.getTime() + 48 * 60 * 60 * 1000)");
    expect(workspace).toContain("Viewed Quotes Needing Follow-Up");
    expect(workspace).toContain("Draft SMS");
  });
});
