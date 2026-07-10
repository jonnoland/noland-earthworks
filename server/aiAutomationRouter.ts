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

Pricing guidance (for ballparkRange only — internal use, not for the proposal body):
Forestry Mulching: $1,000–$1,500/acre (light), $1,500–$2,500/acre (moderate), $2,500–$4,500+/acre (heavy)
Land Clearing: $1,500–$3,000/acre (light), $3,000–$6,000/acre (moderate), $6,000–$12,000+/acre (heavy)
Brush Hogging: $150–$400/acre (maintenance), $400–$900/acre (brush control), $900–$2,000+/acre (reclamation)
Minimum job: $1,800. Mobilization: $0 within 30 mi, $150 at 31–50 mi, $300 at 51–75 mi, $500 at 76–100 mi.

If the lead data contains enough information to estimate a ballpark range (acreage, service type, general density), populate ballparkRange with a rough total dollar range (e.g., "$3,500–$6,000"). If there is not enough information, set ballparkRange to "" (empty string). Always set ballparkNote to one sentence explaining it is a rough estimate pending a site visit.

Do NOT include a price in the proposal body sections — leave a placeholder: [PRICE TO BE DETERMINED AFTER SITE VISIT]

Return JSON only: {"projectDescription": "...", "scopeOfWork": ["...", "..."], "inclusions": ["...", "..."], "exclusions": ["...", "..."], "siteConditions": "...", "estimatedTimeline": "...", "paymentTerms": "...", "ballparkRange": "...", "ballparkNote": "..."}`;
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

  // ─── AI Quote Analysis from Lead Data ────────────────────────────────────────
  // Analyzes lead info and returns a general quote estimate with reasoning.
  // The result is displayed inline in the LeadDetailPanel — not saved to the DB.
  quoteFromLead: ownerProcedure
    .input(z.object({
      leadId: z.number().int().positive(),
      // Optional overrides the user can adjust in the panel before running
      service:           z.string().optional(),
      acreage:           z.number().min(0.1).max(500).optional(),
      terrain:           z.enum(["flat", "rolling", "steep", "very_steep"]).optional(),
      vegetationDensity: z.enum(["light", "moderate", "heavy", "very_heavy"]).optional(),
      accessDifficulty:  z.enum(["easy", "moderate", "difficult"]).optional(),
      mobilizationMiles: z.number().min(0).max(300).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const leadRows = await db
        .select()
        .from(opsLeads)
        .where(and(eq(opsLeads.id, input.leadId), eq(opsLeads.userId, ctx.user.id)))
        .limit(1);
      const lead = leadRows[0];
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      const notes = await db
        .select()
        .from(leadNotes)
        .where(eq(leadNotes.leadId, input.leadId))
        .orderBy(desc(leadNotes.createdAt))
        .limit(10);
      const noteText = notes.map((n) => `- ${n.content}`).join("\n") || "No notes.";

      // Build override context if the user adjusted any inputs
      const overrides: string[] = [];
      if (input.service)           overrides.push(`Service override: ${input.service}`);
      if (input.acreage)           overrides.push(`Acreage override: ${input.acreage} acres`);
      if (input.terrain)           overrides.push(`Terrain override: ${input.terrain}`);
      if (input.vegetationDensity) overrides.push(`Vegetation density override: ${input.vegetationDensity}`);
      if (input.accessDifficulty)  overrides.push(`Access difficulty override: ${input.accessDifficulty}`);
      if (input.mobilizationMiles) overrides.push(`Mobilization miles override: ${input.mobilizationMiles} miles`);
      const overrideBlock = overrides.length > 0 ? `\n\nUser-provided adjustments:\n${overrides.join("\n")}` : "";

      const prompt = `You are the internal cost estimator for Noland Earthworks, LLC — a veteran-owned land clearing company in Middle Tennessee.

Analyze the lead below and produce a general quote estimate. Use your knowledge of current Middle Tennessee market rates for forestry mulching, land clearing, brush hogging, trail cutting, and vegetation management.

Lead data:
Name: ${lead.name}
Job type: ${lead.jobType ?? "not specified"}
Address: ${lead.address ?? "not provided"}
Notes: ${lead.notes ?? "none"}
Lead notes:\n${noteText}
Estimated value (if set by user): ${lead.estimatedValue ? "$" + lead.estimatedValue : "not set"}${overrideBlock}

Pricing context (Middle TN, current market rates):
Forestry Mulching (per acre):
- Light brush / saplings under 4": $1,000–$1,500/acre
- Moderate growth, trees up to 8": $1,500–$2,500/acre
- Heavy timber / dense cedar: $2,500–$4,500+/acre
- Minimum job: $1,800
Land Management / Land Clearing (per acre):
- Light clearing (mostly brush, flat): $1,500–$3,000/acre
- Moderate clearing (mixed timber, some slope): $3,000–$6,000/acre
- Heavy clearing (dense timber, steep terrain): $6,000–$12,000+/acre
Vegetation Management / Right-of-Way (per acre):
- Light ROW: $1,200–$2,500/acre
- Overgrown ROW: $2,500–$5,500+/acre
Brush Hogging (per acre):
- Pasture/field maintenance: $150–$400/acre
- Brush control: $400–$900/acre
- Full reclamation: $900–$2,000+/acre
Trail Cutting:
- Flat terrain, light brush: $2.00–$4.00/linear ft
- Sloped terrain (+20%): $2.40–$4.80/linear ft
- Rocky terrain (+40%): $2.80–$5.60/linear ft
- Minimum job: $500
Stump grinding: $150–$400/stump or $500–$1,200/acre
Mobilization surcharge: $0 within 30 mi, $150 at 31–50 mi, $300 at 51–75 mi, $500 at 76–100 mi, $750 at 100+ mi
Modifiers that increase price: steep terrain (+15–25%), very steep (+30–40%), heavy density (+15–20%), very heavy (+25–35%), difficult access (+10–15%), large stumps, rocky ground.

INTERNAL COST FLOOR (for flagging only — do not include in customer-facing output):
- Owner's internal daily operating cost: ~$1,047/day (labor + equipment + fuel + overhead)
- Minimum viable job at 30% margin: ~$1,500
- Absolute minimum job total: $1,800
- If estimateLow falls below $1,800, add "Estimate near or below minimum — verify acreage and scope before quoting" to missingInfo.

Instructions:
1. Infer the most likely service type from the job type and notes.
2. Estimate the acreage range if not stated (use context clues like lot size, property type, or typical job sizes).
3. Apply appropriate modifiers based on any terrain, density, or access clues in the notes.
4. Produce a low and high estimate in dollars.
5. Explain your reasoning briefly — what you inferred and why.
6. Flag any information that is missing and would change the estimate significantly.

Return JSON only:
{
  "service": "<inferred service name>",
  "estimatedAcres": <number or null>,
  "estimateLow": <number>,
  "estimateHigh": <number>,
  "mobilizationNote": "<brief note on travel surcharge if applicable>",
  "reasoning": "<2-4 sentences explaining what you inferred and why>",
  "missingInfo": ["<item1>", "<item2>"],
  "confidence": "high" | "medium" | "low"
}`;

      let result;
      try {
        result = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
          response_format: {
          type: "json_schema",
          json_schema: {
            name: "lead_quote_estimate",
            strict: true,
            schema: {
              type: "object",
              properties: {
                service:          { type: "string",  description: "Inferred service name" },
                estimatedAcres:   { type: "number", description: "Estimated acreage in acres. Use 0 if not determinable from the available information." },
                estimateLow:      { type: "number",  description: "Low end of price estimate in USD" },
                estimateHigh:     { type: "number",  description: "High end of price estimate in USD" },
                mobilizationNote: { type: "string",  description: "Brief travel surcharge note, empty string if not applicable" },
                reasoning:        { type: "string",  description: "2-4 sentences explaining inferences and modifiers applied" },
                missingInfo:      { type: "array", items: { type: "string" }, description: "List of missing data points that would improve the estimate" },
                confidence:       { type: "string",  enum: ["high", "medium", "low"], description: "Confidence level based on available info" },
              },
              required: ["service", "estimatedAcres", "estimateLow", "estimateHigh", "mobilizationNote", "reasoning", "missingInfo", "confidence"],
              additionalProperties: false,
            },
          },
          },
        });
      } catch (llmErr) {
        console.error("[quoteFromLead] LLM invocation failed:", llmErr);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `LLM call failed: ${(llmErr as Error).message}` });
      }
      const content = result?.choices?.[0]?.message?.content;
      if (!content) {
        console.error("[quoteFromLead] Empty LLM response. Full result:", JSON.stringify(result).slice(0, 500));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Empty LLM response" });
      }
      try {
        // content may be a string or an array of content blocks (thinking mode)
        const raw = typeof content === "string"
          ? content
          : Array.isArray(content)
            ? (content as Array<{ type: string; text?: string }>).find(b => b.type === "text")?.text ?? "{}"
            : JSON.stringify(content);
        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        const parsed = JSON.parse(cleaned);
        const result = parsed as {
          service: string;
          estimatedAcres: number;
          estimateLow: number;
          estimateHigh: number;
          mobilizationNote: string;
          reasoning: string;
          missingInfo: string[];
          confidence: "high" | "medium" | "low";
        };
        // Normalize 0 to null for display purposes
        return { ...result, estimatedAcres: result.estimatedAcres > 0 ? result.estimatedAcres : null };
      } catch (parseErr) {
        console.error("[quoteFromLead] JSON parse error:", parseErr, "raw content:", typeof content === "string" ? content.slice(0, 200) : JSON.stringify(content).slice(0, 200));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }
    }),
});
