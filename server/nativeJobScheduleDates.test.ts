import { describe, expect, it, vi } from "vitest";
import { getJobScheduleDates, normalizeJobScheduleDates, saveJobScheduleDates } from "./nativeJobScheduleDates";

describe("native job schedule dates", () => {
  it("normalizes, orders, and de-duplicates entered work dates", () => {
    expect(normalizeJobScheduleDates([
      new Date("2026-09-12T08:00:00Z"),
      new Date("2026-09-10T16:00:00Z"),
      new Date("2026-09-12T20:00:00Z"),
    ]).map((date) => date.toISOString())).toEqual([
      "2026-09-10T12:00:00.000Z",
      "2026-09-12T12:00:00.000Z",
    ]);
  });

  it("uses the legacy primary scheduled date only when no normalized work dates exist", () => {
    const legacyDate = new Date("2026-09-11T12:00:00Z");
    expect(getJobScheduleDates({ scheduledDate: legacyDate }, []).map((date) => date.toISOString())).toEqual([
      "2026-09-11T12:00:00.000Z",
    ]);
    expect(getJobScheduleDates({ scheduledDate: legacyDate }, [new Date("2026-09-13T12:00:00Z")]).map((date) => date.toISOString())).toEqual([
      "2026-09-13T12:00:00.000Z",
    ]);
  });

  it("clears explicit work dates when an empty selection is saved", async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = {
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    };

    await expect(saveJobScheduleDates(db, 42, [])).resolves.toEqual([]);
    expect(deleteWhere).toHaveBeenCalledOnce();
    expect(insertValues).not.toHaveBeenCalled();
  });
});
