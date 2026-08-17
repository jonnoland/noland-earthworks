import { describe, expect, it } from "vitest";
import {
  formatNewRequestAlert,
  getNewRequestIds,
  shouldShowOpsBrowserNotification,
} from "../client/src/lib/opsNewRequestAlert";

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

  it("formats the shared visual and toast alert wording for one or many requests", () => {
    expect(formatNewRequestAlert(1, "website request")).toBe("1 new website request received.");
    expect(formatNewRequestAlert(2, "field request")).toBe("2 new field requests received.");
  });

  it("keeps the initial response separate from later new-request comparisons", () => {
    const firstResponse = [{ id: 21 }, { id: 22 }];
    const baseline = new Set(firstResponse.map(request => String(request.id)));

    expect(getNewRequestIds(baseline, firstResponse)).toEqual([]);
    expect(getNewRequestIds(baseline, [...firstResponse, { id: 23 }])).toEqual(["23"]);
  });

  it("shows browser notifications only for an enabled, permitted, background-tab session", () => {
    expect(shouldShowOpsBrowserNotification(true, "granted", true)).toBe(true);
    expect(shouldShowOpsBrowserNotification(true, "granted", false)).toBe(false);
    expect(shouldShowOpsBrowserNotification(false, "granted", true)).toBe(false);
    expect(shouldShowOpsBrowserNotification(true, "denied", true)).toBe(false);
    expect(shouldShowOpsBrowserNotification(true, "unsupported", true)).toBe(false);
  });
});
