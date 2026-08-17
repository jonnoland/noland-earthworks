import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const retiredPhrase = ["free", "quote"].join(" ");

describe("Site Visit call-to-action terminology", () => {
  it("keeps active customer-facing call-to-action surfaces free of the retired phrase", () => {
    const sourceFiles = [
      "client/index.html",
      "client/src/components/AIChatWidget.tsx",
      "client/src/components/CountiesSection.tsx",
      "client/src/components/CountyMap.tsx",
      "client/src/components/FAQSection.tsx",
      "client/src/components/Footer.tsx",
      "client/src/components/HowItWorksSection.tsx",
      "client/src/components/MobileCTABar.tsx",
      "client/src/components/ProblemSolutionSection.tsx",
      "client/src/components/ServiceAreasSection.tsx",
      "client/src/pages/Blog.tsx",
      "client/src/pages/Gallery.tsx",
      "client/src/pages/Reviews.tsx",
      "server/opsRouter.ts",
    ];

    for (const file of sourceFiles) {
      const contents = fs.readFileSync(path.join(projectRoot, file), "utf8").toLowerCase();
      expect(contents).not.toContain(retiredPhrase);
      expect(contents).toContain("request a site visit");
    }
  });
});
