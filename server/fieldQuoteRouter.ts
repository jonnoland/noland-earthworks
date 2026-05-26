/**
 * Field Quote Router
 * Handles quote submissions from the Noland Field mobile companion app.
 * Procedures: list, get, submit, uploadPhoto, reverseGeocode
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb, createOpsLead, getOwnerUser } from "./db";
import { fieldQuotes } from "../drizzle/schema";
import { storagePut } from "./storage";
import { makeRequest } from "./_core/map";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";

// ─── AI Qualifier ─────────────────────────────────────────────────────────────

const FIELD_QUALIFIER_PROMPT = `You are an AI assistant for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee. Your job is to qualify incoming field quote requests and score them for the owner, Jon Noland.

SCORING CRITERIA:

STRONG lead (score: "strong"):
- Clear project goal (land management, forestry mulching, pasture reclamation, site prep)
- Acreage in the 2–20 acre range
- Located in Middle or West Tennessee service area
- Terrain and vegetation conditions are manageable
- No red flags

MARGINAL lead (score: "marginal"):
- Project is within scope but has complicating factors
- Acreage is very small (<1 acre) or very large (>50 acres, may need phasing)
- Steep terrain, very heavy vegetation, or difficult access
- Some ambiguity in scope or customer expectations

WEAK lead (score: "weak"):
- Expects grading, excavation, or hauling (outside scope)
- Suburban lot under 0.5 acres that won't justify mobilization
- Vague with no clear goal or property details
- Unrealistic expectations

SERVICES OFFERED:
- Forestry mulching (primary)
- Land management / land clearing / site prep
- Right-of-way clearing
- Brush hogging (secondary)

SERVICES NOT OFFERED (flag these):
- Grading, leveling, excavation
- Debris hauling
- Large tree removal (arborist work)

DRAFT RESPONSE VOICE:
Write in Jon's voice — direct, professional, warm. Sound like a real person who does this work. No corporate language. No emojis. Keep it to 2–3 sentences.`;

async function qualifyFieldLead(data: {
  name: string;
  serviceType?: string | null;
  acreage?: string | null;
  address?: string | null;
  terrainType?: string | null;
  vegetationDensity?: string | null;
  vegetationTypes?: string | null;
  slopeCondition?: string | null;
  accessCondition?: string | null;
  obstacles?: string | null;
  proximityToStructures?: string | null;
  message?: string | null;
}) {
  const submissionText = [
    `Name: ${data.name}`,
    `Service Requested: ${data.serviceType || "Not specified"}`,
    data.acreage ? `Acreage: ${data.acreage}` : "Acreage: Not specified",
    data.address ? `Address: ${data.address}` : "",
    data.terrainType ? `Terrain: ${data.terrainType}` : "",
    data.vegetationDensity ? `Vegetation Density: ${data.vegetationDensity}` : "",
    data.vegetationTypes ? `Vegetation Types: ${data.vegetationTypes}` : "",
    data.slopeCondition ? `Slope: ${data.slopeCondition}` : "",
    data.accessCondition ? `Site Access: ${data.accessCondition}` : "",
    data.obstacles ? `Obstacles: ${data.obstacles}` : "",
    data.proximityToStructures ? `Proximity to Structures: ${data.proximityToStructures}` : "",
    data.message ? `Field Notes: "${data.message}"` : "",
  ].filter(Boolean).join("\n");

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: FIELD_QUALIFIER_PROMPT },
        {
          role: "user",
          content: `Please qualify this field quote request and return a JSON response:\n\n${submissionText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lead_qualification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "string", enum: ["strong", "marginal", "weak"] },
              summary: { type: "string" },
              flags: { type: "array", items: { type: "string" } },
              draftResponse: { type: "string" },
            },
            required: ["score", "summary", "flags", "draftResponse"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");
    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    return {
      score: parsed.score as "strong" | "marginal" | "weak",
      summary: parsed.summary as string,
      flags: Array.isArray(parsed.flags) ? parsed.flags as string[] : [],
      draftResponse: parsed.draftResponse as string,
    };
  } catch (err) {
    console.error("[FieldQuoteRouter] AI qualification failed:", err);
    return {
      score: "marginal" as const,
      summary: `Field quote from ${data.name} for ${data.serviceType || "land work"}.`,
      flags: ["AI qualification failed — review manually"],
      draftResponse: `Hi ${data.name.split(" ")[0]}, thanks for submitting this field quote. I'll review the details and follow up shortly.`,
    };
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const fieldQuoteRouter = router({
  /**
   * List field quotes — owner-only, newest first.
   */
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(fieldQuotes)
        .orderBy(desc(fieldQuotes.createdAt))
        .limit(input.limit);
      return rows.map((r) => ({
        ...r,
        photoUrls: r.photoUrls ? (JSON.parse(r.photoUrls) as string[]) : [],
        aiFlags: r.aiFlags ? (JSON.parse(r.aiFlags) as string[]) : [],
      }));
    }),

  /**
   * Get a single field quote by ID — owner-only.
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(fieldQuotes)
        .where(eq(fieldQuotes.id, input.id))
        .limit(1);
      if (!rows.length) throw new Error("Field quote not found");
      const r = rows[0];
      return {
        ...r,
        photoUrls: r.photoUrls ? (JSON.parse(r.photoUrls) as string[]) : [],
        aiFlags: r.aiFlags ? (JSON.parse(r.aiFlags) as string[]) : [],
      };
    }),

  /**
   * Submit a new field quote from the mobile app.
   * Runs AI qualification asynchronously after saving.
   */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        serviceType: z.string().optional(),
        acreage: z.number().positive().optional(),
        terrainType: z.string().optional(),
        vegetationDensity: z.string().optional(),
        vegetationTypes: z.string().optional(),
        slopeCondition: z.string().optional(),
        accessCondition: z.string().optional(),
        obstacles: z.string().optional(),
        proximityToStructures: z.string().optional(),
        message: z.string().optional(),
        photoUrls: z.array(z.string().url()).default([]),
        source: z.string().default("field_app"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Insert the field quote record
      const [inserted] = await db
        .insert(fieldQuotes)
        .values({
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          lat: input.lat !== undefined ? String(input.lat) : null,
          lng: input.lng !== undefined ? String(input.lng) : null,
          serviceType: input.serviceType ?? null,
          acreage: input.acreage !== undefined ? String(input.acreage) : null,
          terrainType: input.terrainType ?? null,
          vegetationDensity: input.vegetationDensity ?? null,
          vegetationTypes: input.vegetationTypes ?? null,
          slopeCondition: input.slopeCondition ?? null,
          accessCondition: input.accessCondition ?? null,
          obstacles: input.obstacles ?? null,
          proximityToStructures: input.proximityToStructures ?? null,
          message: input.message ?? null,
          photoUrls: JSON.stringify(input.photoUrls),
          source: input.source,
        })
        .$returningId();

      const newId = inserted?.id;

      // 2. Run AI qualification and create ops lead in the background
      setImmediate(async () => {
        try {
          const qualification = await qualifyFieldLead({
            name: input.name,
            serviceType: input.serviceType,
            acreage: input.acreage !== undefined ? String(input.acreage) : null,
            address: input.address,
            terrainType: input.terrainType,
            vegetationDensity: input.vegetationDensity,
            vegetationTypes: input.vegetationTypes,
            slopeCondition: input.slopeCondition,
            accessCondition: input.accessCondition,
            obstacles: input.obstacles,
            proximityToStructures: input.proximityToStructures,
            message: input.message,
          });

          // Update the field quote with AI results
          if (newId) {
            await db
              .update(fieldQuotes)
              .set({
                aiScore: qualification.score,
                aiSummary: qualification.summary,
                aiFlags: JSON.stringify(qualification.flags),
                aiDraftResponse: qualification.draftResponse,
              })
              .where(eq(fieldQuotes.id, newId));
          }

          // 3. Create an ops lead for CRM tracking
          const ownerUser = await getOwnerUser();
          if (ownerUser) {
            const noteLines = [
              `Source: Noland Field mobile app`,
              input.serviceType ? `Service: ${input.serviceType}` : "",
              input.acreage ? `Acreage: ${input.acreage} acres` : "",
              input.address ? `Address: ${input.address}` : "",
              input.lat && input.lng ? `GPS: ${input.lat}, ${input.lng}` : "",
              input.terrainType ? `Terrain: ${input.terrainType}` : "",
              input.vegetationDensity ? `Vegetation: ${input.vegetationDensity}` : "",
              input.slopeCondition ? `Slope: ${input.slopeCondition}` : "",
              input.accessCondition ? `Access: ${input.accessCondition}` : "",
              input.obstacles ? `Obstacles: ${input.obstacles}` : "",
              input.proximityToStructures ? `Near structures: ${input.proximityToStructures}` : "",
              input.photoUrls.length > 0 ? `Photos: ${input.photoUrls.length} attached` : "",
              input.message ? `Notes: ${input.message}` : "",
            ].filter(Boolean).join("\n");

            await createOpsLead({
              userId: ownerUser.id,
              name: input.name,
              email: input.email ?? null,
              phone: input.phone ?? null,
              jobType: input.serviceType ?? "Field Quote",
              notes: noteLines,
              source: "field_app",
              stage: "new",
              aiScore: qualification.score,
              aiSummary: qualification.summary,
              aiFlags: JSON.stringify(qualification.flags),
              aiDraftResponse: qualification.draftResponse,
            });
          }

          // 4. Notify owner
          await notifyOwner({
            title: `New Field Quote — ${input.name}`,
            content: `${input.serviceType || "Land work"} · ${input.acreage ? `${input.acreage} acres` : "acreage TBD"} · AI Score: ${qualification.score.toUpperCase()}\n${input.address || "No address"}\n\n${qualification.summary}`,
          });
        } catch (err) {
          console.error("[FieldQuoteRouter] Background processing failed:", err);
        }
      });

      return { success: true, id: newId };
    }),

  /**
   * Upload a photo from the mobile app to S3.
   * Accepts base64-encoded image data and returns the public URL.
   */
  uploadPhoto: publicProcedure
    .input(
      z.object({
        base64: z.string().min(1),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const key = `field-quotes/photos/${Date.now()}-${randomSuffix}.${ext}`;

      // Decode base64 to buffer
      const buffer = Buffer.from(input.base64, "base64");

      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  /**
   * Reverse geocode GPS coordinates to a human-readable address.
   */
  reverseGeocode: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ input }) => {
      try {
        const result = await makeRequest<{
          results: Array<{ formatted_address: string }>;
          status: string;
        }>(`/maps/api/geocode/json`, {
          latlng: `${input.lat},${input.lng}`,
        });

        if (result.status === "OK" && result.results.length > 0) {
          return { address: result.results[0].formatted_address };
        }
        return { address: null };
      } catch (err) {
        console.error("[FieldQuoteRouter] Reverse geocode failed:", err);
        return { address: null };
      }
    }),
});
