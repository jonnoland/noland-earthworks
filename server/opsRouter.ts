/**
 * Ops tRPC router — owner-only procedures for the operations dashboard
 * Covers Jobs, Leads, Schedule, Quotes, Crews, Conversations, Reviews, and Timesheets CRUD.
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
import { jobs, opsLeads, quoteSubmissions, crews, crewMembers, conversations, messages, reviews, timeEntries, distanceQuotes } from "../drizzle/schema";
import { and, desc, eq, gte, lt, like } from "drizzle-orm";

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
});
