import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("cross-site consistency controls", () => {
  it("normalizes county-page legacy estimate language into the Site Visit workflow", () => {
    const source = read("client/src/pages/CountyPages.tsx");
    expect(source).toContain("function normalizeCountyCopy");
    expect(source).toContain('"Site Visit"');
    expect(source).toContain("normalizedData");
  });

  it("keeps public chat and dynamic article calls to action aligned with Site Visits", () => {
    const chatWidget = read("client/src/components/AIChatWidget.tsx");
    const chatRouter = read("server/chatRouter.ts");
    const article = read("client/src/pages/DynamicBlogPost.tsx");

    expect(chatWidget).toContain("request a Site Visit");
    expect(chatRouter).toContain("request a Site Visit");
    expect(article).toContain("Request a Site Visit");
    expect(article).not.toContain("Schedule a Free Estimate");
  });

  it("keeps the legacy Site Preparation route within the truthful vegetation-work scope", () => {
    const source = read("client/src/pages/SitePreparation.tsx");
    expect(source).toContain("This work is not grading, excavation, earthmoving, hauling, road construction, or final building-pad preparation.");
    expect(source).toContain("Site Visit and written proposal before scheduling");
    expect(source).not.toContain("Free on-site estimate");
  });
});
