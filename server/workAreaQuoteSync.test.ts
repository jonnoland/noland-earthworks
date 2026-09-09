import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");
}

describe("parcel-linked work-area quote synchronization", () => {
  it("stores a measured polygon, parcel reference, and captured price range on field intake", () => {
    const schema = source("drizzle/schema.ts");
    const fieldRouter = source("server/fieldQuoteRouter.ts");
    const submitBlock = fieldRouter.slice(fieldRouter.indexOf("submit: requireAppToken"), fieldRouter.indexOf("// 2. Run AI qualification"));

    expect(schema).toContain('workAreaPolygon: text("workAreaPolygon")');
    expect(schema).toContain('parcelDeededAcreage: decimal("parcelDeededAcreage"');
    expect(submitBlock).toContain("workAreaPolygon: workAreaPolygonSchema.optional()");
    expect(submitBlock).toContain("workAreaPolygon: input.workAreaPolygon ? JSON.stringify(input.workAreaPolygon) : null");
    expect(submitBlock).toContain("estimatedPriceLowCents: input.estimatedPriceLowCents ?? null");
    expect(submitBlock).toContain("parcelOwner: input.parcelOwner ?? null");
  });

  it("automatically estimates from map-measured acreage and keeps geometry through offline submission", () => {
    const newQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const offlineQueue = source("noland-earthworks-mobile/src/lib/offlineFieldQuoteQueue.ts");

    expect(newQuote).toContain("handleGetEstimate(undefined, measuredAcres)");
    expect(newQuote).toContain("setMeasuredWorkAreaPolygon(polygon)");
    expect(newQuote).toContain("workAreaPolygon: measuredWorkAreaPolygon.length >= 3 ? measuredWorkAreaPolygon : undefined");
    expect(newQuote).toContain("parcelOwner: selectedParcelReference?.owner || undefined");
    expect(offlineQueue).toContain("workAreaPolygon?: Array<{ lat: number; lng: number }>");
    expect(offlineQueue).toContain("estimatedPriceLowCents?: number");
  });

  it("carries the field scope into the Operations quote and dispatch job, then renders it on the Operations map", () => {
    const fieldRouter = source("server/fieldQuoteRouter.ts");
    const quoteRouter = source("server/nativeQuotesRouter.ts");
    const quotePage = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    const conversionBlock = fieldRouter.slice(fieldRouter.indexOf("convertToQuote: protectedProcedure"), fieldRouter.indexOf("placesAutocomplete:"));
    const jobConversionBlock = quoteRouter.slice(quoteRouter.indexOf("convertToJob: ownerProcedure"));

    expect(conversionBlock).toContain("workAreaPolygon: fq.workAreaPolygon ?? null");
    expect(conversionBlock).toContain("parcelDeededAcreage: fq.parcelDeededAcreage ?? null");
    expect(jobConversionBlock).toContain("workAreaPolygon: quote.workAreaPolygon ?? null");
    expect(jobConversionBlock).toContain("parcelId: quote.parcelId ?? null");
    expect(quotePage).toContain("Field-Measured Work Area");
    expect(quotePage).toContain('strokeColor: "#f97316"');
    expect(quotePage).toContain("workAreaPolygon={savedWorkAreaPolygon}");
  });
});
