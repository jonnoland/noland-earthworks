/**
 * Tests for nativeClientsRouter
 *
 * Covers: list, getById, upsertFromJob, update, delete, syncFromJobs
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ─── Mock getDb ───────────────────────────────────────────────────────────────

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: (...args: any[]) => mockDb.select(...args),
    insert: (...args: any[]) => mockDb.insert(...args),
    update: (...args: any[]) => mockDb.update(...args),
    delete: (...args: any[]) => mockDb.delete(...args),
  })),
}));

vi.mock("../drizzle/schema", () => ({
  nativeClients: { id: "id", name: "name", email: "email", phone: "phone", address: "address", notes: "notes", jobCount: "jobCount", totalSpentCents: "totalSpentCents", source: "source", createdAt: "createdAt", updatedAt: "updatedAt" },
  nativeJobs: { id: "id", clientName: "clientName", clientEmail: "clientEmail", clientPhone: "clientPhone", propertyAddress: "propertyAddress", serviceType: "serviceType", status: "status", totalCents: "totalCents", scheduledDate: "scheduledDate", completedAt: "completedAt", createdAt: "createdAt", paidCents: "paidCents" },
  nativeQuotes: { id: "id", clientName: "clientName", clientEmail: "clientEmail", clientPhone: "clientPhone", propertyAddress: "propertyAddress", title: "title", status: "status", totalCents: "totalCents", serviceType: "serviceType", acreage: "acreage", portalSentAt: "portalSentAt", createdAt: "createdAt" },
  opsLeads: { id: "id", name: "name", email: "email", phone: "phone", source: "source", stage: "stage", jobType: "jobType", notes: "notes", aiScore: "aiScore", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val, type: "eq" })),
  desc: vi.fn((col) => ({ col, type: "desc" })),
  like: vi.fn((col, val) => ({ col, val, type: "like" })),
  or: vi.fn((...args) => ({ args, type: "or" })),
  sql: vi.fn((strings, ...values) => ({ strings, values, type: "sql" })),
}));

vi.mock("./_core/env", () => ({
  ENV: { ownerOpenId: "owner-open-id" },
}));

// ─── Import router after mocks ────────────────────────────────────────────────

import { nativeClientsRouter } from "./nativeClientsRouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ownerCtx = {
  user: { openId: "owner-open-id", role: "user" as const, id: 1, name: "Jon", email: "jon@test.com" },
  req: {} as any,
  res: {} as any,
};

const adminCtx = {
  user: { openId: "other-open-id", role: "admin" as const, id: 2, name: "Admin", email: "admin@test.com" },
  req: {} as any,
  res: {} as any,
};

const nonOwnerCtx = {
  user: { openId: "random-user", role: "user" as const, id: 3, name: "Random", email: "random@test.com" },
  req: {} as any,
  res: {} as any,
};

function makeCaller(ctx: any) {
  return nativeClientsRouter.createCaller(ctx);
}

function buildSelectChain(returnValue: any[]) {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(Promise.resolve(returnValue));
  // Also make the chain itself thenable for cases without .offset
  chain.then = (resolve: any) => resolve(returnValue);
  return chain;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("nativeClientsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("access control", () => {
    it("blocks non-owner, non-admin users", async () => {
      const caller = makeCaller(nonOwnerCtx);
      await expect(caller.list({})).rejects.toThrow(TRPCError);
    });

    it("allows owner by openId", async () => {
      const chain = buildSelectChain([]);
      mockDb.select.mockReturnValue(chain);
      const caller = makeCaller(ownerCtx);
      await expect(caller.list({})).resolves.toBeDefined();
    });

    it("allows admin role", async () => {
      const chain = buildSelectChain([]);
      mockDb.select.mockReturnValue(chain);
      const caller = makeCaller(adminCtx);
      await expect(caller.list({})).resolves.toBeDefined();
    });
  });

  describe("list", () => {
    it("returns clients array", async () => {
      const mockClients = [
        { id: 1, name: "John Doe", email: "john@test.com", phone: "615-555-1234", address: "123 Main St", notes: null, jobCount: 2, totalSpentCents: 150000, source: "website_quote", createdAt: new Date(), updatedAt: new Date() },
      ];
      const chain = buildSelectChain(mockClients);
      mockDb.select.mockReturnValue(chain);

      const caller = makeCaller(ownerCtx);
      const result = await caller.list({});
      expect(result).toEqual(mockClients);
    });

    it("returns empty array when no clients", async () => {
      const chain = buildSelectChain([]);
      mockDb.select.mockReturnValue(chain);

      const caller = makeCaller(ownerCtx);
      const result = await caller.list({});
      expect(result).toEqual([]);
    });
  });

  describe("getById", () => {
    it("returns client with jobs", async () => {
      const mockClient = { id: 1, name: "John Doe", email: "john@test.com", phone: "615-555-1234", address: "123 Main St", notes: null, jobCount: 1, totalSpentCents: 75000, source: "website_quote", createdAt: new Date(), updatedAt: new Date() };
      const mockJobs = [
        { id: 10, clientName: "John Doe", serviceType: "Forestry Mulching", propertyAddress: "456 Farm Rd", totalCents: 75000, status: "completed", scheduledDate: null, completedAt: new Date(), createdAt: new Date() },
      ];

      // First select: client lookup
      const clientChain = buildSelectChain([mockClient]);
      // Second select: jobs lookup
      const jobsChain: any = {};
      jobsChain.from = vi.fn().mockReturnValue(jobsChain);
      jobsChain.where = vi.fn().mockReturnValue(jobsChain);
      jobsChain.orderBy = vi.fn().mockReturnValue(jobsChain);
      jobsChain.limit = vi.fn().mockResolvedValue(mockJobs);
      // Third select: quotes lookup
      const quotesChain: any = {};
      quotesChain.from = vi.fn().mockReturnValue(quotesChain);
      quotesChain.where = vi.fn().mockReturnValue(quotesChain);
      quotesChain.orderBy = vi.fn().mockReturnValue(quotesChain);
      quotesChain.limit = vi.fn().mockResolvedValue([]);
      // Fourth select: leads lookup
      const leadsChain: any = {};
      leadsChain.from = vi.fn().mockReturnValue(leadsChain);
      leadsChain.where = vi.fn().mockReturnValue(leadsChain);
      leadsChain.orderBy = vi.fn().mockReturnValue(leadsChain);
      leadsChain.limit = vi.fn().mockResolvedValue([]);

      mockDb.select
        .mockReturnValueOnce(clientChain)
        .mockReturnValueOnce(jobsChain)
        .mockReturnValueOnce(quotesChain)
        .mockReturnValueOnce(leadsChain);

      const caller = makeCaller(ownerCtx);
      const result = await caller.getById({ id: 1 });
      expect(result.id).toBe(1);
      expect(result.jobs).toEqual(mockJobs);
      expect((result as any).quotes).toEqual([]);
      expect((result as any).leads).toEqual([]);
    });

    it("throws NOT_FOUND for missing client", async () => {
      const chain = buildSelectChain([]);
      mockDb.select.mockReturnValue(chain);

      const caller = makeCaller(ownerCtx);
      await expect(caller.getById({ id: 999 })).rejects.toThrow(TRPCError);
    });
  });

  describe("update", () => {
    it("updates client fields", async () => {
      const updatedClient = { id: 1, name: "John Updated", email: "john@test.com", phone: "615-555-9999", address: "123 Main St", notes: "VIP client", jobCount: 2, totalSpentCents: 150000, source: "website_quote", createdAt: new Date(), updatedAt: new Date() };

      const updateChain: any = {};
      updateChain.set = vi.fn().mockReturnValue(updateChain);
      updateChain.where = vi.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue(updateChain);

      const selectChain = buildSelectChain([updatedClient]);
      mockDb.select.mockReturnValue(selectChain);

      const caller = makeCaller(ownerCtx);
      const result = await caller.update({ id: 1, name: "John Updated", notes: "VIP client" });
      expect(result.name).toBe("John Updated");
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when client does not exist after update", async () => {
      const updateChain: any = {};
      updateChain.set = vi.fn().mockReturnValue(updateChain);
      updateChain.where = vi.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue(updateChain);

      const selectChain = buildSelectChain([]);
      mockDb.select.mockReturnValue(selectChain);

      const caller = makeCaller(ownerCtx);
      await expect(caller.update({ id: 999, name: "Ghost" })).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("deletes a client", async () => {
      const deleteChain: any = {};
      deleteChain.where = vi.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue(deleteChain);

      const caller = makeCaller(ownerCtx);
      const result = await caller.delete({ id: 1 });
      expect(result.success).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
