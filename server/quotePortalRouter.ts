/**
 * Quote Portal Router — public, token-authenticated procedures for the client-facing quote portal.
 *
 * These procedures are intentionally PUBLIC (no Manus auth required) because the client
 * receives a unique, unguessable token URL and does not have a Manus account.
 *
 * Procedures:
 *   getByToken         — load a quote by its portal token (marks portalViewedAt on first view)
 *   clientAction       — client approves or declines the quote
 *   createDepositSession — create a Stripe Checkout Session for the deposit; client pays directly
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { distanceQuotes } from "../drizzle/schema";
import { isStripeConfigured, getStripe } from "./stripe";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

const PORTAL_BASE_URL = "https://nolandearth-pymczdcn.manus.space";

// ─── Email Templates (defined before router so they are in scope) ─────────────

function buildChangeRequestEmail(firstName: string, jobType: string, note: string): string {
  const job = jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;}
    .wrapper{max-width:600px;margin:0 auto;background:#fff;}
    .header{background:#1a1a1a;padding:24px 32px;}
    .header h1{color:#f0a500;margin:0;font-size:20px;letter-spacing:.5px;}
    .header p{color:#888;margin:4px 0 0;font-size:12px;}
    .body{padding:32px;}
    .greeting{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:16px;}
    .note-box{background:#f9f9f9;border-left:3px solid #f0a500;padding:12px 16px;margin:16px 0;font-size:13px;color:#333;font-style:italic;}
    .footer{background:#f4f4f4;padding:16px 32px;font-size:11px;color:#999;text-align:center;}
    a{color:#f0a500;}
  </style></head><body><div class="wrapper">
    <div class="header"><h1>Noland Earthworks, LLC</h1><p>Veteran-Owned &amp; Operated &bull; Middle &amp; West Tennessee</p></div>
    <div class="body">
      <p class="greeting">Hi ${firstName},</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">We received your change request for the <strong>${job}</strong> quote. Here is what you submitted:</p>
      <div class="note-box">&ldquo;${note}&rdquo;</div>
      <p style="font-size:14px;line-height:1.7;color:#333;">Jon will review your request and follow up with a revised quote shortly. If you need to reach him directly, call or text <strong>615-406-4819</strong>.</p>
    </div>
    <div class="footer">Noland Earthworks, LLC &bull; Vanleer, TN &bull; <a href="https://www.nolandearthworks.com">nolandearthworks.com</a><br/>Veteran-owned and operated. Licensed and insured.</div>
  </div></body></html>`;
}

export const quotePortalRouter = router({
  /**
   * Load a quote by its portal token.
   * Returns only the fields the client needs to see — no internal pricing details.
   * Marks portalViewedAt on first view and notifies the owner.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(16) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [quote] = await db
        .select()
        .from(distanceQuotes)
        .where(eq(distanceQuotes.portalToken, input.token))
        .limit(1);

      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found or link has expired." });

      // Mark first view
      if (!quote.portalViewedAt) {
        await db
          .update(distanceQuotes)
          .set({ portalViewedAt: new Date() })
          .where(eq(distanceQuotes.id, quote.id));

        // Notify owner that client opened the quote
        await notifyOwner({
          title: `Quote Opened — ${quote.clientName}`,
          content: `${quote.clientName} just opened their quote portal link for ${quote.jobType.replace(/_/g, " ")} (${quote.jobAcres} ac, $${(quote.adjustedJobTotalCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}).`,
        }).catch(() => {/* non-critical */});
      }

      const fmt = (cents: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

      const tierLabel = (miles: number) =>
        miles <= 30 ? "Local (0–30 mi) — No surcharge" :
        miles <= 50 ? "31–50 mi" :
        miles <= 75 ? "51–75 mi" :
        miles <= 100 ? "76–100 mi" : "100+ mi";

      return {
        id: quote.id,
        clientName: quote.clientName,
        jobType: quote.jobType,
        jobAddress: quote.jobAddress,
        jobAcres: quote.jobAcres,
        crewDaysNeeded: quote.crewDaysNeeded,
        notes: quote.notes,
        distanceMiles: quote.distanceMiles,
        driveDuration: quote.driveDuration,
        mobilizationTier: tierLabel(quote.distanceMiles),
        // Pricing — formatted for display
        baseDayRate: fmt(quote.baseDayRateCents),
        mobSurcharge: quote.mobSurchargeCents > 0 ? fmt(quote.mobSurchargeCents) : null,
        adjustedDayRate: fmt(quote.adjustedDayRateCents),
        pricePerAcre: fmt(quote.pricePerAcreCents),
        totalFormatted: fmt(quote.adjustedJobTotalCents),
        totalCents: quote.adjustedJobTotalCents,
        // Status
        status: quote.status,
        clientAction: quote.clientAction,
        clientActionAt: quote.clientActionAt,
        depositPaidCents: quote.depositPaidCents,
        depositPaidAt: quote.depositPaidAt,
        sentAt: quote.sentAt,
        createdAt: quote.createdAt,
        // Signature
        signatureDataUrl: quote.signatureDataUrl,
        signedAt: quote.signedAt,
        signatureMode: quote.signatureMode,
        signatureTypedText: quote.signatureTypedText,
        // Change request
        changeRequestNote: quote.changeRequestNote,
        changeRequestAt: quote.changeRequestAt,
        // Portal add-ons
        portalAddOns: quote.portalAddOns ? (JSON.parse(quote.portalAddOns) as Array<{key: string; label: string; costCents: number}>) : [],
        portalAddOnsTotalCents: quote.portalAddOnsTotalCents ?? 0,
      };
    }),

  /**
   * Client requests changes to the quote.
   * Stores the note, notifies the owner, and sends the client an acknowledgement email.
   */
  requestChanges: publicProcedure
    .input(z.object({
      token: z.string().min(16),
      note: z.string().min(10).max(2000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [quote] = await db
        .select()
        .from(distanceQuotes)
        .where(eq(distanceQuotes.portalToken, input.token))
        .limit(1);

      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      if (quote.clientAction) {
        throw new TRPCError({ code: "CONFLICT", message: `This quote has already been ${quote.clientAction}. Contact Jon directly to discuss changes.` });
      }

      await db
        .update(distanceQuotes)
        .set({
          changeRequestNote: input.note,
          changeRequestAt: new Date(),
          status: "draft", // revert to draft so it shows up in your queue
        })
        .where(eq(distanceQuotes.id, quote.id));

      const fmt = (cents: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

      await notifyOwner({
        title: `Changes Requested — ${quote.clientName}`,
        content: [
          `${quote.clientName} requested changes to the quote for ${quote.jobType.replace(/_/g, " ")}.`,
          `Job site: ${quote.jobAddress}`,
          `Acreage: ${quote.jobAcres} ac | Total: ${fmt(quote.adjustedJobTotalCents)}`,
          `Client note: "${input.note}"`,
        ].join("\n"),
      }).catch(() => {/* non-critical */});

      // Send acknowledgement email to client
      if (quote.clientEmail && ENV.resendApiKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(ENV.resendApiKey);
          const firstName = quote.clientName.split(" ")[0];
          await resend.emails.send({
            from: "Noland Earthworks <noreply@nolandearthworks.com>",
            to: quote.clientEmail,
            replyTo: "jon@nolandearthworks.com",
            subject: "Change Request Received — Noland Earthworks",
            html: buildChangeRequestEmail(firstName, quote.jobType, input.note),
          });
        } catch (err) {
          console.error("[quotePortal] Change request email failed:", err);
        }
      }

      return { success: true };
    }),

  clientAction: publicProcedure
    .input(z.object({
      token: z.string().min(16),
      action: z.enum(["approved", "declined"]),
      message: z.string().max(1000).optional(),
      signatureDataUrl: z.string().max(200000).optional(), // base64 PNG from canvas
      signatureMode: z.enum(["drawn", "typed"]).optional(),
      signatureTypedText: z.string().max(255).optional(),
      portalAddOns: z.array(z.object({
        key: z.string(),
        label: z.string(),
        costCents: z.number().int().nonnegative(),
      })).optional(),
      portalAddOnsTotalCents: z.number().int().nonnegative().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [quote] = await db
        .select()
        .from(distanceQuotes)
        .where(eq(distanceQuotes.portalToken, input.token))
        .limit(1);

      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      if (quote.clientAction) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `This quote has already been ${quote.clientAction}.`,
        });
      }

      const newStatus = input.action === "approved" ? "accepted" : "declined";

      await db
        .update(distanceQuotes)
        .set({
          clientAction: input.action,
          clientActionAt: new Date(),
          status: newStatus,
          ...(input.signatureDataUrl ? { signatureDataUrl: input.signatureDataUrl, signedAt: new Date() } : {}),
          ...(input.signatureMode ? { signatureMode: input.signatureMode } : {}),
          ...(input.signatureTypedText ? { signatureTypedText: input.signatureTypedText } : {}),
          ...(input.portalAddOns ? { portalAddOns: JSON.stringify(input.portalAddOns) } : {}),
          ...(input.portalAddOnsTotalCents !== undefined ? { portalAddOnsTotalCents: input.portalAddOnsTotalCents } : {}),
        })
        .where(eq(distanceQuotes.id, quote.id));

      const fmt = (cents: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

      const actionLabel = input.action === "approved" ? "APPROVED" : "DECLINED";
      const emoji = input.action === "approved" ? "✅" : "❌";

      await notifyOwner({
        title: `${emoji} Quote ${actionLabel} — ${quote.clientName}`,
        content: [
          `${quote.clientName} ${input.action} the quote for ${quote.jobType.replace(/_/g, " ")}.`,
          `Job site: ${quote.jobAddress}`,
          `Acreage: ${quote.jobAcres} ac | Total: ${fmt(quote.adjustedJobTotalCents)}`,
          input.message ? `Client note: "${input.message}"` : "",
        ].filter(Boolean).join("\n"),
      }).catch(() => {/* non-critical */});

      // Send confirmation email to client if email is on file
      if (quote.clientEmail && ENV.resendApiKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(ENV.resendApiKey);
          const firstName = quote.clientName.split(" ")[0];
          if (input.action === "approved") {
            await resend.emails.send({
              from: "Noland Earthworks <noreply@nolandearthworks.com>",
              to: quote.clientEmail,
              replyTo: "jon@nolandearthworks.com",
              subject: "Quote Accepted — Noland Earthworks",
              html: buildApprovedEmail(firstName, quote.jobType, quote.jobAddress, fmt(quote.adjustedJobTotalCents)),
            });
          } else {
            await resend.emails.send({
              from: "Noland Earthworks <noreply@nolandearthworks.com>",
              to: quote.clientEmail,
              replyTo: "jon@nolandearthworks.com",
              subject: "Quote Declined — Noland Earthworks",
              html: buildDeclinedEmail(firstName, quote.jobType),
            });
          }
        } catch (err) {
          console.error("[quotePortal] Confirmation email failed:", err);
        }
      }

      return { success: true, action: input.action };
    }),

  /**
   * Create a Stripe Checkout Session for the deposit.
   * The client pays directly — no Manus auth required.
   * Deposit defaults to 25% of the total; client can choose 25/33/50%.
   */
  createDepositSession: publicProcedure
    .input(z.object({
      token: z.string().min(16),
      depositPct: z.number().int().min(10).max(100).default(25),
    }))
    .mutation(async ({ input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment processing is not available." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable" });

      const [quote] = await db
        .select()
        .from(distanceQuotes)
        .where(eq(distanceQuotes.portalToken, input.token))
        .limit(1);

      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found." });
      if (quote.depositPaidAt) {
        throw new TRPCError({ code: "CONFLICT", message: "A deposit has already been paid for this quote." });
      }
      if (quote.clientAction === "declined") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cannot collect a deposit on a declined quote." });
      }

      const depositCents = Math.round(quote.adjustedJobTotalCents * (input.depositPct / 100));
      const balanceCents = quote.adjustedJobTotalCents - depositCents;
      const fmt = (cents: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

      const stripe = getStripe();
      const jobLabel = quote.jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: quote.clientEmail ?? undefined,
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: depositCents,
            product_data: {
              name: `${input.depositPct}% Deposit — ${jobLabel}`,
              description: `Job site: ${quote.jobAddress} | Balance due on completion: ${fmt(balanceCents)}. Noland Earthworks, LLC — Veteran-Owned Land Management`,
            },
          },
          quantity: 1,
        }],
        allow_promotion_codes: false,
        client_reference_id: `portal-quote-${quote.id}`,
        metadata: {
          payment_type: "portal_deposit",
          quote_id: quote.id.toString(),
          portal_token: input.token,
          deposit_pct: input.depositPct.toString(),
          total_cents: quote.adjustedJobTotalCents.toString(),
          deposit_cents: depositCents.toString(),
          client_name: quote.clientName,
          client_email: quote.clientEmail ?? "",
        },
        success_url: `${PORTAL_BASE_URL}/quote/${input.token}?deposit=success`,
        cancel_url: `${PORTAL_BASE_URL}/quote/${input.token}?deposit=cancelled`,
      });

      if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment session could not be created." });

      // Store the session ID so the webhook can match it
      await db
        .update(distanceQuotes)
        .set({ depositSessionId: session.id })
        .where(eq(distanceQuotes.id, quote.id));

      return { checkoutUrl: session.url, sessionId: session.id };
    }),
});

// ─── Email Templates ──────────────────────────────────────────────────────────

function buildApprovedEmail(firstName: string, jobType: string, address: string, total: string): string {
  const job = jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;}
    .wrapper{max-width:600px;margin:0 auto;background:#fff;}
    .header{background:#1a1a1a;padding:24px 32px;}
    .header h1{color:#f0a500;margin:0;font-size:20px;letter-spacing:.5px;}
    .header p{color:#888;margin:4px 0 0;font-size:12px;}
    .body{padding:32px;}
    .greeting{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:16px;}
    .footer{background:#f4f4f4;padding:16px 32px;font-size:11px;color:#999;text-align:center;}
    a{color:#f0a500;}
  </style></head><body><div class="wrapper">
    <div class="header"><h1>Noland Earthworks, LLC</h1><p>Veteran-Owned &amp; Operated &bull; Middle &amp; West Tennessee</p></div>
    <div class="body">
      <p class="greeting">Hi ${firstName},</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">Thank you for accepting the quote for <strong>${job}</strong> at ${address}. We have your approval on file and will be in touch shortly to schedule the work.</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">Quoted total: <strong>${total}</strong>. A deposit may be required to hold your spot on the schedule.</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">If you have any questions before we get started, call or text Jon directly at <strong>615-406-4819</strong>.</p>
    </div>
    <div class="footer">Noland Earthworks, LLC &bull; Vanleer, TN &bull; <a href="https://www.nolandearthworks.com">nolandearthworks.com</a><br/>Veteran-owned and operated. Licensed and insured.</div>
  </div></body></html>`;
}

function buildDeclinedEmail(firstName: string, jobType: string): string {
  const job = jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body{margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;}
    .wrapper{max-width:600px;margin:0 auto;background:#fff;}
    .header{background:#1a1a1a;padding:24px 32px;}
    .header h1{color:#f0a500;margin:0;font-size:20px;letter-spacing:.5px;}
    .header p{color:#888;margin:4px 0 0;font-size:12px;}
    .body{padding:32px;}
    .greeting{font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:16px;}
    .footer{background:#f4f4f4;padding:16px 32px;font-size:11px;color:#999;text-align:center;}
    a{color:#f0a500;}
  </style></head><body><div class="wrapper">
    <div class="header"><h1>Noland Earthworks, LLC</h1><p>Veteran-Owned &amp; Operated &bull; Middle &amp; West Tennessee</p></div>
    <div class="body">
      <p class="greeting">Hi ${firstName},</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">We received your response regarding the quote for <strong>${job}</strong>. We are sorry it was not the right fit at this time.</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">If your situation changes or you have questions about the scope or pricing, feel free to reach out. We are happy to revisit the estimate.</p>
      <p style="font-size:14px;line-height:1.7;color:#333;">Call or text Jon at <strong>615-406-4819</strong> or visit <a href="https://www.nolandearthworks.com">nolandearthworks.com</a>.</p>
    </div>
    <div class="footer">Noland Earthworks, LLC &bull; Vanleer, TN &bull; <a href="https://www.nolandearthworks.com">nolandearthworks.com</a><br/>Veteran-owned and operated. Licensed and insured.</div>
  </div></body></html>`;
}
