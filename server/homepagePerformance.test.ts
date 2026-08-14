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

  it("does not preload homepage hero imagery on every route", () => {
    const source = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");

    expect(source).not.toContain('rel="preload"\n      as="image"');
    expect(source).toContain('loading="lazy"');
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

  it("keeps one keyword-focused primary homepage H1 and preserves the brand line as supporting copy", () => {
    const hero = readFileSync(
      resolve(projectRoot, "client/src/components/HeroSection.tsx"),
      "utf8"
    );

    expect(hero).toContain("Land Management &amp;");
    expect(hero).toContain("Forestry Mulching");
    expect(hero).toContain("in Middle &amp; West Tennessee");
    expect(hero).toContain("Your Land Has Been Waiting. Let&apos;s Bring It Back.");
  });

  it("defers the optional public AI chat bundle until visitor interaction or idle time", () => {
    const app = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");

    expect(app).toContain("function DeferredPublicAIChat()");
    expect(app).toContain("requestIdleCallback");
    expect(app).toContain('<DeferredPublicAIChat />');
    expect(app).not.toContain('\n            <AIChatWidget />');
  });
});
