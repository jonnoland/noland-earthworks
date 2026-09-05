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
import { nativeQuotes, nativeQuoteRevisions, nativeJobs, aiPricingSettings, nativeClients, opsLeads, quoteSubmissions, quoteInsuranceLibrary, businessSettings } from "../drizzle/schema";
import { getPricingBenchmarks } from "./db";
import { eq, desc, like, or, and, asc, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";

import { getStripe, isStripeConfigured } from "./stripe";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { isDraftPlaceholderClient } from "../shared/quoteDrafts";
import { getQuotePortalPhaseSummary, type QuotePortalLineItem } from "../shared/quotePortalPhases";
import { orderQuoteLineItemsWithDiscountsLast } from "../shared/quotePhaseSections";
import { getQuoteRentalCostCents, getQuoteRentalOnlyMargin, getQuoteTotalWithRentalCharge, MAX_QUOTE_EVIDENCE_PHOTOS, parseQuoteSupportArtifactArray, parseQuoteSupportArtifacts, type QuoteCostFlag, type QuoteEvidenceAttachment, type QuoteInsuranceDocument, type QuoteMeasurement, type QuoteRentalEquipment } from "../shared/quoteSupportArtifacts";
import { storageGet, storagePut } from "./storage";
import { ACTIVE_15_DAY_PRICING_CONFIG, calculateInternalPricingModel, isInternalPricingConfig, PRIOR_20_DAY_PRICING_CONFIG } from "../shared/internalPricingModel";
import { repriceDraftQuoteLineItems } from "../shared/draftQuoteRepricing";
import { buildNativeQuoteRevisionSnapshot, parseNativeQuoteRevisionSnapshot, type CustomerQuotePhotoReference } from "./quoteRevisionSnapshots";

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

async function getDraftRepricingRates() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [settings] = await db.select({ pricingConfig: businessSettings.pricingConfig }).from(businessSettings).limit(1);
  let activeConfig = ACTIVE_15_DAY_PRICING_CONFIG;
  try {
    const stored = settings?.pricingConfig ? JSON.parse(settings.pricingConfig) : null;
    if (isInternalPricingConfig(stored)) activeConfig = stored;
  } catch {
    // Fall back to the owner-approved 15-day defaults when the stored JSON is unreadable.
  }
  return {
    db,
    activeCrewDayRateCents: roundQuoteCentsUp(calculateInternalPricingModel(activeConfig).crewDayRate * 100),
    priorCrewDayRateCents: roundQuoteCentsUp(calculateInternalPricingModel(PRIOR_20_DAY_PRICING_CONFIG).crewDayRate * 100),
  };
}

function buildDraftRepricePreview(
  quote: { id: number; title: string; lineItems: string; totalCents: number; rentalEquipment: string | null; rentalMarkupPct: number | null },
  activeCrewDayRateCents: number,
  priorCrewDayRateCents: number,
) {
  const repriced = repriceDraftQuoteLineItems(parsePortalLineItems(quote.lineItems), activeCrewDayRateCents, priorCrewDayRateCents);
  const serviceTotalCents = repriced.lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const rentalCostCents = getQuoteRentalCostCents(parseQuoteSupportArtifactArray<QuoteRentalEquipment>(quote.rentalEquipment));
  const totalCents = getQuoteTotalWithRentalCharge(serviceTotalCents, rentalCostCents, quote.rentalMarkupPct ?? 15).totalCents;
  return {
    id: quote.id,
    title: quote.title,
    previousTotalCents: quote.totalCents,
    totalCents,
    deltaCents: totalCents - quote.totalCents,
    lineItems: repriced.lineItems,
    repriceableItemCount: repriced.repriceableItemCount,
    skippedPositiveItemCount: repriced.skippedPositiveItemCount,
  };
}

function getIncludedRentalCustomerCharge(quote: { rentalEquipment: string | null; rentalMarkupPct: number | null }): number {
  const rentalCostCents = getQuoteRentalCostCents(parseQuoteSupportArtifactArray<QuoteRentalEquipment>(quote.rentalEquipment));
  return getQuoteTotalWithRentalCharge(0, rentalCostCents, quote.rentalMarkupPct ?? 15).rentalCustomerChargeCents;
}

function getCustomerPhotoReferences(raw: string | null): CustomerQuotePhotoReference[] {
  return parseQuoteSupportArtifactArray<QuoteEvidenceAttachment>(raw)
    .filter((attachment) => attachment.includeInCustomerPdf !== false && attachment.caption)
    .map((attachment) => ({
      url: attachment.url,
      filename: attachment.filename,
      caption: attachment.caption as string,
      tags: attachment.tags ?? [],
    }));
}

function isCustomerFacingQuoteChange(
  quote: typeof nativeQuotes.$inferSelect,
  input: Record<string, unknown>,
): boolean {
  const comparableFields: Array<keyof typeof nativeQuotes.$inferSelect> = [
    "clientName", "clientEmail", "clientPhone", "propertyAddress", "title", "clientMessage",
    "estimatedDuration", "acreage", "serviceType", "parcelId", "parcelCounty",
  ];
  if (["lineItems", "rentalEquipment", "rentalMarkupPct", "quoteEvidence", "quoteMeasurements"].some((field) => Object.prototype.hasOwnProperty.call(input, field))) {
    return true;
  }
  return comparableFields.some((field) => Object.prototype.hasOwnProperty.call(input, field) && input[field] !== quote[field]);
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
  caption: z.string().trim().min(1).max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(48)).max(5).optional(),
  includeInCustomerPdf: z.boolean().optional(),
});

const insuranceDocumentSchema = z.object({
  key: z.string().min(1).max(500),
  url: z.string().max(1200),
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const insuranceLibraryDocumentSchema = insuranceDocumentSchema.extend({
  label: z.string().trim().min(1).max(160),
  expiresAt: z.date().nullable().optional(),
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
  for (const attachment of evidence.slice(0, MAX_QUOTE_EVIDENCE_PHOTOS)) {
    if (!cleanStoredAttachmentKey(attachment.key, ownerId)) continue;
    const { url } = await storageGet(attachment.key);
    content.push({ type: "image_url", image_url: { url, detail: "low" } });
  }
  return content;
}

function normalizeQuoteLineItems(items: z.infer<typeof lineItemSchema>[]) {
  const normalizedItems = items.map((item) => ({
    ...item,
    qty: Math.max(1, item.qty),
    unitPriceCents: roundQuoteCentsUp(item.unitPriceCents),
    totalCents: roundQuoteCentsUp(Math.max(1, item.qty) * roundQuoteCentsUp(item.unitPriceCents)),
  }));
  return orderQuoteLineItemsWithDiscountsLast(normalizedItems);
}

function quoteServiceKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function isLinearFootService(value: string) {
  return ["trail-cutting", "fence-line-clearing", "right-of-way-clearing"].includes(quoteServiceKey(value));
}

function assertQuoteMeasurementConsistency(
  serviceType: string | undefined,
  acreage: string | undefined,
  lineItems: z.infer<typeof lineItemSchema>[],
): void {
  const selectedServiceKey = quoteServiceKey(serviceType ?? "");
  const selectedServiceIsLinear = isLinearFootService(selectedServiceKey);
  const primaryServiceLine = lineItems.find((item) => !item.kind || item.kind === "service");

  if (selectedServiceIsLinear) {
    if (acreage?.trim()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Acreage cannot be saved for Fence Line Clearing, Trail Cutting, or Right-of-Way Clearing. Use measured Linear Feet." });
    }
    if (!primaryServiceLine || quoteServiceKey(primaryServiceLine.serviceCode ?? primaryServiceLine.description) !== selectedServiceKey) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The selected service type must match the primary Linear Foot service line before saving." });
    }
  }

  for (const item of lineItems) {
    const itemIsLinear = item.measurementUnit === "linear_foot" || isLinearFootService(item.serviceCode ?? item.description);
    if (!itemIsLinear) continue;
    if (item.measurementUnit !== "linear_foot" || item.quantitySource === "acreage_estimate" || item.sourceAcreage !== undefined || item.clearingWidthFeet !== undefined) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Fence Line Clearing, Trail Cutting, and Right-of-Way Clearing must use measured Linear Feet only. Remove acreage-derived footage before saving." });
    }
    if (!Number.isFinite(item.qty) || item.qty < 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Each Linear Foot service line needs measured Linear Feet before saving." });
    }
  }
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

  /** Preview the active 15-day estimator effect without touching draft quote records. */
  getDraftRepricePreview: ownerProcedure.query(async () => {
    const { db, activeCrewDayRateCents, priorCrewDayRateCents } = await getDraftRepricingRates();
    const drafts = await db.select({
      id: nativeQuotes.id,
      title: nativeQuotes.title,
      lineItems: nativeQuotes.lineItems,
      totalCents: nativeQuotes.totalCents,
      rentalEquipment: nativeQuotes.rentalEquipment,
      rentalMarkupPct: nativeQuotes.rentalMarkupPct,
    }).from(nativeQuotes).where(eq(nativeQuotes.status, "draft")).orderBy(desc(nativeQuotes.updatedAt));
    const allQuotes = drafts.map((quote) => buildDraftRepricePreview(quote, activeCrewDayRateCents, priorCrewDayRateCents));
    const quotes = allQuotes.filter((quote) => quote.repriceableItemCount > 0);
    return {
      activeCrewDayRateCents,
      priorCrewDayRateCents,
      draftQuoteCount: drafts.length,
      eligibleQuoteCount: quotes.length,
      totalDeltaCents: quotes.reduce((sum, quote) => sum + quote.deltaCents, 0),
      quotes: quotes.map(({ lineItems: _lineItems, ...quote }) => quote),
    };
  }),

  /** Reprice only still-draft quotes that have eligible acreage or day-rate work. */
  repriceEligibleDrafts: ownerProcedure.mutation(async () => {
    const { db, activeCrewDayRateCents, priorCrewDayRateCents } = await getDraftRepricingRates();
    const drafts = await db.select({
      id: nativeQuotes.id,
      title: nativeQuotes.title,
      lineItems: nativeQuotes.lineItems,
      totalCents: nativeQuotes.totalCents,
      rentalEquipment: nativeQuotes.rentalEquipment,
      rentalMarkupPct: nativeQuotes.rentalMarkupPct,
    }).from(nativeQuotes).where(eq(nativeQuotes.status, "draft"));
    const previews = drafts.map((quote) => buildDraftRepricePreview(quote, activeCrewDayRateCents, priorCrewDayRateCents))
      .filter((quote) => quote.repriceableItemCount > 0);
    const now = new Date();
    for (const quote of previews) {
      await db.update(nativeQuotes).set({
        lineItems: JSON.stringify(normalizeQuoteLineItems(quote.lineItems)),
        totalCents: quote.totalCents,
        updatedAt: now,
      }).where(and(eq(nativeQuotes.id, quote.id), eq(nativeQuotes.status, "draft")));
    }
    return {
      updatedCount: previews.length,
      totalDeltaCents: previews.reduce((sum, quote) => sum + quote.deltaCents, 0),
      activeCrewDayRateCents,
    };
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
      rentalMarkupPct: z.number().int().min(10).max(20).optional(),
      quoteEvidence: z.array(quoteEvidenceSchema).max(MAX_QUOTE_EVIDENCE_PHOTOS).optional(),
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
      assertQuoteMeasurementConsistency(input.serviceType, input.acreage, lineItems);
      const serviceTotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);
      const rentalMarkupPct = input.rentalMarkupPct ?? 15;
      const rentalCostCents = getQuoteRentalCostCents(input.rentalEquipment ?? []);
      const { totalCents } = getQuoteTotalWithRentalCharge(serviceTotalCents, rentalCostCents, rentalMarkupPct);
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
        rentalMarkupPct,
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
      rentalMarkupPct: z.number().int().min(10).max(20).optional(),
      quoteEvidence: z.array(quoteEvidenceSchema).max(MAX_QUOTE_EVIDENCE_PHOTOS).optional(),
      quoteMeasurements: z.array(quoteMeasurementSchema).max(24).optional(),
      insuranceDocuments: z.array(insuranceDocumentSchema).max(12).optional(),
      aiEvidenceSummary: z.string().max(4000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: any }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, lineItems, rentalEquipment, rentalMarkupPct, quoteEvidence, quoteMeasurements, insuranceDocuments, ...rest } = input;
      const [existingQuote] = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, id)).limit(1);
      if (!existingQuote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      const hasCustomerFacingChange = isCustomerFacingQuoteChange(existingQuote, input);
      if (hasCustomerFacingChange && (existingQuote.signedAt || existingQuote.clientAction === "approved" || existingQuote.status === "approved")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This accepted quote is revision-locked. Duplicate it to prepare a new scope or price without changing the signed agreement.",
        });
      }
      if (quoteEvidence !== undefined) assertOwnedAttachmentKeys(ctx.user.id, quoteEvidence);
      if (insuranceDocuments !== undefined) assertOwnedAttachmentKeys(ctx.user.id, insuranceDocuments);
      const updates: Record<string, unknown> = { ...rest };
      if (lineItems !== undefined || rest.serviceType !== undefined || Object.prototype.hasOwnProperty.call(rest, "acreage")) {
        const effectiveLineItems = lineItems !== undefined ? normalizeQuoteLineItems(lineItems) : parsePortalLineItems(existingQuote.lineItems);
        assertQuoteMeasurementConsistency(
          rest.serviceType ?? existingQuote.serviceType ?? undefined,
          Object.prototype.hasOwnProperty.call(rest, "acreage") ? rest.acreage : existingQuote.acreage ?? undefined,
          effectiveLineItems,
        );
      }
      if (lineItems !== undefined || rentalEquipment !== undefined || rentalMarkupPct !== undefined) {
        const normalized = lineItems !== undefined
          ? normalizeQuoteLineItems(lineItems)
          : parsePortalLineItems(existingQuote.lineItems);
        const effectiveRentalEquipment = rentalEquipment ?? parseQuoteSupportArtifactArray<QuoteRentalEquipment>(existingQuote.rentalEquipment);
        const effectiveRentalMarkupPct = rentalMarkupPct ?? existingQuote.rentalMarkupPct ?? 15;
        const serviceTotalCents = normalized.reduce((sum, item) => sum + item.totalCents, 0);
        const rentalCostCents = getQuoteRentalCostCents(effectiveRentalEquipment);
        const total = getQuoteTotalWithRentalCharge(serviceTotalCents, rentalCostCents, effectiveRentalMarkupPct);
        if (lineItems !== undefined) updates.lineItems = JSON.stringify(normalized);
        updates.totalCents = total.totalCents;
        updates.rentalMarkupPct = effectiveRentalMarkupPct;
      }
      if (rentalEquipment !== undefined) updates.rentalEquipment = JSON.stringify(rentalEquipment);
      if (quoteEvidence !== undefined) updates.quoteEvidence = JSON.stringify(quoteEvidence);
      if (quoteMeasurements !== undefined) updates.quoteMeasurements = JSON.stringify(quoteMeasurements);
      if (insuranceDocuments !== undefined) updates.insuranceDocuments = JSON.stringify(insuranceDocuments);
      if (hasCustomerFacingChange && existingQuote.portalSentAt) {
        updates.proposalStatus = "draft";
        updates.nextActionType = "send_revision";
        updates.nextActionDueAt = new Date();
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
        rentalEquipment: src.rentalEquipment,
        rentalMarkupPct: src.rentalMarkupPct,
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

  listInsuranceLibrary: ownerProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(quoteInsuranceLibrary)
        .where(and(eq(quoteInsuranceLibrary.ownerId, ctx.user.id), isNull(quoteInsuranceLibrary.archivedAt)))
        .orderBy(desc(quoteInsuranceLibrary.updatedAt));
    }),

  saveInsuranceLibraryDocument: ownerProcedure
    .input(insuranceLibraryDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      assertOwnedAttachmentKeys(ctx.user.id, [input]);
      const [existing] = await db.select({ id: quoteInsuranceLibrary.id }).from(quoteInsuranceLibrary)
        .where(and(eq(quoteInsuranceLibrary.ownerId, ctx.user.id), eq(quoteInsuranceLibrary.storageKey, input.key)))
        .limit(1);
      if (existing) {
        await db.update(quoteInsuranceLibrary).set({
          label: input.label,
          expiresAt: input.expiresAt ?? null,
          updatedAt: new Date(),
        }).where(eq(quoteInsuranceLibrary.id, existing.id));
        return { id: existing.id, updated: true };
      }
      const result = await db.insert(quoteInsuranceLibrary).values({
        ownerId: ctx.user.id,
        label: input.label,
        filename: input.filename,
        storageKey: input.key,
        storageUrl: input.url,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        expiresAt: input.expiresAt ?? null,
      });
      return { id: Number((result as any).insertId ?? (result as any)[0]?.insertId), updated: false };
    }),

  archiveInsuranceLibraryDocument: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(quoteInsuranceLibrary).set({ archivedAt: new Date() })
        .where(and(eq(quoteInsuranceLibrary.id, input.id), eq(quoteInsuranceLibrary.ownerId, ctx.user.id)));
      return { success: true };
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
      if (quote.signedAt || quote.clientAction === "approved" || quote.status === "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This accepted quote is locked. Duplicate it to prepare and send a new revision." });
      }
      const insuranceDocuments = parseQuoteSupportArtifacts<QuoteInsuranceDocument[]>(quote.insuranceDocuments, []);
      const libraryRows = input.insuranceDocumentKeys?.length
        ? await db.select().from(quoteInsuranceLibrary)
          .where(and(eq(quoteInsuranceLibrary.ownerId, ctx.user.id), isNull(quoteInsuranceLibrary.archivedAt)))
        : [];
      const availableInsuranceDocuments = Array.from(new Map([
        ...insuranceDocuments,
        ...libraryRows.map((document): QuoteInsuranceDocument => ({
          key: document.storageKey,
          url: document.storageUrl,
          filename: document.filename,
          mimeType: document.mimeType as QuoteInsuranceDocument["mimeType"],
          sizeBytes: document.sizeBytes,
        })),
      ].map((document) => [document.key, document])).values());
      const insuranceAttachments = await buildInsuranceEmailAttachments(
        ctx.user.id,
        availableInsuranceDocuments,
        input.insuranceDocumentKeys ?? [],
      );

      // Generate or reuse portal token. The public link will render the immutable
      // revision snapshot created below, not future owner edits to this record.
      const token = quote.portalToken ?? randomBytes(32).toString("hex");
      const origin = input.origin ?? "https://nolandearth-pymczdcn.manus.space";
      const portalUrl = `${origin}/quote/${token}`;
      const sentAt = new Date();
      const latestRevision = await db.select({ revisionNumber: nativeQuoteRevisions.revisionNumber })
        .from(nativeQuoteRevisions)
        .where(eq(nativeQuoteRevisions.quoteId, quote.id))
        .orderBy(desc(nativeQuoteRevisions.revisionNumber))
        .limit(1);
      const revisionNumber = (latestRevision[0]?.revisionNumber ?? 0) + 1;
      const revisionSnapshot = buildNativeQuoteRevisionSnapshot({
        revisionNumber,
        sentAt: sentAt.toISOString(),
        clientName: quote.clientName,
        title: quote.title,
        serviceType: quote.serviceType,
        acreage: quote.acreage,
        propertyAddress: quote.propertyAddress,
        estimatedDuration: quote.estimatedDuration,
        clientMessage: quote.clientMessage,
        lineItems: parsePortalLineItems(quote.lineItems),
        includedRentalCustomerChargeCents: getIncludedRentalCustomerCharge(quote),
        totalCents: quote.totalCents,
        sitePhotoReferences: getCustomerPhotoReferences(quote.quoteEvidence),
      });

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
      // Only record the quote revision as sent after the customer email provider accepts it.
      await db.insert(nativeQuoteRevisions).values({
        quoteId: quote.id,
        revisionNumber,
        snapshotJson: JSON.stringify(revisionSnapshot),
        sentAt,
      });
      await db.update(nativeQuotes).set({
        portalToken: token,
        portalSentAt: sentAt,
        portalViewedAt: null,
        status: "sent",
        proposalStatus: "sent",
        clientAction: null,
        clientActionAt: null,
        nextActionType: "awaiting_portal_view",
        nextActionDueAt: null,
      }).where(eq(nativeQuotes.id, input.id));
      await db.update(opsLeads).set({
        stage: "estimate_sent",
        updatedAt: new Date(),
      }).where(eq(opsLeads.nativeQuoteId, input.id));
      await notifyOwner({ title: "Quote Portal Sent", content: `Portal link sent to ${quote.clientName} (${quote.clientEmail}) for "${quote.title}"` });
      return { success: true, portalUrl, revisionNumber, insuranceAttachmentCount: insuranceAttachments.length };
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

  reviewCost: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [quote] = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.id)).limit(1);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });

      const evidence = parseQuoteSupportArtifactArray<QuoteEvidenceAttachment>(quote.quoteEvidence);
      const measurements = parseQuoteSupportArtifactArray<QuoteMeasurement>(quote.quoteMeasurements);
      const rentalEquipment = parseQuoteSupportArtifactArray<QuoteRentalEquipment>(quote.rentalEquipment);
      if (evidence.length === 0 && measurements.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one site photo or measurement before generating a cost review." });
      }
      assertOwnedAttachmentKeys(ctx.user.id, evidence);

      const rentalCostCents = getQuoteRentalCostCents(rentalEquipment);
      const { rentalOnlyProfitCents, rentalOnlyMarginPct } = getQuoteRentalOnlyMargin(quote.totalCents, rentalCostCents);
      const measurementContext = measurements.length > 0
        ? measurements.map((measurement) => `${measurement.label}: ${measurement.value} ${measurement.unit}${measurement.notes ? ` (${measurement.notes})` : ""}`).join("; ")
        : "No measurements entered.";
      const visualContent = await buildEvidenceContent(ctx.user.id, evidence);
      const prompt = `Review this Noland Earthworks quote as internal decision support for the owner. Return a concise, plain-language cost evaluation in no more than 120 words plus up to five short cost flags. Consider potential missing labor, fuel, mobilization, machine-wear, access, and scope costs only when the supplied photos, measurements, or notes give a factual reason to verify them. For example, dense vegetation, visible slope, long travel/access constraints, or a large recorded area can justify a flag to confirm labor/fuel/mobilization. Do not invent site conditions, do not estimate dollars, and do not recommend a final price. The rental-only margin is not full job profit; it excludes labor, fuel, machine wear, overhead, taxes, and all other job costs.\n\nQuote total: $${(quote.totalCents / 100).toLocaleString("en-US")}\nInternal Cat rental/transport/tax cost: $${(rentalCostCents / 100).toLocaleString("en-US")}\nRental-only gross contribution: $${(rentalOnlyProfitCents / 100).toLocaleString("en-US")}\nRental-only margin: ${rentalOnlyMarginPct === null ? "not available" : `${rentalOnlyMarginPct}%`}\nService: ${quote.serviceType ?? "not recorded"}\nAcreage: ${quote.acreage ?? "not recorded"}\nSite measurements: ${measurementContext}\nInternal notes: ${quote.internalNotes ?? "none"}`;
      const result = await invokeLLM({
        model: "gemini-3-flash-preview",
        max_tokens: 1000,
        messages: [
          { role: "system", content: "You are a careful field-cost reviewer. Use only the supplied facts and visible evidence." },
          { role: "system", content: "Return a whole-number recommendedRentalMarkupPct from 10 through 20 and a brief markupRecommendationReason based only on documented or visible job complexity. Use 10 for plainly simple conditions, 15 for normal uncertainty, and use 20 only for specific complexity supported by the evidence. This is internal decision support and does not set a final price." },
          { role: "user", content: [{ type: "text", text: prompt }, ...visualContent] as any },
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: "quote_cost_review",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                flags: {
                  type: "array",
                  maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", enum: ["labor", "fuel", "mobilization", "machine_wear", "access", "scope"] },
                      reason: { type: "string" },
                    },
                    required: ["category", "reason"],
                    additionalProperties: false,
                  },
                },
                recommendedRentalMarkupPct: { type: "integer", minimum: 10, maximum: 20 },
                markupRecommendationReason: { type: "string" },
              },
              required: ["summary", "flags", "recommendedRentalMarkupPct", "markupRecommendationReason"],
              additionalProperties: false,
            },
          },
        },
      });
      const rawContent = result.choices?.[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let summary = "";
      let flags: QuoteCostFlag[] = [];
      let recommendedRentalMarkupPct: number | null = null;
      let markupRecommendationReason: string | null = null;
      try {
        const parsed = JSON.parse(stripCodeFence(raw));
        summary = String(parsed.summary ?? "").trim();
        const allowedCategories = new Set<QuoteCostFlag["category"]>(["labor", "fuel", "mobilization", "machine_wear", "access", "scope"]);
        flags = Array.isArray(parsed.flags)
          ? parsed.flags
            .filter((flag: unknown): flag is QuoteCostFlag => Boolean(flag && typeof flag === "object" && allowedCategories.has((flag as QuoteCostFlag).category) && typeof (flag as QuoteCostFlag).reason === "string" && (flag as QuoteCostFlag).reason.trim()))
            .slice(0, 5)
            .map((flag: QuoteCostFlag) => ({ category: flag.category, reason: flag.reason.trim().slice(0, 240) }))
          : [];
        const recommendation = Number(parsed.recommendedRentalMarkupPct);
        recommendedRentalMarkupPct = Number.isInteger(recommendation) && recommendation >= 10 && recommendation <= 20
          ? recommendation
          : null;
        markupRecommendationReason = typeof parsed.markupRecommendationReason === "string"
          ? parsed.markupRecommendationReason.trim().slice(0, 500) || null
          : null;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned an invalid cost review." });
      }
      if (!summary) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a cost review." });
      const reviewedAt = new Date();
      await db.update(nativeQuotes).set({ aiCostReview: summary, aiCostFlags: JSON.stringify(flags), aiRecommendedRentalMarkupPct: recommendedRentalMarkupPct, aiMarkupRecommendationReason: markupRecommendationReason, aiCostReviewUpdatedAt: reviewedAt }).where(eq(nativeQuotes.id, quote.id));
      return { summary, flags, recommendedRentalMarkupPct, markupRecommendationReason, rentalCostCents, rentalOnlyProfitCents, rentalOnlyMarginPct, reviewedAt };
    }),

  captionEvidence: ownerProcedure
    .input(z.object({
      evidence: z.array(quoteEvidenceSchema).min(1).max(MAX_QUOTE_EVIDENCE_PHOTOS),
      quoteId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: { evidence: QuoteEvidenceAttachment[]; quoteId?: number } }) => {
      assertOwnedAttachmentKeys(ctx.user.id, input.evidence);
      const evidenceContent = await buildEvidenceContent(ctx.user.id, input.evidence);
      if (evidenceContent.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add at least one saved site photo before generating photo captions." });
      }

      const photoList = input.evidence
        .map((attachment, index) => `Photo ${index} (index ${index}): ${attachment.filename}`)
        .join("\n");
      const result = await invokeLLM({
        model: "gemini-3-flash-preview",
        maxTokens: 1800,
        messages: [
          {
            role: "system",
            content: "You create concise internal site-photo captions for a forestry mulching and land management quote. Return only factual details visible in each image. Do not infer acreage, pricing, boundaries, permits, utility location, or safety conditions not visible in the image. Use an empty tags array if no useful descriptive tags apply.",
          },
          {
            role: "user",
            content: [{ type: "text", text: `For each photo below, return one concise caption of no more than 160 characters and 0–5 lowercase descriptive tags. Use the exact zero-based photo index.\n\n${photoList}` }, ...evidenceContent] as any,
          },
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: "quote_photo_captions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                photoAnnotations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" },
                      caption: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                    },
                    required: ["index", "caption", "tags"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["photoAnnotations"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices?.[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let parsed: { photoAnnotations?: Array<{ index?: unknown; caption?: unknown; tags?: unknown }> };
      try {
        parsed = JSON.parse(stripCodeFence(raw));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid photo caption data." });
      }

      const photoAnnotations = (Array.isArray(parsed.photoAnnotations) ? parsed.photoAnnotations : [])
        .flatMap((annotation) => {
          const index = typeof annotation.index === "number" ? annotation.index : -1;
          const caption = typeof annotation.caption === "string" ? annotation.caption.trim().slice(0, 240) : "";
          const tags = Array.isArray(annotation.tags)
            ? Array.from(new Set(annotation.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9 -]+/g, "").slice(0, 48)).filter(Boolean))).slice(0, 5)
            : [];
          const attachment = Number.isInteger(index) ? input.evidence[index] : undefined;
          return attachment && caption ? [{ key: attachment.key, caption, tags }] : [];
        });
      if (input.quoteId && photoAnnotations.length > 0) {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable while saving photo captions." });
        const [quote] = await db.select().from(nativeQuotes).where(eq(nativeQuotes.id, input.quoteId)).limit(1);
        if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
        const annotationsByKey = new Map(photoAnnotations.map((annotation) => [annotation.key, annotation]));
        const savedEvidence = parseQuoteSupportArtifactArray<QuoteEvidenceAttachment>(quote.quoteEvidence).map((attachment) => {
          const annotation = annotationsByKey.get(attachment.key);
          return annotation ? { ...attachment, caption: annotation.caption, tags: annotation.tags, includeInCustomerPdf: attachment.includeInCustomerPdf ?? true } : attachment;
        });
        await db.update(nativeQuotes).set({ quoteEvidence: JSON.stringify(savedEvidence), updatedAt: new Date() }).where(eq(nativeQuotes.id, quote.id));
      }
      return { photoAnnotations };
    }),

  generateClientMessage: ownerProcedure
    .input(z.object({
      clientName: z.string().trim().min(1).max(160),
      title: z.string().trim().max(240).optional(),
      propertyAddress: z.string().trim().max(500).optional(),
      serviceType: z.string().trim().min(1).max(160),
      parcelId: z.string().trim().max(160).optional(),
      parcelCounty: z.string().trim().max(160).optional(),
      estimatedDuration: z.string().trim().max(160).optional(),
      totalCents: z.number().int().min(0).max(100_000_000),
      lineItems: z.array(lineItemSchema).min(1).max(100),
      measurements: z.array(quoteMeasurementSchema).max(24).optional(),
      evidence: z.array(quoteEvidenceSchema).max(MAX_QUOTE_EVIDENCE_PHOTOS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const evidence = input.evidence ?? [];
      assertOwnedAttachmentKeys(ctx.user.id, evidence);

      const visibleLineItems = input.lineItems
        .filter((item) => item.kind !== "phase" && item.unitPriceCents >= 0)
        .map((item) => `${item.description}: ${item.qty} × $${(item.unitPriceCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
        .join("; ") || "Quoted work as listed.";
      const measurementContext = (input.measurements ?? []).length > 0
        ? (input.measurements ?? []).map((measurement) => `${measurement.label}: ${measurement.value} ${measurement.unit}${measurement.notes ? ` (${measurement.notes})` : ""}`).join("; ")
        : "No additional field measurements recorded.";
      const photoAnnotationContext = evidence.length > 0
        ? evidence.map((attachment, index) => `Photo ${index + 1}: ${attachment.caption ?? attachment.filename}${attachment.tags?.length ? ` [${attachment.tags.join(", ")}]` : ""}`).join("; ")
        : "No site photos attached.";
      const propertyReference = [
        input.propertyAddress ? `Address: ${input.propertyAddress}` : "",
        input.parcelId ? `Parcel ID: ${input.parcelId}` : "",
        input.parcelCounty ? `County: ${input.parcelCounty}` : "",
      ].filter(Boolean).join("; ") || "Property reference was not recorded.";
      const visualContent = await buildEvidenceContent(ctx.user.id, evidence);
      const prompt = `Write one concise, client-ready message for a completed Noland Earthworks quote. Use only the provided quote facts and visible site-photo evidence. The owner will review and edit before sending.

Client: ${input.clientName}
Quote title: ${input.title || "not recorded"}
Service: ${input.serviceType}
Property / work-area reference: ${propertyReference}
Quoted items: ${visibleLineItems}
Recorded measurements: ${measurementContext}
Photo observations: ${photoAnnotationContext}
Estimated duration: ${input.estimatedDuration || "to be confirmed during scheduling"}
Final quoted total: $${(input.totalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}

Requirements:
- Keep this between 70 and 150 words in direct, professional, plain language.
- Write entirely in Jon's first-person singular owner-operator voice. Use "I," "me," and "my" when referring to the business or work.
- Never use "we," "us," "our," "team," "crew," or "staff," and do not imply another person will visit, perform, complete, or follow up on the work.
- State the exact final quoted total once, but do not break out internal costs, rental, margin, fuel, labor, discounts, or markup.
- Refer to the work area as identified by the customer, address, Parcel ID, or recorded reference; never guarantee legal property lines, boundaries, acreage, permits, or utility locations.
- If photos or measurements leave scope uncertain, include a concise site-verification sentence.
- Do not invent work, conditions, timing, pricing, approvals, or attachments. Do not include corporate jargon or emojis.`;
      const result = await invokeLLM({
        model: "gemini-3-flash-preview",
        max_tokens: 900,
        messages: [
          { role: "system", content: "You write accurate, concise customer messages in Jon Noland's first-person singular owner-operator voice. Jon does the work himself. Use only supplied facts and visible evidence; never imply a team or use we, us, or our." },
          { role: "user", content: [{ type: "text", text: prompt }, ...visualContent] as any },
        ],
        response_format: {
          type: "json_schema" as const,
          json_schema: {
            name: "completed_quote_client_message",
            strict: true,
            schema: {
              type: "object",
              properties: { message: { type: "string" } },
              required: ["message"],
              additionalProperties: false,
            },
          },
        },
      });
      const rawContent = result.choices?.[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      let message = "";
      try {
        const parsed = JSON.parse(stripCodeFence(raw));
        message = typeof parsed.message === "string" ? parsed.message.trim().slice(0, 1600) : "";
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned an invalid client message." });
      }
      if (!message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a client message." });
      return { message };
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
      rentalMarkupPct: z.number().int().min(10).max(20).optional(),
      measurements: z.array(quoteMeasurementSchema).max(24).optional(),
      // Keep the quote's full saved evidence set while using the shared
      // twenty-photo bound for the multimodal request.
      evidence: z.array(quoteEvidenceSchema).max(MAX_QUOTE_EVIDENCE_PHOTOS).optional(),
    }).superRefine((input, ctx) => {
      if (isLinearFootService(input.serviceType)) {
        if (!input.linearFeet) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["linearFeet"], message: "Enter measured Linear Feet for this service." });
        if (input.acreage !== undefined || input.clearingWidthFeet !== undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["linearFeet"], message: "This service uses measured Linear Feet only; do not use acreage conversion." });
      } else if (!input.acreage) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["acreage"], message: "Enter acreage for this service." });
      }
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: { serviceType: string; acreage?: number; linearFeet?: number; clearingWidthFeet?: number; unitRateCents?: number; terrain?: string; density?: string; access?: string; notes?: string; rentalEquipment?: QuoteRentalEquipment[]; rentalMarkupPct?: number; measurements?: QuoteMeasurement[]; evidence?: QuoteEvidenceAttachment[] } }) => {
      const { serviceType, acreage, linearFeet, clearingWidthFeet, unitRateCents, terrain, density, access, notes, rentalEquipment = [], rentalMarkupPct = 15, measurements = [], evidence = [] } = input;
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
        const footage = Math.max(1, Math.round(linearFeet ?? 0));
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
            quantitySource: "measured" as const,
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
        const rentalInclusiveTotal = getQuoteTotalWithRentalCharge(totalMid * 100, getQuoteRentalCostCents(rentalEquipment), rentalMarkupPct);
        return {
          title: `${serviceType} — ${footage.toLocaleString()} Linear Ft`,
          estimatedDuration: footage <= 1320 ? "1" : footage <= 5280 ? "2" : "3",
          clientMessage: `This quote covers approximately ${footage.toLocaleString()} linear feet of ${serviceType.toLowerCase()}. Final scope, site access, vegetation density, and ground conditions will be verified during the site visit.`,
          evidenceSummary: evidence.length > 0 || measurements.length > 0
            ? "Site photos and measurements are saved for owner review. Linear Foot pricing remains controlled by the recorded footage, saved Operations rates, and on-site verification."
            : "No site photos or measurements were provided. Linear Foot pricing remains subject to on-site verification.",
          lineItems,
          totalCents: rentalInclusiveTotal.totalCents,
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
            quantitySource: "measured" as const,
            sourceAcreage: null,
            clearingWidthFeet: null,
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

      const serviceTotalCents = lineItems.reduce((s, li) => s + li.totalCents, 0);
      const finalTotalCents = getQuoteTotalWithRentalCharge(serviceTotalCents, getQuoteRentalCostCents(rentalEquipment), rentalMarkupPct).totalCents;
      const belowMinimum = serviceTotalCents < MIN_JOB * 100;
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
      const phaseSummary = getQuotePortalPhaseSummary(parsePortalLineItems(quote.lineItems), getIncludedRentalCustomerCharge(quote));
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
      const revisions = await db.select().from(nativeQuoteRevisions)
        .where(eq(nativeQuoteRevisions.quoteId, quote.id))
        .orderBy(desc(nativeQuoteRevisions.revisionNumber))
        .limit(1);
      const activeRevision = revisions[0];
      const revisionSnapshot = parseNativeQuoteRevisionSnapshot(activeRevision?.snapshotJson) ?? buildNativeQuoteRevisionSnapshot({
        revisionNumber: 0,
        sentAt: (quote.portalSentAt ?? quote.createdAt).toISOString(),
        clientName: quote.clientName,
        title: quote.title,
        serviceType: quote.serviceType,
        acreage: quote.acreage,
        propertyAddress: quote.propertyAddress,
        estimatedDuration: quote.estimatedDuration,
        clientMessage: quote.clientMessage,
        lineItems: parsePortalLineItems(quote.lineItems),
        includedRentalCustomerChargeCents: getIncludedRentalCustomerCharge(quote),
        totalCents: quote.totalCents,
        sitePhotoReferences: getCustomerPhotoReferences(quote.quoteEvidence),
      });
      // Mark first view
      if (!quote.portalViewedAt) {
        const viewedAt = new Date();
        await db
          .update(nativeQuotes)
          .set({
            portalViewedAt: viewedAt,
            status: quote.status === "sent" ? "sent" : quote.status,
            nextActionType: "follow_up_viewed_48h",
            nextActionDueAt: new Date(viewedAt.getTime() + 48 * 60 * 60 * 1000),
          })
          .where(eq(nativeQuotes.id, quote.id));
        if (activeRevision && !activeRevision.viewedAt) {
          await db.update(nativeQuoteRevisions).set({ viewedAt }).where(eq(nativeQuoteRevisions.id, activeRevision.id));
        }
        await notifyOwner({
          title: `Quote Opened — ${quote.clientName}`,
          content: `${quote.clientName} just opened their quote portal link for "${quote.title}".`,
        }).catch(() => {/* non-critical */});
      }
      const lineItems = revisionSnapshot.lineItems;
      const includedRentalCustomerChargeCents = revisionSnapshot.includedRentalCustomerChargeCents;
      const phaseSummary = getQuotePortalPhaseSummary(lineItems, includedRentalCustomerChargeCents);
      return {
        type: "native" as const,
        id: quote.id,
        clientName: revisionSnapshot.clientName,
        title: revisionSnapshot.title,
        serviceType: revisionSnapshot.serviceType,
        acreage: revisionSnapshot.acreage,
        propertyAddress: revisionSnapshot.propertyAddress,
        estimatedDuration: revisionSnapshot.estimatedDuration,
        clientMessage: revisionSnapshot.clientMessage,
        sitePhotoReferences: revisionSnapshot.sitePhotoReferences,
        lineItems,
        phaseSummary,
        includesRequiredEquipmentCosts: includedRentalCustomerChargeCents > 0,
        totalCents: revisionSnapshot.totalCents,
        totalFormatted: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(revisionSnapshot.totalCents / 100),
        revisionNumber: revisionSnapshot.revisionNumber,
        revisionSentAt: revisionSnapshot.sentAt,
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
      action: z.enum(["declined", "changes_requested"]),
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
      const statusSync = input.action === "declined" ? "declined"
        : quote.status; // changes_requested stays in current status
      await db
        .update(nativeQuotes)
        .set({
          clientAction: input.action,
          clientActionAt: new Date(),
          status: statusSync,
          ...(input.action === "changes_requested" ? {
            changeRequestNote: input.note ?? null,
            changeRequestAt: new Date(),
            nextActionType: "revise_quote",
            nextActionDueAt: new Date(),
          } : {}),
          ...(input.action === "declined" ? {
            declineNote: input.note ?? null,
            nextActionType: "closed_declined",
            nextActionDueAt: null,
          } : {}),
        })
        .where(eq(nativeQuotes.id, quote.id));
      await notifyOwner({
        title: `Quote ${input.action === "declined" ? "Declined" : "Changes Requested"} — ${quote.clientName}`,
        content: `${quote.clientName} ${input.action === "declined" ? "declined" : "requested changes on"} the quote "${quote.title}".${input.note ? " Note: " + input.note : ""}`,
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
      const revisions = await db.select().from(nativeQuoteRevisions)
        .where(eq(nativeQuoteRevisions.quoteId, quote.id))
        .orderBy(desc(nativeQuoteRevisions.revisionNumber))
        .limit(1);
      const activeRevision = revisions[0];
      const snapshot = parseNativeQuoteRevisionSnapshot(activeRevision?.snapshotJson);
      const phaseSummary = getQuotePortalPhaseSummary(
        snapshot?.lineItems ?? parsePortalLineItems(quote.lineItems),
        snapshot?.includedRentalCustomerChargeCents ?? getIncludedRentalCustomerCharge(quote),
      );
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
        nextActionType: "collect_deposit",
        nextActionDueAt: acceptedAt,
      }).where(eq(nativeQuotes.id, quote.id));
      if (activeRevision) {
        await db.update(nativeQuoteRevisions).set({ acceptedAt }).where(eq(nativeQuoteRevisions.id, activeRevision.id));
      }
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
