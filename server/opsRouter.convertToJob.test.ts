/**
 * Tests for opsRouter.leads.convertToJob
 *
 * Verifies:
 *   1. Owner can convert a lead to a job — inserts a job, marks lead converted, returns jobId
 *   2. Non-owner is blocked (FORBIDDEN)
 *   3. Throws when the lead is not found (wrong userId or bad id)
 *   4. Throws when the database is unavailable
 *   5. Job type is correctly mapped from lead jobType string
 *   6. Caller-supplied overrides (title, client, address, jobType, notes) take precedence over lead data
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Shared mutable DB state ──────────────────────────────────────────────────

type MockLead = {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  source: string;
  stage: string;
  jobType: string | null;
  estimatedValue: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

let mockLeadStore: MockLead[] = [];
let mockJobInsertId = 100;
let mockUpdatedLeadStage: string | null = null;
let mockDbAvailable = true;

// ─── Mock the database module ─────────────────────────────────────────────────

vi.mock("./db", () => ({
  getJobs: vi.fn().mockResolvedValue([]),
  createJob: vi.fn().mockResolvedValue({}),
  updateJob: vi.fn().mockResolvedValue({}),
  deleteJob: vi.fn().mockResolvedValue({}),
  getOpsLeads: vi.fn().mockResolvedValue([]),
  createOpsLead: vi.fn().mockResolvedValue({}),
  updateOpsLead: vi.fn().mockResolvedValue({}),
  deleteOpsLead: vi.fn().mockResolvedValue({}),
  getScheduleEntries: vi.fn().mockResolvedValue([]),
  createScheduleEntry: vi.fn().mockResolvedValue({}),
  updateScheduleEntry: vi.fn().mockResolvedValue({}),
  deleteScheduleEntry: vi.fn().mockResolvedValue({}),
  getDb: vi.fn(async () => {
    if (!mockDbAvailable) return null;
    return {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => mockLeadStore,
          }),
        }),
      }),
      insert: () => ({
        values: async (data: Record<string, unknown>) => {
          // Capture what was inserted for assertions
          (global as any).__lastInsertedJob = data;
          return { insertId: mockJobInsertId };
        },
      }),
      update: () => ({
        set: (data: Record<string, unknown>) => ({
          where: async () => {
            mockUpdatedLeadStage = data.stage as string;
          },
        }),
      }),
    };
  }),
}));

// ─── Mock ENV ─────────────────────────────────────────────────────────────────

vi.mock("./_core/env", () => ({
  ENV: {
    ownerOpenId: "owner-open-id-123",
    jwtSecret: "test-secret",
    databaseUrl: undefined,
    oauthServerUrl: "https://api.manus.im",
    viteAppId: "test-app-id",
    builtInForgeApiUrl: "https://forge.manus.im",
    builtInForgeApiKey: "test-key",
    resendApiKey: undefined,
    ownerName: "Test Owner",
    jobberClientId: undefined,
    jobberClientSecret: undefined,
  },
}));

// ─── Mock drizzle-orm operators used inside the procedure ─────────────────────

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (col: unknown, val: unknown) => ({ col, val }),
  like: (col: unknown, val: unknown) => ({ col, val }),
  desc: (col: unknown) => col,
}));

// ─── Mock schema tables ───────────────────────────────────────────────────────

vi.mock("../drizzle/schema", () => ({
  jobs: { userId: "userId", id: "id" },
  opsLeads: { id: "id", userId: "userId", stage: "stage" },
  quoteSubmissions: { createdAt: "createdAt" },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { opsRouter } from "./opsRouter";
import { createCallerFactory } from "./_core/trpc";

const createCaller = createCallerFactory(opsRouter);

// ─── Test users ───────────────────────────────────────────────────────────────

const ownerUser = {
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

const nonOwnerUser = {
  id: 2,
  openId: "other-user-456",
  name: "Random User",
  email: "user@test.com",
  role: "user" as const,
  loginMethod: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function makeCtx(user: typeof ownerUser | typeof nonOwnerUser) {
  return { user, req: {} as any, res: {} as any };
}

function makeLead(overrides: Partial<MockLead> = {}): MockLead {
  return {
    id: 1,
    userId: ownerUser.id,
    name: "Smith Ranch",
    email: "smith@ranch.com",
    phone: "615-555-0100",
    address: "123 Farm Rd, Columbia, TN",
    source: "google",
    stage: "contacted",
    jobType: "Forestry Mulching",
    estimatedValue: "3500.00",
    notes: "10 acres, heavy cedar",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("opsRouter.leads.convertToJob", () => {
  beforeEach(() => {
    mockLeadStore = [];
    mockJobInsertId = 100;
    mockUpdatedLeadStage = null;
    mockDbAvailable = true;
    (global as any).__lastInsertedJob = null;
  });

  it("blocks a non-owner (FORBIDDEN)", async () => {
    mockLeadStore = [makeLead()];
    const caller = createCaller(makeCtx(nonOwnerUser));
    await expect(
      caller.leads.convertToJob({ leadId: 1 })
    ).rejects.toThrow(TRPCError);
  });

  it("converts a lead to a job and returns the new job id", async () => {
    mockLeadStore = [makeLead()];
    const caller = createCaller(makeCtx(ownerUser));
    const result = await caller.leads.convertToJob({ leadId: 1 });
    expect(result).toEqual({ jobId: 100 });
  });

  it("marks the lead stage as 'converted' after job creation", async () => {
    mockLeadStore = [makeLead()];
    const caller = createCaller(makeCtx(ownerUser));
    await caller.leads.convertToJob({ leadId: 1 });
    expect(mockUpdatedLeadStage).toBe("converted");
  });

  it("derives job title and client from lead data when no overrides given", async () => {
    mockLeadStore = [makeLead({ name: "Jones Farm", jobType: "Land Clearing" })];
    const caller = createCaller(makeCtx(ownerUser));
    await caller.leads.convertToJob({ leadId: 1 });
    const inserted = (global as any).__lastInsertedJob;
    expect(inserted.client).toBe("Jones Farm");
    expect(inserted.title).toContain("Jones Farm");
    expect(inserted.title).toContain("Land Clearing");
  });

  it("caller-supplied overrides take precedence over lead data", async () => {
    mockLeadStore = [makeLead({ name: "Smith Ranch", address: "Old Address" })];
    const caller = createCaller(makeCtx(ownerUser));
    await caller.leads.convertToJob({
      leadId: 1,
      title: "Custom Job Title",
      client: "Custom Client",
      address: "456 New Rd",
      jobType: "brush_removal",
      notes: "Override notes",
    });
    const inserted = (global as any).__lastInsertedJob;
    expect(inserted.title).toBe("Custom Job Title");
    expect(inserted.client).toBe("Custom Client");
    expect(inserted.address).toBe("456 New Rd");
    expect(inserted.jobType).toBe("brush_removal");
    expect(inserted.notes).toBe("Override notes");
  });

  it("maps Forestry Mulching string to forestry_mulching enum", async () => {
    mockLeadStore = [makeLead({ jobType: "Forestry Mulching" })];
    const caller = createCaller(makeCtx(ownerUser));
    await caller.leads.convertToJob({ leadId: 1 });
    const inserted = (global as any).__lastInsertedJob;
    expect(inserted.jobType).toBe("forestry_mulching");
  });

  it("falls back to land_clearing when lead jobType is unrecognized", async () => {
    mockLeadStore = [makeLead({ jobType: "Unknown Service" })];
    const caller = createCaller(makeCtx(ownerUser));
    await caller.leads.convertToJob({ leadId: 1 });
    const inserted = (global as any).__lastInsertedJob;
    expect(inserted.jobType).toBe("land_clearing");
  });

  it("throws when the lead is not found", async () => {
    mockLeadStore = []; // empty — lead doesn't exist
    const caller = createCaller(makeCtx(ownerUser));
    await expect(
      caller.leads.convertToJob({ leadId: 999 })
    ).rejects.toThrow("Lead not found");
  });

  it("throws when the database is unavailable", async () => {
    mockDbAvailable = false;
    const caller = createCaller(makeCtx(ownerUser));
    await expect(
      caller.leads.convertToJob({ leadId: 1 })
    ).rejects.toThrow("Database not available");
  });

  it("sets job status to 'estimate' regardless of lead stage", async () => {
    mockLeadStore = [makeLead({ stage: "negotiating" })];
    const caller = createCaller(makeCtx(ownerUser));
    await caller.leads.convertToJob({ leadId: 1 });
    const inserted = (global as any).__lastInsertedJob;
    expect(inserted.status).toBe("estimate");
  });
});
