import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateLinearFeetFromAcreage,
  createQuoteServiceLineItem,
  formatQuoteLineQuantity,
  isEstimatedLinearFootQuoteLine,
  isLinearFootQuoteLine,
  linearFootEstimateBasis,
  quoteLineQuantityLabel,
} from "@shared/quoteLineItemMeasurements";

const root = resolve(import.meta.dirname, "..");
const source = (file: string) => readFileSync(resolve(root, file), "utf8");

describe("quote service line measurements", () => {
  it("creates a Linear Foot service line with explicit measurement metadata", () => {
    const line = createQuoteServiceLineItem("fence-line-clearing");
    expect(line.description).toBe("Fence Line Clearing");
    expect(line.measurementUnit).toBe("linear_foot");
    expect(isLinearFootQuoteLine(line)).toBe(true);
    expect(quoteLineQuantityLabel(line)).toBe("Linear feet");
  });

  it("keeps Linear Foot totals based on footage times the selected per-foot rate", () => {
    const line = { ...createQuoteServiceLineItem("trail-cutting"), qty: 2640, unitPriceCents: 450 };
    expect(line.qty * line.unitPriceCents).toBe(1_188_000);
    expect(formatQuoteLineQuantity(line)).toBe("2,640 linear ft");
  });

  it("calculates Linear Feet from clearing acreage and width while rejecting incomplete geometry", () => {
    expect(calculateLinearFeetFromAcreage(3, 20)).toBe(6_534);
    expect(calculateLinearFeetFromAcreage(1, 12)).toBe(3_630);
    expect(calculateLinearFeetFromAcreage(0, 20)).toBeNull();
    expect(calculateLinearFeetFromAcreage(3, 0)).toBeNull();
  });

  it("identifies acreage-derived footage and retains a readable verification basis", () => {
    const line = {
      ...createQuoteServiceLineItem("trail-cutting"),
      qty: 6_534,
      quantitySource: "acreage_estimate" as const,
      sourceAcreage: 3,
      clearingWidthFeet: 20,
    };
    expect(isEstimatedLinearFootQuoteLine(line)).toBe(true);
    expect(linearFootEstimateBasis(line)).toBe("3 acres at 20 ft clearing width");
  });

  it("keeps acreage and day-rate rows as ordinary quantity-based lines", () => {
    const line = createQuoteServiceLineItem("forestry-mulching");
    expect(isLinearFootQuoteLine(line)).toBe(false);
    expect(quoteLineQuantityLabel(line)).toBe("Quantity");
  });

  it("renders the same service selector for initial, added, and phase-scoped service lines", () => {
    const editor = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    expect(editor).toContain('aria-label="Quote service"');
    expect(editor).toContain("QUOTE_LINE_SERVICE_OPTIONS.map");
    expect(editor).toContain("const DEFAULT_LINE_ITEMS: LineItem[] = [");
    expect(editor).toContain("{ ...createQuoteServiceLineItem(), kind: \"service\" }");
    expect(editor).toContain("Rate / linear ft");
    expect(editor).toContain("Calculated as measured linear feet × rate per linear foot.");
    expect(editor).toContain("Footage source");
    expect(editor).toContain("!isServiceLine && <Input");
    expect(editor).not.toContain('placeholder={isServiceLine ? "Service description or scope" : "Description"}');
    expect(editor).not.toContain('selectedServiceValue === "custom" && <Input');
  });

  it("allows Linear Foot metadata through the native quote persistence and portal display paths", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const portal = source("client/src/pages/NativeQuotePortal.tsx");
    const invoice = source("server/nativeJobsRouter.ts");
    expect(router).toContain('measurementUnit: z.enum(["linear_foot"]).optional()');
    expect(portal).toContain("formatQuoteLineQuantity");
    expect(invoice).toContain('li.measurementUnit === "linear_foot" ? " linear ft" : ""');
  });

  it("makes AI Suggest validate Linear Foot quantities and return footage-based quote items", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const editor = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    expect(router).toContain("linearFeet: z.number().min(1)");
    expect(router).toContain("isLinearFootService(input.serviceType)");
    expect(router).toContain('measurementUnit: "linear_foot" as const');
    expect(router).toContain("Minimum project adjustment");
    expect(editor).toContain("aiUsesLinearFeet");
    expect(editor).toContain("Enter the Linear Feet on the selected service line first");
    expect(editor).toContain("Build footage-based line items, duration, and client message");
  });

  it("prompts Linear Foot AI Suggest users for clearing width and carries estimated-footage warnings into the portal", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const editor = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    const portal = source("client/src/pages/NativeQuotePortal.tsx");
    expect(router).toContain("clearingWidthFeet: z.number().min(1).max(200).optional()");
    expect(router).toContain("calculateLinearFeetFromAcreage(acreage ?? 0, clearingWidthFeet ?? 0)");
    expect(router).toContain('quantitySource: isAcreageEstimate ? "acreage_estimate" as const : "measured" as const');
    expect(editor).toContain("Calculate from acreage");
    expect(editor).toContain("Estimated footage — verify on site.");
    expect(editor).toContain("Estimated Linear Footage — verify on site.");
    expect(portal).toContain("EstimatedFootageNotice");
    expect(portal).toContain("Final footage will be verified during the site visit.");
  });
});
