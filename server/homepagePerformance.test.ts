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

  it("does not keep the Google Fonts stylesheet render-blocking", () => {
    const source = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");

    expect(source).toContain('rel="preload" as="style"');
    expect(source).toContain('media="print" onload="this.media=\'all\'"');
    expect(source).toContain("<noscript><link");
  });

  it("defers Google Analytics until interaction or idle time", () => {
    const source = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");

    expect(source).not.toContain('<script async src="https://www.googletagmanager.com/gtag/js');
    expect(source).toContain("function deferAnalytics()");
    expect(source).toContain("document.createElement('script')");
    expect(source).toContain("['pointerdown', 'keydown', 'touchstart']");
    expect(source).toContain("requestIdleCallback");
  });

  it("loads the forestry-mulching hero as a high-priority responsive image", () => {
    const layout = readFileSync(
      resolve(projectRoot, "client/src/components/ServicePageLayout.tsx"),
      "utf8"
    );
    const forestryPage = readFileSync(
      resolve(projectRoot, "client/src/pages/ForestryMulching.tsx"),
      "utf8"
    );

    expect(layout).toContain('fetchPriority="high"');
    expect(layout).toContain('media="(max-width: 768px)"');
    expect(forestryPage).toContain("forestry-mulching-mobile_47442aea.webp");
  });
});
