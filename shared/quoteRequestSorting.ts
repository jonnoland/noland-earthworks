export const WEBSITE_REQUESTS_REFRESH_INTERVAL_MS = 15_000;

export type ConfidenceSortableQuote = {
  aiRangeConfidenceScore?: number | null;
  createdAt: Date | string;
};

function scoreOrUnscored(quote: ConfidenceSortableQuote): number {
  const score = quote.aiRangeConfidenceScore;
  return typeof score === "number" && Number.isFinite(score) ? score : -1;
}

export function compareQuotesByConfidence(a: ConfidenceSortableQuote, b: ConfidenceSortableQuote): number {
  const scoreDifference = scoreOrUnscored(b) - scoreOrUnscored(a);
  if (scoreDifference !== 0) return scoreDifference;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function sortQuotesByConfidence<T extends ConfidenceSortableQuote>(quotes: T[]): T[] {
  return [...quotes].sort(compareQuotesByConfidence);
}

export function sortWebsiteRequests<T extends ConfidenceSortableQuote>(requests: T[], sortBy: "newest" | "confidence"): T[] {
  if (sortBy === "confidence") return sortQuotesByConfidence(requests);
  return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
