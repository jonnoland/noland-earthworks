import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("Site Visit Request location review safeguards", () => {
  it("keeps out-of-area properties out of the normal quote queue and flags uncertain locations for owner review", () => {
    const form = read("client/src/pages/Quote.tsx");
    const router = read("server/quoteRouter.ts");
    const operations = read("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(form).toContain("County needs Owner Review before scheduling");
    expect(form).toContain("Manual address entry — Owner Review");
    expect(form).toContain("locationDecision: needsLocationReview ? \"owner_review\" : \"confirmed\"");
    expect(router).toContain('input.locationDecision === "out_of_area"');
    expect(router).toContain('fitDecision: needsLocationReview ? "owner_review" : "unreviewed"');
    expect(operations).toContain("Owner Review — verify property county");
  });
});
