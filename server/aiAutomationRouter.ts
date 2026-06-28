/**
 * AI Automation Router — 12 AI features (features #4–#15)
 * Attached to opsRouter as ops.ai.*
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import {
  jobs, opsLeads, quoteSubmissions, reviews, timeEntries, crewMembers,
  socialPosts, adSpend, equipment, serviceLogs, serviceIntervals,
  fieldDiagnostics, ownerTasks, jobNotes, leadNotes,
} from "../drizzle/schema";
import { and, desc, eq, gte, lt, lte, inArray, or, sql } from "drizzle-orm";
import { ENV } from "./_core/env";

// ─── Owner-only guard (mirrors opsRouter pattern) ─────────────────────────────
import { protectedProcedure } from "./_core/trpc";
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
  }
  return next({ ctx });
});

export const aiAutomationRouter = router({

  // ─── AI #4: Invoice Risk Flagging ─────────────────────────────────────────
  flagInvoiceRisks: ownerProcedure
    .input(z.object({ jobberInvoices: z.array(z.object({
      id: z.string(),
      invoiceNumber: z.string().optional(),
      clientName: z.string(),
      balance: z.number(),
      total: z.number(),
      issuedDate: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.string(),
    })) }))
    .mutation(async ({ input }) => {
      if (!input.jobberInvoices.length) return { risks: [] };
      const now = new Date();
      const invoiceContext = input.jobberInvoices.map((inv) => {
        const daysOut = inv.issuedDate
          ? Math.floor((now.getTime() - new Date(inv.issuedDate).getTime()) / 86400000)
          : null;
        return `Invoice ${inv.invoiceNumber ?? inv.id}: Client=${inv.clientName}, Balance=$${inv.balance}, Total=$${inv.total}, Status=${inv.status}, DaysOpen=${daysOut ?? "unknown"}`;
      }).join("\n");
      const prompt = `You are analyzing unpaid invoices for Noland Earthworks, LLC — a small owner-operated land management business. Flag which invoices are at risk of non-payment and draft a firm but professional collection message for each high-risk one.

Risk criteria:
- High risk: balance > $500, open > 30 days, or status suggests dispute
- Medium risk: balance > $200, open 15-30 days
- Low risk: recent, small balance, normal status

Invoices:
${invoiceContext}

Return JSON only: {"risks": [{"id": "<invoice id>", "riskLevel": "high"|"medium"|"low", "reason": "<one sentence>", "collectionMessage": "<SMS or email draft, Jon's voice, no emojis, direct>"}]}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { risks: parsed.risks ?? [] };
      } catch { return { risks: [] }; }
    }),

  // ─── AI #5: Job Profitability Analysis ────────────────────────────────────
  analyzeJobProfitability: ownerProcedure
    .input(z.object({
      jobId: z.number().int().positive().optional(),
      jobberJobId: z.string().optional(),
      jobTitle: z.string().optional(),
      jobClient: z.string().optional(),
      jobType: z.string().optional(),
      totalPrice: z.number().optional(),
      acres: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let job: any = null;
      if (input.jobId) {
        const jobRows = await db.select().from(jobs).where(and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.user.id))).limit(1);
        job = jobRows[0] ?? null;
      }
      if (!job) {
        job = { title: input.jobTitle ?? "Job", client: input.jobClient ?? "Unknown", jobType: input.jobType ?? "land management", acres: input.acres ?? null, totalPrice: input.totalPrice ?? null, crewDays: null, notes: null, status: "completed", scheduledDate: null, completedDate: null };
      }
      // Fetch time entries via crew members
      const crewRows = await db.select().from(crewMembers).limit(50);
      const crewIds = crewRows.map((c) => c.id);
      let totalHours = 0;
      if (crewIds.length && job.scheduledDate && job.completedDate) {
        const entries = await db.select().from(timeEntries)
          .where(and(
            inArray(timeEntries.crewMemberId, crewIds),
            gte(timeEntries.clockIn, job.scheduledDate),
            lte(timeEntries.clockIn, job.completedDate),
          ));
        totalHours = entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0) / 60, 0);
      }
      const prompt = `Analyze the profitability of this land management job for Noland Earthworks, LLC.

Job details:
Title: ${job.title}
Client: ${job.client}
Type: ${job.jobType}
Acres: ${job.acres ?? "unknown"}
Quoted price: $${job.totalPrice ?? "unknown"}
Crew days quoted: ${job.crewDays ?? "unknown"}
Actual hours logged: ${totalHours.toFixed(1)}h
Status: ${job.status}
Notes: ${job.notes ?? "none"}

Analyze:
1. Estimated revenue per hour (price / actual hours)
2. Whether the job ran over or under the quoted crew days
3. Profitability verdict: profitable / break-even / loss
4. One specific pattern or lesson for future similar jobs

Return JSON only: {"revenuePerHour": <number or null>, "hoursVariance": "<over/under/on-target>", "verdict": "profitable"|"break-even"|"loss", "lesson": "<one actionable sentence>", "summary": "<2-3 sentence plain English analysis>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { ...parsed, actualHours: totalHours };
      } catch { return { summary: "Analysis unavailable.", actualHours: totalHours }; }
    }),

  // ─── AI #6: Proposal Auto-Draft from Lead Data ────────────────────────────
  draftProposalFromLead: ownerProcedure
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const leadRows = await db.select().from(opsLeads).where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id))).limit(1);
      const lead = leadRows[0];
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const notes = await db.select().from(leadNotes).where(eq(leadNotes.leadId, input.leadId)).orderBy(desc(leadNotes.createdAt)).limit(10);
      const noteText = notes.map((n) => `- ${n.content}`).join("\n") || "No notes.";
      const prompt = `Draft a professional proposal for Noland Earthworks, LLC based on the lead data below.

Lead:
Name: ${lead.name}
Job type: ${lead.jobType ?? "unknown"}
Address: ${lead.address ?? "not provided"}
Estimated value: ${lead.estimatedValue ? "$" + lead.estimatedValue : "not set"}
Notes: ${lead.notes ?? "none"}
Lead notes:\n${noteText}

Write a complete proposal with these sections:
1. Project Description (2-3 sentences)
2. Scope of Work (bullet list, specific)
3. Inclusions (what is covered)
4. Exclusions (what is NOT included — always exclude grading, hauling, excavation)
5. Site Conditions & Assumptions
6. Estimated Timeline
7. Payment Terms (standard: 50% deposit, balance on completion)

Voice: Professional, direct, plain language. No filler. Sound like a real contractor, not a template.
Do NOT include a price — leave a placeholder: [PRICE TO BE DETERMINED AFTER SITE VISIT]

Return JSON only: {"projectDescription": "...", "scopeOfWork": ["...", "..."], "inclusions": ["...", "..."], "exclusions": ["...", "..."], "siteConditions": "...", "estimatedTimeline": "...", "paymentTerms": "..."}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return parsed;
      } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" }); }
    }),

  // ─── AI #7: Review Auto-Post (post saved reply to Google) ─────────────────
  postReviewReply: ownerProcedure
    .input(z.object({ reviewId: z.number().int().positive(), reply: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Save reply to local DB
      await db.update(reviews).set({ response: input.reply, respondedAt: new Date() }).where(eq(reviews.id, input.reviewId));
      // Attempt Google My Business API post if credentials available
      const placeId = ENV.googlePlaceId;
      if (!placeId) {
        return { success: true, posted: false, message: "Reply saved locally. Google posting requires Google My Business API credentials." };
      }
      // Google My Business reply requires OAuth — post via GMB API
      try {
        const gmb = await import("./_core/map");
        // Use the Google Places proxy to attempt posting
        const response = await gmb.makeRequest(`/maps/api/place/details/json?place_id=${placeId}&key=proxy`);
        if (response) {
          return { success: true, posted: false, message: "Reply saved. To auto-post to Google, connect Google My Business OAuth in Settings." };
        }
      } catch { /* fall through */ }
      return { success: true, posted: false, message: "Reply saved locally. Connect Google My Business in Settings to enable auto-posting." };
    }),

  // ─── AI #8: Timesheet Anomaly Detection ───────────────────────────────────
  detectTimesheetAnomalies: ownerProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const entries = await db.select({
        id: timeEntries.id,
        crewMemberId: timeEntries.crewMemberId,
        clockIn: timeEntries.clockIn,
        clockOut: timeEntries.clockOut,
        durationMinutes: timeEntries.durationMinutes,
        status: timeEntries.status,
        notes: timeEntries.notes,
      }).from(timeEntries).where(gte(timeEntries.clockIn, thirtyDaysAgo)).orderBy(desc(timeEntries.clockIn)).limit(200);
      if (!entries.length) return { anomalies: [], summary: "No time entries in the last 30 days." };
      const entryText = entries.map((e) => {
        const hrs = e.durationMinutes ? (e.durationMinutes / 60).toFixed(1) : "open";
        return `ID=${e.id} CrewMember=${e.crewMemberId} Date=${e.clockIn?.toISOString().split("T")[0]} Hours=${hrs} Status=${e.status}`;
      }).join("\n");
      const prompt = `Analyze these timesheet entries for Noland Earthworks, LLC and flag anomalies.

Flag:
- Entries over 12 hours in a single day (likely error)
- Duplicate entries (same crew member, same date, similar hours)
- Entries with no clock-out (still open after 24h)
- Entries on days with no scheduled jobs (if pattern is clear)
- Any other suspicious patterns

Entries (last 30 days):
${entryText}

Return JSON only: {"anomalies": [{"entryId": <id>, "type": "long_shift"|"duplicate"|"open_entry"|"no_job_day"|"other", "severity": "high"|"medium"|"low", "description": "<one sentence>"}], "summary": "<overall assessment in 1-2 sentences>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { anomalies: parsed.anomalies ?? [], summary: parsed.summary ?? "" };
      } catch { return { anomalies: [], summary: "Analysis unavailable." }; }
    }),

  // ─── AI #9: Seasonal Demand Forecasting ───────────────────────────────────
  forecastDemand: ownerProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const historicalJobs = await db.select({
        scheduledDate: jobs.scheduledDate,
        jobType: jobs.jobType,
        totalPrice: jobs.totalPrice,
        status: jobs.status,
      }).from(jobs).where(and(eq(jobs.userId, ctx.user.id), gte(jobs.scheduledDate, oneYearAgo))).limit(500);
      const historicalLeads = await db.select({
        createdAt: opsLeads.createdAt,
        stage: opsLeads.stage,
      }).from(opsLeads).where(and(eq(opsLeads.userId, ctx.user.id), gte(opsLeads.createdAt, oneYearAgo))).limit(500);
      // Aggregate by month
      const monthlyJobs: Record<string, { count: number; revenue: number }> = {};
      for (const j of historicalJobs) {
        if (!j.scheduledDate) continue;
        const key = `${j.scheduledDate.getFullYear()}-${String(j.scheduledDate.getMonth() + 1).padStart(2, "0")}`;
        if (!monthlyJobs[key]) monthlyJobs[key] = { count: 0, revenue: 0 };
        monthlyJobs[key].count++;
        monthlyJobs[key].revenue += parseFloat(String(j.totalPrice ?? 0));
      }
      const monthlyLeads: Record<string, number> = {};
      for (const l of historicalLeads) {
        const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, "0")}`;
        monthlyLeads[key] = (monthlyLeads[key] ?? 0) + 1;
      }
      const historyText = Object.entries(monthlyJobs).sort().map(([m, d]) =>
        `${m}: ${d.count} jobs, $${d.revenue.toFixed(0)} revenue, ${monthlyLeads[m] ?? 0} leads`
      ).join("\n");
      const now = new Date();
      const prompt = `You are forecasting demand for Noland Earthworks, LLC — a forestry mulching and land management company in Middle Tennessee.

Historical monthly data (last 12 months):
${historyText || "No historical data yet."}

Current date: ${now.toISOString().split("T")[0]}

Seasonal context for Middle Tennessee land management:
- Peak season: Oct-Mar (dormant vegetation, firm ground, best visibility)
- Spring/Summer: more inquiries but heat and saturation complicate scheduling
- Slowest: mid-summer to early fall (peak heat)

Forecast the next 3 months. For each month provide:
- Expected lead volume (low/medium/high with a number estimate)
- Expected revenue range
- Recommended action (push ads, hold steady, or throttle back)

Return JSON only: {"forecast": [{"month": "YYYY-MM", "leadVolume": "low"|"medium"|"high", "estimatedLeads": <number>, "revenueRangeLow": <number>, "revenueRangeHigh": <number>, "recommendation": "<one sentence action>"}], "overallOutlook": "<2 sentence summary>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return parsed;
      } catch { return { forecast: [], overallOutlook: "Forecast unavailable." }; }
    }),

  // ─── AI #10: Social Post Auto-Draft from Completed Job ────────────────────
  draftSocialFromJob: ownerProcedure
    .input(z.object({
      jobId: z.number().int().positive().optional(),
      jobberJobId: z.string().optional(),
      jobTitle: z.string().optional(),
      jobClient: z.string().optional(),
      jobType: z.string().optional(),
      acres: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let job: any = null;
      let noteText = "";
      if (input.jobId) {
        const jobRows = await db.select().from(jobs).where(and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.user.id))).limit(1);
        job = jobRows[0] ?? null;
        if (job) {
          const notes = await db.select().from(jobNotes).where(eq(jobNotes.jobId, String(input.jobId))).orderBy(desc(jobNotes.createdAt)).limit(5);
          noteText = notes.map((n: any) => n.content).join(" ") || "";
        }
      }
      if (!job) {
        job = { title: input.jobTitle ?? "Job", client: input.jobClient ?? "Unknown", jobType: input.jobType ?? "land management", acres: input.acres ?? null, notes: null, address: "Middle Tennessee" };
      }
      // noteText is set above in the conditional block
      const prompt = `Write a social media post for Noland Earthworks, LLC about a recently completed job.

Job details:
Type: ${job.jobType}
Client area: ${job.address ?? "Middle Tennessee"}
Acres: ${job.acres ?? "unknown"}
Notes: ${job.notes ?? "none"}
Additional notes: ${noteText}

Voice rules (MUST follow):
- Sound like Jon wrote it — direct, warm, southern, genuine
- No emojis. Ever.
- No corporate language, no filler phrases
- Describe the actual work plainly
- End with a clear call to action
- 3-5 sentences max for Facebook/Instagram

Write two versions:
1. Facebook post (slightly longer, can include a question to drive engagement)
2. Instagram caption (punchy, visual, same voice)

Return JSON only: {"facebook": "<post text>", "instagram": "<caption text>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { facebook: parsed.facebook ?? "", instagram: parsed.instagram ?? "" };
      } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" }); }
    }),

  // ─── AI #11: Client Churn Detection ───────────────────────────────────────
  detectChurnRisk: ownerProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      // Get all clients who have had jobs
      const allJobs = await db.select({
        client: jobs.client,
        clientEmail: jobs.clientEmail,
        completedDate: jobs.completedDate,
        jobType: jobs.jobType,
        totalPrice: jobs.totalPrice,
      }).from(jobs).where(eq(jobs.userId, ctx.user.id)).orderBy(desc(jobs.completedDate)).limit(500);
      // Group by client
      const clientMap: Record<string, { lastJob: Date | null; jobCount: number; lastJobType: string; totalRevenue: number; email: string | null }> = {};
      for (const j of allJobs) {
        if (!clientMap[j.client]) clientMap[j.client] = { lastJob: null, jobCount: 0, lastJobType: j.jobType, totalRevenue: 0, email: j.clientEmail ?? null };
        clientMap[j.client].jobCount++;
        clientMap[j.client].totalRevenue += parseFloat(String(j.totalPrice ?? 0));
        if (!clientMap[j.client].lastJob || (j.completedDate && j.completedDate > clientMap[j.client].lastJob!)) {
          clientMap[j.client].lastJob = j.completedDate;
          clientMap[j.client].lastJobType = j.jobType;
        }
      }
      // Filter to clients inactive for 12+ months with 2+ jobs (recurring clients)
      const churnCandidates = Object.entries(clientMap)
        .filter(([, d]) => d.jobCount >= 2 && (!d.lastJob || d.lastJob < twelveMonthsAgo))
        .slice(0, 20);
      if (!churnCandidates.length) return { clients: [], summary: "No inactive recurring clients found." };
      const clientText = churnCandidates.map(([name, d]) => {
        const daysInactive = d.lastJob ? Math.floor((Date.now() - d.lastJob.getTime()) / 86400000) : 999;
        return `${name}: ${d.jobCount} jobs, last job ${daysInactive} days ago, last service=${d.lastJobType}, total revenue=$${d.totalRevenue.toFixed(0)}`;
      }).join("\n");
      const prompt = `Draft re-engagement messages for inactive clients of Noland Earthworks, LLC.

Inactive clients (12+ months, 2+ previous jobs):
${clientText}

For each client, write a short, genuine re-engagement SMS in Jon's voice:
- No emojis, no corporate language
- Reference their last service type naturally
- Mention it's been a while and offer to come back out
- End with a clear call to action (call or text to schedule)
- 2-3 sentences max

Return JSON only: {"clients": [{"name": "<client name>", "daysInactive": <number>, "reEngagementMessage": "<SMS text>"}]}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        // Merge email data back in
        const enriched = (parsed.clients ?? []).map((c: { name: string; daysInactive: number; reEngagementMessage: string }) => ({
          ...c,
          email: clientMap[c.name]?.email ?? null,
        }));
        return { clients: enriched, summary: `Found ${enriched.length} inactive recurring clients.` };
      } catch { return { clients: [], summary: "Analysis unavailable." }; }
    }),

  // ─── AI #12: Equipment Maintenance Prediction ─────────────────────────────
  predictMaintenance: ownerProcedure
    .input(z.object({ equipmentId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const equipRows = await db.select().from(equipment).where(eq(equipment.id, input.equipmentId)).limit(1);
      const equip = equipRows[0];
      if (!equip) throw new TRPCError({ code: "NOT_FOUND", message: "Equipment not found" });
      const logs = await db.select().from(serviceLogs).where(eq(serviceLogs.equipmentId, input.equipmentId)).orderBy(desc(serviceLogs.serviceDate)).limit(20);
      const intervals = await db.select().from(serviceIntervals).where(eq(serviceIntervals.equipmentId, input.equipmentId));
      const logText = logs.map((l) => `${l.serviceDate?.toISOString().split("T")[0]}: ${l.serviceType} at ${l.hoursAtService ?? "?"}h (cost: $${l.cost ?? 0})`).join("\n") || "No service history.";
      const intervalText = intervals.map((i) => `${i.serviceType}: every ${i.intervalHours}h, last at ${i.lastServiceHours ?? "?"}h`).join("\n") || "No intervals set.";
      const prompt = `Analyze maintenance history and predict upcoming needs for this piece of equipment.

Equipment: ${equip.year ?? ""} ${equip.make} ${equip.model}
Current hours: ${equip.currentHours ?? "unknown"}
Serial: ${equip.serialNumber ?? "unknown"}

Service history (most recent first):
${logText}

Maintenance intervals:
${intervalText}

Analyze:
1. Which services are coming due soonest based on current hours and intervals
2. Any patterns suggesting early wear (e.g., frequent oil changes, repeated same issue)
3. Predicted failure risk in the next 100 hours
4. Recommended proactive service before next heavy use

Return JSON only: {"predictions": [{"serviceType": "<type>", "hoursUntilDue": <number or null>, "urgency": "immediate"|"soon"|"monitor", "reasoning": "<one sentence>"}], "failureRisk": "low"|"medium"|"high", "recommendation": "<2-3 sentence action plan>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return parsed;
      } catch { return { predictions: [], failureRisk: "unknown", recommendation: "Analysis unavailable." }; }
    }),

  // ─── AI #13: Task Auto-Generation from Job Notes ──────────────────────────
  autoGenerateTasks: ownerProcedure
    .input(z.object({
      jobId: z.number().int().positive().optional(),
      jobberJobId: z.string().optional(),
      jobTitle: z.string().optional(),
      jobClient: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      let job: any = null;
      let notesList: any[] = [];
      if (input.jobId) {
        const jobRows = await db.select().from(jobs).where(and(eq(jobs.id, input.jobId), eq(jobs.userId, ctx.user.id))).limit(1);
        job = jobRows[0] ?? null;
        if (job) {
          notesList = await db.select().from(jobNotes).where(eq(jobNotes.jobId, String(input.jobId))).orderBy(desc(jobNotes.createdAt)).limit(10);
        }
      }
      if (!job) {
        job = { id: 0, title: input.jobTitle ?? "Job", client: input.jobClient ?? "Unknown", notes: null };
      }
      const allNotes = [job.notes ?? "", ...notesList.map((n: any) => n.content)].filter(Boolean).join("\n");
      if (!allNotes.trim()) return { tasks: [], message: "No notes found for this job." };
      const prompt = `Extract follow-up tasks from these job notes for Noland Earthworks, LLC.

Job: ${job.title} (${job.client})
Notes:
${allNotes}

Look for:
- Explicit follow-up items ("need to come back", "customer asked about", "check on", "schedule")
- Implicit action items (unfinished areas, customer requests, equipment issues mentioned)
- Review requests or invoice follow-ups

For each task found, create a task with a title, description, and due date (estimate based on urgency — immediate = today+1, soon = today+7, later = today+14).

Return JSON only: {"tasks": [{"title": "<short task title>", "description": "<one sentence detail>", "daysUntilDue": <1|7|14|30>, "relatedType": "job"}]}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        const tasks = parsed.tasks ?? [];
        // Insert tasks into DB
        const created = [];
        for (const t of tasks) {
          const dueAt = new Date(Date.now() + (t.daysUntilDue ?? 7) * 24 * 60 * 60 * 1000);
          const [res] = await db.insert(ownerTasks).values({
            title: t.title,
            description: t.description,
            relatedType: "job",
            relatedId: input.jobId,
            dueAt,
            completed: false,
          });
          created.push({ title: t.title, description: t.description, dueAt });
        }
        return { tasks: created, message: `Created ${created.length} task(s) from job notes.` };
      } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" }); }
    }),

  // ─── AI #14: Ad Performance Diagnosis ────────────────────────────────────
  diagnoseAdPerformance: ownerProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const spendRows = await db.select().from(adSpend).where(gte(adSpend.spentAt, thirtyDaysAgo)).orderBy(desc(adSpend.spentAt)).limit(100);
      const leadsThisMonth = await db.select({ id: opsLeads.id, source: opsLeads.source, stage: opsLeads.stage })
        .from(opsLeads).where(and(eq(opsLeads.userId, ctx.user.id), gte(opsLeads.createdAt, thirtyDaysAgo)));
      const totalSpend = spendRows.reduce((sum, s) => sum + s.amountCents, 0) / 100;
      const spendByPlatform: Record<string, number> = {};
      for (const s of spendRows) {
        spendByPlatform[s.platform] = (spendByPlatform[s.platform] ?? 0) + s.amountCents / 100;
      }
      const leadsBySource: Record<string, number> = {};
      for (const l of leadsThisMonth) {
        leadsBySource[l.source] = (leadsBySource[l.source] ?? 0) + 1;
      }
      const wonLeads = leadsThisMonth.filter((l) => l.stage === "won").length;
      const prompt = `Diagnose ad performance for Noland Earthworks, LLC — a forestry mulching and land management company in Middle Tennessee.

Last 30 days:
Total ad spend: $${totalSpend.toFixed(2)}
Spend by platform: ${JSON.stringify(spendByPlatform)}
Total leads: ${leadsThisMonth.length}
Leads by source: ${JSON.stringify(leadsBySource)}
Won leads (converted to jobs): ${wonLeads}
Cost per lead: $${leadsThisMonth.length > 0 ? (totalSpend / leadsThisMonth.length).toFixed(2) : "N/A"}
Cost per acquisition: $${wonLeads > 0 ? (totalSpend / wonLeads).toFixed(2) : "N/A"}

Analyze:
1. Which platform is delivering the best ROI
2. Which platform is wasting money
3. One specific change to make this week to improve results
4. Overall verdict: strong / acceptable / needs work

Return JSON only: {"bestPlatform": "<platform>", "worstPlatform": "<platform>", "verdict": "strong"|"acceptable"|"needs_work", "diagnosis": "<2-3 sentence plain English assessment>", "actionItem": "<one specific change to make this week>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return { ...parsed, totalSpend, totalLeads: leadsThisMonth.length, wonLeads, spendByPlatform, leadsBySource };
      } catch { return { diagnosis: "Analysis unavailable.", totalSpend, totalLeads: leadsThisMonth.length }; }
    }),

  // ─── AI #15: End-of-Day Field Summary ────────────────────────────────────
  generateDailySummary: ownerProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      // Jobs today
      const todayJobs = await db.select().from(jobs).where(and(
        eq(jobs.userId, ctx.user.id),
        gte(jobs.scheduledDate, today),
        lt(jobs.scheduledDate, tomorrow),
      ));
      // Leads today
      const todayLeads = await db.select().from(opsLeads).where(and(
        eq(opsLeads.userId, ctx.user.id),
        gte(opsLeads.createdAt, today),
        lt(opsLeads.createdAt, tomorrow),
      ));
      // Quotes sent today
      const todayQuotes = await db.select().from(quoteSubmissions).where(and(
        gte(quoteSubmissions.createdAt, today),
        lt(quoteSubmissions.createdAt, tomorrow),
      ));
      // Open tasks due today or overdue
      const openTasks = await db.select().from(ownerTasks).where(and(
        eq(ownerTasks.completed, false),
        lte(ownerTasks.dueAt, tomorrow),
      )).limit(20);
      // Time entries today
      const todayEntries = await db.select().from(timeEntries).where(gte(timeEntries.clockIn, today)).limit(50);
      const totalHoursToday = todayEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0) / 60, 0);
      const prompt = `Write a concise end-of-day field summary for Jon Noland, owner of Noland Earthworks, LLC.

Today's data:
- Jobs scheduled today: ${todayJobs.length} (${todayJobs.map((j) => j.title).join(", ") || "none"})
- New leads received: ${todayLeads.length}
- Quotes sent: ${todayQuotes.length}
- Hours logged: ${totalHoursToday.toFixed(1)}h
- Open tasks due today or overdue: ${openTasks.length} (${openTasks.map((t) => t.title).slice(0, 3).join(", ") || "none"})

Write a 5-line plain-English summary in Jon's voice:
- Line 1: Jobs completed or in progress today
- Line 2: Lead activity
- Line 3: Quote pipeline
- Line 4: Hours and field time
- Line 5: What needs attention tomorrow (open tasks, follow-ups)

Voice: Direct, no fluff, sounds like a field operator reviewing his day. No emojis.

Return JSON only: {"summary": "<5-line summary>", "topPriority": "<single most important thing for tomorrow>"}`;
      const result = await invokeLLM({ messages: [{ role: "user", content: prompt }] });
      const raw = result?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof raw === "string" ? raw : "{}");
        return {
          ...parsed,
          stats: {
            jobsToday: todayJobs.length,
            leadsToday: todayLeads.length,
            quotesToday: todayQuotes.length,
            hoursToday: totalHoursToday,
            openTasks: openTasks.length,
          },
        };
      } catch { return { summary: "Summary unavailable.", topPriority: "", stats: {} }; }
    }),
});
