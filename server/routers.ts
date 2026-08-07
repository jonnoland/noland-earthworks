import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { quoteRouter } from "./quoteRouter";
import { contactRouter } from "./contactRouter";
import { opsRouter } from "./opsRouter";
import { widgetRouter } from "./widgetRouter";
import { agentRouter } from "./agentRouter";
import { reviewsLiveRouter } from "./reviewsRouter";
import { teamRouter } from "./teamRouter";
import { maintenanceRouter } from "./maintenanceRouter";
import { chatRouter } from "./chatRouter";
import { costEstimatorRouter } from "./costEstimatorRouter";
import { fieldQuoteRouter } from "./fieldQuoteRouter";
import { fieldFixRouter } from "./fieldFixRouter";
import { paymentRouter } from "./paymentRouter";
import { galleryRouter } from "./galleryRouter";
import { aiVisibilityRouter } from "./routers/aiVisibility";
import { govContractsRouter } from "./govContractsRouter";
import { routePlannerRouter } from "./routePlannerRouter";
import { quotePortalRouter } from "./quotePortalRouter";
import { nativeQuotesRouter } from "./nativeQuotesRouter";
import { nativeJobsRouter } from "./nativeJobsRouter";
import { nativeClientsRouter } from "./nativeClientsRouter";
import { getDb } from "./db";
import { businessSettings, emailSubscribers, serviceFaqs, seoArticles, opsLeads, nativeQuotes, nativeJobs, nativeInvoices, nativeClients } from "../drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ENV } from "./_core/env";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  quote: quoteRouter,
  contact: contactRouter,
  ops: opsRouter,
  widget: widgetRouter,
  agents: agentRouter,
  reviewsLive: reviewsLiveRouter,
  team: teamRouter,
  maintenance: maintenanceRouter,
  chat: chatRouter,
  costEstimator: costEstimatorRouter,
  fieldQuote: fieldQuoteRouter,
  fieldFix: fieldFixRouter,
  payment: paymentRouter,
  gallery: galleryRouter,
  aiVisibility: aiVisibilityRouter,
  govContracts: govContractsRouter,
  routePlanner: routePlannerRouter,
  quotePortal: quotePortalRouter,
  nativeQuotes: nativeQuotesRouter,
  nativeJobs: nativeJobsRouter,
  nativeClients: nativeClientsRouter,

  /**
   * Email subscribe — public opt-in for seasonal tips and updates.
   */
  emailSubscribe: router({
    subscribe: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        source: z.enum(["homepage", "pricing", "footer"]).default("homepage"),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false, message: "Service unavailable" };
        try {
          // Check if already subscribed
          const existing = await db.select({ id: emailSubscribers.id })
            .from(emailSubscribers)
            .where(eq(emailSubscribers.email, input.email.toLowerCase().trim()))
            .limit(1);
          if (existing.length > 0) {
            return { success: true, message: "already_subscribed" };
          }
          await db.insert(emailSubscribers).values({
            email: input.email.toLowerCase().trim(),
            name: input.name?.trim() || null,
            source: input.source,
          });
          return { success: true, message: "subscribed" };
        } catch (err) {
          console.error("[emailSubscribe] error:", err);
          return { success: false, message: "error" };
        }
      }),
  }),

  /**
   * Public blog — serves published seoArticles to the frontend dynamic route.
   */
  blog: router({
    /** Get a single published article by slug */
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;
        const rows = await db.select()
          .from(seoArticles)
          .where(eq(seoArticles.publishedSlug, input.slug))
          .limit(1);
        const article = rows[0];
        if (!article || article.status !== "published") return null;
        return article;
      }),
    /** List all published articles for the blog index */
    listPublished: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: seoArticles.id,
        title: seoArticles.title,
        metaDescription: seoArticles.metaDescription,
        publishedSlug: seoArticles.publishedSlug,
        publishedAt: seoArticles.publishedAt,
        wordCount: seoArticles.wordCount,
        targetKeyword: seoArticles.targetKeyword,
      })
        .from(seoArticles)
        .where(eq(seoArticles.status, "published"))
        .orderBy(desc(seoArticles.publishedAt));
    }),
  }),

  /**
   * Service page FAQs — dynamic FAQs per service slug with FAQPage schema support.
   */
  serviceFaq: router({
    /** Get active FAQs for a specific service slug */
    getByService: publicProcedure
      .input(z.object({ serviceSlug: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select()
          .from(serviceFaqs)
          .where(eq(serviceFaqs.serviceSlug, input.serviceSlug))
          .orderBy(serviceFaqs.sortOrder);
      }),
  }),

  /**
   * Public site configuration — read-only, no auth required.
   * Used by the homepage promo banner and other public-facing components.
   */
  siteConfig: router({
    getPromoBanner: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { enabled: false, text: "", color: "orange" as const };
      const rows = await db.select({
        promoBannerEnabled: businessSettings.promoBannerEnabled,
        promoBannerText: businessSettings.promoBannerText,
        promoBannerColor: businessSettings.promoBannerColor,
      }).from(businessSettings).limit(1);
      if (!rows.length) return { enabled: false, text: "", color: "orange" as const };
      const r = rows[0];
      return {
        enabled: r.promoBannerEnabled ?? false,
        text: r.promoBannerText ?? "",
        color: (r.promoBannerColor ?? "orange") as "orange" | "green" | "blue" | "red",
      };
    }),
  }),

  /**
   * Read-only ops viewer — key-gated, no login required.
   * Share URL: /ops-view?key=OPS_VIEWER_KEY
   * Used to give external AIs a read-only view of the business dashboard.
   */
  opsViewer: router({
    getData: publicProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        const validKey = ENV.opsViewerKey;
        if (!validKey || input.key !== validKey) {
          throw new Error("Invalid viewer key");
        }
        const db = await getDb();
        if (!db) return null;

        const [leads, quotes, jobs, invoices, clients] = await Promise.all([
          db.select({
            id: opsLeads.id,
            name: opsLeads.name,
            phone: opsLeads.phone,
            email: opsLeads.email,
            jobType: opsLeads.jobType,
            stage: opsLeads.stage,
            aiScore: opsLeads.aiScore,
            aiSummary: opsLeads.aiSummary,
            estimatedValue: opsLeads.estimatedValue,
            createdAt: opsLeads.createdAt,
            nativeQuoteId: opsLeads.nativeQuoteId,
          }).from(opsLeads).orderBy(desc(opsLeads.createdAt)).limit(50),

          db.select({
            id: nativeQuotes.id,
            title: nativeQuotes.title,
            clientName: nativeQuotes.clientName,
            status: nativeQuotes.status,
            totalCents: nativeQuotes.totalCents,
            serviceType: nativeQuotes.serviceType,
            acreage: nativeQuotes.acreage,
            createdAt: nativeQuotes.createdAt,
          }).from(nativeQuotes).orderBy(desc(nativeQuotes.createdAt)).limit(50),

          db.select({
            id: nativeJobs.id,
            clientName: nativeJobs.clientName,
            status: nativeJobs.status,
            scheduledDate: nativeJobs.scheduledDate,
            serviceType: nativeJobs.serviceType,
            totalCents: nativeJobs.totalCents,
            createdAt: nativeJobs.createdAt,
          }).from(nativeJobs).orderBy(desc(nativeJobs.createdAt)).limit(50),

          db.select({
            id: nativeInvoices.id,
            clientName: nativeInvoices.clientName,
            status: nativeInvoices.status,
            totalCents: nativeInvoices.totalCents,
            paidAt: nativeInvoices.paidAt,
            createdAt: nativeInvoices.createdAt,
          }).from(nativeInvoices).orderBy(desc(nativeInvoices.createdAt)).limit(50),

          db.select({
            id: nativeClients.id,
            name: nativeClients.name,
            email: nativeClients.email,
            phone: nativeClients.phone,
            address: nativeClients.address,
            jobCount: nativeClients.jobCount,
            totalSpentCents: nativeClients.totalSpentCents,
            createdAt: nativeClients.createdAt,
          }).from(nativeClients).orderBy(desc(nativeClients.createdAt)).limit(100),
        ]);

        // Aggregate KPIs
        const totalRevenue = invoices
          .filter(i => i.status === "paid")
          .reduce((sum, i) => sum + (i.totalCents ?? 0), 0);
        const openQuotesValue = quotes
          .filter(q => ["draft", "sent", "viewed"].includes(q.status ?? ""))
          .reduce((sum, q) => sum + (q.totalCents ?? 0), 0);
        const activeJobs = jobs.filter(j => j.status === "in_progress" || j.status === "scheduled").length;

        return {
          generatedAt: new Date().toISOString(),
          kpis: {
            totalLeads: leads.length,
            totalClients: clients.length,
            totalQuotes: quotes.length,
            totalJobs: jobs.length,
            totalInvoices: invoices.length,
            totalRevenueCents: totalRevenue,
            openQuotesValueCents: openQuotesValue,
            activeJobs,
          },
          leads,
          quotes,
          jobs,
          invoices,
          clients,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
