import { describe, expect, it } from "vitest";
import { evaluateMilestones, ratioPercent, type LeadGenerationMetrics } from "./leadGenerationMetrics";

const metrics: LeadGenerationMetrics = {
  periodStart: new Date("2026-08-01T00:00:00Z"),
  periodEnd: new Date("2026-08-31T00:00:00Z"),
  leadsCreated: 8,
  websiteLeads: 5,
  respondedWithin24h: 7,
  firstResponseRate: 88,
  quotesCreated: 6,
  quotesSent: 6,
  quoteSentRate: 100,
  quotesViewed: 4,
  quoteViewRate: 67,
  quotesApproved: 2,
  reviewRequestsSent: 4,
  sourceBreakdown: { website: 5, referral: 3 },
};

describe("lead generation milestone calculations", () => {
  it("returns a rounded ratio and leaves empty denominators pending", () => {
    expect(ratioPercent(7, 8)).toBe(88);
    expect(ratioPercent(0, 0)).toBeNull();
  });

  it("marks achieved metrics on track and low metrics as needing attention", () => {
    const milestones = evaluateMilestones(metrics, {
      targetLeads30d: 8,
      targetFirstResponseRate: 90,
      targetQuoteSentRate: 90,
      targetQuoteViewRate: 60,
      targetReviewRequests30d: 4,
    });
    expect(milestones.find((item) => item.key === "leads")?.status).toBe("on_track");
    expect(milestones.find((item) => item.key === "response")?.status).toBe("needs_attention");
    expect(milestones.find((item) => item.key === "quoteViewed")?.status).toBe("on_track");
  });
});
