import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const readProjectFile = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("general service-area business identity", () => {
  it("keeps the public identity free of the former street address", () => {
    const publicFiles = [
      "client/index.html",
      "client/public/llms.txt",
      "client/src/components/ContactSection.tsx",
      "client/src/components/Footer.tsx",
      "client/src/pages/ops/Settings.tsx",
      "client/src/pages/About.tsx",
      "client/src/pages/ForestryMulching.tsx",
    ];

    for (const filename of publicFiles) {
      const content = readProjectFile(filename);
      expect(content, filename).not.toMatch(/93\s+Halliburton|Halliburton\s+Road/i);
    }
  });

  it("uses the approved service-area wording in public identity surfaces", () => {
    expect(readProjectFile("client/src/components/Footer.tsx")).toContain(
      "Based in Vanleer, TN, serving surrounding areas."
    );
    expect(readProjectFile("client/src/pages/About.tsx")).toContain(
      "Based in Vanleer, TN, serving surrounding areas."
    );
    expect(readProjectFile("client/src/components/ContactSection.tsx")).toContain(
      "Based in Vanleer, TN, serving surrounding areas."
    );
    expect(readProjectFile("client/index.html")).toContain(
      "Based in Vanleer, TN, serving surrounding areas."
    );
  });

  it("does not publish a street address or property-level coordinates in the static business schema", () => {
    const indexHtml = readProjectFile("client/index.html");
    expect(indexHtml).not.toContain('"streetAddress"');
    expect(indexHtml).not.toContain('"postalCode"');
    expect(indexHtml).not.toContain("36.2487");
    expect(indexHtml).not.toContain("-87.4649");
    expect(indexHtml).toContain('"addressLocality": "Vanleer"');
  });

  it("uses general location wording for operational fallbacks", () => {
    expect(readProjectFile("drizzle/schema.ts")).toContain(
      'default("Based in Vanleer, TN, serving surrounding areas.")'
    );
    expect(readProjectFile("server/govContractsRouter.ts")).toContain(
      's?.address ?? "Based in Vanleer, TN, serving surrounding areas."'
    );
    expect(readProjectFile("client/src/pages/ops/Leads.tsx")).toContain(
      'const BUSINESS_ADDRESS = "Vanleer, TN"'
    );
  });
});
