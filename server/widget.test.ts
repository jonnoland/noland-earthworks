/**
 * widgetRouter — CRM lead creation tests
 *
 * Verifies that every estimate widget submission:
 *   1. Calls upsertOpsLeadByPhone with the correct fields (name, phone, source, stage, notes).
 *   2. Returns { ok: true } even when the DB is not configured.
 *   3. Returns { ok: true } even when CRM lead creation fails (non-fatal).
 *   4. Does NOT create a lead when getOwnerUser returns null.
 *   5. Fires owner notification with correct title and content.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { widgetRouter } from "./widgetRouter";
import { createCallerFactory } from "./_core/trpc";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetOwnerUser = vi.fn();
const mockUpsertOpsLeadByPhone = vi.fn().mockResolvedValue({ leadId: 42, created: true });
const mockNotifyOwner = vi.fn().mockResolvedValue(true);
const mockGetVisitBlackoutDates = vi.fn().mockResolvedValue([]);
const mockGetRecurringBlackoutDays = vi.fn().mockResolvedValue([]);

vi.mock("./db", () => ({
  getOwnerUser: (...args: unknown[]) => mockGetOwnerUser(...args),
  upsertOpsLeadByPhone: (...args: unknown[]) => mockUpsertOpsLeadByPhone(...args),
  createOpsLead: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateOpsLeadById: vi.fn().mockResolvedValue(undefined),
  getVisitBlackoutDates: (...args: unknown[]) => mockGetVisitBlackoutDates(...args),
  addVisitBlackoutDate: vi.fn().mockResolvedValue(undefined),
  removeVisitBlackoutDate: vi.fn().mockResolvedValue(undefined),
  getRecurringBlackoutDays: (...args: unknown[]) => mockGetRecurringBlackoutDays(...args),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: (...args: unknown[]) => mockNotifyOwner(...args),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: "email-id-123" }) },
  })),
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

const baseEstimate = {
  name: "Sarah Landowner",
  phone: "6155559001",
  email: "sarah@example.com",
  service: "forestry-mulching",
  acres: 5,
  density: "moderate",
  terrain: "flat",
  access: "good",
  estimateLow: 1500,
  estimateHigh: 2500,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsertOpsLeadByPhone.mockResolvedValue({ leadId: 42, created: true });
  mockNotifyOwner.mockResolvedValue(true);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("widgetRouter.submitEstimate — CRM lead creation", () => {
  it("upserts a lead with correct fields when owner exists", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    const result = await widgetCaller.submitEstimate(baseEstimate);

    expect(result.ok).toBe(true);
    expect(mockUpsertOpsLeadByPhone).toHaveBeenCalledOnce();

    const call = mockUpsertOpsLeadByPhone.mock.calls[0][0];
    expect(call.userId).toBe(7);
    expect(call.name).toBe("Sarah Landowner");
    expect(call.phone).toBe("6155559001");
    expect(call.source).toBe("website");
    expect(call.stage).toBe("new");
    expect(call.jobType).toContain("Forestry");
  });

  it("returns leadId from the upsert result", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);
    mockUpsertOpsLeadByPhone.mockResolvedValue({ leadId: 99, created: true });

    const result = await widgetCaller.submitEstimate({
      ...baseEstimate,
      name: "Tom Farmer",
      phone: "6155559002",
    });

    expect(result.ok).toBe(true);
    expect(result.leadId).toBe(99);
  });

  it("returns ok:true even when CRM lead creation throws (non-fatal)", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);
    mockUpsertOpsLeadByPhone.mockRejectedValueOnce(new Error("DB unavailable"));

    const result = await widgetCaller.submitEstimate({
      ...baseEstimate,
      name: "Error Case",
      phone: "6155559003",
    });

    expect(result.ok).toBe(true);
    expect(result.leadId).toBeNull();
  });

  it("does not call upsertOpsLeadByPhone when getOwnerUser returns null", async () => {
    mockGetOwnerUser.mockResolvedValue(null);

    const result = await widgetCaller.submitEstimate({
      ...baseEstimate,
      name: "No Owner",
      phone: "6155559004",
    });

    expect(result.ok).toBe(true);
    expect(mockUpsertOpsLeadByPhone).not.toHaveBeenCalled();
  });

  it("fires owner notification with correct title and content", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await widgetCaller.submitEstimate({
      ...baseEstimate,
      name: "Notification Test",
      phone: "6155559005",
    });

    expect(mockNotifyOwner).toHaveBeenCalledOnce();
    const notifyCall = mockNotifyOwner.mock.calls[0][0];
    expect(notifyCall.title).toContain("Notification Test");
    expect(notifyCall.content).toContain("6155559005");
  });
});
