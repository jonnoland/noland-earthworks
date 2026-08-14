import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "./leadQualifier";

describe("multi-service AI qualification prompt", () => {
  it("requires every structured service to remain in the combined estimate", () => {
    expect(SYSTEM_PROMPT).toContain("MULTI-SERVICE WEB QUOTE RULES");
    expect(SYSTEM_PROMPT).toContain("every structured service item");
    expect(SYSTEM_PROMPT).toContain("Never calculate it from only the primary service");
  });

  it("requires multi-service summaries to name each requested service", () => {
    expect(SYSTEM_PROMPT).toContain("summary and draftResponse must name every requested service");
  });

  it("requires a measurement-based confidence assessment and site-verification risks", () => {
    expect(SYSTEM_PROMPT).toContain("RANGE CONFIDENCE & RISK");
    expect(SYSTEM_PROMPT).toContain("rangeConfidenceScore from 0 to 100");
    expect(SYSTEM_PROMPT).toContain("rangeRiskFactors");
  });
});
