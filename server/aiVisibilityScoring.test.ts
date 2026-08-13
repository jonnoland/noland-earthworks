import { describe, expect, it } from "vitest";
import { calculateAiVisibilityDiagnostic } from "./aiVisibilityScoring";

describe("AI Visibility diagnostic scoring", () => {
  it("prioritizes local forestry-mulching discovery and use-case coverage over branded mentions", () => {
    const diagnostic = calculateAiVisibilityDiagnostic([
      { category: "local_service", mentioned: true, sentiment: "positive", cited: false },
      { category: "local_service", mentioned: false, sentiment: "neutral", cited: false },
      { category: "use_case", mentioned: true, sentiment: "positive", cited: false },
      { category: "use_case", mentioned: false, sentiment: "neutral", cited: false },
      { category: "branded", mentioned: true, sentiment: "positive", cited: true },
      { category: "branded", mentioned: true, sentiment: "neutral", cited: false },
    ]);

    expect(diagnostic.localDiscoveryScore).toBe(50);
    expect(diagnostic.useCaseScore).toBe(50);
    expect(diagnostic.brandRecognitionScore).toBe(100);
    expect(diagnostic.overallScore).toBe(65);
  });

  it("returns a full score only when every discovery category has complete positive coverage", () => {
    const diagnostic = calculateAiVisibilityDiagnostic([
      { category: "local_service", mentioned: true, sentiment: "positive", cited: true },
      { category: "use_case", mentioned: true, sentiment: "positive", cited: true },
      { category: "branded", mentioned: true, sentiment: "positive", cited: true },
    ]);

    expect(diagnostic).toMatchObject({
      overallScore: 100,
      localDiscoveryScore: 100,
      useCaseScore: 100,
      brandRecognitionScore: 100,
    });
  });
});
