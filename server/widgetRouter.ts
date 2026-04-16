import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { getOwnerUser, createOpsLead } from "./db";

export const widgetRouter = router({
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
