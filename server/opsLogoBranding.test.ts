import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const opsLogo = "/manus-storage/ops-brand-logo_c03a1088.png";

describe("Operations logo-only branding", () => {
  it("uses the provided logo in both shared Operations layouts", () => {
    const precisionLayout = source("client/src/components/OpsDashboardLayout.tsx");
    const legacyLayout = source("client/src/components/DashboardLayout.tsx");

    expect(precisionLayout).toContain(opsLogo);
    expect(legacyLayout).toContain(opsLogo);
  });

  it("does not render a separate text brand beside the provided logo in the primary Operations layout", () => {
    const precisionLayout = source("client/src/components/OpsDashboardLayout.tsx");

    expect(precisionLayout).not.toContain('<span className="text-primary">Noland</span> Earthworks');
    expect(precisionLayout).not.toContain('text-[10px] text-muted-foreground leading-tight">LLC</span>');
  });
});
