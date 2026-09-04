import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const newQuoteSource = readFileSync(resolve(root, "noland-earthworks-mobile/src/pages/NewQuote.tsx"), "utf8");
const serviceAreaSource = readFileSync(resolve(root, "noland-earthworks-mobile/src/lib/serviceAreas.ts"), "utf8");

describe("Noland Field county selector", () => {
  it("uses the approved service-area county list for Parcel ID lookup selection", () => {
    expect(newQuoteSource).toContain("SERVICE_AREA_COUNTIES");
    expect(newQuoteSource).toContain('Select service county');
    expect(newQuoteSource).toContain("SERVICE_AREA_COUNTIES.map");
    expect(newQuoteSource).toContain('onChange={set("county")}');
    expect(serviceAreaSource).toContain('"Cheatham County"');
    expect(serviceAreaSource).toContain('"Dickson County"');
  });
});
