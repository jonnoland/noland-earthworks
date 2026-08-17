import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SPA HTML cache headers", () => {
  it("prevents stale HTML shells while preserving normal static asset handling", () => {
    const viteSource = readFileSync(resolve(import.meta.dirname, "_core/vite.ts"), "utf8");

    expect(viteSource).toContain('const SPA_HTML_CACHE_CONTROL = "no-cache, no-store, must-revalidate"');
    expect(viteSource).toContain('res.setHeader("Cache-Control", SPA_HTML_CACHE_CONTROL)');
    expect(viteSource).toContain('app.use(express.static(distPath, {');
  });
});
