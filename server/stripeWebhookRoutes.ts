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
import { payments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(session);
        } else if (event.type === "checkout.session.expired") {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutExpired(session);
        }
      } catch (err) {
        console.error("[Stripe Webhook] Handler error:", err);
        // Return 200 so Stripe doesn't retry — log the error for manual review
      }

      res.json({ received: true });
    }
  );
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) return;

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] DB unavailable — cannot update payment for session", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await db
    .update(payments)
    .set({
      status: "paid",
      stripePaymentIntentId: paymentIntentId,
      paidAt: new Date(),
    })
    .where(eq(payments.stripeSessionId, session.id));

  console.log(`[Stripe Webhook] Payment marked as paid for session ${session.id}`);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.id) return;

  const db = await getDb();
  if (!db) return;

  await db
    .update(payments)
    .set({ status: "cancelled" })
    .where(eq(payments.stripeSessionId, session.id));

  console.log(`[Stripe Webhook] Payment marked as cancelled for session ${session.id}`);
}
