import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getLegacySeoRedirect } from "./legacySeoRedirects";
import { STATIC_SITEMAP_PAGES } from "./sitemapRoutes";

const root = resolve(import.meta.dirname, "..");

describe("Selective Mulching terminology", () => {
  it("uses Selective Mulching on the canonical public service page and service card", () => {
    const page = readFileSync(resolve(root, "client/src/pages/SelectiveMulching.tsx"), "utf8");
    const services = readFileSync(resolve(root, "client/src/components/ServicesSection.tsx"), "utf8");

    expect(page).toContain("Selective Mulching in Tennessee");
    expect(page).not.toContain("Selective Clearing");
    expect(services).toContain('title: "Selective Mulching"');
    expect(services).toContain('href: "/services/add-ons/selective-mulching"');
  });

  it("uses the new canonical URL and redirects both retired paths", () => {
    expect(STATIC_SITEMAP_PAGES.some((page) => page.path === "/services/add-ons/selective-mulching")).toBe(true);
    expect(STATIC_SITEMAP_PAGES.some((page) => page.path === "/services/add-ons/selective-clearing")).toBe(false);
    expect(getLegacySeoRedirect("/services/selective-clearing")).toBe("/services/add-ons/selective-mulching");
    expect(getLegacySeoRedirect("/services/add-ons/selective-clearing")).toBe("/services/add-ons/selective-mulching");
  });
});
