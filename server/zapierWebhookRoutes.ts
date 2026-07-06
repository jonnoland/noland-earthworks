/**
 * Zapier / Make Webhook Handler
 *
 * POST /api/webhooks/leads
 *
 * Accepts a JSON payload from Zapier (or any HTTP client) and creates a new
 * ops lead. Authentication is via the x-api-key header, which must match the
 * webhookApiKey stored in business_settings.
 *
 * Expected payload fields (all optional except first_name or full_name):
 *   first_name    — lead first name
 *   last_name     — lead last name
 *   full_name     — alternative to first/last
 *   phone         — phone number
 *   email         — email address
 *   location      — raw property location / address
 *   source        — lead source tag (defaults to "facebook")
 *   ad_name       — name of the ad that generated the lead
 *   acres         — estimated acreage
 *   vegetation    — vegetation type
 *   pain          — reason for clearing / pain point
 *   timeline      — project timeline
 *   _test         — if true, creates the lead but tags it as a test
 */
import type { Application, Request, Response } from "express";
import { createOpsLead, getOwnerUser, getDb } from "./db";
import { createJobberClientFromLead } from "./jobber";
import { notifyOwner } from "./_core/notification";
import { businessSettings } from "../drizzle/schema";
import { Resend } from "resend";
import { ENV } from "./_core/env";

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getWebhookApiKey(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ webhookApiKey: businessSettings.webhookApiKey })
    .from(businessSettings)
    .limit(1);
  return rows[0]?.webhookApiKey ?? null;
}

// ── Field normalisation ───────────────────────────────────────────────────────
function normalise(body: Record<string, unknown>): {
  name: string;
  phone: string | undefined;
  email: string | undefined;
  address: string | undefined;
  source: "google" | "facebook" | "referral" | "website" | "direct" | "field_app" | "other";
  notes: string;
  isTest: boolean;
} {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

  const firstName = str(body.first_name) ?? "";
  const lastName = str(body.last_name) ?? "";
  const fullName = str(body.full_name) ?? str(body.name) ?? "";
  const name = fullName || [firstName, lastName].filter(Boolean).join(" ") || "Unknown Lead";

  // Normalise source — Zapier sends "meta_ads" for Facebook Lead Ads
  const rawSource = str(body.source) ?? "";
  let source: "google" | "facebook" | "referral" | "website" | "direct" | "field_app" | "other" = "other";
  if (/meta|facebook|fb/i.test(rawSource)) source = "facebook";
  else if (/google/i.test(rawSource)) source = "google";
  else if (/referral/i.test(rawSource)) source = "referral";
  else if (/website|web/i.test(rawSource)) source = "website";

  // Build notes from qualifying fields
  const noteParts: string[] = [];
  if (str(body.ad_name)) noteParts.push(`Ad: ${str(body.ad_name)}`);
  if (str(body.acres)) noteParts.push(`Acreage: ${str(body.acres)}`);
  if (str(body.vegetation)) noteParts.push(`Vegetation: ${str(body.vegetation)}`);
  if (str(body.pain)) noteParts.push(`Reason: ${str(body.pain)}`);
  if (str(body.timeline)) noteParts.push(`Timeline: ${str(body.timeline)}`);
  if (str(body.message)) noteParts.push(`Message: ${str(body.message)}`);
  if (body._test) noteParts.push("[TEST LEAD — created via webhook test]");

  return {
    name,
    phone: str(body.phone),
    email: str(body.email),
    address: str(body.location) ?? str(body.address),
    source,
    notes: noteParts.join("\n"),
    isTest: Boolean(body._test),
  };
}

// ── Route registration ────────────────────────────────────────────────────────
export function registerZapierWebhookRoutes(app: Application): void {
  app.post("/api/webhooks/leads", async (req: Request, res: Response) => {
    // 1. Authenticate
    const incomingKey = req.headers["x-api-key"];
    const storedKey = await getWebhookApiKey();

    if (!storedKey) {
      console.warn("[Zapier Webhook] No webhook API key configured");
      res.status(503).json({ error: "Webhook not configured" });
      return;
    }
    if (!incomingKey || incomingKey !== storedKey) {
      console.warn("[Zapier Webhook] Invalid API key");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 2. Acknowledge immediately (Zapier expects a fast 2xx)
    res.json({ received: true });

    // 3. Process asynchronously
    try {
      const body = req.body as Record<string, unknown>;
      const { name, phone, email, address, source, notes, isTest } = normalise(body);

      const owner = await getOwnerUser();
      if (!owner) {
        console.warn("[Zapier Webhook] Owner not found — lead not saved");
        await notifyOwner({
          title: `New Zapier Lead — ${name}`,
          content: `Lead received but owner not found in DB.\n\n${notes}`,
        }).catch(() => {});
        return;
      }

      await createOpsLead({
        userId: owner.id,
        name,
        email,
        phone,
        address,
        source,
        stage: "new",
        notes,
      });

      console.log(`[Zapier Webhook] Lead created: ${name} (test=${isTest})`);

      // Add to Jobber (fire-and-forget, skip for test leads)
      if (!isTest) {
        createJobberClientFromLead({ name, email, phone, address }).catch(err =>
          console.warn("[Zapier Webhook] Jobber client creation failed:", err)
        );
      }

      // Owner notification
      const notifLines = [
        `Name: ${name}`,
        phone ? `Phone: ${phone}` : "",
        email ? `Email: ${email}` : "",
        address ? `Location: ${address}` : "",
        notes ? `\nDetails:\n${notes}` : "",
        isTest ? "\n[This was a test lead]" : "",
      ].filter(Boolean);

      await notifyOwner({
        title: isTest ? `[TEST] New Zapier Lead — ${name}` : `New Lead via Zapier — ${name}`,
        content: notifLines.join("\n"),
      }).catch(err => console.warn("[Zapier Webhook] Owner notification failed:", err));

      // Email notification
      if (ENV.resendApiKey && !isTest) {
        try {
          const resend = new Resend(ENV.resendApiKey);
          const bodyLines = [
            `<strong>Name:</strong> ${name}`,
            phone ? `<strong>Phone:</strong> ${phone}` : "",
            email ? `<strong>Email:</strong> ${email}` : "",
            address ? `<strong>Location:</strong> ${address}` : "",
            notes ? `<strong>Details:</strong><br>${notes.replace(/\n/g, "<br>")}` : "",
          ].filter(Boolean);

          await resend.emails.send({
            from: "Noland Earthworks <noreply@nolandearthworks.com>",
            to: "jonnoland@nolandearthworks.com",
            subject: `New Lead via Zapier — ${name}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
                <h2 style="color:#c96e24;margin-bottom:0.5rem;">New Lead via Zapier</h2>
                <p>${bodyLines.join("<br>")}</p>
                <p style="margin-top:1.5rem;font-size:0.85rem;color:#666;">
                  This lead was received via the Zapier webhook and has been added to your ops pipeline.
                </p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.warn("[Zapier Webhook] Email notification failed:", emailErr);
        }
      }
    } catch (err) {
      console.error("[Zapier Webhook] Processing error:", err);
    }
  });
}
