import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getServiceDisplayName } from "./serviceTaxonomy";

const projectRoot = path.resolve(import.meta.dirname, "..");
const retiredPhrase = ["land", "clearing"].join(" ");

describe("Land Management terminology", () => {
  it("normalizes legacy stored values to the approved customer-facing service name", () => {
    expect(getServiceDisplayName(retiredPhrase)).toBe("Land Management");
    expect(getServiceDisplayName(retiredPhrase.replace(" ", "-"))).toBe("Land Management");
    expect(getServiceDisplayName("land management")).toBe("Land Management");
  });

  it("keeps active public and operational source free of the retired visible term", () => {
    const sourceFiles = [
      "client/src/App.tsx",
      "client/src/pages/LandManagement.tsx",
      "client/src/pages/blog/CostOfLandManagement.tsx",
      "client/src/pages/blog/HowToPrepareForLandManagement.tsx",
      "server/agents.ts",
      "server/leadQualifier.ts",
      "server/nativeQuotesRouter.ts",
      "server/opsRouter.ts",
      "server/quoteRouter.ts",
      "server/serviceTaxonomy.ts",
    ];

    for (const file of sourceFiles) {
      const contents = fs.readFileSync(path.join(projectRoot, file), "utf8").toLowerCase();
      expect(contents).not.toContain(retiredPhrase);
    }
  });
});
