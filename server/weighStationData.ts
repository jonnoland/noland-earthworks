/**
 * Weigh Station Dataset — TN and surrounding states
 * Sources: TN.gov CVE, coopsareopen.com, Drivewyze PreClear coverage
 * Coordinates are approximate centerpoints for each station.
 * PrePass/Drivewyze bypass eligibility noted where confirmed.
 */

export interface WeighStation {
  id: string;
  name: string;
  state: string;
  highway: string;
  direction: "NB" | "SB" | "EB" | "WB" | "BOTH";
  milepost: number | null;
  lat: number;
  lng: number;
  city: string;
  phone?: string;
  prepassEligible: boolean; // Drivewyze/PrePass bypass available
  notes?: string;
}

export const WEIGH_STATIONS: WeighStation[] = [
  // ── TENNESSEE ─────────────────────────────────────────────────────────────
  {
    id: "tn-i40-wb-307",
    name: "Monterey Scale House",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 307,
    lat: 36.1495,
    lng: -85.2641,
    city: "Monterey",
    prepassEligible: false,
  },
  {
    id: "tn-i40-eb-49",
    name: "Haywood County Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 49.5,
    lat: 35.5951,
    lng: -89.2612,
    city: "Brownsville",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible",
  },
  {
    id: "tn-i40-wb-50",
    name: "Haywood County Scale House (WB)",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 50,
    lat: 35.5940,
    lng: -89.2640,
    city: "Brownsville",
    prepassEligible: false,
  },
  {
    id: "tn-i40-eb-103",
    name: "Poplar Springs Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 103,
    lat: 35.6508,
    lng: -88.3912,
    city: "Lexington",
    prepassEligible: false,
  },
  {
    id: "tn-i40-wb-102",
    name: "Poplar Springs Scale House (WB)",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 102.5,
    lat: 35.6510,
    lng: -88.3950,
    city: "Lexington",
    prepassEligible: false,
  },
  {
    id: "tn-i40-eb-226",
    name: "Mount Juliet Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 226,
    lat: 36.2001,
    lng: -86.5190,
    city: "Mount Juliet",
    prepassEligible: false,
  },
  {
    id: "tn-i40-wb-228",
    name: "Mount Juliet Scale House (WB)",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 228,
    lat: 36.2010,
    lng: -86.5050,
    city: "Mount Juliet",
    prepassEligible: false,
  },
  {
    id: "tn-i40-eb-252",
    name: "New Middleton Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 252.25,
    lat: 36.1620,
    lng: -86.0750,
    city: "New Middleton",
    prepassEligible: false,
    notes: "East of Lebanon",
  },
  {
    id: "tn-i40-wb-252",
    name: "New Middleton Scale House (WB)",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 252.5,
    lat: 36.1625,
    lng: -86.0720,
    city: "New Middleton",
    prepassEligible: false,
    notes: "East of Lebanon",
  },
  {
    id: "tn-i40-eb-336",
    name: "Ozone Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 336,
    lat: 35.9350,
    lng: -84.7420,
    city: "Rockwood",
    prepassEligible: false,
  },
  {
    id: "tn-i40-eb-372",
    name: "Knox County Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 372,
    lat: 35.9462,
    lng: -83.8710,
    city: "Knoxville",
    phone: "(865) 594-0920",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible. 3.5 miles east of I-40/I-75 junction.",
  },
  {
    id: "tn-i40-wb-372",
    name: "Knox County Scale House (WB)",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 372,
    lat: 35.9465,
    lng: -83.8680,
    city: "Knoxville",
    phone: "(865) 594-0910",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible.",
  },
  {
    id: "tn-i40-eb-441",
    name: "Hartford Scale House (EB)",
    state: "TN",
    highway: "I-40",
    direction: "EB",
    milepost: 441,
    lat: 35.7980,
    lng: -83.0350,
    city: "Newport",
    prepassEligible: false,
  },
  {
    id: "tn-i40-wb-441",
    name: "Hartford Scale House (WB)",
    state: "TN",
    highway: "I-40",
    direction: "WB",
    milepost: 441,
    lat: 35.7985,
    lng: -83.0320,
    city: "Newport",
    prepassEligible: false,
  },
  {
    id: "tn-i24-wb-115",
    name: "Coffee County Scale House (WB)",
    state: "TN",
    highway: "I-24",
    direction: "WB",
    milepost: 115,
    lat: 35.4812,
    lng: -86.0850,
    city: "Manchester",
    phone: "(931) 393-0788",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible. THP District 2 headquarters.",
  },
  {
    id: "tn-i24-eb-115",
    name: "Coffee County Scale House (EB)",
    state: "TN",
    highway: "I-24",
    direction: "EB",
    milepost: 115,
    lat: 35.4815,
    lng: -86.0820,
    city: "Manchester",
    prepassEligible: false,
  },
  {
    id: "tn-i65-nb-5",
    name: "Giles County Scale House (NB)",
    state: "TN",
    highway: "I-65",
    direction: "NB",
    milepost: 5,
    lat: 35.0012,
    lng: -86.8940,
    city: "Ardmore",
    phone: "(931) 424-0420",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible. THP District 7 headquarters.",
  },
  {
    id: "tn-i65-nb-119",
    name: "Robertson County Scale House (NB)",
    state: "TN",
    highway: "I-65",
    direction: "NB",
    milepost: 119,
    lat: 36.5120,
    lng: -86.5130,
    city: "Portland",
    phone: "(615) 325-0424",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible. THP District 3 headquarters.",
  },
  {
    id: "tn-i65-sb-120",
    name: "Robertson County Scale House (SB)",
    state: "TN",
    highway: "I-65",
    direction: "SB",
    milepost: 120,
    lat: 36.5115,
    lng: -86.5140,
    city: "Portland",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible.",
  },
  {
    id: "tn-i81-sb-21",
    name: "Greene County Scale House (SB)",
    state: "TN",
    highway: "I-81",
    direction: "SB",
    milepost: 21,
    lat: 36.2180,
    lng: -82.9350,
    city: "Mosheim",
    phone: "(423) 235-4104",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible. THP District 5 headquarters.",
  },
  {
    id: "tn-i75-nb-23",
    name: "Cleveland Scale House (NB)",
    state: "TN",
    highway: "I-75",
    direction: "NB",
    milepost: 23.5,
    lat: 35.1650,
    lng: -84.8720,
    city: "Cleveland",
    prepassEligible: false,
  },
  {
    id: "tn-i75-sb-13",
    name: "Cleveland Scale House (SB)",
    state: "TN",
    highway: "I-75",
    direction: "SB",
    milepost: 13,
    lat: 35.0820,
    lng: -84.9010,
    city: "Cleveland",
    prepassEligible: false,
  },

  // ── KENTUCKY (near TN border, within ~150 miles) ───────────────────────────
  {
    id: "ky-i65-nb-4",
    name: "Simpson County Scale House (NB)",
    state: "KY",
    highway: "I-65",
    direction: "NB",
    milepost: 4,
    lat: 36.7380,
    lng: -86.5720,
    city: "Franklin",
    prepassEligible: false,
    notes: "Just north of TN border",
  },
  {
    id: "ky-i65-nb-89",
    name: "Elizabethtown Scale House (NB)",
    state: "KY",
    highway: "I-65",
    direction: "NB",
    milepost: 89.5,
    lat: 37.6940,
    lng: -85.8590,
    city: "Elizabethtown",
    prepassEligible: false,
    notes: "Junction of I-65 and Western KY Parkway",
  },
  {
    id: "ky-i65-sb-89",
    name: "Elizabethtown Scale House (SB)",
    state: "KY",
    highway: "I-65",
    direction: "SB",
    milepost: 89.5,
    lat: 37.6935,
    lng: -85.8600,
    city: "Elizabethtown",
    prepassEligible: false,
  },
  {
    id: "ky-i24-eb-36",
    name: "Lyon County Scale House (EB)",
    state: "KY",
    highway: "I-24",
    direction: "EB",
    milepost: 36,
    lat: 37.0280,
    lng: -88.0820,
    city: "Kuttawa",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible",
  },
  {
    id: "ky-i24-wb-36",
    name: "Lyon County Scale House (WB)",
    state: "KY",
    highway: "I-24",
    direction: "WB",
    milepost: 36,
    lat: 37.0285,
    lng: -88.0850,
    city: "Kuttawa",
    prepassEligible: false,
  },
  {
    id: "ky-i75-nb-33",
    name: "Laurel County Scale House (NB)",
    state: "KY",
    highway: "I-75",
    direction: "NB",
    milepost: 33.5,
    lat: 37.1280,
    lng: -84.0820,
    city: "London",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible",
  },
  {
    id: "ky-i75-sb-34",
    name: "Laurel County Scale House (SB)",
    state: "KY",
    highway: "I-75",
    direction: "SB",
    milepost: 34,
    lat: 37.1275,
    lng: -84.0810,
    city: "London",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible",
  },

  // ── ALABAMA (near TN border) ───────────────────────────────────────────────
  {
    id: "al-i65-nb-355",
    name: "Athens Scale House (NB)",
    state: "AL",
    highway: "I-65",
    direction: "NB",
    milepost: 355.5,
    lat: 34.7980,
    lng: -86.9720,
    city: "Athens",
    prepassEligible: false,
  },
  {
    id: "al-i65-sb-355",
    name: "Athens Scale House (SB)",
    state: "AL",
    highway: "I-65",
    direction: "SB",
    milepost: 355.5,
    lat: 34.7975,
    lng: -86.9730,
    city: "Athens",
    prepassEligible: false,
  },
  {
    id: "al-i65-nb-278",
    name: "Morris Scale House (NB)",
    state: "AL",
    highway: "I-65",
    direction: "NB",
    milepost: 278,
    lat: 33.7580,
    lng: -86.8120,
    city: "Morris",
    prepassEligible: false,
  },
  {
    id: "al-i65-sb-278",
    name: "Morris Scale House (SB)",
    state: "AL",
    highway: "I-65",
    direction: "SB",
    milepost: 278,
    lat: 33.7575,
    lng: -86.8130,
    city: "Morris",
    prepassEligible: false,
  },

  // ── MISSISSIPPI (near TN border) ───────────────────────────────────────────
  {
    id: "ms-i55-nb-291",
    name: "Hernando Scale House (NB)",
    state: "MS",
    highway: "I-55",
    direction: "NB",
    milepost: 291,
    lat: 34.8350,
    lng: -90.0020,
    city: "Hernando",
    prepassEligible: false,
    notes: "Near TN/MS border",
  },
  {
    id: "ms-i55-sb-291",
    name: "Hernando Scale House (SB)",
    state: "MS",
    highway: "I-55",
    direction: "SB",
    milepost: 291,
    lat: 34.8345,
    lng: -90.0030,
    city: "Hernando",
    prepassEligible: false,
  },
  {
    id: "ms-i22-eb-100",
    name: "Booneville Scale House (EB)",
    state: "MS",
    highway: "I-22",
    direction: "EB",
    milepost: 100,
    lat: 34.6580,
    lng: -88.5620,
    city: "Booneville",
    prepassEligible: false,
  },

  // ── ARKANSAS (near TN border via I-40) ────────────────────────────────────
  {
    id: "ar-i40-eb-273",
    name: "Lehi Scale House (EB)",
    state: "AR",
    highway: "I-40",
    direction: "EB",
    milepost: 273,
    lat: 35.1420,
    lng: -90.1820,
    city: "West Memphis",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible. Near TN/AR border.",
  },
  {
    id: "ar-i40-wb-283",
    name: "Riverside Scale House (WB)",
    state: "AR",
    highway: "I-40",
    direction: "WB",
    milepost: 283,
    lat: 35.1450,
    lng: -90.0850,
    city: "West Memphis",
    prepassEligible: true,
    notes: "Drivewyze PreClear eligible.",
  },
];

/**
 * Returns weigh stations within a given bounding box (lat/lng bounds).
 * Used to filter stations relevant to a route.
 */
export function getStationsInBounds(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number
): WeighStation[] {
  return WEIGH_STATIONS.filter(
    (s) =>
      s.lat >= minLat &&
      s.lat <= maxLat &&
      s.lng >= minLng &&
      s.lng <= maxLng
  );
}

/**
 * Returns the distance in miles between two lat/lng points (Haversine).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Finds weigh stations within `radiusMiles` of any point in a route polyline.
 * `routePoints` is an array of {lat, lng} decoded from the Google Directions polyline.
 */
export function findStationsAlongRoute(
  routePoints: Array<{ lat: number; lng: number }>,
  radiusMiles = 1.5
): WeighStation[] {
  if (routePoints.length === 0) return [];

  // Build bounding box with padding
  const lats = routePoints.map((p) => p.lat);
  const lngs = routePoints.map((p) => p.lng);
  const pad = 0.05;
  const candidates = getStationsInBounds(
    Math.min(...lats) - pad,
    Math.max(...lats) + pad,
    Math.min(...lngs) - pad,
    Math.max(...lngs) + pad
  );

  // For each candidate, check if any route point is within radiusMiles
  return candidates.filter((station) =>
    routePoints.some(
      (pt) =>
        haversineDistance(pt.lat, pt.lng, station.lat, station.lng) <=
        radiusMiles
    )
  );
}
