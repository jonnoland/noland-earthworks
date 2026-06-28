/**
 * Stripe client and helpers for Noland Earthworks payment processing.
 * Supports deposit and final balance checkout sessions.
 */
import Stripe from "stripe";
import { ENV } from "./_core/env";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return !!ENV.stripeSecretKey;
}

/**
 * Create or retrieve a Stripe Customer for a given user.
 * Stores the customer ID back to the DB on first creation.
 */
export async function getOrCreateStripeCustomer(
  userId: number,
  email: string | null | undefined,
  name: string | null | undefined,
  existingStripeCustomerId: string | null | undefined
): Promise<string> {
  const stripe = getStripe();

  if (existingStripeCustomerId) {
    // Verify it still exists
    try {
      const customer = await stripe.customers.retrieve(existingStripeCustomerId);
      if (!customer.deleted) return existingStripeCustomerId;
    } catch {
      // Fall through to create a new one
    }
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId: userId.toString() },
  });

  return customer.id;
}

export interface CreateCheckoutSessionParams {
  jobId: number;
  jobTitle: string;
  amountCents: number;
  type: "deposit" | "balance";
  customerEmail: string | null | undefined;
  customerName: string | null | undefined;
  stripeCustomerId: string | null | undefined;
  userId: number;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Stripe Checkout Session for a deposit or balance payment.
 * Returns the session URL to redirect the customer to.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripe();

  const label = params.type === "deposit" ? "Deposit" : "Final Balance";
  const description = `${label} for: ${params.jobTitle}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.stripeCustomerId ?? undefined,
    customer_email: params.stripeCustomerId ? undefined : (params.customerEmail ?? undefined),
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: params.amountCents,
          product_data: {
            name: description,
            description: "Noland Earthworks, LLC — Veteran-Owned Land Management",
          },
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: false,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      job_id: params.jobId.toString(),
      payment_type: params.type,
      customer_email: params.customerEmail ?? "",
      customer_name: params.customerName ?? "",
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  return { sessionId: session.id, url: session.url };
}
