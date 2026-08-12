/**
 * Canonical customer-facing service names shared by website intake and ops records.
 * URLs and internal slugs may remain stable for SEO and backwards compatibility.
 */
const SERVICE_NAMES: Record<string, string> = {
  "forestry-mulching": "Forestry Mulching",
  "forestry mulching": "Forestry Mulching",
  "land-management": "Land Management",
  "land management": "Land Management",
  "land-clearing": "Land Management",
  "land clearing": "Land Management",
  "forestry mulching / land management": "Land Management",
  "vegetation-management": "Vegetation Management",
  "vegetation management": "Vegetation Management",
  "right-of-way-clearing": "Right-of-Way Clearing",
  "right of way clearing": "Right-of-Way Clearing",
  "right-of-way clearing": "Right-of-Way Clearing",
  "trail-cutting": "Trail Cutting",
  "trail cutting": "Trail Cutting",
  "property-maintenance": "Brush Hogging",
  "property maintenance": "Brush Hogging",
  "brush-hogging": "Brush Hogging",
  "brush hogging": "Brush Hogging",
  "stump-grinding": "Stump Grinding",
  "stump grinding": "Stump Grinding",
  multiple: "Multiple Services",
  "multiple services": "Multiple Services",
};

export function getServiceDisplayName(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "Service to be confirmed";
  return SERVICE_NAMES[raw.toLowerCase()] ?? raw;
}
