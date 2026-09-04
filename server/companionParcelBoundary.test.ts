import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");
}

describe("Noland Field parcel boundary overlay", () => {
  it("returns normalized official parcel rings only for the authenticated field-app lookup", () => {
    const fieldRouter = source("server/fieldQuoteRouter.ts");
    const lookupBlock = fieldRouter.slice(fieldRouter.indexOf("lookupParcel: requireAppToken"), fieldRouter.indexOf("verifyPin: publicProcedure"));

    expect(lookupBlock).toContain('returnGeometry: "true"');
    expect(lookupBlock).toContain("toParcelBoundaryRings(feature.geometry)");
    expect(lookupBlock).toContain("boundaryRings");
    expect(fieldRouter).toContain("buildTennesseeParcelSearchPattern");
    expect(fieldRouter).not.toContain("LIKE '%${pattern}%'");
  });

  it("draws the selected parcel boundary with the existing draggable location pin", () => {
    const newQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(newQuote).toContain("new google.maps.Polygon");
    expect(newQuote).toContain("boundaryRings={selectedParcelBoundary}");
    expect(newQuote).toContain("official Tennessee Property Viewer parcel boundary");
    expect(newQuote).toContain("setSelectedParcelBoundary(match.boundaryRings)");
  });
});
