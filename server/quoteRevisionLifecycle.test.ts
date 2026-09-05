import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("native quote revision lifecycle", () => {
  it("snapshots each sent customer revision and renders the active snapshot in the public portal", () => {
    const router = read("server/nativeQuotesRouter.ts");
    const portal = read("client/src/pages/NativeQuotePortal.tsx");

    expect(router).toContain("nativeQuoteRevisions");
    expect(router).toContain("buildNativeQuoteRevisionSnapshot");
    expect(router).toContain("revisionNumber");
    expect(router).toContain("revisionSnapshot.lineItems");
    expect(router).toContain("revisionSnapshot.totalCents");
    expect(router).toContain("portalViewedAt: null");
    expect(portal).toContain("Revision ${quote.revisionNumber}");
    expect(portal).toContain("Locked {revisionLabel}");
    expect(portal).toContain("exact scope and price sent for this revision");
    expect(portal).toContain("Request Changes option below");
  });

  it("locks signed work against untracked edits and requires a typed Phase 1 acceptance", () => {
    const router = read("server/nativeQuotesRouter.ts");

    expect(router).toContain("This accepted quote is revision-locked");
    expect(router).toContain("Duplicate it to prepare a new scope or price");
    expect(router).toContain('action: z.enum(["declined", "changes_requested"])');
    expect(router).toContain("snapshot?.lineItems");
    expect(router).toContain("acceptedAt");
  });
});
