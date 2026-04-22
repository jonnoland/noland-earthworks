/**
 * Scheduled background agents for Noland Earthworks.
 *
 * Agents:
 *  1. lead_followup       — emails leads that have gone quiet after N days
 *  2. visit_reminder      — texts/emails visitor the day before a confirmed site visit
 *  3. review_request      — emails completed-job customers asking for a Google review
 *  4. stale_lead_alert    — notifies Jon of leads stuck in a stage for too long
 *  5. daily_digest        — 7 AM summary of today's schedule, open leads, and pending visits
 *
 * Each agent:
 *  - Checks its own enable flag in agent_config (defaults to enabled)
 *  - Logs every run to agent_log
 *  - Never throws — errors are caught, logged, and recorded
 */

import { Resend } from "resend";
import { and, eq, gte, isNotNull, lte, ne, or } from "drizzle-orm";
import { getDb, getOwnerUser, insertAgentLog, getAgentConfig, upsertAgentConfig, upsertPricingBenchmark } from "./db";
import { businessSettings, jobs, opsLeads, scheduleEntries } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { isJobberConnected, jobberGraphQL } from "./jobber";
import { invokeLLM } from "./_core/llm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getResend() {
  return ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;
}

/** Returns true if the agent is enabled (defaults to true if no row exists). */
async function isEnabled(agentId: string): Promise<boolean> {
  const cfg = await getAgentConfig(agentId);
  if (!cfg) {
    // Seed default row as enabled
    await upsertAgentConfig(agentId, true);
    return true;
  }
  return cfg.enabled;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

// ─── Agent 1: Lead Follow-Up ──────────────────────────────────────────────────
/**
 * Runs daily. Finds leads in "new" or "contacted" stage that have not been
 * updated in 3+ days and have an email address. Sends a single follow-up email
 * and logs a note. Skips leads that have already received a follow-up in the
 * last 7 days (checked via agent_log summary).
 */
export async function runLeadFollowupAgent() {
  const AGENT_ID = "lead_followup";
  if (!(await isEnabled(AGENT_ID))) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Agent disabled." });
    return;
  }

  const resend = getResend();
  if (!resend) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Resend not configured." });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const cutoff = daysAgo(3);
    const staleCutoff = daysAgo(30); // Don't follow up leads older than 30 days

    const leads = await db.select().from(opsLeads)
      .where(
        and(
          or(eq(opsLeads.stage, "new"), eq(opsLeads.stage, "contacted")),
          isNotNull(opsLeads.email),
          lte(opsLeads.updatedAt, cutoff),
          gte(opsLeads.createdAt, staleCutoff)
        )
      )
      .orderBy(opsLeads.updatedAt)
      .limit(20);

    let sent = 0;
    const names: string[] = [];

    for (const lead of leads) {
      if (!lead.email) continue;
      try {
        await resend.emails.send({
          from: "Noland Earthworks <noreply@nolandearthworks.com>",
          to: lead.email,
          subject: "Still thinking about your land management project?",
          html: `
            <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
              <p>Hi ${lead.name.split(" ")[0]},</p>
              <p>I wanted to follow up on your inquiry about ${lead.jobType ?? "land management"} work. If you're still planning the project, I'd be glad to schedule a site visit and put together a quote for you.</p>
              <p>No pressure — just want to make sure you have what you need to move forward when the time is right.</p>
              <p>Give me a call at <a href="tel:6154064819" style="color:#c96e24;">615-406-4819</a> or reply to this email and we'll get it sorted out.</p>
              <p style="margin-top:2rem;">— Jon Noland<br><span style="font-size:0.85rem;color:#666;">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated</span></p>
            </div>
          `,
        });
        sent++;
        names.push(lead.name);
        // Update updatedAt so the same lead is not emailed again for 7 days
        await db.update(opsLeads)
          .set({ updatedAt: new Date() })
          .where(eq(opsLeads.id, lead.id));
      } catch (emailErr) {
        console.warn(`[Agent:lead_followup] Failed to email ${lead.email}:`, emailErr);
      }
    }

    const summary = sent > 0
      ? `Sent follow-up emails to ${sent} lead(s): ${names.join(", ")}.`
      : "No qualifying leads found.";

    await insertAgentLog({ agentId: AGENT_ID, status: "success", summary, actionsCount: sent });
    console.log(`[Agent:${AGENT_ID}] ${summary}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await insertAgentLog({ agentId: AGENT_ID, status: "error", error: msg });
    console.error(`[Agent:${AGENT_ID}] Error:`, err);
  }
}

// ─── Agent 2: Site Visit Reminder ────────────────────────────────────────────
/**
 * Runs daily at 7 AM. Finds leads with a confirmed site visit tomorrow and
 * sends a reminder email to the visitor.
 */
export async function runVisitReminderAgent() {
  const AGENT_ID = "visit_reminder";
  if (!(await isEnabled(AGENT_ID))) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Agent disabled." });
    return;
  }

  const resend = getResend();
  if (!resend) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Resend not configured." });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const tomorrow = daysFromNow(1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    // Find leads with a confirmed visit tomorrow
    const leads = await db.select().from(opsLeads)
      .where(
        and(
          isNotNull(opsLeads.visitConfirmedAt),
          isNotNull(opsLeads.requestedVisitAt),
          gte(opsLeads.requestedVisitAt, tomorrowStart),
          lte(opsLeads.requestedVisitAt, tomorrowEnd)
        )
      );

    let sent = 0;
    const names: string[] = [];

    for (const lead of leads) {
      if (!lead.email || !lead.requestedVisitAt) continue;
      const visitTime = new Date(lead.requestedVisitAt).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZone: "America/Chicago",
      });
      try {
        await resend.emails.send({
          from: "Noland Earthworks <noreply@nolandearthworks.com>",
          to: lead.email,
          subject: "Reminder: Site visit tomorrow",
          html: `
            <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
              <p>Hi ${lead.name.split(" ")[0]},</p>
              <p>Just a reminder that your site visit is scheduled for <strong>${visitTime} (Central)</strong>.</p>
              <p>I'll be on-site to walk the property and discuss the project. If anything comes up, call me at <a href="tel:6154064819" style="color:#c96e24;">615-406-4819</a>.</p>
              <p style="margin-top:2rem;">— Jon Noland<br><span style="font-size:0.85rem;color:#666;">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated</span></p>
            </div>
          `,
        });
        sent++;
        names.push(lead.name);
      } catch (emailErr) {
        console.warn(`[Agent:visit_reminder] Failed to email ${lead.email}:`, emailErr);
      }
    }

    const summary = sent > 0
      ? `Sent visit reminders to ${sent} lead(s): ${names.join(", ")}.`
      : "No confirmed visits tomorrow.";

    await insertAgentLog({ agentId: AGENT_ID, status: "success", summary, actionsCount: sent });
    console.log(`[Agent:${AGENT_ID}] ${summary}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await insertAgentLog({ agentId: AGENT_ID, status: "error", error: msg });
    console.error(`[Agent:${AGENT_ID}] Error:`, err);
  }
}

// ─── Agent 3: Review Request ──────────────────────────────────────────────────
/**
 * Runs daily. Finds jobs marked "completed" in the last 1–3 days that have a
 * client email on the linked lead. Sends a Google review request email.
 */
export async function runReviewRequestAgent() {
  const AGENT_ID = "review_request";
  if (!(await isEnabled(AGENT_ID))) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Agent disabled." });
    return;
  }

  const resend = getResend();
  if (!resend) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Resend not configured." });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const threeDaysAgo = daysAgo(3);
    const oneDayAgo = daysAgo(1);

    // Jobs completed in the 1–3 day window
    const completedJobs = await db.select().from(jobs)
      .where(
        and(
          eq(jobs.status, "completed"),
          isNotNull(jobs.completedDate),
          gte(jobs.completedDate, threeDaysAgo),
          lte(jobs.completedDate, oneDayAgo)
        )
      );

    // Fetch Google review URL from business settings
    const bizRows = await db.select().from(businessSettings).limit(1);
    const googleReviewUrl = bizRows[0]?.googleReviewUrl ?? "https://g.page/r/CcglMAMbtQInEBM/review";

    let sent = 0;
    const names: string[] = [];

    for (const job of completedJobs) {
      // Try to find a matching lead by client name to get email
      const matchingLeads = await db.select().from(opsLeads)
        .where(eq(opsLeads.name, job.client))
        .limit(1);
      const lead = matchingLeads[0];
      if (!lead?.email) continue;

      try {
        await resend.emails.send({
          from: "Noland Earthworks <noreply@nolandearthworks.com>",
          to: lead.email,
          subject: "How did we do? Leave us a review",
          html: `
            <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
              <p>Hi ${lead.name.split(" ")[0]},</p>
              <p>Thank you for trusting Noland Earthworks with your property. It was a pleasure working on the project.</p>
              <p>If you were happy with the work, a Google review goes a long way for a small, veteran-owned business like ours. It only takes a minute:</p>
              <p style="text-align:center;margin:1.5rem 0;">
                <a href="${googleReviewUrl}"
                   style="background:#c96e24;color:#fff;padding:0.75rem 1.75rem;border-radius:4px;text-decoration:none;font-weight:bold;font-family:sans-serif;">
                  Leave a Google Review
                </a>
              </p>
              <p>If anything wasn't right, please call me directly at <a href="tel:6154064819" style="color:#c96e24;">615-406-4819</a> and I'll make it right.</p>
              <p style="margin-top:2rem;">— Jon Noland<br><span style="font-size:0.85rem;color:#666;">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated</span></p>
            </div>
          `,
        });
        sent++;
        names.push(job.client);
      } catch (emailErr) {
        console.warn(`[Agent:review_request] Failed to email ${lead.email}:`, emailErr);
      }
    }

    const summary = sent > 0
      ? `Sent review requests for ${sent} completed job(s): ${names.join(", ")}.`
      : "No completed jobs in the review window.";

    await insertAgentLog({ agentId: AGENT_ID, status: "success", summary, actionsCount: sent });
    console.log(`[Agent:${AGENT_ID}] ${summary}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await insertAgentLog({ agentId: AGENT_ID, status: "error", error: msg });
    console.error(`[Agent:${AGENT_ID}] Error:`, err);
  }
}

// ─── Agent 4: Stale Lead Alert ────────────────────────────────────────────────
/**
 * Runs daily. Finds leads stuck in the same stage for more than 7 days and
 * pushes an owner notification so Jon can take action.
 */
export async function runStaleLeadAlertAgent() {
  const AGENT_ID = "stale_lead_alert";
  if (!(await isEnabled(AGENT_ID))) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Agent disabled." });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const cutoff = daysAgo(7);

    const staleLeads = await db.select().from(opsLeads)
      .where(
        and(
          ne(opsLeads.stage, "won"),
          ne(opsLeads.stage, "lost"),
          lte(opsLeads.updatedAt, cutoff)
        )
      )
      .orderBy(opsLeads.updatedAt)
      .limit(15);

    if (staleLeads.length === 0) {
      await insertAgentLog({ agentId: AGENT_ID, status: "success", summary: "No stale leads.", actionsCount: 0 });
      return;
    }

    const lines = staleLeads.map(l => {
      const days = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000);
      return `• ${l.name} — ${l.stage} — ${days}d idle${l.phone ? ` — ${l.phone}` : ""}`;
    });

    const content = `${staleLeads.length} lead(s) have had no activity for 7+ days:\n\n${lines.join("\n")}\n\nLog in to /ops/leads to follow up.`;

    await notifyOwner({ title: `${staleLeads.length} Stale Lead(s) Need Attention`, content });

    // SMS alert to owner phone — uses custom template if set
    if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber && ENV.ownerPhone) {
      try {
        const cfg = await getAgentConfig(AGENT_ID);
        const customTemplate = (cfg as any)?.smsTemplate ?? null;
        const DEFAULT_TEMPLATE = `Noland Earthworks: {name} ({stage}) idle {days}d. Phone: {phone}. Check leads.`;
        const template = customTemplate || DEFAULT_TEMPLATE;

        const twilio = await import("twilio");
        const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);

        // Send one SMS per stale lead (up to 3) using the template
        const leadsToAlert = staleLeads.slice(0, 3);
        for (const lead of leadsToAlert) {
          const days = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86_400_000);
          const smsBody = template
            .replace(/\{name\}/g, lead.name)
            .replace(/\{stage\}/g, lead.stage)
            .replace(/\{days\}/g, String(days))
            .replace(/\{phone\}/g, lead.phone ?? "N/A");
          await client.messages.create({
            body: smsBody,
            from: ENV.twilioFromNumber,
            to: ENV.ownerPhone,
          });
        }
        if (staleLeads.length > 3) {
          await client.messages.create({
            body: `...and ${staleLeads.length - 3} more stale lead(s). View: nolandearthworks.com/ops/leads`,
            from: ENV.twilioFromNumber,
            to: ENV.ownerPhone,
          });
        }
        console.log(`[Agent:${AGENT_ID}] SMS alert(s) sent to owner for ${leadsToAlert.length} lead(s).`);
      } catch (smsErr) {
        console.warn(`[Agent:${AGENT_ID}] SMS alert failed:`, smsErr);
      }
    }

    const summary = `Alerted owner about ${staleLeads.length} stale lead(s) (notification + SMS).`;
    await insertAgentLog({ agentId: AGENT_ID, status: "success", summary, actionsCount: staleLeads.length });
    console.log(`[Agent:${AGENT_ID}] ${summary}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await insertAgentLog({ agentId: AGENT_ID, status: "error", error: msg });
    console.error(`[Agent:${AGENT_ID}] Error:`, err);
  }
}

// ─── Agent 5: Daily Ops Digest ────────────────────────────────────────────────
/**
 * Runs every morning at 7 AM. Sends Jon a summary of:
 *  - Today's scheduled jobs
 *  - Open leads count by stage
 *  - Pending site visits (unconfirmed)
 *  - Jobs completed yesterday (ready for invoicing)
 */
export async function runDailyDigestAgent() {
  const AGENT_ID = "daily_digest";
  if (!(await isEnabled(AGENT_ID))) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Agent disabled." });
    return;
  }

  const resend = getResend();
  if (!resend) {
    await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Resend not configured." });
    return;
  }

  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const owner = await getOwnerUser();
    if (!owner) {
      await insertAgentLog({ agentId: AGENT_ID, status: "skipped", summary: "Owner not found." });
      return;
    }

    // Get owner email from businessSettings (most reliable)
    const bizRows = await db.select().from(businessSettings).limit(1);
    const ownerEmail = bizRows[0]?.email ?? owner.email ?? "jonnoland@nolandearthworks.com";
    const googleReviewUrl = bizRows[0]?.googleReviewUrl ?? "https://g.page/r/CcglMAMbtQInEBM/review";

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const yesterdayStart = startOfDay(daysAgo(1));
    const yesterdayEnd = endOfDay(daysAgo(1));

    // Today's schedule entries
    const todayEntries = await db.select().from(scheduleEntries)
      .where(
        and(
          eq(scheduleEntries.userId, owner.id),
          gte(scheduleEntries.date, todayStart),
          lte(scheduleEntries.date, todayEnd)
        )
      );

    // Open leads
    const openLeads = await db.select().from(opsLeads)
      .where(
        and(
          eq(opsLeads.userId, owner.id),
          ne(opsLeads.stage, "won"),
          ne(opsLeads.stage, "lost")
        )
      );

    // Pending site visits (requested but not confirmed)
    const pendingVisits = openLeads.filter(l => l.requestedVisitAt && !l.visitConfirmedAt);

    // Jobs completed yesterday — ready to invoice
    const completedYesterday = await db.select().from(jobs)
      .where(
        and(
          eq(jobs.userId, owner.id),
          eq(jobs.status, "completed"),
          isNotNull(jobs.completedDate),
          gte(jobs.completedDate, yesterdayStart),
          lte(jobs.completedDate, yesterdayEnd)
        )
      );

    // ── Jobber revenue data (last 30 days) ──────────────────────────────────
    let jobberRevenueHtml = "";
    try {
      const jobberConnected = await isJobberConnected();
      if (jobberConnected) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const invoiceData = await jobberGraphQL(`
          query DigestInvoices($first: Int) {
            invoices(first: $first) {
              nodes {
                id invoiceNumber invoiceStatus
                amounts { subtotal total invoiceBalance }
                issuedDate
              }
              totalCount
            }
          }
        `, { first: 100 }) as any;

        const invoiceNodes = invoiceData?.invoices?.nodes ?? [];
        const totalInvoiced = invoiceNodes.reduce((s: number, inv: any) => s + (Number(inv.amounts?.total) || 0), 0);
        const totalOutstanding = invoiceNodes.reduce((s: number, inv: any) => {
          if (inv.invoiceStatus === "DRAFT" || inv.invoiceStatus === "SENT") {
            return s + (Number(inv.amounts?.invoiceBalance) || 0);
          }
          return s;
        }, 0);
        const totalPaid = invoiceNodes.reduce((s: number, inv: any) => {
          if (inv.invoiceStatus === "PAID") {
            return s + (Number(inv.amounts?.total) || 0);
          }
          return s;
        }, 0);

        jobberRevenueHtml = `
          <h3 style="font-family:sans-serif;margin-top:1.5rem;">Jobber Revenue (All Invoices)</h3>
          <ul>
            <li>Total Invoiced: <strong>$${totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></li>
            <li>Total Paid: <strong style="color:#16a34a;">$${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></li>
            <li>Outstanding (Draft/Sent): <strong style="color:#c96e24;">$${totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></li>
            <li>Invoice Count: <strong>${invoiceNodes.length}</strong></li>
          </ul>
        `;
      }
    } catch (jobberErr) {
      console.warn("[Agent:daily_digest] Jobber revenue fetch failed:", jobberErr);
      jobberRevenueHtml = `<p style="color:#888;font-size:0.85rem;">Jobber revenue data unavailable.</p>`;
    }

    // Stage breakdown
    const stageCounts: Record<string, number> = {};
    for (const l of openLeads) {
      stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
    }
    const stageLines = Object.entries(stageCounts)
      .map(([s, n]) => `<li>${s.replace(/_/g, " ")}: <strong>${n}</strong></li>`)
      .join("");

    const scheduleLines = todayEntries.length > 0
      ? todayEntries.map(e => `<li>${e.title} — ${e.crewName}</li>`).join("")
      : "<li>No jobs scheduled today.</li>";

    const visitLines = pendingVisits.length > 0
      ? pendingVisits.map(v => {
          const dt = v.requestedVisitAt
            ? new Date(v.requestedVisitAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })
            : "date TBD";
          return `<li>${v.name} — ${dt}${v.phone ? ` — ${v.phone}` : ""}</li>`;
        }).join("")
      : "<li>None</li>";

    const invoiceLines = completedYesterday.length > 0
      ? completedYesterday.map(j => `<li>${j.title} — ${j.client}${j.totalPrice ? ` — $${Number(j.totalPrice).toLocaleString()}` : ""}</li>`).join("")
      : "<li>None</li>";

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    await resend.emails.send({
      from: "Noland Earthworks <noreply@nolandearthworks.com>",
      to: ownerEmail,
      subject: `Daily Ops Digest — ${today}`,
      html: `
        <div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;color:#1a1a1a;line-height:1.7;">
          <h2 style="font-family:sans-serif;border-bottom:2px solid #c96e24;padding-bottom:0.5rem;color:#c96e24;">
            Daily Ops Digest &mdash; ${today}
          </h2>

          <h3 style="font-family:sans-serif;margin-top:1.5rem;">Today's Schedule (${todayEntries.length})</h3>
          <ul>${scheduleLines}</ul>

          <h3 style="font-family:sans-serif;margin-top:1.5rem;">Open Leads (${openLeads.length})</h3>
          <ul>${stageLines}</ul>

          <h3 style="font-family:sans-serif;margin-top:1.5rem;">Pending Site Visits (${pendingVisits.length})</h3>
          <ul>${visitLines}</ul>

          <h3 style="font-family:sans-serif;margin-top:1.5rem;">Ready to Invoice (${completedYesterday.length})</h3>
          <ul>${invoiceLines}</ul>

          ${jobberRevenueHtml}

          <p style="margin-top:2rem;font-size:0.85rem;color:#888;">
            <a href="https://nolandearthworks.com/ops" style="color:#c96e24;">Open Ops Dashboard</a>
          </p>
        </div>
      `,
    });

    const summary = `Digest sent. ${todayEntries.length} jobs today, ${openLeads.length} open leads, ${pendingVisits.length} pending visits.`;
    await insertAgentLog({ agentId: AGENT_ID, status: "success", summary, actionsCount: 1 });
    console.log(`[Agent:${AGENT_ID}] ${summary}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await insertAgentLog({ agentId: AGENT_ID, status: "error", error: msg });
    console.error(`[Agent:${AGENT_ID}] Error:`, err);
  }
}

// ─── Agent 6: Pricing Benchmark Update ───────────────────────────────────────
/**
 * Runs every Sunday at 6 AM. Uses the LLM to research current market rates
 * for land management, forestry mulching, brush removal, and brush hogging in
 * Middle & West Tennessee. Upserts results into pricing_benchmarks table.
 */

const PRICING_SERVICES = [
  { key: "Land Management",    description: "land management per acre in Middle and West Tennessee" },
  { key: "Forestry Mulching", description: "forestry mulching per acre in Middle and West Tennessee" },
  { key: "Brush Removal",    description: "brush removal per acre in Middle and West Tennessee" },
  { key: "Brush Hogging",    description: "brush hogging / bush hogging per acre in Middle and West Tennessee" },
  { key: "Stump Grinding",   description: "stump grinding per stump or per hour in Middle and West Tennessee — express rates as per-stump low/mid/high" },
  { key: "Debris Hauling",   description: "debris hauling and removal per load or per acre in Middle and West Tennessee — express rates as per-load or per-acre low/mid/high" },
];

export async function runPricingUpdateAgent() {
  const AGENT_ID = "pricing_update";
  if (!(await isEnabled(AGENT_ID))) {
    console.log("[pricing_update] Disabled — skipping.");
    return;
  }

  console.log("[pricing_update] Starting pricing research for Middle & West Tennessee...");
  let updatedCount = 0;
  const summaryLines: string[] = [];

  try {
    for (const svc of PRICING_SERVICES) {
      try {
        const prompt = `You are a market research assistant for a land management company in Tennessee.

Research current market rates for ${svc.description}. Focus specifically on:
- Middle Tennessee (Nashville metro, Columbia, Murfreesboro, Franklin, Clarksville, Lawrenceburg areas)
- West Tennessee (Jackson, Memphis suburbs, Dyersburg, Paris, Brownsville areas)

Consider:
- Competitor pricing from companies like Middle Tennessee Land Clearing LLC, Mid State Land Clearing LLC, Grounded Land Solutions, Stribling Land Clearing & Dirtwork, Wolf Creek Land Company
- Industry forums, contractor pricing guides, and homeowner cost reports for Tennessee
- Typical terrain conditions in this region (rolling hills, cedar glades, bottomland hardwoods)
- Current fuel and equipment operating costs as of ${new Date().getFullYear()}

For services priced per stump or per load (not per acre), express the low/mid/high values as the typical unit price (per stump for stump grinding, per load for debris hauling). The field names still use "PerAcre" but treat them as the relevant unit price for this service.

Respond with JSON only:
{
  "lowPerAcre": <integer, low end of market range>,
  "midPerAcre": <integer, typical market rate>,
  "highPerAcre": <integer, premium or complex rate>,
  "summary": "<1-2 sentence explanation of the rates, the unit used (per acre / per stump / per load), and key factors considered>"
}

All values are USD integers. No $ signs or commas in the numbers.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a market research assistant. Respond with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "pricing_research",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  lowPerAcre:  { type: "integer" },
                  midPerAcre:  { type: "integer" },
                  highPerAcre: { type: "integer" },
                  summary:     { type: "string" },
                },
                required: ["lowPerAcre", "midPerAcre", "highPerAcre", "summary"],
                additionalProperties: false,
              },
            },
          },
        } as any);

        const content = (response as any)?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Empty LLM response");

        const parsed = JSON.parse(content) as {
          lowPerAcre: number;
          midPerAcre: number;
          highPerAcre: number;
          summary: string;
        };
        const { lowPerAcre, midPerAcre, highPerAcre, summary } = parsed;

        // Sanity check — values must be positive integers in a plausible range
        // Lower bound is 25 to accommodate per-stump / per-load services
        if (
          typeof lowPerAcre  !== "number" || lowPerAcre  < 25 || lowPerAcre  > 10000 ||
          typeof midPerAcre  !== "number" || midPerAcre  < 25 || midPerAcre  > 10000 ||
          typeof highPerAcre !== "number" || highPerAcre < 25 || highPerAcre > 10000 ||
          lowPerAcre > midPerAcre || midPerAcre > highPerAcre
        ) {
          throw new Error(
            `Implausible values for ${svc.key}: low=${lowPerAcre} mid=${midPerAcre} high=${highPerAcre}`
          );
        }

        await upsertPricingBenchmark({
          serviceType: svc.key,
          lowPerAcre,
          midPerAcre,
          highPerAcre,
          region: "Middle & West Tennessee",
          researchSummary: summary,
        });

        updatedCount++;
        summaryLines.push(`${svc.key}: $${lowPerAcre}–$${midPerAcre}–$${highPerAcre}/ac`);
        console.log(`[pricing_update] ${svc.key}: $${lowPerAcre}/$${midPerAcre}/$${highPerAcre}/ac`);
      } catch (svcErr) {
        const msg = (svcErr as Error).message ?? String(svcErr);
        console.error(`[pricing_update] Failed for ${svc.key}:`, msg);
        summaryLines.push(`${svc.key}: FAILED (${msg})`);
      }
    }

    const runSummary = `Updated ${updatedCount}/${PRICING_SERVICES.length} services. ${summaryLines.join(" | ")}`;
    await insertAgentLog({ agentId: AGENT_ID, status: "success", summary: runSummary, actionsCount: updatedCount });

    if (updatedCount > 0) {
      await notifyOwner({
        title: "Pricing Benchmarks Updated",
        content: `Weekly pricing research complete for Middle & West Tennessee.\n\n${summaryLines.join("\n")}`,
      });
    }
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[pricing_update] Fatal error:", msg);
    await insertAgentLog({ agentId: AGENT_ID, status: "error", summary: msg, actionsCount: 0, error: msg });
  }
}

// ─── Agent registry (for the UI) ─────────────────────────────────────────────
export const AGENT_REGISTRY = [
  {
    id: "lead_followup",
    name: "Lead Follow-Up",
    description: "Emails leads in 'new' or 'contacted' stage that have gone quiet for 3+ days.",
    schedule: "Daily at 9 AM",
  },
  {
    id: "visit_reminder",
    name: "Site Visit Reminder",
    description: "Emails the visitor a reminder the day before a confirmed site visit.",
    schedule: "Daily at 7 AM",
  },
  {
    id: "review_request",
    name: "Review Request",
    description: "Emails completed-job customers 1–3 days after job completion asking for a Google review.",
    schedule: "Daily at 10 AM",
  },
  {
    id: "stale_lead_alert",
    name: "Stale Lead Alert",
    description: "Notifies you when leads have had no activity for 7+ days.",
    schedule: "Daily at 8 AM",
  },
  {
    id: "daily_digest",
    name: "Daily Ops Digest",
    description: "Emails you a morning summary: today's schedule, open leads, pending visits, and jobs ready to invoice.",
    schedule: "Daily at 7 AM",
  },
  {
    id: "pricing_update",
    name: "Pricing Benchmark Update",
    description: "Researches current market rates for land management, forestry mulching, brush removal, and brush hogging in Middle & West Tennessee. Updates the benchmarks on the Pricing page.",
    schedule: "Sundays at 6 AM",
  },
] as const;

export type AgentId = typeof AGENT_REGISTRY[number]["id"];

/** Convenience helper for the cron scheduler — returns true if the agent is enabled (defaults to true). */
export async function getAgentEnabled(agentId: string): Promise<boolean> {
  const cfg = await getAgentConfig(agentId);
  return cfg?.enabled ?? true;
}
