import { and, desc, eq, isNull, lt, lte, or } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import {
  InsertJob, InsertOpsLead, InsertScheduleEntry, InsertUser,
  jobs, opsLeads, scheduleEntries, users, visitBlackoutDates, InsertVisitBlackoutDate,
  recurringBlackoutDays, agentConfig, agentLog, ownerTasks, InsertOwnerTask,
  jobNotes, pricingBenchmarks, pricingBenchmarkCandidates, chatSessions, nativeQuotes,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: MySql2Database | null = null;

// Use a connection pool string — drizzle-orm/mysql2 handles pool creation internally.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connection initialized");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      // Only propagate role to updateSet when upgrading to admin or when this is the
      // known owner openId. This prevents a re-login from silently downgrading a
      // manually-promoted admin back to 'user'.
      if (user.role === 'admin' || user.openId === ENV.ownerOpenId) {
        updateSet.role = user.role;
      }
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Owner helper ────────────────────────────────────────────────────────────
/**
 * Returns the owner's DB user row (needed to set userId on auto-created leads).
 * Strategy:
 * 1. If OWNER_OPEN_ID env var is set, look up by openId (most reliable).
 * 2. Fallback: find the first admin user in the DB (handles cases where env
 *    var is not injected into the production runtime).
 * 3. If still not found, seed a minimal row using the env var.
 */
export async function getOwnerUser() {
  const db = await getDb();
  if (!db) return null;

  // Strategy 1: look up by OWNER_OPEN_ID env var
  if (ENV.ownerOpenId) {
    const existing = await getUserByOpenId(ENV.ownerOpenId);
    if (existing) return existing;
  }

  // Strategy 2: fallback — find the first admin user in the DB
  try {
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
    if (adminUsers.length > 0) {
      console.log('[Database] getOwnerUser: found admin via DB fallback, id:', adminUsers[0].id);
      return adminUsers[0];
    }
  } catch (err) {
    console.warn('[Database] getOwnerUser: admin fallback query failed:', err);
  }

  // Strategy 3: seed a minimal row if OWNER_OPEN_ID is available
  if (ENV.ownerOpenId) {
    try {
      await upsertUser({
        openId: ENV.ownerOpenId,
        role: 'admin',
        lastSignedIn: new Date(),
      });
      const seeded = await getUserByOpenId(ENV.ownerOpenId);
      return seeded ?? null;
    } catch (err) {
      console.warn('[Database] Could not seed owner row:', err);
    }
  }

  console.warn('[Database] getOwnerUser: no owner found via any strategy');
  return null;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────
export async function getJobs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.createdAt));
}
export async function createJob(data: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(jobs).values(data);
}
export async function updateJob(id: number, userId: number, data: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(jobs).set({ ...data, updatedAt: new Date() }).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
}
export async function deleteJob(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove linked schedule entries first — no DB-level cascade on jobId
  await db.delete(scheduleEntries).where(and(eq(scheduleEntries.jobId, id), eq(scheduleEntries.userId, userId)));
  return db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getOpsLeads(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: opsLeads.id,
      userId: opsLeads.userId,
      name: opsLeads.name,
      email: opsLeads.email,
      phone: opsLeads.phone,
      address: opsLeads.address,
      source: opsLeads.source,
      stage: opsLeads.stage,
      jobType: opsLeads.jobType,
      estimatedValue: opsLeads.estimatedValue,
      notes: opsLeads.notes,
      requestedVisitAt: opsLeads.requestedVisitAt,
      visitConfirmedAt: opsLeads.visitConfirmedAt,
      aiScore: opsLeads.aiScore,
      aiSummary: opsLeads.aiSummary,
      aiFlags: opsLeads.aiFlags,
      aiDraftResponse: opsLeads.aiDraftResponse,
      chatSessionId: opsLeads.chatSessionId,
      nativeQuoteId: opsLeads.nativeQuoteId,
      estimateAmount: opsLeads.estimateAmount,
      clientType: opsLeads.clientType,
      aiQuoteData: opsLeads.aiQuoteData,
      aiQuoteSavedAt: opsLeads.aiQuoteSavedAt,
      createdAt: opsLeads.createdAt,
      updatedAt: opsLeads.updatedAt,
      // Joined quote fields for badge display
      quoteStatus: nativeQuotes.status,
      quoteTotalCents: nativeQuotes.totalCents,
    })
    .from(opsLeads)
    .leftJoin(nativeQuotes, eq(nativeQuotes.id, opsLeads.nativeQuoteId))
    .where(eq(opsLeads.userId, userId))
    .orderBy(desc(opsLeads.createdAt));
  return rows;
}
export async function createOpsLead(data: InsertOpsLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(opsLeads).values(data);
}

/**
 * Upsert a lead by phone number.
 * If a lead with the same phone already exists for this owner, update it (append notes,
 * update chatSessionId, keep the existing stage unless it is still "new").
 * Returns { leadId, created: true } on insert or { leadId, created: false } on update.
 */
export async function upsertOpsLeadByPhone(
  data: InsertOpsLead & { phone: string }
): Promise<{ leadId: number; created: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Look for an existing lead with the same phone under the same owner
  const existing = await db
    .select()
    .from(opsLeads)
    .where(and(eq(opsLeads.userId, data.userId), eq(opsLeads.phone, data.phone)))
    .limit(1)
    .then(rows => rows[0] ?? null);

  if (!existing) {
    // No match — create new lead
    const result = await db.insert(opsLeads).values(data);
    const insertResult = result as unknown as { insertId?: number };
    return { leadId: insertResult?.insertId ?? 0, created: true };
  }

  // Match found — append new notes to existing notes and update metadata
  const appendedNotes = [
    existing.notes ?? "",
    data.notes ? `\n\n--- New chat session (${new Date().toLocaleDateString()}) ---\n${data.notes}` : "",
  ].join("").trim();

  await db
    .update(opsLeads)
    .set({
      // Update name if we now have a better one
      name: data.name && data.name !== "Website Visitor" ? data.name : existing.name,
      // Update email if newly provided
      email: data.email || existing.email,
      // Keep the lead card aligned with the latest website request service.
      jobType: data.jobType || existing.jobType,
      // Append notes
      notes: appendedNotes || existing.notes,
      // Link to latest chat session
      chatSessionId: data.chatSessionId ?? existing.chatSessionId,
      // Keep existing stage unless it is still "new" and we have a new source
      source: existing.source === "other" ? data.source : existing.source,
      // Update clientType if the new submission is more specific (government > commercial > residential)
      clientType: (() => {
        const order = { government: 3, commercial: 2, residential: 1 };
        const existingRank = order[(existing.clientType ?? "residential") as keyof typeof order] ?? 1;
        const newRank = order[(data.clientType ?? "residential") as keyof typeof order] ?? 1;
        return newRank > existingRank ? data.clientType : existing.clientType;
      })(),
      updatedAt: new Date(),
    })
    .where(eq(opsLeads.id, existing.id));

  return { leadId: existing.id, created: false };
}
export async function updateOpsLead(id: number, userId: number, data: Partial<InsertOpsLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(opsLeads).set({ ...data, updatedAt: new Date() }).where(and(eq(opsLeads.id, id), eq(opsLeads.userId, userId)));
}
/** Update a lead by id only — used for public-facing mutations (e.g. visit scheduling) where userId is not in context. */
export async function updateOpsLeadById(id: number, data: Partial<InsertOpsLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(opsLeads).set({ ...data, updatedAt: new Date() }).where(eq(opsLeads.id, id));
}
export async function deleteOpsLead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(opsLeads).where(and(eq(opsLeads.id, id), eq(opsLeads.userId, userId)));
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export async function getScheduleEntries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduleEntries).where(eq(scheduleEntries.userId, userId)).orderBy(desc(scheduleEntries.date));
}
export async function createScheduleEntry(data: InsertScheduleEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(scheduleEntries).values(data);
}
export async function updateScheduleEntry(id: number, userId: number, data: Partial<InsertScheduleEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(scheduleEntries).set({ ...data, updatedAt: new Date() }).where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.userId, userId)));
}
export async function deleteScheduleEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(scheduleEntries).where(and(eq(scheduleEntries.id, id), eq(scheduleEntries.userId, userId)));
}

// ─── Visit Blackout Dates ─────────────────────────────────────────────────────
export async function getVisitBlackoutDates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visitBlackoutDates).orderBy(visitBlackoutDates.date);
}
export async function addVisitBlackoutDate(date: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(visitBlackoutDates).values({ date, reason: reason ?? null });
}
export async function removeVisitBlackoutDate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(visitBlackoutDates).where(eq(visitBlackoutDates.id, id));
}

// ─── Recurring Blackout Days ──────────────────────────────────────────────────
export async function getRecurringBlackoutDays() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recurringBlackoutDays).orderBy(recurringBlackoutDays.dayOfWeek);
}
export async function addRecurringBlackoutDay(dayOfWeek: number, label?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(recurringBlackoutDays).values({ dayOfWeek, label: label ?? null });
}
export async function removeRecurringBlackoutDay(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(recurringBlackoutDays).where(eq(recurringBlackoutDays.id, id));
}

// ─── Lead by ID ────────────────────────────────────────────────────────────────
export async function getOpsLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(opsLeads).where(eq(opsLeads.id, id)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

// ─── Agent Config helpers ─────────────────────────────────────────────────────
export async function getAgentConfig(agentId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(agentConfig).where(eq(agentConfig.agentId, agentId));
  return rows[0] ?? null;
}
function parseAgentConfigOptions(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function upsertAgentConfig(agentId: string, enabled?: boolean, smsTemplate?: string, config?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(agentConfig).where(eq(agentConfig.agentId, agentId));
  if (existing.length === 0) {
    await db.insert(agentConfig).values({
      agentId,
      enabled: enabled ?? true,
      smsTemplate: smsTemplate ?? null,
      config: config ? JSON.stringify(config) : null,
    });
  } else {
    const updates: Record<string, unknown> = {};
    if (enabled !== undefined) updates.enabled = enabled;
    if (smsTemplate !== undefined) updates.smsTemplate = smsTemplate;
    if (config !== undefined) updates.config = JSON.stringify({ ...parseAgentConfigOptions(existing[0]?.config), ...config });
    if (Object.keys(updates).length > 0) {
      await db.update(agentConfig).set(updates).where(eq(agentConfig.agentId, agentId));
    }
  }
}

export async function listAgentConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentConfig).orderBy(agentConfig.agentId);
}

// ─── Agent Log helpers ────────────────────────────────────────────────────────
export async function insertAgentLog(data: {
  agentId: string;
  status: string;
  summary?: string;
  actionsCount?: number;
  error?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(agentLog).values({
    agentId: data.agentId,
    status: data.status,
    summary: data.summary ?? null,
    actionsCount: data.actionsCount ?? 0,
    error: data.error ?? null,
  });
}

export async function getAgentLogs(agentId?: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  if (agentId) {
    return db.select().from(agentLog).where(eq(agentLog.agentId, agentId)).orderBy(desc(agentLog.ranAt)).limit(limit);
  }
  return db.select().from(agentLog).orderBy(desc(agentLog.ranAt)).limit(limit);
}

export async function getLastAgentRun(agentId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(agentLog)
    .where(eq(agentLog.agentId, agentId))
    .orderBy(desc(agentLog.ranAt))
    .limit(1);
  return rows[0] ?? null;
}

// ─── Owner Tasks helpers ──────────────────────────────────────────────────────
export async function insertOwnerTask(data: InsertOwnerTask) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(ownerTasks).values(data);
  return result;
}

export async function listOwnerTasks(includeCompleted = false) {
  const db = await getDb();
  if (!db) return [];
  if (includeCompleted) {
    return db.select().from(ownerTasks).orderBy(ownerTasks.dueAt);
  }
  return db.select().from(ownerTasks)
    .where(eq(ownerTasks.completed, false))
    .orderBy(ownerTasks.dueAt);
}

export async function completeOwnerTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(ownerTasks)
    .set({ completed: true, completedAt: new Date() })
    .where(eq(ownerTasks.id, id));
}

export async function deleteOwnerTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(ownerTasks).where(eq(ownerTasks.id, id));
}

// ─── Pricing Benchmarks ─────────────────────────────────────────────────────────────────────────────────
export async function getPricingBenchmarks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricingBenchmarks).orderBy(pricingBenchmarks.serviceType);
}
export async function upsertPricingBenchmark(data: {
  serviceType: string;
  lowPerAcre: number;
  midPerAcre: number;
  highPerAcre: number;
  region?: string;
  researchSummary?: string;
  unit?: "acre" | "linear_foot" | "hour" | "load" | "stump" | "flat";
  sourceUrls?: string[];
  evidenceStatus?: "legacy_unverified" | "owner_approved";
  reviewedAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.insert(pricingBenchmarks)
    .values({
      serviceType: data.serviceType,
      lowPerAcre: data.lowPerAcre,
      midPerAcre: data.midPerAcre,
      highPerAcre: data.highPerAcre,
      region: data.region ?? 'Middle & West Tennessee',
      researchSummary: data.researchSummary ?? null,
      unit: data.unit ?? 'acre',
      sourceUrls: data.sourceUrls?.length ? JSON.stringify(data.sourceUrls) : null,
      evidenceStatus: data.evidenceStatus ?? 'legacy_unverified',
      reviewedAt: data.reviewedAt ?? null,
      lastUpdatedAt: new Date(),
    })
    .onDuplicateKeyUpdate({
      set: {
        lowPerAcre: data.lowPerAcre,
        midPerAcre: data.midPerAcre,
        highPerAcre: data.highPerAcre,
        region: data.region ?? 'Middle & West Tennessee',
        researchSummary: data.researchSummary ?? null,
        unit: data.unit ?? 'acre',
        sourceUrls: data.sourceUrls?.length ? JSON.stringify(data.sourceUrls) : null,
        evidenceStatus: data.evidenceStatus ?? 'legacy_unverified',
        reviewedAt: data.reviewedAt ?? null,
        lastUpdatedAt: new Date(),
      },
    });
}

// ─── Job Notes ─────────────────────────────────────────────────────────────────────────────────
export async function getJobNotes(jobId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobNotes).where(eq(jobNotes.jobId, jobId)).orderBy(jobNotes.createdAt);
}
export async function addJobNote(jobId: string, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  const [row] = await db.insert(jobNotes).values({ jobId, userId, content }).$returningId();
  return row;
}
export async function deleteJobNote(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(jobNotes).where(eq(jobNotes.id, id));
}

// ─── User Management ──────────────────────────────────────────────────────────
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export async function setUserRole(userId: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Pending Notifications (retry queue) ─────────────────────────────────────
import { pendingNotifications, InsertPendingNotification } from "../drizzle/schema";
// drizzle-orm helpers imported at top of file

export async function queueNotification(data: InsertPendingNotification) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pendingNotifications).values(data);
}

export async function getPendingNotifications(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const MAX_RETRIES = 3;
  const retryAfter = new Date(Date.now() - 5 * 60 * 1000); // 5 min cooldown between retries
  return db.select().from(pendingNotifications)
    .where(
      and(
        lte(pendingNotifications.retryCount, MAX_RETRIES - 1),
        or(
          isNull(pendingNotifications.lastAttemptAt),
          lte(pendingNotifications.lastAttemptAt, retryAfter)
        )
      )
    )
    .orderBy(pendingNotifications.createdAt)
    .limit(limit);
}

export async function markNotificationAttempt(id: number, error?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(pendingNotifications)
    .set({
      retryCount: (pendingNotifications.retryCount as any) + 1,
      lastAttemptAt: new Date(),
      lastError: error ?? null,
    })
    .where(eq(pendingNotifications.id, id));
}

export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pendingNotifications).where(eq(pendingNotifications.id, id));
}

/**
 * Deletes anonymous chat sessions (no name, no phone, no lead created).
 * When force=true, removes ALL anonymous sessions regardless of age (manual admin trigger).
 * When force=false (default), only removes sessions older than olderThanDays (nightly cron).
 * Chat messages are deleted automatically via CASCADE.
 * Returns the number of sessions deleted.
 */
export async function cleanupAnonymousChatSessions(olderThanDays = 14, force = false): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Anonymous session conditions: no lead, no name, no phone
  const anonymousConditions = and(
    eq(chatSessions.leadCreated, false),
    or(isNull(chatSessions.visitorName), eq(chatSessions.visitorName, "")),
    or(isNull(chatSessions.visitorPhone), eq(chatSessions.visitorPhone, ""))
  );

  const whereClause = force
    ? anonymousConditions
    : and(anonymousConditions, lt(chatSessions.createdAt, new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)));

  const result = await db.delete(chatSessions).where(whereClause);

  // MySQL2 result is an array [ResultSetHeader, ...]; rowsAffected is in [0]
  const affected = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
  return affected;
}

// ── Prospecting Leads ─────────────────────────────────────────────────────────

export async function insertProspectingLead(data: {
  source: string;
  url: string;
  contactName?: string | null;
  contactInfo?: string | null;
  location?: string | null;
  summary: string;
  reachOutDraft?: string | null;
  postSnippet?: string | null;
  profileUrl?: string | null;
  marginTier?: string | null;
  estimatedAcres?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const { prospectingLeads } = await import("../drizzle/schema");
  await db.insert(prospectingLeads).values({
    source: data.source,
    url: data.url,
    contactName: data.contactName ?? null,
    contactInfo: data.contactInfo ?? null,
    location: data.location ?? null,
    summary: data.summary,
    reachOutDraft: data.reachOutDraft ?? null,
    postSnippet: data.postSnippet ?? null,
    profileUrl: data.profileUrl ?? null,
    marginTier: data.marginTier ?? null,
    estimatedAcres: data.estimatedAcres ?? null,
    status: "new",
  });
}

export async function getPricingBenchmarkCandidates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pricingBenchmarkCandidates).orderBy(pricingBenchmarkCandidates.serviceType);
}

export async function upsertPricingBenchmarkCandidate(data: {
  serviceType: string;
  lowAmount: number;
  midAmount: number;
  highAmount: number;
  unit: "acre" | "linear_foot" | "hour" | "load" | "stump" | "flat";
  region?: string;
  researchSummary: string;
  sourceUrls?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.insert(pricingBenchmarkCandidates).values({
    serviceType: data.serviceType,
    lowAmount: data.lowAmount,
    midAmount: data.midAmount,
    highAmount: data.highAmount,
    unit: data.unit,
    region: data.region ?? 'Middle & West Tennessee',
    researchSummary: data.researchSummary,
    sourceUrls: data.sourceUrls?.length ? JSON.stringify(data.sourceUrls) : null,
    status: 'pending_review',
    reviewedAt: null,
  }).onDuplicateKeyUpdate({
    set: {
      lowAmount: data.lowAmount,
      midAmount: data.midAmount,
      highAmount: data.highAmount,
      unit: data.unit,
      region: data.region ?? 'Middle & West Tennessee',
      researchSummary: data.researchSummary,
      sourceUrls: data.sourceUrls?.length ? JSON.stringify(data.sourceUrls) : null,
      status: 'pending_review',
      reviewedAt: null,
      updatedAt: new Date(),
    },
  });
}

export async function approvePricingBenchmarkCandidate(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  const [candidate] = await db.select().from(pricingBenchmarkCandidates)
    .where(eq(pricingBenchmarkCandidates.id, id)).limit(1);
  if (!candidate || candidate.status !== 'pending_review') throw new Error('Pricing research item is not available for review');
  let sourceUrls: string[] = [];
  try { sourceUrls = candidate.sourceUrls ? JSON.parse(candidate.sourceUrls) : []; } catch { sourceUrls = []; }
  await upsertPricingBenchmark({
    serviceType: candidate.serviceType,
    lowPerAcre: candidate.lowAmount,
    midPerAcre: candidate.midAmount,
    highPerAcre: candidate.highAmount,
    unit: candidate.unit,
    region: candidate.region,
    researchSummary: candidate.researchSummary,
    sourceUrls,
    evidenceStatus: 'owner_approved',
    reviewedAt: new Date(),
  });
  await db.update(pricingBenchmarkCandidates).set({ status: 'approved', reviewedAt: new Date() })
    .where(eq(pricingBenchmarkCandidates.id, id));
}

/** Promote a pending candidate using the owner's saved automatic-approval rule. */
export async function autoApprovePricingBenchmarkCandidate(serviceType: string) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  const [candidate] = await db.select().from(pricingBenchmarkCandidates)
    .where(eq(pricingBenchmarkCandidates.serviceType, serviceType)).limit(1);
  if (!candidate || candidate.status !== 'pending_review') return false;
  await approvePricingBenchmarkCandidate(candidate.id);
  return true;
}

export async function rejectPricingBenchmarkCandidate(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB unavailable');
  await db.update(pricingBenchmarkCandidates).set({ status: 'rejected', reviewedAt: new Date() })
    .where(eq(pricingBenchmarkCandidates.id, id));
}

export async function getProspectingLeads(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const { prospectingLeads } = await import("../drizzle/schema");
  const { desc, eq } = await import("drizzle-orm");
  const rows = status
    ? await db.select().from(prospectingLeads).where(eq(prospectingLeads.status, status)).orderBy(desc(prospectingLeads.createdAt)).limit(100)
    : await db.select().from(prospectingLeads).orderBy(desc(prospectingLeads.createdAt)).limit(100);
  return rows;
}

export async function updateProspectingLeadStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  const { prospectingLeads } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(prospectingLeads).set({ status }).where(eq(prospectingLeads.id, id));
}

export async function deleteProspectingLead(id: number) {
  const db = await getDb();
  if (!db) return;
  const { prospectingLeads } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.delete(prospectingLeads).where(eq(prospectingLeads.id, id));
}

export async function countNewProspectingLeads() {
  const db = await getDb();
  if (!db) return 0;
  const { prospectingLeads } = await import("../drizzle/schema");
  const { eq, count } = await import("drizzle-orm");
  const result = await db.select({ count: count() }).from(prospectingLeads).where(eq(prospectingLeads.status, "new"));
  return result[0]?.count ?? 0;
}

// ─── Native Clients helper ────────────────────────────────────────────────────
/**
 * Upsert a client into native_clients.
 * Matches by email (preferred), then phone, then name.
 * Safe to call fire-and-forget — never throws, just logs on error.
 */
export async function upsertNativeClient(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  source?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { nativeClients } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    let existing: (typeof nativeClients.$inferSelect) | null = null;

    if (data.email) {
      const [row] = await db.select().from(nativeClients).where(eq(nativeClients.email, data.email)).limit(1);
      existing = row ?? null;
    }
    if (!existing && data.phone) {
      const [row] = await db.select().from(nativeClients).where(eq(nativeClients.phone, data.phone)).limit(1);
      existing = row ?? null;
    }
    if (!existing) {
      const [row] = await db.select().from(nativeClients).where(eq(nativeClients.name, data.name)).limit(1);
      existing = row ?? null;
    }

    if (existing) {
      await db.update(nativeClients).set({
        email: data.email || existing.email,
        phone: data.phone || existing.phone,
        address: data.address || existing.address,
        updatedAt: new Date(),
      }).where(eq(nativeClients.id, existing.id));
    } else {
      await db.insert(nativeClients).values({
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        source: data.source ?? "website_quote",
        jobCount: 0,
        totalSpentCents: 0,
      });
    }
  } catch (err) {
    console.warn("[upsertNativeClient] Failed:", err);
  }
}

/**
 * Returns the small contact-only client payload required by Noland Field when
 * starting a new quote. Client notes, job history, and spend information are
 * deliberately excluded from this lookup.
 */
export async function listNativeClientContacts(input: {
  search?: string;
  limit?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];

  const { nativeClients } = await import("../drizzle/schema");
  const { asc, like, or } = await import("drizzle-orm");
  const search = input.search?.trim();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
  const contactFields = {
    id: nativeClients.id,
    name: nativeClients.name,
    email: nativeClients.email,
    phone: nativeClients.phone,
    address: nativeClients.address,
  };

  if (search) {
    const term = `%${search}%`;
    return db
      .select(contactFields)
      .from(nativeClients)
      .where(
        or(
          like(nativeClients.name, term),
          like(nativeClients.email, term),
          like(nativeClients.phone, term),
          like(nativeClients.address, term)
        )
      )
      .orderBy(asc(nativeClients.name))
      .limit(limit);
  }

  return db
    .select(contactFields)
    .from(nativeClients)
    .orderBy(asc(nativeClients.name))
    .limit(limit);
}
