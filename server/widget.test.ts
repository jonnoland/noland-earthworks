/**
 * widgetRouter — CRM lead creation tests
 *
 * Verifies that every SMS widget submission:
 *   1. Calls createOpsLead with the correct fields (name, phone, source, stage, notes).
 *   2. Returns { ok: true } even when Twilio is not configured.
 *   3. Returns { ok: true } even when CRM lead creation fails (non-fatal).
 *   4. Does NOT create a lead when getOwnerUser returns null.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { widgetRouter } from "./widgetRouter";
import { createCallerFactory } from "./_core/trpc";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetOwnerUser = vi.fn();
const mockCreateOpsLead = vi.fn().mockResolvedValue({ insertId: 42 });
const mockNotifyOwner = vi.fn().mockResolvedValue(true);

vi.mock("./db", () => ({
  getOwnerUser: (...args: unknown[]) => mockGetOwnerUser(...args),
  createOpsLead: (...args: unknown[]) => mockCreateOpsLead(...args),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: (...args: unknown[]) => mockNotifyOwner(...args),
}));

// Twilio is not configured in test env — the import will be skipped
vi.mock("twilio", () => ({
  default: () => ({
    messages: { create: vi.fn().mockResolvedValue({ sid: "SM123" }) },
  }),
}));

// ─── Caller setup ─────────────────────────────────────────────────────────────

const makeCtx = () => ({ user: null, req: {} as any, res: {} as any });
const widgetCaller = createCallerFactory(widgetRouter)(makeCtx());

const ownerRow = {
  id: 7,
  openId: "owner-open-id-widget",
  name: "Jon Noland",
  email: "jon@nolandearthworks.com",
  role: "admin" as const,
  loginMethod: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateOpsLead.mockResolvedValue({ insertId: 42 });
  mockNotifyOwner.mockResolvedValue(true);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("widgetRouter.sendMessage — CRM lead creation", () => {
  it("creates a lead with correct fields when owner exists", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    const result = await widgetCaller.sendMessage({
      name: "Sarah Landowner",
      phone: "615-555-9001",
      message: "I have 8 acres that need clearing.",
    });

    expect(result.ok).toBe(true);
    expect(mockCreateOpsLead).toHaveBeenCalledOnce();

    const call = mockCreateOpsLead.mock.calls[0][0];
    expect(call.userId).toBe(7);
    expect(call.name).toBe("Sarah Landowner");
    expect(call.phone).toBe("615-555-9001");
    expect(call.source).toBe("website");
    expect(call.stage).toBe("new");
    expect(call.notes).toContain("I have 8 acres that need clearing.");
    expect(call.notes).toContain("website SMS widget");
  });

  it("returns leadId from the insert result", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);
    mockCreateOpsLead.mockResolvedValue({ insertId: 99 });

    const result = await widgetCaller.sendMessage({
      name: "Tom Farmer",
      phone: "615-555-9002",
      message: "Need pasture reclaimed.",
    });

    expect(result.ok).toBe(true);
    expect(result.leadId).toBe(99);
  });

  it("returns ok:true even when CRM lead creation throws (non-fatal)", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);
    mockCreateOpsLead.mockRejectedValueOnce(new Error("DB unavailable"));

    const result = await widgetCaller.sendMessage({
      name: "Error Case",
      phone: "615-555-9003",
      message: "Test resilience.",
    });

    expect(result.ok).toBe(true);
    expect(result.leadId).toBeNull();
  });

  it("does not call createOpsLead when getOwnerUser returns null", async () => {
    mockGetOwnerUser.mockResolvedValue(null);

    const result = await widgetCaller.sendMessage({
      name: "No Owner",
      phone: "615-555-9004",
      message: "No owner configured.",
    });

    expect(result.ok).toBe(true);
    expect(mockCreateOpsLead).not.toHaveBeenCalled();
  });

  it("fires owner notification with correct title", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await widgetCaller.sendMessage({
      name: "Notification Test",
      phone: "615-555-9005",
      message: "Check notification title.",
    });

    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const notifyCall = mockNotifyOwner.mock.calls[0][0];
    expect(notifyCall.title).toContain("Notification Test");
    expect(notifyCall.content).toContain("615-555-9005");
  });
});
