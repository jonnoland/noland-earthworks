export interface OnxSiteWalkWaypointInput {
  parcelId?: string | null;
  county?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanSegment(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function onxSiteWalkWaypointName(input: OnxSiteWalkWaypointInput): string {
  const parcelId = cleanSegment(input.parcelId);
  const county = cleanSegment(input.county);
  if (parcelId && county) return `Noland Site Walk — ${county} ${parcelId}`;
  if (parcelId) return `Noland Site Walk — Parcel ${parcelId}`;
  return "Noland Site Walk — Property";
}

export function onxSiteWalkWaypointFileName(input: OnxSiteWalkWaypointInput): string {
  const parcelId = cleanSegment(input.parcelId).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `noland-site-walk${parcelId ? `-${parcelId}` : "-property"}.gpx`;
}

/**
 * onX Offroad mobile supports GPX import. This creates a single property
 * waypoint for the user to import before walking and drawing the work-area
 * shape in onX. It intentionally does not claim to synchronize onX data.
 */
export function buildOnxSiteWalkWaypointGpx(input: OnxSiteWalkWaypointInput): string {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("A property location is required before creating an onX waypoint.");
  }

  const name = onxSiteWalkWaypointName(input);
  const address = cleanSegment(input.address);
  const county = cleanSegment(input.county);
  const parcelId = cleanSegment(input.parcelId);
  const description = [
    "Noland Field site-walk starting point.",
    address && `Property: ${address}.`,
    county && `County: ${county}.`,
    parcelId && `Parcel ID: ${parcelId}.`,
    "In onX Offroad, walk the actual work boundary and use Area Shape to measure the mulching area.",
    "Return to Noland Field and enter the measured work-area acres; do not use deeded acreage unless it matches the work scope.",
  ].filter(Boolean).join(" ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Noland Field" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="${input.latitude.toFixed(6)}" lon="${input.longitude.toFixed(6)}">
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(description)}</desc>
  </wpt>
</gpx>`;
}
