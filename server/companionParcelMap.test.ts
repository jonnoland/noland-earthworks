import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Noland Field Parcel ID map", () => {
  it("uses a standard draggable marker so the mobile map does not require a configured Google map ID", () => {
    const newQuote = readFileSync(
      resolve(import.meta.dirname, "../noland-earthworks-mobile/src/pages/NewQuote.tsx"),
      "utf8",
    );

    expect(newQuote).toContain("new google.maps.Marker");
    expect(newQuote).toContain("draggable: true");
    expect(newQuote).toContain("marker.getPosition()");
    expect(newQuote).not.toContain("new google.maps.marker.AdvancedMarkerElement");
    expect(newQuote).not.toContain("libraries=marker");
  });
});
