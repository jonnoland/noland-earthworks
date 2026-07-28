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
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nativeQuotes, jobs } from "../drizzle/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import { randomBytes } from "crypto";

import { getStripe, isStripeConfigured } from "./stripe";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";

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
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const nativeQuotesRouter = router({

  list: ownerProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
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
      leadId: z.number().int().optional(),
      fieldQuoteId: z.number().int().optional(),
      distanceQuoteId: z.number().int().optional(),
    }))
    .mutation(async ({ input }: { input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(nativeQuotes).values({
        clientName: input.clientName,
        clientEmail: input.clientEmail || null,
        clientPhone: input.clientPhone || null,
        propertyAddress: input.propertyAddress || null,
        title: input.title,
        internalNotes: input.internalNotes || null,
        clientMessage: input.clientMessage || null,
        lineItems: JSON.stringify(input.lineItems),
        totalCents: input.totalCents,
        estimatedDuration: input.estimatedDuration || null,
        acreage: input.acreage || null,
        serviceType: input.serviceType || null,
        status: "draft",
        leadId: input.leadId ?? null,
        fieldQuoteId: input.fieldQuoteId ?? null,
        distanceQuoteId: input.distanceQuoteId ?? null,
      });
      const id = (result as any).insertId ?? (result as any)[0]?.insertId;
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
    }))
    .mutation(async ({ input }: { input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, lineItems, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (lineItems !== undefined) {
        updates.lineItems = JSON.stringify(lineItems);
      }
      // Remove undefined values
      Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
      if (Object.keys(updates).length === 0) return { success: true };
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

      await db.update(nativeQuotes).set({
        portalToken: token,
        portalSentAt: new Date(),
        status: "sent",
      }).where(eq(nativeQuotes.id, input.id));

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

      // Map serviceType to jobs.jobType enum
      const jobTypeMap: Record<string, string> = {
        "Forestry Mulching": "forestry_mulching",
        "Land Clearing": "land_clearing",
        "Brush Hogging": "vegetation_management",
        "Right-of-Way Clearing": "right_of_way_clearing",
        "Trail Cutting": "trail_cutting",
      };
      const jobType = (jobTypeMap[quote.serviceType ?? ""] ?? "land_clearing") as any;

      const totalDollars = quote.totalCents / 100;
      const result = await db.insert(jobs).values({
        userId: 1, // owner
        title: quote.title,
        client: quote.clientName,
        address: quote.propertyAddress ?? "",
        jobType,
        status: "estimate",
        acres: quote.acreage ? parseFloat(quote.acreage) : null,
        totalPrice: totalDollars > 0 ? totalDollars.toString() : null,
        clientEmail: quote.clientEmail ?? null,
        notes: `Created from native quote #${quote.id}. ${quote.internalNotes ?? ""}`.trim(),
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
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
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }: { input: { serviceType: string; acreage: number; terrain?: string; density?: string; access?: string; notes?: string } }) => {
      const { serviceType, acreage, terrain, density, access, notes } = input;

      const BASE_RATES: Record<string, Record<string, [number, number]>> = {
        "forestry-mulching":     { light: [600, 900],  moderate: [800, 1200],  heavy: [1100, 1800] },
        "land-clearing":         { light: [500, 800],  moderate: [700, 1100],  heavy: [1000, 1600] },
        "brush-hogging":         { light: [100, 175],  moderate: [150, 250],   heavy: [200, 350]   },
        "right-of-way-clearing": { light: [500, 800],  moderate: [700, 1100],  heavy: [1000, 1600] },
        "trail-cutting":         { light: [400, 700],  moderate: [600, 1000],  heavy: [900, 1400]  },
        "lot-clearing":          { light: [500, 800],  moderate: [700, 1100],  heavy: [1000, 1600] },
        "pasture-reclamation":   { light: [500, 800],  moderate: [700, 1100],  heavy: [1000, 1600] },
      };
      const svcKey = serviceType.toLowerCase().replace(/\s+/g, "-");
      const densityKey = (density ?? "moderate") as string;
      const [rLow, rHigh] = (BASE_RATES[svcKey]?.[densityKey] ?? [700, 1200]) as [number, number];
      const terrainMult = terrain === "steep" ? 1.35 : terrain === "rolling" ? 1.15 : 1.0;
      const accessMult  = access === "difficult" ? 1.25 : access === "moderate" ? 1.10 : 1.0;
      const adjLow  = Math.round(rLow  * terrainMult * accessMult);
      const adjHigh = Math.round(rHigh * terrainMult * accessMult);
      const midPerAcre = Math.round((adjLow + adjHigh) / 2);
      const totalMid   = Math.round(midPerAcre * acreage);

      const systemPrompt = `You are an expert estimator for Noland Earthworks, LLC — a veteran-owned forestry mulching and land clearing company in Middle Tennessee. You help the owner (Jon Noland) quickly build accurate quotes.

Pricing context for Middle & West Tennessee (2025-2026 market rates):
- Forestry Mulching: $600-$1,800/acre depending on density
- Land Clearing: $500-$1,600/acre
- Brush Hogging: $100-$350/acre
- Right-of-Way Clearing: $500-$1,600/acre
- Trail Cutting: $400-$1,400/acre
- Terrain multipliers: flat x1.0, rolling x1.15, steep x1.35
- Access multipliers: easy x1.0, moderate x1.10, difficult x1.25
- Mobilization fee: $150-$300 for jobs under 5 acres or distant locations
- Minimum job: $750

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
- Add a mobilization fee line item ($200) if acreage < 5
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
        parsed = JSON.parse(raw);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" });
      }

      const lineItems = (parsed.lineItems ?? []).map((li: { description: string; qty: number; unitPriceCents: number }) => ({
        description:    li.description,
        qty:            li.qty,
        unitPriceCents: Math.round(li.unitPriceCents),
        totalCents:     Math.round(li.qty * li.unitPriceCents),
      }));

      return {
        title:             parsed.title ?? `${serviceType} - ${acreage} Acres`,
        estimatedDuration: parsed.estimatedDuration ?? "",
        clientMessage:     parsed.clientMessage ?? "",
        lineItems,
        totalCents: lineItems.reduce((s, li) => s + li.totalCents, 0),
      };
    }),
});
