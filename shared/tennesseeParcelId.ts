export type TennesseeParcelIdValidation =
  | { valid: true; normalized: string }
  | { valid: false; normalized: string; error: string };

/**
 * Tennessee Parcel IDs are assigned locally by county assessors, so a single
 * statewide fixed-length rule would reject valid records. This validator
 * accepts county-style map/group/parcel components while rejecting characters
 * and shapes that cannot be sent safely to the official lookup service.
 */
export function normalizeTennesseeParcelId(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateTennesseeParcelId(value: string): TennesseeParcelIdValidation {
  const trimmed = value.trim();
  const normalized = normalizeTennesseeParcelId(trimmed);
  if (!trimmed) return { valid: false, normalized, error: "Enter a Parcel ID." };
  if (!/^[A-Za-z0-9 .\-/]+$/.test(trimmed)) {
    return { valid: false, normalized, error: "Parcel IDs may contain letters, numbers, spaces, periods, hyphens, or slashes only." };
  }
  if (normalized.length < 5 || normalized.length > 28) {
    return { valid: false, normalized, error: "Enter the complete Parcel ID shown by the selected county assessor." };
  }

  const components = trimmed.split(/[ .\-/]+/).filter(Boolean);
  if (components.length > 6 || components.some(component => component.length > 8)) {
    return { valid: false, normalized, error: "Use the county’s map, group, and parcel components as shown on the record." };
  }
  return { valid: true, normalized };
}
