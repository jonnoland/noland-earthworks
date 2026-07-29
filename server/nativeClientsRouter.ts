/**
 * nativeClientsRouter — native client directory management
 *
 * Procedures:
 *   list         — paginated list with search
 *   getById      — single client with job history
 *   upsertFromJob — create or update client record from a job (called internally)
 *   update       — edit notes, contact info
 *   delete       — hard delete
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nativeClients, nativeJobs, opsLeads, nativeQuotes } from "../drizzle/schema";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { ENV } from "./_core/env";

// ─── Owner guard ──────────────────────────────────────────────────────────────
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

// ─── Router ────────────────────────────────────────────────────────────────────
export const nativeClientsRouter = router({
  /**
   * List all clients with optional search.
   */
  list: ownerProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { search, limit, offset } = input;

      let query = db.select().from(nativeClients);

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.where(
          or(
            like(nativeClients.name, term),
            like(nativeClients.email, term),
            like(nativeClients.phone, term),
            like(nativeClients.address, term)
          )
        ) as typeof query;
      }

      const rows = await query
        .orderBy(desc(nativeClients.updatedAt))
        .limit(limit)
        .offset(offset);

      return rows;
    }),

  /**
   * Get a single client by ID, including their job history.
   */
  getById: ownerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [client] = await db
        .select()
        .from(nativeClients)
        .where(eq(nativeClients.id, input.id))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Fetch associated jobs by client name match
      const jobs = await db
        .select()
        .from(nativeJobs)
        .where(eq(nativeJobs.clientName, client.name))
        .orderBy(desc(nativeJobs.createdAt))
        .limit(50);

      // Fetch associated quotes by name, email, or phone
      const quoteConds: ReturnType<typeof eq>[] = [
        eq(nativeQuotes.clientName, client.name),
      ];
      if (client.email) quoteConds.push(eq(nativeQuotes.clientEmail, client.email));
      if (client.phone) quoteConds.push(eq(nativeQuotes.clientPhone, client.phone));
      const quotes = await db
        .select()
        .from(nativeQuotes)
        .where(or(...quoteConds))
        .orderBy(desc(nativeQuotes.createdAt))
        .limit(50);

      // Fetch associated leads by name, email, or phone
      const leadConds: ReturnType<typeof eq>[] = [
        eq(opsLeads.name, client.name),
      ];
      if (client.email) leadConds.push(eq(opsLeads.email, client.email));
      if (client.phone) leadConds.push(eq(opsLeads.phone, client.phone));
      const leads = await db
        .select()
        .from(opsLeads)
        .where(or(...leadConds))
        .orderBy(desc(opsLeads.createdAt))
        .limit(20);

      return { ...client, jobs, quotes, leads };
    }),

  /**
   * Upsert a client from a job record.
   * Matches by email (preferred) or phone, then name.
   * Updates job count and total spent when a job is paid.
   */
  upsertFromJob: ownerProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        source: z.string().optional(),
        /** If provided, adds this amount to totalSpentCents */
        addSpentCents: z.number().optional(),
        /** If true, increments jobCount */
        incrementJobCount: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { name, email, phone, address, source, addSpentCents, incrementJobCount } = input;

      // Try to find existing client by email, then phone, then name
      let existing = null;
      if (email) {
        const [row] = await db
          .select()
          .from(nativeClients)
          .where(eq(nativeClients.email, email))
          .limit(1);
        existing = row ?? null;
      }
      if (!existing && phone) {
        const [row] = await db
          .select()
          .from(nativeClients)
          .where(eq(nativeClients.phone, phone))
          .limit(1);
        existing = row ?? null;
      }
      if (!existing) {
        const [row] = await db
          .select()
          .from(nativeClients)
          .where(eq(nativeClients.name, name))
          .limit(1);
        existing = row ?? null;
      }

      if (existing) {
        // Update existing client
        await db
          .update(nativeClients)
          .set({
            name: name || existing.name,
            email: email || existing.email,
            phone: phone || existing.phone,
            address: address || existing.address,
            jobCount: incrementJobCount
              ? (existing.jobCount ?? 0) + 1
              : existing.jobCount,
            totalSpentCents: addSpentCents
              ? (existing.totalSpentCents ?? 0) + addSpentCents
              : existing.totalSpentCents,
            updatedAt: new Date(),
          })
          .where(eq(nativeClients.id, existing.id));

        const [updated] = await db
          .select()
          .from(nativeClients)
          .where(eq(nativeClients.id, existing.id))
          .limit(1);
        return updated;
      } else {
        // Create new client
        await db.insert(nativeClients).values({
          name,
          email: email ?? null,
          phone: phone ?? null,
          address: address ?? null,
          source: source ?? "manual",
          jobCount: incrementJobCount ? 1 : 0,
          totalSpentCents: addSpentCents ?? 0,
        });

        const [created] = await db
          .select()
          .from(nativeClients)
          .where(eq(nativeClients.name, name))
          .orderBy(desc(nativeClients.createdAt))
          .limit(1);
        return created;
      }
    }),

  /**
   * Update client notes and contact info.
   */
  update: ownerProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id, ...fields } = input;

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (fields.name !== undefined) updateData.name = fields.name;
      if (fields.email !== undefined) updateData.email = fields.email;
      if (fields.phone !== undefined) updateData.phone = fields.phone;
      if (fields.address !== undefined) updateData.address = fields.address;
      if (fields.notes !== undefined) updateData.notes = fields.notes;

      await db
        .update(nativeClients)
        .set(updateData)
        .where(eq(nativeClients.id, id));

      const [updated] = await db
        .select()
        .from(nativeClients)
        .where(eq(nativeClients.id, id))
        .limit(1);

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return updated;
    }),

  /**
   * Manually create a new client record.
   */
  create: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(nativeClients).values({
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        source: "manual",
        jobCount: 0,
        totalSpentCents: 0,
      });
      const [created] = await db
        .select()
        .from(nativeClients)
        .where(eq(nativeClients.name, input.name))
        .orderBy(desc(nativeClients.createdAt))
        .limit(1);
      return created;
    }),

  /**
   * Hard delete a client record.
   */
  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(nativeClients).where(eq(nativeClients.id, input.id));
      return { success: true };
    }),

  /**
   * Sync all clients from existing native jobs (one-time backfill).
   * Creates a client record for every unique clientName in native_jobs.
   */
  syncFromJobs: ownerProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const jobs = await db
        .select()
        .from(nativeJobs)
        .orderBy(desc(nativeJobs.createdAt));

      const seen = new Map<string, boolean>();
      let created = 0;
      let updated = 0;

      for (const job of jobs) {
        const key = (job.clientEmail || job.clientPhone || job.clientName || "").toLowerCase();
        if (!key) continue;

        // Check if client exists
        let existing = null;
        if (job.clientEmail) {
          const [row] = await db
            .select()
            .from(nativeClients)
            .where(eq(nativeClients.email, job.clientEmail))
            .limit(1);
          existing = row ?? null;
        }
        if (!existing && job.clientPhone) {
          const [row] = await db
            .select()
            .from(nativeClients)
            .where(eq(nativeClients.phone, job.clientPhone))
            .limit(1);
          existing = row ?? null;
        }
        if (!existing) {
          const [row] = await db
            .select()
            .from(nativeClients)
            .where(eq(nativeClients.name, job.clientName))
            .limit(1);
          existing = row ?? null;
        }

        const isPaid = job.status === "completed" && job.paidCents;

        if (existing) {
          if (!seen.has(key)) {
            await db
              .update(nativeClients)
              .set({
                jobCount: sql`${nativeClients.jobCount} + 1`,
                totalSpentCents: isPaid
                  ? sql`${nativeClients.totalSpentCents} + ${job.paidCents ?? 0}`
                  : sql`${nativeClients.totalSpentCents}`,
                updatedAt: new Date(),
              })
              .where(eq(nativeClients.id, existing.id));
            updated++;
          }
        } else {
          if (!seen.has(key)) {
            await db.insert(nativeClients).values({
              name: job.clientName,
              email: job.clientEmail ?? null,
              phone: job.clientPhone ?? null,
              address: job.propertyAddress ?? null,
              source: "website_quote",
              jobCount: 1,
              totalSpentCents: isPaid ? (job.paidCents ?? 0) : 0,
            });
            created++;
          }
        }
        seen.set(key, true);
      }

      return { created, updated };
    }),

  /**
   * Backfill clients from existing ops leads.
   */
  syncFromLeads: ownerProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const leads = await db.select().from(opsLeads).orderBy(desc(opsLeads.createdAt));
      const seen = new Map<string, boolean>();
      let created = 0;
      let updated = 0;
      for (const lead of leads) {
        const key = (lead.email || lead.phone || lead.name || "").toLowerCase();
        if (!key) continue;
        let existing = null;
        if (lead.email) {
          const [row] = await db.select().from(nativeClients).where(eq(nativeClients.email, lead.email)).limit(1);
          existing = row ?? null;
        }
        if (!existing && lead.phone) {
          const [row] = await db.select().from(nativeClients).where(eq(nativeClients.phone, lead.phone)).limit(1);
          existing = row ?? null;
        }
        if (!existing) {
          const [row] = await db.select().from(nativeClients).where(eq(nativeClients.name, lead.name)).limit(1);
          existing = row ?? null;
        }
        if (existing) {
          if (!seen.has(key)) {
            await db.update(nativeClients).set({
              email: lead.email || existing.email,
              phone: lead.phone || existing.phone,
              updatedAt: new Date(),
            }).where(eq(nativeClients.id, existing.id));
            updated++;
          }
        } else {
          if (!seen.has(key)) {
            await db.insert(nativeClients).values({
              name: lead.name,
              email: lead.email ?? null,
              phone: lead.phone ?? null,
              address: lead.address ?? null,
              source: lead.source ?? "website",
              jobCount: 0,
              totalSpentCents: 0,
            });
            created++;
          }
        }
        seen.set(key, true);
      }
      return { created, updated };
    }),

  /**
   * Backfill clients from existing native quotes.
   */
  syncFromQuotes: ownerProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const quotes = await db.select().from(nativeQuotes).orderBy(desc(nativeQuotes.createdAt));
      const seen = new Map<string, boolean>();
      let created = 0;
      let updated = 0;
      for (const quote of quotes) {
        if (!quote.clientName) continue;
        const key = (quote.clientEmail || quote.clientPhone || quote.clientName || "").toLowerCase();
        if (!key) continue;
        let existing = null;
        if (quote.clientEmail) {
          const [row] = await db.select().from(nativeClients).where(eq(nativeClients.email, quote.clientEmail)).limit(1);
          existing = row ?? null;
        }
        if (!existing && quote.clientPhone) {
          const [row] = await db.select().from(nativeClients).where(eq(nativeClients.phone, quote.clientPhone)).limit(1);
          existing = row ?? null;
        }
        if (!existing) {
          const [row] = await db.select().from(nativeClients).where(eq(nativeClients.name, quote.clientName)).limit(1);
          existing = row ?? null;
        }
        if (existing) {
          if (!seen.has(key)) {
            await db.update(nativeClients).set({
              email: quote.clientEmail || existing.email,
              phone: quote.clientPhone || existing.phone,
              address: quote.propertyAddress || existing.address,
              updatedAt: new Date(),
            }).where(eq(nativeClients.id, existing.id));
            updated++;
          }
        } else {
          if (!seen.has(key)) {
            await db.insert(nativeClients).values({
              name: quote.clientName,
              email: quote.clientEmail ?? null,
              phone: quote.clientPhone ?? null,
              address: quote.propertyAddress ?? null,
              source: "field_quote",
              jobCount: 0,
              totalSpentCents: 0,
            });
            created++;
          }
        }
        seen.set(key, true);
      }
      return { created, updated };
    }),

  /**
   * Export all clients as a CSV string.
   */
  exportCsv: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const clients = await db
      .select()
      .from(nativeClients)
      .orderBy(desc(nativeClients.name));
    const escape = (v: string | null | undefined) => {
      if (v == null) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const header = ["Name", "Phone", "Email", "Address", "Jobs", "Total Spent", "Source", "Notes", "Added"].join(",");
    const rows = clients.map((c) =>
      [
        escape(c.name),
        escape(c.phone),
        escape(c.email),
        escape(c.address),
        c.jobCount,
        (c.totalSpentCents / 100).toFixed(2),
        escape(c.source),
        escape(c.notes),
        new Date(c.createdAt).toLocaleDateString("en-US"),
      ].join(",")
    );
    return [header, ...rows].join("\n");
  }),
});
