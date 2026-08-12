export type GooglePlaceV1Review = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  publishTime?: string;
  authorAttribution?: { displayName?: string; photoUri?: string };
};

export function mapGooglePlaceV1Review(review: GooglePlaceV1Review, index: number) {
  return {
    id: review.name ?? `google-${review.publishTime ?? index}`,
    reviewerName: review.authorAttribution?.displayName ?? "Google User",
    reviewerPhotoUrl: review.authorAttribution?.photoUri,
    rating: review.rating ?? 0,
    body: review.text?.text ?? "",
    reviewedAt: review.publishTime ?? new Date(0).toISOString(),
  };
}
