import { describe, expect, it } from "vitest";
import {
  categoryScore,
  isParserBlockingExternalScript,
  isScoreExcludedCheck,
  type SeoCheck,
} from "./seoAudit";

function performanceCheck(
  id: string,
  status: SeoCheck["status"],
  priority: SeoCheck["priority"] = "medium",
): SeoCheck {
  return {
    id,
    category: "performance",
    label: id,
    status,
    detail: id,
    priority,
  };
}

describe("SEO audit performance scoring", () => {
  it("keeps an unavailable PageSpeed measurement visible without reducing the category score", () => {
    const checks = [
      performanceCheck("pagespeed_unavailable", "warn", "high"),
      performanceCheck("render_blocking_ok", "pass"),
      performanceCheck("lazy_loading_ok", "pass"),
    ];

    expect(isScoreExcludedCheck(checks[0])).toBe(true);
    expect(categoryScore(checks, "performance")).toBe(100);
  });

  it("distinguishes genuine classic blocking scripts from module and deferred scripts", () => {
    expect(isParserBlockingExternalScript({ src: "/analytics.js" })).toBe(true);
    expect(isParserBlockingExternalScript({ src: "/app.js", type: "module" })).toBe(false);
    expect(isParserBlockingExternalScript({ src: "/analytics.js", async: "" })).toBe(false);
    expect(isParserBlockingExternalScript({ src: "/analytics.js", defer: "" })).toBe(false);
    expect(isParserBlockingExternalScript({ type: "application/ld+json" })).toBe(false);
  });
});
