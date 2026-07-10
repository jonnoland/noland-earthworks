import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { quoteRouter } from "./quoteRouter";
import { contactRouter } from "./contactRouter";
import { opsRouter } from "./opsRouter";
import { jobberRouter } from "./jobberRouter";
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
import { getDb } from "./db";
import { businessSettings } from "../drizzle/schema";

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
  jobber: jobberRouter,
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
});

export type AppRouter = typeof appRouter;
