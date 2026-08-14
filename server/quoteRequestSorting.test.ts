import { describe, expect, it } from "vitest";
import { compareQuotesByConfidence, sortQuotesByConfidence, sortWebsiteRequests, WEBSITE_REQUESTS_REFRESH_INTERVAL_MS } from "@shared/quoteRequestSorting";

describe("website request visibility and AI confidence sorting", () => {
  const requests = [
    { id: 1, createdAt: "2026-08-14T12:00:00.000Z", aiRangeConfidenceScore: 45 },
    { id: 2, createdAt: "2026-08-14T13:00:00.000Z", aiRangeConfidenceScore: 88 },
    { id: 3, createdAt: "2026-08-14T14:00:00.000Z", aiRangeConfidenceScore: null },
  ];

  it("uses a short refresh interval so newly submitted website requests appear without manual reload", () => {
    expect(WEBSITE_REQUESTS_REFRESH_INTERVAL_MS).toBe(15_000);
  });

  it("orders website requests from highest AI confidence to unscored requests", () => {
    expect(sortWebsiteRequests(requests, "confidence").map((request) => request.id)).toEqual([2, 1, 3]);
  });

  it("uses newest-first as the deterministic tie-breaker for equal confidence", () => {
    const equal = [
      { id: 4, createdAt: "2026-08-14T12:00:00.000Z", aiRangeConfidenceScore: 70 },
      { id: 5, createdAt: "2026-08-14T13:00:00.000Z", aiRangeConfidenceScore: 70 },
    ];
    expect(sortQuotesByConfidence(equal).map((quote) => quote.id)).toEqual([5, 4]);
  });

  it("returns a neutral comparison for quotes with identical confidence and timestamp", () => {
    const timestamp = "2026-08-14T14:00:00.000Z";
    expect(compareQuotesByConfidence(
      { aiRangeConfidenceScore: 70, createdAt: timestamp },
      { aiRangeConfidenceScore: 70, createdAt: timestamp },
    )).toBe(0);
  });
});
