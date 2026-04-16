import { boolean, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

/**
 * Jobs table — land clearing job records
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  client: varchar("client", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  jobType: mysqlEnum("jobType", [
    "land_clearing",
    "forestry_mulching",
    "brush_removal",
    "stump_grinding",
    "wildfire_mitigation",
  ]).default("land_clearing").notNull(),
  status: mysqlEnum("status", [
    "estimate",
    "scheduled",
    "in_progress",
    "completed",
    "invoiced",
    "paid",
  ]).default("estimate").notNull(),
  acres: decimal("acres", { precision: 8, scale: 2 }),
  crewDays: decimal("crewDays", { precision: 8, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  notes: text("notes"),
  scheduledDate: timestamp("scheduledDate"),
  completedDate: timestamp("completedDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Leads table — prospect pipeline
 */
export const opsLeads = mysqlTable("ops_leads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  address: varchar("address", { length: 500 }),
  source: mysqlEnum("source", [
    "google",
    "facebook",
    "referral",
    "website",
    "direct",
    "other",
  ]).default("other").notNull(),
  stage: mysqlEnum("stage", [
    "new",
    "contacted",
    "converted",
    "estimate_sent",
    "negotiating",
    "won",
    "lost",
  ]).default("new").notNull(),
  jobType: varchar("jobType", { length: 100 }),
  estimatedValue: decimal("estimatedValue", { precision: 10, scale: 2 }),
  notes: text("notes"),
  /** Requested site visit date/time from the calculator confirmation overlay */
  requestedVisitAt: timestamp("requestedVisitAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OpsLead = typeof opsLeads.$inferSelect;
export type InsertOpsLead = typeof opsLeads.$inferInsert;

/**
 * Schedule entries — crew calendar
 */
export const scheduleEntries = mysqlTable("schedule_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobId: int("jobId"),
  title: varchar("title", { length: 255 }).notNull(),
  crewName: varchar("crewName", { length: 100 }).notNull(),
  date: timestamp("date").notNull(),
  startHour: int("startHour").default(7).notNull(),
  endHour: int("endHour").default(17).notNull(),
  color: varchar("color", { length: 20 }).default("orange"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleEntry = typeof scheduleEntries.$inferSelect;
export type InsertScheduleEntry = typeof scheduleEntries.$inferInsert;

/**
 * Quote submissions log — every quote form submission is recorded here.
 * Captures the full submission payload plus Jobber sync outcome.
 */
export const quoteSubmissions = mysqlTable("quote_submissions", {
  id: int("id").autoincrement().primaryKey(),
  /** Contact info */
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  /** Project details */
  service: varchar("service", { length: 100 }).notNull(),
  county: varchar("county", { length: 100 }).notNull(),
  acreage: varchar("acreage", { length: 50 }),
  street: varchar("street", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  message: text("message"),
  /** Jobber sync outcome */
  jobberStatus: mysqlEnum("jobberStatus", ["synced", "failed", "skipped"]).notNull().default("skipped"),
  jobberRequestId: varchar("jobberRequestId", { length: 256 }),
  jobberRequestUrl: varchar("jobberRequestUrl", { length: 512 }),
  jobberError: text("jobberError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuoteSubmission = typeof quoteSubmissions.$inferSelect;
export type InsertQuoteSubmission = typeof quoteSubmissions.$inferInsert;

/**
 * Crews — field crews with daily rate and cost tracking.
 * Mirrors the OwnrOps Crews page concept.
 */
export const crews = mysqlTable("crews", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  equipmentType: varchar("equipmentType", { length: 100 }).notNull().default("Mulcher"),
  /** Day Rate = target revenue per day (what you charge) — kept for backward compat, derived from pricing calc */
  dayRate: int("dayRate").notNull().default(0),
  /** Cost Per Day = total daily cost — kept for backward compat, derived from pricing calc */
  costPerDay: int("costPerDay").notNull().default(0),

  // ── Labor ──────────────────────────────────────────────────────────────────
  hoursPerDay: int("hoursPerDay").notNull().default(9),
  crewMemberCount: int("crewMemberCount").notNull().default(1),
  /** Wage in cents per hour */
  memberWageCents: int("memberWageCents").notNull().default(5000),
  /** Burden/payroll tax percent (0-100) */
  burdenPct: int("burdenPct").notNull().default(0),

  // ── Equipment (JSON array: [{name: string, monthlyCostCents: number}]) ─────
  equipmentItems: text("equipmentItems").notNull().default("[]"),

  // ── Fuel ───────────────────────────────────────────────────────────────────
  machineBurnRateGph: int("machineBurnRateGph").notNull().default(7),
  /** Fuel price in cents per gallon */
  fuelPriceCents: int("fuelPriceCents").notNull().default(499),
  /** Truck fuel cost per day in cents */
  truckFuelPerDayCents: int("truckFuelPerDayCents").notNull().default(5000),

  // ── Wear & Consumables ─────────────────────────────────────────────────────
  /** Teeth/cutting tool cost per set in cents */
  teethCostPerSetCents: int("teethCostPerSetCents").notNull().default(220000),
  /** Working days per set of teeth */
  daysPerSet: int("daysPerSet").notNull().default(10),
  /** Annual major wear cost in cents */
  annualMajorWearCents: int("annualMajorWearCents").notNull().default(2640000),
  /** Misc consumables per day in cents */
  miscConsumablesPerDayCents: int("miscConsumablesPerDayCents").notNull().default(10000),

  // ── Monthly Overhead (JSON array: [{name: string, monthlyCostCents: number}]) ─
  overheadItems: text("overheadItems").notNull().default("[]"),

  // ── Scheduling / Margin ────────────────────────────────────────────────────
  workingDaysPerMonth: int("workingDaysPerMonth").notNull().default(25),
  /** Target profit margin percent (0-100) */
  targetMarginPct: int("targetMarginPct").notNull().default(35),
  acresPerDay: int("acresPerDay").notNull().default(1),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Crew = typeof crews.$inferSelect;
export type InsertCrew = typeof crews.$inferInsert;

/**
 * Crew members — individual people assigned to a crew.
 * clockedIn tracks whether they are currently on the clock.
 */
export const crewMembers = mysqlTable("crew_members", {
  id: int("id").autoincrement().primaryKey(),
  crewId: int("crewId").notNull().references(() => crews.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).default("Operator"),
  clockedIn: boolean("clockedIn").notNull().default(false),
  clockedInAt: timestamp("clockedInAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CrewMember = typeof crewMembers.$inferSelect;
export type InsertCrewMember = typeof crewMembers.$inferInsert;

/**
 * Conversations — SMS/messaging threads with clients.
 * Each conversation is linked to a contact (phone number).
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 30 }).notNull(),
  lastMessage: text("lastMessage"),
  lastMessageAt: timestamp("lastMessageAt"),
  unread: boolean("unread").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages — individual SMS messages within a conversation.
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  body: text("body").notNull(),
  twilioSid: varchar("twilioSid", { length: 64 }),
  status: varchar("status", { length: 32 }).default("sent"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Reviews — customer reviews from Google or other sources.
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  source: mysqlEnum("source", ["google", "facebook", "yelp", "other"]).notNull().default("google"),
  reviewerName: varchar("reviewerName", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  body: text("body"),
  response: text("response"),
  respondedAt: timestamp("respondedAt"),
  reviewedAt: timestamp("reviewedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Time entries — crew member clock-in/out records for timesheet approval.
 */
export const timeEntries = mysqlTable("time_entries", {
  id: int("id").autoincrement().primaryKey(),
  crewMemberId: int("crewMemberId").notNull().references(() => crewMembers.id, { onDelete: "cascade" }),
  crewId: int("crewId").notNull().references(() => crews.id, { onDelete: "cascade" }),
  clockIn: timestamp("clockIn").notNull(),
  clockOut: timestamp("clockOut"),
  durationMinutes: int("durationMinutes"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

/**
 * Distance quotes — formal quotes saved from the Distance Pricing Adjustment tool.
 * Captures all pricing inputs, the calculated route, and the adjusted rate.
 */
export const distanceQuotes = mysqlTable("distance_quotes", {
  id: int("id").autoincrement().primaryKey(),
  /** Client info */
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientPhone: varchar("clientPhone", { length: 50 }),
  clientEmail: varchar("clientEmail", { length: 320 }),
  /** Job details */
  jobType: varchar("jobType", { length: 100 }).notNull(),
  jobAddress: text("jobAddress").notNull(),
  jobAcres: int("jobAcres").notNull().default(0),
  crewDaysNeeded: int("crewDaysNeeded").notNull().default(1),
  notes: text("notes"),
  /** Distance calculation */
  distanceMiles: int("distanceMiles").notNull().default(0),
  driveDuration: varchar("driveDuration", { length: 100 }),
  /** Pricing snapshot (cents to avoid float issues) */
  baseDayRateCents: int("baseDayRateCents").notNull().default(0),
  mobSurchargeCents: int("mobSurchargeCents").notNull().default(0),
  adjustedDayRateCents: int("adjustedDayRateCents").notNull().default(0),
  adjustedJobTotalCents: int("adjustedJobTotalCents").notNull().default(0),
  pricePerAcreCents: int("pricePerAcreCents").notNull().default(0),
  targetMarginPct: int("targetMarginPct").notNull().default(30),
  /** Status */
  status: mysqlEnum("status", ["draft", "sent", "accepted", "declined", "expired"]).notNull().default("draft"),
  /** Timestamps */
  sentAt: timestamp("sentAt"),
  emailedAt: timestamp("emailedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DistanceQuote = typeof distanceQuotes.$inferSelect;
export type InsertDistanceQuote = typeof distanceQuotes.$inferInsert;

// ─── Business Settings ────────────────────────────────────────────────────────
export const businessSettings = mysqlTable("business_settings", {
  id: int("id").primaryKey().autoincrement(),
  companyName: varchar("companyName", { length: 200 }).notNull().default("Noland Earthworks, LLC"),
  phone: varchar("phone", { length: 30 }).default("(615) 406-4819"),
  email: varchar("email", { length: 200 }).default("jonnoland@nolandearthworks.com"),
  address: varchar("address", { length: 300 }).default("93 Halliburton Road"),
  city: varchar("city", { length: 100 }).default("Vanleer"),
  state: varchar("state", { length: 50 }).default("Tennessee"),
  zip: varchar("zip", { length: 20 }).default("37181"),
  website: varchar("website", { length: 300 }).default("https://www.nolandearthworks.com"),
  googleReviewUrl: varchar("googleReviewUrl", { length: 500 }).default("https://g.page/r/CcglMAMbtQInEAI/review"),
  defaultTaxRate: varchar("defaultTaxRate", { length: 10 }).default("0"),
  brandColor: varchar("brandColor", { length: 20 }).default("#f97316"),
  licenseNumbers: text("licenseNumbers"),
  logoLight: varchar("logoLight", { length: 500 }),
  logoDark: varchar("logoDark", { length: 500 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BusinessSettings = typeof businessSettings.$inferSelect;

// ─── Automation Settings ──────────────────────────────────────────────────────
export const automationSettings = mysqlTable("automation_settings", {
  id: int("id").primaryKey().autoincrement(),
  automationsEnabled: boolean("automationsEnabled").notNull().default(false),
  newLeadMaxMinutes: int("newLeadMaxMinutes").notNull().default(10080),
  contactedMaxDays: int("contactedMaxDays").notNull().default(14),
  siteVisitMaxDays: int("siteVisitMaxDays").notNull().default(7),
  quoteSentMaxDays: int("quoteSentMaxDays").notNull().default(14),
  followUpMaxDays: int("followUpMaxDays").notNull().default(30),
  coldNurtureMaxDays: int("coldNurtureMaxDays").notNull().default(90),
  followUpIntervalDays: int("followUpIntervalDays").notNull().default(60),
  maxTouchesBeforeClose: int("maxTouchesBeforeClose").notNull().default(6),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AutomationSettings = typeof automationSettings.$inferSelect;

// ─── Service Catalog ──────────────────────────────────────────────────────────
export const serviceCatalog = mysqlTable("service_catalog", {
  id: int("id").primaryKey().autoincrement(),
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  easyAcresPerDay: decimal("easyAcresPerDay", { precision: 5, scale: 2 }).notNull().default("2.00"),
  normalAcresPerDay: decimal("normalAcresPerDay", { precision: 5, scale: 2 }).notNull().default("1.50"),
  hardAcresPerDay: decimal("hardAcresPerDay", { precision: 5, scale: 2 }).notNull().default("0.75"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ServiceCatalogItem = typeof serviceCatalog.$inferSelect;

// ─── Message Templates ────────────────────────────────────────────────────────
export const messageTemplates = mysqlTable("message_templates", {
  id: int("id").primaryKey().autoincrement(),
  category: varchar("category", { length: 50 }).notNull(), // quotes, invoices, reminders, follow_up, thank_you
  channel: varchar("channel", { length: 10 }).notNull(),   // email | sms
  subject: varchar("subject", { length: 300 }),
  body: text("body"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MessageTemplate = typeof messageTemplates.$inferSelect;

// ─── Reminder Rules ───────────────────────────────────────────────────────────
export const reminderRules = mysqlTable("reminder_rules", {
  id: int("id").primaryKey().autoincrement(),
  ruleType: varchar("ruleType", { length: 20 }).notNull(), // invoice | visit
  offsetDays: int("offsetDays").notNull().default(1),       // negative = before, positive = after
  channel: varchar("channel", { length: 10 }).notNull().default("sms"), // email | sms | both
  templateId: int("templateId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReminderRule = typeof reminderRules.$inferSelect;

// ─── Lead Notes / Activity Log ────────────────────────────────────────────────
export const leadNotes = mysqlTable("lead_notes", {
  id: int("id").primaryKey().autoincrement(),
  leadId: int("leadId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["note", "call", "text", "email", "stage_change", "system"]).default("note").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;
