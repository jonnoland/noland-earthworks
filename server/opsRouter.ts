/**
 * Ops tRPC router — owner-only procedures for the operations dashboard
 * Covers Jobs, Leads, Schedule, Quotes, Crews, Conversations, Reviews, and Timesheets CRUD.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { isJobberConnected, jobberGraphQL } from "./jobber";
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
} from "./db";
import { Resend } from "resend";
import { jobs, opsLeads, quoteSubmissions, crews, crewMembers, conversations, messages, reviews, timeEntries, distanceQuotes, businessSettings, automationSettings, serviceCatalog, messageTemplates, reminderRules, leadNotes, visitBlackoutDates, recurringBlackoutDays, aiPricingSettings, quoteDrafts, jobberTokens } from "../drizzle/schema";

import { and, desc, eq, gte, inArray, lt, like } from "drizzle-orm";

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

      // ─── Pricing constants — prefer DB values, fall back to 2025-2026 TN market rates ─────────────
      // Sources: Mid State Land Management (Columbia TN), Bucktown Grading, HomeGuide, Angi 2026 data
      const fmBase  = pricingRow?.forestryMulchingBaseRate ?? 800;
      const lcBase  = pricingRow?.landClearingBaseRate     ?? 700;
      const bhBase  = pricingRow?.brushHoggingBaseRate     ?? 150;
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
        "half-to-one": 0.75, "1-to-2": 1.5, "2-to-5": 3.5,
        "5-to-10": 7.5, "10-to-20": 15, "20+": 25,
      };
      const ACREAGE_LABEL: Record<string, string> = {
        "half-to-one": "approximately 0.5–1 acre",
        "1-to-2":      "approximately 1–2 acres",
        "2-to-5":      "approximately 2–5 acres",
        "5-to-10":     "approximately 5–10 acres",
        "10-to-20":    "approximately 10–20 acres",
        "20+":         "20+ acres",
      };
      const acreageStr = input.acreage ?? "";
      const acres = ACREAGE_MAP[acreageStr] ?? (parseFloat(acreageStr) || 0);
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
- Never publish or promise specific rates. Use the reference range as a guide only.
- If acreage is unknown or the customer's message suggests complex conditions, flag it for a site visit.
- Line items should reflect real work components: mobilization, primary clearing work (per-acre or flat), any add-ons.
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
      try {
        return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as {
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
      hoursPerDay: z.number().int().min(1).max(24).optional(),
      crewMemberCount: z.number().int().min(1).optional(),
      memberWageCents: z.number().int().min(0).optional(),
      burdenPct: z.number().int().min(0).max(100).optional(),
      // Equipment
      equipmentItems: z.array(equipmentItemSchema).optional(),
      // Fuel
      machineBurnRateGph: z.number().int().min(0).optional(),
      fuelPriceCents: z.number().int().min(0).optional(),
      truckFuelPerDayCents: z.number().int().min(0).optional(),
      // Wear
      teethCostPerSetCents: z.number().int().min(0).optional(),
      daysPerSet: z.number().int().min(1).optional(),
      annualMajorWearCents: z.number().int().min(0).optional(),
      miscConsumablesPerDayCents: z.number().int().min(0).optional(),
      // Overhead
      overheadItems: z.array(overheadItemSchema).optional(),
      // Scheduling
      workingDaysPerMonth: z.number().int().min(1).max(31).optional(),
      targetMarginPct: z.number().int().min(1).max(99).optional(),
      acresPerDay: z.number().int().min(1).optional(),
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
    const allCrews = await db.select().from(crews).orderBy(crews.createdAt);
    const allMembers = await db.select().from(crewMembers);
    return allCrews.map((crew) => ({ ...crew, members: allMembers.filter((m) => m.crewId === crew.id) }));
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
import { socialPostsRouter as _socialPostsRouter, adSpendRouter as _adSpendRouter, platformConnectionStatusProcedure as _platformConnectionStatusProcedure, linkedinSettingsRouter as _linkedinSettingsRouter } from './routers/ads';
const socialPostsRouter = _socialPostsRouter;


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
});
