import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createQuoteServiceLineItem,
  formatQuoteLineQuantity,
  isLinearFootQuoteLine,
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
    expect(editor).toContain("Calculated as linear feet × rate per linear foot.");
  });

  it("allows Linear Foot metadata through the native quote persistence and portal display paths", () => {
    const router = source("server/nativeQuotesRouter.ts");
    const portal = source("client/src/pages/NativeQuotePortal.tsx");
    const invoice = source("server/nativeJobsRouter.ts");
    expect(router).toContain('measurementUnit: z.enum(["linear_foot"]).optional()');
    expect(portal).toContain("formatQuoteLineQuantity");
    expect(invoice).toContain('li.measurementUnit === "linear_foot" ? " linear ft" : ""');
  });
});
