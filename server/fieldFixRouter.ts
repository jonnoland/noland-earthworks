/**
 * Field Fix Router
 * AI-powered equipment diagnostics, service logs, and maintenance intervals.
 * Modeled after FieldFix.ai — scoped to a single-operator fleet.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  equipment,
  serviceLogs,
  serviceIntervals,
  fieldDiagnostics,
} from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import {
  extractServiceLogDocumentText,
  isSupportedServiceLogDocument,
  MAX_SERVICE_LOG_IMPORT_BYTES,
  sanitizeServiceLogImportFilename,
} from "./serviceLogImport";

// Strip markdown code fences from LLM JSON responses
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}


// ─── Equipment ────────────────────────────────────────────────────────────────

const upsertEquipmentSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(200),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  serialNumber: z.string().max(100).optional(),
  currentHours: z.number().int().min(0).optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  status: z.enum(["active", "inactive", "sold"]).optional(),
});

// ─── Service Log ──────────────────────────────────────────────────────────────

const createServiceLogSchema = z.object({
  equipmentId: z.number().int(),
  serviceType: z.string().min(1).max(100),
  serviceDate: z.string(), // ISO date string
  hoursAtService: z.number().int().min(0).optional(),
  performedBy: z.string().max(200).optional(),
  notes: z.string().optional(),
  cost: z.string().optional(), // decimal as string
  receiptUrl: z.string().optional(),
});

const importedServiceLogEntrySchema = z.object({
  serviceType: z.string().trim().min(1).max(100),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid service date.").refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Use a valid service date."),
  hoursAtService: z.number().int().min(0).nullable(),
  performedBy: z.string().trim().max(200),
  notes: z.string().trim().max(8_000),
  cost: z.number().min(0).max(1_000_000).nullable(),
});

const SERVICE_LOG_IMPORT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      maxItems: 150,
      items: {
        type: "object",
        properties: {
          serviceType: { type: "string" },
          serviceDate: { type: "string" },
          hoursAtService: { type: ["integer", "null"] },
          performedBy: { type: "string" },
          notes: { type: "string" },
          cost: { type: ["number", "null"] },
        },
        required: ["serviceType", "serviceDate", "hoursAtService", "performedBy", "notes", "cost"],
        additionalProperties: false,
      },
    },
    importNotes: { type: "string" },
  },
  required: ["entries", "importNotes"],
  additionalProperties: false,
} as const;

// ─── Service Intervals ────────────────────────────────────────────────────────

const upsertIntervalSchema = z.object({
  id: z.number().optional(),
  equipmentId: z.number().int(),
  serviceType: z.string().min(1).max(100),
  intervalHours: z.number().int().min(1),
  lastServiceHours: z.number().int().min(0).optional(),
  lastServiceDate: z.string().optional(), // ISO date string
  notes: z.string().optional(),
});

// ─── Fix Report JSON shape ────────────────────────────────────────────────────

interface RootCause {
  rank: number;
  cause: string;
  confidence: number;
}

interface FixReport {
  headline: string;
  confidence: number;
  confidenceLabel: string;
  confidenceNote: string;
  rootCauses: RootCause[];
  fixSteps: string[];
  estimatedTime: string;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  toolsRequired: string[];
  safetyNotice: string;
  escalate: boolean;
  escalateReason?: string;
}

export const fieldFixRouter = router({
  // ── Equipment ──────────────────────────────────────────────────────────────

  listEquipment: adminProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    return db
      .select()
      .from(equipment)
      .where(eq(equipment.status, "active"))
      .orderBy(desc(equipment.createdAt));
  }),

  upsertEquipment: adminProcedure
    .input(upsertEquipmentSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, ...data } = input;
      if (id) {
        await db
          .update(equipment)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(equipment.id, id));
        return { id };
      } else {
        const result = await db.insert(equipment).values({
          name: data.name,
          make: data.make,
          model: data.model,
          year: data.year,
          serialNumber: data.serialNumber,
          currentHours: data.currentHours ?? 0,
          hoursUpdatedAt: new Date(),
          tags: data.tags,
          notes: data.notes,
          photoUrl: data.photoUrl,
          status: data.status ?? "active",
        });
        return { id: Number((result as any).insertId) };
      }
    }),

  updateHours: adminProcedure
    .input(z.object({ id: z.number().int(), hours: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(equipment)
        .set({ currentHours: input.hours, hoursUpdatedAt: new Date(), updatedAt: new Date() })
        .where(eq(equipment.id, input.id));
      return { ok: true };
    }),

  updateSerialNumber: adminProcedure
    .input(z.object({ id: z.number().int(), serialNumber: z.string().trim().min(1).max(100) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(equipment)
        .set({ serialNumber: input.serialNumber, updatedAt: new Date() })
        .where(eq(equipment.id, input.id));
      return { ok: true };
    }),

  deleteEquipment: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(equipment)
        .set({ status: "sold", updatedAt: new Date() })
        .where(eq(equipment.id, input.id));
      return { ok: true };
    }),

  // ── Service Logs ───────────────────────────────────────────────────────────

  listServiceLogs: adminProcedure
    .input(z.object({ equipmentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select()
        .from(serviceLogs)
        .where(eq(serviceLogs.equipmentId, input.equipmentId))
        .orderBy(desc(serviceLogs.serviceDate));
    }),

  createServiceLog: adminProcedure
    .input(createServiceLogSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const result = await db.insert(serviceLogs).values({
        equipmentId: input.equipmentId,
        serviceType: input.serviceType,
        serviceDate: new Date(input.serviceDate),
        hoursAtService: input.hoursAtService,
        performedBy: input.performedBy,
        notes: input.notes,
        cost: input.cost,
        receiptUrl: input.receiptUrl,
      });
      return { id: Number((result as any).insertId) };
    }),

  deleteServiceLog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(serviceLogs).where(eq(serviceLogs.id, input.id));
      return { ok: true };
    }),

  /**
   * Saves the source document, extracts its text locally, then produces editable
   * candidate service-log rows. Nothing is added to the maintenance history until
   * the owner reviews and imports the selected rows.
   */
  extractServiceLogDocument: adminProcedure
    .input(z.object({
      equipmentId: z.number().int(),
      filename: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().max(150),
      base64: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isSupportedServiceLogDocument(input.filename, input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Use a PDF, DOC, or DOCX service log document." });
      }
      const normalizedBase64 = input.base64.replace(/^data:[^;]+;base64,/, "");
      const bytes = Buffer.from(normalizedBase64, "base64");
      if (!bytes.length || bytes.length > MAX_SERVICE_LOG_IMPORT_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Each service log document must be 10 MB or smaller." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [machine] = await db
        .select({ name: equipment.name, make: equipment.make, model: equipment.model, serialNumber: equipment.serialNumber })
        .from(equipment)
        .where(eq(equipment.id, input.equipmentId))
        .limit(1);
      if (!machine) throw new TRPCError({ code: "NOT_FOUND", message: "Equipment was not found." });

      let extracted;
      try {
        extracted = await extractServiceLogDocumentText(bytes, input.filename);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "The service log document could not be read.",
        });
      }

      const safeFilename = sanitizeServiceLogImportFilename(input.filename);
      const key = `field-fix/service-log-imports/${ctx.user.id}/${Date.now()}-${randomBytes(8).toString("hex")}-${safeFilename}`;
      const { url: sourceDocumentUrl } = await storagePut(key, bytes, input.mimeType);

      const machineDescription = [machine.make, machine.model, machine.name, machine.serialNumber ? `serial ${machine.serialNumber}` : ""]
        .filter(Boolean)
        .join(" ");
      const prompt = `Extract maintenance service events from this equipment service-log document for ${machineDescription || "the selected equipment"}.

Return one entry for every separate service, repair, inspection, parts replacement, or maintenance event. Do not combine separate dated events. Preserve exact dates as YYYY-MM-DD. If an entry has no trustworthy date, do not include it. Use the work performed as serviceType (plain language, 100 characters maximum). Extract hours, cost in dollars, performer, and useful notes only when present. Do not invent values. Empty text fields must be empty strings and missing numeric values must be null.

SOURCE DOCUMENT TEXT:
${extracted.text}`;

      let parsed: unknown;
      try {
        const response = await invokeLLM({
          model: "gpt-5-mini",
          temperature: 0,
          maxTokens: 8_000,
          messages: [
            { role: "system", content: "You extract accurate structured maintenance records. Output only the required JSON schema." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "service_log_import",
              strict: true,
              schema: SERVICE_LOG_IMPORT_OUTPUT_SCHEMA,
            },
          },
        });
        const raw = response.choices[0]?.message?.content;
        parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw ?? {}));
      } catch (error) {
        console.error("[Field Fix] Service log extraction failed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "I could not turn that document into service entries. Please review the file and try again." });
      }

      const result = z.object({
        entries: z.array(importedServiceLogEntrySchema).max(150),
        importNotes: z.string().max(1_000),
      }).safeParse(parsed);
      if (!result.success || result.data.entries.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No dated service events were found. You can still add service entries manually." });
      }

      return {
        sourceDocumentUrl,
        sourceDocumentName: safeFilename,
        entries: result.data.entries,
        importNotes: result.data.importNotes,
      };
    }),

  /** Writes the reviewed candidate rows into the selected machine's service history. */
  importServiceLogEntries: adminProcedure
    .input(z.object({
      equipmentId: z.number().int(),
      sourceDocumentUrl: z.string().url().max(2_000),
      sourceDocumentName: z.string().trim().min(1).max(255),
      entries: z.array(importedServiceLogEntrySchema).min(1).max(150),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [machine] = await db.select({ id: equipment.id }).from(equipment).where(eq(equipment.id, input.equipmentId)).limit(1);
      if (!machine) throw new TRPCError({ code: "NOT_FOUND", message: "Equipment was not found." });

      await db.insert(serviceLogs).values(input.entries.map((entry) => ({
        equipmentId: input.equipmentId,
        serviceType: entry.serviceType,
        serviceDate: new Date(`${entry.serviceDate}T12:00:00Z`),
        hoursAtService: entry.hoursAtService ?? undefined,
        performedBy: entry.performedBy || undefined,
        notes: entry.notes || undefined,
        cost: entry.cost != null ? entry.cost.toFixed(2) : undefined,
        sourceDocumentUrl: input.sourceDocumentUrl,
        sourceDocumentName: input.sourceDocumentName,
        importedAt: new Date(),
      })));
      return { importedCount: input.entries.length };
    }),

  // ── Service Intervals ──────────────────────────────────────────────────────

  listIntervals: adminProcedure
    .input(z.object({ equipmentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return db
        .select()
        .from(serviceIntervals)
        .where(eq(serviceIntervals.equipmentId, input.equipmentId))
        .orderBy(serviceIntervals.serviceType);
    }),

  upsertInterval: adminProcedure
    .input(upsertIntervalSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, lastServiceDate, ...data } = input;
      const parsedDate = lastServiceDate ? new Date(lastServiceDate) : undefined;
      if (id) {
        await db
          .update(serviceIntervals)
          .set({ ...data, lastServiceDate: parsedDate, updatedAt: new Date() })
          .where(eq(serviceIntervals.id, id));
        return { id };
      } else {
        const result = await db.insert(serviceIntervals).values({
          equipmentId: data.equipmentId,
          serviceType: data.serviceType,
          intervalHours: data.intervalHours,
          lastServiceHours: data.lastServiceHours,
          lastServiceDate: parsedDate,
          notes: data.notes,
        });
        return { id: Number((result as any).insertId) };
      }
    }),

  deleteInterval: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(serviceIntervals).where(eq(serviceIntervals.id, input.id));
      return { ok: true };
    }),

  // ── AI Diagnostics ─────────────────────────────────────────────────────────

  runDiagnostic: adminProcedure
    .input(
      z.object({
        equipmentId: z.number().int().optional(),
        equipmentDescription: z.string().optional(), // e.g. "2021 Fecon FTX148L tracked forestry mulcher"
        symptoms: z.string().min(5).max(2000),
        errorCode: z.string().max(100).optional(),
        photoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch equipment details if ID provided
      let machineContext = input.equipmentDescription ?? "heavy equipment";
      if (input.equipmentId) {
        const [machine] = await db
          .select()
          .from(equipment)
          .where(eq(equipment.id, input.equipmentId))
          .limit(1);
        if (machine) {
          machineContext = [
            machine.year,
            machine.make,
            machine.model,
            machine.name,
            machine.currentHours ? `(${machine.currentHours} hours)` : "",
          ]
            .filter(Boolean)
            .join(" ");
        }
      }

      const systemPrompt = `You are an expert heavy equipment mechanic and diagnostician with 20+ years of experience on forestry mulchers, tracked machines, skid steers, excavators, and related equipment. You specialize in diagnosing issues from operator-described symptoms and error codes.

Your job is to produce a structured Fix Report in JSON format. Be practical, specific, and actionable — this is for a working owner-operator in the field, not a dealer technician.

IMPORTANT: Always include a safety notice if the repair involves hydraulics, electrical, or high-pressure systems. Recommend escalation to a dealer or mobile tech when the repair requires specialized tools or poses serious risk.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "headline": "short diagnosis title (max 80 chars)",
  "confidence": 75,
  "confidenceLabel": "Moderate",
  "confidenceNote": "one sentence explaining confidence level",
  "rootCauses": [
    { "rank": 1, "cause": "most likely cause", "confidence": 85 },
    { "rank": 2, "cause": "second possibility", "confidence": 60 },
    { "rank": 3, "cause": "third possibility", "confidence": 40 }
  ],
  "fixSteps": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "estimatedTime": "2-4 hours",
  "estimatedCostLow": 50,
  "estimatedCostHigh": 300,
  "toolsRequired": ["tool 1", "tool 2"],
  "safetyNotice": "safety warning or empty string if not applicable",
  "escalate": false,
  "escalateReason": "reason to escalate or omit if escalate is false"
}`;

      const userMessage = [
        `Machine: ${machineContext}`,
        `Symptoms: ${input.symptoms}`,
        input.errorCode ? `Error code: ${input.errorCode}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const llmMessages: any[] = input.photoUrl
        ? [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: userMessage },
                { type: "image_url", image_url: { url: input.photoUrl, detail: "high" } },
              ],
            },
          ]
        : [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ];

      const response = await invokeLLM({ messages: llmMessages });
      const rawContent = response.choices[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

      let report: FixReport;
      try {
        report = JSON.parse(stripCodeFence(raw)) as FixReport;
      } catch {
        // Attempt to extract JSON from response if wrapped in markdown
        const match = raw.match(/\{[\s\S]*\}/);
        report = match ? (JSON.parse(match[0]) as FixReport) : ({
          headline: "Diagnosis unavailable",
          confidence: 0,
          confidenceLabel: "Unknown",
          confidenceNote: "Could not parse AI response.",
          rootCauses: [],
          fixSteps: [],
          estimatedTime: "Unknown",
          estimatedCostLow: 0,
          estimatedCostHigh: 0,
          toolsRequired: [],
          safetyNotice: "",
          escalate: false,
        } as FixReport);
      }

      // Persist to DB
      const result = await db.insert(fieldDiagnostics).values({
        equipmentId: input.equipmentId,
        symptoms: input.symptoms,
        errorCode: input.errorCode,
        photoUrl: input.photoUrl,
        reportJson: JSON.stringify(report),
        headline: report.headline,
        confidence: report.confidence,
      });

      return {
        id: Number((result as any).insertId),
        report,
      };
    }),

  listDiagnostics: adminProcedure
    .input(
      z.object({
        equipmentId: z.number().int().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select()
        .from(fieldDiagnostics)
        .where(
          input.equipmentId
            ? eq(fieldDiagnostics.equipmentId, input.equipmentId)
            : undefined
        )
        .orderBy(desc(fieldDiagnostics.createdAt))
        .limit(input.limit);
      return rows.map((r) => ({
        ...r,
        report: r.reportJson ? (JSON.parse(r.reportJson) as FixReport) : null,
      }));
    }),

  getDiagnostic: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [row] = await db
        .select()
        .from(fieldDiagnostics)
        .where(eq(fieldDiagnostics.id, input.id))
        .limit(1);
      if (!row) return null;
      return {
        ...row,
        report: row.reportJson ? (JSON.parse(row.reportJson) as FixReport) : null,
      };
    }),

  deleteDiagnostic: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(fieldDiagnostics).where(eq(fieldDiagnostics.id, input.id));
      return { ok: true };
    }),

  /** Generate (or retrieve existing) a shareable token for a diagnostic report */
  generateShareToken: adminProcedure
    .input(z.object({
      id: z.number().int(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
      forceNew: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [row] = await db
        .select({ id: fieldDiagnostics.id, shareToken: fieldDiagnostics.shareToken, shareTokenExpiresAt: fieldDiagnostics.shareTokenExpiresAt })
        .from(fieldDiagnostics)
        .where(eq(fieldDiagnostics.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Diagnostic not found" });
      // Reuse existing token unless forceNew or no token yet
      if (row.shareToken && !input.forceNew) {
        // Update expiry if provided
        if (input.expiresInDays !== undefined) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
          await db.update(fieldDiagnostics).set({ shareTokenExpiresAt: expiresAt }).where(eq(fieldDiagnostics.id, input.id));
        }
        return { token: row.shareToken };
      }
      const token = randomBytes(24).toString("hex");
      const expiresAt = input.expiresInDays ? (() => { const d = new Date(); d.setDate(d.getDate() + input.expiresInDays!); return d; })() : null;
      await db
        .update(fieldDiagnostics)
        .set({ shareToken: token, shareTokenExpiresAt: expiresAt })
        .where(eq(fieldDiagnostics.id, input.id));
      return { token };
    }),

  /** Revoke a shareable link by clearing the token */
  revokeShareToken: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .update(fieldDiagnostics)
        .set({ shareToken: null, shareTokenExpiresAt: null })
        .where(eq(fieldDiagnostics.id, input.id));
      return { success: true };
    }),

  /** Public endpoint — fetch a diagnostic by share token (no auth required) */
  getSharedDiagnostic: adminProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [row] = await db
        .select()
        .from(fieldDiagnostics)
        .where(eq(fieldDiagnostics.shareToken, input.token))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found or link expired" });
      // Check expiry
      if (row.shareTokenExpiresAt && new Date() > new Date(row.shareTokenExpiresAt)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This link has expired." });
      }
      return {
        ...row,
        report: row.reportJson ? (JSON.parse(row.reportJson) as FixReport) : null,
      };
    }),

  // ── Photo Upload ───────────────────────────────────────────────────────────

  getPhotoUploadUrl: adminProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const suffix = Date.now().toString(36);
      const key = `field-fix/photos/${suffix}-${input.filename}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(key, buffer, input.contentType);
      return { url };
    }),
});

export type FieldFixRouter = typeof fieldFixRouter;
