/**
 * Ops tRPC router — owner-only procedures for the operations dashboard
 * Covers Jobs, Leads, Schedule, Quotes, Crews, Conversations, Reviews, and Timesheets CRUD.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { isJobberConnected } from "./jobber";
import {
  getDb,
  getJobs, createJob, updateJob, deleteJob,
  getOpsLeads, createOpsLead, updateOpsLead, deleteOpsLead,
  getScheduleEntries, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry,
  getVisitBlackoutDates, addVisitBlackoutDate, removeVisitBlackoutDate,
  getRecurringBlackoutDays, addRecurringBlackoutDay, removeRecurringBlackoutDay,
  getOpsLeadById,
} from "./db";
import { Resend } from "resend";
import { jobs, opsLeads, quoteSubmissions, crews, crewMembers, conversations, messages, reviews, timeEntries, distanceQuotes, businessSettings, automationSettings, serviceCatalog, messageTemplates, reminderRules, leadNotes, visitBlackoutDates, recurringBlackoutDays } from "../drizzle/schema";

import { and, desc, eq, gte, lt, like } from "drizzle-orm";

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
        "Land Clearing": "land_clearing", "land_clearing": "land_clearing",
        "Forestry Mulching": "forestry_mulching", "forestry_mulching": "forestry_mulching",
        "Brush Removal": "brush_removal", "brush_removal": "brush_removal",
        "Stump Grinding": "stump_grinding", "stump_grinding": "stump_grinding",
        "Wildfire Mitigation": "wildfire_mitigation", "wildfire_mitigation": "wildfire_mitigation",
      };
      const resolvedJobType = input.jobType ?? (lead.jobType ? (jobTypeMap[lead.jobType] ?? "land_clearing") : "land_clearing");
      const newJobData = {
        userId: ctx.user.id,
        title: input.title ?? `${lead.name} — ${lead.jobType ?? "Land Clearing"}`,
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
    return {
      jobber: { connected: jobberConnected },
      twilio: { configured: twilioConfigured, fromNumber: twilioConfigured ? ENV.twilioFromNumber : null },
      resend: { configured: resendConfigured },
      googleMaps: { active: googleMapsActive },
      clickgrow: { note: "Managed externally via ClickGrow dashboard" },
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
});
