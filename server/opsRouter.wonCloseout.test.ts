/**
 * Tests for opsRouter — Won close-out flow
 * When a job is updated to status "paid", any matching lead (by client name)
 * that is not already Won or Lost should be automatically set to "won".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MySql2Database } from "drizzle-orm/mysql2";

// ── DB mock ──────────────────────────────────────────────────────────────────
const mockUpdateJob = vi.fn().mockResolvedValue({});
const mockGetJobs = vi.fn();
const mockGetDb = vi.fn();

vi.mock("./db", () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
  getJobs: (...args: unknown[]) => mockGetJobs(...args),
  createJob: vi.fn().mockResolvedValue({}),
  updateJob: (...args: unknown[]) => mockUpdateJob(...args),
  deleteJob: vi.fn().mockResolvedValue({}),
  getOpsLeads: vi.fn().mockResolvedValue([]),
  createOpsLead: vi.fn().mockResolvedValue({}),
  updateOpsLead: vi.fn().mockResolvedValue({}),
  deleteOpsLead: vi.fn().mockResolvedValue({}),
  getScheduleEntries: vi.fn().mockResolvedValue([]),
  createScheduleEntry: vi.fn().mockResolvedValue({}),
  updateScheduleEntry: vi.fn().mockResolvedValue({}),
  deleteScheduleEntry: vi.fn().mockResolvedValue({}),
}));

// ── drizzle-orm mock ──────────────────────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ type: "and", args }),
  eq: (col: unknown, val: unknown) => ({ type: "eq", col, val }),
  like: (col: unknown, val: unknown) => ({ type: "like", col, val }),
  desc: (col: unknown) => ({ type: "desc", col }),
}));

// ── schema mock ───────────────────────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  opsLeads: { id: "id", userId: "userId", name: "name", stage: "stage", updatedAt: "updatedAt" },
  jobs: {},
  users: {},
  scheduleEntries: {},
}));

// ── ENV mock ──────────────────────────────────────────────────────────────────
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

import { opsRouter } from "./opsRouter";
import { createCallerFactory } from "./_core/trpc";

const createCaller = createCallerFactory(opsRouter);

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

function makeCtx(user: typeof ownerUser) {
  return { user, req: {} as any, res: {} as any };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeDbMock(leads: { id: number; name: string; userId: number; stage: string }[]) {
  const dbUpdateSet = vi.fn().mockReturnThis();
  const dbUpdateWhere = vi.fn().mockResolvedValue({});
  const dbUpdate = vi.fn().mockReturnValue({ set: dbUpdateSet });
  dbUpdateSet.mockReturnValue({ where: dbUpdateWhere });

  const dbSelectFrom = vi.fn().mockReturnThis();
  const dbSelectWhere = vi.fn().mockReturnThis();
  const dbSelectLimit = vi.fn().mockResolvedValue(leads);
  const dbSelect = vi.fn().mockReturnValue({
    from: dbSelectFrom,
    where: dbSelectWhere,
    limit: dbSelectLimit,
  });
  dbSelectFrom.mockReturnValue({ where: dbSelectWhere });
  dbSelectWhere.mockReturnValue({ limit: dbSelectLimit });

  return {
    db: { select: dbSelect, update: dbUpdate } as unknown as MySql2Database,
    dbUpdate,
    dbUpdateSet,
    dbUpdateWhere,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("opsRouter — Won close-out flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-sets a matching lead to 'won' when a job is marked paid", async () => {
    const matchingLead = { id: 10, name: "Johnson Farm", userId: 1, stage: "converted" };
    const { db, dbUpdate, dbUpdateSet, dbUpdateWhere } = makeDbMock([matchingLead]);

    mockGetJobs.mockResolvedValue([{ id: 42, client: "Johnson Farm", userId: 1 }]);
    mockGetDb.mockResolvedValue(db);

    const caller = createCaller(makeCtx(ownerUser));
    await caller.jobs.update({ id: 42, status: "paid" });

    expect(mockUpdateJob).toHaveBeenCalledWith(42, 1, { status: "paid" });
    expect(dbUpdate).toHaveBeenCalled();
    expect(dbUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ stage: "won" }));
    expect(dbUpdateWhere).toHaveBeenCalled();
  });

  it("does NOT update a lead that is already 'won'", async () => {
    const alreadyWon = { id: 11, name: "Smith Property", userId: 1, stage: "won" };
    const { db, dbUpdate } = makeDbMock([alreadyWon]);

    mockGetJobs.mockResolvedValue([{ id: 43, client: "Smith Property", userId: 1 }]);
    mockGetDb.mockResolvedValue(db);

    const caller = createCaller(makeCtx(ownerUser));
    await caller.jobs.update({ id: 43, status: "paid" });

    expect(mockUpdateJob).toHaveBeenCalledWith(43, 1, { status: "paid" });
    // db.update should NOT be called because lead is already won
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("does NOT update a lead that is already 'lost'", async () => {
    const alreadyLost = { id: 12, name: "Davis Land", userId: 1, stage: "lost" };
    const { db, dbUpdate } = makeDbMock([alreadyLost]);

    mockGetJobs.mockResolvedValue([{ id: 44, client: "Davis Land", userId: 1 }]);
    mockGetDb.mockResolvedValue(db);

    const caller = createCaller(makeCtx(ownerUser));
    await caller.jobs.update({ id: 44, status: "paid" });

    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("does NOT trigger lead update when status is not 'paid'", async () => {
    const { db, dbUpdate } = makeDbMock([]);

    mockGetJobs.mockResolvedValue([{ id: 45, client: "Brown Acres", userId: 1 }]);
    mockGetDb.mockResolvedValue(db);

    const caller = createCaller(makeCtx(ownerUser));
    await caller.jobs.update({ id: 45, status: "completed" });

    // getDb should not even be called for non-paid status
    expect(dbUpdate).not.toHaveBeenCalled();
  });

  it("still succeeds even if the lead lookup fails", async () => {
    mockGetJobs.mockResolvedValue([{ id: 46, client: "Error Farm", userId: 1 }]);
    mockGetDb.mockRejectedValue(new Error("DB connection failed"));

    const caller = createCaller(makeCtx(ownerUser));
    // Should not throw — job update is non-fatal even if lead sync fails
    await expect(caller.jobs.update({ id: 46, status: "paid" })).resolves.toBeDefined();
    expect(mockUpdateJob).toHaveBeenCalledWith(46, 1, { status: "paid" });
  });
});
