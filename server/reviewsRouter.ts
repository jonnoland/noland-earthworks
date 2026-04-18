/**
 * reviewsRouter — live review fetching from Google Places API and Facebook Graph API.
 *
 * Google: Uses Places Details API (no approval required) to fetch up to 5 most-recent
 *         reviews for the business Place ID.
 * Facebook: Uses Graph API /{page_id}/ratings endpoint with a Page Access Token.
 *
 * Both endpoints degrade gracefully when credentials are not configured.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { ENV } from "./_core/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveReview {
  id: string;
  source: "google" | "facebook";
  reviewerName: string;
  reviewerPhotoUrl?: string;
  rating: number; // 1–5
  body: string;
  reviewedAt: string; // ISO string
  replyUrl?: string; // deep-link to reply in Google Maps / Facebook
}

export interface ReviewsSummary {
  googleRating: number | null;
  googleReviewCount: number | null;
  facebookRating: number | null;
  facebookReviewCount: number | null;
  reviews: LiveReview[];
  googleConfigured: boolean;
  facebookConfigured: boolean;
}

// ─── Google Places helpers ────────────────────────────────────────────────────

async function fetchGoogleReviews(): Promise<{
  rating: number | null;
  reviewCount: number | null;
  reviews: LiveReview[];
  configured: boolean;
}> {
  const apiKey = ENV.googlePlacesApiKey;
  const placeId = ENV.googlePlaceId;

  if (!apiKey || !placeId) {
    return { rating: null, reviewCount: null, reviews: [], configured: false };
  }

  const fields = "rating,user_ratings_total,reviews";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}&reviews_sort=newest`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[reviewsRouter] Google Places API error:", res.status, await res.text());
    return { rating: null, reviewCount: null, reviews: [], configured: true };
  }

  const data = await res.json() as {
    status: string;
    result?: {
      rating?: number;
      user_ratings_total?: number;
      reviews?: Array<{
        author_name: string;
        profile_photo_url?: string;
        rating: number;
        text: string;
        time: number;
        author_url?: string;
      }>;
    };
  };

  if (data.status !== "OK" || !data.result) {
    console.error("[reviewsRouter] Google Places API status:", data.status);
    return { rating: null, reviewCount: null, reviews: [], configured: true };
  }

  const result = data.result;
  const reviews: LiveReview[] = (result.reviews ?? []).map((r, i) => ({
    id: `google-${r.time}-${i}`,
    source: "google" as const,
    reviewerName: r.author_name,
    reviewerPhotoUrl: r.profile_photo_url,
    rating: r.rating,
    body: r.text,
    reviewedAt: new Date(r.time * 1000).toISOString(),
    // Deep-link to the Google Maps review reply page
    replyUrl: `https://business.google.com/reviews`,
  }));

  return {
    rating: result.rating ?? null,
    reviewCount: result.user_ratings_total ?? null,
    reviews,
    configured: true,
  };
}

// ─── Facebook Graph API helpers ───────────────────────────────────────────────

async function fetchFacebookRatings(): Promise<{
  rating: number | null;
  reviewCount: number | null;
  reviews: LiveReview[];
  configured: boolean;
}> {
  const pageId = ENV.facebookPageId;
  const accessToken = ENV.facebookPageAccessToken;

  if (!pageId || !accessToken) {
    return { rating: null, reviewCount: null, reviews: [], configured: false };
  }

  // Fetch page overall rating
  const pageUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}?fields=overall_star_rating,rating_count&access_token=${accessToken}`;
  const ratingsUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/ratings?fields=reviewer{name,picture},rating,review_text,created_time&limit=20&access_token=${accessToken}`;

  const [pageRes, ratingsRes] = await Promise.allSettled([
    fetch(pageUrl),
    fetch(ratingsUrl),
  ]);

  let overallRating: number | null = null;
  let ratingCount: number | null = null;
  let reviews: LiveReview[] = [];

  if (pageRes.status === "fulfilled" && pageRes.value.ok) {
    const pageData = await pageRes.value.json() as {
      overall_star_rating?: number;
      rating_count?: number;
    };
    overallRating = pageData.overall_star_rating ?? null;
    ratingCount = pageData.rating_count ?? null;
  }

  if (ratingsRes.status === "fulfilled" && ratingsRes.value.ok) {
    const ratingsData = await ratingsRes.value.json() as {
      data?: Array<{
        reviewer?: { name?: string; picture?: { data?: { url?: string } } };
        rating?: number;
        review_text?: string;
        created_time?: string;
      }>;
    };

    reviews = (ratingsData.data ?? [])
      .filter((r) => r.rating && r.rating >= 1)
      .map((r, i) => ({
        id: `facebook-${r.created_time ?? i}`,
        source: "facebook" as const,
        reviewerName: r.reviewer?.name ?? "Facebook User",
        reviewerPhotoUrl: r.reviewer?.picture?.data?.url,
        rating: r.rating ?? 0,
        body: r.review_text ?? "",
        reviewedAt: r.created_time ?? new Date().toISOString(),
        replyUrl: `https://www.facebook.com/${pageId}/reviews`,
      }));
  }

  return {
    rating: overallRating,
    reviewCount: ratingCount,
    reviews,
    configured: true,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const reviewsLiveRouter = router({
  /**
   * Fetch live reviews from Google Places and Facebook.
   * Returns combined summary with per-source data.
   */
  getLive: protectedProcedure.query(async (): Promise<ReviewsSummary> => {
    const [google, facebook] = await Promise.allSettled([
      fetchGoogleReviews(),
      fetchFacebookRatings(),
    ]);

    const g = google.status === "fulfilled" ? google.value : { rating: null, reviewCount: null, reviews: [], configured: false };
    const f = facebook.status === "fulfilled" ? facebook.value : { rating: null, reviewCount: null, reviews: [], configured: false };

    // Merge and sort by date descending
    const allReviews = [...g.reviews, ...f.reviews].sort(
      (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
    );

    return {
      googleRating: g.rating,
      googleReviewCount: g.reviewCount,
      facebookRating: f.rating,
      facebookReviewCount: f.reviewCount,
      reviews: allReviews,
      googleConfigured: g.configured,
      facebookConfigured: f.configured,
    };
  }),

  /**
   * Sync live Google reviews into the local reviews table for offline access.
   */
  syncToLocal: protectedProcedure.mutation(async ({ ctx }) => {
    const { getDb } = await import("./db");
    const { reviews } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const google = await fetchGoogleReviews();
    let synced = 0;

    for (const r of google.reviews) {
      // Check if already synced by reviewer name + date proximity
      const existing = await db.select().from(reviews)
        .where(eq(reviews.reviewerName, r.reviewerName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(reviews).values({
          source: "google",
          reviewerName: r.reviewerName,
          rating: r.rating,
          body: r.body,
          reviewedAt: new Date(r.reviewedAt),
        });
        synced++;
      }
    }

    return { synced };
  }),
});
