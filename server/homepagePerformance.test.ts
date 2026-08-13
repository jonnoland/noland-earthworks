import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("homepage performance safeguards", () => {
  it("keeps the interactive coverage map opt-in instead of loading Maps on first paint", () => {
    const source = readFileSync(
      resolve(projectRoot, "client/src/components/ServiceAreasSection.tsx"),
      "utf8"
    );

    expect(source).toContain('const [mapRequested, setMapRequested] = useState(false)');
    expect(source).toContain("{mapRequested ? (");
    expect(source).toContain("Load coverage map");
  });

  it("preloads the smaller mobile hero asset without replacing the desktop hero", () => {
    const source = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");

    expect(source).toContain('media="(max-width: 768px)"');
    expect(source).toContain("hero-forestry-mobile_4299c692.webp");
    expect(source).toContain("hero-forestry-golden_b098141c.webp");
  });
});
