import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Website Requests parcel-aware map", () => {
  it("persists Parcel ID and county on native quotes", () => {
    const schema = source("drizzle/schema.ts");
    const router = source("server/nativeQuotesRouter.ts");

    expect(schema).toContain('parcelId: varchar("parcelId", { length: 100 })');
    expect(schema).toContain('parcelCounty: varchar("parcelCounty", { length: 100 })');
    expect(router).toContain("parcelId: z.string().trim().max(100).optional()");
    expect(router).toContain("parcelCounty: z.string().trim().max(100).optional()");
  });

  it("enriches Website Requests with linked quote parcel data and draws its boundary", () => {
    const opsRouter = source("server/opsRouter.ts");
    const panel = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(opsRouter).toContain("linkedQuoteParcelId: nativeQuotes.parcelId");
    expect(opsRouter).toContain("linkedQuoteParcelCounty: nativeQuotes.parcelCounty");
    expect(panel).toContain("trpc.parcel.boundary.useMutation()");
    expect(panel).toContain("boundaryRings");
    expect(panel).toContain("Parcel boundary:");
  });

  it("keeps the existing address or pin map as a fallback", () => {
    const panel = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(panel).toContain("Parcel {parcelId} could not load; showing the request location instead.");
    expect(panel).toContain("address={!hasPin ? addressStr : undefined}");
  });

  it("links request-originated quotes and refreshes the request map after parcel saves", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const panel = source("client/src/pages/ops/NativeAllQuotesSection.tsx");

    expect(router).toContain("websiteRequestId: z.number().int().optional()");
    expect(router).toContain(".set({ nativeQuoteId: Number(id) })");
    expect(panel).toContain("websiteRequestId: req.id");
    expect(panel).toContain("utils.ops.quotes.list.invalidate()");
  });
});
