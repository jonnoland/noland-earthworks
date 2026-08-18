import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Site Visit form layout", () => {
  it("keeps service-area county selection while removing the crowding mini-map panel", () => {
    const form = readFileSync(resolve(import.meta.dirname, "../client/src/pages/Quote.tsx"), "utf8");

    expect(form).toContain('Select a service-area county');
    expect(form).toContain('SERVICE_AREA_COUNTIES.map');
    expect(form).not.toContain('ServiceAreaMiniMap');
    expect(form).not.toContain('sm:grid-cols-[1.5fr_0.5fr]');
  });
});
