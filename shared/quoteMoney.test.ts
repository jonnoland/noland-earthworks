import { describe, expect, it } from "vitest";
import { formatQuoteCents, quoteDollarsToCents, roundQuoteCentsUp } from "./quoteMoney";

describe("quote whole-dollar ceiling rounding", () => {
  it("rounds positive quote amounts up to the next whole dollar", () => {
    expect(roundQuoteCentsUp(123_401)).toBe(123_500);
    expect(roundQuoteCentsUp(123_500)).toBe(123_500);
    expect(quoteDollarsToCents(1234.01)).toBe(123_500);
  });

  it("never exposes cents in the quote format", () => {
    expect(formatQuoteCents(123_401)).toBe("$1,235");
    expect(formatQuoteCents(-10_099)).toBe("-$100");
  });
});
