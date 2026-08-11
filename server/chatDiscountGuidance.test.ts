import { describe, expect, it } from "vitest";
import { buildChatDiscountGuidance } from "./chatDiscountGuidance";

describe("buildChatDiscountGuidance", () => {
  it("includes enabled Military/Veteran and First-Time Customer discounts", () => {
    const guidance = buildChatDiscountGuidance({ militaryVeteranPct: 10, firstTimePct: 10 });

    expect(guidance).toContain("Military / Veteran: 10%");
    expect(guidance).toContain("First-Time Customer: 10%");
    expect(guidance).toContain("Never stack discounts");
  });

  it("does not surface disabled discounts", () => {
    const guidance = buildChatDiscountGuidance({ militaryVeteranPct: 0, firstTimePct: 0 });

    expect(guidance).not.toContain("Military / Veteran:");
    expect(guidance).toContain("Do not mention customer discounts");
  });
});
