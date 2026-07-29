/**
 * Facebook Leadgen Webhook Handler
 *
 * GET  /api/webhooks/facebook  — Facebook hub verification challenge
 * POST /api/webhooks/facebook  — Receives leadgen events, fetches full lead
 *                                data from Graph API, creates an ops lead.
 *
 * Facebook sends a POST for every leadgen event with this shape:
 * {
 *   "object": "page",
 *   "entry": [{
 *     "id": "<page_id>",
 *     "time": 1234567890,
 *     "changes": [{
 *       "field": "leadgen",
 *       "value": {
 *         "leadgen_id": "<lead_id>",
 *         "page_id": "<page_id>",
 *         "form_id": "<form_id>",
 *         "adgroup_id": "<adgroup_id>",
 *         "ad_id": "<ad_id>",
 *         "created_time": 1234567890
 *       }
 *     }]
 *   }]
 * }
 *
 * After receiving a leadgen_id we call the Graph API to get the full lead:
 * GET /{leadgen_id}?fields=field_data,created_time,ad_name,form_id
 *
 * field_data is an array of { name, values } where name is the form field
 * label (e.g. "full_name", "email", "phone_number") and values is a string[].
 */

import type { Application, Request, Response } from "express";
import { ENV } from "./_core/env";
import { createOpsLead, getOwnerUser, getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { opsLeads } from "../drizzle/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FacebookLeadFieldData {
  name: string;
  values: string[];
}

interface FacebookLeadData {
  id: string;
  field_data: FacebookLeadFieldData[];
  created_time?: number;
  ad_name?: string;
  form_id?: string;
}

interface FacebookWebhookChange {
  field: string;
  value: {
    leadgen_id: string;
    page_id: string;
    form_id?: string;
    adgroup_id?: string;
    ad_id?: string;
    created_time?: number;
  };
}

interface FacebookWebhookEntry {
  id: string;
  time: number;
  changes: FacebookWebhookChange[];
}

interface FacebookWebhookPayload {
  object: string;
  entry: FacebookWebhookEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch full lead data from the Facebook Graph API using the leadgen_id.
 * Returns null on any error so the webhook can still respond 200 to Facebook.
 */
async function fetchLeadFromGraph(leadgenId: string): Promise<FacebookLeadData | null> {
  // Page Access Token is preferred for lead fetching (required for test leads and some production leads).
  // Fall back to System User Token if Page Access Token is not set.
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_SYSTEM_USER_TOKEN || "";
  if (!token) {
    console.error("[FB Webhook] Neither FACEBOOK_PAGE_ACCESS_TOKEN nor FACEBOOK_SYSTEM_USER_TOKEN is configured — cannot fetch lead data");
    return null;
  }

  const url = `https://graph.facebook.com/v20.0/${leadgenId}?fields=field_data,created_time,ad_name,form_id&access_token=${token}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[FB Webhook] Graph API error for lead ${leadgenId}: ${res.status} ${body}`);
      return null;
    }
    return (await res.json()) as FacebookLeadData;
  } catch (err) {
    console.error(`[FB Webhook] Network error fetching lead ${leadgenId}:`, err);
    return null;
  }
}

/**
 * Extract a named field value from the field_data array.
 * Facebook field names vary by form; we check common variants.
 */
function extractField(fieldData: FacebookLeadFieldData[], ...keys: string[]): string | undefined {
  for (const key of keys) {
    const field = fieldData.find(f => f.name.toLowerCase() === key.toLowerCase());
    if (field?.values?.[0]) return field.values[0];
  }
  return undefined;
}

/**
 * Build a human-readable notes string from all field_data entries.
 */
function buildNotes(leadData: FacebookLeadData): string {
  const lines: string[] = [`Facebook Lead ID: ${leadData.id}`];
  if (leadData.ad_name) lines.push(`Ad: ${leadData.ad_name}`);
  if (leadData.form_id) lines.push(`Form ID: ${leadData.form_id}`);
  lines.push("");
  for (const field of leadData.field_data) {
    lines.push(`${field.name}: ${field.values.join(", ")}`);
  }
  return lines.join("\n");
}

// ── Route Registration ────────────────────────────────────────────────────────

export function registerFacebookWebhookRoutes(app: Application): void {
  /**
   * GET /api/webhooks/facebook
   * Facebook sends this to verify the webhook endpoint when it is first
   * registered or re-verified. We must echo back hub.challenge if the
   * verify token matches.
   */
  app.get("/api/webhooks/facebook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"] as string;
    const token = req.query["hub.verify_token"] as string;
    const challenge = req.query["hub.challenge"] as string;

    const expectedToken = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN ?? "";

    if (mode === "subscribe" && token === expectedToken) {
      console.log("[FB Webhook] Verification successful");
      res.status(200).send(challenge);
    } else {
      console.warn(`[FB Webhook] Verification failed — mode: ${mode}, token: ${token}`);
      res.status(403).json({ error: "Verification failed" });
    }
  });

  /**
   * POST /api/webhooks/facebook
   * Receives leadgen events from Facebook. Always responds 200 immediately
   * to acknowledge receipt, then processes asynchronously.
   */
  app.post("/api/webhooks/facebook", (req: Request, res: Response) => {
    // Acknowledge immediately — Facebook will retry if we don't respond within 20s
    res.status(200).json({ received: true });

    const payload = req.body as FacebookWebhookPayload;

    if (payload?.object !== "page") {
      console.log(`[FB Webhook] Ignoring non-page object: ${payload?.object}`);
      return;
    }

    // Process each entry asynchronously (do not await — already responded)
    void processWebhookPayload(payload);
  });
}

async function processWebhookPayload(payload: FacebookWebhookPayload): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") {
        console.log(`[FB Webhook] Ignoring non-leadgen change: ${change.field}`);
        continue;
      }

      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) {
        console.warn("[FB Webhook] leadgen change missing leadgen_id");
        continue;
      }

      console.log(`[FB Webhook] Processing lead ${leadgenId}`);
      await processLead(leadgenId);
    }
  }
}

async function processLead(leadgenId: string): Promise<void> {
  // 0. Deduplication check — Facebook retries webhooks and can deliver the same event twice
  try {
    const db = await getDb();
    if (db) {
      const existing = await db.select({ id: opsLeads.id })
        .from(opsLeads)
        .where(eq(opsLeads.leadgenId, leadgenId))
        .limit(1);
      if (existing.length > 0) {
        console.log(`[FB Webhook] Duplicate leadgen_id ${leadgenId} — already in DB (id=${existing[0].id}), skipping.`);
        return;
      }
    }
  } catch (dedupErr) {
    console.warn(`[FB Webhook] Dedup check failed for ${leadgenId}, proceeding anyway:`, dedupErr);
  }

  // 1. Fetch full lead data from Graph API
  const leadData = await fetchLeadFromGraph(leadgenId);

  if (!leadData) {
    console.error(`[FB Webhook] Could not fetch lead data for ${leadgenId} — skipping`);
    await notifyOwner({
      title: "Facebook Lead — Fetch Failed",
      content: `A new Facebook lead was received (ID: ${leadgenId}) but the lead data could not be retrieved from the Graph API. Check FACEBOOK_PAGE_ACCESS_TOKEN and try fetching manually:\n\nhttps://graph.facebook.com/v20.0/${leadgenId}?fields=field_data`,
    }).catch(() => {});
    return;
  }

  const fields = leadData.field_data ?? [];

  // 2. Extract standard fields (Facebook uses varied naming conventions)
  const name =
    extractField(fields, "full_name", "name") ||
    [
      extractField(fields, "first_name", "firstname"),
      extractField(fields, "last_name", "lastname"),
    ]
      .filter(Boolean)
      .join(" ") ||
    "Facebook Lead";

  const email = extractField(fields, "email", "email_address", "work_email");
  const phone = extractField(fields, "phone_number", "phone", "mobile_number", "cell_phone");
  const address = extractField(fields, "street_address", "address", "city", "location");
  const service = extractField(fields, "service_type", "service", "what_service", "what_are_you_looking_for");
  const acreage = extractField(fields, "acreage", "property_size", "acres", "how_many_acres");
  const message = extractField(fields, "message", "comments", "additional_info", "notes", "describe_your_project");

  // 3. Build notes from all fields
  const notes = buildNotes(leadData);

  // 4. Create ops lead
  try {
    const owner = await getOwnerUser();
    if (!owner) {
      console.warn("[FB Webhook] Owner not found in DB — lead not created");
      await notifyOwner({
        title: `New Facebook Lead — ${name}`,
        content: `Lead received but could not be saved (owner not in DB).\n\n${notes}`,
      }).catch(() => {});
      return;
    }

    await createOpsLead({
      userId: owner.id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
      source: "facebook",
      stage: "new",
      jobType: service || undefined,
      notes,
      leadgenId, // Store for deduplication on future webhook retries
    });

    console.log(`[FB Webhook] Lead created: ${name} (${leadgenId})`);
  } catch (err) {
    console.error(`[FB Webhook] Failed to create ops lead for ${leadgenId}:`, err);
  }

  // 5. Send owner notification
  const notifLines = [
    `Name: ${name}`,
    email ? `Email: ${email}` : "",
    phone ? `Phone: ${phone}` : "",
    address ? `Address: ${address}` : "",
    service ? `Service: ${service}` : "",
    acreage ? `Acreage: ${acreage}` : "",
    message ? `\nMessage:\n${message}` : "",
    `\nFacebook Lead ID: ${leadgenId}`,
  ].filter(Boolean);

  await notifyOwner({
    title: `New Facebook Lead — ${name}`,
    content: notifLines.join("\n"),
  }).catch(err => console.warn("[FB Webhook] Owner notification failed:", err));

  // 6. Send owner email notification
  if (ENV.resendApiKey) {
    try {
      const resend = new Resend(ENV.resendApiKey);
      const bodyLines = [
        `<strong>Name:</strong> ${name}`,
        email ? `<strong>Email:</strong> ${email}` : "",
        phone ? `<strong>Phone:</strong> ${phone}` : "",
        address ? `<strong>Address:</strong> ${address}` : "",
        service ? `<strong>Service:</strong> ${service}` : "",
        acreage ? `<strong>Acreage:</strong> ${acreage}` : "",
        message ? `<strong>Message:</strong> ${message}` : "",
        `<strong>Facebook Lead ID:</strong> ${leadgenId}`,
      ].filter(Boolean);
      await resend.emails.send({
        from: "noreply@nolandearthworks.com",
        to: "quotes@nolandearthworks.com",
        subject: `New Facebook Lead — ${name}`,
        html: `<p>${bodyLines.join("</p><p>")}</p>`,
      });
    } catch (err) {
      console.warn("[FB Webhook] Lead email notification failed:", err);
    }
  }
}
