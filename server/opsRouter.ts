/**
 * Ops tRPC router — owner-only procedures for the operations dashboard
 * Covers Jobs, Leads, and Schedule CRUD.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import {
  getDb,
  getJobs, createJob, updateJob, deleteJob,
  getOpsLeads, createOpsLead, updateOpsLead, deleteOpsLead,
  getScheduleEntries, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
} from "./db";
import { jobs, opsLeads, quoteSubmissions } from "../drizzle/schema";
import { and, desc, eq, like } from "drizzle-orm";

/**
 * Owner-only guard — only the site owner can call these procedures.
 * Primary check: openId matches OWNER_OPEN_ID env var.
 * Fallback (when OWNER_OPEN_ID is not injected into production runtime): user must have role=admin.
 */
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

// ─── Jobs Router ──────────────────────────────────────────────────────────────
const jobsRouter = router({
  list: ownerProcedure.query(({ ctx }) => getJobs(ctx.user.id)),
  create: ownerProcedure
    .input(z.object({
      title: z.string().min(1),
      client: z.string().min(1),
      address: z.string().optional(),
      jobType: z.enum(["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"]).default("land_clearing"),
      status: z.enum(["estimate", "scheduled", "in_progress", "completed", "invoiced", "paid"]).default("estimate"),
      acres: z.string().optional(),
      crewDays: z.string().optional(),
      totalPrice: z.string().optional(),
      notes: z.string().optional(),
      scheduledDate: z.date().optional(),
    }))
    .mutation(({ ctx, input }) => createJob({ ...input, userId: ctx.user.id })),
  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      client: z.string().min(1).optional(),
      address: z.string().optional(),
      jobType: z.enum(["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"]).optional(),
      status: z.enum(["estimate", "scheduled", "in_progress", "completed", "invoiced", "paid"]).optional(),
      acres: z.string().optional(),
      crewDays: z.string().optional(),
      totalPrice: z.string().optional(),
      notes: z.string().optional(),
      scheduledDate: z.date().optional(),
      completedDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const result = await updateJob(id, ctx.user.id, data);

      // Auto-close matching lead as "Won" when a job is marked Paid
      if (data.status === "paid") {
        try {
          // Fetch the updated job to get the client name
          const jobRows = await getJobs(ctx.user.id);
          const job = jobRows.find(j => j.id === id);
          const clientName = data.client ?? job?.client;
          if (clientName) {
            const db = await getDb();
            if (db) {
              // Find a lead whose name matches the client name (exact or partial)
              const matchingLeads = await db
                .select()
                .from(opsLeads)
                .where(
                  and(
                    eq(opsLeads.userId, ctx.user.id),
                    like(opsLeads.name, `%${clientName}%`)
                  )
                )
                .limit(5);
              // Update any matching leads that are not already Won or Lost
              for (const lead of matchingLeads) {
                if (lead.stage !== "won" && lead.stage !== "lost") {
                  await db
                    .update(opsLeads)
                    .set({ stage: "won", updatedAt: new Date() })
                    .where(and(eq(opsLeads.id, lead.id), eq(opsLeads.userId, ctx.user.id)));
                  console.log(`[Jobs] Lead #${lead.id} (${lead.name}) auto-set to Won after job #${id} marked Paid`);
                }
              }
            }
          }
        } catch (err) {
          // Non-fatal: job update already succeeded
          console.warn("[Jobs] Failed to auto-close lead on Paid:", err);
        }
      }

      return result;
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteJob(input.id, ctx.user.id)),
});

// ─── Leads Router ─────────────────────────────────────────────────────────────
const leadsRouter = router({
  list: ownerProcedure.query(({ ctx }) => getOpsLeads(ctx.user.id)),
  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      source: z.enum(["google", "facebook", "referral", "website", "direct", "other"]).default("other"),
      stage: z.enum(["new", "contacted", "converted", "estimate_sent", "negotiating", "won", "lost"]).default("new"),
      jobType: z.string().optional(),
      estimatedValue: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => createOpsLead({ ...input, userId: ctx.user.id })),
  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      source: z.enum(["google", "facebook", "referral", "website", "direct", "other"]).optional(),
      stage: z.enum(["new", "contacted", "converted", "estimate_sent", "negotiating", "won", "lost"]).optional(),
      jobType: z.string().optional(),
      estimatedValue: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => { const { id, ...data } = input; return updateOpsLead(id, ctx.user.id, data); }),
  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteOpsLead(input.id, ctx.user.id)),

  /**
   * Convert a lead to a local job.
   * Creates a new job record pre-filled with the lead's data,
   * then sets the lead stage to "converted".
   * Returns the new job's id so the client can navigate to /ops/jobs.
   */
  convertToJob: ownerProcedure
    .input(z.object({
      leadId: z.number(),
      // Caller may override any of these; defaults are derived from the lead
      title: z.string().min(1).optional(),
      client: z.string().min(1).optional(),
      address: z.string().optional(),
      jobType: z.enum(["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch the lead to copy its data
      const leadRows = await db
        .select()
        .from(opsLeads)
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id)))
        .limit(1);
      if (leadRows.length === 0) throw new Error("Lead not found");
      const lead = leadRows[0];

      // Map lead jobType string to jobs jobType enum (best-effort)
      const jobTypeMap: Record<string, "land_clearing" | "forestry_mulching" | "brush_removal" | "stump_grinding" | "wildfire_mitigation"> = {
        "Land Clearing": "land_clearing",
        "land_clearing": "land_clearing",
        "Forestry Mulching": "forestry_mulching",
        "forestry_mulching": "forestry_mulching",
        "Brush Removal": "brush_removal",
        "brush_removal": "brush_removal",
        "Stump Grinding": "stump_grinding",
        "stump_grinding": "stump_grinding",
        "Wildfire Mitigation": "wildfire_mitigation",
        "wildfire_mitigation": "wildfire_mitigation",
      };
      const resolvedJobType =
        input.jobType ??
        (lead.jobType ? (jobTypeMap[lead.jobType] ?? "land_clearing") : "land_clearing");

      // Build the new job record
      const newJobData = {
        userId: ctx.user.id,
        title: input.title ?? `${lead.name} — ${lead.jobType ?? "Land Clearing"}`,
        client: input.client ?? lead.name,
        address: input.address ?? lead.address ?? undefined,
        jobType: resolvedJobType,
        status: "estimate" as const,
        notes: input.notes ?? lead.notes ?? undefined,
      };

      // Insert the job and retrieve its new id
      const insertResult = await db.insert(jobs).values(newJobData);
      const newJobId = (insertResult as unknown as { insertId: number }).insertId;

      // Mark the lead as converted
      await db
        .update(opsLeads)
        .set({ stage: "converted", updatedAt: new Date() })
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id)));

      console.log(`[Leads] Lead #${input.leadId} converted to Job #${newJobId} by user ${ctx.user.id}`);
      return { jobId: newJobId };
    }),
});

// ─── Schedule Router ──────────────────────────────────────────────────────────
const scheduleRouter = router({
  list: ownerProcedure.query(({ ctx }) => getScheduleEntries(ctx.user.id)),
  create: ownerProcedure
    .input(z.object({
      title: z.string().min(1),
      crewName: z.string().min(1),
      date: z.date(),
      startHour: z.number().min(0).max(23).default(7),
      endHour: z.number().min(0).max(23).default(17),
      color: z.string().optional(),
      notes: z.string().optional(),
      jobId: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => createScheduleEntry({ ...input, userId: ctx.user.id })),
  update: ownerProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      crewName: z.string().min(1).optional(),
      date: z.date().optional(),
      startHour: z.number().min(0).max(23).optional(),
      endHour: z.number().min(0).max(23).optional(),
      color: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => { const { id, ...data } = input; return updateScheduleEntry(id, ctx.user.id, data); }),
  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteScheduleEntry(input.id, ctx.user.id)),
});

// ─── Quote Submissions Log Router ────────────────────────────────────────────
const quotesRouter = router({
  /** Returns the most recent quote form submissions with Jobber sync status */
  list: ownerProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(quoteSubmissions)
        .orderBy(desc(quoteSubmissions.createdAt))
        .limit(input.limit);
    }),
});

// ─── Combined Ops Router ──────────────────────────────────────────────────────
export const opsRouter = router({
  jobs: jobsRouter,
  leads: leadsRouter,
  schedule: scheduleRouter,
  quotes: quotesRouter,
});
