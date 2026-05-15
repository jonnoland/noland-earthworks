/**
 * Facebook Lead Ads Webhook Routes
 *
 * GET  /api/webhooks/facebook  — Hub verification (Facebook calls this when you register the webhook)
 * POST /api/webhooks/facebook  — Lead event ingestion (Facebook calls this when a new lead is submitted)
 *
 * After registering the webhook in the Facebook Developer portal, Facebook will send a GET request
 * to verify the endpoint. Once verified, it will POST lead events whenever a new lead is submitted.
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { facebookLeads } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? "";
const FACEBOOK_SYSTEM_USER_TOKEN = process.env.FACEBOOK_SYSTEM_USER_TOKEN ?? "";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID ?? "";
const WEBHOOK_VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? "noland-earthworks-webhook-2026";

/**
 * Fetch the full lead field data from the Facebook Graph API.
 * Facebook's webhook only sends the lead ID — we need to call the API to get the actual form fields.
 */
async function fetchLeadFields(leadId: string): Promise<Record<string, string>> {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadId}?fields=field_data,created_time,ad_id,adset_id,campaign_id,form_id&access_token=${FACEBOOK_SYSTEM_USER_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[FB Webhook] Failed to fetch lead ${leadId}:`, await res.text());
      return {};
    }
    const data = await res.json() as {
      field_data?: Array<{ name: string; values: string[] }>;
      created_time?: string;
      ad_id?: string;
      adset_id?: string;
      campaign_id?: string;
      form_id?: string;
    };

    // Convert field_data array to a flat key-value object
    const fields: Record<string, string> = {};
    if (data.field_data) {
      for (const field of data.field_data) {
        fields[field.name] = field.values?.[0] ?? "";
      }
    }
    return fields;
  } catch (err) {
    console.error(`[FB Webhook] Error fetching lead fields for ${leadId}:`, err);
    return {};
  }
}

/**
 * Verify the X-Hub-Signature-256 header from Facebook.
 * This ensures the webhook payload actually came from Facebook.
 */
function verifySignature(body: string, signature: string | undefined): boolean {
  if (!signature || !FACEBOOK_APP_SECRET) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", FACEBOOK_APP_SECRET)
    .update(body, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function registerFacebookWebhookRoutes(app: Express): void {
  /**
   * GET /api/webhooks/facebook
   * Facebook calls this to verify the webhook endpoint when you register it in the Developer portal.
   * Responds with the hub.challenge value if the verify token matches.
   */
  app.get("/api/webhooks/facebook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
      console.log("[FB Webhook] Verification successful");
      res.status(200).send(challenge);
    } else {
      console.warn("[FB Webhook] Verification failed — token mismatch");
      res.status(403).send("Forbidden");
    }
  });

  /**
   * POST /api/webhooks/facebook
   * Facebook sends lead events here when a new lead is submitted through a Lead Ad.
   * Payload structure: { object: "page", entry: [{ id, time, changes: [{ field: "leadgen", value: { leadgen_id, page_id, ... } }] }] }
   */
  app.post("/api/webhooks/facebook", async (req: Request, res: Response) => {
    // Acknowledge immediately — Facebook expects a 200 within 20 seconds
    res.status(200).send("EVENT_RECEIVED");

    // Verify signature
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    if (!verifySignature(rawBody, signature)) {
      console.warn("[FB Webhook] Invalid signature — ignoring payload");
      return;
    }

    const body = req.body as {
      object?: string;
      entry?: Array<{
        id?: string;
        time?: number;
        changes?: Array<{
          field?: string;
          value?: {
            leadgen_id?: string;
            page_id?: string;
            ad_id?: string;
            adset_id?: string;
            campaign_id?: string;
            form_id?: string;
            created_time?: number;
          };
        }>;
      }>;
    };

    if (body.object !== "page") return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;

        const value = change.value;
        if (!value?.leadgen_id) continue;

        const leadId = value.leadgen_id;
        console.log(`[FB Webhook] New lead received: ${leadId}`);

        try {
          const db = await getDb();
          if (!db) {
            console.error("[FB Webhook] Database not available");
            continue;
          }

          // Check for duplicate
          const existing = await db.select({ id: facebookLeads.id })
            .from(facebookLeads)
            .where(eq(facebookLeads.leadId, leadId))
            .limit(1);

          if (existing.length > 0) {
            console.log(`[FB Webhook] Lead ${leadId} already exists — skipping`);
            continue;
          }

          // Fetch full lead data from Graph API
          const fields = await fetchLeadFields(leadId);

          // Extract common contact fields
          const name = fields["full_name"] || fields["first_name"]
            ? `${fields["first_name"] ?? ""} ${fields["last_name"] ?? ""}`.trim()
            : fields["full_name"] ?? null;
          const email = fields["email"] ?? null;
          const phone = fields["phone_number"] ?? fields["phone"] ?? null;

          // Store in database
          await db.insert(facebookLeads).values({
            leadId,
            formId: value.form_id ?? null,
            pageId: value.page_id ?? FACEBOOK_PAGE_ID,
            adId: value.ad_id ?? null,
            adSetId: value.adset_id ?? null,
            campaignId: value.campaign_id ?? null,
            fields: JSON.stringify(fields),
            name,
            email,
            phone,
            status: "new",
            createdTime: value.created_time ? new Date(value.created_time * 1000) : null,
          });

          console.log(`[FB Webhook] Lead ${leadId} stored — ${name ?? "unknown"} (${email ?? phone ?? "no contact"})`);

          // Notify Jon
          await notifyOwner({
            title: "New Facebook Lead",
            content: `Name: ${name ?? "Unknown"}\nEmail: ${email ?? "—"}\nPhone: ${phone ?? "—"}\nLead ID: ${leadId}`,
          });

        } catch (err) {
          console.error(`[FB Webhook] Error processing lead ${leadId}:`, err);
        }
      }
    }
  });
}
