import { describe, expect, it } from "vitest";
import { combinePreliminaryRanges, FEET_PER_MILE, feetToLength, getRecommendedQuoteServices, lengthToFeet, quoteTerrainLabel, quoteTerrainMultiplier, updateQuoteServiceSelection } from "@shared/quoteMultiService";

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

  it("converts route length between miles and linear feet without changing the underlying distance", () => {
    expect(lengthToFeet(1.5, "miles")).toBe(1.5 * FEET_PER_MILE);
    expect(feetToLength(7920, "miles")).toBe(1.5);
    expect(lengthToFeet(2640, "feet")).toBe(2640);
    expect(feetToLength(2640, "feet")).toBe(2640);
  });

  it("uses the correct Middle Tennessee terrain multiplier for each difficulty", () => {
    expect(quoteTerrainMultiplier("level")).toBe(1);
    expect(quoteTerrainMultiplier("rolling")).toBe(1.1);
    expect(quoteTerrainMultiplier("steep")).toBe(1.25);
    expect(quoteTerrainLabel("steep")).toBe("Steep / Wet / Rocky");
  });

  it("recommends complementary services from project size and terrain without repeating selected services", () => {
    const recommendations = getRecommendedQuoteServices(["forestry-mulching"], 12, "steep");
    expect(recommendations.map((item) => item.service)).toEqual(["trail-cutting", "vegetation-management", "right-of-way-clearing"]);
    expect(recommendations.some((item) => item.service === "forestry-mulching")).toBe(false);
  });
});
