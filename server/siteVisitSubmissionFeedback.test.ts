import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "../client/src/pages/Quote.tsx"), "utf8");

describe("Site Visit submission feedback", () => {
  it("provides an accessible pending state and a detailed success confirmation", () => {
    expect(source).toContain('aria-busy={submitRequest.isPending}');
    expect(source).toContain("Sending your request…");
    expect(source).toContain("Saving your details and preparing the next steps…");
    expect(source).toContain("You’re all set");
    expect(source).toContain("What happens next");
    expect(source).toContain('aria-live="polite"');
  });
});
