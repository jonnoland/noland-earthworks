import { and, eq, gte, inArray, lt } from "drizzle-orm";
import {
  jobs,
  leadContactLog,
  nativeQuotes,
  opsLeads,
} from "../drizzle/schema";

type DbLike = any;

export type LeadGenerationTargets = {
  targetLeads30d: number;
  targetFirstResponseRate: number;
  targetQuoteSentRate: number;
  targetQuoteViewRate: number;
  targetReviewRequests30d: number;
};

export type LeadGenerationMetrics = {
  periodStart: Date;
  periodEnd: Date;
  leadsCreated: number;
  websiteLeads: number;
  respondedWithin24h: number;
  firstResponseRate: number | null;
  quotesCreated: number;
  quotesSent: number;
  quoteSentRate: number | null;
  quotesViewed: number;
  quoteViewRate: number | null;
  quotesApproved: number;
  reviewRequestsSent: number;
  sourceBreakdown: Record<string, number>;
};

export type MilestoneHealth = {
  key: "leads" | "response" | "quoteSent" | "quoteViewed" | "reviews";
  label: string;
  actual: number | null;
  target: number;
  unit: "count" | "percent";
  status: "on_track" | "needs_attention" | "pending_data";
};

export function ratioPercent(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

export function evaluateMilestones(metrics: LeadGenerationMetrics, targets: LeadGenerationTargets): MilestoneHealth[] {
  const items: Array<Omit<MilestoneHealth, "status">> = [
    { key: "leads", label: "Qualified leads", actual: metrics.leadsCreated, target: targets.targetLeads30d, unit: "count" },
    { key: "response", label: "First response within 24 hours", actual: metrics.firstResponseRate, target: targets.targetFirstResponseRate, unit: "percent" },
    { key: "quoteSent", label: "Quotes sent", actual: metrics.quoteSentRate, target: targets.targetQuoteSentRate, unit: "percent" },
    { key: "quoteViewed", label: "Quotes viewed", actual: metrics.quoteViewRate, target: targets.targetQuoteViewRate, unit: "percent" },
    { key: "reviews", label: "Review requests sent", actual: metrics.reviewRequestsSent, target: targets.targetReviewRequests30d, unit: "count" },
  ];

  return items.map((item) => ({
    ...item,
    status: item.actual === null
      ? "pending_data"
      : item.actual >= item.target
        ? "on_track"
        : "needs_attention",
  }));
}

export async function calculateLeadGenerationMetrics(
  db: DbLike,
  userId: number,
  days: number,
  endAt = new Date(),
): Promise<LeadGenerationMetrics> {
  const periodEnd = new Date(endAt);
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);

  const leads = await db.select().from(opsLeads).where(and(
    eq(opsLeads.userId, userId),
    gte(opsLeads.createdAt, periodStart),
    lt(opsLeads.createdAt, periodEnd),
  ));

  const leadIds = leads.map((lead: any) => lead.id);
  const contacts = leadIds.length > 0
    ? await db.select().from(leadContactLog).where(inArray(leadContactLog.leadId, leadIds))
    : [];
  const firstContactByLead = new Map<number, Date>();
  for (const contact of contacts) {
    const sentAt = new Date(contact.sentAt);
    const existing = firstContactByLead.get(contact.leadId);
    if (!existing || sentAt < existing) firstContactByLead.set(contact.leadId, sentAt);
  }
  const respondedWithin24h = leads.filter((lead: any) => {
    const firstContact = firstContactByLead.get(lead.id);
    return firstContact !== undefined && firstContact.getTime() - new Date(lead.createdAt).getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  const quotes = await db.select().from(nativeQuotes).where(and(
    gte(nativeQuotes.createdAt, periodStart),
    lt(nativeQuotes.createdAt, periodEnd),
  ));
  const quotesSent = quotes.filter((quote: any) => quote.portalSentAt).length;
  const quotesViewed = quotes.filter((quote: any) => quote.portalViewedAt).length;
  const quotesApproved = quotes.filter((quote: any) => ["approved", "invoiced"].includes(String(quote.status).toLowerCase())).length;

  const reviewJobs = await db.select().from(jobs).where(and(
    eq(jobs.userId, userId),
    gte(jobs.reviewRequestSentAt, periodStart),
    lt(jobs.reviewRequestSentAt, periodEnd),
  ));

  const sourceBreakdown: Record<string, number> = {};
  for (const lead of leads) {
    const source = lead.source ?? "other";
    sourceBreakdown[source] = (sourceBreakdown[source] ?? 0) + 1;
  }

  return {
    periodStart,
    periodEnd,
    leadsCreated: leads.length,
    websiteLeads: leads.filter((lead: any) => lead.source === "website").length,
    respondedWithin24h,
    firstResponseRate: ratioPercent(respondedWithin24h, leads.length),
    quotesCreated: quotes.length,
    quotesSent,
    quoteSentRate: ratioPercent(quotesSent, quotes.length),
    quotesViewed,
    quoteViewRate: ratioPercent(quotesViewed, quotesSent),
    quotesApproved,
    reviewRequestsSent: reviewJobs.length,
    sourceBreakdown,
  };
}
