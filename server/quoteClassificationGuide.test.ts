import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(import.meta.dirname, `../${path}`), "utf8");

describe("quote classification field guide", () => {
  it("defines practical density, terrain, and access classification cues for shared use", () => {
    const guide = source("shared/quoteClassificationGuide.ts");

    expect(guide).toContain('title: "Vegetation density"');
    expect(guide).toContain('title: "Terrain"');
    expect(guide).toContain('title: "Site access"');
    expect(guide).toContain('value: "light"');
    expect(guide).toContain('value: "moderate"');
    expect(guide).toContain('value: "heavy"');
    expect(guide).toContain('value: "flat"');
    expect(guide).toContain('value: "rolling"');
    expect(guide).toContain('value: "steep"');
    expect(guide).toContain('value: "easy"');
    expect(guide).toContain('value: "difficult"');
  });

  it("places the guide inside the Operations estimator and the Noland Field workflow", () => {
    const estimator = source("client/src/pages/ops/CostEstimator.tsx");
    const fieldQuote = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");

    expect(estimator).toContain("<QuoteClassificationGuide");
    expect(fieldQuote).toContain("<QuoteClassificationGuide");
    expect(fieldQuote).toContain("accessDifficulty={form.accessDifficulty}");
  });
});
