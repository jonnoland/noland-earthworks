import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const dashboard = fs.readFileSync(
  path.resolve(import.meta.dirname, "../client/src/pages/ops/Dashboard.tsx"),
  "utf8",
);

describe("Field Command Center dashboard", () => {
  it("prioritizes operational work before the Business Pulse reporting section", () => {
    expect(dashboard).toContain("Today’s Work Queue");
    expect(dashboard).toContain("Today &amp; Next 7 Days");
    expect(dashboard).toContain("Cash to Collect");
    expect(dashboard).toContain("Pipeline Snapshot");
    expect(dashboard).toContain("Business Pulse");
  });

  it("routes scheduled work and invoice actions to their proper Operations pages", () => {
    expect(dashboard).toContain('href="/ops/schedule"');
    expect(dashboard).toContain('href="/ops/invoices"');
    expect(dashboard).not.toContain('const cardHref = "/ops/quotes"');
  });
});
