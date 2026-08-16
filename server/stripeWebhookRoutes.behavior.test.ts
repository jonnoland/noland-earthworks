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
  paymentsTable: { stripeSessionId: "stripeSessionId" },
  nativeQuotesTable: { id: "id" },
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
  stripeWebhookEvents: state.webhookEventsTable,
}));
vi.mock("./db", () => ({
  getDb: async () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.existingStatus ? [{ status: state.existingStatus }] : [],
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
});
