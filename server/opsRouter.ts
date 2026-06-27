/**
 * Ops tRPC router — owner-only procedures for the operations dashboard
 * Covers Jobs, Leads, Schedule, Quotes, Crews, Conversations, Reviews, and Timesheets CRUD.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { aiAutomationRouter } from "./aiAutomationRouter";
import { ENV } from "./_core/env";
import { isJobberConnected, jobberGraphQL } from "./jobber";
import { fetchJobberInvoices } from "./jobberApi";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import {
  getDb,
  getJobs, createJob, updateJob, deleteJob,
  getOpsLeads, createOpsLead, updateOpsLead, deleteOpsLead,
  getScheduleEntries, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
  getVisitBlackoutDates, addVisitBlackoutDate, removeVisitBlackoutDate,
  getRecurringBlackoutDays, addRecurringBlackoutDay, removeRecurringBlackoutDay,
  getOpsLeadById, insertOwnerTask,
  getAllUsers, setUserRole,
  getPricingBenchmarks,
  getAgentConfig, upsertAgentConfig,
} from "./db";
import { Resend } from "resend";
import { jobs, opsLeads, quoteSubmissions, crews, crewMembers, conversations, messages, reviews, timeEntries, distanceQuotes, businessSettings, automationSettings, serviceCatalog, pricingBenchmarks, messageTemplates, reminderRules, leadNotes, visitBlackoutDates, recurringBlackoutDays, aiPricingSettings, quoteDrafts, jobberTokens, socialPosts, adSpend, equipment, serviceLogs, serviceIntervals, fieldDiagnostics, ownerTasks, jobNotes, jobberRevenueCache, morningBriefs, reviewRequests, chatSessions, scheduleEntries, agentConfig, adCampaigns } from "../drizzle/schema";

import { and, desc, eq, gte, inArray, lt, lte, like, or, sql } from "drizzle-orm";
import { autoPatchSeoCheck, AUTO_PATCHABLE_CHECKS, SQUARESPACE_MANUAL_CHECKS } from "./seoAutoPatcher";

function getResend() {
  return ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;
}

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
      scheduledEndDate: z.date().optional(),
      isHighPriority: z.boolean().optional(),
      crewId: z.number().int().positive().nullable().optional(),
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
      clientEmail: z.string().email().optional().or(z.literal("")),
      scheduledDate: z.date().optional(),
      scheduledEndDate: z.date().optional(),
      completedDate: z.date().optional(),
      rescheduledAt: z.date().optional(),
      isHighPriority: z.boolean().optional(),
      crewId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const result = await updateJob(id, ctx.user.id, data);

      // Auto-close matching lead as "Won" when a job is marked Paid
      if (data.status === "paid") {
        try {
          const jobRows = await getJobs(ctx.user.id);
          const job = jobRows.find(j => j.id === id);
          const clientName = data.client ?? job?.client;
          if (clientName) {
            const db = await getDb();
            if (db) {
              const matchingLeads = await db
                .select()
                .from(opsLeads)
                .where(and(eq(opsLeads.userId, ctx.user.id), like(opsLeads.name, `%${clientName}%`)))
                .limit(5);
              for (const lead of matchingLeads) {
                if (lead.stage !== "won" && lead.stage !== "lost") {
                  await db.update(opsLeads).set({ stage: "won", updatedAt: new Date() })
                    .where(and(eq(opsLeads.id, lead.id), eq(opsLeads.userId, ctx.user.id)));
                }
              }
            }
          }
        } catch (err) {
          console.warn("[Jobs] Failed to auto-close lead on Paid:", err);
        }
      }

      return result;
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteJob(input.id, ctx.user.id)),
  generateCompletionNote: ownerProcedure
    .input(z.object({ jobberJobId: z.string() }))
    .mutation(async ({ input }) => {
      // Fetch job data from Jobber
      const data = await jobberGraphQL(`
        query GetJobForNote($id: EncodedId!) {
          job(id: $id) {
            id jobNumber title jobStatus jobType total
            completedAt instructions
            client { name companyName }
            property { address { street1 city province } }
          }
        }
      `, { id: input.jobberJobId }) as any;
      const job = data?.job;
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found in Jobber" });

      const clientName = job.client?.companyName || job.client?.name || "Unknown client";
      const address = [job.property?.address?.street1, job.property?.address?.city, job.property?.address?.province]
        .filter(Boolean).join(", ") || "address not recorded";
      const svc = (job.jobType ?? "land management").toLowerCase().replace(/_/g, " ");
      const priceStr = job.total ? `$${Number(job.total).toLocaleString()}` : "price not recorded";
      const dateStr = job.completedAt
        ? new Date(job.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "date not recorded";
      const instrCtx = job.instructions ? `\nJob instructions/notes: ${job.instructions}` : "";

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You write internal job completion notes for Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned forestry mulching and land management company in Middle & West Tennessee. Write one concise paragraph (3–5 sentences) that summarizes the completed job. Cover: what service was performed, site location, site conditions or notable factors (if known from the instructions), outcome, and any relevant follow-up. Write in first person as Jon. Plain, direct, professional — no filler, no corporate language, no emojis.`,
          },
          {
            role: "user",
            content: `Write a completion note for this job:\nClient: ${clientName}\nAddress: ${address}\nService: ${svc}\nTotal: ${priceStr}\nCompleted: ${dateStr}${instrCtx}`,
          },
        ],
      });
      const note = (result.choices?.[0]?.message?.content as string ?? "").trim();
      if (!note) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a note. Try again." });
      return { note };
    }),

  requestReview: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const jobRows = await db.select().from(jobs)
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)))
        .limit(1);
      const job = jobRows[0];
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Resolve client email: from job.clientEmail, or fall back to matching lead email
      let clientEmail = job.clientEmail ?? null;
      if (!clientEmail) {
        const matchingLeads = await db.select().from(opsLeads)
          .where(and(eq(opsLeads.userId, ctx.user.id), like(opsLeads.name, `%${job.client}%`)))
          .limit(1);
        clientEmail = matchingLeads[0]?.email ?? null;
      }
      if (!clientEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No client email on file. Edit the job to add one." });
      }

      const resend = getResend();
      if (!resend) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email service not configured" });

      const bizRows = await db.select().from(businessSettings).limit(1);
      const googleReviewUrl = bizRows[0]?.googleReviewUrl ?? "https://g.page/r/CcglMAMbtQInEBM/review";
      const firstName = job.client.split(" ")[0];

      await resend.emails.send({
        from: "Noland Earthworks <noreply@nolandearthworks.com>",
        to: clientEmail,
        subject: "How did we do? Leave us a review",
        html: `
          <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
            <p>Hi ${firstName},</p>
            <p>Thank you for trusting Noland Earthworks with your property. It was a pleasure working on the project.</p>
            <p>If you were happy with the work, a Google review goes a long way for a small, veteran-owned business like ours. It only takes a minute:</p>
            <p style="text-align:center;margin:1.5rem 0;">
              <a href="${googleReviewUrl}"
                 style="background:#c96e24;color:#fff;padding:0.75rem 1.75rem;border-radius:4px;text-decoration:none;font-weight:bold;font-family:sans-serif;">
                Leave a Google Review
              </a>
            </p>
            <p>If anything wasn't right, please call me directly at <a href="tel:6154064819" style="color:#c96e24;">615-406-4819</a> and I'll make it right.</p>
            <p style="margin-top:2rem;">&mdash; Jon Noland<br><span style="font-size:0.85rem;color:#666;">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated</span></p>
          </div>
        `,
      });

      // Stamp the job so the button shows "Sent" state
      await db.update(jobs).set({ reviewRequestSentAt: new Date() }).where(eq(jobs.id, input.id));

      // Auto-create a follow-up task due in 7 days to check for the review
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 7);
      await insertOwnerTask({
        title: `Check for Google review — ${job.client}`,
        description: `A review request was sent to ${clientEmail} on ${new Date().toLocaleDateString("en-US")}. Check Google to see if they left a review.`,
        relatedType: "job",
        relatedId: job.id,
        dueAt,
      });

      return { sent: true, to: clientEmail };
    }),
  /** Assign or unassign a crew to a local job */
  assignCrew: ownerProcedure
    .input(z.object({
      jobId: z.number().int().positive(),
      crewId: z.number().int().positive().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(jobs)
        .set({ crewId: input.crewId, updatedAt: new Date() })
        .where(and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Mark a job as completed — sets status to 'completed' and stamps completedDate */
  markComplete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(jobs)
        .set({ status: "completed", completedDate: new Date(), updatedAt: new Date() })
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      return { success: true };
    }),

  /**
   * Mark a Jobber job as completed locally — upserts a local jobs record with status='completed'.
   * If a local record already exists for this Jobber job ID, updates it; otherwise creates one.
   * This feeds the Scoreboard's "Jobs Completed" and "Recent Completed Jobs" metrics.
   */
  markJobberJobComplete: ownerProcedure
    .input(z.object({
      jobberJobId: z.string(),
      title: z.string().optional(),
      client: z.string().optional(),
      totalPrice: z.string().optional(),
      jobType: z.enum(["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Check if a local record already exists for this Jobber job
      const [existing] = await db.select().from(jobs)
        .where(and(eq(jobs.userId, ctx.user.id), eq(jobs.jobberJobId, input.jobberJobId)))
        .limit(1);
      if (existing) {
        await db.update(jobs)
          .set({ status: "completed", completedDate: new Date(), updatedAt: new Date() })
          .where(eq(jobs.id, existing.id));
        return { success: true, id: existing.id };
      }
      // Create a new local record linked to this Jobber job
      const priceNum = input.totalPrice ? parseFloat(input.totalPrice.replace(/[^0-9.]/g, "")) : null;
      const [result] = await db.insert(jobs).values({
        userId: ctx.user.id,
        title: input.title || "Jobber Job",
        client: input.client || "",
        jobType: input.jobType ?? "land_clearing",
        status: "completed",
        totalPrice: priceNum != null && !isNaN(priceNum) ? String(priceNum) : null,
        completedDate: new Date(),
        jobberJobId: input.jobberJobId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: (result as any).insertId ?? null };
    }),

  /** Mark a job as paid — sets status to 'paid' and stamps paidDate, auto-closes matching lead */
  markPaid: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [job] = await db.select().from(jobs)
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      await db.update(jobs)
        .set({ status: "paid", paidDate: new Date(), updatedAt: new Date() })
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      // Auto-close matching lead to 'won'
      try {
        const clientName = job.client;
        if (clientName) {
          const matchingLeads = await db
            .select()
            .from(opsLeads)
            .where(and(eq(opsLeads.userId, ctx.user.id), like(opsLeads.name, `%${clientName}%`)))
            .limit(5);
          for (const lead of matchingLeads) {
            if (lead.stage !== "won" && lead.stage !== "lost") {
              await db.update(opsLeads).set({ stage: "won", updatedAt: new Date() })
                .where(and(eq(opsLeads.id, lead.id), eq(opsLeads.userId, ctx.user.id)));
            }
          }
        }
      } catch (err) {
        console.warn("[Jobs] Failed to auto-close lead on Paid:", err);
      }
      return { success: true };
    }),

  /** Archive a job — hides it from the active list */
  archiveJob: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(jobs)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Unarchive a job — restores it to 'completed' status */
  unarchiveJob: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(jobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(jobs.id, input.id), eq(jobs.userId, ctx.user.id)));
      return { success: true };
    }),
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
  // ─── Lead Notes / Activity ────────────────────────────────────────────────
  listNotes: ownerProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(leadNotes)
        .where(and(eq(leadNotes.leadId, input.leadId), eq(leadNotes.userId, ctx.user.id)))
        .orderBy(desc(leadNotes.createdAt));
    }),
  addNote: ownerProcedure
    .input(z.object({
      leadId: z.number(),
      content: z.string().min(1),
      type: z.enum(["note", "call", "text", "email", "stage_change", "system"]).default("note"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(leadNotes).values({ leadId: input.leadId, userId: ctx.user.id, type: input.type, content: input.content });
      return { success: true };
    }),

  confirmVisit: ownerProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await getOpsLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      if (!lead.requestedVisitAt) throw new TRPCError({ code: "BAD_REQUEST", message: "No visit time requested for this lead" });

      const now = new Date();
      await updateOpsLead(input.leadId, ctx.user.id, { visitConfirmedAt: now });

      // Send confirmation email to visitor if they have an email on file
      if (lead.email) {
        const resend = getResend();
        if (resend) {
          const visitFormatted = lead.requestedVisitAt.toLocaleString("en-US", {
            timeZone: "America/Chicago",
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          await resend.emails.send({
            from: "Noland Earthworks <noreply@nolandearthworks.com>",
            to: lead.email,
            subject: "Your Site Visit is Confirmed — Noland Earthworks",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
                <div style="background:#1a1a1a;padding:24px 32px;">
                  <h1 style="color:#d97706;margin:0;font-size:22px;letter-spacing:1px;">NOLAND EARTHWORKS</h1>
                  <p style="color:#888;margin:4px 0 0;font-size:13px;">Veteran-Owned Land Management</p>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#1a1a1a;margin-top:0;">Site Visit Confirmed</h2>
                  <p style="color:#444;line-height:1.6;">Hi ${lead.name},</p>
                  <p style="color:#444;line-height:1.6;">Your site visit has been confirmed for:</p>
                  <div style="background:#f5f5f5;border-left:4px solid #d97706;padding:16px 20px;margin:20px 0;">
                    <strong style="font-size:16px;color:#1a1a1a;">${visitFormatted} (Central Time)</strong>
                  </div>
                  <p style="color:#444;line-height:1.6;">Jon will be on-site to walk the property and discuss the scope of work. If anything comes up before then, call or text: <strong><a href="tel:6154064819" style="color:#d97706;">615-406-4819</a></strong></p>
                  <hr style="border:none;border-top:1px solid #eee;margin:28px 0;">
                  <p style="color:#888;font-size:12px;margin:0;">Noland Earthworks, LLC &mdash; Vanleer, TN &mdash; <a href="https://nolandearthworks.com" style="color:#d97706;">nolandearthworks.com</a></p>
                </div>
              </div>
            `,
          }).catch((e: unknown) => console.error("[Ops] Visit confirmation email failed:", e));
        }
      }

      return { success: true, visitConfirmedAt: now };
    }),

  convertToJob: ownerProcedure
    .input(z.object({
      leadId: z.number(),
      title: z.string().min(1).optional(),
      client: z.string().min(1).optional(),
      address: z.string().optional(),
      jobType: z.enum(["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const leadRows = await db.select().from(opsLeads)
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id))).limit(1);
      if (leadRows.length === 0) throw new Error("Lead not found");
      const lead = leadRows[0];
      const jobTypeMap: Record<string, "land_clearing" | "forestry_mulching" | "brush_removal" | "stump_grinding" | "wildfire_mitigation"> = {
        "Land Management": "land_clearing", "land_clearing": "land_clearing",
        "Forestry Mulching": "forestry_mulching", "forestry_mulching": "forestry_mulching",
        "Brush Removal": "brush_removal", "brush_removal": "brush_removal",
        "Stump Grinding": "stump_grinding", "stump_grinding": "stump_grinding",
        "Wildfire Mitigation": "wildfire_mitigation", "wildfire_mitigation": "wildfire_mitigation",
      };
      const resolvedJobType = input.jobType ?? (lead.jobType ? (jobTypeMap[lead.jobType] ?? "land_clearing") : "land_clearing");
      const newJobData = {
        userId: ctx.user.id,
        title: input.title ?? `${lead.name} — ${lead.jobType ?? "Land Management"}`,
        client: input.client ?? lead.name,
        address: input.address ?? lead.address ?? undefined,
        jobType: resolvedJobType,
        status: "estimate" as const,
        notes: input.notes ?? lead.notes ?? undefined,
      };
      const insertResult = await db.insert(jobs).values(newJobData);
      const newJobId = (insertResult as unknown as { insertId: number }).insertId;
      await db.update(opsLeads).set({ stage: "converted", updatedAt: new Date() })
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id)));
      return { jobId: newJobId };
    }),

  // ─── AI Follow-Up Draft ──────────────────────────────────────────────────
  generateFollowUp: ownerProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(opsLeads)
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id)))
        .limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const lead = rows[0];

      const daysSinceContact = lead.updatedAt
        ? Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee. Write a short, direct follow-up message to a lead who has gone quiet. Sound like a real person, not a marketing department. Professional but warm. No emojis. No corporate jargon. No phrases like "I hope this message finds you well" or "I wanted to reach out". Get straight to the point. Reference specific job details if available. End with a clear, low-pressure call to action (call or text back). Keep it under 100 words.`,
          },
          {
            role: "user",
            content: `Draft a follow-up message for this lead:

Name: ${lead.name}
Job type: ${lead.jobType ?? "land management"}
Property address: ${lead.address ?? "not provided"}
Current stage: ${lead.stage}
Days since last update: ${daysSinceContact ?? "unknown"}
AI score: ${lead.aiScore ?? "not scored"}
AI summary: ${lead.aiSummary ?? "none"}
Notes: ${lead.notes ?? "none"}

Write the message as if you are Jon sending a text or short email. First-person, direct, genuine.`,
          },
        ],
      });

      const draft = result.choices?.[0]?.message?.content ?? "";
      return { draft };
    }),

  // ─── Bulk Operations ─────────────────────────────────────────────────────
  bulkUpdateStage: ownerProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(100),
      stage: z.enum(["new", "contacted", "converted", "estimate_sent", "negotiating", "won", "lost"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(opsLeads)
        .set({ stage: input.stage, updatedAt: new Date() })
        .where(and(inArray(opsLeads.id, input.ids), eq(opsLeads.userId, ctx.user.id)));
      return { updated: input.ids.length };
    }),

  // ─── AI #1: Lead Qualification Score ────────────────────────────────────────
  qualifyLead: ownerProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(opsLeads).where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id))).limit(1);
      const lead = rows[0];
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      // Fetch notes for context
      const notes = await db.select().from(leadNotes).where(eq(leadNotes.leadId, input.leadId)).orderBy(desc(leadNotes.createdAt)).limit(5);
      const noteText = notes.map((n) => `- ${n.content}`).join("\n") || "No notes yet.";
      const prompt = `You are evaluating a lead for Noland Earthworks, LLC — a veteran-owned forestry mulching and land clearing company in Middle Tennessee. Score this lead 1-10 and classify as strong/marginal/weak.

Lead data:
Name: ${lead.name}
Job type: ${lead.jobType ?? "unknown"}
Estimated value: ${lead.estimatedValue ? "$" + lead.estimatedValue : "unknown"}
Source: ${lead.source}
Stage: ${lead.stage}
Notes: ${lead.notes ?? "none"}
Recent notes:\n${noteText}

Scoring criteria:
- 8-10 (strong): Clear job type, acreage mentioned, site visit requested, realistic budget, Middle TN location
- 5-7 (marginal): Some info missing, vague on scope, or price-shopping signals
- 1-4 (weak): No acreage, wants grading/hauling, very small lot, outside service area, or no response to contact

Return JSON only: {"score": <1-10>, "tier": "strong"|"marginal"|"weak", "summary": "<2 sentence plain English summary>", "flags": ["<flag1>", "<flag2>"]}`;
      const result = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_schema", json_schema: { name: "lead_score", strict: true, schema: { type: "object", properties: { score: { type: "number" }, tier: { type: "string" }, summary: { type: "string" }, flags: { type: "array", items: { type: "string" } } }, required: ["score", "tier", "summary", "flags"], additionalProperties: false } } },
      });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      let parsed: { score: number; tier: string; summary: string; flags: string[] };
      try { parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" }); }
      const tier = ["strong", "marginal", "weak"].includes(parsed.tier) ? parsed.tier as "strong" | "marginal" | "weak" : "marginal";
      await db.update(opsLeads).set({ aiScore: tier, aiSummary: parsed.summary, aiFlags: JSON.stringify(parsed.flags), updatedAt: new Date() }).where(eq(opsLeads.id, input.leadId));
      return { score: parsed.score, tier, summary: parsed.summary, flags: parsed.flags };
    }),

  // ─── AI #2: Stage Advancement Suggestion ─────────────────────────────────────
  suggestStageAdvancement: ownerProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(opsLeads).where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id))).limit(1);
      const lead = rows[0];
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const notes = await db.select().from(leadNotes).where(eq(leadNotes.leadId, input.leadId)).orderBy(desc(leadNotes.createdAt)).limit(8);
      const noteText = notes.map((n) => `- ${n.content}`).join("\n") || "No notes.";
      const stages = ["new", "contacted", "converted", "estimate_sent", "negotiating", "won", "lost"];
      const prompt = `You are advising Jon Noland on his lead pipeline. Based on the lead data below, suggest the most appropriate next stage and explain why in one sentence.

Current stage: ${lead.stage}
Job type: ${lead.jobType ?? "unknown"}
Estimated value: ${lead.estimatedValue ? "$" + lead.estimatedValue : "unknown"}
Visit confirmed: ${lead.visitConfirmedAt ? "yes" : "no"}
Notes:\n${noteText}

Available stages: ${stages.join(", ")}

Return JSON only: {"suggestedStage": "<stage>", "reason": "<one sentence>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { suggestedStage: parsed.suggestedStage ?? null, reason: parsed.reason ?? "" };
      } catch { return { suggestedStage: null, reason: "" }; }
    }),

  // ─── Facebook Webhook Utilities ───────────────────────────────────────────
  facebookLastReceived: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select({ createdAt: opsLeads.createdAt })
      .from(opsLeads)
      .where(and(eq(opsLeads.userId, ctx.user.id), eq(opsLeads.source, "facebook")))
      .orderBy(desc(opsLeads.createdAt))
      .limit(1);
    return rows[0]?.createdAt ?? null;
  }),

  facebookTestWebhook: ownerProcedure.mutation(async () => {
    // Send a synthetic leadgen payload to the local webhook endpoint
    const testPayload = {
      object: "page",
      entry: [{
        id: ENV.facebookPageId ?? "830611640137363",
        time: Math.floor(Date.now() / 1000),
        changes: [{
          field: "leadgen",
          value: {
            leadgen_id: `test_${Date.now()}`,
            page_id: ENV.facebookPageId ?? "830611640137363",
            form_id: "test_form",
            adgroup_id: "test_adgroup",
            ad_id: "test_ad",
            created_time: Math.floor(Date.now() / 1000),
          },
        }],
      }],
    };
    // Compute HMAC signature so the webhook handler accepts it
    const { createHmac } = await import("crypto");
    const appSecret = ENV.facebookAppSecret ?? "";
    const body = JSON.stringify(testPayload);
    const sig = "sha256=" + createHmac("sha256", appSecret).update(body).digest("hex");
    // Call the local webhook endpoint
    const baseUrl = `http://localhost:${process.env.PORT ?? 3000}`;
    const resp = await fetch(`${baseUrl}/api/webhooks/facebook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": sig,
      },
      body,
    });
    if (!resp.ok) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Webhook returned ${resp.status}` });
    }
    return { success: true, status: resp.status };
  }),

  facebookDisconnect: ownerProcedure.mutation(async () => {
    // Unsubscribe the app from the Page webhook via Graph API
    const appId = ENV.facebookAppId;
    const appSecret = ENV.facebookAppSecret;
    if (!appId || !appSecret) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Facebook app credentials not configured" });
    }
    try {
      const tokenRes = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
      );
      const tokenData = await tokenRes.json() as { access_token?: string };
      const appToken = tokenData.access_token;
      if (!appToken) throw new Error("Could not obtain app access token");
      // Delete the app-level webhook subscription
      await fetch(
        `https://graph.facebook.com/v20.0/${appId}/subscriptions?object=page&access_token=${appToken}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.warn("[FB Disconnect] Graph API call failed:", err);
      // Don't throw — still mark as disconnected locally
    }
    return { success: true };
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
  list: ownerProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(quoteSubmissions).orderBy(desc(quoteSubmissions.createdAt)).limit(input.limit);
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(quoteSubmissions).where(eq(quoteSubmissions.id, input.id));
      return { success: true };
    }),

  /**
   * Satellite imagery for a property address.
   * Geocodes the address, then returns a Google Maps Static API URL
   * (satellite view, 600x300, zoom 18) via the Manus Maps proxy.
   * The URL is safe to embed in an <img> tag — no API key is exposed.
   */
  satelliteImage: ownerProcedure
    .input(z.object({
      address: z.string().min(1),  // full address string
    }))
    .query(async ({ input }) => {
      const { makeRequest, getMapsConfig } = await import("./_core/map");

      // Step 1: Geocode the address to get lat/lng
      const geo = await makeRequest<{
        results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
        status: string;
      }>("/maps/api/geocode/json", { address: input.address });

      if (geo.status !== "OK" || !geo.results[0]) {
        return { url: null, lat: null, lng: null };
      }

      const { lat, lng } = geo.results[0].geometry.location;

      // Step 2: Build a Static Maps URL through the proxy
      const { baseUrl, apiKey } = getMapsConfig();
      const staticUrl = new URL(`${baseUrl}/v1/maps/proxy/maps/api/staticmap`);
      staticUrl.searchParams.set("center", `${lat},${lng}`);
      staticUrl.searchParams.set("zoom", "17");
      staticUrl.searchParams.set("size", "600x300");
      staticUrl.searchParams.set("maptype", "satellite");
      staticUrl.searchParams.set("markers", `color:red|${lat},${lng}`);
      staticUrl.searchParams.set("key", apiKey);

      return { url: staticUrl.toString(), lat, lng };
    }),

  /**
   * AI Quote Analyzer — takes an inbound quote submission and returns:
   * - Recommended scope of work (plain English)
   * - Suggested line items with quantities and unit prices
   * - Estimated price range (low / high)
   * - Estimated days to complete
   * - Risk flags or site notes Jon should verify
   * - A ready-to-send message for the Jobber quote
   *
   * Uses the same pricing model as the public CostCalculator.
   */
  analyzeSubmission: ownerProcedure
    .input(z.object({
      service: z.string(),
      county: z.string(),
      acreage: z.string().optional(),
      density: z.string().optional(),    // light | moderate | heavy — inferred if not provided
      terrain: z.string().optional(),    // flat | rolling | steep
      access: z.string().optional(),     // easy | moderate | difficult
      message: z.string().optional(),    // customer's notes
      addOns: z.string().optional(),     // JSON array of add-on services
      name: z.string().optional(),
      customPrompt: z.string().max(500).optional(), // user-supplied adjustment instruction
    }))
    .mutation(async ({ input }) => {

      // ─── Load AI pricing settings from DB (falls back to 2025-2026 TN market defaults) ─────────────
      const db = await getDb();
      let pricingRow: typeof aiPricingSettings.$inferSelect | null = null;
      if (db) {
        const rows = await db.select().from(aiPricingSettings).limit(1);
        if (rows.length === 0) {
          await db.insert(aiPricingSettings).values({});
          const seeded = await db.select().from(aiPricingSettings).limit(1);
          pricingRow = seeded[0] ?? null;
        } else {
          pricingRow = rows[0];
        }
      }

      // West TN counties — longer mobilization drive from Middle TN base
      const WEST_TN_COUNTIES = new Set([
        "carroll", "chester", "decatur", "gibson", "hardin",
        "henderson", "henry", "madison", "weakley",
      ]);
      const isWestTn = WEST_TN_COUNTIES.has((input.county ?? "").toLowerCase());

      // ─── Pricing constants — prefer DB values, then live benchmarks, fall back to 2025-2026 TN market rates ──
      // Sources: Mid State Land Management (Columbia TN), Bucktown Grading, HomeGuide, Angi 2026 data
      // Pull live market benchmarks to use as fallback base rates when no manual override is set
      let benchmarkMids: Record<string, number> = {};
      try {
        const bRows = await getPricingBenchmarks();
        for (const b of bRows) {
          if (b.midPerAcre && b.midPerAcre > 0) {
            benchmarkMids[b.serviceType.toLowerCase()] = b.midPerAcre;
          }
        }
      } catch { /* non-fatal */ }
      // Priority: 1) manual DB override  2) live benchmark mid  3) hardcoded TN market default
      const fmBase  = pricingRow?.forestryMulchingBaseRate ?? benchmarkMids["forestry mulching"] ?? 800;
      const lcBase  = pricingRow?.landClearingBaseRate     ?? benchmarkMids["land management"]   ?? 700;
      const bhBase  = pricingRow?.brushHoggingBaseRate     ?? benchmarkMids["brush hogging"]     ?? 150;
      const rowBase = pricingRow?.rowClearingBaseRate       ?? 6;    // $/LF — ROW priced per linear foot
      const dmMult  = parseFloat(pricingRow?.densityModerateMultiplier ?? "1.25");
      const dhMult  = parseFloat(pricingRow?.densityHeavyMultiplier    ?? "1.60");
      const trMult  = parseFloat(pricingRow?.terrainRollingMultiplier  ?? "1.15");
      const tsMult  = parseFloat(pricingRow?.terrainSteepMultiplier    ?? "1.35");
      const amMult  = parseFloat(pricingRow?.accessModerateMultiplier  ?? "1.10");
      const adMult  = parseFloat(pricingRow?.accessDifficultMultiplier ?? "1.25");
      const spread  = parseFloat(pricingRow?.priceRangeSpread          ?? "0.15");

      // ── Add-on rates from DB ────────────────────────────────────────────────
      const stumpPerStump   = pricingRow?.stumpGrindingPerStump ?? 200;
      const debrisPerLoad   = pricingRow?.debrisHaulingPerLoad  ?? 450;
      const seedingPerAcre       = pricingRow?.postClearSeedingPerAcre     ?? 225;
      const fenceLineClearPerLf  = pricingRow?.fenceLineClearingPerLf      ?? 4;
      const mulchRedistPerAcre   = pricingRow?.mulchRedistributionPerAcre  ?? 175;
      const selectiveFlatRate    = pricingRow?.selectiveClearingFlatRate   ?? 200;

      // ── Volume discount thresholds from DB ─────────────────────────────────
      const vd3to5   = (pricingRow?.volumeDiscount3to5Pct   ?? 3)  / 100;
      const vd5to10  = (pricingRow?.volumeDiscount5to10Pct  ?? 7)  / 100;
      const vd10plus = (pricingRow?.volumeDiscount10plusPct ?? 12) / 100;

      // ── Production rates (acres/day) from DB ────────────────────────────────
      const BASE_APD: Record<string, number> = {
        "forestry-mulching":     parseFloat(pricingRow?.apdForestryMulching ?? "1.5"),
        "land-clearing":         parseFloat(pricingRow?.apdLandClearing     ?? "1.2"),
        "vegetation-management": 2.5,
        "property-maintenance":  2.5,
        "right-of-way-clearing": parseFloat(pricingRow?.apdRowClearing      ?? "500"),  // LF/day
        "brush-hogging":         parseFloat(pricingRow?.apdBrushHogging     ?? "8.0"),
      };

      // ── Seasonal adjustment ─────────────────────────────────────────────────
      const currentMonth = new Date().getMonth() + 1; // 1=Jan … 12=Dec
      const isPeakSeason = currentMonth >= 10 || currentMonth <= 3;  // Oct–Mar
      const isSlowSeason = currentMonth >= 7  && currentMonth <= 9;  // Jul–Sep
      const peakUplift   = (pricingRow?.seasonalPeakUpliftPct    ?? 0) / 100;
      const slowReduct   = (pricingRow?.seasonalSlowReductionPct ?? 0) / 100;
      const seasonalMult = isPeakSeason ? (1 + peakUplift) : isSlowSeason ? (1 - slowReduct) : 1.0;

      // ── Complexity premium ──────────────────────────────────────────────────
      // Detect complexity signals in the customer message
      const complexityKeywords = ["structure", "fence", "fencing", "utility", "utilities", "power line",
        "septic", "well", "building", "barn", "house", "shed", "pond", "creek", "stream", "neighbor"];
      const msgLower = (input.message ?? "").toLowerCase();
      const hasComplexity = complexityKeywords.some(kw => msgLower.includes(kw));
      const complexityMult = hasComplexity ? (1 + (pricingRow?.complexityPremiumPct ?? 15) / 100) : 1.0;

      // Build per-acre rate ranges from DB base rates + density multipliers
      const BASE_RATES: Record<string, Record<string, [number, number]>> = {
        "forestry-mulching":     {
          light:    [Math.round(fmBase * 0.75),  Math.round(fmBase * 1.0)],
          moderate: [Math.round(fmBase * 1.0),   Math.round(fmBase * dmMult)],
          heavy:    [Math.round(fmBase * dmMult), Math.round(fmBase * dhMult * 1.5)],
        },
        "land-clearing":         {
          light:    [Math.round(lcBase * 0.75),  Math.round(lcBase * 1.0)],
          moderate: [Math.round(lcBase * 1.0),   Math.round(lcBase * dmMult)],
          heavy:    [Math.round(lcBase * dmMult), Math.round(lcBase * dhMult * 2.0)],
        },
        "vegetation-management": { light: [200, 500],   moderate: [500, 1000], heavy: [1000, 2200] },
        "property-maintenance":  { light: [200, 500],   moderate: [500, 1000], heavy: [1000, 2200] },
        // ROW clearing: rowBase is $/LF. 1 acre of ROW corridor ≈ 1,320 LF (1/4 mile wide strip).
        // Convert to per-acre equivalent so the acreage-based calculation still works for the AI range.
        "right-of-way-clearing": {
          light:    [Math.round(rowBase * 1320 * 0.75),  Math.round(rowBase * 1320 * 1.0)],
          moderate: [Math.round(rowBase * 1320 * 1.0),   Math.round(rowBase * 1320 * dmMult)],
          heavy:    [Math.round(rowBase * 1320 * dmMult), Math.round(rowBase * 1320 * dhMult * 1.5)],
        },
        "brush-hogging":         {
          light:    [Math.round(bhBase * 0.75), Math.round(bhBase * 1.0)],
          moderate: [Math.round(bhBase * 1.0),  Math.round(bhBase * dmMult)],
          heavy:    [Math.round(bhBase * dmMult), Math.round(bhBase * dhMult)],
        },
      };
      const TERRAIN_MULT: Record<string, number> = { flat: 1.0, rolling: trMult, steep: tsMult };
      const ACCESS_MULT:  Record<string, number> = { easy: 1.0, moderate: amMult, difficult: adMult };
      const DENSITY_PROD: Record<string, number> = { light: 1.5, moderate: 1.0, heavy: 0.55 };
      const TERRAIN_PROD: Record<string, number> = { flat: 1.0, rolling: 0.82, steep: 0.60 };
      // Use West TN mobilization fee if county is in West TN and the override is set
      const baseMobilization = pricingRow?.mobilizationFee ?? 400;
      const MOBILIZATION = isWestTn && pricingRow?.westTnMobilizationFee
        ? pricingRow.westTnMobilizationFee
        : baseMobilization;
      const MIN_JOB = pricingRow?.minimumJobTotal ?? 1800;

      // Parse acreage string to a number and a human-readable label
      const ACREAGE_MAP: Record<string, number> = {
        // Legacy server-side keys
        "half-to-one": 0.75, "1-to-2": 1.5, "2-to-5": 3.5,
        "5-to-10": 7.5, "10-to-20": 15, "20+": 25,
        // Public quote form keys (Quote.tsx)
        "under-quarter": 0.2, "quarter-to-half": 0.375,
        "one-to-two": 1.5, "two-to-five": 3.5,
        "five-to-ten": 7.5, "ten-plus": 15,
        "unsure": 0,
      };
      const ACREAGE_LABEL: Record<string, string> = {
        // Legacy server-side keys
        "half-to-one": "approximately 0.5–1 acre",
        "1-to-2":      "approximately 1–2 acres",
        "2-to-5":      "approximately 2–5 acres",
        "5-to-10":     "approximately 5–10 acres",
        "10-to-20":    "approximately 10–20 acres",
        "20+":         "20+ acres",
        // Public quote form keys
        "under-quarter":   "under ¼ acre",
        "quarter-to-half": "approximately ¼–½ acre",
        "one-to-two":      "approximately 1–2 acres",
        "two-to-five":     "approximately 2–5 acres",
        "five-to-ten":     "approximately 5–10 acres",
        "ten-plus":        "10+ acres",
        "unsure":          "acreage not specified — site visit required",
      };
      const acreageStr = input.acreage ?? "";
      const rawAcres = ACREAGE_MAP[acreageStr] ?? (parseFloat(acreageStr) || 0);
      // Enforce 1-acre minimum for pricing calculations — the tracked mulcher requires
      // full mobilization regardless of lot size; sub-1-acre jobs are priced at the 1-acre rate.
      const acres = rawAcres > 0 ? Math.max(1, rawAcres) : 0;
      const density = input.density ?? "moderate";
      const terrain = input.terrain ?? "flat";
      const access  = input.access  ?? "easy";

      // Compute reference price range
      const svcKey = input.service.toLowerCase().replace(/\s+/g, "-");
      const baseRange = BASE_RATES[svcKey]?.[density] ?? [1500, 3000];
      const tm = TERRAIN_MULT[terrain] ?? 1;
      const am = ACCESS_MULT[access] ?? 1;
      // Configurable volume discount (from DB)
      const vd = acres >= 10 ? (1 - vd10plus) : acres >= 5 ? (1 - vd5to10) : acres >= 3 ? (1 - vd3to5) : 1.0;
      // Apply seasonal and complexity multipliers
      const refLow  = Math.max(MIN_JOB, Math.round((baseRange[0] * acres + MOBILIZATION) * tm * am * vd * seasonalMult * complexityMult));
      const refHigh = Math.max(MIN_JOB, Math.round((baseRange[1] * acres + MOBILIZATION) * tm * am * vd * seasonalMult * complexityMult));
      // Apply spread to widen the range symmetrically around the midpoint
      const midpoint = (refLow + refHigh) / 2;
      const spreadLow  = Math.max(MIN_JOB, Math.round(midpoint * (1 - spread)));
      const spreadHigh = Math.round(midpoint * (1 + spread));
      // Use spread-adjusted range if it produces a wider band than the base calculation
      const finalLow  = Math.min(refLow,  spreadLow);
      const finalHigh = Math.max(refHigh, spreadHigh);
      const apdBase = BASE_APD[svcKey] ?? 1.5;
      const apdAdj  = apdBase * (DENSITY_PROD[density] ?? 1) * (TERRAIN_PROD[terrain] ?? 1);
      const estDays = acres > 0 ? Math.max(1, Math.ceil(acres / apdAdj)) : null;

      const addOnsList = (() => { try { return JSON.parse(input.addOns ?? "[]"); } catch { return []; } })();
      const acreageLabel = ACREAGE_LABEL[acreageStr] ?? (acres > 0 ? `${acres} acres` : "acreage not specified — site visit required");

      // ── Similar completed jobs for context ────────────────────────────────────
      // Pull up to 5 completed jobs of the same service type to give the LLM
      // real historical pricing context instead of relying solely on market benchmarks.
      let jobHistoryContext = "";
      if (db) {
        try {
          const serviceTypeMap: Record<string, string[]> = {
            "forestry-mulching":     ["forestry_mulching"],
            "land-clearing":         ["land_clearing"],
            "brush-hogging":         ["brush_removal"],
            "right-of-way-clearing": ["land_clearing", "forestry_mulching"],
            "vegetation-management": ["forestry_mulching", "land_clearing"],
            "property-maintenance":  ["brush_removal", "land_clearing"],
          };
          const jobTypes = serviceTypeMap[svcKey] ?? ["land_clearing"];
          const similarJobs = await db.select({
            client: jobs.client,
            acres: jobs.acres,
            totalPrice: jobs.totalPrice,
            completedDate: jobs.completedDate,
            jobType: jobs.jobType,
          }).from(jobs)
            .where(and(
              eq(jobs.status, "completed"),
              eq(jobs.jobType, jobTypes[0] as any)
            ))
            .orderBy(desc(jobs.completedDate))
            .limit(5);

          if (similarJobs.length > 0) {
            const lines = similarJobs.map(j => {
              const acresStr = j.acres ? `${j.acres} acres` : "unknown acreage";
              const priceStr = j.totalPrice ? `$${Number(j.totalPrice).toLocaleString()}` : "price not recorded";
              const dateStr  = j.completedDate ? new Date(j.completedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
              return `  - ${acresStr} @ ${priceStr}${dateStr ? ` (${dateStr})` : ""}`;
            });
            jobHistoryContext = `\nHistorical completed jobs (same service type — use for calibration):\n${lines.join("\n")}`;
          }
        } catch (histErr) {
          console.warn("[analyzeSubmission] Job history lookup failed:", histErr);
        }
      }

      // Fetch live pricing benchmarks from the weekly agent
      let benchmarkContext = "";
      try {
        const benchmarks = await getPricingBenchmarks();
        if (benchmarks.length > 0) {
          const benchmarkLines = benchmarks.map((b) => {
            const ageMs = Date.now() - new Date(b.lastUpdatedAt).getTime();
            const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24));
            return `- ${b.serviceType}: $${b.lowPerAcre}\u2013$${b.highPerAcre}/acre (mid: $${b.midPerAcre}) \u2014 last updated ${ageDays}d ago`;
          });
          benchmarkContext = `\nLive market benchmarks (researched weekly \u2014 Middle & West TN):\n${benchmarkLines.join("\n")}`;
        }
      } catch (benchErr) {
        console.warn("[analyzeSubmission] Benchmark lookup failed:", benchErr);
      }

      // Build add-on pricing context for the system prompt
      const addOnPricingContext: string[] = [];
      const addOnsLower = addOnsList.map((a: string) => a.toLowerCase());
      if (addOnsLower.some((a: string) => a.includes("stump"))) {
        addOnPricingContext.push(`Stump grinding: $${stumpPerStump} per stump (use this rate for stump line items)`);
      }
      if (addOnsLower.some((a: string) => a.includes("debris") || a.includes("haul"))) {
        addOnPricingContext.push(`Debris hauling/removal: $${debrisPerLoad} per load (use this rate for haul-out line items)`);
      }
      if (addOnsLower.some((a: string) => a.includes("seeding") || a.includes("post-clear"))) {
        addOnPricingContext.push(`Post-clear seeding: $${seedingPerAcre} per acre (erosion control / ground cover seeding)`);
      }
      if (addOnsLower.some((a: string) => a.includes("fence"))) {
        addOnPricingContext.push(`Fence line clearing: $${fenceLineClearPerLf} per linear foot (reclaiming overgrown fence lines)`);
      }
      if (addOnsLower.some((a: string) => a.includes("mulch") || a.includes("redistribution"))) {
        addOnPricingContext.push(`Mulch redistribution: $${mulchRedistPerAcre} per acre (uniform mulch finish after clearing)`);
      }
      if (addOnsLower.some((a: string) => a.includes("selective"))) {
        addOnPricingContext.push(`Selective clearing: $${selectiveFlatRate} flat rate (pre-job walkthrough + tree preservation marking)`);
      }

      const seasonLabel = isPeakSeason ? "peak season (Oct–Mar) — dormant vegetation, firm ground" :
                          isSlowSeason ? "slow season (Jul–Sep) — heat, potential ground saturation" :
                          "shoulder season (Apr–Jun)";

      const systemPrompt = `You are an expert estimator for Noland Earthworks, LLC — a veteran-owned forestry mulching and land management company in Middle and West Tennessee. Jon Noland is the owner and sole operator. He uses a tracked forestry mulcher.

Your job is to analyze an inbound quote request and return a structured JSON object that Jon can use to quickly build an accurate Jobber quote.

Pricing reference — Middle & West Tennessee market rates (2025–2026):
- Service: ${input.service}
- Acreage: ${acreageLabel}
- Vegetation density: ${density}
- Terrain: ${terrain}
- Site access: ${access}
- Calculated price range: $${finalLow.toLocaleString()} – $${finalHigh.toLocaleString()} (based on current TN market rates, all adjustments applied)
- Estimated days on site: ${estDays ?? "unknown"}
- Mobilization fee: $${MOBILIZATION} (included in range; ${isWestTn ? "West TN rate — longer drive from Middle TN base" : "standard for tracked equipment in Middle TN"})
- Add-ons requested: ${addOnsList.length > 0 ? addOnsList.join(", ") : "none"}
- Season: ${seasonLabel}${seasonalMult !== 1.0 ? ` — ${seasonalMult > 1 ? "+" : ""}${Math.round((seasonalMult - 1) * 100)}% seasonal adjustment applied` : ""}
${hasComplexity ? `- Complexity premium applied: +${pricingRow?.complexityPremiumPct ?? 15}% (structures, fencing, or utilities detected in customer message)` : ""}
${addOnPricingContext.length > 0 ? `\nAdd-on rates to use for line items:\n${addOnPricingContext.map(s => `- ${s}`).join("\n")}` : ""}

Pricing context for your reference:
- Forestry mulching in Middle/West TN: $1,200–$4,500/acre depending on density
- Land clearing: $1,500–$8,000/acre depending on density
- Right-of-way clearing: $4–$8 per linear foot (NOT per acre) — quote in LF when possible
- These rates reflect 2025–2026 market conditions in the Nashville/Columbia/West TN corridor
${benchmarkContext}
${jobHistoryContext}

Rules:
- The priceLow and priceHigh fields in your JSON response MUST exactly match the calculated price range provided above ($${finalLow.toLocaleString()} and $${finalHigh.toLocaleString()}). Do not adjust, round, or deviate from these values — they are the authoritative prices from the owner's pricing settings.
- If acreage is unknown or the customer's message suggests complex conditions, flag it for a site visit.
- MINIMUM JOB SIZE IS 1 ACRE. If the submitted acreage is under 1 acre, price it at the 1-acre rate and note in scopeNotes that the minimum job size is 1 acre — the tracked equipment requires full mobilization regardless of lot size.
- Mobilization ($${MOBILIZATION}) MUST always appear as a separate line item named "Mobilization & Equipment Transport". Never omit it or bundle it silently into the clearing rate.
- Line items should reflect real work components: mobilization (always first), primary clearing work (per-acre or flat), any add-ons.
- When stump grinding or debris hauling add-ons are present, use the exact per-stump or per-load rates provided above for those line items.
- Prices in line items should be integers (no decimals).
- The quote message MUST reference the acreage (use "${acreageLabel}") — this is required.
- The quote message should sound like Jon wrote it — direct, professional, no fluff, no emojis.
- Flag any risk factors: slopes, water, structures nearby, debris disposal expectations, access issues.
- Keep scope notes concise and field-ready.

Return ONLY valid JSON with this exact structure:
{
  "scopeNotes": "2-4 sentences describing the work in plain language",
  "lineItems": [{"name": "...", "description": "...", "quantity": 1, "unitPrice": 0}],
  "priceLow": 0,
  "priceHigh": 0,
  "estimatedDays": 1,
  "quoteMessage": "3-5 sentences in Jon's voice, must reference the acreage",
  "riskFlags": ["..."],
  "siteVisitRequired": false,
  "confidence": "high"
}`;

      const userPrompt = `Quote request from ${input.name ?? "customer"} in ${input.county} County, TN.
Service requested: ${input.service}
Acreage: ${acreageLabel}
${input.message ? `Customer notes: "${input.message}"` : "No additional notes provided."}
${addOnsList.length > 0 ? `Add-ons: ${addOnsList.join(", ")}` : ""}

IMPORTANT: The quote message must reference the acreage as "${acreageLabel}".
${input.customPrompt ? `\nADJUSTMENT INSTRUCTION: ${input.customPrompt}\nApply this adjustment to the quote — update line items, pricing, and message accordingly.` : ""}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "quote_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                scopeNotes:        { type: "string" },
                lineItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name:        { type: "string" },
                      description: { type: "string" },
                      quantity:    { type: "number" },
                      unitPrice:   { type: "number" },
                    },
                    required: ["name", "description", "quantity", "unitPrice"],
                    additionalProperties: false,
                  },
                },
                priceLow:          { type: "number" },
                priceHigh:         { type: "number" },
                estimatedDays:     { type: ["number", "null"] },
                quoteMessage:      { type: "string" },
                riskFlags:         { type: "array", items: { type: "string" } },
                siteVisitRequired: { type: "boolean" },
                confidence:        { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["scopeNotes", "lineItems", "priceLow", "priceHigh", "estimatedDays", "quoteMessage", "riskFlags", "siteVisitRequired", "confidence"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = result.choices?.[0]?.message?.content;
      if (!raw) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a response. Try again." });
      // Determine base rate source for the badge
      const svcKeyForBadge = input.service.toLowerCase().replace(/\s+/g, "-");
      const hasManualOverride = (() => {
        if (svcKeyForBadge.includes("forestry") || svcKeyForBadge.includes("mulch")) return !!pricingRow?.forestryMulchingBaseRate;
        if (svcKeyForBadge.includes("land") || svcKeyForBadge.includes("clearing")) return !!pricingRow?.landClearingBaseRate;
        if (svcKeyForBadge.includes("brush") || svcKeyForBadge.includes("hogg")) return !!pricingRow?.brushHoggingBaseRate;
        return false;
      })();
      const hasBenchmark = (() => {
        if (svcKeyForBadge.includes("forestry") || svcKeyForBadge.includes("mulch")) return !!benchmarkMids["forestry mulching"];
        if (svcKeyForBadge.includes("land") || svcKeyForBadge.includes("clearing")) return !!benchmarkMids["land management"];
        if (svcKeyForBadge.includes("brush") || svcKeyForBadge.includes("hogg")) return !!benchmarkMids["brush hogging"];
        return false;
      })();
      const baseRateSource: "manual" | "benchmark" | "default" =
        hasManualOverride ? "manual" : hasBenchmark ? "benchmark" : "default";
      // Build price breakdown object
      const priceBreakdown = {
        baseRate: (() => {
          if (svcKeyForBadge.includes("forestry") || svcKeyForBadge.includes("mulch")) return fmBase;
          if (svcKeyForBadge.includes("land") || svcKeyForBadge.includes("clearing")) return lcBase;
          if (svcKeyForBadge.includes("brush") || svcKeyForBadge.includes("hogg")) return bhBase;
          return fmBase;
        })(),
        acreage: acres,
        rawAcreage: rawAcres,
        minimumEnforced: rawAcres > 0 && rawAcres < 1,
        densityMultiplier: TERRAIN_MULT[terrain] !== undefined ? (density === "light" ? 1.0 : density === "moderate" ? dmMult : dhMult) : 1.0,
        terrainMultiplier: TERRAIN_MULT[terrain] ?? 1.0,
        accessMultiplier: ACCESS_MULT[access] ?? 1.0,
        seasonalMultiplier: seasonalMult,
        complexityMultiplier: complexityMult,
        volumeDiscount: vd < 1 ? Math.round((1 - vd) * 100) : 0,
        mobilization: MOBILIZATION,
        calculatedLow: finalLow,
        calculatedHigh: finalHigh,
      };
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
          scopeNotes: string;
          lineItems: { name: string; description: string; quantity: number; unitPrice: number }[];
          priceLow: number;
          priceHigh: number;
          estimatedDays: number | null;
          quoteMessage: string;
          riskFlags: string[];
          siteVisitRequired: boolean;
          confidence: "high" | "medium" | "low";
        };
        return { ...parsed, priceBreakdown, baseRateSource };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned malformed JSON. Try again." });
      }
    }),

  // ─── Draft Management ───────────────────────────────────────────────────────────────────────
  saveDraft: ownerProcedure
    .input(z.object({
      submissionId: z.number().int().positive(),
      customerName: z.string().optional(),
      customerEmail: z.string().optional(),
      service: z.string().optional(),
      county: z.string().optional(),
      acreage: z.string().optional(),
      aiResult: z.string(), // JSON-stringified AI analysis result
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [inserted] = await db.insert(quoteDrafts).values({
        submissionId: input.submissionId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        service: input.service,
        county: input.county,
        acreage: input.acreage,
        aiResult: input.aiResult,
        notes: input.notes,
        status: "saved",
      });
      return { success: true, insertId: (inserted as { insertId?: number })?.insertId ?? null };
    }),

  listDrafts: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(quoteDrafts).orderBy(desc(quoteDrafts.createdAt)).limit(100);
  }),

  updateDraftStatus: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["saved", "sent", "archived"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(quoteDrafts).set({ status: input.status, updatedAt: new Date() }).where(eq(quoteDrafts.id, input.id));
      return { success: true };
    }),

  deleteDraft: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(quoteDrafts).where(eq(quoteDrafts.id, input.id));
      return { success: true };
    }),

  /**
   * AI Quote Assistant — accepts free-form job context (text + optional site photos)
   * and returns a structured quote draft ready to populate the CreateQuoteModal.
   *
   * This is the "blank slate" version of analyzeSubmission: Jon describes the job
   * in his own words (e.g. "5 acres of heavy cedar in Hickman County, steep terrain,
   * fence line along the south edge") and optionally attaches site photos. The AI
   * analyzes the context, infers service type / acreage / conditions, and returns
   * the same structured output as analyzeSubmission.
   */
  aiAssistQuote: ownerProcedure
    .input(z.object({
      context: z.string().min(10).max(2000), // Jon's free-form job description
      imageUrls: z.array(z.string().url()).max(6).default([]), // optional site photos
      clientName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // ─── Load pricing settings from DB ───────────────────────────────────────
      const db = await getDb();
      let pricingRow: typeof aiPricingSettings.$inferSelect | null = null;
      if (db) {
        const rows = await db.select().from(aiPricingSettings).limit(1);
        if (rows.length === 0) {
          await db.insert(aiPricingSettings).values({});
          const seeded = await db.select().from(aiPricingSettings).limit(1);
          pricingRow = seeded[0] ?? null;
        } else {
          pricingRow = rows[0];
        }
      }

      // ─── Pricing constants — prefer DB overrides, then live benchmarks, fall back to TN market defaults ──
      let benchmarkMids2: Record<string, number> = {};
      try {
        const bRows2 = await getPricingBenchmarks();
        for (const b of bRows2) {
          if (b.midPerAcre && b.midPerAcre > 0) {
            benchmarkMids2[b.serviceType.toLowerCase()] = b.midPerAcre;
          }
        }
      } catch { /* non-fatal */ }
      const fmBase  = pricingRow?.forestryMulchingBaseRate ?? benchmarkMids2["forestry mulching"] ?? 800;
      const lcBase  = pricingRow?.landClearingBaseRate     ?? benchmarkMids2["land management"]   ?? 700;
      const bhBase  = pricingRow?.brushHoggingBaseRate     ?? benchmarkMids2["brush hogging"]     ?? 150;
      const rowBase = pricingRow?.rowClearingBaseRate       ?? 6;
      const dmMult  = parseFloat(pricingRow?.densityModerateMultiplier ?? "1.25");
      const dhMult  = parseFloat(pricingRow?.densityHeavyMultiplier    ?? "1.60");
      const baseMobilization = pricingRow?.mobilizationFee ?? 400;
      const stumpPerStump   = pricingRow?.stumpGrindingPerStump ?? 200;
      const debrisPerLoad   = pricingRow?.debrisHaulingPerLoad  ?? 450;
      const seedingPerAcre       = pricingRow?.postClearSeedingPerAcre     ?? 225;
      const fenceLineClearPerLf  = pricingRow?.fenceLineClearingPerLf      ?? 4;
      const mulchRedistPerAcre   = pricingRow?.mulchRedistributionPerAcre  ?? 175;
      const selectiveFlatRate    = pricingRow?.selectiveClearingFlatRate   ?? 200;
      const MIN_JOB = pricingRow?.minimumJobTotal ?? 1800;

      // ─── Seasonal context ─────────────────────────────────────────────────────
      const currentMonth = new Date().getMonth() + 1;
      const isPeakSeason = currentMonth >= 10 || currentMonth <= 3;
      const isSlowSeason = currentMonth >= 7  && currentMonth <= 9;
      const seasonLabel = isPeakSeason ? "peak season (Oct–Mar) — dormant vegetation, firm ground" :
                          isSlowSeason ? "slow season (Jul–Sep) — heat, potential ground saturation" :
                          "shoulder season (Apr–Jun)";

      // ─── Historical job context ───────────────────────────────────────────────
      let jobHistoryContext = "";
      if (db) {
        try {
          const recentJobs = await db.select({
            client: jobs.client,
            acres: jobs.acres,
            totalPrice: jobs.totalPrice,
            completedDate: jobs.completedDate,
            jobType: jobs.jobType,
          }).from(jobs)
            .where(eq(jobs.status, "completed"))
            .orderBy(desc(jobs.completedDate))
            .limit(8);
          if (recentJobs.length > 0) {
            const lines = recentJobs.map(j => {
              const acresStr = j.acres ? `${j.acres} acres` : "unknown acreage";
              const priceStr = j.totalPrice ? `$${Number(j.totalPrice).toLocaleString()}` : "price not recorded";
              const dateStr  = j.completedDate ? new Date(j.completedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "";
              return `  - ${j.jobType ?? "clearing"}: ${acresStr} @ ${priceStr}${dateStr ? ` (${dateStr})` : ""}`;
            });
            jobHistoryContext = `\nRecent completed jobs (use for pricing calibration):\n${lines.join("\n")}`;
          }
        } catch { /* non-fatal */ }
      }

      // ─── Live benchmarks ──────────────────────────────────────────────────────
      let benchmarkContext = "";
      try {
        const benchmarks = await getPricingBenchmarks();
        if (benchmarks.length > 0) {
          const lines = benchmarks.map(b =>
            `- ${b.serviceType}: $${b.lowPerAcre}–$${b.highPerAcre}/acre (mid: $${b.midPerAcre})`
          );
          benchmarkContext = `\nLive market benchmarks (Middle & West TN):\n${lines.join("\n")}`;
        }
      } catch { /* non-fatal */ }

      // ─── Build LLM messages ───────────────────────────────────────────────────
      const systemPrompt = `You are an expert estimator for Noland Earthworks, LLC — a veteran-owned forestry mulching and land management company in Middle and West Tennessee. Jon Noland is the owner and sole operator. He uses a tracked forestry mulcher.

Your job is to read Jon's free-form job description (and any site photos he provides), infer all relevant job parameters, and return a structured JSON quote draft he can immediately use to build a Jobber quote.

Pricing reference — Middle & West Tennessee market rates (2025–2026):
- Forestry mulching base: $${fmBase}/acre (light density)
- Land clearing base: $${lcBase}/acre (light density)
- Brush hogging base: $${bhBase}/acre
- Right-of-way clearing: $${rowBase}/linear foot
- Density moderate multiplier: ${dmMult}x | Heavy: ${dhMult}x
- Mobilization fee (standard): $${baseMobilization}
- Stump grinding: $${stumpPerStump}/stump
- Debris hauling: $${debrisPerLoad}/load
- Post-clear seeding: $${seedingPerAcre}/acre
- Fence line clearing: $${fenceLineClearPerLf}/linear foot
- Mulch redistribution: $${mulchRedistPerAcre}/acre
- Selective clearing: $${selectiveFlatRate} flat rate
- Minimum job total: $${MIN_JOB}
- Season: ${seasonLabel}
${benchmarkContext}
${jobHistoryContext}

Rules:
- Infer service type, acreage, density, terrain, and access from the description and photos.
- If photos show heavy vegetation, steep terrain, or site hazards, factor them into pricing and risk flags.
- MINIMUM JOB SIZE IS 1 ACRE. If inferred acreage is under 1 acre, set inferredAcres to 1.0 and note in scopeNotes that the minimum job size is 1 acre — the tracked equipment requires full mobilization regardless of lot size.
- Mobilization ($${baseMobilization}) MUST always appear as a separate line item named "Mobilization & Equipment Transport". Never omit it or bundle it silently into the clearing rate.
- Line items should reflect real work components: mobilization (always first), primary clearing (per-acre or flat), add-ons.
- Prices in line items must be integers (no decimals).
- The quote message MUST reference the acreage and sound like Jon wrote it — direct, professional, no fluff, no emojis.
- Flag any risk factors visible in photos or mentioned in the description.
- If acreage is unclear, note it in riskFlags and set siteVisitRequired: true.
- confidence: "high" if acreage and conditions are clear; "medium" if inferred; "low" if site visit is needed.

Return ONLY valid JSON with this exact structure:
{
  "inferredService": "forestry-mulching | land-clearing | brush-hogging | right-of-way-clearing | vegetation-management",
  "inferredAcres": 0,
  "inferredDensity": "light | moderate | heavy",
  "inferredTerrain": "flat | rolling | steep",
  "scopeNotes": "2-4 sentences describing the work in plain language",
  "lineItems": [{"name": "...", "description": "...", "quantity": 1, "unitPrice": 0}],
  "priceLow": 0,
  "priceHigh": 0,
  "estimatedDays": 1,
  "quoteMessage": "3-5 sentences in Jon's voice, must reference the acreage",
  "riskFlags": ["..."],
  "siteVisitRequired": false,
  "confidence": "high"
}`;

      // Build content array — text first, then images
      const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "high" } }> = [
        {
          type: "text",
          text: `Job description from Jon${input.clientName ? ` (client: ${input.clientName})` : ""}:\n\n${input.context}`,
        },
        ...input.imageUrls.map(url => ({
          type: "image_url" as const,
          image_url: { url, detail: "high" as const },
        })),
      ];

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userContent },
        ],
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ai_assist_quote",
            strict: true,
            schema: {
              type: "object",
              properties: {
                inferredService:  { type: "string" },
                inferredAcres:    { type: "number" },
                inferredDensity:  { type: "string" },
                inferredTerrain:  { type: "string" },
                scopeNotes:       { type: "string" },
                lineItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name:        { type: "string" },
                      description: { type: "string" },
                      quantity:    { type: "number" },
                      unitPrice:   { type: "number" },
                    },
                    required: ["name", "description", "quantity", "unitPrice"],
                    additionalProperties: false,
                  },
                },
                priceLow:          { type: "number" },
                priceHigh:         { type: "number" },
                estimatedDays:     { type: ["number", "null"] },
                quoteMessage:      { type: "string" },
                riskFlags:         { type: "array", items: { type: "string" } },
                siteVisitRequired: { type: "boolean" },
                confidence:        { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["inferredService", "inferredAcres", "inferredDensity", "inferredTerrain", "scopeNotes", "lineItems", "priceLow", "priceHigh", "estimatedDays", "quoteMessage", "riskFlags", "siteVisitRequired", "confidence"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = result.choices?.[0]?.message?.content;
      if (!raw) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a response. Try again." });
      try {
        return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
          inferredService: string;
          inferredAcres: number;
          inferredDensity: string;
          inferredTerrain: string;
          scopeNotes: string;
          lineItems: { name: string; description: string; quantity: number; unitPrice: number }[];
          priceLow: number;
          priceHigh: number;
          estimatedDays: number | null;
          quoteMessage: string;
          riskFlags: string[];
          siteVisitRequired: boolean;
          confidence: "high" | "medium" | "low";
        };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned malformed JSON. Try again." });
      }
    }),

  /**
   * Create a manual quote submission so Jon can enter a potential client
   * directly in the ops dashboard and use all AI tools on them.
   * Marked with jobberStatus="skipped" so it never tries to auto-sync.
   */
  createManual: ownerProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      phone: z.string().default(""),
      email: z.string().default(""),
      service: z.string().min(1, "Service is required"),
      county: z.string().min(1, "County is required"),
      acreage: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [inserted] = await db.insert(quoteSubmissions).values({
        name: input.name,
        phone: input.phone,
        email: input.email,
        service: input.service,
        county: input.county,
        acreage: input.acreage ?? null,
        street: input.street ?? null,
        city: input.city ?? null,
        state: input.state ?? "TN",
        zip: input.zip ?? null,
        message: input.message ?? null,
        jobberStatus: "skipped",
      });
      return { id: (inserted as any).insertId as number };
    }),
});

// ─── Crews Router ─────────────────────────────────────────────────────────────
const equipmentItemSchema = z.object({ name: z.string(), monthlyCostCents: z.number().int().min(0) });
const overheadItemSchema = z.object({ name: z.string(), monthlyCostCents: z.number().int().min(0) });

const crewsRouter = router({
  getById: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [crew] = await db.select().from(crews).where(eq(crews.id, input.id)).limit(1);
      if (!crew) return null;
      const members = await db.select().from(crewMembers).where(eq(crewMembers.crewId, input.id));
      return {
        ...crew,
        equipmentItems: JSON.parse(crew.equipmentItems || '[]') as { name: string; monthlyCostCents: number }[],
        overheadItems: JSON.parse(crew.overheadItems || '[]') as { name: string; monthlyCostCents: number }[],
        members,
      };
    }),
  updateDetailedPricing: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      // Labor
      hoursPerDay: z.number().min(0.5).max(24).optional(),
      crewMemberCount: z.number().int().min(1).optional(),
      memberWageCents: z.number().int().min(0).optional(),
      burdenPct: z.number().min(0).max(100).optional(),
      // Equipment
      equipmentItems: z.array(equipmentItemSchema).optional(),
      // Fuel
      machineBurnRateGph: z.number().min(0).optional(),
      fuelPriceCents: z.number().int().min(0).optional(),
      truckFuelPerDayCents: z.number().int().min(0).optional(),
      // Wear
      teethCostPerSetCents: z.number().int().min(0).optional(),
      daysPerSet: z.number().min(0.5).optional(),
      annualMajorWearCents: z.number().int().min(0).optional(),
      miscConsumablesPerDayCents: z.number().int().min(0).optional(),
      // Overhead
      overheadItems: z.array(overheadItemSchema).optional(),
      // Scheduling
      workingDaysPerMonth: z.number().min(1).max(31).optional(),
      targetMarginPct: z.number().min(1).max(99).optional(),
      acresPerDay: z.number().min(0.5).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, equipmentItems, overheadItems, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (equipmentItems !== undefined) updateData.equipmentItems = JSON.stringify(equipmentItems);
      if (overheadItems !== undefined) updateData.overheadItems = JSON.stringify(overheadItems);
      await db.update(crews).set(updateData).where(eq(crews.id, id));
      return { success: true };
    }),
  list: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const allCrews = await db.select().from(crews).orderBy(crews.name);
    const allMembers = await db.select().from(crewMembers);
    return allCrews.map((crew) => ({ ...crew, members: allMembers.filter((m) => m.crewId === crew.id) }));
  }),
  /** Update crew metadata: name, isActive, color */
  updateMeta: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      isActive: z.boolean().optional(),
      color: z.string().max(50).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...rest } = input;
      await db.update(crews).set(rest).where(eq(crews.id, id));
      return { success: true };
    }),
  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      equipmentType: z.string().min(1).max(100).default("Mulcher"),
      dayRate: z.number().int().min(0).default(0),
      costPerDay: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(crews).values({
        ...input,
        // Pricing detail defaults — prevents NOT NULL failures on new columns
        hoursPerDay: 8,
        crewMemberCount: 1,
        memberWageCents: 0,
        burdenPct: 0,
        equipmentItems: JSON.stringify([]),
        machineBurnRateGph: 0,
        fuelPriceCents: 0,
        truckFuelPerDayCents: 0,
        teethCostPerSetCents: 0,
        daysPerSet: 1,
        annualMajorWearCents: 0,
        miscConsumablesPerDayCents: 0,
        overheadItems: JSON.stringify([]),
        workingDaysPerMonth: 20,
        targetMarginPct: 30,
        acresPerDay: 0,
      });
      return { id: (result as unknown as { insertId: number }).insertId };
    }),
  updatePricing: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), dayRate: z.number().int().min(0), costPerDay: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(crews).set({ dayRate: input.dayRate, costPerDay: input.costPerDay }).where(eq(crews.id, input.id));
      return { success: true };
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(crews).where(eq(crews.id, input.id));
      return { success: true };
    }),
  addMember: ownerProcedure
    .input(z.object({ crewId: z.number().int().positive(), name: z.string().min(1).max(255), role: z.string().max(100).default("Operator") }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(crewMembers).values(input);
      return { id: (result as unknown as { insertId: number }).insertId };
    }),
  removeMember: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(crewMembers).where(eq(crewMembers.id, input.id));
      return { success: true };
    }),
  toggleClockIn: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [member] = await db.select().from(crewMembers).where(eq(crewMembers.id, input.id)).limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      const nowClockedIn = !member.clockedIn;
      await db.update(crewMembers).set({ clockedIn: nowClockedIn, clockedInAt: nowClockedIn ? new Date() : null })
        .where(eq(crewMembers.id, input.id));
      return { clockedIn: nowClockedIn };
    }),
});

// ─── Conversations Router ─────────────────────────────────────────────────────
const conversationsRouter = router({
  list: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(conversations).orderBy(desc(conversations.lastMessageAt));
  }),
  getMessages: ownerProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(messages).where(eq(messages.conversationId, input.conversationId)).orderBy(messages.sentAt);
    }),
  send: ownerProcedure
    .input(z.object({ conversationId: z.number().int().positive(), body: z.string().min(1).max(1600) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, input.conversationId)).limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      let twilioSid: string | undefined;
      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber) {
        try {
          const twilio = await import("twilio");
          const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
          const msg = await client.messages.create({ body: input.body, from: ENV.twilioFromNumber, to: conv.contactPhone });
          twilioSid = msg.sid;
        } catch (err) {
          console.error("[Twilio] Send failed:", err);
        }
      }
      const [result] = await db.insert(messages).values({
        conversationId: input.conversationId,
        direction: "outbound",
        body: input.body,
        twilioSid,
        status: twilioSid ? "sent" : "local",
      });
      await db.update(conversations).set({ lastMessage: input.body, lastMessageAt: new Date() })
        .where(eq(conversations.id, input.conversationId));
      return { id: (result as unknown as { insertId: number }).insertId, twilioSid };
    }),
  create: ownerProcedure
    .input(z.object({ contactName: z.string().min(1).max(255), contactPhone: z.string().min(7).max(30) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(conversations).values(input);
      return { id: (result as unknown as { insertId: number }).insertId };
    }),
  markRead: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(conversations).set({ unread: false }).where(eq(conversations.id, input.id));
      return { success: true };
    }),
   delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(conversations).where(eq(conversations.id, input.id));
      return { success: true };
    }),
  /**
   * AI-suggested SMS reply — generates a context-aware draft in Jon's voice
   * based on the conversation history and the lead's service type.
   */
  // ─── AI #3: SMS Smart Reply Options (3 pre-written replies) ────────────────────
  smartReplies: ownerProcedure
    .input(z.object({
      conversationId: z.number().int().positive(),
      preferredTone: z.enum(["balanced", "friendly", "professional", "direct", "apologetic"]).optional().default("balanced"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const convRows = await db.select().from(conversations).where(eq(conversations.id, input.conversationId)).limit(1);
      const conv = convRows[0];
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      const recentMessages = await db.select().from(messages).where(eq(messages.conversationId, input.conversationId)).orderBy(desc(messages.sentAt)).limit(10);
      const chronological = [...recentMessages].reverse();
      const threadText = chronological.map((m) => { const who = m.direction === "inbound" ? conv.contactName : "Jon"; return `${who}: ${m.body}`; }).join("\n");
      const lastInbound = chronological.filter((m) => m.direction === "inbound").at(-1);
      if (!lastInbound) throw new TRPCError({ code: "BAD_REQUEST", message: "No inbound message to reply to." });
      const toneInstructions: Record<string, string> = {
        balanced: "Mix of direct and warm. Natural, human, not pushy.",
        friendly: "Warm, conversational, southern hospitality. Make them feel welcome.",
        professional: "Formal, concise, business-like. Minimal small talk.",
        direct: "Get to the point immediately. Short, confident, action-oriented.",
        apologetic: "Acknowledge any delay or issue first. Empathetic but still professional.",
      };
      const toneNote = toneInstructions[input.preferredTone] ?? toneInstructions.balanced;
      const prompt = `You are drafting 3 SMS reply options for Jon Noland, owner of Noland Earthworks, LLC — veteran-owned forestry mulching and land clearing, Middle Tennessee.

Voice rules: ${toneNote} No corporate language, no emojis, 1-3 sentences max, SMS length.
Services: forestry mulching (primary), land clearing, brush hogging. Does NOT do grading, excavation, or hauling.
For pricing questions: say you need to see the property first and offer to schedule a site visit.

Conversation:\n${threadText}\n\nLast message from ${conv.contactName}: "${lastInbound.body}"

Generate 3 reply options with the requested tone (${input.preferredTone}):
1. Direct close — move toward booking/site visit
2. Soft follow-up — keep the door open, low pressure
3. Information request — ask a clarifying question to qualify further

Return JSON only: {"replies": [{"tone": "direct_close", "text": "..."}, {"tone": "soft_followup", "text": "..."}, {"tone": "info_request", "text": "..."}]}`;
      const result = await invokeLLM({
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_schema", json_schema: { name: "smart_replies", strict: true, schema: { type: "object", properties: { replies: { type: "array", items: { type: "object", properties: { tone: { type: "string" }, text: { type: "string" } }, required: ["tone", "text"], additionalProperties: false } } }, required: ["replies"], additionalProperties: false } } },
      });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { replies: parsed.replies ?? [] };
      } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" }); }
    }),

  draftReply: ownerProcedure
    .input(z.object({
      conversationId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Fetch conversation metadata
      const convRows = await db.select().from(conversations)
        .where(eq(conversations.id, input.conversationId)).limit(1);
      const conv = convRows[0];
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

      // Fetch last 10 messages for context
      const recentMessages = await db.select().from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(desc(messages.sentAt))
        .limit(10);
      const chronological = [...recentMessages].reverse();

      const threadText = chronological.map((m) => {
        const who = m.direction === "inbound" ? conv.contactName : "Jon (Noland Earthworks)";
        return `${who}: ${m.body}`;
      }).join("\n");

      const lastInbound = chronological.filter((m) => m.direction === "inbound").at(-1);
      if (!lastInbound) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No inbound message to reply to." });
      }

      const systemPrompt = `You are drafting an SMS reply on behalf of Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company serving Middle & West Tennessee.

Voice rules (MUST follow):
- Sound like Jon wrote it — direct, warm, no corporate language
- No emojis. Ever.
- No filler phrases: no "solutions", "dedicated team", "we strive to", "industry-leading"
- Professional but conversational — like a text from a contractor who knows his trade
- 1–3 sentences max. SMS length.
- If the customer is asking about pricing, say you'll need to see the property first and offer to schedule a site visit
- If the customer is asking about availability, be honest about the current season and schedule
- Always end with a clear next step or call to action
- Sign off as "Jon" if it feels natural, but not required

Context: Jon is the sole operator. He uses a tracked forestry mulcher. Services: forestry mulching (primary), land management, brush hogging. He does NOT do grading, excavation, or hauling.`;

      const userPrompt = `Draft a short SMS reply to the most recent inbound message.

Conversation history:
${threadText}

Draft a reply to: "${lastInbound.body}"

Return ONLY the reply text — no quotes, no labels, no explanation.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = result.choices?.[0]?.message?.content;
      const draft = (typeof rawContent === "string" ? rawContent : "").trim();
      if (!draft) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned empty draft" });

      return { draft };
    }),
});
// ─── Reviews Router ───────────────────────────────────────────────────────────
const reviewsRouter = router({
  list: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reviews).orderBy(desc(reviews.reviewedAt));
  }),
  create: ownerProcedure
    .input(z.object({
      source: z.enum(["google", "facebook", "yelp", "other"]).default("google"),
      reviewerName: z.string().min(1).max(255),
      rating: z.number().int().min(1).max(5),
      body: z.string().optional(),
      reviewedAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(reviews).values({ ...input, reviewedAt: input.reviewedAt ?? new Date() });
      return { id: (result as unknown as { insertId: number }).insertId };
    }),
  respond: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), response: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(reviews).set({ response: input.response, respondedAt: new Date() }).where(eq(reviews.id, input.id));
      return { success: true };
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(reviews).where(eq(reviews.id, input.id));
      return { success: true };
    }),
});

// ─── Timesheets Router ────────────────────────────────────────────────────────
const timesheetsRouter = router({
  list: ownerProcedure
    .input(z.object({
      weekStart: z.date().optional(),
      status: z.enum(["pending", "approved", "rejected", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.status !== "all") {
        conditions.push(eq(timeEntries.status, input.status as "pending" | "approved" | "rejected"));
      }
      if (input.weekStart) {
        const weekEnd = new Date(input.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        conditions.push(gte(timeEntries.clockIn, input.weekStart));
        conditions.push(lt(timeEntries.clockIn, weekEnd));
      }
      return db.select({
        entry: timeEntries,
        memberName: crewMembers.name,
        memberRole: crewMembers.role,
        crewName: crews.name,
      })
        .from(timeEntries)
        .leftJoin(crewMembers, eq(timeEntries.crewMemberId, crewMembers.id))
        .leftJoin(crews, eq(timeEntries.crewId, crews.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(timeEntries.clockIn));
    }),
  create: ownerProcedure
    .input(z.object({
      crewMemberId: z.number().int().positive(),
      crewId: z.number().int().positive(),
      clockIn: z.date(),
      clockOut: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const durationMinutes = input.clockOut
        ? Math.round((input.clockOut.getTime() - input.clockIn.getTime()) / 60000)
        : undefined;
      const [result] = await db.insert(timeEntries).values({ ...input, durationMinutes });
      return { id: (result as unknown as { insertId: number }).insertId };
    }),
  updateStatus: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "approved", "rejected"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(timeEntries).set({ status: input.status }).where(eq(timeEntries.id, input.id));
      return { success: true };
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(timeEntries).where(eq(timeEntries.id, input.id));
      return { success: true };
    }),
});

// ─── Distance Quotes Router ──────────────────────────────────────────────────
const distanceQuotesRouter = router({
  list: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    return db.select().from(distanceQuotes).orderBy(desc(distanceQuotes.createdAt));
  }),
  create: ownerProcedure
    .input(z.object({
      clientName: z.string().min(1),
      clientPhone: z.string().optional(),
      clientEmail: z.string().optional(),
      jobType: z.string().min(1),
      jobAddress: z.string().min(1),
      jobAcres: z.number().int().min(0).default(0),
      crewDaysNeeded: z.number().int().min(1).default(1),
      notes: z.string().optional(),
      distanceMiles: z.number().min(0).default(0),
      driveDuration: z.string().optional(),
      baseDayRateCents: z.number().int().min(0),
      mobSurchargeCents: z.number().int().min(0),
      adjustedDayRateCents: z.number().int().min(0),
      adjustedJobTotalCents: z.number().int().min(0),
      pricePerAcreCents: z.number().int().min(0),
      targetMarginPct: z.number().int().min(0).max(100),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(distanceQuotes).values({
        ...input,
        distanceMiles: Math.round(input.distanceMiles),
        status: "draft",
      });
      return { id: (result as unknown as { insertId: number }).insertId };
    }),
  updateStatus: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["draft", "sent", "accepted", "declined", "expired"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const updates: Record<string, unknown> = { status: input.status };
      if (input.status === "sent") updates.sentAt = new Date();
      await db.update(distanceQuotes).set(updates).where(eq(distanceQuotes.id, input.id));
      return { success: true };
    }),
  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(distanceQuotes).where(eq(distanceQuotes.id, input.id));
      return { success: true };
    }),
  emailQuote: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [quote] = await db.select().from(distanceQuotes).where(eq(distanceQuotes.id, input.id)).limit(1);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      if (!quote.clientEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "No client email on this quote" });

      const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const fmtAc = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;
      const tierLabel = (miles: number) =>
        miles <= 30 ? "Local (0–30 mi) — No surcharge" :
        miles <= 50 ? "31–50 mi" :
        miles <= 75 ? "51–75 mi" :
        miles <= 100 ? "76–100 mi" : "100+ mi";

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quote from Noland Earthworks</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f4; font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
    .header { background: #1a1a1a; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; color: #f0a500; letter-spacing: .5px; }
    .header p { margin: 4px 0 0; font-size: 13px; color: #aaa; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 15px; margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 24px 0 8px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
    .row { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
    .row:last-child { border-bottom: none; }
    .label { color: #555; }
    .value { font-weight: 600; color: #1a1a1a; }
    .total-row { background: #f9f5ec; border-radius: 4px; padding: 10px 12px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 700; }
    .total-row .value { color: #f0a500; }
    .disclaimer { font-size: 12px; color: #888; margin-top: 20px; line-height: 1.6; }
    .cta { text-align: center; margin: 28px 0 8px; }
    .cta a { display: inline-block; background: #f0a500; color: #1a1a1a; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 4px; text-decoration: none; letter-spacing: .3px; }
    .footer { background: #f4f4f4; padding: 16px 32px; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Noland Earthworks, LLC</h1>
      <p>Veteran-Owned &amp; Operated &bull; Middle &amp; West Tennessee</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${quote.clientName.split(" ")[0]},</p>
      <p style="font-size:14px;line-height:1.7;">Thank you for your interest in Noland Earthworks. Based on the details you provided, I have put together the following estimate for your review. This is a preliminary quote based on the information available — a site visit is required to confirm the final price.</p>

      <div class="section-title">Project Details</div>
      <div class="row"><span class="label">Service</span><span class="value">${quote.jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span></div>
      <div class="row"><span class="label">Job Site</span><span class="value">${quote.jobAddress}</span></div>
      <div class="row"><span class="label">Estimated Acreage</span><span class="value">${quote.jobAcres} ac</span></div>
      <div class="row"><span class="label">Estimated Crew Days</span><span class="value">${quote.crewDaysNeeded}</span></div>
      <div class="row"><span class="label">Drive Distance</span><span class="value">${quote.distanceMiles} mi (${quote.driveDuration ?? "—"})</span></div>
      <div class="row"><span class="label">Mobilization Tier</span><span class="value">${tierLabel(quote.distanceMiles)}</span></div>

      <div class="section-title">Pricing Estimate</div>
      <div class="row"><span class="label">Base Day Rate</span><span class="value">${fmt(quote.baseDayRateCents)}</span></div>
      ${quote.mobSurchargeCents > 0 ? `<div class="row"><span class="label">Mobilization Surcharge/Day</span><span class="value">+${fmt(quote.mobSurchargeCents)}</span></div>` : ""}
      <div class="row"><span class="label">Adjusted Day Rate</span><span class="value">${fmt(quote.adjustedDayRateCents)}</span></div>
      <div class="row"><span class="label">Price per Acre</span><span class="value">${fmtAc(quote.pricePerAcreCents)}/ac</span></div>
      <div class="total-row"><span>Estimated Total</span><span class="value">${fmt(quote.adjustedJobTotalCents)}</span></div>

      ${quote.notes ? `<div class="section-title">Notes</div><p style="font-size:13px;color:#555;line-height:1.6;">${quote.notes}</p>` : ""}

      <p class="disclaimer">This estimate is based on the information provided and does not constitute a final contract. Pricing may vary based on site conditions, terrain, vegetation density, and access. A site visit is required to confirm the final scope and price. Noland Earthworks does not publish rates or provide binding quotes over email.</p>

      <div class="cta">
        <a href="https://www.nolandearthworks.com/quote">Schedule a Site Visit</a>
      </div>
      <p style="text-align:center;font-size:12px;color:#888;">Or call us directly: <strong>615-406-4819</strong></p>
    </div>
    <div class="footer">
      Noland Earthworks, LLC &bull; Vanleer, TN &bull; <a href="https://www.nolandearthworks.com" style="color:#f0a500;">nolandearthworks.com</a><br />
      Veteran-owned and operated. Licensed and insured.
    </div>
  </div>
</body>
</html>`;

      const { Resend } = await import("resend");
      const resend = new Resend(ENV.resendApiKey);
      const { error } = await resend.emails.send({
        from: "Noland Earthworks <noreply@nolandearthworks.com>",
        to: quote.clientEmail,
        replyTo: "jon@nolandearthworks.com",
        subject: `Your Estimate from Noland Earthworks — ${quote.jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
        html,
      });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Email failed: ${error.message}` });

      await db.update(distanceQuotes)
        .set({ emailedAt: new Date(), status: "sent", sentAt: new Date() })
        .where(eq(distanceQuotes.id, input.id));

      return { success: true };
    }),

  analytics: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const all = await db.select().from(distanceQuotes).orderBy(desc(distanceQuotes.createdAt));

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const q of all) statusCounts[q.status] = (statusCounts[q.status] ?? 0) + 1;
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // Acceptance rate by job type
    const byJobType: Record<string, { total: number; accepted: number; totalCents: number; acceptedCents: number }> = {};
    for (const q of all) {
      const jt = q.jobType || "Other";
      if (!byJobType[jt]) byJobType[jt] = { total: 0, accepted: 0, totalCents: 0, acceptedCents: 0 };
      byJobType[jt].total++;
      byJobType[jt].totalCents += q.adjustedJobTotalCents;
      if (q.status === "accepted") { byJobType[jt].accepted++; byJobType[jt].acceptedCents += q.adjustedJobTotalCents; }
    }
    const acceptanceByJobType = Object.entries(byJobType).map(([jobType, d]) => ({
      jobType, total: d.total, accepted: d.accepted,
      acceptanceRate: d.total > 0 ? Math.round((d.accepted / d.total) * 100) : 0,
      totalRevenueCents: d.totalCents, acceptedRevenueCents: d.acceptedCents,
    }));

    // Distance distribution (bucketed)
    const distanceBuckets: Record<string, number> = { "0-30 mi": 0, "31-50 mi": 0, "51-75 mi": 0, "76-100 mi": 0, "100+ mi": 0 };
    for (const q of all) {
      const d = q.distanceMiles ?? 0;
      if (d <= 30) distanceBuckets["0-30 mi"]++;
      else if (d <= 50) distanceBuckets["31-50 mi"]++;
      else if (d <= 75) distanceBuckets["51-75 mi"]++;
      else if (d <= 100) distanceBuckets["76-100 mi"]++;
      else distanceBuckets["100+ mi"]++;
    }
    const distanceDistribution = Object.entries(distanceBuckets).map(([range, count]) => ({ range, count }));

    // Monthly trends (last 6 months)
    const now = new Date();
    const monthlyMap: Record<string, { created: number; accepted: number; revenueCents: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { created: 0, accepted: 0, revenueCents: 0 };
    }
    for (const q of all) {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].created++;
        if (q.status === "accepted") { monthlyMap[key].accepted++; monthlyMap[key].revenueCents += q.adjustedJobTotalCents; }
      }
    }
    const monthlyTrends = Object.entries(monthlyMap).map(([month, d]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      created: d.created, accepted: d.accepted,
      revenueDollars: Math.round(d.revenueCents / 100),
    }));

    // Revenue pipeline
    const pipeline = {
      draftCents: all.filter(q => q.status === "draft").reduce((s, q) => s + q.adjustedJobTotalCents, 0),
      sentCents: all.filter(q => q.status === "sent").reduce((s, q) => s + q.adjustedJobTotalCents, 0),
      acceptedCents: all.filter(q => q.status === "accepted").reduce((s, q) => s + q.adjustedJobTotalCents, 0),
      declinedCents: all.filter(q => q.status === "declined").reduce((s, q) => s + q.adjustedJobTotalCents, 0),
    };

    // Avg distance by job type
    const avgDistByType: Record<string, { sum: number; count: number }> = {};
    for (const q of all) {
      const jt = q.jobType || "Other";
      if (!avgDistByType[jt]) avgDistByType[jt] = { sum: 0, count: 0 };
      avgDistByType[jt].sum += q.distanceMiles ?? 0;
      avgDistByType[jt].count++;
    }
    const avgDistanceByJobType = Object.entries(avgDistByType).map(([jobType, d]) => ({
      jobType, avgMiles: d.count > 0 ? Math.round(d.sum / d.count) : 0,
    }));

    // Avg quote value per job type per month (last 6 months)
    // Structure: { [monthKey]: { [jobType]: { sum: number; count: number } } }
    const monthKeys: string[] = [];
    const monthLabels: Record<string, string> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthKeys.push(key);
      monthLabels[key] = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
    // Collect all job types present in last-6-month data
    const jobTypesSet = new Set<string>();
    const avgValMap: Record<string, Record<string, { sum: number; count: number }>> = {};
    for (const mk of monthKeys) avgValMap[mk] = {};
    for (const q of all) {
      const d = new Date(q.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!avgValMap[key]) continue; // outside 6-month window
      const jt = q.jobType || "Other";
      jobTypesSet.add(jt);
      if (!avgValMap[key][jt]) avgValMap[key][jt] = { sum: 0, count: 0 };
      avgValMap[key][jt].sum += q.adjustedJobTotalCents;
      avgValMap[key][jt].count++;
    }
    const jobTypesList = Array.from(jobTypesSet).sort();
    // Build one row per month with a key per job type (avg dollars, null if no quotes)
    const avgValueByJobTypeByMonth = monthKeys.map(mk => {
      const row: Record<string, string | number | null> = { month: mk, label: monthLabels[mk] };
      for (const jt of jobTypesList) {
        const entry = avgValMap[mk][jt];
        row[jt] = entry && entry.count > 0 ? Math.round(entry.sum / entry.count / 100) : null;
      }
      return row;
    });

    return {
      total: all.length,
      statusBreakdown,
      acceptanceByJobType,
      distanceDistribution,
      monthlyTrends,
      pipeline,
      avgDistanceByJobType,
      avgValueByJobTypeByMonth,
      jobTypesList,
      overallAcceptanceRate: all.length > 0
        ? Math.round((all.filter(q => q.status === "accepted").length / all.length) * 100) : 0,
    };
  }),
});

// ─── Settings Router ─────────────────────────────────────────────────────────
const settingsRouter = router({
  getBusinessSettings: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(businessSettings).limit(1);
    if (rows.length === 0) {
      // Seed default row
      await db.insert(businessSettings).values({});
      const seeded = await db.select().from(businessSettings).limit(1);
      return seeded[0] ?? null;
    }
    return rows[0];
  }),
  updateBusinessSettings: ownerProcedure
    .input(z.object({
      companyName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      website: z.string().optional(),
      googleReviewUrl: z.string().optional(),
      defaultTaxRate: z.string().optional(),
      brandColor: z.string().optional(),
      licenseNumbers: z.string().optional(),
      logoLight: z.string().optional(),
      logoDark: z.string().optional(),
      // Promotional banner
      promoBannerEnabled: z.boolean().optional(),
      promoBannerText: z.string().max(300).optional(),
      promoBannerColor: z.enum(["orange", "green", "blue", "red"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(businessSettings).limit(1);
      if (rows.length === 0) {
        await db.insert(businessSettings).values({ ...input });
      } else {
        await db.update(businessSettings).set({ ...input, updatedAt: new Date() }).where(eq(businessSettings.id, rows[0].id));
      }
      return { success: true };
    }),
  getAutomationSettings: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(automationSettings).limit(1);
    if (rows.length === 0) {
      await db.insert(automationSettings).values({});
      const seeded = await db.select().from(automationSettings).limit(1);
      return seeded[0] ?? null;
    }
    return rows[0];
  }),
  updateAutomationSettings: ownerProcedure
    .input(z.object({
      automationsEnabled: z.boolean().optional(),
      newLeadMaxMinutes: z.number().int().min(0).optional(),
      contactedMaxDays: z.number().int().min(0).optional(),
      siteVisitMaxDays: z.number().int().min(0).optional(),
      quoteSentMaxDays: z.number().int().min(0).optional(),
      followUpMaxDays: z.number().int().min(0).optional(),
      coldNurtureMaxDays: z.number().int().min(0).optional(),
      followUpIntervalDays: z.number().int().min(0).optional(),
      maxTouchesBeforeClose: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(automationSettings).limit(1);
      if (rows.length === 0) {
        await db.insert(automationSettings).values({ ...input });
      } else {
        await db.update(automationSettings).set({ ...input, updatedAt: new Date() }).where(eq(automationSettings.id, rows[0].id));
      }
      return { success: true };
    }),

  // ─── Integration Status ──────────────────────────────────────────────────────
  getIntegrationStatus: ownerProcedure.query(async () => {
    const jobberConnected = await isJobberConnected();
    const twilioConfigured = !!(ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber);
    const resendConfigured = !!ENV.resendApiKey;
    // Google Maps is always available via the Manus proxy — no key needed
    const googleMapsActive = true;

    // ── Jobber token expiry details ─────────────────────────────────────────
    // Fetch the most-recently-updated token row to surface expiry info to the UI.
    // The background scheduler auto-refreshes short-lived access tokens, but the
    // refresh token itself can expire if the server is offline for an extended
    // period (Jobber refresh tokens last ~365 days but can be revoked manually).
    let jobberExpiresAt: string | null = null;
    let jobberTokenStatus: "ok" | "expiring_soon" | "expired" | "not_connected" = "not_connected";
    const db = await getDb();
    if (db && jobberConnected) {
      try {
        const tokenRows = await db.select().from(jobberTokens).orderBy(desc(jobberTokens.updatedAt)).limit(1);
        if (tokenRows.length > 0) {
          const expiresAt = tokenRows[0].expiresAt;
          jobberExpiresAt = expiresAt.toISOString();
          const msLeft = expiresAt.getTime() - Date.now();
          if (msLeft <= 0) {
            jobberTokenStatus = "expired";
          } else if (msLeft < 15 * 60 * 1000) {
            // Within 15 minutes — warn so the user knows a refresh is imminent
            jobberTokenStatus = "expiring_soon";
          } else {
            jobberTokenStatus = "ok";
          }
        }
      } catch {
        // Non-fatal — just omit expiry details if the query fails
      }
    }

    return {
      jobber: { connected: jobberConnected, expiresAt: jobberExpiresAt, tokenStatus: jobberTokenStatus },
      twilio: { configured: twilioConfigured, fromNumber: twilioConfigured ? ENV.twilioFromNumber : null },
      resend: { configured: resendConfigured },
      googleMaps: { active: googleMapsActive },

      facebook: { connected: false },
      googleBusiness: { connected: false },
      quickbooks: { connected: false },
      gusto: { connected: false },
    };
  }),

  // ─── Service Catalog ───────────────────────────────────────────────────────
  getServiceCatalog: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(serviceCatalog).orderBy(serviceCatalog.sortOrder);
  }),
  upsertServiceCatalog: ownerProcedure
    .input(z.array(z.object({
      id: z.number().optional(),
      serviceType: z.string().min(1),
      easyAcresPerDay: z.string(),
      normalAcresPerDay: z.string(),
      hardAcresPerDay: z.string(),
      sortOrder: z.number().int().default(0),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Delete all and re-insert to handle ordering cleanly
      await db.delete(serviceCatalog);
      for (const item of input) {
        await db.insert(serviceCatalog).values({
          serviceType: item.serviceType,
          easyAcresPerDay: item.easyAcresPerDay,
          normalAcresPerDay: item.normalAcresPerDay,
          hardAcresPerDay: item.hardAcresPerDay,
          sortOrder: item.sortOrder,
        });
      }
      // ── Sync pricing_benchmarks to match the service catalog ──────────────
      // 1. Ensure every catalog service has a benchmark row (placeholder if new)
      const newServiceTypes = input.map(i => i.serviceType);
      for (const serviceType of newServiceTypes) {
        await db.insert(pricingBenchmarks)
          .values({
            serviceType,
            lowPerAcre: 0,
            midPerAcre: 0,
            highPerAcre: 0,
            region: 'Middle & West Tennessee',
            researchSummary: null,
            lastUpdatedAt: new Date(),
          })
          .onDuplicateKeyUpdate({
            set: { serviceType }, // no-op: preserve existing benchmark data
          });
      }
      // 2. Remove benchmark rows for services no longer in the catalog
      const existingBenchmarks = await db.select({ serviceType: pricingBenchmarks.serviceType }).from(pricingBenchmarks);
      const toDelete = existingBenchmarks.map(b => b.serviceType).filter(st => !newServiceTypes.includes(st));
      for (const st of toDelete) {
        await db.delete(pricingBenchmarks).where(eq(pricingBenchmarks.serviceType, st));
      }
      return { success: true };
    }),

  // ─── Message Templates ──────────────────────────────────────────────────────
  getMessageTemplates: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(messageTemplates);
  }),
  upsertMessageTemplate: ownerProcedure
    .input(z.object({
      id: z.number().optional(),
      category: z.string(),
      channel: z.string(),
      subject: z.string().optional(),
      body: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      if (input.id) {
        await db.update(messageTemplates).set({ subject: input.subject, body: input.body, updatedAt: new Date() }).where(eq(messageTemplates.id, input.id));
      } else {
        const existing = await db.select().from(messageTemplates).where(and(eq(messageTemplates.category, input.category), eq(messageTemplates.channel, input.channel))).limit(1);
        if (existing.length > 0) {
          await db.update(messageTemplates).set({ subject: input.subject, body: input.body, updatedAt: new Date() }).where(eq(messageTemplates.id, existing[0].id));
        } else {
          await db.insert(messageTemplates).values({ category: input.category, channel: input.channel, subject: input.subject, body: input.body });
        }
      }
      return { success: true };
    }),

  // ─── Reminder Rules ─────────────────────────────────────────────────────────
  getReminderRules: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reminderRules);
  }),
  createReminderRule: ownerProcedure
    .input(z.object({
      ruleType: z.enum(["invoice", "visit"]),
      offsetDays: z.number().int(),
      channel: z.enum(["email", "sms", "both"]).default("sms"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.insert(reminderRules).values(input);
      return { success: true };
    }),
  deleteReminderRule: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(reminderRules).where(eq(reminderRules.id, input.id));
      return { success: true };
    }),
  // ─── User Management ─────────────────────────────────────────────────────────────────
  listUsers: ownerProcedure.query(async () => {
    return getAllUsers();
  }),
  setUserRole: ownerProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      await setUserRole(input.userId, input.role);
      return { success: true };
    }),
  // ─── AI Pricing Settings ─────────────────────────────────────────────────────
  getAIPricingSettings: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const rows = await db.select().from(aiPricingSettings).limit(1);
    if (rows.length === 0) {
      await db.insert(aiPricingSettings).values({});
      const seeded = await db.select().from(aiPricingSettings).limit(1);
      return seeded[0];
    }
    return rows[0];
  }),
  updateAIPricingSettings: ownerProcedure
    .input(z.object({
      forestryMulchingBaseRate: z.number().int().min(0).optional(),
      landClearingBaseRate: z.number().int().min(0).optional(),
      brushHoggingBaseRate: z.number().int().min(0).optional(),
      rowClearingBaseRate: z.number().int().min(0).optional(),
      mobilizationFee: z.number().int().min(0).optional(),
      minimumJobTotal: z.number().int().min(0).optional(),
      densityModerateMultiplier: z.string().optional(),
      densityHeavyMultiplier: z.string().optional(),
      terrainRollingMultiplier: z.string().optional(),
      terrainSteepMultiplier: z.string().optional(),
      accessModerateMultiplier: z.string().optional(),
      accessDifficultMultiplier: z.string().optional(),
      priceRangeSpread: z.string().optional(),
      westTnMobilizationFee: z.number().int().min(0).nullable().optional(),
      // Add-on rates
      stumpGrindingPerStump: z.number().int().min(0).optional(),
      debrisHaulingPerLoad: z.number().int().min(0).optional(),
      postClearSeedingPerAcre: z.number().int().min(0).optional(),
      fenceLineClearingPerLf: z.number().int().min(0).optional(),
      mulchRedistributionPerAcre: z.number().int().min(0).optional(),
      selectiveClearingFlatRate: z.number().int().min(0).optional(),
      // Volume discounts
      volumeDiscount3to5Pct: z.number().int().min(0).max(50).optional(),
      volumeDiscount5to10Pct: z.number().int().min(0).max(50).optional(),
      volumeDiscount10plusPct: z.number().int().min(0).max(50).optional(),
      // Production rates
      apdForestryMulching: z.string().optional(),
      apdLandClearing: z.string().optional(),
      apdRowClearing: z.string().optional(),
      apdBrushHogging: z.string().optional(),
      // Seasonal adjustment
      seasonalPeakUpliftPct: z.number().int().min(0).max(50).optional(),
      seasonalSlowReductionPct: z.number().int().min(0).max(50).optional(),
      // Complexity premium
      complexityPremiumPct: z.number().int().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db.select().from(aiPricingSettings).limit(1);
      if (rows.length === 0) {
        await db.insert(aiPricingSettings).values({ ...input });
      } else {
        await db.update(aiPricingSettings).set({ ...input, updatedAt: new Date() }).where(eq(aiPricingSettings.id, rows[0].id));
      }
      return { success: true };
    }),
});

// ─── Blackout Dates Router ────────────────────────────────────────────────────
const blackoutDatesRouter = router({
  list: ownerProcedure.query(async () => {
    return getVisitBlackoutDates();
  }),
  add: ownerProcedure
    .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      await addVisitBlackoutDate(input.date, input.reason);
      return { success: true };
    }),
  remove: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await removeVisitBlackoutDate(input.id);
      return { success: true };
    }),
});

// ─── Recurring Blackout Days Router ────────────────────────────────────────────────
const recurringBlackoutRouter = router({
  list: ownerProcedure.query(async () => {
    return getRecurringBlackoutDays();
  }),
  add: ownerProcedure
    .input(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      label: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await addRecurringBlackoutDay(input.dayOfWeek, input.label);
      return { success: true };
    }),
  remove: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await removeRecurringBlackoutDay(input.id);
      return { success: true };
    }),
});

// ─── Combined Ops Router ──────────────────────────────────────────────────────
// ─── Tasks Router ─────────────────────────────────────────────────────────────
const tasksRouter = router({
  list: ownerProcedure
    .input(z.object({ includeCompleted: z.boolean().default(false) }))
    .query(async ({ input }) => {
      const { listOwnerTasks } = await import("./db");
      return listOwnerTasks(input.includeCompleted);
    }),

  complete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { completeOwnerTask } = await import("./db");
      await completeOwnerTask(input.id);
      return { success: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { deleteOwnerTask } = await import("./db");
      await deleteOwnerTask(input.id);
      return { success: true };
    }),
});

// ─── Google Business Profile Router ──────────────────────────────────────────

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/**
 * Fetch reviews from Google Business Profile API using the stored OAuth token.
 * Uses the My Business Reviews API (v4.9) which requires OAuth (not Places API key).
 * Returns up to 50 most recent reviews sorted by newest first.
 */
async function fetchGoogleBusinessReviews(): Promise<{
  reviews: Array<{
    reviewId: string;
    reviewerName: string;
    reviewerPhotoUrl?: string;
    starRating: number;
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: { comment: string; updateTime: string };
  }>;
  averageRating: number | null;
  totalReviewCount: number | null;
}> {
  const { getValidGoogleAccessToken, getGoogleConnectionInfo } = await import("./googleRoutes");
  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) {
    console.error("[Google Reviews] No valid access token — Google not connected or token refresh failed");
    return { reviews: [], averageRating: null, totalReviewCount: null };
  }
  const info = await getGoogleConnectionInfo();
  let locationName = info?.locationName ?? null;

  // Fallback: if locationName was not stored during OAuth callback, discover it now at runtime
  if (!locationName) {
    console.log("[Google Reviews] locationName not in DB — attempting runtime discovery...");
    try {
      // Step 1: fetch accounts
      const accountsRes = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!accountsRes.ok) {
        const txt = await accountsRes.text();
        console.error(`[Google Reviews] accounts API error: ${accountsRes.status} ${txt}`);
      } else {
        const accountsData = (await accountsRes.json()) as {
          accounts?: Array<{ name: string; accountName: string; type: string }>;
        };
        console.log("[Google Reviews] accounts response:", JSON.stringify(accountsData));
        const account = accountsData.accounts?.[0];
        if (account) {
          // Step 2: fetch locations for this account
          const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!locRes.ok) {
            const txt = await locRes.text();
            console.error(`[Google Reviews] locations API error: ${locRes.status} ${txt}`);
          } else {
            const locData = (await locRes.json()) as {
              locations?: Array<{ name: string; title: string }>;
            };
            console.log("[Google Reviews] locations response:", JSON.stringify(locData));
            const loc = locData.locations?.[0];
            if (loc) {
              locationName = loc.name;
              // Persist to DB so future calls don't need to rediscover
              const { googleOAuthTokens } = await import("../drizzle/schema");
              const db2 = await getDb();
              if (db2) {
                await db2.update(googleOAuthTokens).set({
                  locationName: loc.name,
                  businessName: loc.title ?? account.accountName,
                });
                console.log(`[Google Reviews] Persisted locationName: ${loc.name}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[Google Reviews] Runtime location discovery error:", err);
    }
  }

  if (!locationName) {
    console.log("[Google Reviews] Could not determine locationName — falling back to Places API");
    return fetchPlacesApiReviews();
  }

  console.log(`[Google Reviews] Fetching reviews for location: ${locationName}`);
  const url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50&orderBy=updateTime%20desc`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    console.error(`[Google Reviews] API error: ${res.status} ${await res.text()}`);
    return { reviews: [], averageRating: null, totalReviewCount: null };
  }
  const data = (await res.json()) as {
    reviews?: Array<{
      reviewId: string;
      reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
      starRating?: string;
      comment?: string;
      createTime?: string;
      updateTime?: string;
      reviewReply?: { comment?: string; updateTime?: string };
    }>;
    averageRating?: number;
    totalReviewCount?: number;
  };

  const reviewList = (data.reviews ?? []).map((r) => ({
    reviewId: r.reviewId,
    reviewerName: r.reviewer?.isAnonymous ? "Anonymous" : (r.reviewer?.displayName ?? "Google User"),
    reviewerPhotoUrl: r.reviewer?.profilePhotoUrl,
    starRating: STAR_MAP[r.starRating ?? ""] ?? 0,
    comment: r.comment,
    createTime: r.createTime ?? new Date().toISOString(),
    updateTime: r.updateTime ?? new Date().toISOString(),
    reviewReply: r.reviewReply?.comment ? { comment: r.reviewReply.comment, updateTime: r.reviewReply.updateTime ?? "" } : undefined,
  }));

  // If the Business Profile API returned reviews, use them
  if (reviewList.length > 0) {
    return {
      reviews: reviewList,
      averageRating: data.averageRating ?? null,
      totalReviewCount: data.totalReviewCount ?? null,
    };
  }

  // Fallback: use Google Places API (up to 5 most recent reviews, read-only)
  console.log("[Google Reviews] Business Profile API returned 0 reviews — falling back to Places API");
  return fetchPlacesApiReviews();
}

/** Fallback: fetch up to 5 reviews from Google Places API (no OAuth required). */
async function fetchPlacesApiReviews(): Promise<{
  reviews: Array<{
    reviewId: string;
    reviewerName: string;
    reviewerPhotoUrl?: string;
    starRating: number;
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: { comment: string; updateTime: string };
  }>;
  averageRating: number | null;
  totalReviewCount: number | null;
}> {
  const { ENV } = await import("./_core/env");
  const apiKey = ENV.googlePlacesApiKey;
  const placeId = ENV.googlePlaceId;
  if (!apiKey || !placeId) {
    console.error("[Places API] GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID not set");
    return { reviews: [], averageRating: null, totalReviewCount: null };
  }
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews&key=${apiKey}&reviews_sort=newest`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[Places API] HTTP error: ${res.status}`);
    return { reviews: [], averageRating: null, totalReviewCount: null };
  }
  const data = (await res.json()) as {
    result?: {
      name?: string;
      rating?: number;
      user_ratings_total?: number;
      reviews?: Array<{
        author_name?: string;
        profile_photo_url?: string;
        rating?: number;
        text?: string;
        time?: number;
        author_url?: string;
      }>;
    };
    status?: string;
  };
  if (data.status !== "OK" || !data.result) {
    console.error(`[Places API] API status: ${data.status}`);
    return { reviews: [], averageRating: null, totalReviewCount: null };
  }
  const placesReviews = (data.result.reviews ?? []).map((r, idx) => {
    const ts = r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString();
    return {
      reviewId: `places-${placeId}-${idx}-${r.time ?? Date.now()}`,
      reviewerName: r.author_name ?? "Google User",
      reviewerPhotoUrl: r.profile_photo_url,
      starRating: r.rating ?? 0,
      comment: r.text,
      createTime: ts,
      updateTime: ts,
      reviewReply: undefined,
    };
  });
  console.log(`[Places API] Fetched ${placesReviews.length} reviews. Rating: ${data.result.rating}, Total: ${data.result.user_ratings_total}`);
  return {
    reviews: placesReviews,
    averageRating: data.result.rating ?? null,
    totalReviewCount: data.result.user_ratings_total ?? null,
  };
}

const googleRouter = router({
  /** Returns connection status and business name for the Settings card. */
  connectionStatus: ownerProcedure.query(async () => {
    const { getGoogleConnectionInfo } = await import("./googleRoutes");
    const info = await getGoogleConnectionInfo();
    return info ?? { connected: false, businessName: null, locationName: null, expiresAt: null };
  }),
  /** Returns the URL to initiate the Google OAuth flow. */
  getAuthUrl: ownerProcedure.query(() => {
    return { url: "/api/google/authorize" };
  }),
  /** Disconnects Google Business Profile by deleting the stored tokens. */
  disconnect: ownerProcedure.mutation(async () => {
    const { getDb } = await import("./db");
    const { googleOAuthTokens } = await import("../drizzle/schema");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    await db.delete(googleOAuthTokens);
    return { success: true };
  }),
  /**
   * Fetch live Google Business Profile reviews (uses OAuth token).
   * Returns up to 50 most recent reviews with average rating.
   */
  fetchReviews: ownerProcedure.query(async () => {
    return fetchGoogleBusinessReviews();
  }),
  /**
   * Sync Google Business Profile reviews into the local reviews table.
   * Upserts by externalId to avoid duplicates.
   */
  syncReviews: ownerProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const result = await fetchGoogleBusinessReviews();
    let inserted = 0;
    let updated = 0;
    for (const r of result.reviews) {
      if (!r.reviewId) continue;
      const existing = await db.select({ id: reviews.id, response: reviews.response })
        .from(reviews)
        .where(eq(reviews.externalId, r.reviewId))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(reviews).values({
          source: "google",
          externalId: r.reviewId,
          reviewerName: r.reviewerName,
          reviewerPhotoUrl: r.reviewerPhotoUrl,
          rating: r.starRating,
          body: r.comment ?? "",
          response: r.reviewReply?.comment ?? null,
          respondedAt: r.reviewReply?.updateTime ? new Date(r.reviewReply.updateTime) : null,
          reviewedAt: new Date(r.createTime),
        });
        inserted++;
      } else if (r.reviewReply?.comment && !existing[0].response) {
        await db.update(reviews)
          .set({ response: r.reviewReply.comment, respondedAt: r.reviewReply.updateTime ? new Date(r.reviewReply.updateTime) : new Date() })
          .where(eq(reviews.id, existing[0].id));
        updated++;
      }
    }
    return { inserted, updated, total: result.reviews.length };
  }),
  /**
   * Post a reply to a Google Business Profile review via the API.
   * Also saves the reply to the local reviews table.
   */
  replyToReview: ownerProcedure
    .input(z.object({
      localId: z.number().int().positive(),
      externalId: z.string().min(1),
      replyText: z.string().min(1).max(4096),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { getGoogleConnectionInfo, getValidGoogleAccessToken } = await import("./googleRoutes");
      const info = await getGoogleConnectionInfo();
      if (!info?.locationName) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google Business Profile not connected" });
      const accessToken = await getValidGoogleAccessToken();
      if (!accessToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated with Google" });
      const url = `https://mybusiness.googleapis.com/v4/${info.locationName}/reviews/${input.externalId}/reply`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ comment: input.replyText }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Google API error: ${text}` });
      }
      await db.update(reviews)
        .set({ response: input.replyText, respondedAt: new Date() })
        .where(eq(reviews.id, input.localId));
      return { success: true };
    }),
  /**
   * Delete a reply from a Google Business Profile review.
   */
  deleteReply: ownerProcedure
    .input(z.object({
      localId: z.number().int().positive(),
      externalId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { getGoogleConnectionInfo, getValidGoogleAccessToken } = await import("./googleRoutes");
      const info = await getGoogleConnectionInfo();
      if (!info?.locationName) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google Business Profile not connected" });
      const accessToken = await getValidGoogleAccessToken();
      if (!accessToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated with Google" });
      const url = `https://mybusiness.googleapis.com/v4/${info.locationName}/reviews/${input.externalId}/reply`;
      const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok && res.status !== 404) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete reply from Google" });
      }
      await db.update(reviews)
        .set({ response: null, respondedAt: null })
        .where(eq(reviews.id, input.localId));
      return { success: true };
    }),
  /**
   * Generate an AI-drafted reply for a Google Business Profile review.
   * Uses the built-in LLM helper (server-side only).
   * Returns a plain-text draft the owner can edit before posting.
   */
  suggestReply: ownerProcedure
    .input(z.object({
      reviewerName: z.string(),
      starRating: z.number().int().min(1).max(5),
      reviewText: z.string().max(5000).optional(),
      tone: z.enum(["professional", "friendly", "apologetic"]).default("professional"),
    }))
    .mutation(async ({ input }) => {

      const ratingLabel = ["one-star", "two-star", "three-star", "four-star", "five-star"][input.starRating - 1];
      const hasText = input.reviewText && input.reviewText.trim().length > 0;

      // Tone-specific instruction appended to the base system prompt
      const toneInstructions: Record<string, string> = {
        professional:
          "Write in a professional, direct tone. Warm but businesslike. No casual language. Confident and clear.",
        friendly:
          "Write in a warm, conversational tone — like a neighbor talking to a neighbor. Genuine and approachable, but still respectful and never over-the-top.",
        apologetic:
          "Write in a humble, empathetic tone. Acknowledge the reviewer's experience sincerely, take responsibility where appropriate, and make clear you want to make it right. Do not be defensive.",
      };

      const systemPrompt = `You are writing a reply to a Google Business Profile review on behalf of Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company serving Middle & West Tennessee.

Base rules (always apply):
- Sound like a real person, not a template.
- Never use: "solutions", "industry-leading", "best-in-class", "we are passionate", "dedicated team", "we strive to", "cutting-edge", or any corporate jargon.
- No emojis. Ever.
- Keep it concise — 3 to 5 sentences maximum.
- Always thank the reviewer by first name.
- For 5-star reviews: express genuine appreciation, briefly mention the work if context is available, and invite them to reach out for future projects.
- For 4-star reviews: thank them, acknowledge any implicit concern, and invite direct contact if anything fell short.
- For 3-star or below: acknowledge their feedback respectfully, take ownership without being defensive, and invite them to call Jon directly at 615-406-4819 to make it right.
- Sign off as: Jon Noland — Noland Earthworks, LLC

Tone instruction for this reply:
${toneInstructions[input.tone]}`;

      const userPrompt = hasText
        ? `Write a reply to this ${ratingLabel} Google review from ${input.reviewerName}:\n\n"${input.reviewText}"`
        : `Write a reply to a ${ratingLabel} Google review from ${input.reviewerName} who left no written comment.`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const draft = result.choices?.[0]?.message?.content ?? "";
      if (!draft) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a response. Try again." });
      return { draft: typeof draft === "string" ? draft : JSON.stringify(draft) };
    }),
});


// ─── Social Posts Router ─────────────────────────────────────────────────────
// Extracted to server/routers/ads.ts for maintainability
import { socialPostsRouter as _socialPostsRouter, adSpendRouter as _adSpendRouter, platformConnectionStatusProcedure as _platformConnectionStatusProcedure, linkedinSettingsRouter as _linkedinSettingsRouter, adVariantsRouter as _adVariantsRouter } from './routers/ads';
const socialPostsRouter = _socialPostsRouter;
const adVariantsRouter = _adVariantsRouter;


export const opsRouter = router({
  jobs: jobsRouter,
  leads: leadsRouter,
  schedule: scheduleRouter,
  quotes: quotesRouter,
  crews: crewsRouter,
  conversations: conversationsRouter,
  reviews: reviewsRouter,
  timesheets: timesheetsRouter,
  distanceQuotes: distanceQuotesRouter,
  settings: settingsRouter,
  blackoutDates: blackoutDatesRouter,
  recurringBlackout: recurringBlackoutRouter,
  tasks: tasksRouter,
  google: googleRouter,
  socialPosts: socialPostsRouter,
  adVariants: adVariantsRouter,
  ai: aiAutomationRouter,

  generateWeeklyInsight: protectedProcedure
    .input(z.object({
      totalRevenue: z.number(),
      completedJobs: z.number(),
      wonLeads: z.number(),
      openLeads: z.number(),
      totalLeads: z.number(),
      conversionRate: z.number(),
    }))
    .mutation(async ({ input }) => {
      const context = [
        `Total revenue from completed jobs: $${input.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
        `Completed jobs: ${input.completedJobs}.`,
        `Total leads: ${input.totalLeads}. Won: ${input.wonLeads}. Open (active pipeline): ${input.openLeads}.`,
        `Lead-to-close conversion rate: ${input.conversionRate}%.`,
      ].join(" ");

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are writing a brief business performance summary for Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land management company in Middle Tennessee. Write one short paragraph (3-5 sentences) that interprets the business metrics: what the numbers mean, what is going well, what to watch, and one practical observation. Sound like a straight-talking field operator reviewing his own numbers, not a business consultant. No emojis. No filler. No corporate language.",
          },
          {
            role: "user",
            content: `Here are the current business metrics:\n\n${context}\n\nWrite the business insight.`,
          },
        ],
      });
      const insight = (result.choices?.[0]?.message?.content as string ?? "").trim();
      if (!insight) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return an insight. Try again." });
      return { insight };
    }),

  generateScheduleNote: protectedProcedure
    .input(z.object({
      jobTitle: z.string(),
      clientName: z.string(),
      address: z.string().optional(),
      serviceType: z.string().optional(),
      acreage: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const context = [
        `Job: ${input.jobTitle}.`,
        `Client: ${input.clientName}.`,
        input.address ? `Location: ${input.address}.` : "",
        input.serviceType ? `Service: ${input.serviceType}.` : "",
        input.acreage ? `Acreage: ${input.acreage} acres.` : "",
        input.notes ? `Notes from quote/lead: ${input.notes}.` : "",
      ].filter(Boolean).join(" ");

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are writing a brief pre-job field note for Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land management company in Middle Tennessee. Based on the job details, write 2-3 short sentences covering: what to bring or prepare, what to watch for on site (terrain, access, vegetation density), and any relevant safety or logistics notes. Sound like an experienced operator briefing himself before heading out. No emojis. No filler.",
          },
          {
            role: "user",
            content: `Here are the job details:\n\n${context}\n\nWrite the pre-job field note.`,
          },
        ],
      });
      const note = (result.choices?.[0]?.message?.content as string ?? "").trim();
      if (!note) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a note. Try again." });
      return { note };
    }),

  // ─── Platform Connection Status ───────────────────────────────────────────
  /**
   * Live-checks all three social platform credentials.
   * Facebook & Instagram: calls /me on the Graph API with the stored page token.
   * X: verifies all four OAuth 1.0a env vars are present and calls verify_credentials.
   */
  // ─── Ad Spend Tracker (extracted to server/routers/ads.ts) ─────────────────
  adSpend: _adSpendRouter,

  // ─── Platform Connection Status (extracted to server/routers/ads.ts) ─────────
  platformConnectionStatus: _platformConnectionStatusProcedure,

  // ─── LinkedIn Settings (extracted to server/routers/ads.ts) ──────────────────
  getLinkedInSettings: _linkedinSettingsRouter.get,
  saveLinkedInSettings: _linkedinSettingsRouter.save,
  deleteLinkedInSettings: _linkedinSettingsRouter.delete,

  // ─── Copy Settings ────────────────────────────────────────────────────────────
  getCopySettings: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const { copySettings } = await import("../drizzle/schema");
    const rows = await db.select().from(copySettings).limit(1);
    if (rows[0]) return rows[0];
    // Return defaults if no row saved yet
    return {
      id: 0,
      siteUrl: "nolandearthworks.com",
      fbHashtags: "#NolandEarthworks #LandClearing #ForestryMulching #Tennessee",
      igHashtags: "#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #LandManagement #VeteranOwned #MiddleTennessee",
      xHashtags: "#LandClearing #ForestryMulching #Tennessee",
      liHashtags: "#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #VeteranOwned",
      updatedAt: new Date(),
    };
  }),

  saveCopySettings: ownerProcedure
    .input(z.object({
      siteUrl: z.string().max(300),
      fbHashtags: z.string().max(500),
      igHashtags: z.string().max(500),
      xHashtags: z.string().max(500),
      liHashtags: z.string().max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { copySettings } = await import("../drizzle/schema");
      const existing = await db.select().from(copySettings).limit(1);
      if (existing.length > 0) {
        await db.update(copySettings).set(input).where(eq(copySettings.id, existing[0].id));
      } else {
        await db.insert(copySettings).values(input);
      }
      return { success: true };
    }),

  // ── SEO Audit ──────────────────────────────────────────────────────────────

  /**
   * Run a fresh SEO audit against nolandearthworks.com and persist the result.
   * Returns the full audit result including all check items and recommendations.
   */
  runSeoAudit: ownerProcedure
    .input(z.object({ url: z.string().url().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { runSeoAudit } = await import("./seoAudit");
      const { seoAudits, seoFixes } = await import("../drizzle/schema");
      const targetUrl = input.url ?? "https://nolandearthworks.com";
      const result = await runSeoAudit(targetUrl, ENV.googlePlacesApiKey ?? undefined);

      // Always persist the raw live audit result — no carry-forward suppression.
      // The live site HTML determines pass/fail; if a fix was applied, the next
      // audit will naturally return pass because the page content changed.
      await db.insert(seoAudits).values({
        url: result.url,
        auditedAt: result.auditedAt,
        overallGrade: result.overallGrade,
        overallScore: result.overallScore,
        onPageScore: result.onPageScore,
        linksScore: result.linksScore,
        usabilityScore: result.usabilityScore,
        performanceScore: result.performanceScore,
        socialScore: result.socialScore,
        checksJson: JSON.stringify(result.checks),
        recommendationsJson: JSON.stringify(result.recommendations),
        pageTitle: result.pageTitle ?? undefined,
        metaDescription: result.metaDescription ?? undefined,
        loadTimeMs: result.loadTimeMs ?? undefined,
        mobileScore: result.mobileScore ?? undefined,
      });
      return result;
    }),

  /**
   * Fetch the audit history for the given URL, most recent first.
   * Returns lightweight rows (no full checksJson) for the history chart,
   * plus the full latest audit for the detail view.
   */
  getSeoAuditHistory: ownerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(90).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoAudits } = await import("../drizzle/schema");
      const rows = await db
        .select()
        .from(seoAudits)
        .orderBy(desc(seoAudits.auditedAt))
        .limit(input.limit ?? 30);
      const latest = rows[0] ?? null;
      const history = rows.map((r) => ({
        id: r.id,
        auditedAt: r.auditedAt,
        overallScore: r.overallScore,
        overallGrade: r.overallGrade,
        onPageScore: r.onPageScore,
        linksScore: r.linksScore,
        usabilityScore: r.usabilityScore,
        performanceScore: r.performanceScore,
        socialScore: r.socialScore,
      }));
      return {
        history,
        latest: latest
          ? {
              ...latest,
              checks: JSON.parse(latest.checksJson) as import("./seoAudit").SeoCheck[],
              recommendations: JSON.parse(latest.recommendationsJson) as Array<{ priority: string; text: string; category: string }>,
            }
          : null,
      };
    }),

  // ── Clear Last Audit ────────────────────────────────────────────────────────

  /**
   * Delete the most recent SEO audit row (and its associated fixes) so the
   * operator can start fresh without stale cached results.
   */
  clearLastSeoAudit: ownerProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const { seoAudits, seoFixes } = await import("../drizzle/schema");
    // Find the most recent audit
    const [latest] = await db
      .select({ id: seoAudits.id })
      .from(seoAudits)
      .orderBy(desc(seoAudits.auditedAt))
      .limit(1);
    if (!latest) return { deleted: false };
    // Delete associated fixes first (FK constraint)
    await db.delete(seoFixes).where(eq(seoFixes.auditId, latest.id));
    // Delete the audit row
    await db.delete(seoAudits).where(eq(seoAudits.id, latest.id));
    return { deleted: true, id: latest.id };
  }),

  // ── SEO Content Engine ─────────────────────────────────────────────────────

  /**
   * Generate keyword ideas for Noland Earthworks using AI.
   * Returns 15-20 keyword suggestions with intent, difficulty, volume range, and rationale.
   */
  generateSeoKeywords: ownerProcedure
    .input(z.object({
      topic: z.string().optional(),
      county: z.string().optional(),
      count: z.number().int().min(5).max(30).optional(),
    }))
    .mutation(async ({ input }) => {
      const topic = input.topic ?? "land clearing and forestry mulching";
      const county = input.county ?? "Middle Tennessee";
      const count = input.count ?? 15;

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an SEO specialist for Noland Earthworks, LLC — a veteran-owned land clearing and forestry mulching company based in Middle Tennessee. Your job is to generate targeted keyword ideas that will drive qualified leads to the business website nolandearthworks.com. Focus on local, transactional, and informational keywords that landowners, homeowners, developers, and farmers in Tennessee would search when looking for land clearing, forestry mulching, or brush removal services. Avoid generic national keywords. Prioritize county-level and city-level local keywords, service + location combinations, and problem-aware keywords (e.g. "overgrown land clearing Nashville"). Output ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Generate ${count} keyword ideas for the topic: "${topic}" targeting the area: "${county}". For each keyword return: keyword (string), intent ("informational"|"transactional"|"local"), difficulty ("easy"|"medium"|"hard"), volumeRange (string like "50-200"), rationale (1 sentence why this keyword matters for Noland Earthworks), contentType ("service page"|"blog post"|"location page"). Return a JSON array of objects with exactly these fields.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "keyword_ideas",
            strict: true,
            schema: {
              type: "object",
              properties: {
                keywords: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      intent: { type: "string" },
                      difficulty: { type: "string" },
                      volumeRange: { type: "string" },
                      rationale: { type: "string" },
                      contentType: { type: "string" },
                    },
                    required: ["keyword", "intent", "difficulty", "volumeRange", "rationale", "contentType"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["keywords"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = result.choices?.[0]?.message?.content as string ?? "{}";
      let parsed: { keywords: Array<{ keyword: string; intent: string; difficulty: string; volumeRange: string; rationale: string; contentType: string }> };
      try { parsed = JSON.parse(raw); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" }); }
      return parsed.keywords ?? [];
    }),

  /**
   * Save a list of keyword ideas to the seoKeywords table.
   */
  saveSeoKeywords: ownerProcedure
    .input(z.array(z.object({
      keyword: z.string().max(300),
      intent: z.string().max(50),
      difficulty: z.string().max(20),
      volumeRange: z.string().max(50).optional(),
      rationale: z.string().optional(),
      contentType: z.string().max(100).optional(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoKeywords } = await import("../drizzle/schema");
      await db.insert(seoKeywords).values(input.map((k) => ({
        keyword: k.keyword,
        intent: k.intent,
        difficulty: k.difficulty,
        volumeRange: k.volumeRange ?? null,
        rationale: k.rationale ?? null,
        contentType: k.contentType ?? null,
      })));
      return { saved: input.length };
    }),

  /**
   * List all saved keywords, most recent first.
   */
  listSeoKeywords: ownerProcedure
    .input(z.object({ savedOnly: z.boolean().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { seoKeywords } = await import("../drizzle/schema");
      const rows = input.savedOnly
        ? await db.select().from(seoKeywords).where(eq(seoKeywords.saved, true)).orderBy(desc(seoKeywords.createdAt))
        : await db.select().from(seoKeywords).orderBy(desc(seoKeywords.createdAt));
      return rows;
    }),

  /**
   * Toggle the saved/starred status of a keyword.
   */
  toggleSeoKeywordSaved: ownerProcedure
    .input(z.object({ id: z.number().int(), saved: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoKeywords } = await import("../drizzle/schema");
      await db.update(seoKeywords).set({ saved: input.saved }).where(eq(seoKeywords.id, input.id));
      return { success: true };
    }),

  /**
   * Delete a saved keyword.
   */
  deleteSeoKeyword: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoKeywords } = await import("../drizzle/schema");
      await db.delete(seoKeywords).where(eq(seoKeywords.id, input.id));
      return { success: true };
    }),

  /**
   * Generate a full SEO blog article targeting a specific keyword.
   * Written in Jon's brand voice — direct, plain, no corporate filler.
   */
  generateSeoArticle: ownerProcedure
    .input(z.object({
      keyword: z.string().max(300),
      keywordId: z.number().int().optional(),
      wordCount: z.number().int().min(400).max(3000).optional(),
      articleType: z.enum(["blog post", "service page", "location page", "FAQ page"]).optional(),
      additionalContext: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input }) => {
      const wordCount = input.wordCount ?? 900;
      const articleType = input.articleType ?? "blog post";

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are writing SEO content for Noland Earthworks, LLC — a veteran-owned land clearing and forestry mulching company based in Middle Tennessee. The owner is Jon Noland, a veteran who runs the business himself with a tracked forestry mulcher. The brand voice is direct, plain, confident, and grounded — like a real person who does this work, not a marketing department. Rules: no emojis, no corporate jargon, no filler phrases like "solutions" or "we strive to", no hashtag overload. Write like a landowner would talk to another landowner. Focus on practical value: what the service does, why it matters, what the customer gets. Always include the target keyword naturally in the title, first paragraph, and 2-3 subheadings. Include a clear call to action at the end pointing to nolandearthworks.com. Output ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Write a ${wordCount}-word ${articleType} targeting the keyword: "${input.keyword}". ${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""} Return a JSON object with: title (string, H1, includes keyword), metaDescription (string, 150-160 chars, includes keyword), bodyMarkdown (string, full article in Markdown with H2/H3 subheadings, natural keyword usage, and a CTA at the end).`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_article",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                metaDescription: { type: "string" },
                bodyMarkdown: { type: "string" },
              },
              required: ["title", "metaDescription", "bodyMarkdown"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = result.choices?.[0]?.message?.content as string ?? "{}";
      let parsed: { title: string; metaDescription: string; bodyMarkdown: string };
      try { parsed = JSON.parse(raw); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON" }); }

      // Persist to DB
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoArticles } = await import("../drizzle/schema");
      const wordCountActual = parsed.bodyMarkdown.split(/\s+/).length;
      const [inserted] = await db.insert(seoArticles).values({
        targetKeyword: input.keyword,
        title: parsed.title,
        metaDescription: parsed.metaDescription,
        bodyMarkdown: parsed.bodyMarkdown,
        wordCount: wordCountActual,
        keywordId: input.keywordId ?? null,
        status: "draft",
      });

      // Mark keyword as targeted if keywordId provided
      if (input.keywordId) {
        const { seoKeywords } = await import("../drizzle/schema");
        await db.update(seoKeywords).set({ targeted: true }).where(eq(seoKeywords.id, input.keywordId));
      }

      // Fetch the inserted row
      const rows = await db.select().from(seoArticles).orderBy(desc(seoArticles.createdAt)).limit(1);
      return rows[0] ?? { ...parsed, id: 0, targetKeyword: input.keyword, wordCount: wordCountActual, status: "draft" as const, keywordId: null, notes: null, createdAt: new Date(), updatedAt: new Date() };
    }),

  /**
   * List all saved SEO articles.
   */
  listSeoArticles: ownerProcedure
    .input(z.object({ status: z.enum(["draft", "ready", "published"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { seoArticles } = await import("../drizzle/schema");
      const rows = input.status
        ? await db.select().from(seoArticles).where(eq(seoArticles.status, input.status)).orderBy(desc(seoArticles.createdAt))
        : await db.select().from(seoArticles).orderBy(desc(seoArticles.createdAt));
      return rows;
    }),

  /**
   * Get a single SEO article by ID.
   */
  getSeoArticle: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const { seoArticles } = await import("../drizzle/schema");
      const rows = await db.select().from(seoArticles).where(eq(seoArticles.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  /**
   * Update an SEO article (status, notes, or body edits).
   */
  updateSeoArticle: ownerProcedure
    .input(z.object({
      id: z.number().int(),
      title: z.string().max(500).optional(),
      metaDescription: z.string().max(500).optional(),
      bodyMarkdown: z.string().optional(),
      status: z.enum(["draft", "ready", "published"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoArticles } = await import("../drizzle/schema");
      const { id, ...updates } = input;
      const cleanUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) cleanUpdates.title = updates.title;
      if (updates.metaDescription !== undefined) cleanUpdates.metaDescription = updates.metaDescription;
      if (updates.bodyMarkdown !== undefined) {
        cleanUpdates.bodyMarkdown = updates.bodyMarkdown;
        cleanUpdates.wordCount = updates.bodyMarkdown.split(/\s+/).length;
      }
      if (updates.status !== undefined) cleanUpdates.status = updates.status;
      if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;
      await db.update(seoArticles).set(cleanUpdates).where(eq(seoArticles.id, id));
      return { success: true };
    }),

  /**
   * Delete an SEO article.
   */
  deleteSeoArticle: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoArticles } = await import("../drizzle/schema");
      await db.delete(seoArticles).where(eq(seoArticles.id, input.id));
      return { success: true };
    }),

  // ── SEO Fix Issues ──────────────────────────────────────────────────────────

  /**
   * Generate AI fix instructions for all failed/warned checks in an audit.
   * Upserts one seoFixes row per check (idempotent — re-running regenerates instructions).
   */
  generateSeoFixes: ownerProcedure
    .input(z.object({ auditId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoAudits, seoFixes } = await import("../drizzle/schema");

      // Load the audit
      const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, input.auditId)).limit(1);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });

      const checks: Array<{
        id: string; category: string; label: string; status: string;
        priority: string; detail: string; value?: string; recommendation?: string;
      }> = JSON.parse(audit.checksJson ?? "[]");

      // Only generate fixes for non-passing checks
      const fixable = checks.filter((c) => c.status === "fail" || c.status === "warn");
      if (fixable.length === 0) return { generated: 0 };

      // Build a single LLM call to generate all fixes at once (structured JSON)
      const checksText = fixable
        .map(
          (c, i) =>
            `${i + 1}. [${c.status.toUpperCase()}] ${c.label} (${c.category}, priority: ${c.priority})\n   Check ID: ${c.id}\n   Detail: ${c.detail}${c.recommendation ? `\n   Hint: ${c.recommendation}` : ""}${c.value ? `\n   Current value: ${c.value}` : ""}`
        )
        .join("\n\n");

      const systemPrompt = `You are a senior SEO consultant and technical researcher helping a small business owner fix SEO issues on their Squarespace website (nolandearthworks.com — a veteran-owned land clearing and forestry mulching company in Middle & West Tennessee).

For EACH issue you must:
1. RESEARCH the issue — explain why it matters for SEO rankings, what Google's official guidance says, and what real-world impact this specific type of issue has on local service businesses. Be specific and factual, not generic. Reference known Google ranking factors, Core Web Vitals, E-E-A-T, or local SEO best practices where relevant.
2. WRITE FIX INSTRUCTIONS — clear, numbered, Squarespace-specific steps. Include exact code or text to paste where applicable. If a fix requires Code Injection, specify exactly where (Header, Footer, or Page-level). If a fix is not possible on Squarespace without a developer, say so clearly.

Tone: direct, professional, no jargon. Write for a non-technical business owner who is smart but not a developer.`;

      const userPrompt = `Research and generate fix instructions for these ${fixable.length} SEO issues found on nolandearthworks.com:

${checksText}

Return a JSON object with a "fixes" array — one object per issue in the same order as listed above.`;

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_fixes",
            strict: true,
              schema: {
              type: "object",
              properties: {
                fixes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      checkId: { type: "string" },
                      researchContext: { type: "string", description: "Why this issue matters for SEO: Google guidance, ranking factor impact, local SEO relevance, and real-world consequences for a service business. 2-4 sentences, factual and specific." },
                      instructions: { type: "string", description: "Numbered, Squarespace-specific fix steps with exact code or text to paste where applicable." },
                    },
                    required: ["checkId", "researchContext", "instructions"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["fixes"],
              additionalProperties: false,
            },
          },
        },
      });

      let fixInstructions: Array<{ checkId: string; researchContext: string; instructions: string }> = [];
      try {
        const raw = llmResponse?.choices?.[0]?.message?.content;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        fixInstructions = parsed?.fixes ?? [];
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI fix instructions." });
      }

      // Upsert one row per fixable check
      let generated = 0;
      for (const check of fixable) {
        const aiEntry = fixInstructions.find((f) => f.checkId === check.id);
        const aiInstructions = aiEntry?.instructions ?? `No specific instructions generated for this check. Review manually: ${check.detail}`;
        const researchContext = aiEntry?.researchContext ?? null;

        // Check if a fix row already exists for this audit+check
        const [existing] = await db
          .select({ id: seoFixes.id })
          .from(seoFixes)
          .where(and(eq(seoFixes.auditId, input.auditId), eq(seoFixes.checkId, check.id)))
          .limit(1);

        if (existing) {
          await db
            .update(seoFixes)
            .set({ aiInstructions, researchContext, checkStatus: check.status, priority: check.priority })
            .where(eq(seoFixes.id, existing.id));
        } else {
          await db.insert(seoFixes).values({
            auditId: input.auditId,
            checkId: check.id,
            category: check.category,
            label: check.label,
            checkStatus: check.status,
            priority: check.priority,
            researchContext,
            aiInstructions,
            status: "pending",
          });
        }
        generated++;
      }

      return { generated };
    }),

  /** Get all fix rows for a given audit */
  getSeoFixes: ownerProcedure
    .input(z.object({ auditId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoFixes } = await import("../drizzle/schema");
      return db
        .select()
        .from(seoFixes)
        .where(eq(seoFixes.auditId, input.auditId))
        .orderBy(seoFixes.priority, seoFixes.checkStatus);
    }),

  /** Update a fix row — status, note */
  updateSeoFix: ownerProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending", "in_progress", "resolved", "skipped"]).optional(),
        note: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoFixes } = await import("../drizzle/schema");
      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) {
        updateData.status = input.status;
        updateData.resolvedAt = input.status === "resolved" ? new Date() : null;
      }
      if (input.note !== undefined) updateData.note = input.note;
      await db.update(seoFixes).set(updateData).where(eq(seoFixes.id, input.id));
      return { success: true };
    }),

  /**
   * Apply Fix for a specific SEO check.
   * - AUTO_PATCHABLE_CHECKS: directly edits client/index.html and returns autoPatched: true
   * - SQUARESPACE_MANUAL_CHECKS: generates Squarespace instructions and returns isSquarespace: true
   * - Other checks: generates a general fix snippet
   */
  applySeoFix: ownerProcedure
    .input(
      z.object({
        fixId: z.number().int(),
        auditId: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoFixes, seoAudits } = await import("../drizzle/schema");

      const [fix] = await db.select().from(seoFixes).where(eq(seoFixes.id, input.fixId)).limit(1);
      if (!fix) throw new TRPCError({ code: "NOT_FOUND", message: "Fix not found." });

      const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, input.auditId)).limit(1);
      const checks: Array<{ id: string; label: string; status: string; value?: string; detail: string; recommendation?: string }> = JSON.parse(audit?.checksJson ?? "[]");
      const check = checks.find((c) => c.id === fix.checkId);

      // Route: auto-patchable checks go directly to the patcher
      if (AUTO_PATCHABLE_CHECKS.has(fix.checkId)) {
        const patchResult = await autoPatchSeoCheck(
          fix.checkId,
          check?.detail ?? "",
          check?.recommendation ?? "",
          fix.aiInstructions ?? ""
        );
        if (patchResult.patched) {
          // Mark as resolved in DB
          await db
            .update(seoFixes)
            .set({ status: "resolved", aiInstructions: patchResult.description })
            .where(eq(seoFixes.id, fix.id));
          return {
            snippet: patchResult.description,
            autoPatched: true,
            isSquarespace: false,
            description: patchResult.description,
          };
        } else if (!patchResult.patched && !patchResult.manual) {
          // Already correct — mark resolved anyway
          await db
            .update(seoFixes)
            .set({ status: "resolved" })
            .where(eq(seoFixes.id, fix.id));
          return {
            snippet: patchResult.reason,
            autoPatched: true,
            isSquarespace: false,
            description: patchResult.reason,
          };
        }
      }

      // Route: Squarespace-only checks — generate manual instructions
      const isSquarespace = SQUARESPACE_MANUAL_CHECKS.has(fix.checkId);

      const systemPrompt = isSquarespace
        ? `You are an SEO technical consultant helping a small business owner fix issues on their Squarespace website (nolandearthworks.com — a veteran-owned land clearing company in Tennessee). Your job is to produce exact, step-by-step instructions the owner can follow in Squarespace to fix this issue.

Squarespace-specific location guidance:
- Custom <head> code (meta tags, JSON-LD schema, canonical tags): Settings > Advanced > Code Injection > Header
- Page-level meta title and meta description: open the page editor, click the gear icon (Page Settings) > SEO tab
- Open Graph / social sharing image: Page Settings > Social Image
- Image alt text: click the image block in the editor > Edit > Alt Text field
- H1/H2 headings: use the text block editor, select text, choose Heading 1 or Heading 2 from the format dropdown
- Body copy / page content: edit directly in the page editor
- Page URL slug: Page Settings > General > URL Slug

Be specific. Tell the owner exactly where to go in Squarespace and what to type or paste. Keep it concise and actionable.`
        : `You are an SEO technical consultant helping a small business owner fix issues on their website (nolandearthworks.com — a veteran-owned land clearing company in Tennessee). Produce a ready-to-apply fix: exact HTML, JSON-LD, or text the owner can copy and paste. Be specific and complete.`;

      const userPrompt = `Generate a ready-to-apply fix for this SEO issue:

Check: ${fix.label}
Category: ${fix.category}
Status: ${fix.checkStatus}
Current value: ${check?.value ?? "unknown"}
Detail: ${check?.detail ?? fix.aiInstructions}
Recommendation: ${check?.recommendation ?? ""}

${isSquarespace ? "Provide step-by-step Squarespace instructions. This cannot be auto-applied — the owner must do it manually in Squarespace." : "Provide the exact code or text to copy-paste. Include brief instructions on where to apply it."}`;

      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const snippet = llmResponse?.choices?.[0]?.message?.content ?? "Could not generate fix snippet.";
      return { snippet, autoPatched: false, isSquarespace };
    }),

  /**
   * Apply All SEO Fixes — generates fix snippets for every unresolved fix in an audit
   * and marks them all as resolved. Returns per-fix results for the confirmation panel.
   */
  applyAllSeoFixes: ownerProcedure
    .input(
      z.object({
        auditId: z.number().int(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoFixes, seoAudits } = await import("../drizzle/schema");

      // Load audit for context
      const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, input.auditId)).limit(1);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });
      const checks: Array<{ id: string; label: string; status: string; value?: string; detail: string; recommendation?: string }> = JSON.parse(audit.checksJson ?? "[]");

      // Load all pending/in_progress fixes for this audit
      const pendingFixes = await db
        .select()
        .from(seoFixes)
        .where(
          and(
            eq(seoFixes.auditId, input.auditId),
            inArray(seoFixes.status, ["pending", "in_progress"])
          )
        );

      if (pendingFixes.length === 0) {
        return { results: [], message: "All fixes are already resolved." };
      }

      // Process each fix sequentially to avoid rate limits
      const results: Array<{
        fixId: number;
        label: string;
        category: string;
        priority: string;
        status: "applied" | "failed";
        snippet: string;
        autoPatched: boolean;
        isSquarespace: boolean;
        error?: string;
      }> = [];

      for (const fix of pendingFixes) {
        try {
          const check = checks.find((c) => c.id === fix.checkId);

          // Route: auto-patchable checks
          if (AUTO_PATCHABLE_CHECKS.has(fix.checkId)) {
            const patchResult = await autoPatchSeoCheck(
              fix.checkId,
              check?.detail ?? "",
              check?.recommendation ?? "",
              fix.aiInstructions ?? ""
            );
            const desc = patchResult.patched
              ? patchResult.description
              : !patchResult.patched && !patchResult.manual
              ? patchResult.reason
              : "Could not auto-patch.";
            await db
              .update(seoFixes)
              .set({ status: "resolved", aiInstructions: desc })
              .where(eq(seoFixes.id, fix.id));
            results.push({
              fixId: fix.id,
              label: fix.label,
              category: fix.category,
              priority: fix.priority,
              status: "applied",
              snippet: desc,
              autoPatched: true,
              isSquarespace: false,
            });
            continue;
          }

          // Route: Squarespace-only checks
          const isSquarespace = SQUARESPACE_MANUAL_CHECKS.has(fix.checkId);
          const systemPrompt = isSquarespace
            ? `You are an SEO technical consultant helping a small business owner fix issues on their Squarespace website (nolandearthworks.com). Produce exact, step-by-step Squarespace instructions. Be specific about where in Squarespace to make each change.`
            : `You are an SEO technical consultant helping a small business owner fix issues on their website (nolandearthworks.com). Produce a ready-to-apply fix: exact HTML, JSON-LD, or text to copy and paste.`;

          const userPrompt = `Generate a ready-to-apply fix for this SEO issue:

Check: ${fix.label}
Category: ${fix.category}
Status: ${fix.checkStatus}
Current value: ${check?.value ?? "unknown"}
Detail: ${check?.detail ?? fix.aiInstructions}
Recommendation: ${check?.recommendation ?? ""}

${isSquarespace ? "Provide step-by-step Squarespace instructions. The owner must apply this manually." : "Provide the exact code or text to copy-paste."}`.trim();

          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });

          const snippet = String(llmResponse?.choices?.[0]?.message?.content ?? "Could not generate fix snippet.");

          // Only mark non-Squarespace fixes as resolved automatically
          if (!isSquarespace) {
            await db
              .update(seoFixes)
              .set({ status: "resolved", aiInstructions: fix.aiInstructions || snippet })
              .where(eq(seoFixes.id, fix.id));
          }

          results.push({
            fixId: fix.id,
            label: fix.label,
            category: fix.category,
            priority: fix.priority,
            status: "applied",
            snippet,
            autoPatched: false,
            isSquarespace,
          });
        } catch (err) {
          results.push({
            fixId: fix.id,
            label: fix.label,
            category: fix.category,
            priority: fix.priority,
            status: "failed",
            snippet: "",
            autoPatched: false,
            isSquarespace: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      const autoCount = results.filter((r) => r.autoPatched).length;
      const squarespaceCount = results.filter((r) => r.isSquarespace).length;
      const failedCount = results.filter((r) => r.status === "failed").length;
      return {
        results,
        message: `${autoCount} fix${autoCount !== 1 ? "es" : ""} auto-applied to site. ${squarespaceCount} require${squarespaceCount === 1 ? "s" : ""} manual Squarespace action. ${failedCount > 0 ? `${failedCount} failed.` : ""}`.trim(),
      };
    }),

  /**
   * SEO Agent — conversational AI that knows the site, audit results, and brand voice.
   * Accepts a message history and returns the next assistant message.
   */
  seoAgent: ownerProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
        auditId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Load latest audit context if available
      let auditContext = "";
      if (input.auditId && db) {
        const { seoAudits } = await import("../drizzle/schema");
        const [audit] = await db.select().from(seoAudits).where(eq(seoAudits.id, input.auditId)).limit(1);
        if (audit) {
          const checks: Array<{ id: string; label: string; status: string; priority: string; recommendation?: string }> = JSON.parse(audit.checksJson ?? "[]");
          const fails = checks.filter((c) => c.status === "fail");
          const warns = checks.filter((c) => c.status === "warn");
          auditContext = `

Current SEO audit results for nolandearthworks.com (audited ${new Date(audit.auditedAt).toLocaleDateString()}):
- Overall score: ${audit.overallScore}/100 (${audit.overallGrade})
- On-Page: ${audit.onPageScore}/100 | Links: ${audit.linksScore}/100 | Usability: ${audit.usabilityScore}/100 | Performance: ${audit.performanceScore}/100 | Social: ${audit.socialScore}/100
- Failed checks (${fails.length}): ${fails.map((c) => c.label).join(", ") || "none"}
- Warned checks (${warns.length}): ${warns.map((c) => c.label).join(", ") || "none"}`;
        }
      }

      const systemPrompt = `You are an expert SEO agent for Noland Earthworks, LLC — a veteran-owned land clearing and forestry mulching company based in Middle Tennessee. You have deep knowledge of:
- Local SEO for service businesses in Tennessee
- Technical SEO (meta tags, schema markup, Core Web Vitals, Squarespace-specific implementation)
- Content SEO (keyword targeting, blog strategy, service page optimization)
- Google Business Profile optimization
- The Noland Earthworks brand voice: direct, plain, confident, no corporate jargon, no emojis
- The target audience: landowners, homeowners, developers, farmers in Middle Tennessee
- Competitors: Middle Tennessee Land Clearing LLC, Mid State Land Clearing LLC, Grounded Land Solutions, Stribling Land Clearing & Dirtwork, Wolf Creek Land Company

You can:
1. Analyze audit results and prioritize fixes
2. Write optimized meta titles, meta descriptions, and page copy
3. Generate LocalBusiness JSON-LD schema markup
4. Suggest keyword strategies and content plans
5. Explain any SEO concept in plain language
6. Create a step-by-step SEO improvement plan targeting 100/100
7. Write Squarespace-specific implementation instructions

Always be specific to nolandearthworks.com. Never give generic advice — tie everything back to the actual business, location, and services.${auditContext}`;

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const llmResponse = await invokeLLM({ messages: llmMessages });
      const reply = llmResponse?.choices?.[0]?.message?.content ?? "I could not generate a response. Please try again.";
      return { reply };
    }),

  // ─── County Page Content Generator ─────────────────────────────────────────
  /**
   * Generate SEO-optimized service area page content for one or more Tennessee counties.
   * Saves each as a draft seoArticle with articleType = "location page".
   */
  generateCountyPages: ownerProcedure
    .input(z.object({
      counties: z.array(z.string().min(1)).min(1).max(20),
      service: z.enum(["forestry-mulching", "land-clearing", "brush-hogging", "all"]).default("all"),
      wordCount: z.number().int().min(300).max(1200).default(600),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { seoArticles } = await import("../drizzle/schema");

      const serviceLabel = {
        "forestry-mulching": "forestry mulching",
        "land-clearing": "land clearing",
        "brush-hogging": "brush hogging",
        "all": "land clearing and forestry mulching",
      }[input.service];

      const results: Array<{ county: string; id: number; title: string; status: "created" | "error"; error?: string }> = [];

      for (const county of input.counties) {
        try {
          const keyword = `${serviceLabel} ${county} TN`;
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are writing a local SEO service area page for Noland Earthworks, LLC — a veteran-owned land clearing and forestry mulching company in Middle Tennessee. The owner is Jon Noland, a veteran who runs the business himself with a tracked forestry mulcher. Brand voice: direct, plain, confident, grounded — like a real person who does this work, not a marketing department. Rules: no emojis, no corporate jargon, no filler phrases like "solutions" or "we strive to". Write like a landowner talking to another landowner. Focus on practical value. Include the target keyword naturally in the title, first paragraph, and 2-3 subheadings. End with a clear CTA pointing to nolandearthworks.com. Output ONLY valid JSON.`,
              },
              {
                role: "user",
                content: `Write a ${input.wordCount}-word location page targeting the keyword: "${keyword}". The page should describe Noland Earthworks' ${serviceLabel} services in ${county}, Tennessee. Include: what the service does, why it matters for landowners in ${county}, terrain and vegetation notes specific to Middle Tennessee, and a call to action. Return a JSON object with: title (string, H1, includes keyword), metaDescription (string, 150-160 chars, includes keyword and county name), bodyMarkdown (string, full page content in Markdown with H2/H3 subheadings, natural keyword usage, and a CTA at the end).`,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "county_page",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    metaDescription: { type: "string" },
                    bodyMarkdown: { type: "string" },
                  },
                  required: ["title", "metaDescription", "bodyMarkdown"],
                  additionalProperties: false,
                },
              },
            },
          });

          const raw = llmResponse?.choices?.[0]?.message?.content;
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const wordCountActual = (parsed.bodyMarkdown ?? "").split(/\s+/).filter(Boolean).length;

          const [inserted] = await db.insert(seoArticles).values({
            targetKeyword: keyword,
            title: parsed.title,
            metaDescription: parsed.metaDescription,
            bodyMarkdown: parsed.bodyMarkdown,
            wordCount: wordCountActual,
            status: "draft",
            notes: `County page — ${county} | Service: ${serviceLabel}`,
            keywordId: null,
          }).$returningId();

          results.push({ county, id: inserted.id, title: parsed.title, status: "created" });
        } catch (err) {
          results.push({ county, id: 0, title: "", status: "error", error: err instanceof Error ? err.message : "Unknown error" });
        }
      }

      return { results, created: results.filter(r => r.status === "created").length, failed: results.filter(r => r.status === "error").length };
    }),

  // ─── Priority 1: Jobber Revenue Sync ──────────────────────────────────────────
  syncJobberRevenue: ownerProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });
    const connected = await isJobberConnected();
    if (!connected) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Jobber is not connected. Reconnect in Settings → Integrations." });
    const invoicesData = await fetchJobberInvoices(100);
    const nodes = invoicesData?.nodes ?? [];
    let synced = 0;
    for (const inv of nodes) {
      const total = parseFloat(inv.amounts?.total ?? "0") || 0;
      const balance = parseFloat(inv.amounts?.invoiceBalance ?? "0") || 0;
      const clientName = inv.client?.companyName || inv.client?.name || "Unknown";
      const issuedDate = inv.issuedDate ? new Date(inv.issuedDate) : null;
      await db.insert(jobberRevenueCache).values({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber ?? null,
        invoiceStatus: inv.invoiceStatus ?? null,
        total: total.toFixed(2),
        balance: balance.toFixed(2),
        clientName,
        subject: inv.subject ?? null,
        issuedDate,
        syncedAt: new Date(),
      }).onDuplicateKeyUpdate({
        set: {
          invoiceStatus: inv.invoiceStatus ?? null,
          total: total.toFixed(2),
          balance: balance.toFixed(2),
          clientName,
          subject: inv.subject ?? null,
          issuedDate,
          syncedAt: new Date(),
        },
      });
      synced++;
    }
    return { synced, total: nodes.length };
  }),

  getJobberRevenue: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { rows: [], lastSyncedAt: null };
    const rows = await db.select().from(jobberRevenueCache).orderBy(desc(jobberRevenueCache.issuedDate));
    const lastSyncedAt = rows.length > 0 ? rows[0].syncedAt : null;
    return { rows, lastSyncedAt };
  }),

  // ─── Priority 2: Auto-create Lead from Chat Session ───────────────────────────
  // (Chat sessions already auto-create leads via chatRouter — this procedure exposes
  //  the chat sessions that produced a lead for the /ops/chat-sessions view)
  getChatLeadSessions: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(chatSessions)
      .where(eq(chatSessions.leadCreated, true))
      .orderBy(desc(chatSessions.createdAt));
  }),

  // ─── Priority 3: AI Morning Brief ─────────────────────────────────────────────
  getMorningBrief: ownerProcedure
    .input(z.object({ forceRegenerate: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      // Return cached brief unless forcing regeneration
      if (!input.forceRegenerate) {
        const [existing] = await db.select().from(morningBriefs).where(eq(morningBriefs.date, today));
        if (existing) return { content: existing.content, generatedAt: existing.generatedAt, cached: true };
      }
      // Gather data for the brief
      const allJobs = await db.select().from(jobs).where(eq(jobs.userId, ctx.user.id));
      const allLeads = await db.select().from(opsLeads).where(eq(opsLeads.userId, ctx.user.id));
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const todayJobs = allJobs.filter(j => j.scheduledDate && j.scheduledDate >= todayStart && j.scheduledDate <= todayEnd);
      const staleLeads = allLeads.filter(l => {
        if (["won", "lost"].includes(l.stage)) return false;
        const daysSince = (Date.now() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 7;
      });
      const openLeads = allLeads.filter(l => !["won", "lost"].includes(l.stage));
      const wonLeads = allLeads.filter(l => l.stage === "won");
      const conversionRate = allLeads.length > 0 ? Math.round((wonLeads.length / allLeads.length) * 100) : 0;
      const revenueTotal = allJobs.reduce((s, j) => s + Number(j.totalPrice ?? 0), 0);
      const context = [
        `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`,
        todayJobs.length > 0 ? `Jobs scheduled today: ${todayJobs.map(j => `${j.title} (${j.client})`).join(", ")}.` : "No jobs scheduled for today.",
        staleLeads.length > 0 ? `Stale leads (no activity in 7+ days): ${staleLeads.map(l => l.name).join(", ")}.` : "No stale leads.",
        `Open leads in pipeline: ${openLeads.length}. Conversion rate: ${conversionRate}%.`,
        `Total logged revenue: $${revenueTotal.toLocaleString()}.`,
      ].join(" ");
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are writing a morning briefing for Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land clearing and forestry mulching company in Middle Tennessee. Write a plain-English briefing of 4-6 sentences covering: what's on the schedule today, any stale leads that need a call, pipeline health, and one practical observation or action item. Sound like a straight-talking field operator reviewing his day, not a business consultant. No emojis. No filler. No corporate language." },
          { role: "user", content: `Here is today's business snapshot:\n\n${context}\n\nWrite the morning brief.` },
        ],
      });
      const content = (result.choices?.[0]?.message?.content as string ?? "").trim();
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return a brief. Try again." });
      // Upsert today's brief
      await db.insert(morningBriefs).values({ date: today, content, generatedAt: new Date() })
        .onDuplicateKeyUpdate({ set: { content, generatedAt: new Date() } });
      return { content, generatedAt: new Date(), cached: false };
    }),

  // ─── Priority 4: Quote Follow-Up Automation ────────────────────────────────────
  getStaleQuotes: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return db.select().from(quoteSubmissions)
      .where(and(
        eq(quoteSubmissions.jobberStatus, "synced"),
        lt(quoteSubmissions.createdAt, cutoff),
      ))
      .orderBy(desc(quoteSubmissions.createdAt))
      .limit(20);
  }),

  draftQuoteFollowUp: ownerProcedure
    .input(z.object({
      quoteId: z.number(),
      clientName: z.string(),
      service: z.string(),
      acreage: z.string().optional(),
      daysSinceSent: z.number(),
    }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are writing a follow-up text message for Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land clearing and forestry mulching company in Middle Tennessee. Write a short, casual, warm follow-up SMS (2-3 sentences max) in Jon's voice. Reference the client by first name, mention the specific service, and ask if they have any questions or want to move forward. Sound like a real person, not a sales script. No emojis. No hashtags." },
          { role: "user", content: `Draft a follow-up SMS for: Client: ${input.clientName}. Service: ${input.service}. ${input.acreage ? `Acreage: ${input.acreage}.` : ""} Quote sent ${input.daysSinceSent} days ago with no response.` },
        ],
      });
      const draft = (result.choices?.[0]?.message?.content as string ?? "").trim();
      return { draft };
    }),

  // ─── Priority 5: Satellite Property Analysis ──────────────────────────────────
  analyzePropertySatellite: ownerProcedure
    .input(z.object({
      address: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!ENV.googlePlacesApiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Google Maps API key not configured." });
      // Geocode the address if lat/lng not provided
      let lat = input.lat;
      let lng = input.lng;
      if (!lat || !lng) {
        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input.address)}&key=${ENV.googlePlacesApiKey}`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json() as any;
        if (geoData.results?.[0]?.geometry?.location) {
          lat = geoData.results[0].geometry.location.lat;
          lng = geoData.results[0].geometry.location.lng;
        }
      }
      if (!lat || !lng) throw new TRPCError({ code: "BAD_REQUEST", message: "Could not geocode address." });
      // Fetch satellite image from Google Static Maps API
      const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=640x640&maptype=satellite&key=${ENV.googlePlacesApiKey}`;
      // Send image URL to LLM vision for analysis
      const result = await invokeLLM({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url" as const,
                image_url: { url: mapUrl, detail: "high" as const },
              },
              {
                type: "text" as const,
                text: `You are analyzing a satellite image of a property in Tennessee for a land clearing and forestry mulching quote. Analyze the image and provide: 1) Vegetation density (light/moderate/heavy) with brief reasoning, 2) Terrain type (flat/rolling/steep) with brief reasoning, 3) Access challenges (easy/moderate/difficult) with brief reasoning, 4) Any notable obstacles (water features, structures, rock outcrops). Keep each item to 1-2 sentences. Be practical and specific — this analysis will be used to price a land clearing job. If the image is unclear or shows an urban/suburban area, say so.`,
              },
            ],
          },
        ],
      });
      const analysis = (result.choices?.[0]?.message?.content as string ?? "").trim();
      return { analysis, mapUrl, lat, lng };
    }),

  // ─── Priority 6: Weather-Aware Scheduling ─────────────────────────────────────
  getJobWeatherRisk: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingJobs = await db.select().from(jobs)
      .where(and(
        eq(jobs.userId, ctx.user.id),
        gte(jobs.scheduledDate, now),
        lte(jobs.scheduledDate, in7Days),
        sql`${jobs.status} NOT IN ('completed', 'paid', 'archived')`,
      ));
    if (upcomingJobs.length === 0) return [];
    // Fetch weather for Vanleer, TN (37181) — default location
    // Using Open-Meteo free API, no key required
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=36.2&longitude=-87.5&daily=precipitation_probability_max,weathercode&timezone=America/Chicago&forecast_days=7`;
    let weatherDays: { date: string; precipProb: number; weatherCode: number }[] = [];
    try {
      const weatherRes = await fetch(weatherUrl);
      const weatherData = await weatherRes.json() as any;
      if (weatherData.daily?.time) {
        weatherDays = weatherData.daily.time.map((date: string, i: number) => ({
          date,
          precipProb: weatherData.daily.precipitation_probability_max?.[i] ?? 0,
          weatherCode: weatherData.daily.weathercode?.[i] ?? 0,
        }));
      }
    } catch (_) {
      // Weather API unavailable — return jobs without risk flags
      return upcomingJobs.map(j => ({ ...j, precipProb: null, weatherRisk: false }));
    }
    return upcomingJobs.map(j => {
      const jobDate = j.scheduledDate ? new Date(j.scheduledDate).toISOString().slice(0, 10) : null;
      const weather = jobDate ? weatherDays.find(w => w.date === jobDate) : null;
      const precipProb = weather?.precipProb ?? null;
      const weatherRisk = precipProb !== null && precipProb > 50;
      return { ...j, precipProb, weatherRisk };
    });
  }),

  // ─── Priority 7: Review Request Automation ────────────────────────────────────
  sendReviewRequest: ownerProcedure
    .input(z.object({
      jobId: z.number().optional(),
      jobberJobId: z.string().optional(),
      clientPhone: z.string().min(7),
      clientName: z.string(),
      jobDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });
      const googleReviewUrl = "https://g.page/r/CcglMAMbtQInEAI/review";
      // Read saved SMS template from agentConfig, fall back to default
      const DEFAULT_REVIEW_TEMPLATE = "Hey {clientName}, this is Jon with Noland Earthworks. I really appreciate your business{jobDescription}. If you have a moment, a Google review would mean a lot — it helps other landowners find us. Here's the link: {reviewLink}";
      const savedConfig = await getAgentConfig("review_request");
      const template = savedConfig?.smsTemplate ?? DEFAULT_REVIEW_TEMPLATE;
      const firstName = input.clientName.split(" ")[0];
      const jobDesc = input.jobDescription ? ` on the ${input.jobDescription} job` : "";
      const message = template
        .replace("{clientName}", firstName)
        .replace("{jobDescription}", jobDesc)
        .replace("{reviewLink}", googleReviewUrl);
      let twilioSid: string | undefined;
      let status = "sent";
      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber) {
        try {
          const twilio = await import("twilio");
          const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
          const msg = await client.messages.create({
            body: message,
            from: ENV.twilioFromNumber,
            to: input.clientPhone,
          });
          twilioSid = msg.sid;
        } catch (err: any) {
          status = "failed";
        }
      } else {
        status = "failed";
      }
      // Log the review request
      await db.insert(reviewRequests).values({
        jobId: input.jobId ?? null,
        jobberJobId: input.jobberJobId ?? null,
        clientPhone: input.clientPhone,
        clientName: input.clientName,
        jobDescription: input.jobDescription ?? null,
        twilioSid: twilioSid ?? null,
        status,
        sentAt: new Date(),
      });
      // If triggered from a local job, stamp reviewRequestSentAt
      if (input.jobId && status === "sent") {
        const db2 = await getDb();
        if (db2) await db2.update(jobs).set({ reviewRequestSentAt: new Date() }).where(eq(jobs.id, input.jobId));
      }
      return { status, message };
    }),

  getReviewRequests: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(reviewRequests).orderBy(desc(reviewRequests.sentAt)).limit(50);
  }),

  getReviewTemplate: ownerProcedure.query(async () => {
    const DEFAULT_REVIEW_TEMPLATE = "Hey {clientName}, this is Jon with Noland Earthworks. I really appreciate your business{jobDescription}. If you have a moment, a Google review would mean a lot — it helps other landowners find us. Here's the link: {reviewLink}";
    const saved = await getAgentConfig("review_request");
    return { template: saved?.smsTemplate ?? DEFAULT_REVIEW_TEMPLATE };
  }),

  saveReviewTemplate: ownerProcedure
    .input(z.object({ template: z.string().min(10).max(1000) }))
    .mutation(async ({ input }) => {
      await upsertAgentConfig("review_request", undefined, input.template);
      return { success: true };
    }),

  scheduleQuoteFromCapacity: ownerProcedure
    .input(z.object({
      leadId: z.number(),
      date: z.string(), // ISO date string YYYY-MM-DD
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });
      // Fetch the lead to get its name/description
      const lead = await getOpsLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      // Create a schedule entry for the dropped date
      await createScheduleEntry({
        userId: ctx.user.id,
        title: lead.name ?? "Capacity Fill",
        crewName: "Jon Noland",
        date: new Date(input.date + "T12:00:00"),
        startHour: 8,
        endHour: 17,
        notes: `Auto-scheduled from open lead: ${lead.name}${lead.jobType ? ` (${lead.jobType})` : ""}`,
      });
      // Update lead stage to "estimate_sent" to indicate it's been moved to schedule
      await updateOpsLead(input.leadId, ctx.user.id, { stage: "estimate_sent" });
      return { success: true };
    }),

  // ─── Priority 8: Ad Performance Feedback Loop ─────────────────────────────────
  // (Ad performance notes are stored on the adSpend table via the existing adSpend router)
  // This procedure reads ad spend + social post data and generates AI performance insights
  getAdPerformanceInsight: ownerProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });
    const spendRows = await db.select().from(adSpend).orderBy(desc(adSpend.spentAt)).limit(50);
    const postRows = await db.select().from(socialPosts)
      .where(eq(socialPosts.userId, ctx.user.id))
      .orderBy(desc(socialPosts.createdAt)).limit(30);
    if (spendRows.length === 0 && postRows.length === 0) {
      return { insight: "No ad spend or social post data found. Log some ad spend entries to get performance insights." };
    }
    const spendSummary = spendRows.map(s => `${s.platform} — ${s.component}: $${(s.amountCents / 100).toFixed(2)} on ${new Date(s.spentAt).toLocaleDateString()}${s.notes ? ` (${s.notes})` : ""}`).join("\n");
    const postSummary = postRows.map(p => `${p.platform} post on ${new Date(p.createdAt).toLocaleDateString()}: "${(p.draft ?? "").slice(0, 80)}..." — ${p.published ? "published" : "draft"}`).join("\n");
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are analyzing advertising performance data for Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land clearing company in Middle Tennessee. Based on the ad spend and social post data provided, identify: 1) Which platforms are getting the most spend, 2) Any patterns in content types or timing, 3) One specific recommendation for what to do differently this week. Be direct and practical. No emojis. No filler." },
        { role: "user", content: `Ad spend log:\n${spendSummary || "(none)"}\n\nRecent social posts:\n${postSummary || "(none)"}\n\nProvide a performance insight.` },
      ],
    });
    const insight = (result.choices?.[0]?.message?.content as string ?? "").trim();
    return { insight };
  }),

  // ─── Priority 9: Capacity Alerts and Crew Recommendations ────────────────────
  getCapacityAlerts: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { openDays: [], openQuotes: [] };
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    // Get scheduled jobs in next 14 days
    const scheduledJobs = await db.select().from(jobs)
      .where(and(
        eq(jobs.userId, ctx.user.id),
        gte(jobs.scheduledDate, now),
        lte(jobs.scheduledDate, in14Days),
        sql`${jobs.status} NOT IN ('completed', 'paid', 'archived')`,
      ));
    // Build set of days with jobs
    const busyDays = new Set(scheduledJobs.map(j => j.scheduledDate ? new Date(j.scheduledDate).toISOString().slice(0, 10) : null).filter(Boolean));
    // Find open weekdays in next 14 days
    const openDays: string[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends
      const dateStr = d.toISOString().slice(0, 10);
      if (!busyDays.has(dateStr)) openDays.push(dateStr);
    }
    // Get open quotes (new/contacted leads with estimated value)
    const openQuotes = await db.select().from(opsLeads)
      .where(and(
        eq(opsLeads.userId, ctx.user.id),
        sql`${opsLeads.stage} IN ('new', 'contacted', 'estimate_sent')`,
      ))
      .orderBy(desc(opsLeads.createdAt))
      .limit(10);
    return { openDays: openDays.slice(0, 5), openQuotes };
  }),

  getCrewRecommendation: ownerProcedure
    .input(z.object({
      jobType: z.string(),
      acres: z.number().optional(),
      terrain: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are advising Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land clearing company in Middle Tennessee. Jon runs a tracked forestry mulcher as his primary machine. Based on the job details, recommend: 1) Crew configuration (Solo Tracked Mulcher, Mulcher + Groundsman, etc.), 2) Estimated crew days needed, 3) Any equipment or logistics notes. Be brief and practical. No emojis." },
          { role: "user", content: `Job type: ${input.jobType}. ${input.acres ? `Acreage: ${input.acres} acres.` : ""} ${input.terrain ? `Terrain: ${input.terrain}.` : ""} ${input.notes ? `Notes: ${input.notes}.` : ""}` },
        ],
      });
      const recommendation = (result.choices?.[0]?.message?.content as string ?? "").trim();
      return { recommendation };
    }),

  // ─── Priority 10: Labor Cost vs. Estimate Calibration ─────────────────────────
  getLaborCalibration: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { jobs: [], summary: null };
    // Get completed jobs with both crewDays estimate and actual time entries
    const completedJobs = await db.select().from(jobs)
      .where(and(
        eq(jobs.userId, ctx.user.id),
        sql`${jobs.status} IN ('completed', 'paid')`,
        sql`${jobs.crewDays} IS NOT NULL`,
      ))
      .orderBy(desc(jobs.completedDate))
      .limit(20);
    // For each job, sum actual time entries from crew members
    const result = await Promise.all(completedJobs.map(async (job) => {
      const entries = await db.select().from(timeEntries)
        .where(and(
          eq(timeEntries.crewId, job.crewId ?? 0),
          gte(timeEntries.clockIn, job.scheduledDate ?? new Date(0)),
          lte(timeEntries.clockIn, job.completedDate ?? new Date()),
        ));
      const actualMinutes = entries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
      const actualDays = actualMinutes > 0 ? (actualMinutes / 60 / 9).toFixed(2) : null;
      const estimatedDays = job.crewDays ? parseFloat(job.crewDays) : null;
      const variancePct = estimatedDays && actualDays
        ? Math.round(((parseFloat(actualDays) - estimatedDays) / estimatedDays) * 100)
        : null;
      return {
        id: job.id,
        title: job.title,
        client: job.client,
        jobType: job.jobType,
        acres: job.acres,
        estimatedDays,
        actualDays: actualDays ? parseFloat(actualDays) : null,
        variancePct,
        completedDate: job.completedDate,
      };
    }));
    // AI calibration scan
    const jobsWithVariance = result.filter(j => j.variancePct !== null && Math.abs(j.variancePct) > 10);
    return { jobs: result, jobsWithVariance };
  }),

  runLaborCalibrationScan: ownerProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable." });
    const completedJobs = await db.select().from(jobs)
      .where(and(
        eq(jobs.userId, ctx.user.id),
        sql`${jobs.status} IN ('completed', 'paid')`,
        sql`${jobs.crewDays} IS NOT NULL`,
      ))
      .orderBy(desc(jobs.completedDate))
      .limit(20);
    if (completedJobs.length === 0) {
      return { recommendation: "No completed jobs with crew day estimates found. Add crew day estimates to jobs to enable calibration." };
    }
    const jobSummary = completedJobs.map(j => `${j.jobType} — ${j.acres ?? "?"} acres — estimated ${j.crewDays} crew days`).join("\n");
    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are reviewing job history for Jon Noland, owner-operator of Noland Earthworks, LLC — a veteran-owned land clearing company in Middle Tennessee. Based on the job types and estimated crew days, identify any patterns that suggest the estimates are consistently off, and provide one specific calibration recommendation. Be direct and practical. No emojis." },
        { role: "user", content: `Completed jobs with crew day estimates:\n${jobSummary}\n\nProvide a calibration recommendation.` },
      ],
    });
    const recommendation = (result.choices?.[0]?.message?.content as string ?? "").trim();
    return { recommendation };
  }),

  // ─── Monthly Ad Campaign Planner ─────────────────────────────────────────────

  /** List all campaign plans for the owner, ordered by month desc */
  listCampaigns: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(adCampaigns)
      .where(eq(adCampaigns.userId, ctx.user.id))
      .orderBy(desc(adCampaigns.month))
      .limit(24);
  }),

  /** Get a single campaign by id */
  getCampaign: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db.select().from(adCampaigns)
        .where(and(eq(adCampaigns.id, input.id), eq(adCampaigns.userId, ctx.user.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      return row;
    }),

  /** Create a blank campaign shell for a given month */
  createCampaign: ownerProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      monthLabel: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Prevent duplicates
      const [existing] = await db.select().from(adCampaigns)
        .where(and(eq(adCampaigns.userId, ctx.user.id), eq(adCampaigns.month, input.month)))
        .limit(1);
      if (existing) return existing;
      const [result] = await db.insert(adCampaigns).values({
        userId: ctx.user.id,
        month: input.month,
        monthLabel: input.monthLabel,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const [row] = await db.select().from(adCampaigns)
        .where(eq(adCampaigns.id, (result as any).insertId))
        .limit(1);
      return row;
    }),

  /** Save notes / status edits on a campaign */
  updateCampaign: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      notes: z.string().optional(),
      status: z.enum(["draft", "active", "completed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...data } = input;
      await db.update(adCampaigns)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(adCampaigns.id, id), eq(adCampaigns.userId, ctx.user.id)));
      const [row] = await db.select().from(adCampaigns)
        .where(eq(adCampaigns.id, id)).limit(1);
      return row;
    }),

  /** Delete a campaign */
  deleteCampaign: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(adCampaigns)
        .where(and(eq(adCampaigns.id, input.id), eq(adCampaigns.userId, ctx.user.id)));
      return { success: true };
    }),

  /** AI-generate a full campaign plan for a given month */
  generateCampaign: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      month: z.string(),
      monthLabel: z.string(),
      focusNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Determine season context
      const monthNum = parseInt(input.month.split("-")[1], 10);
      const seasonMap: Record<number, string> = {
        1: "peak", 2: "peak", 3: "peak",
        4: "spring", 5: "spring",
        6: "summer", 7: "summer", 8: "summer", 9: "slow",
        10: "peak", 11: "peak", 12: "peak",
      };
      const season = seasonMap[monthNum] ?? "peak";
      const seasonDesc: Record<string, string> = {
        peak: "peak season (Oct–Mar): dormant vegetation, firm ground, best results — highest demand period",
        spring: "spring (Apr–May): homeowners and developers are active, warm weather, good booking window",
        summer: "summer (Jun–Sep): hot, slower demand, ground saturation risk — focus on booking ahead for fall",
        slow: "late summer / early fall (Sep): slowest stretch — customers waiting for cooler weather, focus on fall pre-booking",
      };

      const systemPrompt = `You are a marketing strategist for Noland Earthworks, LLC — a veteran-owned forestry mulching and land clearing company in Middle & West Tennessee. Owner: Jon Noland, sole operator.

Services: Forestry mulching (primary), land clearing, brush/understory removal, ROW/trail clearing, storm cleanup.
Equipment: Tracked forestry mulcher — handles slopes, wet ground, dense vegetation. No debris piles, no hauling, no burning.
Target customers: Rural landowners, residential property owners with acreage, farmers reclaiming pasture, residential developers, government/municipal.
Core differentiators: Veteran-owned, owner-operated (Jon shows up to every job), clean finish with no debris, tracked machine handles difficult terrain.
Voice: Casual, warm, direct. Real job content. No corporate jargon. No emojis. No hashtag overload.
Competitors: Middle Tennessee Land Clearing LLC, Mid State Land Clearing LLC, Grounded Land Solutions, Stribling Land Clearing & Dirtwork, Wolf Creek Land Company.

Generate a complete monthly ad campaign plan. Return ONLY valid JSON matching this exact schema — no markdown, no commentary:
{
  "theme": "<short campaign theme or tagline, max 60 chars>",
  "goal": "<1-2 sentence campaign goal>",
  "primaryMessage": "<2-3 sentence primary message / angle for this month>",
  "season": "${season}",
  "adIdeas": [
    {
      "platform": "facebook",
      "headline": "<headline, max 80 chars>",
      "body": "<ad body copy, 2-4 sentences, Jon's voice>",
      "callToAction": "<CTA text, max 25 chars>",
      "imagePrompt": "<description of ideal before/after or job photo for this ad>"
    },
    {
      "platform": "instagram",
      "headline": "<caption hook, max 80 chars>",
      "body": "<caption body, 2-3 sentences>",
      "callToAction": "<CTA>",
      "imagePrompt": "<ideal photo description>"
    },
    {
      "platform": "google",
      "headline": "<search ad headline, max 30 chars>",
      "body": "<description line, max 90 chars>",
      "callToAction": "Get a Free Quote",
      "imagePrompt": ""
    }
  ],
  "suggestedDates": ["<YYYY-MM-DD>", "<YYYY-MM-DD>", "<YYYY-MM-DD>", "<YYYY-MM-DD>"]
}`;

      const userPrompt = `Month: ${input.monthLabel}\nSeason context: ${seasonDesc[season]}${input.focusNotes ? `\nAdditional focus / notes from Jon: ${input.focusNotes}` : ""}\n\nGenerate a campaign plan for this month.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "campaign_plan",
            strict: true,
            schema: {
              type: "object",
              properties: {
                theme: { type: "string" },
                goal: { type: "string" },
                primaryMessage: { type: "string" },
                season: { type: "string" },
                adIdeas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      platform: { type: "string" },
                      headline: { type: "string" },
                      body: { type: "string" },
                      callToAction: { type: "string" },
                      imagePrompt: { type: "string" },
                    },
                    required: ["platform", "headline", "body", "callToAction", "imagePrompt"],
                    additionalProperties: false,
                  },
                },
                suggestedDates: { type: "array", items: { type: "string" } },
              },
              required: ["theme", "goal", "primaryMessage", "season", "adIdeas", "suggestedDates"],
              additionalProperties: false,
            },
          },
        },
      } as any);

      const content = (response as any)?.choices?.[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned empty response" });

      const plan = JSON.parse(content) as {
        theme: string; goal: string; primaryMessage: string; season: string;
        adIdeas: Array<{ platform: string; headline: string; body: string; callToAction: string; imagePrompt: string }>;
        suggestedDates: string[];
      };

      await db.update(adCampaigns)
        .set({
          theme: plan.theme,
          goal: plan.goal,
          primaryMessage: plan.primaryMessage,
          season: plan.season,
          adIdeas: plan.adIdeas,
          suggestedDates: plan.suggestedDates,
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(adCampaigns.id, input.id), eq(adCampaigns.userId, ctx.user.id)));

      const [row] = await db.select().from(adCampaigns)
        .where(eq(adCampaigns.id, input.id)).limit(1);
      return row;
    }),
  /**
   * Called after a Jobber quote is created from a lead.
   * Updates the lead stage to estimate_sent and stores the Jobber quote ID/number.
   */
  linkQuoteToLead: protectedProcedure
    .input(z.object({
      leadId: z.number().int().positive(),
      jobberQuoteId: z.string(),
      jobberQuoteNumber: z.number().int().optional(),
      estimateAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let estimateAmount = input.estimateAmount;
      // If no amount was passed in, fetch it live from Jobber
      if (estimateAmount == null) {
        try {
          const data = await jobberGraphQL(`
            query GetQuoteTotal($id: EncodedId!) {
              quote(id: $id) { amounts { total } }
            }
          `, { id: input.jobberQuoteId }) as any;
          const raw = data?.quote?.amounts?.total;
          if (raw != null) estimateAmount = Number(raw);
        } catch {
          // Non-fatal — proceed without the amount
        }
      }
      await updateOpsLead(input.leadId, ctx.user.id, {
        stage: "estimate_sent",
        jobberQuoteId: input.jobberQuoteId,
        jobberQuoteNumber: input.jobberQuoteNumber ?? undefined,
        ...(estimateAmount != null ? { estimateAmount: String(estimateAmount) } : {}),
      });
      return { ok: true };
    }),
  /**
   * Returns the lead (if any) that is linked to the given Jobber quote ID.
   * Used by the Quotes page to show the linked lead badge and prevent double-linking.
   */
  getLeadByQuoteId: ownerProcedure
    .input(z.object({ jobberQuoteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(opsLeads)
        .where(and(eq(opsLeads.userId, ctx.user.id), eq(opsLeads.jobberQuoteId, input.jobberQuoteId)))
        .limit(1);
      return rows[0] ?? null;
    }),
  /**
   * Returns all leads that do NOT yet have a Jobber quote linked and are not won/lost.
   * Used by the Quotes page "Link to Lead" picker.
   */
  getUnlinkedLeads: ownerProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(opsLeads)
        .where(and(
          eq(opsLeads.userId, ctx.user.id),
          sql`${opsLeads.jobberQuoteId} IS NULL`,
          sql`${opsLeads.stage} NOT IN ('won', 'lost')`,
        ))
        .orderBy(desc(opsLeads.createdAt))
        .limit(100);
      return rows;
    }),
  /**
   * Removes the Jobber quote link from a lead, clearing jobberQuoteId,
   * jobberQuoteNumber, and estimateAmount. Stage is reverted to "new" if
   * it was "estimate_sent" (i.e. only advanced because of the link).
   */
  unlinkQuoteFromLead: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });
      const rows = await db
        .select()
        .from(opsLeads)
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id)))
        .limit(1);
      const lead = rows[0];
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead not found' });
      const revertStage = lead.stage === 'estimate_sent' ? 'new' : undefined;
      await updateOpsLead(input.leadId, ctx.user.id, {
        jobberQuoteId: null,
        jobberQuoteNumber: null,
        estimateAmount: null,
        ...(revertStage ? { stage: revertStage } : {}),
      });
      return { ok: true };
    }),
});
