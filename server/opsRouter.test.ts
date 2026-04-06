/**
 * Tests for opsRouter — verifies owner-only access control
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the DB helpers so we don't need a real database
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
}));

// Mock ENV so ownerOpenId is predictable
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
  return {
    user,
    req: {} as any,
    res: {} as any,
  };
}

describe("opsRouter — owner-only guard", () => {
  it("allows the owner to list jobs", async () => {
    const caller = createCaller(makeCtx(ownerUser));
    const result = await caller.jobs.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks a non-owner from listing jobs", async () => {
    const caller = createCaller(makeCtx(nonOwnerUser));
    await expect(caller.jobs.list()).rejects.toThrow(TRPCError);
  });

  it("allows the owner to list leads", async () => {
    const caller = createCaller(makeCtx(ownerUser));
    const result = await caller.leads.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks a non-owner from listing leads", async () => {
    const caller = createCaller(makeCtx(nonOwnerUser));
    await expect(caller.leads.list()).rejects.toThrow(TRPCError);
  });

  it("allows the owner to list schedule entries", async () => {
    const caller = createCaller(makeCtx(ownerUser));
    const result = await caller.schedule.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks a non-owner from listing schedule entries", async () => {
    const caller = createCaller(makeCtx(nonOwnerUser));
    await expect(caller.schedule.list()).rejects.toThrow(TRPCError);
  });
});
