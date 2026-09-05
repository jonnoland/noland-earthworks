import type { QuotePortalLineItem } from "../shared/quotePortalPhases";

export type CustomerQuotePhotoReference = {
  url: string;
  filename: string;
  caption: string;
  tags: string[];
};

export type NativeQuoteRevisionSnapshot = {
  snapshotVersion: 1;
  revisionNumber: number;
  sentAt: string;
  clientName: string;
  title: string;
  serviceType: string | null;
  acreage: string | null;
  propertyAddress: string | null;
  estimatedDuration: string | null;
  clientMessage: string | null;
  lineItems: QuotePortalLineItem[];
  includedRentalCustomerChargeCents: number;
  totalCents: number;
  sitePhotoReferences: CustomerQuotePhotoReference[];
};

export function buildNativeQuoteRevisionSnapshot(input: Omit<NativeQuoteRevisionSnapshot, "snapshotVersion">): NativeQuoteRevisionSnapshot {
  return { snapshotVersion: 1, ...input };
}

export function parseNativeQuoteRevisionSnapshot(raw: string | null | undefined): NativeQuoteRevisionSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<NativeQuoteRevisionSnapshot>;
    if (
      parsed.snapshotVersion !== 1 ||
      !Number.isInteger(parsed.revisionNumber) ||
      typeof parsed.sentAt !== "string" ||
      typeof parsed.clientName !== "string" ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.lineItems) ||
      !Number.isInteger(parsed.includedRentalCustomerChargeCents) ||
      !Number.isInteger(parsed.totalCents) ||
      !Array.isArray(parsed.sitePhotoReferences)
    ) return null;
    return parsed as NativeQuoteRevisionSnapshot;
  } catch {
    return null;
  }
}
