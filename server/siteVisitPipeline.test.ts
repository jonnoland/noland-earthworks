import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("native Site Visit Request workflow", () => {
  it("creates every website request with the required native lifecycle defaults", () => {
    const source = readProjectFile("server/quoteRouter.ts");

    expect(source).toContain('sourceDetail: "website_site_visit_request"');
    expect(source).toContain('fitDecision: "unreviewed"');
    expect(source).toContain('nextActionType: "review_and_contact"');
    expect(source).toContain('visitStatus: "requested"');
    expect(source).toContain('proposalStatus: "not_started"');
    expect(source).toContain('depositStatus: "not_requested"');
    expect(source).toContain('finalPaymentStatus: "not_due"');
  });

  it("exposes the full lifecycle controls in the native quote editor and daily-action dashboard", () => {
    const quotes = readProjectFile("client/src/pages/ops/NativeAllQuotesSection.tsx");
    const dashboard = readProjectFile("client/src/pages/ops/Dashboard.tsx");

    for (const field of ["sourceDetail", "fitDecision", "nextActionType", "visitStatus", "proposalStatus", "depositStatus", "finalPaymentStatus"]) {
      expect(quotes).toContain(field);
    }
    expect(dashboard).toContain("15-minute routine: leads, visits, proposals, deposits, weather, invoices, and review decisions.");
  });
});
