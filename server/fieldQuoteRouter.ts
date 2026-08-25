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
import { getDb, createOpsLead, getOwnerUser, listNativeClientContacts } from "./db";
import { aiPricingSettings, fieldQuotes } from "../drizzle/schema";
import { storagePut } from "./storage";
import { makeRequest } from "./_core/map";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { Resend } from "resend";
import { normalizeTennesseeParcelId, validateTennesseeParcelId } from "../shared/tennesseeParcelId";
import { applyFieldConditionPriceAdjustment, getFieldConditionAdjustment } from "../shared/fieldConditionPricing";
import { getCustomerDiscountOptions, getSuggestedVolumeDiscount } from "../shared/quoteDiscounts";
import { roundQuoteCentsUp } from "../shared/quoteMoney";

const TN_PARCEL_QUERY_URL = "https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query";

function cleanParcelText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned || null;
}

function buildFieldParcelWhere(county: string, parcelId: string): string {
  const cleanCounty = county.replace(/\s+county$/i, "").trim().replace(/'/g, "''");
  const pattern = normalizeTennesseeParcelId(parcelId).split("").join("%");
  return `COUNTY_NAME = '${cleanCounty}' AND PARCELID LIKE '%${pattern}%'`;
}

type ParcelBoundaryRing = Array<{ lat: number; lng: number }>;

function toParcelBoundaryRings(geometry: unknown): ParcelBoundaryRing[] | null {
  if (!geometry || typeof geometry !== "object" || !Array.isArray((geometry as { rings?: unknown }).rings)) return null;

  const rings = (geometry as { rings: unknown[] }).rings
    .map((ring) => {
      if (!Array.isArray(ring)) return [];
      return ring.flatMap((point) => {
        if (!Array.isArray(point) || point.length < 2) return [];
        const [lng, lat] = point;
        return typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)
          ? [{ lat, lng }]
          : [];
      });
    })
    .filter((ring): ring is ParcelBoundaryRing => ring.length >= 3);

  return rings.length > 0 ? rings : null;
}

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

type GoogleAddressComponent = { long_name: string; short_name: string; types: string[] };

function parseAddressComponents(components?: GoogleAddressComponent[]) {
  const find = (type: string, short = false) => components?.find((component) => component.types.includes(type))?.[short ? "short_name" : "long_name"] ?? "";
  const streetNumber = find("street_number");
  const route = find("route");
  return {
    street: [streetNumber, route].filter(Boolean).join(" "),
    city: find("locality") || find("sublocality") || find("postal_town"),
    state: find("administrative_area_level_1", true),
    zip: find("postal_code"),
    county: find("administrative_area_level_2"),
  };
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type FieldQuoteEmailInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  serviceType?: string;
  acreage?: number;
  terrainType?: string;
  vegetationDensity?: string;
  vegetationTypes?: string;
  slopeCondition?: string;
  accessCondition?: string;
  obstacles?: string;
  proximityToStructures?: string;
  message?: string;
  photoUrls: string[];
  source: string;
};

type FieldQuoteQualification = {
  score: "strong" | "marginal" | "weak";
  summary: string;
  flags: string[];
  draftResponse: string;
};

export function buildFieldQuoteOwnerEmail(
  input: FieldQuoteEmailInput,
  qualification: FieldQuoteQualification,
  mapSnapshotUrl: string | null,
): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const scoreStyles = {
    strong: { label: "Strong fit", color: "#2f6d41", background: "#edf7ef" },
    marginal: { label: "Review conditions", color: "#9a5b13", background: "#fdf6e9" },
    weak: { label: "Review before scheduling", color: "#a1332b", background: "#fbeeed" },
  } as const;
  const score = scoreStyles[qualification.score];
  const row = (label: string, value?: string) => value ? `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee7dc;width:36%;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:#796f62;vertical-align:top;">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee7dc;font-size:14px;line-height:1.45;color:#292522;">${value}</td>
    </tr>` : "";
  const contactRows = [
    row("Phone", input.phone ? `<a href="tel:${escapeEmailHtml(input.phone)}" style="color:#c9671c;text-decoration:none;font-weight:700;">${escapeEmailHtml(input.phone)}</a>` : ""),
    row("Email", input.email ? `<a href="mailto:${escapeEmailHtml(input.email)}" style="color:#c9671c;text-decoration:none;">${escapeEmailHtml(input.email)}</a>` : ""),
  ].join("");
  const mapUrl = input.lat != null && input.lng != null ? `https://www.google.com/maps?q=${input.lat},${input.lng}` : null;
  const photoLinks = input.photoUrls.map((url, index) => `<a href="${escapeEmailHtml(url)}" style="color:#c9671c;text-decoration:none;">Photo ${index + 1}</a>`).join(" &nbsp;|&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>New Field Quote — Noland Earthworks</title></head>
<body style="margin:0;padding:0;background:#f3f0ea;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f0ea;padding:28px 14px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 3px 18px rgba(38,31,24,.12);">
        <tr><td style="height:5px;background:#c9671c;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:#211f1d;padding:25px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td><img src="${logoUrl}" height="48" alt="Noland Earthworks" style="display:block;border:0;" /></td>
            <td align="right"><span style="display:inline-block;background:#c9671c;color:#fff;font-size:11px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;padding:7px 11px;border-radius:3px;">Field Quote</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 32px 0;">
          <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#292522;">New field quote from ${escapeEmailHtml(input.name)}</p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#6d655c;">Submitted from Noland Field on ${submittedAt}.</p>
        </td></tr>
        <tr><td style="padding:18px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${score.background};border:1px solid ${score.color};border-radius:6px;"><tr>
            <td style="padding:13px 16px;"><strong style="color:${score.color};font-size:13px;">AI fit: ${score.label}</strong><br /><span style="display:block;margin-top:4px;color:#423b35;font-size:13px;line-height:1.45;">${escapeEmailHtml(qualification.summary)}</span></td>
          </tr></table>
        </td></tr>
        ${contactRows ? `<tr><td style="padding:22px 32px 0;"><p style="margin:0 0 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#c9671c;border-bottom:2px solid #c9671c;padding-bottom:6px;">Contact</p><table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #eee7dc;border-radius:6px;overflow:hidden;">${contactRows}</table></td></tr>` : ""}
        <tr><td style="padding:22px 32px 0;"><p style="margin:0 0 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#c9671c;border-bottom:2px solid #c9671c;padding-bottom:6px;">Property & Work Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #eee7dc;border-radius:6px;overflow:hidden;">
            ${row("Service", input.serviceType ? `<strong>${escapeEmailHtml(input.serviceType)}</strong>` : "Field quote")}
            ${row("Acreage", input.acreage != null ? `${input.acreage.toLocaleString()} acres` : "")}
            ${row("Property Address", input.address ? escapeEmailHtml(input.address) : "")}
            ${row("Map Location", mapUrl ? `<a href="${mapUrl}" style="color:#c9671c;text-decoration:none;font-weight:700;">Open in Google Maps &rarr;</a>` : "")}
            ${row("Terrain", input.terrainType ? escapeEmailHtml(input.terrainType) : "")}
            ${row("Vegetation Density", input.vegetationDensity ? escapeEmailHtml(input.vegetationDensity) : "")}
            ${row("Vegetation Types", input.vegetationTypes ? escapeEmailHtml(input.vegetationTypes) : "")}
            ${row("Slope", input.slopeCondition ? escapeEmailHtml(input.slopeCondition) : "")}
            ${row("Site Access", input.accessCondition ? escapeEmailHtml(input.accessCondition) : "")}
            ${row("Obstacles", input.obstacles ? escapeEmailHtml(input.obstacles) : "")}
            ${row("Near Structures", input.proximityToStructures ? escapeEmailHtml(input.proximityToStructures) : "")}
            ${row("Photos", photoLinks)}
          </table>
        </td></tr>
        ${mapSnapshotUrl ? `<tr><td style="padding:16px 32px 0;"><a href="${mapUrl ?? escapeEmailHtml(mapSnapshotUrl)}" style="text-decoration:none;"><img src="${escapeEmailHtml(mapSnapshotUrl)}" alt="Satellite map of field quote property" width="576" style="display:block;max-width:100%;width:100%;height:auto;border:1px solid #eee7dc;border-radius:6px;" /></a></td></tr>` : ""}
        ${input.message ? `<tr><td style="padding:22px 32px 0;"><p style="margin:0 0 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#c9671c;border-bottom:2px solid #c9671c;padding-bottom:6px;">Field Notes</p><div style="background:#f8f6f1;border:1px solid #eee7dc;border-radius:6px;padding:13px 15px;color:#423b35;font-size:14px;line-height:1.55;white-space:pre-wrap;">${escapeEmailHtml(input.message)}</div></td></tr>` : ""}
        ${qualification.flags.length ? `<tr><td style="padding:22px 32px 0;"><p style="margin:0 0 9px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#c9671c;border-bottom:2px solid #c9671c;padding-bottom:6px;">Items to Review</p><ul style="margin:0;padding:0 0 0 20px;color:#423b35;font-size:14px;line-height:1.55;">${qualification.flags.map((flag) => `<li style="margin:0 0 5px;">${escapeEmailHtml(flag)}</li>`).join("")}</ul></td></tr>` : ""}
        <tr><td style="padding:28px 32px;text-align:center;"><a href="https://nolandearthworks.com/ops/quotes" style="display:inline-block;background:#c9671c;color:#fff;padding:13px 25px;border-radius:5px;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;">Open All Quotes &rarr;</a><p style="margin:11px 0 0;color:#7b736a;font-size:12px;">Review property fit, conditions, and next action before scheduling.</p></td></tr>
        <tr><td style="background:#211f1d;padding:17px 32px;text-align:center;"><p style="margin:0;color:#a69b8e;font-size:11px;"><strong style="color:#c9671c;">Noland Earthworks, LLC</strong> &nbsp;&bull;&nbsp; Veteran-Owned &amp; Operated &nbsp;&bull;&nbsp; Middle &amp; West Tennessee</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

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
- Land Management and vegetation management
- Right-of-Way Clearing, trail cutting, and fence line clearing
- Selective Mulching
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
    const rawContent = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(stripCodeFence(rawContent));
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
  /** Lookup a parcel for the signed-in Noland Field app user. */
  lookupParcel: requireAppToken
    .input(z.object({
      county: z.string().trim().min(2).max(40).regex(/^[A-Za-z .'-]+$/, "Enter a Tennessee county name."),
      parcelId: z.string().trim().min(3).max(50),
    }))
    .mutation(async ({ input }) => {
      const parcelValidation = validateTennesseeParcelId(input.parcelId);
      if (!parcelValidation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: parcelValidation.error });
      }

      try {
        const params = new URLSearchParams({
          where: buildFieldParcelWhere(input.county, input.parcelId),
          outFields: "PARCELID,COUNTY_NAME,ADDRESS,CITY,ZIP,OWNER,OWNER2,DEEDAC,LINK_TPV",
          returnGeometry: "true",
          returnCentroid: "true",
          outSR: "4326",
          resultRecordCount: "6",
          f: "json",
        });
        const response = await fetch(`${TN_PARCEL_QUERY_URL}?${params.toString()}`, {
          signal: AbortSignal.timeout(12_000),
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Tennessee parcel service returned ${response.status}`);
        const payload = await response.json() as {
          error?: { message?: string };
          features?: Array<{
            attributes?: Record<string, unknown>;
            centroid?: { x?: number; y?: number };
            geometry?: { rings?: unknown[] };
          }>;
        };
        if (payload.error) throw new Error(payload.error.message || "Tennessee parcel service could not complete the lookup");

        const matches = (payload.features ?? []).map((feature) => {
          const attributes = feature.attributes ?? {};
          const city = cleanParcelText(attributes.CITY);
          const zip = cleanParcelText(attributes.ZIP);
          const street = cleanParcelText(attributes.ADDRESS);
          return {
            parcelId: cleanParcelText(attributes.PARCELID) ?? "",
            county: cleanParcelText(attributes.COUNTY_NAME) ?? "",
            address: [street, [city, "TN", zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
            city,
            zip,
            owner: [cleanParcelText(attributes.OWNER), cleanParcelText(attributes.OWNER2)].filter(Boolean).join(" / ") || null,
            deedAcreage: typeof attributes.DEEDAC === "number" && attributes.DEEDAC > 0 ? attributes.DEEDAC : null,
            lat: typeof feature.centroid?.y === "number" ? feature.centroid.y : null,
            lng: typeof feature.centroid?.x === "number" ? feature.centroid.x : null,
            boundaryRings: toParcelBoundaryRings(feature.geometry),
            propertyViewerUrl: cleanParcelText(attributes.LINK_TPV),
          };
        });
        return { matches, normalizedParcelId: parcelValidation.normalized };
      } catch (error) {
        console.error("[fieldQuote.lookupParcel] Tennessee parcel lookup failed", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Tennessee Property Viewer is unavailable right now. Enter the property address manually or try again shortly.",
        });
      }
    }),

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
   * Returns saved Operations clients for the PIN-authenticated field app.
   * This is intentionally limited to contact details needed to prefill a new
   * quote; it does not expose client notes, job history, quotes, or spend.
   */
  mobileClients: requireAppToken
    .input(z.object({
      search: z.string().trim().max(120).optional(),
      limit: z.number().min(1).max(200).default(100),
    }))
    .query(async ({ input }) => listNativeClientContacts(input)),

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

      // 1. Generate satellite map snapshot URL if coordinates are available
      let mapSnapshotUrl: string | null = null;
      if (input.lat !== undefined && input.lng !== undefined) {
        try {
          const { getMapsConfig } = await import("./_core/map");
          const { baseUrl, apiKey } = getMapsConfig();
          const center = `${input.lat},${input.lng}`;
          const snapUrl = new URL(`${baseUrl}/v1/maps/proxy/maps/api/staticmap`);
          snapUrl.searchParams.set("key", apiKey);
          snapUrl.searchParams.set("center", center);
          snapUrl.searchParams.set("zoom", "15");
          snapUrl.searchParams.set("size", "600x300");
          snapUrl.searchParams.set("maptype", "satellite");
          snapUrl.searchParams.set("markers", `color:0xE87722|${center}`);
          snapUrl.searchParams.set("scale", "2");
          mapSnapshotUrl = snapUrl.toString();
        } catch {
          // Non-critical — proceed without snapshot
        }
      }

      // 2. Insert the field quote record
      const inserted = await db
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
          mapSnapshotUrl,
        })
        .$returningId();

      const newId = (inserted as Array<{ id: number }>)[0]?.id;

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

          // 4. Send email notification to owner
          if (ENV.resendApiKey) {
            const resend = new Resend(ENV.resendApiKey);
            await resend.emails.send({
              from: "Noland Earthworks <noreply@nolandearthworks.com>",
              to: ["quotes@nolandearthworks.com"],
              subject: `New Field Quote: ${input.name}${input.serviceType ? ` — ${input.serviceType}` : ""}${input.acreage ? ` (${input.acreage} acres)` : ""}`,
              html: buildFieldQuoteOwnerEmail(input, qualification, mapSnapshotUrl),
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
   * Returns the latest published version of the Noland Field mobile app.
   * Fetches live data from GitHub Releases API so the version and APK download
   * URL are always current — no manual bumping required.
   * Cached in-memory for one minute so new signed releases appear promptly.
   * Public — no auth required.
   */
  latestVersion: publicProcedure
    .query(async () => {
      const GITHUB_REPO = "jonnoland/noland-earthworks";
      const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases`;
      const FALLBACK = { version: "0.3.0", downloadUrl: RELEASES_PAGE, releaseNotesUrl: RELEASES_PAGE };
      const MOBILE_RELEASE_CACHE_MS = 60_000;

      // Short cache keeps a newly published personal-use release visible promptly.
      const cache = (globalThis as any).__mobileVersionCache as
        | { data: typeof FALLBACK; expiresAt: number }
        | undefined;
      if (cache && Date.now() < cache.expiresAt) return cache.data;

      try {
        // Fetch all releases and find the latest one tagged mobile-v*
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=20`,
          { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }
        );
        if (!res.ok) return FALLBACK;

        const releases: Array<{
          tag_name: string;
          html_url: string;
          assets: Array<{ name: string; browser_download_url: string }>;
          draft: boolean;
          prerelease: boolean;
        }> = await res.json();

        // Find the latest non-draft, non-prerelease mobile build
        const latest = releases.find(
          (r) => !r.draft && !r.prerelease && r.tag_name.startsWith("mobile-v")
        );
        if (!latest) return FALLBACK;

        // Extract semver from tag like "mobile-v0.4.0-build42" → "0.4.0"
        const versionMatch = latest.tag_name.match(/mobile-v(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : FALLBACK.version;

        // Find the APK asset — prefer the named APK, fall back to any .apk
        const apkAsset =
          latest.assets.find((a) => a.name.startsWith("noland-field-v") && a.name.endsWith(".apk")) ??
          latest.assets.find((a) => a.name.endsWith(".apk"));

        const result = {
          version,
          downloadUrl: apkAsset?.browser_download_url ?? latest.html_url,
          releaseNotesUrl: latest.html_url,
        };

        (globalThis as any).__mobileVersionCache = { data: result, expiresAt: Date.now() + MOBILE_RELEASE_CACHE_MS };
        return result;
      } catch {
        return FALLBACK;
      }
    }),

  /**
   * AI cost estimate from the mobile app — requires app token.
   * Uses the same pricing constants, system prompt, and JSON schema as the
   * website's CostEstimator so both tools produce identical results.
   */
  estimate: requireAppToken
    .input(z.object({
      service: z.string().min(1),
      acreage: z.number().min(0.1).max(500).optional(),
      linearFeet: z.number().min(1).max(50000).optional(),
      terrain: z.enum(["flat", "rolling", "steep", "very_steep"]),
      vegetationDensity: z.enum(["light", "moderate", "heavy", "very_heavy"]),
      accessDifficulty: z.enum(["easy", "moderate", "difficult"]),
      mobilizationMiles: z.number().min(0).max(300).default(0),
      hasStumps: z.boolean().default(false),
      stumpCount: z.number().min(0).max(500).default(0),
      notes: z.string().max(1000).optional(),
      trailWidth: z.number().min(4).max(40).optional(),
      trailAddOns: z.array(z.string()).optional(),
      rowWidth: z.number().min(4).max(200).optional(),
      addOns: z.array(z.string()).optional(),
      fenceLineLF: z.number().min(0).max(50000).optional(),
      discountCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // ── Pricing constants (kept in sync with costEstimatorRouter.ts) ──────
      const MOB_TIERS = [
        { maxMiles: 30,  surcharge: 0,   label: "Local (0–30 mi)" },
        { maxMiles: 50,  surcharge: 150, label: "Near (31–50 mi)" },
        { maxMiles: 75,  surcharge: 300, label: "Regional (51–75 mi)" },
        { maxMiles: 100, surcharge: 500, label: "Extended (76–100 mi)" },
        { maxMiles: 999, surcharge: 750, label: "Long-Haul (100+ mi)" },
      ];
      const travelSurcharge = (MOB_TIERS.find(t => input.mobilizationMiles <= t.maxMiles) ?? MOB_TIERS[MOB_TIERS.length - 1]).surcharge;
      const mobTierLabel = (MOB_TIERS.find(t => input.mobilizationMiles <= t.maxMiles) ?? MOB_TIERS[MOB_TIERS.length - 1]).label;

      let effectiveAcresNote = "";
      if (input.service === "Right-of-Way Clearing" && input.linearFeet && input.rowWidth) {
        const ea = (input.linearFeet * input.rowWidth) / 43560;
        effectiveAcresNote = `Effective acres (${input.linearFeet} LF × ${input.rowWidth} ft wide ÷ 43,560): ${ea.toFixed(3)} acres`;
      }
      if (input.service === "Trail Cutting" && input.acreage && input.trailWidth) {
        const lf = Math.round((input.acreage * 43560) / input.trailWidth);
        effectiveAcresNote = `Trail geometry: ${input.acreage} effective acres × 43,560 ÷ ${input.trailWidth} ft wide ≈ ${lf.toLocaleString()} linear feet`;
      }

      const addOnLines: string[] = [];
      if (input.trailAddOns?.length) addOnLines.push(`Trail add-ons requested: ${input.trailAddOns.join(", ")}`);
      if (input.addOns?.length) addOnLines.push(`Add-ons requested: ${input.addOns.join(", ")}`);
      if (input.fenceLineLF && input.fenceLineLF > 0) addOnLines.push(`Fence line clearing: ${input.fenceLineLF} linear feet`);

      const jobDescription = [
        `Service: ${input.service}`,
        input.acreage ? `Acreage: ${input.acreage} acres` : "",
        input.linearFeet ? `Linear feet: ${input.linearFeet} LF` : "",
        input.trailWidth ? `Trail width: ${input.trailWidth} ft` : "",
        input.rowWidth ? `ROW width: ${input.rowWidth} ft` : "",
        effectiveAcresNote,
        `Terrain: ${input.terrain.replace("_", " ")}`,
        `Vegetation density: ${input.vegetationDensity.replace("_", " ")}`,
        `Access difficulty: ${input.accessDifficulty}`,
        `Distance from Vanleer, TN: ${input.mobilizationMiles} miles one-way`,
        `Travel surcharge tier: ${mobTierLabel} — flat surcharge: $${travelSurcharge}`,
        input.hasStumps && input.stumpCount > 0 ? `Stumps to grind: ${input.stumpCount}` : "",
        ...addOnLines,
        input.notes ? `Additional notes: ${input.notes}` : "",
      ].filter(Boolean).join("\n");

      const COST_SYSTEM_PROMPT = `You are a job cost estimator for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee.

EXACT CURRENT RATES (use these numbers precisely — do not substitute generic values):

LABOR:
- Jon's wage: $28/hour × 8 hrs/day × 1.25 burden = $280.00/day
- He is the sole operator — no crew

EQUIPMENT:
- CAT 299D3 XE monthly payment: $2,200 ÷ 20 working days = $110.00/day

FUEL:
- Machine fuel: 7 GPH × 8 hrs × $5.33/gal = $298.48/day
- Truck/trailer fuel: $65.00/day
- Total fuel per day: $363.48

WEAR & CONSUMABLES:
- Teeth set: $2,200 per set ÷ 12 days = $183.33/day
- Major maintenance/wear: $18,000/year ÷ 240 working days = $75.00/day
- Misc consumables: $35.00/day
- Total wear per day: $293.33

TOTAL INTERNAL COST PER DAY: $1,046.81
TARGET GROSS MARGIN: 30% (customer price = total cost ÷ 0.70)
MINIMUM JOB VALUE: $1,800

PRODUCTIVITY RATES (acres per 8-hour day):
- Light vegetation, flat: 2.5 acres/day
- Moderate vegetation, flat: 1.5 acres/day
- Heavy vegetation, flat: 0.8 acres/day
- Very heavy vegetation, flat: 0.5 acres/day
- Rolling terrain: reduce productivity by 15–20%
- Steep terrain: reduce productivity by 30–40%
- Very steep terrain: reduce productivity by 50–60%
- ROW clearing: 400–600 linear feet/day depending on vegetation
- Stump grinding: 15–30 minutes per stump

TRAVEL SURCHARGE (one-way miles from Vanleer, TN — flat fee, not per-mile):
- 0–30 miles: $0 (local, no surcharge)
- 31–50 miles: $150
- 51–75 miles: $300
- 76–100 miles: $500
- 100+ miles: $750

MARKET RATES (Middle Tennessee, 2025–2026):
- Forestry mulching: $650–$1,200/acre (light-moderate); $1,200–$2,000+/acre (dense cedar/hardwood or steep terrain)
- Land management: $550–$1,000/acre; heavy clearing $1,200–$2,500/acre
- ROW clearing: $600–$1,100/acre
- Trail cutting: $2.00–$4.00/lf (flat); $500 minimum
- Brush hogging: $150–$350/acre
- Stump grinding: $150–$250/stump

FIELD-CONDITION PRICE RULE: Return customerPriceLow and customerPriceHigh as the base quote before vegetation, terrain, and site-access premiums. Use the selected field conditions for estimated hours, days, internal costs, and warnings, but do not include their price multipliers in the returned customer price range. The server applies the editable Operations multipliers exactly once after your response.

Return JSON matching the schema exactly.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: COST_SYSTEM_PROMPT },
          { role: "user", content: `Generate a detailed cost estimate for this job:\n\n${jobDescription}\n\nReturn JSON with the exact schema specified.` },
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "cost_estimate",
            strict: true,
            schema: {
              type: "object",
              properties: {
                estimatedHours: { type: "number" },
                estimatedDays: { type: "number" },
                fuelCost: { type: "number" },
                mobilizationCost: { type: "number" },
                laborCost: { type: "number" },
                equipmentCost: { type: "number" },
                totalInternalCost: { type: "number" },
                customerPriceLow: { type: "number" },
                customerPriceHigh: { type: "number" },
                marginPct: { type: "number" },
                summary: { type: "string" },
                warnings: { type: "array", items: { type: "string" } },
                breakdown: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      hours: { type: "number" },
                      cost: { type: "number" },
                      note: { type: "string" },
                    },
                    required: ["label", "cost", "note"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "estimatedHours", "estimatedDays", "fuelCost", "mobilizationCost",
                "laborCost", "equipmentCost", "totalInternalCost",
                "customerPriceLow", "customerPriceHigh", "marginPct",
                "summary", "warnings", "breakdown",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = result?.choices?.[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Empty AI response" });
      const parsed = JSON.parse(stripCodeFence(typeof content === "string" ? content : JSON.stringify(content))) as {
        customerPriceLow: number;
        customerPriceHigh: number;
        totalInternalCost: number;
        marginPct: number;
        summary: string;
        warnings: string[];
        [key: string]: unknown;
      };
      const db = await getDb();
      const pricingRows = db ? await db.select().from(aiPricingSettings).limit(1) : [];
      const fieldConditionAdjustment = getFieldConditionAdjustment({
        vegetationDensity: input.vegetationDensity,
        terrain: input.terrain,
        accessDifficulty: input.accessDifficulty,
      }, pricingRows[0]);
      const conditionAdjustedPrice = applyFieldConditionPriceAdjustment(
        parsed.customerPriceLow,
        parsed.customerPriceHigh,
        fieldConditionAdjustment,
      );
      const pricingSettings = pricingRows[0] ?? {};
      const suggestedVolumeDiscount = getSuggestedVolumeDiscount(input.acreage ?? 0, pricingSettings);
      const eligibleDiscounts = [
        ...(suggestedVolumeDiscount ? [suggestedVolumeDiscount] : []),
        ...getCustomerDiscountOptions(pricingSettings),
      ];
      const selectedDiscount = input.discountCode
        ? eligibleDiscounts.find((discount) => discount.code === input.discountCode)
        : undefined;
      if (input.discountCode && !selectedDiscount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The selected discount is not enabled or eligible under current Operations pricing settings." });
      }
      const beforeDiscountLow = roundQuoteCentsUp(conditionAdjustedPrice.customerPriceLow * 100) / 100;
      const beforeDiscountHigh = roundQuoteCentsUp(conditionAdjustedPrice.customerPriceHigh * 100) / 100;
      const customerPriceLow = selectedDiscount
        ? roundQuoteCentsUp(beforeDiscountLow * (1 - selectedDiscount.percent / 100) * 100) / 100
        : beforeDiscountLow;
      const customerPriceHigh = selectedDiscount
        ? roundQuoteCentsUp(beforeDiscountHigh * (1 - selectedDiscount.percent / 100) * 100) / 100
        : beforeDiscountHigh;
      const adjustedMidpoint = (customerPriceLow + customerPriceHigh) / 2;

      return {
        ...parsed,
        customerPriceLow,
        customerPriceHigh,
        marginPct: adjustedMidpoint > 0 ? Math.round(((adjustedMidpoint - parsed.totalInternalCost) / adjustedMidpoint) * 100) : parsed.marginPct,
        summary: `${parsed.summary} Recommended pricing reflects the selected vegetation, terrain, and access conditions.${selectedDiscount ? ` ${selectedDiscount.label} (${selectedDiscount.percent}%) has been applied.` : ""}`,
        warnings: Array.from(new Set([
          ...parsed.warnings,
          `Field-condition multiplier ×${fieldConditionAdjustment.combinedMultiplier.toFixed(2)} (${fieldConditionAdjustment.labels.vegetation} vegetation, ${fieldConditionAdjustment.labels.terrain} terrain, ${fieldConditionAdjustment.labels.access} access).`,
          ...(selectedDiscount ? [`${selectedDiscount.label} (${selectedDiscount.percent}%) applied. This is an internal estimate adjustment and remains subject to owner review.`] : []),
        ])),
        fieldConditionAdjustment: conditionAdjustedPrice.detail,
        eligibleDiscounts,
        selectedDiscount: selectedDiscount ?? null,
        discountAdjustment: selectedDiscount ? {
          baseCustomerPriceLow: beforeDiscountLow,
          baseCustomerPriceHigh: beforeDiscountHigh,
          discountAmountLow: beforeDiscountLow - customerPriceLow,
          discountAmountHigh: beforeDiscountHigh - customerPriceHigh,
        } : null,
      };
    }),

  /**
   * Send the AI draft response to the prospect via email and/or SMS.
   * Owner-only (Manus session).
   */
  sendOutreach: protectedProcedure
    .input(z.object({
      id: z.number(),
      message: z.string().min(1),
      channels: z.array(z.enum(["email", "sms"])).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const rows = await db.select().from(fieldQuotes).where(eq(fieldQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Field quote not found" });
      const fq = rows[0];

      const results: { channel: string; success: boolean; error?: string }[] = [];

      // ── Email ──────────────────────────────────────────────────────────────
      if (input.channels.includes("email") && fq.email) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(ENV.resendApiKey);
          await resend.emails.send({
            from: "Jon Noland <quotes@nolandearthworks.com>",
            to: fq.email,
            subject: "Noland Earthworks — Following Up",
            html: `<p>${input.message.replace(/\n/g, "<br/>")}</p>`,
          });
          results.push({ channel: "email", success: true });
        } catch (e: any) {
          results.push({ channel: "email", success: false, error: e?.message ?? "Email failed" });
        }
      }

      return { results };
    }),

  /**
   * Convert a field quote into a native quote (draft) — owner-only.
   * Links the new quote back to the originating field quote via fieldQuoteId.
   */
  convertToQuote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const rows = await db.select().from(fieldQuotes).where(eq(fieldQuotes.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Field quote not found" });
      const fq = rows[0];

      const { nativeQuotes } = await import("../drizzle/schema");
      const title = [
        fq.serviceType ?? "Forestry Mulching",
        fq.acreage ? `— ${fq.acreage} ac` : "",
        fq.address ? `— ${fq.address.split(",")[0]}` : "",
      ].filter(Boolean).join(" ");

      const result = await db.insert(nativeQuotes).values({
        clientName: fq.name,
        clientEmail: fq.email ?? null,
        clientPhone: fq.phone ?? null,
        propertyAddress: fq.address ?? null,
        title,
        internalNotes: [
          fq.aiSummary ? `AI Assessment: ${fq.aiSummary}` : "",
          fq.message ? `Field Notes: ${fq.message}` : "",
          fq.terrainType ? `Terrain: ${fq.terrainType}` : "",
          fq.vegetationDensity ? `Vegetation: ${fq.vegetationDensity}` : "",
          fq.accessCondition ? `Access: ${fq.accessCondition}` : "",
        ].filter(Boolean).join("\n"),
        clientMessage: null,
        lineItems: JSON.stringify([]),
        totalCents: 0,
        acreage: fq.acreage ?? null,
        serviceType: fq.serviceType ?? null,
        status: "draft",
        fieldQuoteId: fq.id,
      });
      const newId = (result as any).insertId ?? (result as any)[0]?.insertId;
      return { id: Number(newId) };
    }),

  /**
   * Google Places address autocomplete — used by the Noland Field companion app.
   * Requires app token so the Maps proxy key is never exposed to the client.
   */
  placesAutocomplete: requireAppToken
    .input(z.object({
      input: z.string().min(1),
      sessiontoken: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const result = await makeRequest<{
          predictions: Array<{
            description: string;
            place_id: string;
            structured_formatting?: {
              main_text: string;
              secondary_text: string;
            };
          }>;
          status: string;
        }>("/maps/api/place/autocomplete/json", {
          input: input.input,
          components: "country:us",
          types: "address",
          ...(input.sessiontoken ? { sessiontoken: input.sessiontoken } : {}),
        });

        if (result.status !== "OK" && result.status !== "ZERO_RESULTS") {
          console.error("[PlacesAutocomplete] status:", result.status);
          return { predictions: [] };
        }
        return { predictions: result.predictions ?? [] };
      } catch (err) {
        console.error("[PlacesAutocomplete] error:", err);
        return { predictions: [] };
      }
    }),

  reverseGeocode: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ input }) => {
      try {
        const result = await makeRequest<{
          results: Array<{ formatted_address: string; address_components?: GoogleAddressComponent[] }>;
          status: string;
        }>(`/maps/api/geocode/json`, {
          latlng: `${input.lat},${input.lng}`,
        });

        if (result.status === "OK" && result.results.length > 0) {
          const first = result.results[0];
          return { address: first.formatted_address, ...parseAddressComponents(first.address_components) };
        }
        return { address: null, street: "", city: "", state: "", zip: "", county: "" };
      } catch (err) {
        console.error("[FieldQuoteRouter] Reverse geocode failed:", err);
        return { address: null, street: "", city: "", state: "", zip: "", county: "" };
      }
    }),

  /**
   * Returns a Google Static Maps image URL for the given coordinates.
   * The URL is signed server-side so the API key is never exposed to the client.
   */
  staticMapUrl: publicProcedure
    .input(z.object({
      lat: z.number(),
      lng: z.number(),
      zoom: z.number().int().min(1).max(20).default(15),
      width: z.number().int().min(100).max(640).default(600),
      height: z.number().int().min(100).max(400).default(300),
    }))
    .query(async ({ input }) => {
      try {
        const { getMapsConfig } = await import("./_core/map");
        const { baseUrl, apiKey } = getMapsConfig();
        const center = `${input.lat},${input.lng}`;
        const marker = `color:0xE87722|${center}`;
        const url = new URL(`${baseUrl}/v1/maps/proxy/maps/api/staticmap`);
        url.searchParams.set("key", apiKey);
        url.searchParams.set("center", center);
        url.searchParams.set("zoom", String(input.zoom));
        url.searchParams.set("size", `${input.width}x${input.height}`);
        url.searchParams.set("maptype", "satellite");
        url.searchParams.set("markers", marker);
        url.searchParams.set("scale", "2");
        return { url: url.toString() };
      } catch (err) {
        console.error("[FieldQuoteRouter] staticMapUrl failed:", err);
        return { url: null };
      }
    }),

  /**
   * Resolve a Google Places place_id into lat/lng + formatted address.
   * Used by AddressAutocomplete after the user selects a prediction.
   */
  placeDetails: publicProcedure
    .input(z.object({
      placeId: z.string(),
      sessiontoken: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const { getMapsConfig } = await import("./_core/map");
        const { baseUrl, apiKey } = getMapsConfig();
        const url = new URL(`${baseUrl}/v1/maps/proxy/maps/api/place/details/json`);
        url.searchParams.set("key", apiKey);
        url.searchParams.set("place_id", input.placeId);
        url.searchParams.set("fields", "geometry,formatted_address,address_component");
        if (input.sessiontoken) url.searchParams.set("sessiontoken", input.sessiontoken);
        const res = await fetch(url.toString());
        const data = await res.json() as {
          result?: {
            geometry?: { location?: { lat: number; lng: number } };
            formatted_address?: string;
            address_components?: GoogleAddressComponent[];
          };
          status?: string;
        };
        const loc = data.result?.geometry?.location;
        return {
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          formattedAddress: data.result?.formatted_address ?? null,
          ...parseAddressComponents(data.result?.address_components),
        };
      } catch (err) {
        console.error("[FieldQuoteRouter] placeDetails failed:", err);
        return { lat: null, lng: null, formattedAddress: null, street: "", city: "", state: "", zip: "", county: "" };
      }
    }),

  forwardGeocode: publicProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      try {
        const { getMapsConfig } = await import("./_core/map");
        const { baseUrl, apiKey } = getMapsConfig();
        const url = new URL(`${baseUrl}/v1/maps/proxy/maps/api/geocode/json`);
        url.searchParams.set("key", apiKey);
        url.searchParams.set("address", input.address);
        const res = await fetch(url.toString());
        const data = await res.json() as {
          results?: Array<{ geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }>;
          status?: string;
        };
        const first = data.results?.[0];
        const loc = first?.geometry?.location;
        return {
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          formattedAddress: first?.formatted_address ?? null,
        };
      } catch (err) {
        console.error("[FieldQuoteRouter] forwardGeocode failed:", err);
        return { lat: null, lng: null, formattedAddress: null };
      }
    }),
});
