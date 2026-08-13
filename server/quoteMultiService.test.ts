import { describe, expect, it } from "vitest";
import { combinePreliminaryRanges, updateQuoteServiceSelection } from "@shared/quoteMultiService";

describe("quote multi-service selection", () => {
  it("allows acreage-based services to be selected together", () => {
    expect(updateQuoteServiceSelection(["forestry-mulching"], "vegetation-management")).toEqual([
      "forestry-mulching",
      "vegetation-management",
    ]);
  });

  it("allows linear-footage services to be selected with acreage-based services", () => {
    expect(updateQuoteServiceSelection(["forestry-mulching"], "trail-cutting")).toEqual([
      "forestry-mulching",
      "trail-cutting",
    ]);
    expect(updateQuoteServiceSelection(["trail-cutting"], "right-of-way-clearing")).toEqual([
      "trail-cutting",
      "right-of-way-clearing",
    ]);
  });

  it("combines currency ranges into one preliminary range", () => {
    expect(combinePreliminaryRanges(["$1,000 – $2,000", "$500 – $900"])).toBe("$1,500 – $2,900");
  });
});
