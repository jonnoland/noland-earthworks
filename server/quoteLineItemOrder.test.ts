import { describe, expect, it } from "vitest";
import { moveQuoteLineItem } from "../shared/quoteLineItemOrder";

describe("quote line-item ordering", () => {
  it("moves an item to the requested position without changing the original input", () => {
    const items = ["Forestry Mulching", "Full Operating Day", "Optional Phase 2"];
    expect(moveQuoteLineItem(items, 2, 0)).toEqual(["Optional Phase 2", "Forestry Mulching", "Full Operating Day"]);
    expect(items).toEqual(["Forestry Mulching", "Full Operating Day", "Optional Phase 2"]);
  });

  it("returns the original ordering for out-of-range moves", () => {
    const items = ["A", "B"];
    expect(moveQuoteLineItem(items, -1, 1)).toEqual(items);
    expect(moveQuoteLineItem(items, 0, 4)).toEqual(items);
  });
});
