/**
 * Field Quote Router — unit tests
 * Tests the fieldQuoteRouter procedures in isolation using mocked DB helpers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fieldQuoteRouter } from "./fieldQuoteRouter";
import * as db from "./db";
import * as storage from "./storage";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    getDb: vi.fn(),
    createOpsLead: vi.fn().mockResolvedValue(undefined),
    getOwnerUser: vi.fn().mockResolvedValue({ id: 1, name: "Jon Noland" }),
  };
});

vi.mock("./storage", async (importOriginal) => {
  const actual = await importOriginal<typeof storage>();
  return {
    ...actual,
    storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.jpg", key: "test.jpg" }),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            score: "strong",
            summary: "Good lead — 5 acres of forestry mulching in Maury County.",
            flags: [],
            draftResponse: "Hi John, thanks for reaching out. I'll be in touch shortly.",
          }),
        },
      },
    ],
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/map", () => ({
  makeRequest: vi.fn().mockResolvedValue({
    status: "OK",
    results: [{ formatted_address: "123 Main St, Columbia, TN 38401" }],
  }),
}));

// ─── DB mock helpers ──────────────────────────────────────────────────────────

function mockDbInsert(returnId = 42) {
  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        $returningId: vi.fn().mockResolvedValue([{ id: returnId }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("fieldQuoteRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submit returns success and id on valid input", async () => {
    const mockDb = mockDbInsert(42);
    vi.mocked(db.getDb).mockResolvedValue(mockDb as any);

    const caller = fieldQuoteRouter.createCaller({} as any);
    const result = await caller.submit({
      name: "John Smith",
      email: "john@example.com",
      phone: "615-555-1234",
      address: "123 Farm Rd, Columbia, TN",
      lat: 35.615,
      lng: -87.035,
      serviceType: "Forestry Mulching",
      acreage: 5,
      terrainType: "Rolling",
      vegetationDensity: "Moderate",
      photoUrls: [],
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe(42);
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it("uploadPhoto returns a CDN url", async () => {
    const caller = fieldQuoteRouter.createCaller({} as any);
    const fakeBase64 = Buffer.from("fake image data").toString("base64");

    const result = await caller.uploadPhoto({
      base64: fakeBase64,
      mimeType: "image/jpeg",
    });

    expect(result.url).toBe("https://cdn.example.com/test.jpg");
    expect(storage.storagePut).toHaveBeenCalledOnce();
  });

  it("reverseGeocode returns address from coordinates", async () => {
    const caller = fieldQuoteRouter.createCaller({} as any);
    const result = await caller.reverseGeocode({ lat: 35.615, lng: -87.035 });

    expect(result.address).toBe("123 Main St, Columbia, TN 38401");
  });

  it("list returns empty array when DB is unavailable", async () => {
    vi.mocked(db.getDb).mockResolvedValue(null);

    const caller = fieldQuoteRouter.createCaller({ user: { id: 1, role: "admin" } } as any);
    const result = await caller.list({ limit: 50 });

    expect(result).toEqual([]);
  });
});
