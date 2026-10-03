import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  event: null as any,
  existingStatus: undefined as "processed" | undefined,
  ledgerStatus: null as string | null,
  failPaymentUpdate: false,
  notifyOwner: vi.fn().mockResolvedValue(undefined),
  nativeInvoice: null as null | {
    id: number;
    jobId: number;
    quoteId: number | null;
    totalCents: number;
    status: string;
    stripePaymentIntentId: string | null;
    paidAt?: Date | null;
  },
  invoiceUpdate: null as Record<string, unknown> | null,
  jobUpdate: null as Record<string, unknown> | null,
  quoteUpdate: null as Record<string, unknown> | null,
  paymentsTable: { stripeSessionId: "stripeSessionId" },
  nativeQuotesTable: { id: "id" },
  nativeInvoicesTable: { id: "id" },
  nativeJobsTable: { id: "id" },
  webhookEventsTable: { eventId: "eventId", status: "status", attempts: "attempts" },
}));

vi.mock("./_core/env", () => ({ ENV: { stripeWebhookSecret: "whsec_test" } }));
vi.mock("./stripe", () => ({
  isStripeConfigured: () => true,
  getStripe: () => ({ webhooks: { constructEvent: () => state.event } }),
}));
vi.mock("./_core/notification", () => ({ notifyOwner: state.notifyOwner }));
vi.mock("drizzle-orm", () => ({
  eq: () => undefined,
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));
vi.mock("../drizzle/schema", () => ({
  payments: state.paymentsTable,
  nativeQuotes: state.nativeQuotesTable,
  nativeInvoices: state.nativeInvoicesTable,
  nativeJobs: state.nativeJobsTable,
  stripeWebhookEvents: state.webhookEventsTable,
}));
vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => {
            if (table === state.nativeInvoicesTable) return state.nativeInvoice ? [state.nativeInvoice] : [];
            return state.existingStatus ? [{ status: state.existingStatus }] : [];
          },
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onDuplicateKeyUpdate: async () => undefined,
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          if (table === state.paymentsTable && state.failPaymentUpdate) throw new Error("payment update failed");
          if (table === state.webhookEventsTable) state.ledgerStatus = String(values.status ?? state.ledgerStatus);
          if (table === state.nativeInvoicesTable) state.invoiceUpdate = values;
          if (table === state.nativeJobsTable) state.jobUpdate = values;
          if (table === state.nativeQuotesTable) state.quoteUpdate = values;
        },
      }),
    }),
  }),
}));

const { registerStripeWebhookRoutes } = await import("./stripeWebhookRoutes");

function checkoutEvent(id: string) {
  return {
    id,
    type: "checkout.session.completed",
    data: { object: { id: "cs_test_123", metadata: {}, amount_total: 5000 } },
  };
}

function pendingAchInvoiceEvent(id: string) {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_pending_ach_invoice_42",
        payment_intent: "pi_pending_ach_invoice_42",
        payment_status: "unpaid",
        metadata: { native_invoice_id: "42", native_job_id: "7", payment_type: "invoice_balance" },
      },
    },
  };
}

function asyncInvoiceSucceededEvent(id: string) {
  return {
    id,
    type: "checkout.session.async_payment_succeeded",
    data: {
      object: {
        id: "cs_ach_invoice_42",
        payment_intent: "pi_ach_invoice_42",
        payment_status: "paid",
        metadata: { native_invoice_id: "42", native_job_id: "7", payment_type: "invoice_balance" },
      },
    },
  };
}

function asyncInvoiceFailedEvent(id: string) {
  return {
    id,
    type: "checkout.session.async_payment_failed",
    data: {
      object: {
        id: "cs_failed_ach_invoice_42",
        payment_intent: "pi_failed_ach_invoice_42",
        payment_status: "unpaid",
        metadata: { native_invoice_id: "42", native_job_id: "7", payment_type: "invoice_balance" },
      },
    },
  };
}

async function dispatchWebhook() {
  const app = express();
  registerStripeWebhookRoutes(app);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  try {
    return await fetch(`http://127.0.0.1:${port}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": "test_signature" },
      body: JSON.stringify({}),
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

describe("Stripe webhook behavior", () => {
  beforeEach(() => {
    state.event = checkoutEvent("evt_live_123");
    state.existingStatus = undefined;
    state.ledgerStatus = null;
    state.failPaymentUpdate = false;
    state.nativeInvoice = null;
    state.invoiceUpdate = null;
    state.jobUpdate = null;
    state.quoteUpdate = null;
    state.notifyOwner.mockClear();
  });

  afterEach(() => vi.clearAllMocks());

  it("acknowledges a previously processed event without applying it again", async () => {
    state.existingStatus = "processed";

    const response = await dispatchWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
  });

  it("records a failed ledger state and returns HTTP 500 so Stripe retries", async () => {
    state.failPaymentUpdate = true;

    const response = await dispatchWebhook();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal webhook processing failed; retry requested" });
    expect(state.ledgerStatus).toBe("failed");
    expect(state.notifyOwner).toHaveBeenCalledOnce();
  });

  it("records an ACH payment as pending until Stripe confirms settlement", async () => {
    state.event = pendingAchInvoiceEvent("evt_live_ach_pending_42");

    const response = await dispatchWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.invoiceUpdate).toMatchObject({ stripePaymentIntentId: "pi_pending_ach_invoice_42", paymentMethod: "stripe" });
    expect(state.invoiceUpdate?.achPaymentPendingAt).toBeInstanceOf(Date);
    expect(state.jobUpdate).toBeNull();
    expect(state.ledgerStatus).toBe("processed");
  });

  it("marks the invoice and linked job paid after delayed ACH settlement succeeds", async () => {
    state.event = asyncInvoiceSucceededEvent("evt_live_ach_42");
    state.nativeInvoice = {
      id: 42,
      jobId: 7,
      quoteId: 19,
      totalCents: 125000,
      status: "sent",
      stripePaymentIntentId: null,
    };

    const response = await dispatchWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.invoiceUpdate).toMatchObject({ status: "paid", stripePaymentIntentId: "pi_ach_invoice_42", achPaymentPendingAt: null, paymentMethod: "stripe" });
    expect(state.invoiceUpdate?.paidAt).toBeInstanceOf(Date);
    expect(state.jobUpdate).toMatchObject({ paidCents: 125000 });
    expect(state.jobUpdate?.paidAt).toBeInstanceOf(Date);
    expect(state.quoteUpdate).toEqual({
      finalPaymentStatus: "paid",
      status: "paid",
      nextActionType: "final_payment_paid",
      nextActionDueAt: null,
    });
    expect(state.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      title: "ACH settled — Quote #19 moved to Paid",
      content: expect.stringContaining("Stripe confirmed the ACH settlement"),
    }));
    expect(state.ledgerStatus).toBe("processed");
  });

  it("reconciles a linked quote when Stripe retries an already-paid invoice without repeating the settlement alert", async () => {
    state.event = asyncInvoiceSucceededEvent("evt_retry_ach_42");
    state.nativeInvoice = {
      id: 42,
      jobId: 7,
      quoteId: 19,
      totalCents: 125000,
      status: "paid",
      stripePaymentIntentId: "pi_ach_invoice_42",
      paidAt: new Date("2026-09-28T02:29:08.000Z"),
    };

    const response = await dispatchWebhook();

    expect(response.status).toBe(200);
    expect(state.invoiceUpdate).toBeNull();
    expect(state.jobUpdate).toMatchObject({ paidCents: 125000 });
    expect(state.quoteUpdate).toEqual({
      finalPaymentStatus: "paid",
      status: "paid",
      nextActionType: "final_payment_paid",
      nextActionDueAt: null,
    });
    expect(state.notifyOwner).not.toHaveBeenCalled();
  });

  it("keeps a failed ACH invoice unpaid and clears its stale checkout so it can be resent", async () => {
    state.event = asyncInvoiceFailedEvent("evt_live_ach_failed_42");

    const response = await dispatchWebhook();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(state.invoiceUpdate).toEqual({ stripePaymentLinkUrl: null, stripeCheckoutSessionId: null, achPaymentPendingAt: null });
    expect(state.jobUpdate).toBeNull();
    expect(state.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "ACH invoice payment failed" }));
    expect(state.ledgerStatus).toBe("processed");
  });
});
