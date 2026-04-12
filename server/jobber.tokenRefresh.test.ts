/**
 * Tests for Jobber background token refresh scheduler.
 *
 * Strategy: mock the database and the Jobber token endpoint so no real
 * network or DB calls are made. Verify that:
 *   1. proactiveTokenRefreshIfNeeded() does NOT call the token endpoint
 *      when the token is healthy (> 10 min until expiry).
 *   2. proactiveTokenRefreshIfNeeded() DOES call the token endpoint when
 *      the token is within the 10-minute refresh window.
 *   3. proactiveTokenRefreshIfNeeded() handles an already-expired token
 *      gracefully (still attempts refresh, does not throw).
 *   4. startJobberTokenRefreshScheduler() is idempotent — calling it twice
 *      does not create two intervals.
 *   5. stopJobberTokenRefreshScheduler() cleans up the interval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Shared mutable state for the DB mock ────────────────────────────────────

let mockTokenRow: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  updatedAt: Date;
} | null = null;

// ─── Mock the database module ─────────────────────────────────────────────────

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => (mockTokenRow ? [mockTokenRow] : []),
        }),
      }),
    }),
    delete: () => ({ execute: async () => {} }),
    insert: () => ({
      values: async () => {
        // Simulate saving new tokens — update the mock row in place
        return {};
      },
    }),
  })),
}));

// ─── Mock the Jobber token endpoint via global fetch ─────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Mock drizzle schema (jobberTokens table reference) ──────────────────────

vi.mock("../drizzle/schema", () => ({
  jobberTokens: { updatedAt: "updatedAt" },
}));

// ─── Mock drizzle desc() ─────────────────────────────────────────────────────

vi.mock("drizzle-orm", () => ({
  desc: (col: unknown) => col,
}));

// ─── Mock ENV ─────────────────────────────────────────────────────────────────

vi.mock("./_core/env", () => ({
  ENV: {
    jobberClientId: "test-client-id",
    jobberClientSecret: "test-client-secret",
  },
}));

// ─── Import the functions under test (after mocks are set up) ─────────────────

import {
  proactiveTokenRefreshIfNeeded,
  startJobberTokenRefreshScheduler,
  stopJobberTokenRefreshScheduler,
} from "./jobber";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTokenRow(msUntilExpiry: number) {
  return {
    accessToken: "access-token-abc",
    refreshToken: "refresh-token-xyz",
    expiresAt: new Date(Date.now() + msUntilExpiry),
    updatedAt: new Date(),
  };
}

function mockSuccessfulRefresh() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
    }),
    text: async () => "",
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("proactiveTokenRefreshIfNeeded", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    stopJobberTokenRefreshScheduler();
  });

  afterEach(() => {
    stopJobberTokenRefreshScheduler();
  });

  it("does NOT refresh when token is healthy (> 10 min until expiry)", async () => {
    mockTokenRow = makeTokenRow(20 * 60 * 1000); // 20 minutes from now
    await proactiveTokenRefreshIfNeeded();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("DOES refresh when token is within 10-minute window", async () => {
    mockTokenRow = makeTokenRow(8 * 60 * 1000); // 8 minutes from now
    mockSuccessfulRefresh();
    await proactiveTokenRefreshIfNeeded();
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.getjobber.com/api/oauth/token");
    const body = new URLSearchParams(opts.body as string);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("refresh-token-xyz");
  });

  it("DOES refresh when token is already expired", async () => {
    mockTokenRow = makeTokenRow(-5 * 60 * 1000); // expired 5 minutes ago
    mockSuccessfulRefresh();
    await proactiveTokenRefreshIfNeeded();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("does NOT throw when no token row exists (Jobber not connected)", async () => {
    mockTokenRow = null;
    await expect(proactiveTokenRefreshIfNeeded()).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does NOT throw when the refresh request fails (logs error, stays silent)", async () => {
    mockTokenRow = makeTokenRow(3 * 60 * 1000); // 3 minutes — within window
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    // Should resolve (not reject) even on a failed refresh
    await expect(proactiveTokenRefreshIfNeeded()).resolves.toBeUndefined();
  });
});

describe("startJobberTokenRefreshScheduler / stopJobberTokenRefreshScheduler", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    stopJobberTokenRefreshScheduler(); // ensure clean state
    mockTokenRow = makeTokenRow(30 * 60 * 1000); // healthy token — no refresh on startup
  });

  afterEach(() => {
    stopJobberTokenRefreshScheduler();
  });

  it("starts the scheduler without throwing", () => {
    expect(() => startJobberTokenRefreshScheduler()).not.toThrow();
  });

  it("is idempotent — calling start twice does not create two intervals", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    startJobberTokenRefreshScheduler();
    startJobberTokenRefreshScheduler(); // second call should be a no-op
    // setInterval should have been called exactly once across both start calls
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
  });

  it("stop cleans up without throwing", () => {
    startJobberTokenRefreshScheduler();
    expect(() => stopJobberTokenRefreshScheduler()).not.toThrow();
  });

  it("stop is idempotent — calling stop twice does not throw", () => {
    startJobberTokenRefreshScheduler();
    stopJobberTokenRefreshScheduler();
    expect(() => stopJobberTokenRefreshScheduler()).not.toThrow();
  });
});
