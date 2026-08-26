export function normalizeParcelCounty(value: string | null | undefined): string {
  return (value ?? "")
    .toUpperCase()
    .replace(/\bCOUNTY\b/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function normalizeParcelStreet(value: string | null | undefined): string {
  return (value ?? "")
    .toUpperCase()
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bHIGHWAY\b/g, "HWY")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\bTRAIL\b/g, "TRL")
    .replace(/\bROUTE\b/g, "RTE")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

/**
 * A parcel is safe to attach automatically only when the returned Tennessee
 * parcel address and county agree with the submitted request. Everything else
 * remains available for manual Parcel ID review in Operations.
 */
export function isExactAddressParcelMatch(input: {
  submittedStreet: string;
  submittedCounty: string;
  parcelStreet: string | null | undefined;
  parcelCounty: string | null | undefined;
}): boolean {
  const submittedStreet = normalizeParcelStreet(input.submittedStreet);
  const parcelStreet = normalizeParcelStreet(input.parcelStreet);
  const submittedCounty = normalizeParcelCounty(input.submittedCounty);
  const parcelCounty = normalizeParcelCounty(input.parcelCounty);

  return Boolean(
    submittedStreet &&
    parcelStreet &&
    submittedStreet === parcelStreet &&
    submittedCounty &&
    submittedCounty === parcelCounty,
  );
}
