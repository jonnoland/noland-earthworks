export const SERVICE_AREA_COUNTIES = [
  "Bedford County", "Benton County", "Cannon County", "Carroll County", "Cheatham County", "Chester County", "Davidson County", "Decatur County", "Dickson County", "Gibson County", "Giles County", "Hardin County", "Henderson County", "Henry County", "Hickman County", "Houston County", "Humphreys County", "Lawrence County", "Lewis County", "Lincoln County", "Madison County", "Marshall County", "Maury County", "Montgomery County", "Moore County", "Perry County", "Robertson County", "Rutherford County", "Stewart County", "Sumner County", "Trousdale County", "Wayne County", "Weakley County", "Williamson County", "Wilson County",
] as const;

export function normalizeCountyName(value?: string | null) {
  const cleaned = (value ?? "").trim().replace(/\s+county$/i, "");
  if (!cleaned) return "";
  return `${cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())} County`;
}

export function isServedCounty(value?: string | null) {
  return SERVICE_AREA_COUNTIES.includes(normalizeCountyName(value) as typeof SERVICE_AREA_COUNTIES[number]);
}
