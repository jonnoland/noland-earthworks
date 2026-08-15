import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public pricing and operations access hardening", () => {
  it("replaces the public pricing calculator with a site-visit planning page", () => {
    const pricingPage = projectFile("client/src/pages/Pricing.tsx");
    expect(pricingPage).toContain("Start with a");
    expect(pricingPage).toContain("site visit.");
    expect(pricingPage).not.toContain("Base Rate");
    expect(pricingPage).not.toContain("Per Acre");
    expect(pricingPage).not.toContain("Terrain Multiplier");
  });

  it("does not expose an Operations link in the public site header", () => {
    const navbar = projectFile("client/src/components/Navbar.tsx");
    expect(navbar).not.toContain('href="/ops"');
    expect(navbar).not.toContain('href="/ops-view"');
  });

  it("removes the unauthenticated viewer API and route", () => {
    const routers = projectFile("server/routers.ts");
    const app = projectFile("client/src/App.tsx");
    expect(routers).not.toContain("opsViewer");
    expect(app).not.toContain('path="/ops-view"');
  });

  it("uses a site-visit request confirmation instead of a public preliminary price", () => {
    const quotePage = projectFile("client/src/pages/Quote.tsx");
    expect(quotePage).toContain("Site Visit Request");
    expect(quotePage).not.toContain("Live Preliminary Range");
  });

  it("provides a dismissible analytics-consent choice linked to the privacy policy", () => {
    const footer = projectFile("client/src/components/Footer.tsx");

    expect(footer).toContain("noland_cookie_consent_v1");
    expect(footer).toContain("Essential only");
    expect(footer).toContain("Accept analytics");
    expect(footer).toContain('href="/privacy-policy"');
  });
});
