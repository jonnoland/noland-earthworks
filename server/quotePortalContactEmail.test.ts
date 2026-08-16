import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("quote portal contact email", () => {
  it("uses the dedicated quotes inbox in every customer quote contact and reply path", () => {
    const files = [
      "client/src/pages/NativeQuotePortal.tsx",
      "client/src/pages/QuotePortal.tsx",
      "server/quotePortalRouter.ts",
      "server/opsRouter.ts",
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain("quotes@nolandearthworks.com");
      expect(source).not.toContain("jon@nolandearthworks.com");
    }
  });
});
