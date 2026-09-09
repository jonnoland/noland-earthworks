import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");
}

describe("Parcel owner, dispatch organization, and acreage quote adjustments", () => {
  it("retrieves one matched property automatically and keeps owner application safe", () => {
    const fieldQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const operationsQuote = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(fieldQuote).toContain("if (result.matches.length === 1)");
    expect(fieldQuote).toContain("name: current.name.trim() ? current.name : (match.owner || current.name)");
    expect(fieldQuote).toContain("Owner record:");
    expect(fieldQuote).toContain("parcelAutoLookupKeyRef");
    expect(operationsQuote).toContain("Use owner as client");
    expect(operationsQuote).toContain("parcelAutoLookupKeyRef");
  });

  it("supports Parcel ID search plus acreage and Parcel ID dispatch organization", () => {
    const jobsRouter = source("server/nativeJobsRouter.ts");
    const jobsPage = source("client/src/pages/ops/NativeJobsSection.tsx");

    expect(jobsRouter).toContain("like(nativeJobs.parcelId, term)");
    expect(jobsRouter).toContain("like(nativeJobs.parcelOwner, term)");
    expect(jobsPage).toContain('const [acreageFilter, setAcreageFilter]');
    expect(jobsPage).toContain('const [sortBy, setSortBy]');
    expect(jobsPage).toContain("Sort: acreage, low to high");
    expect(jobsPage).toContain("Parcel ID assigned");
  });

  it("adds editable acreage adjustments and service add-ons through standard quote line items", () => {
    const operationsQuote = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(operationsQuote).toContain("addAcreageAdjustmentLine");
    expect(operationsQuote).toContain("Manual acreage adjustment or add-on");
    expect(operationsQuote).toContain("Add acreage line");
    expect(operationsQuote).toContain("Add-on service");
    expect(operationsQuote).toContain("Enter the approved per-acre rate before sending the quote.");
  });
});
