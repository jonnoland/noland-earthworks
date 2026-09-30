import { describe, expect, it, vi } from "vitest";
import { resolveInvoiceQuoteId } from "./nativeInvoiceQuoteLink";

describe("resolveInvoiceQuoteId", () => {
  it("uses a direct invoice quote link without querying or changing the invoice", async () => {
    const db = {
      select: vi.fn(),
      update: vi.fn(),
    };

    await expect(resolveInvoiceQuoteId(db, { id: 4, jobId: 8, quoteId: 21 } as any)).resolves.toBe(21);
    expect(db.select).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("recovers a missing invoice quote link from the source job and persists it", async () => {
    const whereUpdate = vi.fn().mockResolvedValue(undefined);
    const updateValues = vi.fn(() => ({ where: whereUpdate }));
    const db = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({ limit: async () => [{ quoteId: 21 }] }),
        }),
      })),
      update: vi.fn(() => ({ set: updateValues })),
    };

    await expect(resolveInvoiceQuoteId(db, { id: 4, jobId: 8, quoteId: null } as any)).resolves.toBe(21);
    expect(updateValues).toHaveBeenCalledWith({ quoteId: 21 });
    expect(whereUpdate).toHaveBeenCalledOnce();
  });

  it("does not make up a quote when the parent job has no source quote", async () => {
    const db = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({ limit: async () => [{ quoteId: null }] }),
        }),
      })),
      update: vi.fn(),
    };

    await expect(resolveInvoiceQuoteId(db, { id: 4, jobId: 8, quoteId: null } as any)).resolves.toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });
});
