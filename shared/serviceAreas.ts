/** Approved counties for on-site work, aligned with the published 35-county service map. */
export const SERVICE_AREA_COUNTIES = [
  "Bedford County", "Benton County", "Cannon County", "Carroll County", "Cheatham County",
  "Chester County", "Davidson County", "Decatur County", "Dickson County", "Gibson County",
  "Giles County", "Hardin County", "Henderson County", "Henry County", "Hickman County",
  "Houston County", "Humphreys County", "Lawrence County", "Lewis County", "Lincoln County",
  "Madison County", "Marshall County", "Maury County", "Montgomery County", "Moore County",
  "Perry County", "Robertson County", "Rutherford County", "Stewart County", "Sumner County",
  "Trousdale County", "Wayne County", "Weakley County", "Williamson County", "Wilson County",
] as const;

export type ServiceAreaCounty = typeof SERVICE_AREA_COUNTIES[number];

export function normalizeCountyName(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.toLowerCase().endsWith(" county") ? compact : `${compact} County`;
}

export function isServedCounty(value: string): value is ServiceAreaCounty {
  const normalized = normalizeCountyName(value).toLowerCase();
  return SERVICE_AREA_COUNTIES.some((county) => county.toLowerCase() === normalized);
}
