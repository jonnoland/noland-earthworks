/**
 * Stripe webhook endpoint.
 * MUST be registered BEFORE express.json() so the raw body is preserved for signature verification.
 *
 * Handles:
 *   checkout.session.completed — marks payment as paid, records paidAt
 *   checkout.session.expired   — marks payment as cancelled
 */
import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { getStripe, isStripeConfigured } from "./stripe";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { payments, nativeQuotes, nativeInvoices, nativeJobs, stripeWebhookEvents } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

async function getRequiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable while processing signed Stripe webhook");
  return db;
}

function sessionIdFromEvent(event: Stripe.Event): string | null {
  const object = event.data.object as Stripe.Checkout.Session;
  return typeof object?.id === "string" ? object.id : null;
}

async function beginWebhookEvent(event: Stripe.Event): Promise<boolean> {
  const db = await getRequiredDb();
  const [existing] = await db
    .select({ status: stripeWebhookEvents.status })
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.eventId, event.id))
    .limit(1);

  if (existing?.status === "processed") return false;

  await db.insert(stripeWebhookEvents).values({
    eventId: event.id,
    eventType: event.type,
    stripeSessionId: sessionIdFromEvent(event),
    status: "received",
    attempts: 1,
  }).onDuplicateKeyUpdate({
    set: {
      status: "received",
      attempts: sql`${stripeWebhookEvents.attempts} + 1`,
      lastError: null,
    },
  });
  return true;
}

async function markWebhookEvent(eventId: string, status: "processed" | "failed", lastError?: string) {
  const db = await getRequiredDb();
  await db.update(stripeWebhookEvents)
    .set({
      status,
      lastError: lastError ?? null,
      processedAt: status === "processed" ? new Date() : null,
    })
    .where(eq(stripeWebhookEvents.eventId, eventId));
}

export function registerStripeWebhookRoutes(app: Express): void {
  // Raw body parser — must come before express.json() for this route only
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!isStripeConfigured()) {
        res.status(400).json({ error: "Stripe not configured" });
        return;
      }

      const sig = req.headers["stripe-signature"];
      if (!sig) {
        res.status(400).json({ error: "Missing stripe-signature header" });
        return;
      }

      let event: Stripe.Event;
      try {
        event = getStripe().webhooks.constructEvent(
          req.body as Buffer,
          sig,
          ENV.stripeWebhookSecret
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[Stripe Webhook] Signature verification failed:", msg);
        res.status(400).json({ error: `Webhook signature verification failed: ${msg}` });
        return;
      }

      // Test event pass-through (required for Stripe webhook verification flow)
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        const shouldProcess = await beginWebhookEvent(event);
        if (!shouldProcess) {
          res.json({ received: true, duplicate: true });
          return;
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
        } else if (event.type === "checkout.session.async_payment_succeeded") {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleInvoicePaymentSucceeded(session);
        } else if (event.type === "checkout.session.async_payment_failed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleInvoicePaymentFailed(session);
        } else if (event.type === "checkout.session.expired") {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutExpired(session);
        }
        await markWebhookEvent(event.id, "processed");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[Stripe Webhook] Handler error:", message);
        try {
          await markWebhookEvent(event.id, "failed", message.slice(0, 4000));
        } catch (ledgerErr) {
          console.error("[Stripe Webhook] Failed to record reconciliation exception:", ledgerErr);
        }
        await notifyOwner({
          title: "Stripe payment reconciliation needs attention",
          content: `Signed Stripe event ${event.type} (${event.id}) was not applied internally. Stripe will retry. Error: ${message}`,
        }).catch((notifyErr) => console.error("[Stripe Webhook] Owner alert failed:", notifyErr));
        res.status(500).json({ error: "Internal webhook processing failed; retry requested" });
        return;
      }

      res.json({ received: true });
    }
  );
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) return;

  const db = await getRequiredDb();

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const nativeInvoiceId = session.metadata?.native_invoice_id
    ? parseInt(session.metadata.native_invoice_id, 10)
    : null;
  if (nativeInvoiceId && !isNaN(nativeInvoiceId)) {
    if (session.payment_status === "paid") {
      await markNativeInvoicePaid(nativeInvoiceId, paymentIntentId);
    } else {
      console.log(`[Stripe Webhook] Invoice #${nativeInvoiceId} payment submitted and awaiting settlement`);
    }
    return;
  }

  // Update generic payments table (used by other checkout flows)
  await db
    .update(payments)
    .set({
      status: "paid",
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
    })
    .where(eq(payments.stripeSessionId, session.id));

  // If this is a native quote deposit, mark the quote as deposit paid
  const nativeQuoteId = session.metadata?.native_quote_id
    ? parseInt(session.metadata.native_quote_id, 10)
    : null;
  if (nativeQuoteId && !isNaN(nativeQuoteId)) {
    const amountTotal = session.amount_total ?? 0; // cents
    await db
      .update(nativeQuotes)
      .set({
        depositPaidCents: amountTotal,
        depositPaidAt: new Date(),
        stripeSessionId: session.id,
        status: "approved",
        clientAction: "approved",
        clientActionAt: new Date(),
      })
      .where(eq(nativeQuotes.id, nativeQuoteId));
    console.log(`[Stripe Webhook] Native quote #${nativeQuoteId} deposit paid — ${amountTotal} cents`);
  }

  console.log(`[Stripe Webhook] Payment marked as paid for session ${session.id}`);
}

async function markNativeInvoicePaid(invoiceId: number, paymentIntentId: string | null): Promise<void> {
  const db = await getRequiredDb();
  const [invoice] = await db.select().from(nativeInvoices).where(eq(nativeInvoices.id, invoiceId)).limit(1);
  if (!invoice || invoice.status === "paid") return;
  const paidAt = new Date();
  await db.update(nativeInvoices).set({
    status: "paid",
    paidAt,
    stripePaymentIntentId: paymentIntentId ?? invoice.stripePaymentIntentId,
  }).where(eq(nativeInvoices.id, invoiceId));
  await db.update(nativeJobs).set({ paidCents: invoice.totalCents, paidAt }).where(eq(nativeJobs.id, invoice.jobId));
  console.log(`[Stripe Webhook] Native invoice #${invoiceId} marked paid`);
}

async function handleInvoicePaymentSucceeded(session: Stripe.Checkout.Session): Promise<void> {
  const invoiceId = session.metadata?.native_invoice_id
    ? parseInt(session.metadata.native_invoice_id, 10)
    : null;
  if (!invoiceId || isNaN(invoiceId)) return;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  await markNativeInvoicePaid(invoiceId, paymentIntentId);
}

async function handleInvoicePaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
  const invoiceId = session.metadata?.native_invoice_id;
  if (!invoiceId) return;
  await notifyOwner({
    title: "ACH invoice payment failed",
    content: `Stripe reported a failed payment for native invoice #${invoiceId}. The invoice remains unpaid; contact the customer if needed.`,
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) return;

  const db = await getRequiredDb();

  await db
    .update(payments)
    .set({ status: "cancelled" })
    .where(eq(payments.stripeSessionId, session.id));

  console.log(`[Stripe Webhook] Payment marked as cancelled for session ${session.id}`);
}
