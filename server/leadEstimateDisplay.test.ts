import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("lead estimate display", () => {
  it("does not show a redundant no-estimate label when a native quote is linked", () => {
    const leads = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/ops/Leads.tsx"), "utf8");
    expect(leads).toContain("const showEstimateLabel = !!lead.estimatedValue || !lead.nativeQuoteId;");
    expect(leads).toContain("{showEstimateLabel && (");
  });
});
