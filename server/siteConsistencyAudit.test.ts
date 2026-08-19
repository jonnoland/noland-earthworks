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

  it("removes legacy free-estimate language from public client source", () => {
    const publicClientRoot = path.join(root, "client");
    const legacyPhrase = /free estimate/i;
    const pending = [publicClientRoot];
    const publicSource = [] as string[];

    while (pending.length > 0) {
      const current = pending.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) pending.push(fullPath);
        else if (/\.(tsx|html)$/.test(entry.name)) publicSource.push(fs.readFileSync(fullPath, "utf8"));
      }
    }

    expect(publicSource.join("\n")).not.toMatch(legacyPhrase);
    expect(read("client/src/pages/Faq.tsx")).toContain("Request a Site Visit");
  });

  it("keeps one consistent deposit-cancellation rule in the attorney-review terms draft", () => {
    const terms = read("client/src/pages/TermsOfService.tsx");

    expect(terms).toContain("14-calendar-day deposit rule");
    expect(terms).toContain("Attorney review required");
    expect(terms).not.toContain("projects over $5,000");
  });

  it("keeps the legacy Site Preparation route within the truthful vegetation-work scope", () => {
    const source = read("client/src/pages/SitePreparation.tsx");
    expect(source).toContain("This work is not grading, excavation, earthmoving, hauling, road construction, or final building-pad preparation.");
    expect(source).toContain("Site Visit and written proposal before scheduling");
    expect(source).not.toContain("Free on-site estimate");
  });
});
