import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module so tests don't need a real DB connection
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock ENV to provide test credentials
vi.mock("./_core/env", () => ({
  ENV: {
    jobberClientId: "test-client-id",
    jobberClientSecret: "test-client-secret",
  },
}));

import { getDb } from "./db";
import { isJobberConnected } from "./jobber";

const mockGetDb = vi.mocked(getDb);

describe("isJobberConnected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when database is unavailable", async () => {
    mockGetDb.mockResolvedValue(null);
    const result = await isJobberConnected();
    expect(result).toBe(false);
  });

  it("returns false when no tokens exist in the database", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockGetDb.mockResolvedValue(mockDb as never);
    const result = await isJobberConnected();
    expect(result).toBe(false);
  });

  it("returns true when a token row exists in the database", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 1,
        accessToken: "test-access-token",
        refreshToken: "test-refresh-token",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }]),
    };
    mockGetDb.mockResolvedValue(mockDb as never);
    const result = await isJobberConnected();
    expect(result).toBe(true);
  });
});

describe("Jobber quote form data mapping", () => {
  it("correctly splits full name into first and last", () => {
    const name = "John Smith";
    const parts = name.trim().split(/\s+/);
    expect(parts[0]).toBe("John");
    expect(parts.slice(1).join(" ")).toBe("Smith");
  });

  it("handles single-word names gracefully", () => {
    const name = "Noland";
    const parts = name.trim().split(/\s+/);
    expect(parts[0]).toBe("Noland");
    expect(parts.slice(1).join(" ")).toBe("");
  });

  it("builds correct request title from service and county", () => {
    const service = "Land Clearing";
    const county = "Williamson";
    const title = `${service} — ${county} County`;
    expect(title).toBe("Land Clearing — Williamson County");
  });

  it("includes acreage and message in description when provided", () => {
    const parts = [
      "Service: Forestry Mulching",
      "County: Davidson County",
      "Acreage: 5 acres",
      "\nProject Details:\nRemove overgrown brush",
    ].filter(Boolean);
    const description = parts.join("\n");
    expect(description).toContain("Acreage: 5 acres");
    expect(description).toContain("Project Details:");
  });

  it("omits acreage and message from description when not provided", () => {
    const acreage = "";
    const message = "";
    const parts = [
      "Service: Land Clearing",
      "County: Maury County",
      acreage ? `Acreage: ${acreage}` : "",
      message ? `\nProject Details:\n${message}` : "",
    ].filter(Boolean);
    const description = parts.join("\n");
    expect(description).not.toContain("Acreage");
    expect(description).not.toContain("Project Details");
  });
});
