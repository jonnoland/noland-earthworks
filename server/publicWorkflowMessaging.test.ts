import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

describe("public workflow messaging", () => {
  it("describes qualification, a site visit, a written proposal, weather-aware scheduling, and follow-up without fixed timing promises", () => {
    const source = readFileSync(
      resolve(projectRoot, "client/src/components/HowItWorksSection.tsx"),
      "utf8"
    );

    expect(source).toContain("Request & Fit Review");
    expect(source).toContain("Site Visit & Proposal");
    expect(source).toContain("Schedule, Work & Follow-Up");
    expect(source).toContain("written proposal");
    expect(source).toContain("weather, site conditions, and the current workload");
    expect(source).not.toContain("Most residential jobs are completed in a single day");
    expect(source).not.toContain("Most projects scheduled within 1–2 weeks");
  });

  it("names Forestry Mulching in the Our Commitment heading", () => {
    const source = readFileSync(
      resolve(projectRoot, "client/src/components/WhyUsSection.tsx"),
      "utf8"
    );

    expect(source).toContain("Forestry Mulching & Land Management");
    expect(source).toContain("Detailed Written Proposals");
  });
});
