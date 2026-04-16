import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

export const widgetRouter = router({
  /**
   * Public endpoint — no auth required.
   * Receives a visitor's name, phone, and message from the SMS widget on the public site.
   * Forwards the message to Jon's phone via Twilio SMS and sends an owner notification.
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
        title: `Website message from ${input.name}`,
        content: `Phone: ${input.phone}\n\n${input.message}`,
      }).catch(() => {});

      return { ok: true, smsSent };
    }),
});
