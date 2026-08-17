import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("homepage canonical service links", () => {
  it("links the mulch redistribution card directly to its canonical add-on page", () => {
    const servicesSection = readFileSync(
      resolve(root, "client/src/components/ServicesSection.tsx"),
      "utf8"
    );

    expect(servicesSection).toContain('href: "/services/add-ons/mulch-redistribution"');
    expect(servicesSection).not.toContain('href: "/services/mulch-redistribution"');
  });
});
