import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");
const read = (relativePath: string) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("Selective Mulching education", () => {
  it("uses a mulching-equipment hero and explains mulching benefits without promising broader construction work", () => {
    const page = read("client/src/pages/SelectiveMulching.tsx");

    expect(page).toContain("forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp");
    expect(page).toContain("Mulching Head at Work");
    expect(page).toContain("Mulch Left on Site");
    expect(page).toContain("How does selective mulching differ from traditional clearing?");
    expect(page).toContain("What are the benefits of mulching instead of pushing vegetation into piles?");
    expect(page).toContain("does not provide grading, excavation, or hauling");
  });

  it("offers an accessible Site Visit tooltip explaining the service terminology", () => {
    const quote = read("client/src/pages/Quote.tsx");

    expect(quote).toContain("How mulching differs from clearing");
    expect(quote).toContain("Forestry mulching processes suitable brush, saplings, and small trees into mulch left on site.");
    expect(quote).toContain("TooltipContent");
  });
});
