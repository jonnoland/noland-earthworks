import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("customer portal phase item display", () => {
  it("renders assigned items inside their own phase section instead of flattening them into Phase 1", () => {
    const portal = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/NativeQuotePortal.tsx"), "utf8");
    expect(portal).toContain("approvedPhaseSections.map");
    expect(portal).toContain("optionalFuturePhaseSections.map");
    expect(portal).toContain("section.lineItems.filter");
    expect(portal).not.toContain("optionalFutureLineItems.map");
  });
});
