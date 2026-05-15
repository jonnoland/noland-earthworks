/**
 * Google Business Profile OAuth + Reviews Routes
 *
 * GET  /api/auth/google           — Redirect to Google OAuth consent screen
 * GET  /api/auth/google/callback  — Handle OAuth callback, store tokens
 * GET  /api/auth/google/status    — Check if Google is connected
 * POST /api/auth/google/disconnect — Remove stored tokens
 * POST /api/google/reviews/sync   — Fetch latest reviews from Google API and store them
 */
import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { googleTokens, googleReviews } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI_PATH = "/api/auth/google/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "openid",
  "email",
].join(" ");

function getRedirectUri(req: Request): string {
  const origin = (req.query.origin as string) || `${req.protocol}://${req.get("host")}`;
  return `${origin}${REDIRECT_URI_PATH}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
async function exchangeCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
} | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) {
      console.error("[Google OAuth] Token exchange failed:", await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("[Google OAuth] Token exchange error:", err);
    return null;
  }
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) {
      console.error("[Google OAuth] Token refresh failed:", await res.text());
      return null;
    }
    const data = await res.json() as { access_token: string; expires_in: number };
    // Update stored token
    const db = await getDb();
    if (db) {
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      await db.update(googleTokens).set({ accessToken: data.access_token, expiresAt });
    }
    return data.access_token;
  } catch (err) {
    console.error("[Google OAuth] Token refresh error:", err);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if necessary.
 */
async function getValidAccessToken(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(googleTokens).limit(1);
  if (rows.length === 0) return null;

  const token = rows[0];
  const now = new Date();

  // If token expires within 5 minutes, refresh it
  if (token.expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
    return await refreshAccessToken(token.refreshToken);
  }

  return token.accessToken;
}

/**
 * Fetch reviews from the Google Business Profile API.
 * Returns an array of review objects.
 */
async function fetchGoogleReviews(accessToken: string): Promise<Array<{
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}>> {
  try {
    // Step 1: Get the account list
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!accountsRes.ok) {
      console.error("[Google Reviews] Failed to fetch accounts:", await accountsRes.text());
      return [];
    }
    const accountsData = await accountsRes.json() as { accounts?: Array<{ name: string }> };
    const accountName = accountsData.accounts?.[0]?.name;
    if (!accountName) {
      console.warn("[Google Reviews] No accounts found");
      return [];
    }

    // Step 2: Get the location list
    const locationsRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!locationsRes.ok) {
      console.error("[Google Reviews] Failed to fetch locations:", await locationsRes.text());
      return [];
    }
    const locationsData = await locationsRes.json() as { locations?: Array<{ name: string }> };
    const locationName = locationsData.locations?.[0]?.name;
    if (!locationName) {
      console.warn("[Google Reviews] No locations found");
      return [];
    }

    // Step 3: Fetch reviews for the location
    const reviewsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!reviewsRes.ok) {
      console.error("[Google Reviews] Failed to fetch reviews:", await reviewsRes.text());
      return [];
    }
    const reviewsData = await reviewsRes.json() as {
      reviews?: Array<{
        reviewId: string;
        reviewer: { displayName: string; profilePhotoUrl?: string };
        starRating: string;
        comment?: string;
        createTime: string;
        updateTime: string;
        reviewReply?: { comment: string; updateTime: string };
      }>;
    };
    return reviewsData.reviews ?? [];
  } catch (err) {
    console.error("[Google Reviews] Fetch error:", err);
    return [];
  }
}

const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export function registerGoogleReviewsRoutes(app: Express): void {
  /**
   * GET /api/auth/google
   * Redirects the user to Google's OAuth consent screen.
   * The frontend should open this URL in the same tab (or a popup).
   */
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const redirectUri = getRedirectUri(req);
    const state = encodeURIComponent(req.query.returnTo as string || "/ops/settings");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  /**
   * GET /api/auth/google/callback
   * Google redirects here after the user grants permission.
   * Exchanges the code for tokens and stores them.
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    if (error) {
      console.error("[Google OAuth] User denied access:", error);
      res.redirect(`/ops/settings?tab=integrations&google_error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      res.redirect("/ops/settings?tab=integrations&google_error=no_code");
      return;
    }

    const redirectUri = getRedirectUri(req);
    const tokens = await exchangeCode(code, redirectUri);

    if (!tokens) {
      res.redirect("/ops/settings?tab=integrations&google_error=token_exchange_failed");
      return;
    }

    try {
      const db = await getDb();
      if (!db) {
        res.redirect("/ops/settings?tab=integrations&google_error=db_unavailable");
        return;
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Upsert — only one token row needed
      const existing = await db.select({ id: googleTokens.id }).from(googleTokens).limit(1);
      if (existing.length > 0) {
        await db.update(googleTokens).set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? "",
          expiresAt,
          scope: tokens.scope,
        }).where(eq(googleTokens.id, existing[0].id));
      } else {
        await db.insert(googleTokens).values({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? "",
          expiresAt,
          scope: tokens.scope,
        });
      }

      console.log("[Google OAuth] Tokens stored successfully");

      // Trigger an initial reviews sync
      const accessToken = tokens.access_token;
      syncReviews(accessToken).catch(err => {
        console.error("[Google Reviews] Initial sync failed:", err);
      });

      const returnTo = decodeURIComponent(state || "/ops/settings?tab=integrations&google_connected=1");
      res.redirect(returnTo.includes("?") ? returnTo + "&google_connected=1" : returnTo + "?google_connected=1");
    } catch (err) {
      console.error("[Google OAuth] Error storing tokens:", err);
      res.redirect("/ops/settings?tab=integrations&google_error=storage_failed");
    }
  });

  /**
   * GET /api/auth/google/status
   * Returns whether Google is connected and when the token expires.
   */
  app.get("/api/auth/google/status", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) {
        res.json({ connected: false });
        return;
      }
      const rows = await db.select({
        id: googleTokens.id,
        expiresAt: googleTokens.expiresAt,
        scope: googleTokens.scope,
        updatedAt: googleTokens.updatedAt,
      }).from(googleTokens).limit(1);

      if (rows.length === 0) {
        res.json({ connected: false });
        return;
      }
      res.json({
        connected: true,
        expiresAt: rows[0].expiresAt,
        scope: rows[0].scope,
        connectedAt: rows[0].updatedAt,
      });
    } catch (err) {
      console.error("[Google OAuth] Status check error:", err);
      res.json({ connected: false });
    }
  });

  /**
   * POST /api/auth/google/disconnect
   * Removes stored Google tokens.
   */
  app.post("/api/auth/google/disconnect", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (db) {
        await db.delete(googleTokens);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[Google OAuth] Disconnect error:", err);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  /**
   * POST /api/google/reviews/sync
   * Fetches the latest reviews from Google and stores them in the database.
   */
  app.post("/api/google/reviews/sync", async (_req: Request, res: Response) => {
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        res.status(401).json({ error: "Google not connected" });
        return;
      }

      const count = await syncReviews(accessToken);
      res.json({ success: true, synced: count });
    } catch (err) {
      console.error("[Google Reviews] Sync error:", err);
      res.status(500).json({ error: "Sync failed" });
    }
  });
}

/**
 * Sync reviews from Google API to the database.
 * Returns the number of new reviews stored.
 */
async function syncReviews(accessToken: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const reviews = await fetchGoogleReviews(accessToken);
  let newCount = 0;

  for (const review of reviews) {
    try {
      const existing = await db.select({ id: googleReviews.id })
        .from(googleReviews)
        .where(eq(googleReviews.reviewId, review.reviewId))
        .limit(1);

      const rating = STAR_RATING_MAP[review.starRating] ?? 0;

      if (existing.length > 0) {
        // Update existing review (reply may have changed)
        await db.update(googleReviews).set({
          comment: review.comment ?? null,
          updateTime: review.updateTime,
          replyComment: review.reviewReply?.comment ?? null,
          replyTime: review.reviewReply?.updateTime ?? null,
          syncedAt: new Date(),
        }).where(eq(googleReviews.reviewId, review.reviewId));
      } else {
        await db.insert(googleReviews).values({
          reviewId: review.reviewId,
          authorName: review.reviewer.displayName,
          authorPhotoUrl: review.reviewer.profilePhotoUrl ?? null,
          rating,
          comment: review.comment ?? null,
          createTime: review.createTime,
          updateTime: review.updateTime,
          replyComment: review.reviewReply?.comment ?? null,
          replyTime: review.reviewReply?.updateTime ?? null,
        });
        newCount++;
      }
    } catch (err) {
      console.error(`[Google Reviews] Error storing review ${review.reviewId}:`, err);
    }
  }

  console.log(`[Google Reviews] Sync complete — ${newCount} new, ${reviews.length - newCount} updated`);
  return newCount;
}
