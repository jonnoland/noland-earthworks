import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { getOwnerUser, createOpsLead, updateOpsLeadById, getVisitBlackoutDates, addVisitBlackoutDate, removeVisitBlackoutDate, getRecurringBlackoutDays } from "./db";
import { Resend } from "resend";

const SERVICE_LABELS: Record<string, string> = {
  "forestry-mulching": "Forestry Mulching",
  "land-clearing": "Land Management",
  "vegetation-management": "Vegetation Management",
  "right-of-way-clearing": "Right-of-Way Clearing",
  "property-maintenance": "Property Maintenance",
};

function getResend() {
  return ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;
}

export const widgetRouter = router({
  /**
   * Public endpoint — no auth required.
   * Receives a rough estimate submission from the Pricing page calculator.
   * Saves the visitor as a new CRM lead with full estimate context and notifies the owner.
   */
  submitEstimate: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        phone: z.string().min(7).max(20),
        email: z.string().email().optional(),
        service: z.string().min(1).max(80),
        acres: z.number().positive(),
        density: z.string(),
        terrain: z.string(),
        access: z.string(),
        estimateLow: z.number(),
        estimateHigh: z.number(),
        message: z.string().max(500).optional(),
        addOns: z.array(z.string()).optional().default([]),
      })
    )
    .mutation(async ({ input }) => {
      const svcLabel = SERVICE_LABELS[input.service] ?? input.service;
      const notes = [
        `Rough estimate submitted from the Pricing page calculator.`,
        `Service: ${svcLabel}`,
        `Acreage: ${input.acres} acres`,
        `Vegetation density: ${input.density}`,
        `Terrain: ${input.terrain}`,
        `Site access: ${input.access}`,
        `Estimate range: $${input.estimateLow.toLocaleString()} – $${input.estimateHigh.toLocaleString()}`,
        input.addOns && input.addOns.length > 0 ? `Add-on services: ${input.addOns.join(", ")}` : "",
        input.message ? `\nAdditional notes: ${input.message}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      let leadId: number | null = null;
      try {
        const owner = await getOwnerUser();
        if (owner) {
          const result = await createOpsLead({
            userId: owner.id,
            name: input.name,
            phone: input.phone,
            email: input.email,
            source: "website",
            stage: "new",
            jobType: svcLabel,
            estimatedValue: String(
              ((input.estimateLow + input.estimateHigh) / 2).toFixed(2)
            ),
            notes,
          });
          const insertResult = result as unknown as { insertId?: number };
          leadId = insertResult?.insertId ?? null;
        }
      } catch (err) {
        console.error("[Widget] submitEstimate CRM save failed:", err);
      }

      await notifyOwner({
        title: `New estimate lead: ${input.name}`,
        content: `Phone: ${input.phone}\nService: ${svcLabel}\nAcreage: ${input.acres} acres\nEstimate: $${input.estimateLow.toLocaleString()} – $${input.estimateHigh.toLocaleString()}`,
      }).catch(() => {});

      return { ok: true, leadId };
    }),

  /**
   * Public endpoint — no auth required.
   * Returns all blackout dates so the date picker can disable them.
   */
  getBlackoutDates: publicProcedure.query(async () => {
    const rows = await getVisitBlackoutDates().catch(() => []);
    return rows.map((r) => r.date); // string[] of YYYY-MM-DD
  }),

  /**
   * Public endpoint — no auth required.
   * Returns recurring blackout days-of-week (0=Sun, 6=Sat) so the date picker can disable them.
   */
  getRecurringBlackoutDays: publicProcedure.query(async () => {
    const rows = await getRecurringBlackoutDays().catch(() => []);
    return rows.map((r) => r.dayOfWeek); // number[] e.g. [0, 6] for every Sat+Sun
  }),

  /**
   * Public endpoint — no auth required.
   * Saves a requested site visit date/time to an existing lead record.
   * Sends an automated email confirmation to the visitor.
   */
  requestVisit: publicProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        visitAt: z.date(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await updateOpsLeadById(input.leadId, { requestedVisitAt: input.visitAt });

        const visitFormatted = input.visitAt.toLocaleString("en-US", {
          timeZone: "America/Chicago",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        // Owner notification
        await notifyOwner({
          title: `Site visit requested${input.name ? ` — ${input.name}` : ""}`,
          content: `Lead #${input.leadId} requested a site visit on ${visitFormatted}.${input.phone ? `\nPhone: ${input.phone}` : ""}`,
        }).catch(() => {});

        // Visitor confirmation email
        if (input.email) {
          const resend = getResend();
          if (resend) {
            await resend.emails.send({
              from: "Noland Earthworks <noreply@nolandearthworks.com>",
              to: input.email,
              subject: "Site Visit Request Received — Noland Earthworks",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
                  <div style="background:#1a1a1a;padding:24px 32px;">
                    <h1 style="color:#d97706;margin:0;font-size:22px;letter-spacing:1px;">NOLAND EARTHWORKS</h1>
                    <p style="color:#888;margin:4px 0 0;font-size:13px;">Veteran-Owned Land Management</p>
                  </div>
                  <div style="padding:32px;">
                    <h2 style="color:#1a1a1a;margin-top:0;">Site Visit Request Received</h2>
                    <p style="color:#444;line-height:1.6;">Hi ${input.name ?? "there"},</p>
                    <p style="color:#444;line-height:1.6;">We received your request for a site visit on:</p>
                    <div style="background:#f5f5f5;border-left:4px solid #d97706;padding:16px 20px;margin:20px 0;">
                      <strong style="font-size:16px;color:#1a1a1a;">${visitFormatted} (Central Time)</strong>
                    </div>
                    <p style="color:#444;line-height:1.6;">Jon will review your request and confirm the visit time — or reach out to find a time that works if there is a scheduling conflict. You can expect to hear back within one business day.</p>
                    <p style="color:#444;line-height:1.6;">If you need to reach us sooner, call or text: <strong><a href="tel:6154064819" style="color:#d97706;">615-406-4819</a></strong></p>
                    <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
                    <p style="color:#888;font-size:12px;margin:0;">Noland Earthworks, LLC &mdash; Vanleer, TN &mdash; <a href="https://nolandearthworks.com" style="color:#d97706;">nolandearthworks.com</a></p>
                  </div>
                </div>
              `,
            }).catch((e: unknown) => console.error("[Widget] Visit confirmation email failed:", e));
          }
        }

        return { ok: true };
      } catch (err) {
        console.error("[Widget] requestVisit failed:", err);
        return { ok: false };
      }
    }),

  /**
   * Public endpoint — no auth required.
   * Receives a visitor's name, phone, and message from the SMS widget on the public site.
   * Actions:
   *   1. Forwards the message to Jon's phone via Twilio SMS.
   *   2. Creates an in-app owner notification.
   *   3. Saves the visitor as a new lead (stage: "new", source: "website") in the CRM.
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        phone: z.string().min(7).max(20),
        message: z.string().min(1).max(320),
      })
    )
    .mutation(async ({ input }) => {
      const body = `New website message from ${input.name} (${input.phone}):\n\n${input.message}\n\n-- Noland Earthworks website widget`;

      // ── Twilio SMS ──
      let smsSent = false;
      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber && ENV.ownerPhone) {
        try {
          const twilio = await import("twilio");
          const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
          await client.messages.create({
            body,
            from: ENV.twilioFromNumber,
            to: ENV.ownerPhone,
          });
          smsSent = true;
        } catch (err) {
          console.error("[Widget] Twilio send failed:", err);
        }
      }

      // ── Owner notification (in-app) ──
      await notifyOwner({
        title: `New website lead: ${input.name}`,
        content: `Phone: ${input.phone}\n\n${input.message}`,
      }).catch(() => {});

      // ── Save as CRM lead ──────────────────────────────────────────────────
      let leadId: number | null = null;
      try {
        const owner = await getOwnerUser();
        if (owner) {
          const result = await createOpsLead({
            userId: owner.id,
            name: input.name,
            phone: input.phone,
            source: "website",
            stage: "new",
            notes: `Initial message via website SMS widget:\n\n${input.message}`,
          });
          // MySQL insertId is on result[0] when using drizzle mysql2
          const insertResult = result as unknown as { insertId?: number };
          leadId = insertResult?.insertId ?? null;
        }
      } catch (err) {
        // Non-fatal — SMS already sent; log and continue
        console.error("[Widget] CRM lead creation failed:", err);
      }

      return { ok: true, smsSent, leadId };
    }),
});
