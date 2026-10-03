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

export interface CreateInvoiceCheckoutSessionParams {
  invoiceId: number;
  jobId: number;
  invoiceNumber: string;
  amountCents: number;
  customerEmail: string | null | undefined;
  customerName: string | null | undefined;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a hosted final-invoice checkout link. Stripe displays card and
 * US bank account (ACH Direct Debit) when ACH is enabled for the account.
 * ACH is asynchronous, so the webhook—not the browser return—is authoritative.
 */
export async function createInvoiceCheckoutSession(
  params: CreateInvoiceCheckoutSessionParams
): Promise<{ sessionId: string; url: string; paymentIntentId: string | null }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card", "us_bank_account"],
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: params.amountCents,
        product_data: {
          name: `Invoice ${params.invoiceNumber} — Noland Earthworks`,
          description: "Final balance for completed land management work",
        },
      },
      quantity: 1,
    }],
    customer_email: params.customerEmail ?? undefined,
    client_reference_id: `invoice-${params.invoiceId}`,
    metadata: {
      native_invoice_id: params.invoiceId.toString(),
      native_job_id: params.jobId.toString(),
      payment_type: "invoice_balance",
      invoice_number: params.invoiceNumber,
    },
    payment_intent_data: {
      metadata: {
        native_invoice_id: params.invoiceId.toString(),
        native_job_id: params.jobId.toString(),
        payment_type: "invoice_balance",
      },
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe did not return an invoice payment URL");
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  return { sessionId: session.id, url: session.url, paymentIntentId };
}

/**
 * Retire an older invoice Checkout Session before issuing a fresh resend link.
 * A paid session is never replaced because doing so could allow a duplicate payment.
 */
export async function expireInvoiceCheckoutSession(sessionId: string): Promise<void> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid") {
    throw new Error("Stripe already reports this invoice checkout as paid. Refresh the invoice status before resending.");
  }
  if (session.status === "complete") {
    throw new Error("A bank payment has already been submitted and is awaiting Stripe confirmation. Do not resend this invoice yet.");
  }
  if (session.status === "open") {
    await stripe.checkout.sessions.expire(sessionId);
  }
}

/**
 * Refunds a specific amount of a settled final-invoice PaymentIntent. Stripe
 * keeps the original payment method and bank/card settlement handling intact.
 */
export async function refundInvoicePayment(
  paymentIntentId: string,
  amountCents: number,
  reason?: Stripe.RefundCreateParams.Reason
): Promise<{ refundId: string; status: string | null }> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Refund amount must be a positive whole number of cents");
  }
  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason,
  });
  return { refundId: refund.id, status: refund.status };
}
