/**
 * Tests for the Facebook Leadgen Webhook handler.
 *
 * Covers:
 * - GET verification challenge (valid and invalid tokens)
 * - POST payload processing (leadgen events)
 * - Graph API fetch and lead field extraction
 * - Ops lead creation and owner notification
 * - Error handling (missing token, Graph API failure, DB failure)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { registerFacebookWebhookRoutes } from "./facebookWebhookRoutes";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreateOpsLead = vi.fn().mockResolvedValue({});
const mockGetOwnerUser = vi.fn();
const mockNotifyOwner = vi.fn().mockResolvedValue(true);
const mockResendSend = vi.fn().mockResolvedValue({ error: null });

vi.mock("./db", () => ({
  createOpsLead: (...args: unknown[]) => mockCreateOpsLead(...args),
  getOwnerUser: () => mockGetOwnerUser(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: (...args: unknown[]) => mockNotifyOwner(...args),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    resendApiKey: "test-resend-key",
    ownerOpenId: "owner-open-id",
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const VERIFY_TOKEN = "noland-earthworks-webhook-2026";
const SYSTEM_USER_TOKEN = "test-system-user-token";

function buildApp() {
  const app = express();
  app.use(express.json());
  process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
  process.env.FACEBOOK_SYSTEM_USER_TOKEN = SYSTEM_USER_TOKEN;
  registerFacebookWebhookRoutes(app);
  return app;
}

function buildLeadPayload(leadgenId: string) {
  return {
    object: "page",
    entry: [
      {
        id: "830611640137363",
        time: 1700000000,
        changes: [
          {
            field: "leadgen",
            value: {
              leadgen_id: leadgenId,
              page_id: "830611640137363",
              form_id: "form_abc123",
              created_time: 1700000000,
            },
          },
        ],
      },
    ],
  };
}

function buildGraphApiResponse(leadgenId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: leadgenId,
    field_data: [
      { name: "full_name", values: ["John Doe"] },
      { name: "email", values: ["john@example.com"] },
      { name: "phone_number", values: ["615-555-1234"] },
      { name: "service_type", values: ["Forestry Mulching"] },
      { name: "acreage", values: ["5"] },
      { name: "message", values: ["Need 5 acres cleared near Columbia TN"] },
    ],
    ad_name: "Forestry Mulching — Middle TN",
    form_id: "form_abc123",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Facebook Webhook — GET Verification", () => {
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    vi.resetModules();
    app = buildApp();
  });

  it("responds 200 with challenge when token matches", async () => {
    const res = await request(app)
      .get("/api/webhooks/facebook")
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "challenge_abc123",
      });

    expect(res.status).toBe(200);
    expect(res.text).toBe("challenge_abc123");
  });

  it("responds 403 when token does not match", async () => {
    const res = await request(app)
      .get("/api/webhooks/facebook")
      .query({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token",
        "hub.challenge": "challenge_abc123",
      });

    expect(res.status).toBe(403);
  });

  it("responds 403 when mode is not subscribe", async () => {
    const res = await request(app)
      .get("/api/webhooks/facebook")
      .query({
        "hub.mode": "unsubscribe",
        "hub.verify_token": VERIFY_TOKEN,
        "hub.challenge": "challenge_abc123",
      });

    expect(res.status).toBe(403);
  });
});

describe("Facebook Webhook — POST Lead Ingestion", () => {
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetOwnerUser.mockResolvedValue({ id: 1, openId: "owner-open-id" });
    app = buildApp();
  });

  it("responds 200 immediately for valid leadgen payload", async () => {
    // Mock the Graph API fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildGraphApiResponse("lead_123"),
    } as Response);

    const res = await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_123"))
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it("responds 200 for non-page object (ignores gracefully)", async () => {
    const res = await request(app)
      .post("/api/webhooks/facebook")
      .send({ object: "user", entry: [] })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(200);
  });

  it("creates an ops lead with correct fields from Graph API data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildGraphApiResponse("lead_456"),
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_456"))
      .set("Content-Type", "application/json");

    // Give async processing time to complete
    await new Promise(r => setTimeout(r, 100));

    expect(mockCreateOpsLead).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: "615-555-1234",
        source: "facebook",
        stage: "new",
        jobType: "Forestry Mulching",
      })
    );
  });

  it("sends owner notification after lead creation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildGraphApiResponse("lead_789"),
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_789"))
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockNotifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("John Doe"),
      })
    );
  });

  it("sends owner email notification via Resend", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildGraphApiResponse("lead_email_test"),
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_email_test"))
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@nolandearthworks.com",
        to: "quotes@nolandearthworks.com",
        subject: expect.stringContaining("John Doe"),
      })
    );
  });

  it("notifies owner when Graph API fetch fails, does not create lead", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"Invalid token"}}',
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_fail"))
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockCreateOpsLead).not.toHaveBeenCalled();
    expect(mockNotifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Fetch Failed"),
      })
    );
  });

  it("notifies owner when owner not found in DB, does not throw", async () => {
    mockGetOwnerUser.mockResolvedValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => buildGraphApiResponse("lead_no_owner"),
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_no_owner"))
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockCreateOpsLead).not.toHaveBeenCalled();
    expect(mockNotifyOwner).toHaveBeenCalled();
  });

  it("handles name fallback to first_name + last_name", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "lead_name_fallback",
        field_data: [
          { name: "first_name", values: ["Jane"] },
          { name: "last_name", values: ["Smith"] },
          { name: "email", values: ["jane@example.com"] },
        ],
      }),
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_name_fallback"))
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockCreateOpsLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Jane Smith" })
    );
  });

  it("uses 'Facebook Lead' as name fallback when no name fields present", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "lead_no_name",
        field_data: [
          { name: "email", values: ["anon@example.com"] },
        ],
      }),
    } as Response);

    await request(app)
      .post("/api/webhooks/facebook")
      .send(buildLeadPayload("lead_no_name"))
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockCreateOpsLead).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Facebook Lead" })
    );
  });

  it("ignores non-leadgen change fields", async () => {
    const payload = {
      object: "page",
      entry: [
        {
          id: "830611640137363",
          time: 1700000000,
          changes: [
            { field: "feed", value: { post_id: "123" } },
          ],
        },
      ],
    };

    await request(app)
      .post("/api/webhooks/facebook")
      .send(payload)
      .set("Content-Type", "application/json");

    await new Promise(r => setTimeout(r, 100));

    expect(mockCreateOpsLead).not.toHaveBeenCalled();
  });
});
