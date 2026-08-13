export type GooglePlaceAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type ParsedGooglePlaceAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

export type GooglePlaceCoordinates = { lat: number; lng: number };

export function parseGooglePlaceCoordinates(location: { lat?: number; lng?: number } | undefined): GooglePlaceCoordinates | null {
  if (typeof location?.lat !== "number" || typeof location.lng !== "number") return null;
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return null;
  return { lat: location.lat, lng: location.lng };
}

export function parseGooglePlaceAddress(components: GooglePlaceAddressComponent[] | undefined): ParsedGooglePlaceAddress {
  const find = (type: string) => components?.find((component) => component.types.includes(type));
  const streetNumber = find("street_number")?.long_name ?? "";
  const route = find("route")?.long_name ?? "";
  const postalCode = find("postal_code")?.long_name ?? "";
  const postalSuffix = find("postal_code_suffix")?.long_name ?? "";
  const county = (find("administrative_area_level_2")?.long_name ?? "").replace(/\s+County$/i, "");

  return {
    street: [streetNumber, route].filter(Boolean).join(" "),
    city: find("locality")?.long_name ?? find("postal_town")?.long_name ?? find("sublocality")?.long_name ?? "",
    state: find("administrative_area_level_1")?.short_name ?? "",
    zip: postalSuffix && postalCode ? `${postalCode}-${postalSuffix}` : postalCode,
    county,
  };
}
