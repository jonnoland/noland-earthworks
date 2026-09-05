import { describe, expect, it } from "vitest";
import { buildNativeQuoteRevisionSnapshot, parseNativeQuoteRevisionSnapshot } from "./quoteRevisionSnapshots";

describe("native quote revision snapshots", () => {
  it("preserves only the customer-facing quote state sent in a revision", () => {
    const snapshot = buildNativeQuoteRevisionSnapshot({
      revisionNumber: 2,
      sentAt: "2026-09-04T12:00:00.000Z",
      clientName: "Taylor Landowner",
      title: "Forestry Mulching — Taylor Landowner",
      serviceType: "Forestry Mulching",
      acreage: "5",
      propertyAddress: "100 Example Road, Vanleer, TN",
      estimatedDuration: "2",
      clientMessage: "Please review the scope.",
      lineItems: [{ description: "Forestry Mulching", qty: 5, unitPriceCents: 220000, totalCents: 1100000 }],
      includedRentalCustomerChargeCents: 0,
      totalCents: 1100000,
      sitePhotoReferences: [],
    });

    expect(parseNativeQuoteRevisionSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(JSON.stringify(snapshot)).not.toContain("rentalEquipment");
    expect(JSON.stringify(snapshot)).not.toContain("internalNotes");
  });

  it("rejects malformed revision snapshots instead of serving untrusted data", () => {
    expect(parseNativeQuoteRevisionSnapshot('{"snapshotVersion":1,"revisionNumber":1}')).toBeNull();
  });
});
