import { describe, expect, it } from "vitest";
import { combinePreliminaryRanges, updateQuoteServiceSelection } from "@shared/quoteMultiService";

describe("quote multi-service selection", () => {
  it("allows acreage-based services to be selected together", () => {
    expect(updateQuoteServiceSelection(["forestry-mulching"], "vegetation-management")).toEqual([
      "forestry-mulching",
      "vegetation-management",
    ]);
  });

  it("keeps dimension-based services as a standalone selection", () => {
    expect(updateQuoteServiceSelection(["forestry-mulching"], "trail-cutting")).toEqual(["trail-cutting"]);
  });

  it("combines currency ranges into one preliminary range", () => {
    expect(combinePreliminaryRanges(["$1,000 – $2,000", "$500 – $900"])).toBe("$1,500 – $2,900");
  });
});
