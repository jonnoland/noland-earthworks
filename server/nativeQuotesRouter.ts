/**
 * nativeQuotesRouter — full lifecycle quote management
 *
 * Covers the native quote lifecycle:
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
import { roundQuoteCentsUp } from "@shared/quoteMoney";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nativeQuotes, nativeJobs, aiPricingSettings, nativeClients, opsLeads, quoteSubmissions } from "../drizzle/schema";
import { getPricingBenchmarks } from "./db";
import { eq, desc, like, or, and, asc } from "drizzle-orm";
import { randomBytes } from "crypto";

import { getStripe, isStripeConfigured } from "./stripe";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { isDraftPlaceholderClient } from "../shared/quoteDrafts";
import { getQuotePortalPhaseSummary, type QuotePortalLineItem } from "../shared/quotePortalPhases";
import { calculateLinearFeetFromAcreage } from "../shared/quoteLineItemMeasurements";
import { getQuoteRentalCostCents, parseQuoteSupportArtifacts, type QuoteEvidenceAttachment, type QuoteInsuranceDocument, type QuoteMeasurement, type QuoteRentalEquipment } from "../shared/quoteSupportArtifacts";
import { storageGet, storagePut } from "./storage";

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
type EmailAttachment = { filename: string; content: string; content_type: string };

async function sendEmail(to: string, subject: string, html: string, attachments: EmailAttachment[] = []) {
  if (!ENV.resendApiKey) throw new Error("Email delivery is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Noland Earthworks <quotes@nolandearthworks.com>",
      to,
      subject,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Email provider rejected the quote email (${response.status})`);
}

function parsePortalLineItems(raw: string | null): QuotePortalLineItem[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Line item schema ─────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  description: z.string(),
  qty: z.number().default(1),
  unitPriceCents: z.number().int(),
  totalCents: z.number().int(),
  kind: z.enum(["service", "discount", "phase", "mobilization", "full_operating_day", "half_operating_day"]).optional(),
  phaseAuthorization: z.enum(["approved_now", "optional_future"]).optional(),
  phaseId: z.string().max(100).optional(),
  estimatedDuration: z.string().max(100).optional(),
  discountCode: z.string().optional(),
  serviceCode: z.string().max(100).optional(),
  measurementUnit: z.enum(["linear_foot"]).optional(),
  quantitySource: z.enum(["measured", "acreage_estimate"]).optional(),
  sourceAcreage: z.number().positive().max(500).optional(),
  clearingWidthFeet: z.number().positive().max(200).optional(),
});

const rentalEquipmentSchema = z.object({
  equipmentName: z.string().trim().min(1).max(160),
  dealerLocation: z.string().trim().max(200).optional(),
  rentalDays: z.number().positive().max(365).optional(),
  rentalCostCents: z.number().int().min(0).max(10_000_000),
  transportCostCents: z.number().int().min(0).max(10_000_000),
  taxCostCents: z.number().int().min(0).max(10_000_000),
  quoteReference: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const quoteEvidenceSchema = z.object({
  key: z.string().min(1).max(500),
  url: z.string().max(1200),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const insuranceDocumentSchema = z.object({
  key: z.string().min(1).max(500),
  url: z.string().max(1200),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const quoteMeasurementSchema = z.object({
  label: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(1000).optional(),
});

function cleanStoredAttachmentKey(key: string, ownerId: number): boolean {
  return key.startsWith(`quotes/${ownerId}/`);
}

function assertOwnedAttachmentKeys(ownerId: number, attachments: Array<{ key: string }>): void {
  if (attachments.some((attachment) => !cleanStoredAttachmentKey(attachment.key, ownerId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Quote attachments must belong to the signed-in Operations account." });
  }
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "attachment";
}

async function buildInsuranceEmailAttachments(ownerId: number, documents: QuoteInsuranceDocument[], selectedKeys: string[]): Promise<EmailAttachment[]> {
  const selected = documents.filter((document) => selectedKeys.includes(document.key));
  if (selected.length !== selectedKeys.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "One or more selected insurance documents do not belong to this quote." });
  }
  if (selected.length > 3) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Attach no more than three proof-of-insurance documents at a time." });
  }
  const attachments: EmailAttachment[] = [];
  let totalBytes = 0;
  for (const document of selected) {
    if (!cleanStoredAttachmentKey(document.key, ownerId)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invalid insurance document." });
    }
    totalBytes += document.sizeBytes;
    if (totalBytes > 28 * 1024 * 1024) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Selected insurance documents are too large to email together." });
    }
    const { url } = await storageGet(document.key);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load ${document.filename} for email attachment`);
    attachments.push({
      filename: document.filename,
      content: Buffer.from(await response.arrayBuffer()).toString("base64"),
      content_type: document.mimeType,
    });
  }
  return attachments;
}

async function buildEvidenceContent(ownerId: number, evidence: QuoteEvidenceAttachment[]): Promise<Array<Record<string, unknown>>> {
  const content: Array<Record<string, unknown>> = [];
  for (const attachment of evidence.slice(0, 6)) {
    if (!cleanStoredAttachmentKey(attachment.key, ownerId)) continue;
    const { url } = await storageGet(attachment.key);
    content.push({ type: "image_url", image_url: { url, detail: "low" } });
  }
  return content;
}

function normalizeQuoteLineItems(items: z.infer<typeof lineItemSchema>[]) {
  return items.map((item) => ({
    ...item,
    qty: Math.max(1, item.qty),
    unitPriceCents: roundQuoteCentsUp(item.unitPriceCents),
    totalCents: roundQuoteCentsUp(Math.max(1, item.qty) * roundQuoteCentsUp(item.unitPriceCents)),
  }));
}

function quoteServiceKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function isLinearFootService(value: string) {
  return ["trail-cutting", "fence-line-clearing"].includes(quoteServiceKey(value));
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
      parcelId: z.string().trim().max(100).optional(),
      parcelCounty: z.string().trim().max(100).optional(),
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
      websiteRequestId: z.number().int().optional(),
      rentalEquipment: z.array(rentalEquipmentSchema).max(12).optional(),
      quoteEvidence: z.array(quoteEvidenceSchema).max(12).optional(),
      quoteMeasurements: z.array(quoteMeasurementSchema).max(24).optional(),
      insuranceDocuments: z.array(insuranceDocumentSchema).max(12).optional(),
      aiEvidenceSummary: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      assertOwnedAttachmentKeys(ctx.user.id, input.quoteEvidence ?? []);
      assertOwnedAttachmentKeys(ctx.user.id, input.insuranceDocuments ?? []);
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
        rentalEquipment: JSON.stringify(input.rentalEquipment ?? []),
        quoteEvidence: JSON.stringify(input.quoteEvidence ?? []),
        quoteMeasurements: JSON.stringify(input.quoteMeasurements ?? []),
        insuranceDocuments: JSON.stringify(input.insuranceDocuments ?? []),
        aiEvidenceSummary: input.aiEvidenceSummary || null,
        estimatedDuration: input.estimatedDuration || null,
        acreage: input.acreage || null,
        serviceType: input.serviceType || null,
        parcelId: input.parcelId || null,
        parcelCounty: input.parcelCounty || null,
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

      if (input.websiteRequestId) {
        await db.update(quoteSubmissions)
          .set({ nativeQuoteId: Number(id) })
          .where(eq(quoteSubmissions.id, input.websiteRequestId));
      }

      // Auto-save / update client record
      try {
        const { clientName, clientEmail, clientPhone, propertyAddress } = input;
        if (clientName?.trim() && !isDraftPlaceholderClient(clientName)) {
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

      return { id: Number(id), websiteRequestId: input.websiteRequestId ?? null };
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
      parcelId: z.string().trim().max(100).optional(),
      parcelCounty: z.string().trim().max(100).optional(),
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
      rentalEquipment: z.array(rentalEquipmentSchema).max(12).optional(),
      quoteEvidence: z.array(quoteEvidenceSchema).max(12).optional(),
      quoteMeasurements: z.array(quoteMeasurementSchema).max(24).optional(),
      insuranceDocuments: z.array(insuranceDocumentSchema).max(12).optional(),
      aiEvidenceSummary: z.string().max(4000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, lineItems, rentalEquipment, quoteEvidence, quoteMeasurements, insuranceDocuments, ...rest } = input;
      if (quoteEvidence !== undefined) assertOwnedAttachmentKeys(ctx.user.id, quoteEvidence);
      if (insuranceDocuments !== undefined) assertOwnedAttachmentKeys(ctx.user.id, insuranceDocuments);
      const updates: Record<string, unknown> = { ...rest };
      if (lineItems !== undefined) {
        const normalized = normalizeQuoteLineItems(lineItems);
        updates.lineItems = JSON.stringify(normalized);
        updates.totalCents = normalized.reduce((sum, item) => sum + item.totalCents, 0);
      }
      if (rentalEquipment !== undefined) updates.rentalEquipment = JSON.stringify(rentalEquipment);
      if (quoteEvidence !== undefined) updates.quoteEvidence = JSON.stringify(quoteEvidence);
      if (quoteMeasurements !== undefined) updates.quoteMeasurements = JSON.stringify(quoteMeasurements);
      if (insuranceDocuments !== undefined) updates.insuranceDocuments = JSON.stringify(insuranceDocuments);
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
        rentalEquipment: src.rentalEquipment,
        quoteEvidence: src.quoteEvidence,
        quoteMeasurements: src.quoteMeasurements,
        insuranceDocuments: src.insuranceDocuments,
        aiEvidenceSummary: src.aiEvidenceSummary,
        estimatedDuration: src.estimatedDuration,
        acreage: src.acreage,
        serviceType: src.serviceType,
        parcelId: src.parcelId,
        parcelCounty: src.parcelCounty,
        status: "draft",
        leadId: src.leadId,
        // Intentionally omitted: portalToken, portalSentAt, portalViewedAt,
        // clientAction, clientActionAt, depositPaidAt, depositPaidCents,
        // stripeSessionId, convertedJobId, convertedToJobAt, signedAt
      });
      const id = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { id: Number(id) };
    }),

  uploadAttachment: ownerProcedure
    .input(z.object({
      kind: z.enum(["evidence", "insurance"]),
      base64: z.string().min(1),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
      filename: z.string().trim().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {
      const accepted = input.kind === "evidence"
        ? ["image/jpeg", "image/png", "image/webp"]
        : ["application/pdf", "image/jpeg", "image/png"];
      if (!accepted.includes(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That file type is not allowed for this quote attachment." });
      }
      const normalizedBase64 = input.base64.replace(/^data:[^;]+;base64,/, "");
      const bytes = Buffer.from(normalizedBase64, "base64");
      if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Each quote attachment must be 10 MB or smaller." });
      }
      const key = `quotes/${ctx.user.id}/${input.kind}/${Date.now()}-${randomBytes(8).toString("hex")}-${sanitizeFilename(input.filename)}`;
      const { url } = await storagePut(key, bytes, input.mimeType);
      return { key, url, filename: sanitizeFilename(input.filename), mimeType: input.mimeType, sizeBytes: bytes.length };
    }),

  sendPortal: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      personalNote: z.string().optional(),
      origin: z.string().optional(),
      insuranceDocumentKeys: z.array(z.string().min(1).max(500)).max(3).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const rows = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Quote not found");
      const quote = rows[0];
      if (!quote.clientEmail) throw new Error("No client email on this quote");
      const insuranceDocuments = parseQuoteSupportArtifacts<QuoteInsuranceDocument[]>(quote.insuranceDocuments, []);
      const insuranceAttachments = await buildInsuranceEmailAttachments(
        ctx.user.id,
        insuranceDocuments,
        input.insuranceDocumentKeys ?? [],
      );

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

      await sendEmail(quote.clientEmail, `Your Quote from Noland Earthworks — ${quote.title}`, html, insuranceAttachments);
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
      return { success: true, portalUrl, insuranceAttachmentCount: insuranceAttachments.length };
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
      acreage: z.number().min(0.1).max(500).optional(),
      linearFeet: z.number().min(1).max(528000).optional(),
      clearingWidthFeet: z.number().min(1).max(200).optional(),
      unitRateCents: z.number().int().min(0).max(100000).optional(),
      terrain: z.string().optional(),
      density: z.string().optional(),
      access: z.string().optional(),
      notes: z.string().max(5000).optional(),
      rentalEquipment: z.array(rentalEquipmentSchema).max(12).optional(),
      measurements: z.array(quoteMeasurementSchema).max(24).optional(),
      evidence: z.array(quoteEvidenceSchema).max(6).optional(),
    }).superRefine((input, ctx) => {
      if (isLinearFootService(input.serviceType)) {
        if (!input.linearFeet && !input.acreage) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["linearFeet"], message: "Enter measured Linear Feet or acreage to estimate from." });
        if (!input.linearFeet && !input.clearingWidthFeet) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["clearingWidthFeet"], message: "Choose a clearing width to estimate Linear Feet from acreage." });
      } else if (!input.acreage) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["acreage"], message: "Enter acreage for this service." });
      }
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: { serviceType: string; acreage?: number; linearFeet?: number; clearingWidthFeet?: number; unitRateCents?: number; terrain?: string; density?: string; access?: string; notes?: string; rentalEquipment?: QuoteRentalEquipment[]; measurements?: QuoteMeasurement[]; evidence?: QuoteEvidenceAttachment[] } }) => {
      const { serviceType, acreage, linearFeet, clearingWidthFeet, unitRateCents, terrain, density, access, notes, rentalEquipment = [], measurements = [], evidence = [] } = input;
      assertOwnedAttachmentKeys(ctx.user.id, evidence);

      // ── Pull DB-driven pricing (same source as Cost Estimator) ──────────────
      const svcKey = quoteServiceKey(serviceType);
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
      const densityKey = density === "very_heavy" ? "heavy" : (density ?? "moderate") as string;
      const terrainMult = terrain === "steep" ? tsMult : terrain === "rolling" ? trMult : 1.0;
      const accessMult  = access === "difficult" ? adMult : access === "moderate" ? amMult : 1.0;

      if (isLinearFootService(serviceType)) {
        const acreageDerivedFeet = calculateLinearFeetFromAcreage(acreage ?? 0, clearingWidthFeet ?? 0);
        const isAcreageEstimate = !linearFeet && acreageDerivedFeet !== null;
        const footage = Math.max(1, Math.round(linearFeet ?? acreageDerivedFeet ?? 0));
        const benchmarkKey = normalizedServiceKey === "fence-line-clearing" ? "fence line clearing" : "trail cutting";
        const fallbackRate = normalizedServiceKey === "fence-line-clearing"
          ? pricingRow2?.fenceLineClearingPerLf ?? 4
          : Math.max(1, Math.round(((pricingRow2?.trailCuttingBaseRate ?? 2000) * 10) / 43560));
        const baseRatePerFoot = unitRateCents && unitRateCents > 0
          ? unitRateCents / 100
          : benchmarkMids2[benchmarkKey] ?? fallbackRate;
        const densityMult = densityKey === "heavy" ? dhMult : densityKey === "moderate" ? dmMult : 1.0;
        const adjustedRatePerFoot = Math.max(1, Math.ceil(baseRatePerFoot * densityMult * terrainMult * accessMult));
        const rawTotal = Math.ceil(footage * adjustedRatePerFoot);
        const minimumAdjustment = Math.max(0, MIN_JOB - rawTotal);
        const totalMid = rawTotal + minimumAdjustment;
        const lineItems = [
          {
            description: serviceType,
            serviceCode: normalizedServiceKey,
            measurementUnit: "linear_foot" as const,
            quantitySource: isAcreageEstimate ? "acreage_estimate" as const : "measured" as const,
            ...(isAcreageEstimate ? { sourceAcreage: acreage, clearingWidthFeet } : {}),
            qty: footage,
            unitPriceCents: adjustedRatePerFoot * 100,
            totalCents: rawTotal * 100,
          },
          ...(minimumAdjustment > 0 ? [{
            description: "Minimum project adjustment",
            qty: 1,
            unitPriceCents: minimumAdjustment * 100,
            totalCents: minimumAdjustment * 100,
            kind: "mobilization" as const,
          }] : []),
        ];
        return {
          title: `${serviceType} — ${isAcreageEstimate ? "Est. " : ""}${footage.toLocaleString()} Linear Ft`,
          estimatedDuration: footage <= 1320 ? "1" : footage <= 5280 ? "2" : "3",
          clientMessage: isAcreageEstimate
            ? `This quote uses an estimated ${footage.toLocaleString()} linear feet of ${serviceType.toLowerCase()}, calculated from ${acreage} acres at a ${clearingWidthFeet}-foot clearing width. The footage and final scope will be verified during the site visit.`
            : `This quote covers approximately ${footage.toLocaleString()} linear feet of ${serviceType.toLowerCase()}. Final scope, site access, vegetation density, and ground conditions will be verified during the site visit.`,
          evidenceSummary: evidence.length > 0 || measurements.length > 0
            ? "Site photos and measurements are saved for owner review. Linear Foot pricing remains controlled by the recorded footage, saved Operations rates, and on-site verification."
            : "No site photos or measurements were provided. Linear Foot pricing remains subject to on-site verification.",
          lineItems,
          totalCents: totalMid * 100,
          belowMinimum: false,
          minimumJobCents: MIN_JOB * 100,
          breakdown: {
            baseRatePerAcre: adjustedRatePerFoot,
            baseRateLow: baseRatePerFoot,
            baseRateHigh: adjustedRatePerFoot,
            terrainMultiplier: terrainMult,
            accessMultiplier: accessMult,
            densityKey,
            acreage: null,
            linearFeet: footage,
            measurementUnit: "linear_foot" as const,
            quantitySource: isAcreageEstimate ? "acreage_estimate" as const : "measured" as const,
            sourceAcreage: isAcreageEstimate ? acreage ?? null : null,
            clearingWidthFeet: isAcreageEstimate ? clearingWidthFeet ?? null : null,
            rawTotalBeforeMinimum: rawTotal,
            minimumJobApplied: minimumAdjustment > 0,
            mobilizationFee: minimumAdjustment,
          },
        };
      }

      const resolvedAcreage = acreage ?? 0;
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

      const [rLow, rHigh] = (BASE_RATES[normalizedServiceKey]?.[densityKey] ?? [700, 1200]) as [number, number];
      const adjLow  = Math.round(rLow  * terrainMult * accessMult);
      const adjHigh = Math.round(rHigh * terrainMult * accessMult);
      const midPerAcre = Math.round((adjLow + adjHigh) / 2);
      const rawTotal   = Math.round(midPerAcre * resolvedAcreage);
      const totalMid   = Math.max(rawTotal, MIN_JOB);

      const internalRentalCostCents = getQuoteRentalCostCents(rentalEquipment);
      const measurementContext = measurements.length > 0
        ? measurements.map((measurement) => `${measurement.label}: ${measurement.value} ${measurement.unit}${measurement.notes ? ` (${measurement.notes})` : ""}`).join("; ")
        : "none";
      const systemPrompt = `You are an expert estimator for Noland Earthworks, LLC — a veteran-owned forestry mulching and land management company in Middle Tennessee. You help the owner (Jon Noland) quickly build accurate quotes.
Current calibrated rates for Middle & West Tennessee:
- Forestry Mulching: $${Math.round(fmBase*0.875)}-$${Math.round(fmBase*dhMult*1.25)}/acre (base $${fmBase}/acre)
- Land Management: $${Math.round(lcBase*0.875)}-$${Math.round(lcBase*dhMult*1.5)}/acre (base $${lcBase}/acre)
- Brush Hogging: $${Math.round(bhBase*0.875)}-$${Math.round(bhBase*dhMult)}/acre (base $${bhBase}/acre)
- Terrain multipliers: flat x1.0, rolling x${trMult}, steep x${tsMult}
- Access multipliers: easy x1.0, moderate x${amMult}, difficult x${adMult}
- Mobilization fee: $${MOBILIZATION} for jobs under 5 acres or distant locations
- Minimum job: $${MIN_JOB}
For this job the calculated mid-point estimate is $${totalMid.toLocaleString()} ($${midPerAcre}/acre x ${resolvedAcreage} acres, ${density ?? "moderate"} density, ${terrain ?? "flat"} terrain, ${access ?? "easy"} access).
Return ONLY valid JSON with no markdown or explanation. Schema:
{
  "title": string,
  "estimatedDuration": string,
  "clientMessage": string,
  "evidenceSummary": string,
  "lineItems": [
    { "description": string, "qty": number, "unitPriceCents": number }
  ]
}
Rules:
- Line items should total close to $${totalMid.toLocaleString()}
- Primary line item is the main service (e.g. "Forestry Mulching - 5 acres @ $${midPerAcre}/acre")
- Add a mobilization fee line item ($${MOBILIZATION}) if acreage < 5
- Keep line items to 2-4 maximum
- Never create a separate equipment-rental line item. Any rental information is internal job-cost context only.
- Evidence summary is internal only: note visible vegetation, terrain, access, site constraints, and uncertainties. Never claim measurements, boundaries, or conditions that are not visible or supplied.
- Duration: 1 acre ~2-4 hours; 5 acres ~1 day; 10 acres ~2 days; 20+ acres ~3-5 days
- Client message should be professional, plain-spoken, no corporate jargon, no emojis`;

      const userPrompt = `Service: ${serviceType}\nAcreage: ${resolvedAcreage} acres\nTerrain: ${terrain ?? "flat"}\nVegetation density: ${density ?? "moderate"}\nAccess: ${access ?? "easy"}\nField measurements: ${measurementContext}\nInternal rental cost context: $${(internalRentalCostCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (do not show it as a customer line item)\nAdditional notes: ${notes ?? "none"}\n\nGenerate the quote suggestion JSON.`;
      const evidenceContent = await buildEvidenceContent(ctx.user.id, evidence);

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [{ type: "text", text: userPrompt }, ...evidenceContent] as any },
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
                evidenceSummary:   { type: "string" },
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
              required: ["title", "estimatedDuration", "clientMessage", "evidenceSummary", "lineItems"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices?.[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let parsed: { title: string; estimatedDuration: string; clientMessage: string; evidenceSummary: string; lineItems: { description: string; qty: number; unitPriceCents: number }[] };
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
        title:             parsed.title ?? `${serviceType} - ${resolvedAcreage} Acres`,
        estimatedDuration: parsed.estimatedDuration ?? "",
        clientMessage:     parsed.clientMessage ?? "",
        evidenceSummary:   parsed.evidenceSummary ?? "",
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
          acreage: resolvedAcreage,
          linearFeet: null,
          measurementUnit: "acre" as const,
          quantitySource: null,
          sourceAcreage: null,
          clearingWidthFeet: null,
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
      if (quote.clientAction !== "approved" || !quote.signedAt || quote.signatureMode !== "typed" || quote.phaseOneAcceptanceScope !== "phase_1" || !quote.phaseOneSignatureConsentAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Accept and sign Phase 1 before paying its deposit." });
      }
      const phaseSummary = getQuotePortalPhaseSummary(parsePortalLineItems(quote.lineItems));
      const phaseOneTotalCents = quote.phaseOneApprovedCents ?? phaseSummary.phaseOneTotalCents;
      if (phaseOneTotalCents <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The approved Phase 1 total must be greater than zero before payment." });
      }
      const depositCents = Math.round(phaseOneTotalCents * input.depositPct / 100);
      const stripe = getStripe();
      const origin = input.origin ?? "https://nolandearth-pymczdcn.manus.space";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Phase 1 Deposit — ${quote.title}`,
              description: `${input.depositPct}% deposit for the approved Phase 1 work. Balance due on Phase 1 completion.`,
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
          approval_scope: "phase_1",
          phase_one_total_cents: phaseOneTotalCents.toString(),
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
      const lineItems = parsePortalLineItems(quote.lineItems);
      const phaseSummary = getQuotePortalPhaseSummary(lineItems);
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
        phaseSummary,
        totalCents: quote.totalCents,
        totalFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(quote.totalCents / 100),
        status: quote.status,
        clientAction: quote.clientAction,
        clientActionAt: quote.clientActionAt,
        phaseOneApprovedCents: quote.phaseOneApprovedCents,
        phaseOneApprovedAt: quote.phaseOneApprovedAt,
        phaseOneSignatureConsentAt: quote.phaseOneSignatureConsentAt,
        phaseOneAcceptanceScope: quote.phaseOneAcceptanceScope,
        depositPaidCents: quote.depositPaidCents,
        depositPaidAt: quote.depositPaidAt,
        convertedToJobAt: quote.convertedToJobAt,
        portalViewedAt: quote.portalViewedAt,
        portalSentAt: quote.portalSentAt,
        signedAt: quote.signedAt,
        signatureTypedText: quote.signatureTypedText,
        signatureMode: quote.signatureMode,
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
      const phaseSummary = getQuotePortalPhaseSummary(parsePortalLineItems(quote.lineItems));
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
          ...(input.action === "approved" ? {
            phaseOneApprovedCents: phaseSummary.phaseOneTotalCents,
            phaseOneApprovedAt: new Date(),
          } : {}),
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

  /** Signed acceptance for Phase 1 only. Future optional phases remain outside this authorization. */
  acceptPhaseOne: publicProcedure
    .input(z.object({
      token: z.string().min(16),
      typedSignature: z.string().trim().min(2).max(255),
      consent: z.literal(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });
      const [quote] = await db.select().from(nativeQuotes).where(eq(nativeQuotes.portalToken, input.token)).limit(1);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found or link has expired." });
      if (quote.clientAction === "declined") throw new TRPCError({ code: "BAD_REQUEST", message: "This quote was declined and cannot be accepted." });
      const phaseSummary = getQuotePortalPhaseSummary(parsePortalLineItems(quote.lineItems));
      if (phaseSummary.phaseOneTotalCents <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Phase 1 must have a positive total before acceptance." });
      const acceptedAt = new Date();
      await db.update(nativeQuotes).set({
        clientAction: "approved",
        clientActionAt: acceptedAt,
        status: "approved",
        phaseOneApprovedCents: phaseSummary.phaseOneTotalCents,
        phaseOneApprovedAt: acceptedAt,
        signatureTypedText: input.typedSignature,
        signatureMode: "typed",
        signedAt: acceptedAt,
        phaseOneSignatureConsentAt: acceptedAt,
        phaseOneAcceptanceScope: "phase_1",
      }).where(eq(nativeQuotes.id, quote.id));
      const linkedLeads = await db.select({ id: opsLeads.id })
        .from(opsLeads)
        .where(eq(opsLeads.nativeQuoteId, quote.id));
      if (linkedLeads.length > 0) {
        await db.update(opsLeads)
          .set({ stage: "won", updatedAt: acceptedAt })
          .where(eq(opsLeads.nativeQuoteId, quote.id));
      }
      await notifyOwner({
        title: `Phase 1 Accepted — ${quote.clientName}`,
        content: `${input.typedSignature} signed and accepted Phase 1 of "${quote.title}". Future phases remain optional and are not authorized.${linkedLeads.length > 0 ? " The linked lead is now marked Won." : ""}`,
      }).catch(() => {/* non-critical */});
      return { success: true, phaseOneApprovedCents: phaseSummary.phaseOneTotalCents, acceptedAt, linkedLeadWon: linkedLeads.length > 0 };
    }),
});
