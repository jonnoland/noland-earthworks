/**
 * nativeJobsRouter unit tests
 *
 * These tests validate the router procedures in isolation using a mocked
 * database (vi.mock). No real database connection is required.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Mock the database module ─────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import { appRouter } from "./routers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createOwnerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "owner-open-id",
    email: "jon@nolandearthworks.com",
    name: "Jon Noland",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const SAMPLE_JOB = {
  id: 1,
  quoteId: 10,
  clientName: "John Doe",
  clientEmail: "john@example.com",
  clientPhone: "615-555-0100",
  propertyAddress: "123 Pasture Rd, Dickson, TN 37055",
  serviceType: "Forestry Mulching",
  acreage: "5",
  totalCents: 250000,
  lineItems: JSON.stringify([
    { description: "Forestry mulching — 5 acres", qty: 1, unitPriceCents: 250000, totalCents: 250000 },
  ]),
  status: "scheduled" as const,
  scheduledDate: new Date("2025-03-15"),
  completedAt: null,
  internalNotes: "Gate code: 1234",
  invoicedCents: null,
  invoicedAt: null,
  paidCents: null,
  paidAt: null,
  createdAt: new Date("2025-03-01"),
  updatedAt: new Date("2025-03-01"),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("nativeJobs.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty array when no jobs exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nativeJobs.list({});
    expect(result).toEqual([]);
  });

  it("returns jobs from the database", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([SAMPLE_JOB]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nativeJobs.list({});
    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe("John Doe");
  });

  it("throws DB_UNAVAILABLE when db is null", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.nativeJobs.list({})).rejects.toThrow("DB unavailable");
  });
});

describe("nativeJobs.getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the job when found", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([SAMPLE_JOB]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nativeJobs.getById({ id: 1 });
    expect(result.id).toBe(1);
    expect(result.clientName).toBe("John Doe");
  });

  it("throws NOT_FOUND when job does not exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.nativeJobs.getById({ id: 999 })).rejects.toThrow("Job not found");
  });
});

describe("nativeJobs.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the job and returns the updated record", async () => {
    const updatedJob = { ...SAMPLE_JOB, status: "in_progress" as const };

    // Build two separate mock chains: one for update, one for select
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([updatedJob]),
    };

    const mockDb = {
      update: vi.fn().mockReturnValue(updateChain),
      select: vi.fn().mockReturnValue(selectChain),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nativeJobs.update({ id: 1, status: "in_progress" });
    expect(result.status).toBe("in_progress");
  });
});

describe("nativeJobs.delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the job and returns success", async () => {
    const mockDb = {
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nativeJobs.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("nativeJobs.listInvoices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty array when no invoices exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const ctx = createOwnerContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.nativeJobs.listInvoices({});
    expect(result).toEqual([]);
  });
});

describe("nativeJobs access control", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws FORBIDDEN for non-owner users", async () => {
    const ctx: TrpcContext = {
      user: {
        id: 2,
        openId: "random-user",
        email: "other@example.com",
        name: "Other User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    await expect(caller.nativeJobs.list({})).rejects.toThrow("Owner access only.");
  });
});
