/**
 * Scheduled Ad Publisher
 * POST /api/scheduled/publish-ads
 *
 * Triggered by Manus Heartbeat every minute. Finds all social posts with
 * status = "scheduled" and scheduledAt <= now, then publishes each one to
 * the appropriate platforms. Marks each post as published or failed.
 */
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { storageGet, storagePut } from "./storage";

/**
 * Downloads an image from a /manus-storage/* path or any URL and returns raw bytes.
 * Needed because external APIs (Facebook, Instagram) cannot access private storage URLs.
 */
async function fetchImageAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  let fetchUrl = url;
  if (!url.startsWith("http")) {
    const key = url.replace(/^\/manus-storage\//, "");
    const { url: presigned } = await storageGet(key);
    fetchUrl = presigned;
  }
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return { buffer, contentType };
}

/** Publish a single post to Facebook using multipart upload (works with private storage). */
async function publishToFacebook(
  draft: string,
  imageUrl: string | null,
): Promise<string> {
  const pageId = ENV.facebookPageId;
  const accessToken = ENV.facebookPageAccessToken;
  if (!pageId || !accessToken) throw new Error("Facebook credentials not configured");

  if (imageUrl) {
    const { buffer, contentType } = await fetchImageAsBuffer(imageUrl);
    const form = new FormData();
    form.append("source", new Blob([new Uint8Array(buffer)], { type: contentType }), "photo.jpg");
    form.append("caption", draft);
    form.append("access_token", accessToken);
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, { method: "POST", body: form });
    const data = await res.json() as any;
    if (!res.ok || data.error) throw new Error(data.error?.message ?? "Facebook photo post failed");
    return data.post_id ?? data.id;
  } else {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: draft, access_token: accessToken }),
    });
    const data = await res.json() as any;
    if (!res.ok || data.error) throw new Error(data.error?.message ?? "Facebook feed post failed");
    return data.id;
  }
}

/** Publish a single post to Instagram. Re-uploads image to get a public URL first. */
async function publishToInstagram(
  caption: string,
  imageUrl: string,
): Promise<string> {
  const igUserId = ENV.instagramUserId;
  const accessToken = ENV.instagramAccessToken;
  if (!igUserId || !accessToken) throw new Error("Instagram credentials not configured");

  // Re-upload to storage to get a public URL Instagram can fetch
  const { buffer, contentType } = await fetchImageAsBuffer(imageUrl);
  const igKey = `ads/ig-temp/${Date.now()}-sched.jpg`;
  const { url: publicUrl } = await storagePut(igKey, buffer, contentType);

  // Step 1: Create media container
  const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: publicUrl, caption, access_token: accessToken }),
  });
  const containerData = await containerRes.json() as any;
  if (!containerRes.ok || containerData.error) {
    throw new Error(containerData.error?.message ?? "Instagram container creation failed");
  }

  // Step 2: Publish
  const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
  });
  const publishData = await publishRes.json() as any;
  if (!publishRes.ok || publishData.error) {
    throw new Error(publishData.error?.message ?? "Instagram publish failed");
  }
  return publishData.id;
}

/** Publish a single post to X (Twitter). Downloads image server-side before upload. */
async function publishToX(text: string, imageUrl: string | null): Promise<string> {
  const { getXClient } = await import("./xRoutes");
  const client = getXClient();
  const rwClient = client.readWrite;

  let mediaId: string | undefined;
  if (imageUrl) {
    try {
      const { buffer, contentType } = await fetchImageAsBuffer(imageUrl);
      mediaId = await rwClient.v1.uploadMedia(buffer, { mimeType: contentType });
    } catch (err) {
      console.warn("[ScheduledAds] X image upload failed, posting text-only:", err);
    }
  }

  const tweetParams: Record<string, unknown> = {};
  if (mediaId) tweetParams.media = { media_ids: [mediaId] };
  const tweet = await rwClient.v2.tweet(text, tweetParams);
  return tweet.data?.id ?? "";
}

/**
 * Publish a single post to LinkedIn (organic UGC post).
 * Requires OAuth 2.0 access token with w_member_social scope and an author URN.
 * LinkedIn credentials are not yet configured — this function throws until they are set.
 */
async function publishToLinkedIn(text: string, _imageUrl: string | null): Promise<string> {
  // LinkedIn organic posting requires OAuth 2.0 credentials that are not yet configured.
  // When credentials are available, implement the UGC Posts API:
  //   POST https://api.linkedin.com/v2/ugcPosts
  //   Authorization: Bearer <access_token>
  //   Body: { author: "urn:li:person:<id>", lifecycleState: "PUBLISHED",
  //           specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text },
  //           shareMediaCategory: "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }
  void text;
  throw new Error("LinkedIn credentials not configured. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN to enable scheduled LinkedIn posting.");
}

/**
 * Core publish-ads logic. Finds due scheduled posts and publishes them.
 * Returns a summary of what was processed.
 */
export async function runScheduledAdsPublisher(): Promise<{
  processed: number;
  published: number;
  failed: number;
  results: Array<{ id: number; platform: string; status: "published" | "failed"; error?: string }>;
}> {
  const { getDb } = await import("./db");
  const { socialPosts } = await import("../drizzle/schema");
  const { and, eq, lte } = await import("drizzle-orm");

  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const now = new Date();

  // Find all posts due for publishing
  const duePosts = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, "scheduled"),
        lte(socialPosts.scheduledAt, now),
      ),
    );

  const results: Array<{ id: number; platform: string; status: "published" | "failed"; error?: string }> = [];
  let published = 0;
  let failed = 0;

  for (const post of duePosts) {
    const platform = post.platform ?? "facebook";
    const platforms: ("facebook" | "instagram" | "x" | "linkedin")[] =
      platform === "all" ? ["facebook", "instagram", "x", "linkedin"]
      : platform === "both" ? ["facebook", "instagram"]
      : platform === "x" ? ["x"]
      : platform === "instagram" ? ["instagram"]
      : platform === "linkedin" ? ["linkedin"]
      : ["facebook"];

    const updates: Record<string, unknown> = {
      status: "published",
      published: true,
      postedAt: new Date(),
    };

    let anyFailed = false;
    const postErrors: string[] = [];

    for (const p of platforms) {
      try {
        if (p === "facebook") {
          const fbPostId = await publishToFacebook(post.draft, post.imageUrl ?? null);
          updates.fbPostId = fbPostId;
        } else if (p === "instagram") {
          if (!post.imageUrl) {
            postErrors.push("Instagram skipped: no image");
            continue;
          }
          const igPostId = await publishToInstagram(post.draft, post.imageUrl);
          updates.igPostId = igPostId;
        } else if (p === "x") {
          const xPostId = await publishToX(post.draft, post.imageUrl ?? null);
          updates.xPostId = xPostId;
        } else if (p === "linkedin") {
          // publishToLinkedIn will throw until credentials are configured.
          // The error is caught below and recorded as a partial failure —
          // other platforms in the same post still publish successfully.
          await publishToLinkedIn(post.draft, post.imageUrl ?? null);
        }
      } catch (err) {
        anyFailed = true;
        const msg = err instanceof Error ? err.message : String(err);
        postErrors.push(`${p}: ${msg}`);
        console.error(`[ScheduledAds] Failed to publish post ${post.id} to ${p}:`, err);
      }
    }

    if (anyFailed && postErrors.length === platforms.length) {
      // All platforms failed
      updates.status = "failed";
      updates.published = false;
      updates.postedAt = null;
      failed++;
      results.push({ id: post.id, platform, status: "failed", error: postErrors.join("; ") });
    } else {
      // At least one platform succeeded (partial success counts as published)
      published++;
      results.push({ id: post.id, platform, status: "published", error: postErrors.length ? postErrors.join("; ") : undefined });
    }

    await db
      .update(socialPosts)
      .set(updates as any)
      .where(eq(socialPosts.id, post.id));
  }

  return { processed: duePosts.length, published, failed, results };
}

/**
 * Express handler for POST /api/scheduled/publish-ads
 */
export async function publishAdsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    const isCron = (user as any).isCron === true;
    const isAdmin = (user as any).role === "admin";

    if (!isCron && !isAdmin) {
      res.status(403).json({ error: "cron or admin only" });
      return;
    }

    const summary = await runScheduledAdsPublisher();
    console.log(`[ScheduledAds] Run complete: ${summary.processed} processed, ${summary.published} published, ${summary.failed} failed`);
    res.json({ ok: true, ...summary, timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[ScheduledAds] Handler error:", err);
    res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Register the scheduled ads publisher endpoint on the Express app.
 * Must be called before the tRPC middleware in index.ts.
 */
export function registerScheduledAdsPublisherRoute(app: Express): void {
  app.post("/api/scheduled/publish-ads", publishAdsHandler);
}
