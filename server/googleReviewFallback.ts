export type GoogleReview = {
  reviewId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  starRating: number;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
};

export type GoogleReviewSyncState =
  | "live"
  | "not_connected"
  | "location_required"
  | "rate_limited"
  | "service_unavailable"
  | "fallback";

export type GoogleReviewSync = {
  state: GoogleReviewSyncState;
  source: "business_profile" | "places" | "unavailable";
  message: string;
};

export type GoogleReviewFetchResult = {
  reviews: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number | null;
  sync: GoogleReviewSync;
};

export function googleReviewSync(
  state: GoogleReviewSyncState,
  message: string,
  source: GoogleReviewSync["source"] = "business_profile"
): GoogleReviewSync {
  return { state, source, message };
}

export function emptyGoogleReviewFetch(sync: GoogleReviewSync): GoogleReviewFetchResult {
  return { reviews: [], averageRating: null, totalReviewCount: null, sync };
}
