import { describe, expect, it } from "vitest";
import {
  DAY_RATE_TERMS,
  ONE_DAY_TRIAL_TERMS,
  PHASED_WORK_TERMS,
  createQuoteWorkLineItem,
} from "../shared/quoteWorkTypes";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("phased work and day-rate quote controls", () => {
  it("creates explicit zero-dollar placeholders for controlled work types", () => {
    expect(createQuoteWorkLineItem("phase")).toMatchObject({ kind: "phase", qty: 1, unitPriceCents: 0, totalCents: 0 });
    expect(createQuoteWorkLineItem("full_operating_day")).toMatchObject({ kind: "full_operating_day", qty: 1 });
    expect(createQuoteWorkLineItem("half_operating_day")).toMatchObject({ kind: "half_operating_day", qty: 1 });
  });

  it("keeps operational safeguards in each reusable customer-facing term", () => {
    expect(PHASED_WORK_TERMS).toContain("future phases");
    expect(DAY_RATE_TERMS).toContain("written not-to-exceed amount");
    expect(ONE_DAY_TRIAL_TERMS).toContain("No specific acreage");
  });

  it("registers all controlled line-item kinds in the quote API and editor", () => {
    const root = resolve(import.meta.dirname, "..");
    const router = readFileSync(resolve(root, "server/nativeQuotesRouter.ts"), "utf8");
    const editor = readFileSync(resolve(root, "client/src/pages/ops/NativeAllQuotesSection.tsx"), "utf8");
    expect(router).toContain('"full_operating_day"');
    expect(router).toContain('"half_operating_day"');
    expect(editor).toContain("Load Internal Sample");
    expect(editor).toContain("Insert Day-Rate Terms");
  });
});
