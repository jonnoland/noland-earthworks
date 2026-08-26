import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 1 signed quote acceptance", () => {
  it("records a typed signature and requires that signed Phase 1 acceptance before deposits", () => {
    const router = fs.readFileSync(path.resolve(import.meta.dirname, "nativeQuotesRouter.ts"), "utf8");
    const portal = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/NativeQuotePortal.tsx"), "utf8");
    const schema = fs.readFileSync(path.resolve(import.meta.dirname, "../drizzle/schema.ts"), "utf8");

    expect(router).toContain("acceptPhaseOne");
    expect(router).toContain('phaseOneAcceptanceScope: "phase_1"');
    expect(router).toContain("phaseOneSignatureConsentAt");
    expect(router).toContain("Accept and sign Phase 1 before paying its deposit.");
    expect(portal).toContain("Accept Quote & Sign Phase 1");
    expect(portal).toContain("Sign & Accept Phase 1");
    expect(portal).toContain("hasSignedPhaseOneAcceptance && !hasDepositPaid");
    expect(schema).toContain("phaseOneSignatureConsentAt");
    expect(schema).toContain("phaseOneAcceptanceScope");
  });

  it("marks any lead linked to the accepted native quote as won", () => {
    const router = fs.readFileSync(path.resolve(import.meta.dirname, "nativeQuotesRouter.ts"), "utf8");

    expect(router).toContain("where(eq(opsLeads.nativeQuoteId, quote.id))");
    expect(router).toContain('set({ stage: "won", updatedAt: acceptedAt })');
    expect(router).toContain("linkedLeadWon: linkedLeads.length > 0");
  });
});
