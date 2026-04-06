import { and, desc, eq } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import {
  InsertJob, InsertOpsLead, InsertScheduleEntry, InsertUser,
  jobs, opsLeads, scheduleEntries, users
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
      updateSet.role = user.role;
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
  return db.delete(jobs).where(and(eq(jobs.id, id), eq(jobs.userId, userId)));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getOpsLeads(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(opsLeads).where(eq(opsLeads.userId, userId)).orderBy(desc(opsLeads.createdAt));
}
export async function createOpsLead(data: InsertOpsLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(opsLeads).values(data);
}
export async function updateOpsLead(id: number, userId: number, data: Partial<InsertOpsLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(opsLeads).set({ ...data, updatedAt: new Date() }).where(and(eq(opsLeads.id, id), eq(opsLeads.userId, userId)));
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
