import { describe, expect, it } from "vitest";
import { formatQuoteAcreage, normalizeQuoteAcreage } from "../shared/quoteAcreage";

describe("quote acreage slider helpers", () => {
  it("clamps and rounds values to quarter-acre increments", () => {
    expect(normalizeQuoteAcreage(0.1)).toBe("0.25");
    expect(normalizeQuoteAcreage(3.13)).toBe("3.25");
    expect(normalizeQuoteAcreage(44)).toBe("40");
  });

  it("formats selected acreage for a customer-facing summary", () => {
    expect(formatQuoteAcreage("1")).toBe("1 acre");
    expect(formatQuoteAcreage("3.25")).toBe("3.25 acres");
  });
});
