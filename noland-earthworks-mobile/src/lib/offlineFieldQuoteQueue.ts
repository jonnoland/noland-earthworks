import { Preferences } from "@capacitor/preferences";

const QUEUE_KEY = "noland_field_offline_requests_v1";

export type OfflineFieldQuotePayload = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  serviceType?: string;
  acreage?: number;
  linearFeet?: number;
  quantitySource?: "measured" | "acreage_estimate";
  sourceAcreage?: number;
  clearingWidthFeet?: number;
  terrainType?: string;
  vegetationDensity?: string;
  vegetationTypes?: string;
  accessCondition?: string;
  obstacles?: string;
  proximityToStructures?: string;
  message?: string;
  photoUrls: string[];
  source: string;
};

export type OfflineFieldQuote = { id: string; createdAt: string; payload: OfflineFieldQuotePayload };

export async function readOfflineFieldQuoteQueue(): Promise<OfflineFieldQuote[]> {
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: OfflineFieldQuote[]) {
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
}

export async function enqueueOfflineFieldQuote(payload: OfflineFieldQuotePayload) {
  const queue = await readOfflineFieldQuoteQueue();
  const item = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), payload };
  await writeQueue([...queue, item]);
  return item;
}

export async function removeOfflineFieldQuote(id: string) {
  const queue = await readOfflineFieldQuoteQueue();
  await writeQueue(queue.filter((item) => item.id !== id));
}
