import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { getOwnerUser, createOpsLead, updateOpsLeadById } from "./db";

const SERVICE_LABELS: Record<string, string> = {
  "forestry-mulching": "Forestry Mulching",
  "land-clearing": "Land Clearing",
  "vegetation-management": "Vegetation Management",
  "right-of-way-clearing": "Right-of-Way Clearing",
  "property-maintenance": "Property Maintenance",
};

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
   * Saves a requested site visit date/time to an existing lead record.
   * Called from the ConfirmationOverlay after a calculator estimate submission.
   */
  requestVisit: publicProcedure
    .input(
      z.object({
        leadId: z.number().int().positive(),
        visitAt: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await updateOpsLeadById(input.leadId, { requestedVisitAt: input.visitAt });

        await notifyOwner({
          title: `Site visit requested`,
          content: `Lead #${input.leadId} requested a site visit on ${input.visitAt.toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
        }).catch(() => {});

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
