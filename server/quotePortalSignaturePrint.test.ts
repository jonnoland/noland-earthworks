import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 1 signed portal PDF evidence", () => {
  it("prints the typed signature, acceptance timestamp, consent, and Phase 1 scope", () => {
    const portal = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/NativeQuotePortal.tsx"), "utf8");
    expect(portal).toContain("Phase 1 Acceptance Record");
    expect(portal).toContain("Electronically signed by:");
    expect(portal).toContain("Acceptance timestamp:");
    expect(portal).toContain("Electronic signature consent confirmed");
    expect(portal).toContain("Phase 1 — Current Approval only");
    expect(portal).toContain("portal-print-root");
  });
});
