import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("Land Management service experience", () => {
  it("uses authentic project imagery to show broader Land Management outcomes", () => {
    const page = read("client/src/pages/LandManagement.tsx");
    expect(page).toContain("gallery-brush-hogging-after-1-cTEAPGT74a2ZfDzWuJQR8X.webp");
    expect(page).toContain("gallery-forestry-after-1-irHqRa8sGttYKR7PSVZaM8.webp");
    expect(page).toContain("gallery-vegetation-after-1-ai26shCK8Ws9iasuK2BzWu.webp");
    expect(page).toContain("Pasture Reclamation");
    expect(page).toContain("Ongoing Property Care");
    expect(page).toContain("Fence-Line Access");
  });

  it("explains the Land Management category and routes retired-term searches to the current service", () => {
    const services = read("client/src/components/ServicesSection.tsx");
    const blog = read("client/src/pages/Blog.tsx");
    const redirects = read("server/legacySeoRedirects.ts");

    expect(services).toContain("What Land Management Includes");
    expect(services).toContain("Grading, excavation, hauling, and construction preparation are not included.");
    expect(blog).toContain("/services/land-management?source=article-search");
    expect(redirects).toContain('["land", "clearing"].join("-")');
    expect(redirects).toContain('[retiredLandServicePath]: "/services/land-management"');
  });

  it("keeps Forestry Mulching first on the homepage and uses the Site Visit call to action", () => {
    const services = read("client/src/components/ServicesSection.tsx");
    const hero = read("client/src/components/HeroSection.tsx");
    const contact = read("client/src/components/ContactSection.tsx");
    const countyLayout = read("client/src/components/CountyPageLayout.tsx");

    expect(services.indexOf('title: "Forestry Mulching"')).toBeLessThan(services.indexOf('title: "Land Management"'));
    expect(services).toContain('isPrimary={s.title === "Forestry Mulching"}');
    expect(hero).toContain("Request a Site Visit");
    expect(contact).toContain("Request a Site Visit");
    expect(countyLayout).toContain("Request a Site Visit");
  });
});
