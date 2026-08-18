import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Tennessee Parcel ID lookup rollout", () => {
  it("protects the companion lookup with the field-app token", () => {
    const fieldRouter = source("server/fieldQuoteRouter.ts");

    expect(fieldRouter).toContain("lookupParcel: requireAppToken");
    expect(fieldRouter).toContain("validateTennesseeParcelId(input.parcelId)");
    expect(fieldRouter).toContain("TN_PARCEL_QUERY_URL");
  });

  it("limits the public lookup to service-area counties and omits owner fields", () => {
    const quoteRouter = source("server/quoteRouter.ts");
    const publicBlock = quoteRouter.slice(quoteRouter.indexOf("parcelLookupById: publicProcedure"));

    expect(publicBlock).toContain("refine(isServedCounty");
    expect(publicBlock).toContain('outFields: "PARCELID,COUNTY_NAME,ADDRESS,CITY,ZIP,DEEDAC,LINK_TPV"');
    expect(publicBlock).not.toContain("OWNER,OWNER2");
  });

  it("keeps owner data out of the public request UI while exposing the official map link", () => {
    const publicQuote = source("client/src/pages/Quote.tsx");
    const fieldQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(publicQuote).toContain("owner and mailing details are not shown or copied");
    expect(publicQuote).toContain("Open Tennessee Property Viewer");
    expect(fieldQuote).toContain("Tennessee Parcel ID Lookup");
    expect(fieldQuote).toContain("Open TN Property Viewer");
  });
});
