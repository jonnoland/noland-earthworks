import { describe, expect, it } from "vitest";
import { getNewRequestIds } from "../client/src/lib/opsNewRequestAlert";

describe("Operations Quotes new-request alert detection", () => {
  it("returns only records that were absent from the previous refresh", () => {
    const knownIds = new Set(["14", "15"]);
    const requests = [{ id: 15 }, { id: 16 }, { id: "17" }];

    expect(getNewRequestIds(knownIds, requests)).toEqual(["16", "17"]);
  });

  it("does not treat existing records as newly arrived after a refetch", () => {
    const knownIds = new Set(["14", "15"]);

    expect(getNewRequestIds(knownIds, [{ id: 15 }, { id: 14 }])).toEqual([]);
  });
});
