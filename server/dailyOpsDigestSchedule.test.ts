import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Daily Ops Digest durable schedule", () => {
  it("uses the existing 6 AM Central Heartbeat callback instead of an in-process digest timer", () => {
    const serverEntry = source("server/_core/index.ts");

    expect(serverEntry).toContain('app.post("/api/scheduled/morning-brief"');
    expect(serverEntry).toContain("runDailyDigestAgent()");
    expect(serverEntry).not.toContain('cron.schedule("0 6 * * *"');
  });

  it("returns a retryable failure when the Digest email provider reports an error", () => {
    const agents = source("server/agents.ts");

    expect(agents).toContain("const { error: emailError } = await resend.emails.send");
    expect(agents).toContain("Resend delivery failed:");
    expect(agents).toContain('status: "error"');
  });
});
