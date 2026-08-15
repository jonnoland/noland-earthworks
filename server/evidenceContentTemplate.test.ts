import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("evidence-backed local content template", () => {
  it("uses live public review and gallery data instead of hard-coded testimonials or project stories", () => {
    const component = source("client/src/components/EvidenceContentSection.tsx");
    expect(component).toContain("trpc.reviewsLive.getPublic.useQuery");
    expect(component).toContain("trpc.gallery.listPublic.useQuery");
    expect(component).toContain("No customer testimonial or project result is invented");
  });

  it("is used by both shared county and service layouts", () => {
    expect(source("client/src/components/CountyPageLayout.tsx")).toContain("<EvidenceContentSection");
    expect(source("client/src/components/ServicePageLayout.tsx")).toContain("<EvidenceContentSection");
  });
});
