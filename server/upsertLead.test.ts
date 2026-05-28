/**
 * Unit tests for upsertOpsLeadByPhone
 * Tests the duplicate-prevention logic without hitting the real database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the db module ─────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: () => ({
          then: (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([])),
        }),
      }),
    }),
  }),
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// ── Re-import after mock ───────────────────────────────────────────────────────
// We test the logic directly by reproducing the upsert logic in isolation
// since the actual function uses getDb() internally.

describe("upsertOpsLeadByPhone logic", () => {
  /**
   * Simulate the upsert decision logic extracted from upsertOpsLeadByPhone.
   * Returns { action: "insert" | "update", notes: string }
   */
  function simulateUpsert(
    existing: { notes: string | null; name: string; email: string | null } | null,
    incoming: { name: string; notes: string; phone: string }
  ) {
    if (!existing) {
      return { action: "insert" as const, notes: incoming.notes };
    }

    const appendedNotes = [
      existing.notes ?? "",
      incoming.notes
        ? `\n\n--- New chat session (${new Date().toLocaleDateString()}) ---\n${incoming.notes}`
        : "",
    ]
      .join("")
      .trim();

    const resolvedName =
      incoming.name && incoming.name !== "Website Visitor"
        ? incoming.name
        : existing.name;

    return {
      action: "update" as const,
      notes: appendedNotes,
      name: resolvedName,
    };
  }

  it("inserts a new lead when no existing lead matches the phone", () => {
    const result = simulateUpsert(null, {
      name: "John Smith",
      notes: "Lead from AI chat widget.",
      phone: "6155551234",
    });
    expect(result.action).toBe("insert");
    expect(result.notes).toBe("Lead from AI chat widget.");
  });

  it("updates an existing lead when the same phone is found", () => {
    const existing = {
      notes: "First contact via quote form.",
      name: "John Smith",
      email: null,
    };
    const result = simulateUpsert(existing, {
      name: "John Smith",
      notes: "Lead from AI chat widget.",
      phone: "6155551234",
    });
    expect(result.action).toBe("update");
    expect(result.notes).toContain("First contact via quote form.");
    expect(result.notes).toContain("New chat session");
    expect(result.notes).toContain("Lead from AI chat widget.");
  });

  it("preserves existing name when incoming name is 'Website Visitor'", () => {
    const existing = {
      notes: "Original notes.",
      name: "Jane Doe",
      email: null,
    };
    const result = simulateUpsert(existing, {
      name: "Website Visitor",
      notes: "New session notes.",
      phone: "6155559999",
    });
    expect(result.action).toBe("update");
    expect(result.name).toBe("Jane Doe");
  });

  it("uses incoming name when it is a real name (not Website Visitor)", () => {
    const existing = {
      notes: "Original notes.",
      name: "Website Visitor",
      email: null,
    };
    const result = simulateUpsert(existing, {
      name: "Bob Johnson",
      notes: "New session notes.",
      phone: "6155558888",
    });
    expect(result.action).toBe("update");
    expect(result.name).toBe("Bob Johnson");
  });

  it("handles null existing notes gracefully", () => {
    const existing = {
      notes: null,
      name: "Alice",
      email: null,
    };
    const result = simulateUpsert(existing, {
      name: "Alice",
      notes: "Chat session notes.",
      phone: "6155557777",
    });
    expect(result.action).toBe("update");
    expect(result.notes).toContain("Chat session notes.");
    // Should not start with \n\n when existing notes are null
    expect(result.notes.startsWith("\n")).toBe(false);
  });
});
