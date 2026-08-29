import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateLinearFeetFromAcreage,
  createQuoteServiceLineItem,
  formatQuoteLineQuantity,
  isEstimatedLinearFootQuoteLine,
  isLinearFootQuoteLine,
  LINEAR_FOOT_CLEARING_WIDTH_OPTIONS,
  linearFootEstimateBasis,
  quoteLineQuantityLabel,
} from "@shared/quoteLineItemMeasurements";
import { isOperationsLinearFootService } from "@shared/operationsQuotePricing";

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
    expect(LINEAR_FOOT_CLEARING_WIDTH_OPTIONS).toEqual([6, 8, 10, 12, 16, 20, 25, 30]);
    expect(calculateLinearFeetFromAcreage(1, 6)).toBe(7_260);
    expect(calculateLinearFeetFromAcreage(1, 8)).toBe(5_445);
    expect(calculateLinearFeetFromAcreage(1, 10)).toBe(4_356);
    expect(calculateLinearFeetFromAcreage(3, 20)).toBe(6_534);
    expect(calculateLinearFeetFromAcreage(1, 12)).toBe(3_630);
    expect(calculateLinearFeetFromAcreage(0, 20)).toBeNull();
    expect(calculateLinearFeetFromAcreage(3, 0)).toBeNull();
  });

  it("classifies Fence Line, Trail, and Right-of-Way work as measured Linear Foot services", () => {
    const rightOfWay = createQuoteServiceLineItem("right-of-way-clearing");
    expect(rightOfWay.measurementUnit).toBe("linear_foot");
    expect(isLinearFootQuoteLine(rightOfWay)).toBe(true);
    expect(isOperationsLinearFootService("Fence Line Clearing")).toBe(true);
    expect(isOperationsLinearFootService("Trail Cutting")).toBe(true);
    expect(isOperationsLinearFootService("Right-of-Way Clearing")).toBe(true);
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
    expect(editor).toContain("Calculated as measured Linear Feet × rate per Linear Foot.");
    expect(editor).toContain("Footage source: Measured Linear Feet");
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

  it("makes the quote header change its label and controlled quantity input with the selected service unit", () => {
    const editor = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    expect(editor).toContain("quoteHeaderUsesLinearFeet");
    expect(editor).toContain("Measured Linear Feet");
    expect(editor).toContain("handleQuoteHeaderServiceChange");
    expect(editor).toContain("handleQuoteHeaderLinearFeetChange");
    expect(editor).toContain('measurementUnit: "linear_foot"');
    expect(editor).toContain("This measured footage drives the selected Linear Foot service calculation.");
    expect(editor).toContain("Acreage drives the selected service calculation.");
  });

  it("requires measured Linear Feet and audits saved quote measurements for every Linear Foot service", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const editor = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    expect(router).toContain("clearingWidthFeet: z.number().min(1).max(200).optional()");
    expect(router).toContain("assertQuoteMeasurementConsistency");
    expect(router).toContain("This service uses measured Linear Feet only; do not use acreage conversion.");
    expect(router).toContain("Acreage cannot be saved for Fence Line Clearing, Trail Cutting, or Right-of-Way Clearing.");
    expect(router).toContain("Remove acreage-derived footage before saving.");
    expect(editor).toContain("Acreage conversion is not available for this service.");
    expect(editor).toContain("Fence Line Clearing, Trail Cutting, and Right-of-Way Clearing use measured Linear Feet only.");
    expect(editor).toContain("This quote starts as a normal job.");
    expect(editor).not.toContain("Calculate from acreage");
  });

  it("warns and clears acreage before a Linear Foot-only quote can be saved, and converts ordinary work into Phase 1 on demand", () => {
    const editor = source("client/src/pages/ops/NativeAllQuotesSection.tsx");
    expect(editor).toContain("uses measured Linear Feet only. Acreage was cleared before save.");
    expect(editor).toContain("const convertNormalQuoteToPhase");
    expect(editor).toContain('description: "Phase 1 — Approved work"');
    expect(editor).toContain('phaseAuthorization: "approved_now"');
    expect(editor).toContain("Standard quote converted to Phase 1.");
    expect(editor).toContain("Convert to Phase 1");
  });
});
