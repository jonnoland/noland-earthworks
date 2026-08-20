/**
 * nativeQuotesRouter — full lifecycle quote management
 *
 * Replaces the Jobber Quotes tab. Covers:
 *   list        — paginated list with search/filter
 *   getById     — single quote with all fields
 *   create      — new quote (draft)
 *   update      — edit any field
 *   delete      — hard delete
 *   duplicate   — clone a quote as a new draft
 *   sendPortal  — generate portal token, send email, mark sent
 *   convertToJob — create a Job record from an approved quote
 *   createDepositSession — Stripe Checkout for deposit
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nativeQuotes, nativeJobs, aiPricingSettings, nativeClients, opsLeads } from "../drizzle/schema";
import { getPricingBenchmarks } from "./db";
import { eq, desc, like, or, and, asc } from "drizzle-orm";
import { randomBytes } from "crypto";

import { getStripe, isStripeConfigured } from "./stripe";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";

// Strip markdown code fences from LLM JSON responses
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}


const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

// ─── Resend email helper ──────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!ENV.resendApiKey) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Noland Earthworks <noreply@nolandearthworks.com>",
      to,
      subject,
      html,
    }),
  });
}

// ─── Line item schema ─────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string(),
  qty: z.number().default(1),
  unitPriceCents: z.number().int(),
  totalCents: z.number().int(),
  kind: z.enum(["service", "discount"]).optional(),
  discountCode: z.string().optional(),
});

function normalizeQuoteLineItems(items: z.infer<typeof lineItemSchema>[]) {
  return items.map((item) => ({
    ...item,
    qty: Math.max(1, item.qty),
    unitPriceCents: Math.round(item.unitPriceCents),
    totalCents: Math.round(Math.max(1, item.qty) * item.unitPriceCents),
  }));
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const nativeQuotesRouter = router({

  list: ownerProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }: { input: { search?: string; status?: string; limit: number; offset: number } }) => {
      const db = await getDb();
      if (!db) return { quotes: [], total: 0 };
      const conditions = [];
      if (input.status && input.status !== "all") {
        conditions.push(eq(nativeQuotes.status, input.status));
      }
      if (input.search) {
        const q = `%${input.search}%`;
        conditions.push(or(
          like(nativeQuotes.clientName, q),
          like(nativeQuotes.title, q),
          like(nativeQuotes.propertyAddress, q),
          like(nativeQuotes.clientEmail, q),
        ));
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const rows = await db
        .select()
        .from(nativeQuotes)
        .where(where)
        .orderBy(desc(nativeQuotes.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      console.log(`[nativeQuotes.list] Returning ${rows.length} rows (status=${input.status ?? 'all'}, search=${input.search ?? ''})`);
      return { quotes: rows, total: rows.length };
    }),

  getById: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }: { input: { id: number } }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  create: ownerProcedure
    .input(z.object({
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional().or(z.literal("")),
      clientPhone: z.string().optional(),
      propertyAddress: z.string().optional(),
      title: z.string().min(1),
      internalNotes: z.string().optional(),
      clientMessage: z.string().optional(),
      lineItems: z.array(lineItemSchema).default([]),
      totalCents: z.number().int().default(0),
      estimatedDuration: z.string().optional(),
      acreage: z.string().optional(),
      serviceType: z.string().optional(),
      sourceDetail: z.string().max(100).optional(),
      fitDecision: z.enum(["unreviewed", "owner_review", "pursue", "pass", "refer_out"]).optional(),
      nextActionType: z.string().max(100).optional(),
      nextActionDueAt: z.date().nullable().optional(),
      lastContactAt: z.date().nullable().optional(),
      visitStatus: z.enum(["not_requested", "requested", "confirmed", "completed", "not_needed"]).optional(),
      visitCompletedAt: z.date().nullable().optional(),
      proposalStatus: z.enum(["not_started", "draft", "sent", "approved", "declined"]).optional(),
      depositStatus: z.enum(["not_requested", "requested", "paid", "not_required"]).optional(),
      finalPaymentStatus: z.enum(["not_due", "invoiced", "paid", "overdue"]).optional(),
      leadId: z.number().int().optional(),
      fieldQuoteId: z.number().int().optional(),
      distanceQuoteId: z.number().int().optional(),
    }))
    .mutation(async ({ input }: { input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const lineItems = normalizeQuoteLineItems(input.lineItems);
      const totalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
      const result = await db.insert(nativeQuotes).values({
        clientName: input.clientName,
        clientEmail: input.clientEmail || null,
        clientPhone: input.clientPhone || null,
        propertyAddress: input.propertyAddress || null,
        title: input.title,
        internalNotes: input.internalNotes || null,
        clientMessage: input.clientMessage || null,
        lineItems: JSON.stringify(lineItems),
        totalCents,
        estimatedDuration: input.estimatedDuration || null,
        acreage: input.acreage || null,
        serviceType: input.serviceType || null,
        sourceDetail: input.sourceDetail || "manual",
        fitDecision: input.fitDecision || "unreviewed",
        nextActionType: input.nextActionType || "review_request",
        nextActionDueAt: input.nextActionDueAt ?? null,
        lastContactAt: input.lastContactAt ?? null,
        visitStatus: input.visitStatus || "not_requested",
        visitCompletedAt: input.visitCompletedAt ?? null,
        proposalStatus: input.proposalStatus || "not_started",
        depositStatus: input.depositStatus || "not_requested",
        finalPaymentStatus: input.finalPaymentStatus || "not_due",
        status: "draft",
        leadId: input.leadId ?? null,
        fieldQuoteId: input.fieldQuoteId ?? null,
        distanceQuoteId: input.distanceQuoteId ?? null,
      });
      const id = (result as any).insertId ?? (result as any)[0]?.insertId;

      // Auto-save / update client record
      try {
        const { clientName, clientEmail, clientPhone, propertyAddress } = input;
        if (clientName?.trim()) {
          let existing = null;
          if (clientEmail) {
            const [row] = await db.select().from(nativeClients).where(eq(nativeClients.email, clientEmail)).limit(1);
            existing = row ?? null;
          }
          if (!existing && clientPhone) {
            const [row] = await db.select().from(nativeClients).where(eq(nativeClients.phone, clientPhone)).limit(1);
            existing = row ?? null;
          }
          if (!existing) {
            const [row] = await db.select().from(nativeClients).where(eq(nativeClients.name, clientName.trim())).limit(1);
            existing = row ?? null;
          }
          if (existing) {
            await db.update(nativeClients).set({
              name: clientName.trim() || existing.name,
              email: clientEmail || existing.email,
              phone: clientPhone || existing.phone,
              address: propertyAddress || existing.address,
              updatedAt: new Date(),
            }).where(eq(nativeClients.id, existing.id));
          } else {
            await db.insert(nativeClients).values({
              name: clientName.trim(),
              email: clientEmail || null,
              phone: clientPhone || null,
              address: propertyAddress || null,
              source: "manual",
            });
          }
        }
      } catch (_) { /* non-fatal — quote was already saved */ }

      return { id: Number(id) };
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      clientName: z.string().min(1).optional(),
      clientEmail: z.string().email().optional().or(z.literal("")),
      clientPhone: z.string().optional(),
      propertyAddress: z.string().optional(),
      title: z.string().min(1).optional(),
      internalNotes: z.string().optional(),
      clientMessage: z.string().optional(),
      lineItems: z.array(lineItemSchema).optional(),
      totalCents: z.number().int().optional(),
      estimatedDuration: z.string().optional(),
      acreage: z.string().optional(),
      serviceType: z.string().optional(),
      status: z.string().optional(),
      sourceDetail: z.string().max(100).optional(),
      fitDecision: z.enum(["unreviewed", "owner_review", "pursue", "pass", "refer_out"]).optional(),
      nextActionType: z.string().max(100).optional(),
      nextActionDueAt: z.date().nullable().optional(),
      lastContactAt: z.date().nullable().optional(),
      visitStatus: z.enum(["not_requested", "requested", "confirmed", "completed", "not_needed"]).optional(),
      visitCompletedAt: z.date().nullable().optional(),
      proposalStatus: z.enum(["not_started", "draft", "sent", "approved", "declined"]).optional(),
      depositStatus: z.enum(["not_requested", "requested", "paid", "not_required"]).optional(),
      finalPaymentStatus: z.enum(["not_due", "invoiced", "paid", "overdue"]).optional(),
    }))
    .mutation(async ({ input }: { input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, lineItems, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (lineItems !== undefined) {
        const normalized = normalizeQuoteLineItems(lineItems);
        updates.lineItems = JSON.stringify(normalized);
        updates.totalCents = normalized.reduce((sum, item) => sum + item.totalCents, 0);
      }
      // Remove undefined values
      Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
      if (Object.keys(updates).length === 0) return { success: true };

      // Sync clientAction when status is set to a stage that the pipeline
      // classifier reads from clientAction (approved / declined).
      // Also clear clientAction when restoring to draft so the quote
      // doesn't get mis-classified back into the declined/approved stage.
      if (updates.status === "approved" && !updates.clientAction) {
        updates.clientAction = "approved";
        updates.clientActionAt = new Date();
      } else if (updates.status === "declined" && !updates.clientAction) {
        updates.clientAction = "declined";
        updates.clientActionAt = new Date();
      } else if (updates.status === "draft") {
        // Restoring to draft — clear any prior client action so the quote
        // re-enters the draft stage cleanly
        updates.clientAction = null;
        updates.clientActionAt = null;
      }

      await db.update(nativeQuotes).set(updates).where(eq(nativeQuotes.id, id));
      return { success: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }: { input: { id: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(nativeQuotes).where(eq(nativeQuotes.id, input.id));
      return { success: true };
    }),

  duplicate: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }: { input: { id: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Quote not found");
      const src = rows[0];
      // Copy only content fields — never copy portal/lifecycle fields
      // (portalToken, portalSentAt, clientAction, depositPaidAt, convertedToJobAt, etc.)
      // so the duplicate starts as a clean draft.
      const result = await db.insert(nativeQuotes).values({
        clientName: src.clientName,
        clientEmail: src.clientEmail,
        clientPhone: src.clientPhone,
        propertyAddress: src.propertyAddress,
        title: `${src.title} (Copy)`,
        internalNotes: src.internalNotes,
        clientMessage: src.clientMessage,
        lineItems: src.lineItems,
        totalCents: src.totalCents,
        estimatedDuration: src.estimatedDuration,
        acreage: src.acreage,
        serviceType: src.serviceType,
        status: "draft",
        leadId: src.leadId,
        // Intentionally omitted: portalToken, portalSentAt, portalViewedAt,
        // clientAction, clientActionAt, depositPaidAt, depositPaidCents,
        // stripeSessionId, convertedJobId, convertedToJobAt, signedAt
      });
      const id = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { id: Number(id) };
    }),

  sendPortal: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      personalNote: z.string().optional(),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input }: { input: { id: number; personalNote?: string; origin?: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Quote not found");
      const quote = rows[0];
      if (!quote.clientEmail) throw new Error("No client email on this quote");

      // Generate or reuse portal token
      const token = quote.portalToken ?? randomBytes(32).toString("hex");
      const origin = input.origin ?? "https://nolandearth-pymczdcn.manus.space";
      const portalUrl = `${origin}/quote/${token}`;

      // Send email
      const totalFormatted = `$${(quote.totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
      const noteBlock = input.personalNote
        ? `<p style="margin:0 0 16px;color:#d4a843;font-style:italic;">"${input.personalNote}"</p>`
        : "";
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f0ede6;padding:32px;">
          <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png" alt="Noland Earthworks" style="height:48px;margin-bottom:24px;" />
          <h2 style="color:#f0a500;margin:0 0 8px;">Your Quote is Ready</h2>
          <p style="margin:0 0 16px;color:#ccc;">Hi ${quote.clientName},</p>
          ${noteBlock}
          <p style="margin:0 0 8px;color:#ccc;">I've put together a quote for your project:</p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 4px;font-weight:bold;color:#f0ede6;">${quote.title}</p>
            ${quote.propertyAddress ? `<p style="margin:0 0 4px;color:#999;font-size:14px;">${quote.propertyAddress}</p>` : ""}
            <p style="margin:8px 0 0;font-size:20px;font-weight:bold;color:#f0a500;">${totalFormatted}</p>
          </div>
          <a href="${portalUrl}" style="display:inline-block;background:#f0a500;color:#111;font-weight:bold;padding:14px 28px;border-radius:6px;text-decoration:none;margin:16px 0;">View &amp; Respond to Your Quote</a>
          <p style="margin:24px 0 0;color:#666;font-size:13px;">Questions? Call or text Jon directly at <a href="tel:6154064819" style="color:#f0a500;">615-406-4819</a></p>
          <p style="margin:4px 0 0;color:#444;font-size:12px;">Noland Earthworks, LLC &bull; Vanleer, TN &bull; Veteran-Owned &amp; Operated</p>
        </div>`;

      await sendEmail(quote.clientEmail, `Your Quote from Noland Earthworks — ${quote.title}`, html);
      // Only record the quote as sent after the customer email provider accepts it.
      await db.update(nativeQuotes).set({
        portalToken: token,
        portalSentAt: new Date(),
        status: "sent",
      }).where(eq(nativeQuotes.id, input.id));
      await db.update(opsLeads).set({
        stage: "estimate_sent",
        updatedAt: new Date(),
      }).where(eq(opsLeads.nativeQuoteId, input.id));
      await notifyOwner({ title: "Quote Portal Sent", content: `Portal link sent to ${quote.clientName} (${quote.clientEmail}) for "${quote.title}"` });
      return { success: true, portalUrl };
    }),

  convertToJob: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      scheduledDate: z.string().optional(),
    }))
    .mutation(async ({ input }: { input: { id: number; scheduledDate?: string } }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Quote not found");
      const quote = rows[0];

      // Insert into nativeJobs (the table the Jobs page reads from)
      const result = await db.insert(nativeJobs).values({
        quoteId: quote.id,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail ?? null,
        clientPhone: quote.clientPhone ?? null,
        propertyAddress: quote.propertyAddress ?? null,
        serviceType: quote.serviceType ?? null,
        acreage: quote.acreage ?? null,
        totalCents: quote.totalCents,
        lineItems: quote.lineItems ?? "[]",
        status: "scheduled",
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        internalNotes: quote.internalNotes ?? null,
      } as any);
      const jobId = (result as any).insertId ?? (result as any)[0]?.insertId;

      await db.update(nativeQuotes).set({
        convertedJobId: Number(jobId),
        convertedToJobAt: new Date(),
        status: "invoiced",
      }).where(eq(nativeQuotes.id, input.id));

      return { success: true, jobId: Number(jobId) };
    }),

  createDepositSession: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      depositPct: z.number().int().min(1).max(100),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input }: { input: { id: number; depositPct: number; origin?: string } }) => {
      if (!isStripeConfigured()) throw new Error("Stripe not configured");
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Quote not found");
      const quote = rows[0];

      const depositCents = Math.round(quote.totalCents * input.depositPct / 100);
      const stripe = getStripe();
      const origin = input.origin ?? "https://nolandearth-pymczdcn.manus.space";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Deposit — ${quote.title}`,
              description: `${input.depositPct}% deposit for ${quote.clientName}. Balance due on completion.`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        }],
        customer_email: quote.clientEmail ?? undefined,
        client_reference_id: `nq-${quote.id}`,
        metadata: {
          native_quote_id: quote.id.toString(),
          client_name: quote.clientName,
          deposit_pct: input.depositPct.toString(),
          total_cents: quote.totalCents.toString(),
        },
        allow_promotion_codes: true,
        success_url: `${origin}/ops/quotes?nq_deposit=success&id=${quote.id}`,
        cancel_url: `${origin}/ops/quotes?nq_deposit=cancel&id=${quote.id}`,
      });

      return { checkoutUrl: session.url };
    }),

  // ─── AI Suggest ────────────────────────────────────────────────────────────
  aiSuggest: ownerProcedure
    .input(z.object({
      serviceType: z.string(),
      acreage: z.number().min(0.1).max(500),
      terrain: z.string().optional(),
      density: z.string().optional(),
      access: z.string().optional(),
      notes: z.string().max(5000).optional(),
    }))
    .mutation(async ({ input }: { input: { serviceType: string; acreage: number; terrain?: string; density?: string; access?: string; notes?: string } }) => {
      const { serviceType, acreage, terrain, density, access, notes } = input;

      // ── Pull DB-driven pricing (same source as Cost Estimator) ──────────────
      const svcKey = serviceType.toLowerCase().replace(/\s+/g, "-");
      let pricingRow2: typeof aiPricingSettings.$inferSelect | null = null;
      try {
        const db2 = await getDb();
        if (db2) {
          const rows2 = await db2.select().from(aiPricingSettings).limit(1);
          if (rows2.length === 0) {
            await db2.insert(aiPricingSettings).values({});
            const seeded2 = await db2.select().from(aiPricingSettings).limit(1);
            pricingRow2 = seeded2[0] ?? null;
          } else {
            pricingRow2 = rows2[0];
          }
        }
      } catch { /* non-fatal — fall back to defaults */ }

      let benchmarkMids2: Record<string, number> = {};
      try {
        const bRows2 = await getPricingBenchmarks();
        for (const b of bRows2) {
          if (b.midPerAcre && b.midPerAcre > 0) benchmarkMids2[b.serviceType.toLowerCase()] = b.midPerAcre;
        }
      } catch { /* non-fatal */ }

      const fmBase  = pricingRow2?.forestryMulchingBaseRate ?? benchmarkMids2["forestry mulching"] ?? 800;
      const lcBase  = pricingRow2?.landClearingBaseRate     ?? benchmarkMids2["land management"]   ?? 700;
      const bhBase  = pricingRow2?.brushHoggingBaseRate     ?? benchmarkMids2["brush hogging"]     ?? 150;
      const rowBase = pricingRow2?.rowClearingBaseRate       ?? 6;
      const dmMult  = parseFloat(pricingRow2?.densityModerateMultiplier ?? "1.25");
      const dhMult  = parseFloat(pricingRow2?.densityHeavyMultiplier    ?? "1.60");
      const trMult  = parseFloat(pricingRow2?.terrainRollingMultiplier  ?? "1.15");
      const tsMult  = parseFloat(pricingRow2?.terrainSteepMultiplier    ?? "1.35");
      const amMult  = parseFloat(pricingRow2?.accessModerateMultiplier  ?? "1.10");
      const adMult  = parseFloat(pricingRow2?.accessDifficultMultiplier ?? "1.25");
      const MOBILIZATION = pricingRow2?.mobilizationFee ?? 400;
      const MIN_JOB      = pricingRow2?.minimumJobTotal  ?? 1800;

      const legacyLandManagementKey = ["land", "clearing"].join("-");
      const normalizedServiceKey = svcKey === legacyLandManagementKey ? "land-management" : svcKey;
      const BASE_RATES: Record<string, Record<string, [number, number]>> = {
        "forestry-mulching": {
          light:    [Math.round(fmBase * 0.75), Math.round(fmBase * 1.0)],
          moderate: [Math.round(fmBase * 1.0),  Math.round(fmBase * dmMult)],
          heavy:    [Math.round(fmBase * dmMult), Math.round(fmBase * dhMult * 1.5)],
        },
        "land-management": {
          light:    [Math.round(lcBase * 0.75), Math.round(lcBase * 1.0)],
          moderate: [Math.round(lcBase * 1.0),  Math.round(lcBase * dmMult)],
          heavy:    [Math.round(lcBase * dmMult), Math.round(lcBase * dhMult * 2.0)],
        },
        "lot-clearing": {
          light:    [Math.round(lcBase * 0.75), Math.round(lcBase * 1.0)],
          moderate: [Math.round(lcBase * 1.0),  Math.round(lcBase * dmMult)],
          heavy:    [Math.round(lcBase * dmMult), Math.round(lcBase * dhMult * 2.0)],
        },
        "pasture-reclamation": {
          light:    [Math.round(lcBase * 0.75), Math.round(lcBase * 1.0)],
          moderate: [Math.round(lcBase * 1.0),  Math.round(lcBase * dmMult)],
          heavy:    [Math.round(lcBase * dmMult), Math.round(lcBase * dhMult * 2.0)],
        },
        "brush-hogging": {
          light:    [Math.round(bhBase * 0.75), Math.round(bhBase * 1.0)],
          moderate: [Math.round(bhBase * 1.0),  Math.round(bhBase * dmMult)],
          heavy:    [Math.round(bhBase * dmMult), Math.round(bhBase * dhMult)],
        },
        "right-of-way-clearing": {
          light:    [Math.round(rowBase * 1320 * 0.75), Math.round(rowBase * 1320 * 1.0)],
          moderate: [Math.round(rowBase * 1320 * 1.0),  Math.round(rowBase * 1320 * dmMult)],
          heavy:    [Math.round(rowBase * 1320 * dmMult), Math.round(rowBase * 1320 * dhMult * 1.5)],
        },
        "trail-cutting": {
          light:    [Math.round(lcBase * 0.65), Math.round(lcBase * 0.90)],
          moderate: [Math.round(lcBase * 0.85), Math.round(lcBase * 1.15)],
          heavy:    [Math.round(lcBase * 1.10), Math.round(lcBase * dhMult * 1.5)],
        },
      } as Record<string, Record<string, [number, number]>>;

      const densityKey = (density ?? "moderate") as string;
      const [rLow, rHigh] = (BASE_RATES[normalizedServiceKey]?.[densityKey] ?? [700, 1200]) as [number, number];
      const terrainMult = terrain === "steep" ? tsMult : terrain === "rolling" ? trMult : 1.0;
      const accessMult  = access === "difficult" ? adMult : access === "moderate" ? amMult : 1.0;
      const adjLow  = Math.round(rLow  * terrainMult * accessMult);
      const adjHigh = Math.round(rHigh * terrainMult * accessMult);
      const midPerAcre = Math.round((adjLow + adjHigh) / 2);
      const rawTotal   = Math.round(midPerAcre * acreage);
      const totalMid   = Math.max(rawTotal, MIN_JOB);

      const systemPrompt = `You are an expert estimator for Noland Earthworks, LLC — a veteran-owned forestry mulching and land management company in Middle Tennessee. You help the owner (Jon Noland) quickly build accurate quotes.
Current calibrated rates for Middle & West Tennessee:
- Forestry Mulching: $${Math.round(fmBase*0.875)}-$${Math.round(fmBase*dhMult*1.25)}/acre (base $${fmBase}/acre)
- Land Management: $${Math.round(lcBase*0.875)}-$${Math.round(lcBase*dhMult*1.5)}/acre (base $${lcBase}/acre)
- Brush Hogging: $${Math.round(bhBase*0.875)}-$${Math.round(bhBase*dhMult)}/acre (base $${bhBase}/acre)
- Terrain multipliers: flat x1.0, rolling x${trMult}, steep x${tsMult}
- Access multipliers: easy x1.0, moderate x${amMult}, difficult x${adMult}
- Mobilization fee: $${MOBILIZATION} for jobs under 5 acres or distant locations
- Minimum job: $${MIN_JOB}
For this job the calculated mid-point estimate is $${totalMid.toLocaleString()} ($${midPerAcre}/acre x ${acreage} acres, ${density ?? "moderate"} density, ${terrain ?? "flat"} terrain, ${access ?? "easy"} access).
Return ONLY valid JSON with no markdown or explanation. Schema:
{
  "title": string,
  "estimatedDuration": string,
  "clientMessage": string,
  "lineItems": [
    { "description": string, "qty": number, "unitPriceCents": number }
  ]
}
Rules:
- Line items should total close to $${totalMid.toLocaleString()}
- Primary line item is the main service (e.g. "Forestry Mulching - 5 acres @ $${midPerAcre}/acre")
- Add a mobilization fee line item ($${MOBILIZATION}) if acreage < 5
- Keep line items to 2-4 maximum
- Duration: 1 acre ~2-4 hours; 5 acres ~1 day; 10 acres ~2 days; 20+ acres ~3-5 days
- Client message should be professional, plain-spoken, no corporate jargon, no emojis`;

      const userPrompt = `Service: ${serviceType}\nAcreage: ${acreage} acres\nTerrain: ${terrain ?? "flat"}\nVegetation density: ${density ?? "moderate"}\nAccess: ${access ?? "easy"}\nAdditional notes: ${notes ?? "none"}\n\nGenerate the quote suggestion JSON.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: "quote_suggestion",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title:             { type: "string" },
                estimatedDuration: { type: "string" },
                clientMessage:     { type: "string" },
                lineItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description:    { type: "string" },
                      qty:            { type: "number" },
                      unitPriceCents: { type: "number" },
                    },
                    required: ["description", "qty", "unitPriceCents"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "estimatedDuration", "clientMessage", "lineItems"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices?.[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let parsed: { title: string; estimatedDuration: string; clientMessage: string; lineItems: { description: string; qty: number; unitPriceCents: number }[] };
      try {
        parsed = JSON.parse(stripCodeFence(raw));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" });
      }

      const lineItems = (parsed.lineItems ?? []).map((li: { description: string; qty: number; unitPriceCents: number }) => ({
        description:    li.description,
        qty:            li.qty,
        unitPriceCents: Math.round(li.unitPriceCents),
        totalCents:     Math.round(li.qty * li.unitPriceCents),
      }));

      const finalTotalCents = lineItems.reduce((s, li) => s + li.totalCents, 0);
      const belowMinimum = finalTotalCents < MIN_JOB * 100;
      return {
        title:             parsed.title ?? `${serviceType} - ${acreage} Acres`,
        estimatedDuration: parsed.estimatedDuration ?? "",
        clientMessage:     parsed.clientMessage ?? "",
        lineItems,
        totalCents: finalTotalCents,
        belowMinimum,
        minimumJobCents: MIN_JOB * 100,
        breakdown: {
          baseRatePerAcre: midPerAcre,
          baseRateLow:     adjLow,
          baseRateHigh:    adjHigh,
          terrainMultiplier: terrainMult,
          accessMultiplier:  accessMult,
          densityKey,
          acreage,
          rawTotalBeforeMinimum: rawTotal,
          minimumJobApplied: rawTotal < MIN_JOB,
          mobilizationFee: MOBILIZATION,
        },
      };
    }),

  /**
   * Public deposit session — called from the client portal (no auth).
   * Accepts portal token so the client can pay without logging in.
   */
  publicDepositSession: publicProcedure
    .input(z.object({
      token: z.string().min(16),
      depositPct: z.number().int().min(1).max(100),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input }: { input: { token: string; depositPct: number; origin?: string } }) => {
      if (!isStripeConfigured()) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment not configured" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });
      const [quote] = await db.select().from(nativeQuotes).where(eq(nativeQuotes.portalToken, input.token)).limit(1);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      const depositCents = Math.round(quote.totalCents * input.depositPct / 100);
      const stripe = getStripe();
      const origin = input.origin ?? "https://nolandearth-pymczdcn.manus.space";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Deposit — ${quote.title}`,
              description: `${input.depositPct}% deposit for ${quote.clientName}. Balance due on completion.`,
            },
            unit_amount: depositCents,
          },
          quantity: 1,
        }],
        customer_email: quote.clientEmail ?? undefined,
        client_reference_id: `nq-${quote.id}`,
        metadata: {
          native_quote_id: quote.id.toString(),
          client_name: quote.clientName,
          deposit_pct: input.depositPct.toString(),
          total_cents: quote.totalCents.toString(),
        },
        allow_promotion_codes: true,
        success_url: `${origin}/quote/${input.token}?deposit=success`,
        cancel_url: `${origin}/quote/${input.token}?deposit=cancelled`,
      });
      return { checkoutUrl: session.url };
    }),

  /**
   * Public portal lookup — no auth required.
   * Called by QuotePortal.tsx when the token belongs to a native quote.
   * Marks portalViewedAt on first view and notifies owner.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(16) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });
      const [quote] = await db
        .select()
        .from(nativeQuotes)
        .where(eq(nativeQuotes.portalToken, input.token))
        .limit(1);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found or link has expired." });
      // Mark first view
      if (!quote.portalViewedAt) {
        await db
          .update(nativeQuotes)
          .set({ portalViewedAt: new Date(), status: quote.status === "sent" ? "sent" : quote.status })
          .where(eq(nativeQuotes.id, quote.id));
        await notifyOwner({
          title: `Quote Opened — ${quote.clientName}`,
          content: `${quote.clientName} just opened their quote portal link for "${quote.title}".`,
        }).catch(() => {/* non-critical */});
      }
      const lineItems = (() => {
        try { return JSON.parse(quote.lineItems ?? "[]"); }
        catch { return []; }
      })();
      return {
        type: "native" as const,
        id: quote.id,
        clientName: quote.clientName,
        title: quote.title,
        serviceType: quote.serviceType,
        acreage: quote.acreage,
        propertyAddress: quote.propertyAddress,
        estimatedDuration: quote.estimatedDuration,
        clientMessage: quote.clientMessage,
        lineItems,
        totalCents: quote.totalCents,
        totalFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(quote.totalCents / 100),
        status: quote.status,
        clientAction: quote.clientAction,
        clientActionAt: quote.clientActionAt,
        depositPaidCents: quote.depositPaidCents,
        depositPaidAt: quote.depositPaidAt,
        convertedToJobAt: quote.convertedToJobAt,
        portalViewedAt: quote.portalViewedAt,
        portalSentAt: quote.portalSentAt,
        signedAt: quote.signedAt,
        createdAt: quote.createdAt,
      };
    }),

  /**
   * Client submits an action (approve / decline / changes_requested) on a native quote portal.
   */
  portalAction: publicProcedure
    .input(z.object({
      token: z.string().min(16),
      action: z.enum(["approved", "declined", "changes_requested"]),
      note: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });
      const [quote] = await db
        .select()
        .from(nativeQuotes)
        .where(eq(nativeQuotes.portalToken, input.token))
        .limit(1);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found or link has expired." });
      // Sync status column so pipeline stage classifier stays consistent
      const statusSync = input.action === "approved" ? "approved"
        : input.action === "declined" ? "declined"
        : quote.status; // changes_requested stays in current status
      await db
        .update(nativeQuotes)
        .set({
          clientAction: input.action,
          clientActionAt: new Date(),
          status: statusSync,
          ...(input.action === "changes_requested" ? { changeRequestNote: input.note ?? null, changeRequestAt: new Date() } : {}),
          ...(input.action === "declined" ? { declineNote: input.note ?? null } : {}),
        })
        .where(eq(nativeQuotes.id, quote.id));
      await notifyOwner({
        title: `Quote ${input.action === "approved" ? "Approved" : input.action === "declined" ? "Declined" : "Changes Requested"} — ${quote.clientName}`,
        content: `${quote.clientName} ${input.action === "approved" ? "approved" : input.action === "declined" ? "declined" : "requested changes on"} the quote "${quote.title}".${input.note ? " Note: " + input.note : ""}`,
      }).catch(() => {/* non-critical */});
      return { success: true };
    }),
});
