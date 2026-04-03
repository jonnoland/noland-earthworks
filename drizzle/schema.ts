import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Stores Jobber OAuth tokens for the site owner's account.
 * Only one row is expected (the owner's tokens).
 */
export const jobberTokens = mysqlTable("jobber_tokens", {
  id: int("id").autoincrement().primaryKey(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobberToken = typeof jobberTokens.$inferSelect;
export type InsertJobberToken = typeof jobberTokens.$inferInsert;

/**
 * Tracks the marketing/referral source for each lead (Jobber request).
 * One row per lead — upsert on jobberRequestId to update source.
 */
export const leadSourceTags = mysqlTable("lead_source_tags", {
  id: int("id").autoincrement().primaryKey(),
  /** Jobber request ID (string) — links this tag to a specific lead */
  jobberRequestId: varchar("jobberRequestId", { length: 128 }).notNull().unique(),
  /** Client name snapshot for display without re-fetching Jobber */
  clientName: varchar("clientName", { length: 256 }),
  /** Source category */
  source: mysqlEnum("source", [
    "google_search",
    "google_maps",
    "facebook",
    "instagram",
    "word_of_mouth",
    "yard_sign",
    "truck_wrap",
    "website",
    "repeat_customer",
    "angi",
    "nextdoor",
    "other",
  ]).notNull().default("other"),
  /** Optional free-text note */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadSourceTag = typeof leadSourceTags.$inferSelect;
export type InsertLeadSourceTag = typeof leadSourceTags.$inferInsert;