/**
 * Tennessee Sales Tax Rates by County
 * Source: TN Department of Revenue — Streamlined Sales Tax Rate Database (Q1 2025)
 * State rate: 7.00% (flat statewide)
 * Local rate: varies by county (0.20% – 2.75%)
 *
 * NOTE: Forestry mulching, land clearing, and brush hogging are services performed
 * on real property and are generally NOT subject to Tennessee sales tax.
 * This data is provided for reference only — apply only to taxable line items
 * (e.g., materials, equipment rental, or other tangible goods).
 *
 * Rates updated: March 2025 (Q1 2025). Check TN Revenue quarterly for updates.
 */

export interface TnTaxRate {
  county: string;
  stateTax: number;  // Always 0.07 (7%)
  localTax: number;  // County local rate
  totalTax: number;  // Combined rate
}

/** All 95 Tennessee counties with current combined sales tax rates */
export const TN_COUNTY_TAX_RATES: Record<string, TnTaxRate> = {
  "Anderson":    { county: "Anderson",    stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Bedford":     { county: "Bedford",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Benton":      { county: "Benton",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Bledsoe":     { county: "Bledsoe",     stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Blount":      { county: "Blount",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Bradley":     { county: "Bradley",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Campbell":    { county: "Campbell",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Cannon":      { county: "Cannon",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Carroll":     { county: "Carroll",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Carter":      { county: "Carter",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Cheatham":    { county: "Cheatham",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Chester":     { county: "Chester",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Claiborne":   { county: "Claiborne",   stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Clay":        { county: "Clay",        stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Cocke":       { county: "Cocke",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Coffee":      { county: "Coffee",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Crockett":    { county: "Crockett",    stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Cumberland":  { county: "Cumberland",  stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Davidson":    { county: "Davidson",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Decatur":     { county: "Decatur",     stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "DeKalb":      { county: "DeKalb",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Dickson":     { county: "Dickson",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Dyer":        { county: "Dyer",        stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Fayette":     { county: "Fayette",     stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Fentress":    { county: "Fentress",    stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Franklin":    { county: "Franklin",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Gibson":      { county: "Gibson",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Giles":       { county: "Giles",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Grainger":    { county: "Grainger",    stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Greene":      { county: "Greene",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Grundy":      { county: "Grundy",      stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Hamblen":     { county: "Hamblen",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Hamilton":    { county: "Hamilton",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Hancock":     { county: "Hancock",     stateTax: 0.07, localTax: 0.02,   totalTax: 0.09   },
  "Hardeman":    { county: "Hardeman",    stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Hardin":      { county: "Hardin",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Hawkins":     { county: "Hawkins",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Haywood":     { county: "Haywood",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Henderson":   { county: "Henderson",   stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Henry":       { county: "Henry",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Hickman":     { county: "Hickman",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Houston":     { county: "Houston",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Humphreys":   { county: "Humphreys",   stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Jackson":     { county: "Jackson",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Jefferson":   { county: "Jefferson",   stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Johnson":     { county: "Johnson",     stateTax: 0.07, localTax: 0.02,   totalTax: 0.09   },
  "Knox":        { county: "Knox",        stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Lake":        { county: "Lake",        stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Lauderdale":  { county: "Lauderdale",  stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Lawrence":    { county: "Lawrence",    stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Lewis":       { county: "Lewis",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Lincoln":     { county: "Lincoln",     stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Loudon":      { county: "Loudon",      stateTax: 0.07, localTax: 0.02,   totalTax: 0.09   },
  "McMinn":      { county: "McMinn",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "McNairy":     { county: "McNairy",     stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Macon":       { county: "Macon",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Madison":     { county: "Madison",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Marion":      { county: "Marion",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Marshall":    { county: "Marshall",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Maury":       { county: "Maury",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Meigs":       { county: "Meigs",       stateTax: 0.07, localTax: 0.02,   totalTax: 0.09   },
  "Monroe":      { county: "Monroe",      stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Montgomery":  { county: "Montgomery",  stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Moore":       { county: "Moore",       stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Morgan":      { county: "Morgan",      stateTax: 0.07, localTax: 0.02,   totalTax: 0.09   },
  "Obion":       { county: "Obion",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Overton":     { county: "Overton",     stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Perry":       { county: "Perry",       stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Pickett":     { county: "Pickett",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Polk":        { county: "Polk",        stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Putnam":      { county: "Putnam",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Rhea":        { county: "Rhea",        stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Roane":       { county: "Roane",       stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Robertson":   { county: "Robertson",   stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Rutherford":  { county: "Rutherford",  stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Scott":       { county: "Scott",       stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Sequatchie":  { county: "Sequatchie",  stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Sevier":      { county: "Sevier",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Shelby":      { county: "Shelby",      stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Smith":       { county: "Smith",       stateTax: 0.07, localTax: 0.02,   totalTax: 0.09   },
  "Stewart":     { county: "Stewart",     stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Sullivan":    { county: "Sullivan",    stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Sumner":      { county: "Sumner",      stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Tipton":      { county: "Tipton",      stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Trousdale":   { county: "Trousdale",   stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Unicoi":      { county: "Unicoi",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Union":       { county: "Union",       stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Van Buren":   { county: "Van Buren",   stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Warren":      { county: "Warren",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Washington":  { county: "Washington",  stateTax: 0.07, localTax: 0.025,  totalTax: 0.095  },
  "Wayne":       { county: "Wayne",       stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Weakley":     { county: "Weakley",     stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "White":       { county: "White",       stateTax: 0.07, localTax: 0.0225, totalTax: 0.0925 },
  "Williamson":  { county: "Williamson",  stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
  "Wilson":      { county: "Wilson",      stateTax: 0.07, localTax: 0.0275, totalTax: 0.0975 },
};

/** Sorted list of all Tennessee county names for dropdowns */
export const TN_COUNTY_NAMES = Object.keys(TN_COUNTY_TAX_RATES).sort();

/**
 * Look up the tax rate for a given Tennessee county name.
 * Returns null if the county is not found.
 */
export function getTnCountyTaxRate(countyName: string): TnTaxRate | null {
  // Normalize: trim, title-case first letter of each word
  const normalized = countyName.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  return TN_COUNTY_TAX_RATES[normalized] ?? null;
}

/**
 * Format a tax rate as a percentage string, e.g. 0.0975 → "9.75%"
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
}
