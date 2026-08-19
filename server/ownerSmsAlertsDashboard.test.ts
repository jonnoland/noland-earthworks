import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Owner SMS Alerts dashboard compaction", () => {
  it("limits the default dashboard view to the latest alerts and keeps loaded history expandable", () => {
    const dashboard = readFileSync(resolve(import.meta.dirname, "../client/src/pages/ops/Dashboard.tsx"), "utf8");

    expect(dashboard).toContain("ownerSmsAlerts.slice(0, 2)");
    expect(dashboard).toContain("ownerSmsAlerts.length > 2");
    expect(dashboard).toContain("View {ownerSmsAlerts.length - 2} earlier loaded alert");
    expect(dashboard).toContain('className="ops-card p-3"');
  });
});
