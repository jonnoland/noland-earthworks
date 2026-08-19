import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("AI Pricing auto-approval", () => {
  it("stores an explicit owner-controlled auto-approve setting", () => {
    const router = source("server/agentRouter.ts");
    const db = source("server/db.ts");

    expect(router).toContain("getPricingAutoApproval");
    expect(router).toContain("setPricingAutoApproval");
    expect(router).toContain("{ autoApprove: input.enabled }");
    expect(db).toContain("parseAgentConfigOptions");
  });

  it("promotes only sourced, validated research when the owner enables the rule", () => {
    const agents = source("server/agents.ts");

    expect(agents).toContain("autoApprove && vettedSourceUrls.length > 0");
    expect(agents).toContain("autoApprovePricingBenchmarkCandidate(svc.key)");
    expect(agents).toContain("Suggestions without a public source remain for review");
  });

  it("shows the active auto-approval state in AI Pricing", () => {
    const settings = source("client/src/pages/ops/Settings.tsx");

    expect(settings).toContain("Auto-approve sourced research is ON");
    expect(settings).toContain("setPricingAutoApproval.mutate");
  });
});
