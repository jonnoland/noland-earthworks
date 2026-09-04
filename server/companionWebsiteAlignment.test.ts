import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Noland Field website alignment", () => {
  it("uses the current service names and removes the retired stump-grinding option", () => {
    const form = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(form).toContain('"Forestry Mulching"');
    expect(form).toContain('"Land Management"');
    expect(form).toContain('"Vegetation Management"');
    expect(form).toContain('"Right-of-Way Clearing"');
    expect(form).toContain('"Trail Cutting"');
    expect(form).toContain('"Fence Line Clearing"');
    expect(form).toContain('"Selective Mulching"');
    expect(form).toContain('"Brush Hogging"');
    expect(form).not.toContain('"Stump Grinding"');
  });

  it("requires the field scope measurement appropriate to the selected service", () => {
    const form = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(form).toContain("Work-area acreage is required for this field request.");
    expect(form).toContain("Linear feet are required for a right-of-way field request.");
    expect(form).toContain("Measured Linear Feet are required for this field request.");
    expect(form).toContain("Enter source acreage and clearing width to estimate Linear Feet.");
    expect(form).toContain("Right-of-Way measurement:");
    expect(form).toContain("measurement: ${Math.round(effectiveLinearFeet).toLocaleString()} linear feet");
  });

  it("uses current Operations and Site Visit language in the field workflow", () => {
    const form = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const router = source("server/fieldQuoteRouter.ts");

    expect(form).toContain("Field Request Saved");
    expect(form).toContain("schedule a site visit or continue quote work");
    expect(router).toContain("Land Management and vegetation management");
    expect(router).toContain("Right-of-Way Clearing, trail cutting, and fence line clearing");
    expect(router).toContain("Selective Mulching");
    expect(router).not.toContain("land management / land management");
    expect(router).toContain("JSON.parse(stripCodeFence(rawContent))");
  });

  it("keeps the native release metadata aligned with the pending version 0.4.17", () => {
    const packageJson = source("noland-earthworks-mobile/package.json");
    const gradle = source("noland-earthworks-mobile/android/app/build.gradle");

    expect(packageJson).toContain('"version": "0.4.17"');
    expect(gradle).toContain("versionCode 19");
    expect(gradle).toContain('versionName "0.4.17"');
  });
});
