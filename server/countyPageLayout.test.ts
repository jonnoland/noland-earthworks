import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("county page local service context", () => {
  it("keeps each service-card heading tied to the current county", () => {
    const source = readFileSync(
      resolve(projectRoot, "client/src/components/CountyPageLayout.tsx"),
      "utf8"
    );

    expect(source).toContain("{s.title}");
    expect(source).toContain("in {county}");
    expect(source).toContain('href={`/services/${s.slug}`}');
    expect(source).toContain('title: "Right-of-Way Clearing"');
    expect(source).toContain('slug: "right-of-way-clearing"');
    expect(source).toContain("Request a Site Visit");
  });
});
