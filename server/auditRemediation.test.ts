import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("whole-site audit remediation safeguards", () => {
  it("keeps a factual scope boundary on shared public conversion surfaces", () => {
    const notice = source("client/src/components/ScopeBoundaryNotice.tsx");
    const quote = source("client/src/pages/Quote.tsx");
    const faq = source("client/src/pages/Faq.tsx");

    expect(notice).toContain("written proposal specifically says otherwise");
    expect(quote).toContain("same day or the next morning");
    expect(faq).toContain("grading, excavation, stump/root extraction, hauling, road construction, or final building-pad preparation");
    expect(faq).not.toContain("ready for grading without debris piles");
  });

  it("excludes redirected county-blog sources from sitemap output while retaining factual machine-readable scope", () => {
    const sitemap = source("server/sitemapRoutes.ts");

    expect(sitemap).not.toContain('path: "/blog/land-management-williamson-county"');
    expect(sitemap).not.toContain('path: "/blog/land-management-houston-county"');
    expect(sitemap).toContain("separately scoped grading, excavation, or construction contractor");
    expect(sitemap).not.toContain("leaving no debris piles, no burning, and no bare soil");
  });

  it("makes payment webhook exceptions retriable and records idempotent event processing", () => {
    const webhook = source("server/stripeWebhookRoutes.ts");
    const schema = source("drizzle/schema.ts");

    expect(webhook).toContain("stripeWebhookEvents");
    expect(webhook).toContain("processedAt");
    expect(webhook).toContain("res.status(500)");
    expect(schema).toContain('mysqlTable("stripe_webhook_events"');
  });

  it("keeps pricing research review-only, unit-aware, and weekly", () => {
    const agents = source("server/agents.ts");
    const scheduler = source("server/_core/index.ts");
    const pricing = source("client/src/pages/ops/Pricing.tsx");

    expect(agents).toContain("upsertPricingBenchmarkCandidate");
    expect(agents).not.toContain("await upsertPricingBenchmark({");
    expect(agents).toContain("stripCodeFence(content)");
    expect(scheduler).toContain('cron.schedule("0 6 * * 0"');
    expect(pricing).toContain("Research awaiting your review");
    expect(pricing).toContain("Review source");
    expect(pricing).toContain("This is a review aid, not a quote verifier");
  });
});
