/**
 * Facebook Leads tRPC Router
 * Provides procedures for querying and managing Facebook Lead Ads leads.
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { facebookLeads } from "../drizzle/schema";
import { eq, desc, count } from "drizzle-orm";

export const facebookLeadsRouter = router({
  /**
   * Get all Facebook leads, newest first.
   */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["new", "contacted", "converted", "lost", "all"]).optional().default("all"),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { leads: [], total: 0 };

      const query = db.select().from(facebookLeads);
      if (input.status !== "all") {
        query.where(eq(facebookLeads.status, input.status));
      }
      query.orderBy(desc(facebookLeads.createdAt));
      query.limit(input.limit).offset(input.offset);

      const leads = await query;

      // Get total count
      const countQuery = db.select({ count: count() }).from(facebookLeads);
      if (input.status !== "all") {
        countQuery.where(eq(facebookLeads.status, input.status));
      }
      const [{ count: total }] = await countQuery;

      return {
        leads: leads.map(lead => ({
          ...lead,
          fields: (() => {
            try { return JSON.parse(lead.fields); }
            catch { return {}; }
          })(),
        })),
        total: Number(total),
      };
    }),

  /**
   * Get a single lead by ID.
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(facebookLeads).where(eq(facebookLeads.id, input.id)).limit(1);
      if (rows.length === 0) return null;
      const lead = rows[0];
      return {
        ...lead,
        fields: (() => {
          try { return JSON.parse(lead.fields); }
          catch { return {}; }
        })(),
      };
    }),

  /**
   * Update the status of a lead.
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "contacted", "converted", "lost"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(facebookLeads)
        .set({ status: input.status })
        .where(eq(facebookLeads.id, input.id));
      return { success: true };
    }),

  /**
   * Update notes on a lead.
   */
  updateNotes: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(facebookLeads)
        .set({ notes: input.notes })
        .where(eq(facebookLeads.id, input.id));
      return { success: true };
    }),

  /**
   * Get summary counts by status.
   */
  summary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, new: 0, contacted: 0, converted: 0, lost: 0 };

    const rows = await db.select({
      status: facebookLeads.status,
      count: count(),
    }).from(facebookLeads).groupBy(facebookLeads.status);

    const result = { total: 0, new: 0, contacted: 0, converted: 0, lost: 0 };
    for (const row of rows) {
      const c = Number(row.count);
      result.total += c;
      result[row.status] = c;
    }
    return result;
  }),
});
