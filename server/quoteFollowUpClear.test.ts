import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const quoteSectionSource = readFileSync(resolve(process.cwd(), "client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");

describe("quote follow-up draft clearing", () => {
  it("lets Operations remove a generated follow-up draft without changing the quote", () => {
    expect(quoteSectionSource).toContain("const clearStaleFollowUpDraft");
    expect(quoteSectionSource).toContain("hoursSinceViewed");
    expect(quoteSectionSource).toContain("Viewed Quotes Needing Follow-Up");
    expect(quoteSectionSource).toContain("delete next[quoteId]");
    expect(quoteSectionSource).toContain("Clear message");
    expect(quoteSectionSource).toContain("Follow-up message cleared.");
  });
});
