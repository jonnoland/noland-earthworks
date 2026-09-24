export type CountyParcelPortal = {
  county: string;
  portalUrl: string;
  portalLabel: string;
  shortLabel: string;
  searchCapabilities: readonly string[];
  /** Whether the Operations Parcel ID lookup already retrieves the county record. */
  operationsLookupSupported: boolean;
  /** Whether Noland Field can retrieve the county record without opening the official portal. */
  fieldLookupSupported: boolean;
};

/**
 * Tennessee Property Boundaries Public Use covers 86 counties. These counties
 * use their own property-assessment systems, so their official record portal is
 * shown in the quote workflow instead of sending an unsupported lookup to the
 * statewide service. Parcel and boundary data remain reference-only, not a
 * legal survey.
 */
export const COUNTY_PARCEL_PORTALS: readonly CountyParcelPortal[] = [
  {
    county: "Chester County",
    portalUrl: "https://chester.capturecama.com/",
    portalLabel: "Chester County Citizen Access Portal",
    shortLabel: "Chester County Property Search",
    searchCapabilities: ["owner", "parcel number", "property address", "map and parcel"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Davidson County",
    portalUrl: "https://portal.padctn.org/OFS/WP/Home",
    portalLabel: "Metro Nashville & Davidson County Real Property Search",
    shortLabel: "Metro Nashville Property Search",
    searchCapabilities: ["owner", "address", "Parcel ID"],
    operationsLookupSupported: true,
    fieldLookupSupported: false,
  },
  {
    county: "Hamilton County",
    portalUrl: "https://assessor.hamiltontn.gov/search",
    portalLabel: "Hamilton County Assessor of Property Search",
    shortLabel: "Hamilton County Property Search",
    searchCapabilities: ["parcel", "street address", "owner"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Hickman County",
    portalUrl: "https://hickman.capturecama.com/",
    portalLabel: "Hickman County Citizen Access Portal",
    shortLabel: "Hickman County Property Search",
    searchCapabilities: ["owner", "parcel number", "property address", "map and parcel"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Knox County",
    portalUrl: "https://www.kgis.org/kgismaps/",
    portalLabel: "KGIS Maps",
    shortLabel: "Knox County KGIS Maps",
    searchCapabilities: ["address", "Parcel ID", "owner", "map"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Montgomery County",
    portalUrl: "https://property.spatialest.com/tn/montgomery#/",
    portalLabel: "Montgomery County Online Property Record Card",
    shortLabel: "Montgomery County Property Search",
    searchCapabilities: ["property search", "search filter", "map"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Rutherford County",
    portalUrl: "https://secured.rutherfordcountytn.gov/OFS/WP/Home",
    portalLabel: "Rutherford County Property Data Search",
    shortLabel: "Rutherford County Property Search",
    searchCapabilities: ["owner", "street address", "map and parcel"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Shelby County",
    portalUrl: "https://gis.register.shelby.tn.us/",
    portalLabel: "Shelby County Register of Deeds GIS",
    shortLabel: "Shelby County GIS Search",
    searchCapabilities: ["address", "owner", "parcel number", "tax map"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
  {
    county: "Williamson County",
    portalUrl: "https://inigo.williamson-tn.org/property_search/",
    portalLabel: "Williamson County Property Search",
    shortLabel: "Williamson County Property Search",
    searchCapabilities: ["owner", "property address", "map", "parcel"],
    operationsLookupSupported: false,
    fieldLookupSupported: false,
  },
] as const;

function countyKey(value?: string | null): string {
  return (value ?? "").trim().replace(/\s+county$/i, "").toLowerCase();
}

/** Returns the official county portal only for counties excluded from the statewide service. */
export function getCountyParcelPortal(county?: string | null): CountyParcelPortal | null {
  const key = countyKey(county);
  return COUNTY_PARCEL_PORTALS.find((portal) => countyKey(portal.county) === key) ?? null;
}

export function isStatewideParcelCoverageException(county?: string | null): boolean {
  return getCountyParcelPortal(county) !== null;
}
