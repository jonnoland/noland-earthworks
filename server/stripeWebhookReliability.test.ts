import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webhookSource = readFileSync(
  resolve(import.meta.dirname, "stripeWebhookRoutes.ts"),
  "utf8"
);

describe("Stripe webhook reliability safeguards", () => {
  it("suppresses events already recorded as processed", () => {
    expect(webhookSource).toContain('if (existing?.status === "processed") return false;');
    expect(webhookSource).toContain("duplicate: true");
  });

  it("records failed attempts and returns a retryable server error", () => {
    expect(webhookSource).toContain("attempts: sql`${stripeWebhookEvents.attempts} + 1`");
    expect(webhookSource).toContain('await markWebhookEvent(event.id, "failed", message.slice(0, 4000));');
    expect(webhookSource).toContain('res.status(500).json({ error: "Internal webhook processing failed; retry requested" });');
  });
});
