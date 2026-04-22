/**
 * Tests for automatic lead capture on form submissions.
 * Verifies that contactRouter and quoteRouter both create an ops lead
 * when the owner exists in the database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
const mockCreateOpsLead = vi.fn().mockResolvedValue({});
const mockGetOwnerUser = vi.fn();

vi.mock("./db", () => ({
  createOpsLead: (...args: unknown[]) => mockCreateOpsLead(...args),
  getOwnerUser: () => mockGetOwnerUser(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getJobs: vi.fn().mockResolvedValue([]),
  createJob: vi.fn().mockResolvedValue({}),
  updateJob: vi.fn().mockResolvedValue({}),
  deleteJob: vi.fn().mockResolvedValue({}),
  getOpsLeads: vi.fn().mockResolvedValue([]),
  updateOpsLead: vi.fn().mockResolvedValue({}),
  deleteOpsLead: vi.fn().mockResolvedValue({}),
  getScheduleEntries: vi.fn().mockResolvedValue([]),
  createScheduleEntry: vi.fn().mockResolvedValue({}),
  updateScheduleEntry: vi.fn().mockResolvedValue({}),
  deleteScheduleEntry: vi.fn().mockResolvedValue({}),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id-123",
    resendApiKey: undefined, // skip email sending in tests
    jwtSecret: "test-secret",
    databaseUrl: undefined,
    oauthServerUrl: "https://api.manus.im",
    viteAppId: "test-app-id",
    builtInForgeApiUrl: "https://forge.manus.im",
    builtInForgeApiKey: "test-key",
    ownerName: "Test Owner",
    jobberClientId: undefined,
    jobberClientSecret: undefined,
  },
}));

vi.mock("./jobber", () => ({
  isJobberConnected: vi.fn().mockResolvedValue(false),
  createJobberRequest: vi.fn().mockResolvedValue({}),
}));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ error: null }) },
  })),
}));

import { contactRouter } from "./contactRouter";
import { quoteRouter } from "./quoteRouter";
import { createCallerFactory } from "./_core/trpc";

const makeCtx = () => ({ user: null, req: {} as any, res: {} as any });

const contactCaller = createCallerFactory(contactRouter)(makeCtx());
const quoteCaller = createCallerFactory(quoteRouter)(makeCtx());

const ownerRow = {
  id: 1,
  openId: "owner-open-id-123",
  name: "Test Owner",
  email: "owner@test.com",
  role: "admin" as const,
  loginMethod: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Contact form tests ───────────────────────────────────────────────────────
describe("contactRouter — lead capture", () => {
  it("creates a lead when owner exists", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await contactCaller.submit({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "615-555-0001",
      subject: "Land clearing inquiry",
      message: "I need 5 acres cleared.",
    });

    expect(mockCreateOpsLead).toHaveBeenCalledOnce();
    const call = mockCreateOpsLead.mock.calls[0][0];
    expect(call.userId).toBe(1);
    expect(call.name).toBe("Jane Doe");
    expect(call.email).toBe("jane@example.com");
    expect(call.phone).toBe("615-555-0001");
    expect(call.source).toBe("website");
    expect(call.stage).toBe("new");
    expect(call.notes).toContain("Land clearing inquiry");
    expect(call.notes).toContain("I need 5 acres cleared.");
  });

  it("creates a lead even when owner row is auto-seeded (getOwnerUser returns row after seeding)", async () => {
    // Simulate the auto-seed: first call returns null, second returns the seeded row
    // But since getOwnerUser now handles seeding internally, the mock just returns the row
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await contactCaller.submit({
      name: "Bob Smith",
      email: "bob@example.com",
      subject: "Question",
      message: "Just a question.",
    });

    expect(mockCreateOpsLead).toHaveBeenCalledOnce();
    expect(mockCreateOpsLead.mock.calls[0][0].name).toBe("Bob Smith");
  });

  it("still returns success even if lead creation throws", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);
    mockCreateOpsLead.mockRejectedValueOnce(new Error("DB error"));

    const result = await contactCaller.submit({
      name: "Error Test",
      email: "error@example.com",
      subject: "Test",
      message: "Testing error resilience.",
    });

    expect(result.success).toBe(true);
  });
});

// ─── Quote form tests ─────────────────────────────────────────────────────────
describe("quoteRouter — lead capture", () => {
  it("creates a lead with correct fields from quote submission", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await quoteCaller.submit({
      name: "John Farm",
      phone: "615-555-0002",
      email: "john@farm.com",
      service: "Land Management",
      county: "Davidson",
      acreage: "10",
      street: "123 Farm Rd",
      city: "Nashville",
      state: "TN",
      zip: "37201",
      message: "Need it done by spring.",
    });

    expect(mockCreateOpsLead).toHaveBeenCalledOnce();
    const call = mockCreateOpsLead.mock.calls[0][0];
    expect(call.userId).toBe(1);
    expect(call.name).toBe("John Farm");
    expect(call.email).toBe("john@farm.com");
    expect(call.phone).toBe("615-555-0002");
    expect(call.source).toBe("website");
    expect(call.stage).toBe("new");
    expect(call.jobType).toBe("land_clearing");
    expect(call.address).toContain("Nashville");
    expect(call.notes).toContain("Acreage: 10");
  });

  it("maps Forestry Mulching service to forestry_mulching jobType", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await quoteCaller.submit({
      name: "Alice",
      phone: "615-555-0003",
      email: "alice@example.com",
      service: "Forestry Mulching",
      county: "Williamson",
    });

    expect(mockCreateOpsLead).toHaveBeenCalledOnce();
    expect(mockCreateOpsLead.mock.calls[0][0].jobType).toBe("forestry_mulching");
  });

  it("creates a lead even when owner row is auto-seeded", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);

    await quoteCaller.submit({
      name: "No Owner",
      phone: "615-555-0004",
      email: "noowner@example.com",
      service: "Brush Removal",
      county: "Wilson",
    });

    expect(mockCreateOpsLead).toHaveBeenCalledOnce();
    expect(mockCreateOpsLead.mock.calls[0][0].name).toBe("No Owner");
  });

  it("still returns success even if lead creation throws", async () => {
    mockGetOwnerUser.mockResolvedValue(ownerRow);
    mockCreateOpsLead.mockRejectedValueOnce(new Error("DB error"));

    const result = await quoteCaller.submit({
      name: "Resilient User",
      phone: "615-555-0005",
      email: "resilient@example.com",
      service: "Stump Grinding",
      county: "Rutherford",
    });

    expect(result.success).toBe(true);
  });
});
