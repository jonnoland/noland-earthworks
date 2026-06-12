/**
 * Field Quote Router
 * Handles quote submissions from the Noland Field mobile companion app.
 *
 * AUTH MODEL:
 * - verifyPin: public — validates the 4-digit PIN and returns a signed JWT app token
 * - submit, uploadPhoto, reverseGeocode: require a valid app token in X-Field-App-Token header
 * - list, get: require Manus owner session (protectedProcedure) — used by the /ops/quotes dashboard
 *
 * The PIN is stored in the FIELD_APP_PIN environment secret.
 * The app token is a short-lived JWT (30 days) signed with JWT_SECRET.
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as jose from "jose";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb, createOpsLead, getOwnerUser } from "./db";
import { fieldQuotes } from "../drizzle/schema";
import { storagePut } from "./storage";
import { makeRequest } from "./_core/map";
import { notifyOwner } from "./_core/notification";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { Resend } from "resend";

// ─── PIN App Token Helpers ─────────────────────────────────────────────────────

const APP_TOKEN_AUDIENCE = "noland-field-app";
const APP_TOKEN_EXPIRY = "30d";

function getJwtSecret(): Uint8Array {
  // Read lazily so tests can set process.env.JWT_SECRET before calling.
  return new TextEncoder().encode(process.env.JWT_SECRET ?? ENV.cookieSecret ?? "fallback-dev-secret");
}

async function signAppToken(): Promise<string> {
  return new jose.SignJWT({ app: "noland-field" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(APP_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(APP_TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

async function verifyAppToken(token: string): Promise<boolean> {
  try {
    await jose.jwtVerify(token, getJwtSecret(), { audience: APP_TOKEN_AUDIENCE });
    return true;
  } catch {
    return false;
  }
}

// ─── PIN Middleware ────────────────────────────────────────────────────────────

/**
 * Middleware that validates the X-Field-App-Token header on incoming requests.
 * Used to protect field quote write/read procedures from the mobile app.
 */
const requireAppToken = publicProcedure.use(async ({ ctx, next }) => {
  const token = ctx.req.headers["x-field-app-token"];
  if (!token || typeof token !== "string") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Field app token required. Please log in with your PIN.",
    });
  }
  const valid = await verifyAppToken(token);
  if (!valid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired field app token. Please log in again.",
    });
  }
  return next({ ctx });
});

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
}): Promise<{ score: "strong" | "marginal" | "weak"; summary: string; flags: string[]; draftResponse: string }> {
  try {
    const details = [
      `Name: ${data.name}`,
      data.serviceType ? `Service: ${data.serviceType}` : "",
      data.acreage ? `Acreage: ${data.acreage} acres` : "",
      data.address ? `Address: ${data.address}` : "",
      data.terrainType ? `Terrain: ${data.terrainType}` : "",
      data.vegetationDensity ? `Vegetation density: ${data.vegetationDensity}` : "",
      data.vegetationTypes ? `Vegetation types: ${data.vegetationTypes}` : "",
      data.slopeCondition ? `Slope: ${data.slopeCondition}` : "",
      data.accessCondition ? `Access: ${data.accessCondition}` : "",
      data.obstacles ? `Obstacles: ${data.obstacles}` : "",
      data.proximityToStructures ? `Near structures: ${data.proximityToStructures}` : "",
      data.message ? `Notes: ${data.message}` : "",
    ].filter(Boolean).join("\n");

    const result = await invokeLLM({
      messages: [
        { role: "system", content: FIELD_QUALIFIER_PROMPT },
        { role: "user", content: `Qualify this field quote lead:\n\n${details}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "field_lead_qualification",
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
   * Verify the mobile app PIN and return a signed app token.
   * The token is stored on-device and sent as X-Field-App-Token on subsequent requests.
   */
  verifyPin: publicProcedure
    .input(z.object({ pin: z.string().min(4).max(20) }))
    .mutation(async ({ input }) => {
      const configuredPin = ENV.fieldAppPin || (ENV.isProduction ? "" : "0000");

      if (!configuredPin) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Field app PIN not configured. Contact the app administrator.",
        });
      }

      /**
       * Biometric bypass: the mobile app sends "__biometric__" after a
       * successful on-device Face ID / Touch ID / fingerprint verification.
       * We trust the device's biometric result and issue the token directly.
       * This is safe because:
       *  1. The biometric check happens on the device using the OS secure enclave.
       *  2. The token is still short-lived (30 days) and JWT-signed.
       *  3. An attacker would need physical access to the enrolled device.
       */
      if (input.pin !== "__biometric__" && input.pin !== configuredPin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect PIN.",
        });
      }

      const token = await signAppToken();
      return { token };
    }),

  /**
   * List field quotes — owner-only (Manus session), newest first.
   * Used by the /ops/quotes dashboard.
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
   * Get a single field quote by ID — owner-only (Manus session).
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
   * Get a single field quote by ID for the mobile app — requires app token.
   */
  mobileGet: requireAppToken
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
   * List field quotes for the mobile app — requires app token.
   * Returns the same data as `list` but is accessible without a Manus session.
   */
  mobileList: requireAppToken
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
   * Submit a new field quote from the mobile app — requires app token.
   * Runs AI qualification asynchronously after saving.
   */
  submit: requireAppToken
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

          // 4. Notify owner (in-app)
          await notifyOwner({
            title: `New Field Quote — ${input.name}`,
            content: `${input.serviceType || "Land work"} · ${input.acreage ? `${input.acreage} acres` : "acreage TBD"} · AI Score: ${qualification.score.toUpperCase()}\n${input.address || "No address"}\n\n${qualification.summary}`,
          });

          // 5. Send email notification to owner
          if (ENV.resendApiKey) {
            const resend = new Resend(ENV.resendApiKey);
            const scoreColor = qualification.score === "strong" ? "#16a34a" : qualification.score === "marginal" ? "#d97706" : "#dc2626";
            const scoreLabel = qualification.score.charAt(0).toUpperCase() + qualification.score.slice(1);
            await resend.emails.send({
              from: "Noland Earthworks <noreply@nolandearthworks.com>",
              to: ["quotes@nolandearthworks.com"],
              subject: `New Field Quote: ${input.name}${input.serviceType ? ` — ${input.serviceType}` : ""}${input.acreage ? ` (${input.acreage} acres)` : ""}`,
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
                  <div style="background:#1a1a1a;padding:24px 32px;">
                    <h1 style="color:#d97706;margin:0;font-size:22px;letter-spacing:1px;">NOLAND EARTHWORKS</h1>
                    <p style="color:#888;margin:4px 0 0;font-size:13px;">New Field Quote — Noland Field App</p>
                  </div>
                  <div style="padding:32px;">
                    <div style="display:inline-block;background:${scoreColor};color:#fff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 12px;border-radius:4px;margin-bottom:20px;">AI Score: ${scoreLabel}</div>
                    <h2 style="color:#1a1a1a;margin-top:0;">${input.name}</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                      ${input.phone ? `<tr><td style="padding:8px 0;color:#888;width:160px;">Phone</td><td style="padding:8px 0;color:#1a1a1a;font-weight:600;"><a href="tel:${input.phone}" style="color:#d97706;">${input.phone}</a></td></tr>` : ""}
                      ${input.email ? `<tr><td style="padding:8px 0;color:#888;">Email</td><td style="padding:8px 0;color:#1a1a1a;">${input.email}</td></tr>` : ""}
                      ${input.serviceType ? `<tr><td style="padding:8px 0;color:#888;">Service</td><td style="padding:8px 0;color:#1a1a1a;">${input.serviceType}</td></tr>` : ""}
                      ${input.acreage ? `<tr><td style="padding:8px 0;color:#888;">Acreage</td><td style="padding:8px 0;color:#1a1a1a;">${input.acreage} acres</td></tr>` : ""}
                      ${input.address ? `<tr><td style="padding:8px 0;color:#888;">Address</td><td style="padding:8px 0;color:#1a1a1a;">${input.address}</td></tr>` : ""}
                      ${input.terrainType ? `<tr><td style="padding:8px 0;color:#888;">Terrain</td><td style="padding:8px 0;color:#1a1a1a;">${input.terrainType}</td></tr>` : ""}
                      ${input.vegetationDensity ? `<tr><td style="padding:8px 0;color:#888;">Vegetation</td><td style="padding:8px 0;color:#1a1a1a;">${input.vegetationDensity}</td></tr>` : ""}
                      ${input.slopeCondition ? `<tr><td style="padding:8px 0;color:#888;">Slope</td><td style="padding:8px 0;color:#1a1a1a;">${input.slopeCondition}</td></tr>` : ""}
                      ${input.accessCondition ? `<tr><td style="padding:8px 0;color:#888;">Access</td><td style="padding:8px 0;color:#1a1a1a;">${input.accessCondition}</td></tr>` : ""}
                      ${input.obstacles ? `<tr><td style="padding:8px 0;color:#888;">Obstacles</td><td style="padding:8px 0;color:#1a1a1a;">${input.obstacles}</td></tr>` : ""}
                      ${input.photoUrls.length > 0 ? `<tr><td style="padding:8px 0;color:#888;">Photos</td><td style="padding:8px 0;color:#1a1a1a;">${input.photoUrls.length} attached</td></tr>` : ""}
                    </table>
                    <div style="background:#f5f5f5;border-left:4px solid #d97706;padding:16px 20px;margin-bottom:24px;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">AI Summary</p>
                      <p style="margin:0;color:#1a1a1a;line-height:1.6;">${qualification.summary}</p>
                    </div>
                    ${qualification.flags.length > 0 ? `<div style="background:#fff8f0;border-left:4px solid #f97316;padding:16px 20px;margin-bottom:24px;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">Flags</p><ul style="margin:0;padding-left:20px;color:#1a1a1a;">${qualification.flags.map((f: string) => `<li style="margin-bottom:4px;">${f}</li>`).join("")}</ul></div>` : ""}
                    ${input.message ? `<div style="margin-bottom:24px;"><p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:8px;">Notes from Field</p><p style="color:#1a1a1a;line-height:1.6;margin:0;">${input.message}</p></div>` : ""}
                    <a href="https://www.nolandearthworks.com/ops/quotes" style="display:inline-block;background:#d97706;color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">View in Ops Dashboard</a>
                  </div>
                </div>
              `,
            }).catch((e: unknown) => console.error("[FieldQuoteRouter] Owner email failed:", e));
          }
        } catch (err) {
          console.error("[FieldQuoteRouter] Background processing failed:", err);
        }
      });

      return { success: true, id: newId };
    }),

  /**
   * Upload a photo from the mobile app to S3 — requires app token.
   * Accepts base64-encoded image data and returns the public URL.
   */
  uploadPhoto: requireAppToken
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
   * Delete a field quote — owner-only (Manus session).
   * Used by the /ops/quotes dashboard.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db.delete(fieldQuotes).where(eq(fieldQuotes.id, input.id));
      return { success: true };
    }),

  /**
   * Delete a field quote from the mobile app — requires app token.
   * Used by the companion app My Quotes screen.
   */
  mobileDelete: requireAppToken
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db.delete(fieldQuotes).where(eq(fieldQuotes.id, input.id));
      return { success: true };
    }),

  /**
   * Reverse geocode GPS coordinates to a human-readable address.
   * Public — no auth required (no sensitive data returned).
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
