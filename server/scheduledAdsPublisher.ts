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

/** Publish a single post to Facebook. Returns the fbPostId on success. */
async function publishToFacebook(
  draft: string,
  imageUrl: string | null,
): Promise<string> {
  const pageId = ENV.facebookPageId;
  const accessToken = ENV.facebookPageAccessToken;
  if (!pageId || !accessToken) throw new Error("Facebook credentials not configured");

  if (imageUrl) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl, caption: draft, access_token: accessToken }),
    });
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

/** Publish a single post to Instagram. Returns the igPostId on success. */
async function publishToInstagram(
  caption: string,
  imageUrl: string,
): Promise<string> {
  const igUserId = ENV.instagramUserId;
  const accessToken = ENV.instagramAccessToken;
  if (!igUserId || !accessToken) throw new Error("Instagram credentials not configured");

  // Step 1: Create media container
  const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
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

/** Publish a single post to X (Twitter). Returns the xPostId on success. */
async function publishToX(text: string, imageUrl: string | null): Promise<string> {
  const { getXClient } = await import("./xRoutes");
  const client = getXClient();
  const rwClient = client.readWrite;

  let mediaId: string | undefined;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        mediaId = await rwClient.v1.uploadMedia(imgBuffer, { mimeType: contentType });
      }
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
    const platforms: ("facebook" | "instagram" | "x")[] =
      platform === "all" ? ["facebook", "instagram", "x"]
      : platform === "both" ? ["facebook", "instagram"]
      : platform === "x" ? ["x"]
      : platform === "instagram" ? ["instagram"]
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
