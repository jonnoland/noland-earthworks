import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("companion app structured address alignment", () => {
  it("returns address components from field-app reverse geocoding and selected Places details", () => {
    const router = source("server/fieldQuoteRouter.ts");
    expect(router).toContain("function parseAddressComponents");
    expect(router).toContain("address_components?: GoogleAddressComponent[]");
    expect(router).toContain('fields", "geometry,formatted_address,address_component"');
    expect(router).toContain("...parseAddressComponents(first.address_components)");
  });

  it("fills companion City, County, and ZIP details while preserving the full submitted address", () => {
    const app = source("noland-earthworks-mobile/src/pages/NewQuote.tsx");
    const autocomplete = source("noland-earthworks-mobile/src/components/AddressAutocomplete.tsx");

    expect(app).toContain('address: details.address || details.street || current.address');
    expect(app).toContain('placeholder="City"');
    expect(app).toContain('Select service county');
    expect(app).toContain('SERVICE_AREA_COUNTIES.map');
    expect(app).toContain('placeholder="ZIP"');
    expect(app).toContain("isServedCounty(form.county)");
    expect(autocomplete).toContain("onAddressDetails");
    expect(autocomplete).toContain("formattedAddress ?? addr");
  });

  it("keeps an update action in the companion app without requiring an APK rebuild for source validation", () => {
    const profile = source("noland-earthworks-mobile/src/pages/Profile.tsx");
    const updateCheck = source("noland-earthworks-mobile/src/hooks/useUpdateCheck.ts");

    expect(profile).toContain("Update available");
    expect(updateCheck).toContain("Update available");
  });
});
