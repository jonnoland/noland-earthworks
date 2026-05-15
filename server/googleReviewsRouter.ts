/**
 * Google Reviews tRPC Router
 * Provides procedures for querying Google Business Profile reviews and connection status.
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { googleReviews, googleTokens } from "../drizzle/schema";
import { desc, count, avg } from "drizzle-orm";

export const googleReviewsRouter = router({
  /**
   * Get all stored Google reviews, newest first.
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { reviews: [], total: 0 };

      const reviews = await db.select()
        .from(googleReviews)
        .orderBy(desc(googleReviews.createTime))
        .limit(input.limit)
        .offset(input.offset);

      const [{ count: total }] = await db.select({ count: count() }).from(googleReviews);

      return { reviews, total: Number(total) };
    }),

  /**
   * Get review summary stats: average rating, count by star.
   */
  summary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, averageRating: 0, byRating: {} };

    const rows = await db.select({
      rating: googleReviews.rating,
      count: count(),
    }).from(googleReviews).groupBy(googleReviews.rating);

    const byRating: Record<number, number> = {};
    let total = 0;
    let ratingSum = 0;

    for (const row of rows) {
      const c = Number(row.count);
      byRating[row.rating] = c;
      total += c;
      ratingSum += row.rating * c;
    }

    return {
      total,
      averageRating: total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0,
      byRating,
    };
  }),

  /**
   * Check if Google Business Profile is connected.
   */
  connectionStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { connected: false };

    const rows = await db.select({
      id: googleTokens.id,
      expiresAt: googleTokens.expiresAt,
      updatedAt: googleTokens.updatedAt,
    }).from(googleTokens).limit(1);

    if (rows.length === 0) return { connected: false };

    return {
      connected: true,
      expiresAt: rows[0].expiresAt,
      connectedAt: rows[0].updatedAt,
    };
  }),

  /**
   * Trigger a manual reviews sync.
   * Calls the /api/google/reviews/sync endpoint internally.
   */
  sync: protectedProcedure.mutation(async () => {
    try {
      const res = await fetch("http://localhost:" + (process.env.PORT || "3000") + "/api/google/reviews/sync", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error((err as { error?: string }).error || "Sync failed");
      }
      const data = await res.json() as { synced?: number };
      return { success: true, synced: data.synced ?? 0 };
    } catch (err) {
      throw new Error(String(err));
    }
  }),
});
