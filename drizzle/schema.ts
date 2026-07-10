import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  /** Stripe Customer ID — set on first payment session creation */
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
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
    "vegetation_management",
    "right_of_way_clearing",
    "trail_cutting",
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
    "archived",
  ]).default("estimate").notNull(),
  acres: decimal("acres", { precision: 8, scale: 2 }),
  crewDays: decimal("crewDays", { precision: 8, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),
  notes: text("notes"),
  /** Client email — used for review request emails */
  clientEmail: varchar("clientEmail", { length: 320 }),
  scheduledDate: timestamp("scheduledDate"),
  scheduledEndDate: timestamp("scheduledEndDate"),
  completedDate: timestamp("completedDate"),
  /** Timestamp when the job was marked as paid */
  paidDate: timestamp("paidDate"),
  /** Timestamp when a review request email was sent for this job */
  reviewRequestSentAt: timestamp("reviewRequestSentAt"),
  /** FK to ops_leads — explicit link used by review request agent instead of name-string match */
  leadId: int("leadId"),
  /** Set when a job is rescheduled — used to show rescheduled badge on dashboard */
  rescheduledAt: timestamp("rescheduledAt"),
  /** High-priority flag — shown with a flag icon on dashboard and schedule calendar */
  isHighPriority: boolean("isHighPriority").default(false).notNull(),
  /** FK to crews — the crew assigned to this job (nullable) */
  crewId: int("crewId"),
  /** Jobber job ID — set when this local record was created by marking a Jobber job complete */
  jobberJobId: varchar("jobberJobId", { length: 120 }),
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
    "field_app",
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
  /** Timestamp when Jon manually confirmed the site visit — triggers confirmation email */
  visitConfirmedAt: timestamp("visitConfirmedAt"),
  /** Number of automated follow-up emails sent — capped at 2 to prevent deliverability damage */
  followupCount: int("followupCount").notNull().default(0),
  /** AI lead qualification */
  aiScore: mysqlEnum("aiScore", ["strong", "marginal", "weak"]),
  aiSummary: text("aiSummary"),
  aiFlags: text("aiFlags"),        // JSON array of flag strings
  aiDraftResponse: text("aiDraftResponse"),
  /** Facebook leadgen_id — stored for deduplication; prevents duplicate leads from FB webhook retries */
  leadgenId: varchar("leadgenId", { length: 128 }),
  /** FK to chat_sessions — set when lead is created from the AI chat widget */
  chatSessionId: int("chatSessionId"),
  /** Jobber quote ID — set when a Jobber quote is created from this lead */
  jobberQuoteId: varchar("jobberQuoteId", { length: 120 }),
  /** Jobber quote number (human-readable) — set when a Jobber quote is created from this lead */
  jobberQuoteNumber: int("jobberQuoteNumber"),
  /** Estimate amount from the linked Jobber quote — stored for display on the lead */
  estimateAmount: decimal("estimateAmount", { precision: 10, scale: 2 }),
  /** Saved AI quote estimate — JSON blob with service, estimateLow, estimateHigh, reasoning, etc. */
  aiQuoteData: text("aiQuoteData"),
  /** Timestamp when the AI quote was last saved to this lead */
  aiQuoteSavedAt: timestamp("aiQuoteSavedAt"),
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
  addOns: text("addOns"),  // JSON array of selected add-on service names
  /** Parcel data from TN statewide parcel API */
  parcelOwner: varchar("parcelOwner", { length: 255 }),
  parcelId: varchar("parcelId", { length: 100 }),
  deedAcres: decimal("deedAcres", { precision: 10, scale: 2 }),
  /** User-adjusted acreage (partial-property jobs) — overrides deedAcres for estimate */
  adjustedAcres: decimal("adjustedAcres", { precision: 10, scale: 2 }),
  /** Preliminary price range shown on form (e.g. "$3,200 – $4,500") */
  estimatedRange: varchar("estimatedRange", { length: 100 }),
  /** AI lead qualification */
  aiScore: mysqlEnum("aiScore", ["strong", "marginal", "weak"]),
  aiSummary: text("aiSummary"),
  aiFlags: text("aiFlags"),        // JSON array of flag strings
  aiDraftResponse: text("aiDraftResponse"),
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

  /** Whether this crew is currently active (shown in dropdowns and schedule) */
  isActive: boolean("isActive").notNull().default(true),
  /** Display color for the crew (hex or tailwind color token) */
  color: varchar("color", { length: 50 }).notNull().default(""),

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
  /** External review ID from the source platform (e.g. Google review name like "accounts/123/locations/456/reviews/abc") */
  externalId: varchar("externalId", { length: 512 }),
  reviewerName: varchar("reviewerName", { length: 255 }).notNull(),
  reviewerPhotoUrl: varchar("reviewerPhotoUrl", { length: 1024 }),
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
  /** Promotional banner — shown as a site-wide bar above the navbar on the public homepage */
  promoBannerEnabled: boolean("promoBannerEnabled").notNull().default(false),
  promoBannerText: varchar("promoBannerText", { length: 300 }).default(""),
  /** Accent color for the banner: 'orange' | 'green' | 'blue' | 'red' */
  promoBannerColor: varchar("promoBannerColor", { length: 20 }).default("orange"),
  /** Zapier / webhook API key — auto-generated on first use, used to authenticate POST /api/webhooks/leads */
  webhookApiKey: varchar("webhookApiKey", { length: 64 }),
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

// ─── Visit Blackout Dates ─────────────────────────────────────────────────────
/** Dates on which Jon is unavailable for site visits (managed from /ops/settings). */
export const visitBlackoutDates = mysqlTable("visit_blackout_dates", {
  id: int("id").primaryKey().autoincrement(),
  /** ISO date string YYYY-MM-DD */
  date: varchar("date", { length: 10 }).notNull().unique(),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VisitBlackoutDate = typeof visitBlackoutDates.$inferSelect;
export type InsertVisitBlackoutDate = typeof visitBlackoutDates.$inferInsert;

// ─── Recurring Blackout Days ──────────────────────────────────────────────────
/** Days of the week that are always unavailable for site visits (0=Sun, 6=Sat). */
export const recurringBlackoutDays = mysqlTable("recurring_blackout_days", {
  id: int("id").primaryKey().autoincrement(),
  /** 0=Sunday, 1=Monday, …, 6=Saturday */
  dayOfWeek: int("dayOfWeek").notNull().unique(),
  /** Optional label, e.g. "Weekend" */
  label: varchar("label", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecurringBlackoutDay = typeof recurringBlackoutDays.$inferSelect;
export type InsertRecurringBlackoutDay = typeof recurringBlackoutDays.$inferInsert;

// ─── Owner Tasks ─────────────────────────────────────────────────────────────
/** Reminder tasks for Jon — auto-created by agents or manually. */
export const ownerTasks = mysqlTable("owner_tasks", {
  id: int("id").primaryKey().autoincrement(),
  /** Short title shown in the task list */
  title: varchar("title", { length: 255 }).notNull(),
  /** Optional longer description */
  description: text("description"),
  /** Related entity type, e.g. "job", "lead" */
  relatedType: varchar("relatedType", { length: 50 }),
  /** Related entity ID */
  relatedId: int("relatedId"),
  /** UTC timestamp when the task is due */
  dueAt: timestamp("dueAt").notNull(),
  /** Whether the task has been completed */
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OwnerTask = typeof ownerTasks.$inferSelect;
export type InsertOwnerTask = typeof ownerTasks.$inferInsert;

// ─── Agent Config ─────────────────────────────────────────────────────────────
/** Per-agent enable/disable toggle. One row per agentId, seeded on first run. */
export const agentConfig = mysqlTable("agent_config", {
  id: int("id").primaryKey().autoincrement(),
  /** Unique machine-readable identifier, e.g. "lead_followup" */
  agentId: varchar("agentId", { length: 80 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  /** JSON blob for agent-specific settings */
  config: text("config"),
  /** Custom SMS message template — supports {name} {stage} {days} {phone} tokens */
  smsTemplate: text("smsTemplate"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgentConfig = typeof agentConfig.$inferSelect;
export type InsertAgentConfig = typeof agentConfig.$inferInsert;

// ─── Employee Registrations ──────────────────────────────────────────────────
/**
 * Pending employee registrations — submitted from /ops/register.
 * Owner reviews and approves or denies from /ops/team.
 */
export const employeeRegistrations = mysqlTable("employee_registrations", {
  id: int("id").primaryKey().autoincrement(),
  /** Full name entered by the employee */
  name: varchar("name", { length: 255 }).notNull(),
  /** Email address */
  email: varchar("email", { length: 320 }).notNull(),
  /** Phone number */
  phone: varchar("phone", { length: 50 }),
  /** The access level the employee is requesting */
  requestedRole: mysqlEnum("requestedRole", [
    "field_crew",      // View schedule + jobs only
    "office",          // View jobs, invoices, quotes
    "supervisor",      // Full ops view except settings
  ]).notNull().default("field_crew"),
  /** What they plan to do — optional note from the employee */
  message: text("message"),
  /** Approval status */
  status: mysqlEnum("status", ["pending", "approved", "denied"]).notNull().default("pending"),
  /** Owner note on approval or denial */
  ownerNote: text("ownerNote"),
  /** If approved, the users.id of the created/linked account */
  linkedUserId: int("linkedUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmployeeRegistration = typeof employeeRegistrations.$inferSelect;
export type InsertEmployeeRegistration = typeof employeeRegistrations.$inferInsert;

// ─── Agent Run Log ────────────────────────────────────────────────────────────
/** Immutable record of every agent execution for the Agents dashboard. */
export const agentLog = mysqlTable("agent_log", {
  id: int("id").primaryKey().autoincrement(),
  agentId: varchar("agentId", { length: 80 }).notNull(),
  /** "success" | "error" | "skipped" */
  status: varchar("status", { length: 20 }).notNull().default("success"),
  /** Human-readable summary of what the agent did */
  summary: text("summary"),
  /** Number of records acted on */
  actionsCount: int("actionsCount").notNull().default(0),
  /** Full error message if status = "error" */
  error: text("error"),
  ranAt: timestamp("ranAt").defaultNow().notNull(),
});
export type AgentLog = typeof agentLog.$inferSelect;
export type InsertAgentLog = typeof agentLog.$inferInsert;

// ─── Pricing Benchmarks (updated by weekly agent) ───────────────────────────────
/**
 * Market rate benchmarks for each service type — updated weekly by the pricing agent.
 * One row per service type; upserted on serviceType.
 */
export const pricingBenchmarks = mysqlTable("pricing_benchmarks", {
  id: int("id").primaryKey().autoincrement(),
  /** Service type key — matches the label shown on /ops/pricing */
  serviceType: varchar("serviceType", { length: 100 }).notNull().unique(),
  /** Low end of market range (per acre) */
  lowPerAcre: int("lowPerAcre").notNull().default(0),
  /** Mid / market rate (per acre) */
  midPerAcre: int("midPerAcre").notNull().default(0),
  /** High / premium end (per acre) */
  highPerAcre: int("highPerAcre").notNull().default(0),
  /** Region researched */
  region: varchar("region", { length: 200 }).notNull().default("Middle & West Tennessee"),
  /** Brief summary of sources / reasoning from the LLM */
  researchSummary: text("researchSummary"),
  /** ISO timestamp of when this row was last updated by the agent */
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().notNull(),
});
export type PricingBenchmark = typeof pricingBenchmarks.$inferSelect;
export type InsertPricingBenchmark = typeof pricingBenchmarks.$inferInsert;

// ─── Job Notes (manual history timeline entries) ──────────────────────────────
/** Manual notes attached to a Jobber job ID — shown in the History tab timeline. */
export const jobNotes = mysqlTable("job_notes", {
  id: int("id").primaryKey().autoincrement(),
  /** Jobber job ID (encoded) */
  jobId: varchar("jobId", { length: 120 }).notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JobNote = typeof jobNotes.$inferSelect;
export type InsertJobNote = typeof jobNotes.$inferInsert;

// ─── Quote Follow-Up Flags ────────────────────────────────────────────────────
/**
 * Local follow-up flags for Jobber quotes.
 * One row per quote — created automatically when a quote is marked as Approved.
 * Jon can clear the flag once he has followed up with the client.
 */
export const quoteFollowUps = mysqlTable("quote_follow_ups", {
  id: int("id").primaryKey().autoincrement(),
  /** Jobber quote ID (encoded) */
  jobberQuoteId: varchar("jobberQuoteId", { length: 120 }).notNull().unique(),
  /** Human-readable quote number for display */
  quoteNumber: int("quoteNumber"),
  /** Snapshot of the quote title at time of flagging */
  quoteTitle: varchar("quoteTitle", { length: 255 }),
  /** Snapshot of the client name at time of flagging */
  clientName: varchar("clientName", { length: 255 }),
  /** Jobber job ID created from this quote (encoded) */
  jobberJobId: varchar("jobberJobId", { length: 120 }),
  /** Jobber job number (human-readable) */
  jobberJobNumber: int("jobberJobNumber"),
  /** Whether the follow-up has been cleared by Jon */
  cleared: boolean("cleared").notNull().default(false),
  clearedAt: timestamp("clearedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuoteFollowUp = typeof quoteFollowUps.$inferSelect;
export type InsertQuoteFollowUp = typeof quoteFollowUps.$inferInsert;

// ─── Google Business Profile OAuth Tokens ────────────────────────────────────
/**
 * Stores the Google OAuth tokens for the Google Business Profile integration.
 * Only one row is expected (the owner's token). Upsert on id=1.
 */
export const googleOAuthTokens = mysqlTable("google_oauth_tokens", {
  id: int("id").primaryKey().autoincrement(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt").notNull(),
  scope: varchar("scope", { length: 500 }),
  /** Google Business Profile location name (e.g. "accounts/123/locations/456") */
  locationName: varchar("locationName", { length: 255 }),
  /** Human-readable business name from the profile */
  businessName: varchar("businessName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GoogleOAuthToken = typeof googleOAuthTokens.$inferSelect;
export type InsertGoogleOAuthToken = typeof googleOAuthTokens.$inferInsert;

// ─── AI Pricing Model Settings ───────────────────────────────────────────────
/**
 * Stores the adjustable parameters used by the AI Quote Analyzer.
 * Only one row is expected (id=1). Upsert on id=1.
 */
export const aiPricingSettings = mysqlTable("ai_pricing_settings", {
  id: int("id").primaryKey().autoincrement(),
  /** Base rate per acre for forestry mulching (USD) */
  forestryMulchingBaseRate: int("forestryMulchingBaseRate").notNull().default(2000),
  /** Base rate per acre for land clearing (USD) */
  landClearingBaseRate: int("landClearingBaseRate").notNull().default(2200),
  /** Base rate per acre for brush hogging (USD) */
  brushHoggingBaseRate: int("brushHoggingBaseRate").notNull().default(175),
  /** Base rate per effective acre for right-of-way clearing (USD). */
  rowClearingBaseRate: int("rowClearingBaseRate").notNull().default(2400),
  /** Base rate per effective acre for trail cutting (USD). */
  trailCuttingBaseRate: int("trailCuttingBaseRate").notNull().default(2600),
  /** Base rate per acre for vegetation management (USD). */
  vegetationMgmtBaseRate: int("vegetationMgmtBaseRate").notNull().default(1800),
  /** Flat mobilization fee added to every job (USD) */
  mobilizationFee: int("mobilizationFee").notNull().default(450),
  /** Minimum job total (USD) — quotes below this are floored */
  minimumJobTotal: int("minimumJobTotal").notNull().default(1200),
  /** Density multiplier for moderate vegetation (decimal stored as string, e.g. "1.25") */
  densityModerateMultiplier: varchar("densityModerateMultiplier", { length: 10 }).notNull().default("1.25"),
  /** Density multiplier for heavy vegetation */
  densityHeavyMultiplier: varchar("densityHeavyMultiplier", { length: 10 }).notNull().default("1.60"),
  /** Terrain multiplier for rolling terrain */
  terrainRollingMultiplier: varchar("terrainRollingMultiplier", { length: 10 }).notNull().default("1.15"),
  /** Terrain multiplier for steep terrain */
  terrainSteepMultiplier: varchar("terrainSteepMultiplier", { length: 10 }).notNull().default("1.40"),
  /** Access multiplier for moderate access difficulty */
  accessModerateMultiplier: varchar("accessModerateMultiplier", { length: 10 }).notNull().default("1.10"),
  /** Access multiplier for difficult access */
  accessDifficultMultiplier: varchar("accessDifficultMultiplier", { length: 10 }).notNull().default("1.25"),
  /** Price range spread as a decimal string (e.g. "0.15" = ±15% around midpoint) */
  priceRangeSpread: varchar("priceRangeSpread", { length: 10 }).notNull().default("0.15"),
  /** Mobilization fee override for West TN jobs (longer drive). Null = use mobilizationFee for all. */
  westTnMobilizationFee: int("westTnMobilizationFee"),

  // ── Add-on rates ────────────────────────────────────────────────────────────
  /** Stump grinding rate per stump (USD). Used when stump grinding is selected as an add-on. */
  stumpGrindingPerStump: int("stumpGrindingPerStump").notNull().default(200),
  /** Debris hauling rate per load (USD). Used when debris hauling/removal is selected as an add-on. */
  debrisHaulingPerLoad: int("debrisHaulingPerLoad").notNull().default(450),
  /** Post-clear seeding rate per acre (USD). Erosion control / ground cover seeding after clearing. Middle & West TN market: $150–$350/acre. */
  postClearSeedingPerAcre: int("postClearSeedingPerAcre").notNull().default(225),
  /** Fence line clearing rate per linear foot (USD). Reclaiming overgrown fence lines. Middle & West TN market: $3–$6/LF. */
  fenceLineClearingPerLf: int("fenceLineClearingPerLf").notNull().default(4),
  /** Mulch redistribution rate per acre (USD). Uniform mulch finish after forestry mulching. Middle & West TN market: $100–$250/acre. */
  mulchRedistributionPerAcre: int("mulchRedistributionPerAcre").notNull().default(175),
  /** Selective clearing flat rate (USD). Pre-job walkthrough + marking trees for preservation. Middle & West TN market: $150–$300 flat. */
  selectiveClearingFlatRate: int("selectiveClearingFlatRate").notNull().default(200),

  // ── Volume discounts ────────────────────────────────────────────────────────
  /** Volume discount % applied to jobs 3–5 acres (integer, e.g. 3 = 3%). 0 = disabled. */
  volumeDiscount3to5Pct: int("volumeDiscount3to5Pct").notNull().default(3),
  /** Volume discount % applied to jobs 5–10 acres. 0 = disabled. */
  volumeDiscount5to10Pct: int("volumeDiscount5to10Pct").notNull().default(7),
  /** Volume discount % applied to jobs 10+ acres. 0 = disabled. */
  volumeDiscount10plusPct: int("volumeDiscount10plusPct").notNull().default(10),

  // ── Production rates (acres per day) ────────────────────────────────────────
  /** Acres per day for forestry mulching (tracked mulcher, moderate conditions) */
  apdForestryMulching: varchar("apdForestryMulching", { length: 10 }).notNull().default("1.5"),
  /** Acres per day for land clearing */
  apdLandClearing: varchar("apdLandClearing", { length: 10 }).notNull().default("1.2"),
  /** Acres per day for right-of-way clearing (effective acreage) */
  apdRowClearing: varchar("apdRowClearing", { length: 10 }).notNull().default("1.2"),
  /** Acres per day for trail cutting (slower due to linear constraint) */
  apdTrailCutting: varchar("apdTrailCutting", { length: 10 }).notNull().default("1.0"),
  /** Acres per day for vegetation management */
  apdVegetationMgmt: varchar("apdVegetationMgmt", { length: 10 }).notNull().default("2.0"),
  /** Acres per day for brush hogging */
  apdBrushHogging: varchar("apdBrushHogging", { length: 10 }).notNull().default("8.0"),

  // ── Seasonal adjustment ─────────────────────────────────────────────────────
  /** Seasonal uplift % for peak season (Oct–Mar). 0 = no adjustment. e.g. 10 = +10% */
  seasonalPeakUpliftPct: int("seasonalPeakUpliftPct").notNull().default(0),
  /** Seasonal reduction % for slow season (Jul–Sep). 0 = no adjustment. e.g. 5 = -5% */
  seasonalSlowReductionPct: int("seasonalSlowReductionPct").notNull().default(0),

  // ── Complexity premium ──────────────────────────────────────────────────────
  /** Complexity premium % added when structures, fencing, or utilities are flagged. e.g. 15 = +15% */
  complexityPremiumPct: int("complexityPremiumPct").notNull().default(15),

  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AIPricingSettings = typeof aiPricingSettings.$inferSelect;
export type InsertAIPricingSettings = typeof aiPricingSettings.$inferInsert;

/**
 * Stores AI-analyzed quote drafts so Jon can save and return to them later.
 * Each draft is linked to a quote submission and stores the full AI analysis result.
 */
export const quoteDrafts = mysqlTable("quote_drafts", {
  id: int("id").autoincrement().primaryKey(),
  /** ID of the original quote submission from quoteSubmissions table */
  submissionId: int("submissionId").notNull(),
  /** Customer name from the submission */
  customerName: varchar("customerName", { length: 255 }),
  /** Customer email from the submission */
  customerEmail: varchar("customerEmail", { length: 320 }),
  /** Service type from the submission */
  service: varchar("service", { length: 100 }),
  /** County from the submission */
  county: varchar("county", { length: 100 }),
  /** Acreage range from the submission */
  acreage: varchar("acreage", { length: 50 }),
  /** Full AI analysis result stored as JSON string */
  aiResult: text("aiResult").notNull(),
  /** Draft status: 'saved' | 'sent' | 'archived' */
  status: mysqlEnum("status", ["saved", "sent", "archived"]).default("saved").notNull(),
  /** Optional notes Jon adds to the draft */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QuoteDraft = typeof quoteDrafts.$inferSelect;
export type InsertQuoteDraft = typeof quoteDrafts.$inferInsert;

// ─── Pending Notifications (retry queue) ─────────────────────────────────────
/**
 * Outbox for failed email/SMS notifications — retried every 30 minutes.
 * Rows are deleted on successful delivery.
 */
export const pendingNotifications = mysqlTable("pending_notifications", {
  id: int("id").primaryKey().autoincrement(),
  /** Channel: 'email' | 'sms' */
  channel: mysqlEnum("channel", ["email", "sms"]).notNull(),
  /** Recipient address (email) or phone number (sms) */
  recipient: varchar("recipient", { length: 320 }).notNull(),
  /** Subject line (email only) */
  subject: varchar("subject", { length: 500 }),
  /** Message body — HTML for email, plain text for SMS */
  body: text("body").notNull(),
  /** Number of delivery attempts made so far */
  retryCount: int("retryCount").notNull().default(0),
  /** Timestamp of last attempt */
  lastAttemptAt: timestamp("lastAttemptAt"),
  /** Error from last attempt */
  lastError: text("lastError"),
  /** Context tag for debugging (e.g. 'lead_followup', 'review_request') */
  context: varchar("context", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PendingNotification = typeof pendingNotifications.$inferSelect;
export type InsertPendingNotification = typeof pendingNotifications.$inferInsert;

/**
 * Chat sessions — public AI chat widget sessions on the marketing site.
 */
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull().unique(),
  visitorName: varchar("visitorName", { length: 255 }),
  visitorEmail: varchar("visitorEmail", { length: 320 }),
  visitorPhone: varchar("visitorPhone", { length: 50 }),
  leadCreated: boolean("leadCreated").notNull().default(false),
  /** Timestamp when the owner last viewed this session — null means unread */
  viewedAt: timestamp("viewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * Chat messages — individual messages within a public chat session.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Job cost estimates — internal AI-generated cost breakdowns for ops use.
 */
export const jobCostEstimates = mysqlTable("job_cost_estimates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Optional link to a lead or quote */
  leadId: int("leadId"),
  /** Input parameters */
  service: varchar("service", { length: 100 }).notNull(),
  acreage: decimal("acreage", { precision: 8, scale: 2 }),
  terrain: varchar("terrain", { length: 100 }),
  vegetationDensity: varchar("vegetationDensity", { length: 100 }),
  accessDifficulty: varchar("accessDifficulty", { length: 100 }),
  mobilizationMiles: int("mobilizationMiles"),
  notes: text("notes"),
  /** AI-generated outputs */
  estimatedHours: decimal("estimatedHours", { precision: 8, scale: 2 }),
  estimatedDays: decimal("estimatedDays", { precision: 8, scale: 2 }),
  fuelCost: decimal("fuelCost", { precision: 10, scale: 2 }),
  mobilizationCost: decimal("mobilizationCost", { precision: 10, scale: 2 }),
  laborCost: decimal("laborCost", { precision: 10, scale: 2 }),
  equipmentCost: decimal("equipmentCost", { precision: 10, scale: 2 }),
  totalInternalCost: decimal("totalInternalCost", { precision: 10, scale: 2 }),
  customerPriceLow: decimal("customerPriceLow", { precision: 10, scale: 2 }),
  customerPriceHigh: decimal("customerPriceHigh", { precision: 10, scale: 2 }),
  marginPct: decimal("marginPct", { precision: 5, scale: 2 }),
  aiSummary: text("aiSummary"),
  aiWarnings: text("aiWarnings"),  // JSON array of warning strings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JobCostEstimate = typeof jobCostEstimates.$inferSelect;
export type InsertJobCostEstimate = typeof jobCostEstimates.$inferInsert;

// ─── Social Posts ─────────────────────────────────────────────────────────────
export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobDescription: text("jobDescription").notNull(),
  draft: text("draft").notNull(),
  platform: varchar("platform", { length: 50 }).notNull().default("both"),
  published: boolean("published").notNull().default(false),
  imageUrl: text("imageUrl"),
  imageKey: varchar("imageKey", { length: 500 }),
  fbPostId: varchar("fbPostId", { length: 200 }),
  igPostId: varchar("igPostId", { length: 200 }),
  xPostId: varchar("xPostId", { length: 200 }),
  liPostId: varchar("liPostId", { length: 200 }),
  postedAt: timestamp("postedAt"),
  adType: varchar("adType", { length: 50 }).default("social"),
  headline: varchar("headline", { length: 255 }),
  // Per-platform draft copy for All Five mode
  igDraft: text("igDraft"),
  xDraft: text("xDraft"),
  liDraft: text("liDraft"),
  googleHeadline: varchar("googleHeadline", { length: 255 }),
  googleDescription: varchar("googleDescription", { length: 500 }),
  googleDraft: text("googleDraft"),
  // Scheduling: null = post immediately, set = queue for future posting
  scheduledAt: timestamp("scheduledAt"),
  // status: draft | scheduled | published | failed
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;

// ─── Ad Spend Tracker ───────────────────────────────────────────────────────────
/**
 * Tracks advertising spend per platform and cost component.
 * Jon manually logs entries; the UI aggregates totals and breakdowns per platform.
 */
export const adSpend = mysqlTable("ad_spend", {
  id: int("id").autoincrement().primaryKey(),
  /** Platform this spend belongs to */
  platform: mysqlEnum("platform", ["facebook", "instagram", "x", "linkedin", "google", "other"]).notNull(),
  /** Cost component label — e.g. "Boost Post", "Promoted Post", "Monthly Budget", "Ad Creation" */
  component: varchar("component", { length: 100 }).notNull(),
  /** Amount in cents to avoid floating point issues */
  amountCents: int("amountCents").notNull(),
  /** Optional note — campaign name, post reference, etc. */
  notes: text("notes"),
  /** Date the spend occurred or was billed */
  spentAt: timestamp("spentAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdSpend = typeof adSpend.$inferSelect;
export type InsertAdSpend = typeof adSpend.$inferInsert;

// ─── Field Quotes (Noland Field mobile app) ───────────────────────────────────
/**
 * Field quotes submitted from the Noland Field mobile companion app.
 * Captures GPS coordinates, site photos (S3 URLs), and all field measurements
 * collected during an on-site visit. AI-scored on submission.
 */
export const fieldQuotes = mysqlTable("field_quotes", {
  id: int("id").autoincrement().primaryKey(),
  /** Contact info */
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  /** Site location */
  address: text("address"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  /** Job details */
  serviceType: varchar("serviceType", { length: 100 }),
  acreage: decimal("acreage", { precision: 8, scale: 2 }),
  terrainType: varchar("terrainType", { length: 100 }),
  vegetationDensity: varchar("vegetationDensity", { length: 100 }),
  vegetationTypes: varchar("vegetationTypes", { length: 255 }),
  slopeCondition: varchar("slopeCondition", { length: 100 }),
  accessCondition: varchar("accessCondition", { length: 255 }),
  obstacles: text("obstacles"),
  proximityToStructures: text("proximityToStructures"),
  /** Field notes from Jon */
  message: text("message"),
  /** JSON array of S3 photo URLs */
  photoUrls: text("photoUrls"),
  /** Source identifier — always "field_app" for mobile submissions */
  source: varchar("source", { length: 50 }).notNull().default("field_app"),
  /** AI lead qualification */
  aiScore: mysqlEnum("aiScore", ["strong", "marginal", "weak"]),
  aiSummary: text("aiSummary"),
  aiFlags: text("aiFlags"),        // JSON array of flag strings
  aiDraftResponse: text("aiDraftResponse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FieldQuote = typeof fieldQuotes.$inferSelect;
export type InsertFieldQuote = typeof fieldQuotes.$inferInsert;

// ─── X (Twitter) OAuth Tokens ─────────────────────────────────────────────────
/**
 * Stores the X (Twitter) OAuth 2.0 PKCE tokens for the Social AI posting integration.
 * Only one row is expected (the owner's token). Upsert on id=1.
 */
export const xOAuthTokens = mysqlTable("x_oauth_tokens", {
  id: int("id").primaryKey().autoincrement(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  scope: varchar("scope", { length: 500 }),
  /** X screen name (e.g. "nolandearthworks") */
  screenName: varchar("screenName", { length: 100 }),
  /** X user ID string */
  xUserId: varchar("xUserId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type XOAuthToken = typeof xOAuthTokens.$inferSelect;
export type InsertXOAuthToken = typeof xOAuthTokens.$inferInsert;

// ─── LinkedIn Credentials ─────────────────────────────────────────────────────
/**
 * Stores the LinkedIn OAuth 2.0 access token and author URN for organic posting.
 * Only one row is expected (the owner's credentials). Upsert on id=1.
 */
export const linkedinCredentials = mysqlTable("linkedin_credentials", {
  id: int("id").primaryKey().autoincrement(),
  /** OAuth 2.0 access token with w_member_social scope */
  accessToken: text("accessToken").notNull(),
  /** Author URN, e.g. urn:li:person:abc123 or urn:li:organization:123456 */
  authorUrn: varchar("authorUrn", { length: 200 }).notNull(),
  /** Optional display name shown in the UI connection card */
  displayName: varchar("displayName", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LinkedinCredential = typeof linkedinCredentials.$inferSelect;
export type InsertLinkedinCredential = typeof linkedinCredentials.$inferInsert;

// ─── Copy Settings ─────────────────────────────────────────────────────────────
/**
 * Stores the owner's copy-append preferences: default site URL and per-platform
 * hashtag strings. Only one row is expected (id=1). Upsert on save.
 */
export const copySettings = mysqlTable("copy_settings", {
  id: int("id").primaryKey().autoincrement(),
  /** Default website URL appended to copied posts (e.g. nolandearthworks.com) */
  siteUrl: varchar("siteUrl", { length: 300 }).notNull().default("nolandearthworks.com"),
  /** Hashtag string for Facebook */
  fbHashtags: varchar("fbHashtags", { length: 500 }).notNull().default("#NolandEarthworks #LandClearing #ForestryMulching #Tennessee"),
  /** Hashtag string for Instagram */
  igHashtags: varchar("igHashtags", { length: 500 }).notNull().default("#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #LandManagement #VeteranOwned #MiddleTennessee"),
  /** Hashtag string for X */
  xHashtags: varchar("xHashtags", { length: 500 }).notNull().default("#LandClearing #ForestryMulching #Tennessee"),
  /** Hashtag string for LinkedIn */
  liHashtags: varchar("liHashtags", { length: 500 }).notNull().default("#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #VeteranOwned"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CopySetting = typeof copySettings.$inferSelect;
export type InsertCopySetting = typeof copySettings.$inferInsert;

// ─── SEO Audits ────────────────────────────────────────────────────────────────
/**
 * Stores the results of each SEO audit run against nolandearthworks.com.
 * Each row is a full snapshot: category scores, individual check results,
 * and the overall letter grade. Audits are run on demand from /ops/seo.
 */
export const seoAudits = mysqlTable("seo_audits", {
  id: int("id").primaryKey().autoincrement(),
  /** ISO timestamp of when the audit was run */
  auditedAt: timestamp("auditedAt").defaultNow().notNull(),
  /** URL that was audited */
  url: varchar("url", { length: 500 }).notNull().default("https://nolandearthworks.com"),
  /** Overall letter grade: A+, A, A-, B+, B, B-, C, D, F */
  overallGrade: varchar("overallGrade", { length: 4 }).notNull(),
  /** Overall numeric score 0-100 */
  overallScore: int("overallScore").notNull(),
  /** On-Page SEO score 0-100 */
  onPageScore: int("onPageScore").notNull(),
  /** Links score 0-100 */
  linksScore: int("linksScore").notNull(),
  /** Usability score 0-100 */
  usabilityScore: int("usabilityScore").notNull(),
  /** Performance score 0-100 */
  performanceScore: int("performanceScore").notNull(),
  /** Social score 0-100 */
  socialScore: int("socialScore").notNull(),
  /** Full JSON blob of all individual check results */
  checksJson: text("checksJson").notNull(),
  /** JSON array of prioritized recommendations */
  recommendationsJson: text("recommendationsJson").notNull(),
  /** Raw page title found during audit */
  pageTitle: varchar("pageTitle", { length: 500 }),
  /** Raw meta description found during audit */
  metaDescription: text("metaDescription"),
  /** Page load time in milliseconds from PageSpeed API */
  loadTimeMs: int("loadTimeMs"),
  /** PageSpeed mobile score 0-100 */
  mobileScore: int("mobileScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeoAudit = typeof seoAudits.$inferSelect;
export type InsertSeoAudit = typeof seoAudits.$inferInsert;

// ── SEO Content Engine ─────────────────────────────────────────────────────────

/**
 * Stores keyword research results generated by the AI keyword engine.
 * Each row represents one keyword idea with intent, difficulty, and notes.
 */
export const seoKeywords = mysqlTable("seo_keywords", {
  id: int("id").primaryKey().autoincrement(),
  /** The keyword phrase */
  keyword: varchar("keyword", { length: 300 }).notNull(),
  /** Search intent: informational, navigational, transactional, local */
  intent: varchar("intent", { length: 50 }).notNull().default("informational"),
  /** Estimated difficulty: easy, medium, hard */
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("medium"),
  /** Estimated monthly search volume range, e.g. "100-500" */
  volumeRange: varchar("volumeRange", { length: 50 }),
  /** Why this keyword matters for Noland Earthworks */
  rationale: text("rationale"),
  /** Target service page or blog post type */
  contentType: varchar("contentType", { length: 100 }),
  /** Whether this keyword has been targeted (article written) */
  targeted: boolean("targeted").default(false).notNull(),
  /** Whether this keyword is saved/starred as a priority */
  saved: boolean("saved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeoKeyword = typeof seoKeywords.$inferSelect;
export type InsertSeoKeyword = typeof seoKeywords.$inferInsert;

/**
 * Stores AI-generated SEO articles / blog post drafts.
 * Each article targets a specific keyword and is written in Jon's brand voice.
 */
export const seoArticles = mysqlTable("seo_articles", {
  id: int("id").primaryKey().autoincrement(),
  /** The primary keyword this article targets */
  targetKeyword: varchar("targetKeyword", { length: 300 }).notNull(),
  /** Article title (H1) */
  title: varchar("title", { length: 500 }).notNull(),
  /** SEO meta description (150-160 chars) */
  metaDescription: varchar("metaDescription", { length: 500 }),
  /** Full article body in Markdown */
  bodyMarkdown: text("bodyMarkdown").notNull(),
  /** Estimated word count */
  wordCount: int("wordCount"),
  /** draft | ready | published */
  status: mysqlEnum("status", ["draft", "ready", "published"]).default("draft").notNull(),
  /** Optional notes from Jon */
  notes: text("notes"),
  /** Link to the keyword row if applicable */
  keywordId: int("keywordId"),
  /** URL slug used when published to the site (e.g. "forestry-mulching-middle-tennessee") */
  publishedSlug: varchar("publishedSlug", { length: 300 }),
  /** Timestamp when the article was published to the live site */
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SeoArticle = typeof seoArticles.$inferSelect;
export type InsertSeoArticle = typeof seoArticles.$inferInsert;

/**
 * Stores AI-generated fix instructions for SEO audit issues.
 * Each row corresponds to one failed/warned check from an audit run.
 */
export const seoFixes = mysqlTable("seo_fixes", {
  id: int("id").primaryKey().autoincrement(),
  /** FK to the seoAudits row this fix belongs to */
  auditId: int("auditId").notNull(),
  /** The check ID from the audit (e.g. "title-tag", "meta-description") */
  checkId: varchar("checkId", { length: 100 }).notNull(),
  /** Category: onpage | links | usability | performance | social */
  category: varchar("category", { length: 50 }).notNull(),
  /** Human-readable label of the check */
  label: varchar("label", { length: 300 }).notNull(),
  /** Original check status: fail | warn */
  checkStatus: varchar("checkStatus", { length: 10 }).notNull(),
  /** Priority: high | medium | low */
  priority: varchar("priority", { length: 10 }).notNull(),
  /** AI-generated research context: why this issue matters, its SEO impact, and supporting evidence */
  researchContext: text("researchContext"),
  /** AI-generated step-by-step fix instructions in Markdown */
  aiInstructions: text("aiInstructions").notNull(),
  /** Current fix status */
  status: mysqlEnum("status", ["pending", "in_progress", "resolved", "skipped"]).default("pending").notNull(),
  /** Optional note from Jon about the fix */
  note: text("note"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SeoFix = typeof seoFixes.$inferSelect;
export type InsertSeoFix = typeof seoFixes.$inferInsert;

// ─── Field Fix ────────────────────────────────────────────────────────────────

/**
 * Equipment registry — stores Jon's machines and attachments.
 * Designed for a single-operator fleet; supports multiple machines if needed.
 */
export const equipment = mysqlTable("equipment", {
  id: int("id").primaryKey().autoincrement(),
  /** Display name / nickname, e.g. "Tracked Mulcher" */
  name: varchar("name", { length: 200 }).notNull(),
  make: varchar("make", { length: 100 }),
  model: varchar("model", { length: 100 }),
  year: int("year"),
  serialNumber: varchar("serialNumber", { length: 100 }),
  /** Current machine hours */
  currentHours: int("currentHours").default(0).notNull(),
  hoursUpdatedAt: timestamp("hoursUpdatedAt").defaultNow().notNull(),
  /** Tags: primary, attachment, leased, financed, etc. */
  tags: text("tags"),
  /** Free-form notes about the machine */
  notes: text("notes"),
  /** Photo URL (S3 CDN) */
  photoUrl: text("photoUrl"),
  /** active | inactive | sold */
  status: mysqlEnum("status", ["active", "inactive", "sold"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

/**
 * Service log — records every maintenance/service event for a machine.
 */
export const serviceLogs = mysqlTable("service_logs", {
  id: int("id").primaryKey().autoincrement(),
  equipmentId: int("equipmentId").notNull(),
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  serviceDate: timestamp("serviceDate").notNull(),
  hoursAtService: int("hoursAtService"),
  /** Who performed the service: owner, dealer, mobile tech */
  performedBy: varchar("performedBy", { length: 200 }),
  notes: text("notes"),
  /** Total cost in dollars (parts + labor) */
  cost: decimal("cost", { precision: 10, scale: 2 }),
  /** Receipt/invoice photo URL */
  receiptUrl: text("receiptUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceLog = typeof serviceLogs.$inferSelect;
export type InsertServiceLog = typeof serviceLogs.$inferInsert;

/**
 * Service intervals — recurring maintenance schedules per machine.
 * Hours-based: next service due at (lastServiceHours + intervalHours).
 */
export const serviceIntervals = mysqlTable("service_intervals", {
  id: int("id").primaryKey().autoincrement(),
  equipmentId: int("equipmentId").notNull(),
  serviceType: varchar("serviceType", { length: 100 }).notNull(),
  /** How often (in machine hours) this service is due */
  intervalHours: int("intervalHours").notNull(),
  lastServiceHours: int("lastServiceHours"),
  lastServiceDate: timestamp("lastServiceDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ServiceInterval = typeof serviceIntervals.$inferSelect;
export type InsertServiceInterval = typeof serviceIntervals.$inferInsert;

/**
 * Field diagnostics — AI-generated Fix Reports for equipment issues.
 */
export const fieldDiagnostics = mysqlTable("field_diagnostics", {
  id: int("id").primaryKey().autoincrement(),
  equipmentId: int("equipmentId"),
  /** Plain-text symptom description from the operator */
  symptoms: text("symptoms").notNull(),
  /** Optional error/fault code from the machine display */
  errorCode: varchar("errorCode", { length: 100 }),
  /** Optional photo URL uploaded by operator */
  photoUrl: text("photoUrl"),
  /** Full AI Fix Report stored as JSON string */
  reportJson: text("reportJson"),
  /** Short headline summary of the diagnosis */
  headline: varchar("headline", { length: 500 }),
  /** Overall confidence percentage (0-100) */
  confidence: int("confidence"),
  /** Random token for public shareable link access */
  shareToken: varchar("shareToken", { length: 64 }),
  /** Optional expiration date for the shareable link */
  shareTokenExpiresAt: timestamp("shareTokenExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FieldDiagnostic = typeof fieldDiagnostics.$inferSelect;
export type InsertFieldDiagnostic = typeof fieldDiagnostics.$inferInsert;

// ─── Stripe Payments ─────────────────────────────────────────────────────────
/**
 * Tracks Stripe payment sessions for deposits and final balances.
 * One row per payment session. jobId links to the ops jobs table.
 * customerId links to the users table (the customer who pays).
 */
export const payments = mysqlTable("payments", {
  id: int("id").primaryKey().autoincrement(),
  /** FK to ops jobs table */
  jobId: int("jobId").notNull(),
  /** FK to users table — the customer making the payment */
  customerId: int("customerId").notNull(),
  /** deposit = initial deposit, balance = final remaining balance */
  type: mysqlEnum("type", ["deposit", "balance"]).notNull(),
  /** Amount in cents (e.g. 50000 = $500.00) */
  amountCents: int("amountCents").notNull(),
  /** pending = session created, paid = webhook confirmed, cancelled = abandoned */
  status: mysqlEnum("status", ["pending", "paid", "cancelled"]).notNull().default("pending"),
  /** Stripe Checkout Session ID — used to look up the session */
  stripeSessionId: varchar("stripeSessionId", { length: 128 }).unique(),
  /** Stripe Payment Intent ID — populated after checkout.session.completed */
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  /** Timestamp when payment was confirmed by Stripe webhook */
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── Gallery Photos ───────────────────────────────────────────────────────────
/**
 * Job photos uploaded via the ops gallery manager.
 * Powers both the internal ops gallery and the public /gallery page.
 */
export const galleryPhotos = mysqlTable("gallery_photos", {
  id: int("id").primaryKey().autoincrement(),
  /** S3/CDN URL for the photo */
  url: text("url").notNull(),
  /** S3 key for deletion */
  s3Key: varchar("s3Key", { length: 500 }).notNull(),
  /** Display title shown in the gallery */
  title: varchar("title", { length: 200 }).notNull().default(""),
  /** Caption / description shown below the photo */
  description: text("description"),
  /** Service category */
  serviceType: varchar("serviceType", { length: 100 }).notNull().default("forestry-mulching"),
  /** Tennessee county or region */
  county: varchar("county", { length: 100 }).notNull().default("Middle Tennessee"),
  /** Acreage label (e.g. "3.5 acres") — free text */
  acreage: varchar("acreage", { length: 50 }),
  /** before = before shot, after = after shot, general = general/equipment */
  photoType: mysqlEnum("photoType", ["before", "after", "general"]).notNull().default("general"),
  /** Optional link to an ops job */
  jobId: int("jobId"),
  /** Whether to show on the public /gallery page */
  visible: boolean("visible").notNull().default(true),
  /** Manual sort order — lower = first */
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GalleryPhoto = typeof galleryPhotos.$inferSelect;
export type InsertGalleryPhoto = typeof galleryPhotos.$inferInsert;

// ─── Jobber Revenue Cache ─────────────────────────────────────────────────────
/**
 * Caches Jobber invoice data synced to the local DB for use in Reports.
 * Synced on demand via the syncJobberRevenue procedure.
 */
export const jobberRevenueCache = mysqlTable("jobber_revenue_cache", {
  id: int("id").primaryKey().autoincrement(),
  /** Jobber invoice ID (encoded string) */
  invoiceId: varchar("invoiceId", { length: 256 }).notNull().unique(),
  /** Jobber invoice number (human-readable) */
  invoiceNumber: int("invoiceNumber"),
  /** Invoice status: draft, awaiting_payment, paid, bad_debt, void */
  invoiceStatus: varchar("invoiceStatus", { length: 50 }),
  /** Total invoice amount in dollars */
  total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
  /** Outstanding balance */
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  /** Client name snapshot */
  clientName: varchar("clientName", { length: 255 }),
  /** Job/subject line snapshot */
  subject: varchar("subject", { length: 500 }),
  /** When the invoice was issued in Jobber */
  issuedDate: timestamp("issuedDate"),
  /** When this row was last synced from Jobber */
  syncedAt: timestamp("syncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type JobberRevenueCache = typeof jobberRevenueCache.$inferSelect;
export type InsertJobberRevenueCache = typeof jobberRevenueCache.$inferInsert;

// ─── Morning Briefs ───────────────────────────────────────────────────────────
/**
 * Caches the AI-generated morning brief — one per day.
 * Regenerated on demand or once per day by the morning brief procedure.
 */
export const morningBriefs = mysqlTable("morning_briefs", {
  id: int("id").primaryKey().autoincrement(),
  /** ISO date string YYYY-MM-DD — one row per day */
  date: varchar("date", { length: 10 }).notNull().unique(),
  /** AI-generated plain-English briefing text */
  content: text("content").notNull(),
  /** Timestamp when this brief was generated */
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});
export type MorningBrief = typeof morningBriefs.$inferSelect;
export type InsertMorningBrief = typeof morningBriefs.$inferInsert;

// ─── Review Requests ──────────────────────────────────────────────────────────
/**
 * Tracks review request SMS messages sent to clients after job completion.
 */
export const reviewRequests = mysqlTable("review_requests", {
  id: int("id").primaryKey().autoincrement(),
  /** FK to local jobs table — null if triggered from a Jobber job */
  jobId: int("jobId"),
  /** Jobber job ID string — set when triggered from a Jobber job */
  jobberJobId: varchar("jobberJobId", { length: 256 }),
  /** Client phone number the SMS was sent to */
  clientPhone: varchar("clientPhone", { length: 50 }).notNull(),
  /** Client name for display */
  clientName: varchar("clientName", { length: 255 }),
  /** Job description snapshot for the SMS message */
  jobDescription: varchar("jobDescription", { length: 500 }),
  /** Twilio message SID */
  twilioSid: varchar("twilioSid", { length: 64 }),
  /** sent | failed */
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type InsertReviewRequest = typeof reviewRequests.$inferInsert;

/**
 * Hidden Clients — local-only list of Jobber client IDs that have been "deleted"
 * from the ops dashboard. The client is NOT touched in Jobber; it is simply
 * filtered out of all client list views in this dashboard.
 */
export const hiddenClients = mysqlTable("hidden_clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Jobber client EncodedId */
  jobberClientId: varchar("jobberClientId", { length: 120 }).notNull(),
  /** Display name at time of deletion — for audit trail */
  clientName: varchar("clientName", { length: 255 }),
  hiddenAt: timestamp("hiddenAt").defaultNow().notNull(),
});
export type HiddenClient = typeof hiddenClients.$inferSelect;
export type InsertHiddenClient = typeof hiddenClients.$inferInsert;

/**
 * Monthly Ad Campaigns — stores AI-generated campaign plans for upcoming months.
 * Each row represents one month's campaign plan for a specific user.
 */
export const adCampaigns = mysqlTable("ad_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** YYYY-MM — e.g. "2026-07" */
  month: varchar("month", { length: 7 }).notNull(),
  /** Display label — e.g. "July 2026" */
  monthLabel: varchar("monthLabel", { length: 30 }).notNull(),
  /** Season context: "peak" | "spring" | "summer" | "slow" */
  season: varchar("season", { length: 20 }),
  /** AI-generated campaign theme / headline */
  theme: varchar("theme", { length: 255 }),
  /** AI-generated campaign goal */
  goal: text("goal"),
  /** AI-generated primary message / angle */
  primaryMessage: text("primaryMessage"),
  /** JSON array of AdIdea objects: { platform, headline, body, callToAction, imagePrompt } */
  adIdeas: json("adIdeas"),
  /** JSON array of suggested posting dates: string[] */
  suggestedDates: json("suggestedDates"),
  /** User notes / edits on this campaign */
  notes: text("notes"),
  /** "draft" | "active" | "completed" */
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type AdCampaign = typeof adCampaigns.$inferSelect;
export type InsertAdCampaign = typeof adCampaigns.$inferInsert;

// ─── AI Visibility Score ─────────────────────────────────────────────────────

/**
 * Stores each full AI visibility audit run.
 * One row per audit — contains the aggregate score and per-platform breakdown.
 */
export const aiVisibilityAudits = mysqlTable("ai_visibility_audits", {
  id: int("id").autoincrement().primaryKey(),
  /** Overall score 0–100 */
  overallScore: int("overallScore").notNull(),
  /** JSON: { grok: number, gemini: number, perplexity: number, chatgpt: number } */
  platformScores: text("platformScores").notNull(),
  /** JSON: { mentions: number, positiveCount: number, neutralCount: number, negativeCount: number } */
  mentionStats: text("mentionStats").notNull(),
  /** JSON array of prompt results */
  promptResults: text("promptResults").notNull(),
  /** JSON array of AEO recommendation strings */
  recommendations: text("recommendations").notNull(),
  /** Share of voice vs competitors 0–100 */
  shareOfVoice: int("shareOfVoice").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiVisibilityAudit = typeof aiVisibilityAudits.$inferSelect;
export type InsertAiVisibilityAudit = typeof aiVisibilityAudits.$inferInsert;

/**
 * Individual prompt result within an audit.
 * Stored as JSON in aiVisibilityAudits.promptResults but also queryable standalone.
 */
export const aiVisibilityPrompts = mysqlTable("ai_visibility_prompts", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  /** The prompt text sent to the AI */
  prompt: text("prompt").notNull(),
  /** Category: local_service | branded | competitor | use_case | general */
  category: varchar("category", { length: 64 }).notNull(),
  /** Which AI platform was queried: grok | gemini | perplexity | chatgpt */
  platform: varchar("platform", { length: 32 }).notNull(),
  /** Full AI response text */
  response: text("response").notNull(),
  /** Was Noland Earthworks mentioned? */
  mentioned: boolean("mentioned").notNull().default(false),
  /** Mention prominence: primary | secondary | none */
  prominence: varchar("prominence", { length: 16 }).notNull().default("none"),
  /** Sentiment: positive | neutral | negative */
  sentiment: varchar("sentiment", { length: 16 }).notNull().default("neutral"),
  /** Was the domain nolandearthworks.com cited? */
  cited: boolean("cited").notNull().default(false),
  /** Score for this individual prompt 0–100 */
  score: int("score").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AiVisibilityPrompt = typeof aiVisibilityPrompts.$inferSelect;
export type InsertAiVisibilityPrompt = typeof aiVisibilityPrompts.$inferInsert;

/**
 * AI-discovered prospecting leads from public sources (Craigslist, Facebook groups, etc.)
 * Populated daily by the AGENT cron job.
 */
export const prospectingLeads = mysqlTable("prospecting_leads", {
  id: int("id").autoincrement().primaryKey(),
  /** Source platform: craigslist | facebook | nextdoor | google_reviews | permits */
  source: varchar("source", { length: 64 }).notNull(),
  /** Direct URL to the post/listing */
  url: text("url").notNull(),
  /** Contact name if visible in the post */
  contactName: varchar("contactName", { length: 255 }),
  /** Phone or email if visible */
  contactInfo: varchar("contactInfo", { length: 255 }),
  /** County or city mentioned */
  location: varchar("location", { length: 255 }),
  /** AI summary of why this is a lead */
  summary: text("summary").notNull(),
  /** AI-drafted first outreach message (SMS or email) */
  reachOutDraft: text("reachOutDraft"),
  /** Status: new | contacted | dismissed */
  status: varchar("status", { length: 32 }).notNull().default("new"),
  /** Original post text snippet */
  postSnippet: text("postSnippet"),
  /** Facebook profile URL of the poster — used to build Messenger deep link */
  profileUrl: text("profileUrl"),
  /**
   * AI-estimated profit margin tier based on inferred acreage, density, and terrain.
   * Values: "high" | "medium" | "low" | null (null = insufficient info to score)
   * high   = estimated margin ≥ 55% (dense veg, 3+ acres, accessible terrain)
   * medium = estimated margin 35–54%
   * low    = estimated margin < 35% or too much uncertainty
   */
  marginTier: varchar("marginTier", { length: 16 }),
  /** AI-estimated acreage inferred from the post (may be null if not mentioned) */
  estimatedAcres: varchar("estimatedAcres", { length: 32 }),
  /** User-entered notes / extra context about this prospect */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProspectingLead = typeof prospectingLeads.$inferSelect;
export type InsertProspectingLead = typeof prospectingLeads.$inferInsert;
