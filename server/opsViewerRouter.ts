import { timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { desc, sql } from "drizzle-orm";
import {
  nativeInvoices,
  nativeJobs,
  nativeQuotes,
  quoteSubmissions,
} from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

const viewerKeyInput = z.object({ key: z.string().min(1).max(256) });

/**
 * The viewer key is deliberately validated only on the server. A constant-time
 * comparison avoids turning the authorization check into a key-guessing oracle.
 */
export function isOpsViewerKeyValid(submittedKey: string, configuredKey = ENV.opsViewerKey): boolean {
  if (!configuredKey || submittedKey.length !== configuredKey.length) return false;
  return timingSafeEqual(Buffer.from(submittedKey), Buffer.from(configuredKey));
}

function requireViewerKey(key: string) {
  if (!isOpsViewerKeyValid(key)) {
    // Do not disclose whether the route, key, or business data exists.
    throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
  }
}

/**
 * Narrow external briefing surface. This is intentionally separate from the
 * authenticated Ops router and exposes no contact details, addresses, notes,
 * portal tokens, attachments, or editable actions.
 */
export const opsViewerRouter = router({
  verifyAccess: publicProcedure.input(viewerKeyInput).query(({ input }) => {
    requireViewerKey(input.key);
    return { authorized: true } as const;
  }),

  getBriefing: publicProcedure.input(viewerKeyInput).query(async ({ input }) => {
    requireViewerKey(input.key);
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Briefing temporarily unavailable." });
    }

    const [websiteRequests, quotes, jobs, invoices, paidRevenue, openQuoteValue] = await Promise.all([
      db.select({
        id: quoteSubmissions.id,
        name: quoteSubmissions.name,
        service: quoteSubmissions.service,
        county: quoteSubmissions.county,
        acreage: quoteSubmissions.acreage,
        aiScore: quoteSubmissions.aiScore,
        nativeQuoteId: quoteSubmissions.nativeQuoteId,
        createdAt: quoteSubmissions.createdAt,
      }).from(quoteSubmissions).orderBy(desc(quoteSubmissions.createdAt)).limit(40),
      db.select({
        id: nativeQuotes.id,
        title: nativeQuotes.title,
        clientName: nativeQuotes.clientName,
        serviceType: nativeQuotes.serviceType,
        acreage: nativeQuotes.acreage,
        status: nativeQuotes.status,
        totalCents: nativeQuotes.totalCents,
        createdAt: nativeQuotes.createdAt,
      }).from(nativeQuotes).orderBy(desc(nativeQuotes.createdAt)).limit(50),
      db.select({
        id: nativeJobs.id,
        clientName: nativeJobs.clientName,
        serviceType: nativeJobs.serviceType,
        status: nativeJobs.status,
        scheduledDate: nativeJobs.scheduledDate,
        totalCents: nativeJobs.totalCents,
        createdAt: nativeJobs.createdAt,
      }).from(nativeJobs).orderBy(desc(nativeJobs.createdAt)).limit(50),
      db.select({
        id: nativeInvoices.id,
        clientName: nativeInvoices.clientName,
        serviceType: nativeInvoices.serviceType,
        status: nativeInvoices.status,
        totalCents: nativeInvoices.totalCents,
        paidAt: nativeInvoices.paidAt,
        createdAt: nativeInvoices.createdAt,
      }).from(nativeInvoices).orderBy(desc(nativeInvoices.createdAt)).limit(50),
      db.select({ totalCents: sql<number>`COALESCE(SUM(CASE WHEN ${nativeInvoices.status} = 'paid' THEN ${nativeInvoices.totalCents} ELSE 0 END), 0)` })
        .from(nativeInvoices),
      db.select({ totalCents: sql<number>`COALESCE(SUM(CASE WHEN ${nativeQuotes.status} IN ('draft', 'sent', 'viewed', 'approved') THEN ${nativeQuotes.totalCents} ELSE 0 END), 0)` })
        .from(nativeQuotes),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        recentWebsiteRequests: websiteRequests.length,
        recentQuotes: quotes.length,
        activeJobs: jobs.filter((job) => job.status === "scheduled" || job.status === "in_progress").length,
        openQuoteValueCents: Number(openQuoteValue[0]?.totalCents ?? 0),
        paidRevenueCents: Number(paidRevenue[0]?.totalCents ?? 0),
      },
      websiteRequests,
      quotes,
      jobs,
      invoices,
    };
  }),
});
