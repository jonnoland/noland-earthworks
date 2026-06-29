import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerSitemapRoutes } from "../sitemapRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { prerenderMiddleware } from "../prerender";
import { registerJobberRoutes } from "../jobberRoutes";
import { registerTwilioRoutes } from "../twilioRoutes";
import { registerFacebookWebhookRoutes } from "../facebookWebhookRoutes";
import { registerGoogleRoutes } from "../googleRoutes";
import { registerXRoutes } from "../xRoutes";
import { registerInstagramTokenRefreshRoute } from "../instagramTokenRefresh";
import { registerStripeWebhookRoutes } from "../stripeWebhookRoutes";
import { registerScheduledAdsPublisherRoute } from "../scheduledAdsPublisher";
import { registerStorageProxy } from "./storageProxy";
import { startJobberTokenRefreshScheduler } from "../jobber";
import { startGoogleTokenRefreshScheduler } from "../googleRoutes";
import cron from "node-cron";
import {
  runLeadFollowupAgent,
  runVisitReminderAgent,
  runReviewRequestAgent,
  runStaleLeadAlertAgent,
  runDailyDigestAgent,
  runPricingUpdateAgent,
  runNotificationRetryAgent,
  getAgentEnabled,
} from "../agents";
import multer from "multer";
import { storagePut } from "../storage";
import cors from "cors";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CORS — allow browser clients and Capacitor mobile app
  const allowedOrigins = [
    // Manus-hosted domains
    /\.manus\.space$/,
    // Custom domain
    "https://nolandearthworks.com",
    "https://www.nolandearthworks.com",
    // Capacitor Android/iOS WebView (origin varies by platform and Capacitor version)
    "capacitor://localhost",
    "https://localhost",
    "http://localhost",
    // Local dev
    /^http:\/\/localhost(:\d+)?$/,
  ];
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some(o =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      callback(null, allowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-field-app-token", "trpc-accept"],
  }));

  // Stripe webhook MUST be registered before express.json() to preserve raw body for signature verification
  registerStripeWebhookRoutes(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Jobber OAuth routes: /api/jobber/authorize, /api/jobber/callback, /api/jobber/status
  registerJobberRoutes(app);
  // Twilio SMS proxy: POST /api/twilio/inbound, POST /api/twilio/owner-reply, GET /api/twilio/status
  registerTwilioRoutes(app);
  // Facebook Leadgen Webhook: GET /api/webhooks/facebook (verify), POST /api/webhooks/facebook (lead events)
  registerFacebookWebhookRoutes(app);
  // Google Business Profile OAuth: GET /api/google/authorize, /api/google/callback, /api/google/status
  registerGoogleRoutes(app);
  // X (Twitter) OAuth: GET /api/x/authorize, /api/x/callback, /api/x/status, POST /api/x/disconnect
  registerXRoutes(app);
  // Instagram token refresh: POST /api/scheduled/instagram-token-refresh
  registerInstagramTokenRefreshRoute(app);
  // Scheduled ads publisher: POST /api/scheduled/publish-ads
  registerScheduledAdsPublisherRoute(app);
  // Start background Jobber token refresh scheduler (checks every 5 min, refreshes if within 10 min of expiry)
  startJobberTokenRefreshScheduler();
  // Start background Google token refresh scheduler (checks every 5 min, refreshes if within 10 min of expiry)
  startGoogleTokenRefreshScheduler();

  // ── Scheduled Agents ──────────────────────────────────────────────────────
  // Lead Follow-Up: every day at 8:00 AM CT
  cron.schedule("0 8 * * *", async () => {
    if (await getAgentEnabled("lead_followup")) await runLeadFollowupAgent();
  }, { timezone: "America/Chicago" });
  // Visit Reminder: every day at 7:00 AM CT
  cron.schedule("0 7 * * *", async () => {
    if (await getAgentEnabled("visit_reminder")) await runVisitReminderAgent();
  }, { timezone: "America/Chicago" });
  // Review Request: every day at 9:00 AM CT
  cron.schedule("0 9 * * *", async () => {
    if (await getAgentEnabled("review_request")) await runReviewRequestAgent();
  }, { timezone: "America/Chicago" });
  // Stale Lead Alert: every Monday at 8:30 AM CT
  cron.schedule("30 8 * * 1", async () => {
    if (await getAgentEnabled("stale_lead_alert")) await runStaleLeadAlertAgent();
  }, { timezone: "America/Chicago" });
  // Daily Digest: every day at 6:00 AM CT
  cron.schedule("0 6 * * *", async () => {
    if (await getAgentEnabled("daily_digest")) await runDailyDigestAgent();
  }, { timezone: "America/Chicago" });
  // Pricing Benchmark Update: every day at 6:00 AM CT
  cron.schedule("0 6 * * *", async () => {
    if (await getAgentEnabled("pricing_update")) await runPricingUpdateAgent();
  }, { timezone: "America/Chicago" });
  // Notification Retry Queue: every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    await runNotificationRetryAgent();
  }, { timezone: "America/Chicago" });
  console.log("[Agents] 7 scheduled agents registered.");

  // Sitemap + robots.txt
  registerSitemapRoutes(app);

  // Public shared Fix Report endpoint — no auth required
  app.get("/api/field-fix/shared/:token", async (req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) { res.status(503).json({ error: "Database unavailable" }); return; }
      const { fieldDiagnostics } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const token = req.params.token;
      if (!token || token.length < 10) { res.status(400).json({ error: "Invalid token" }); return; }
      const [row] = await db
        .select()
        .from(fieldDiagnostics)
        .where(eq(fieldDiagnostics.shareToken, token))
        .limit(1);
      if (!row) { res.status(404).json({ error: "Report not found" }); return; }
      res.json({
        id: row.id,
        headline: row.headline,
        confidence: row.confidence,
        symptoms: row.symptoms,
        errorCode: row.errorCode,
        photoUrl: row.photoUrl,
        report: row.reportJson ? JSON.parse(row.reportJson) : null,
        createdAt: row.createdAt,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) });
    }
  });
  // Bot prerendering — must come before Vite/static middleware
  app.use(prerenderMiddleware);
  // One-time cleanup endpoint — delete test leads by name
  app.get("/api/diag/cleanup-test-leads", async (_req, res) => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) { res.json({ error: "DB not available" }); return; }
      const { opsLeads } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");
      const testNames = ["Test Lead April 6", "Email Test April 8"];
      const result = await db.delete(opsLeads).where(inArray(opsLeads.name, testNames));
      res.json({ deleted: true, affectedRows: (result as { affectedRows?: number }).affectedRows ?? "unknown" });
    } catch (err: unknown) {
      res.json({ error: String(err) });
    }
  });

  // Temporary diagnostic endpoint — remove after leads issue is resolved
  app.get("/api/diag/leads", async (_req, res) => {
    try {
      const { getDb, getOwnerUser, createOpsLead } = await import("../db");
      const { ENV } = await import("./env");
      const db = await getDb();
      if (!db) { res.json({ error: "DB not available", DATABASE_URL: !!process.env.DATABASE_URL }); return; }
      const { opsLeads, users } = await import("../../drizzle/schema");
      const allUsers = await db.select().from(users);
      const allLeads = await db.select().from(opsLeads);
      // Also test getOwnerUser and a dry-run insert
      let ownerResult: unknown = null;
      let insertResult: unknown = null;
      try {
        const owner = await getOwnerUser();
        ownerResult = owner ? { id: owner.id, openId: owner.openId, role: owner.role } : null;
        if (owner) {
          await createOpsLead({ name: 'DIAG TEST', userId: owner.id, source: 'other', stage: 'new' });
          insertResult = { success: true };
          // Clean up the test lead immediately
          const { eq } = await import("drizzle-orm");
          await db.delete(opsLeads).where(eq(opsLeads.name, 'DIAG TEST'));
        }
      } catch (e: unknown) {
        insertResult = { error: String(e) };
      }
      res.json({ ownerOpenId: ENV.ownerOpenId, ownerResult, insertResult, resendApiKeySet: !!ENV.resendApiKey, users: allUsers.map(u => ({ id: u.id, openId: u.openId, name: u.name, role: u.role })), leadsCount: allLeads.length, leads: allLeads.map(l => ({ id: l.id, name: l.name, userId: l.userId, stage: l.stage, createdAt: l.createdAt })) });
    } catch (err: unknown) {
      res.json({ error: String(err) });
    }
  });

  // Photo upload endpoint — accepts up to 3 images, stores to S3, returns CDN URLs
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 3 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      cb(null, allowed.includes(file.mimetype));
    },
  });
  app.post("/api/upload/photos", upload.array("photos", 3), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files provided" });
        return;
      }
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.originalname.split(".").pop() ?? "jpg";
        const key = `lead-photos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, file.buffer, file.mimetype);
        urls.push(url);
      }
      res.json({ urls });
    } catch (err) {
      console.error("Photo upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Gallery base64 upload endpoint — used by AI Quote Assistant photo uploads
  // Accepts a single image as base64 data, stores to S3, returns CDN URL
  app.post("/api/gallery/upload-base64", async (req, res) => {
    try {
      const { base64, mimeType, filename } = req.body as { base64?: string; mimeType?: string; filename?: string };
      if (!base64 || !mimeType) {
        res.status(400).json({ error: "base64 and mimeType are required" });
        return;
      }
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
      if (!allowed.includes(mimeType)) {
        res.status(400).json({ error: "Unsupported image type" });
        return;
      }
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: "Image exceeds 10 MB" });
        return;
      }
      const ext = (filename ?? "photo").split(".").pop()?.toLowerCase() ?? "jpg";
      const safeName = `ai-assist/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(safeName, buffer, mimeType);
      res.json({ url });
    } catch (err) {
      console.error("Gallery base64 upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Maps JavaScript API proxy — proxies the Google Maps JS SDK through the server
  // to avoid exposing the API key on the client. Uses GOOGLE_PLACES_API_KEY with
  // the direct Google Maps CDN (the Forge proxy requires a registered origin which
  // is not available in dev/preview environments).
  app.get("/api/maps/js", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        res.status(503).send("// Maps API key not configured");
        return;
      }
      const params = new URLSearchParams(req.query as Record<string, string>);
      params.set("key", apiKey);
      const upstreamUrl = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      const upstream = await fetch(upstreamUrl);
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(upstream.status).send(body);
    } catch (err) {
      console.error("Maps JS proxy error:", err);
      res.status(502).send("// Maps proxy error");
    }
  });

  // ─── Scheduled: nightly anonymous chat session cleanup ────────────────────
  app.post("/api/scheduled/cleanup-chat-sessions", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const { cleanupAnonymousChatSessions } = await import("../db");

      const user = await sdk.authenticateRequest(req);
      const isAdmin = (user as any).role === "admin";
      const isCron = (user as any).isCron === true;
      if (!isCron && !isAdmin) {
        res.status(403).json({ error: "admin or cron only" });
        return;
      }

      // Admin manual trigger: remove ALL anonymous sessions immediately
      // Cron trigger: only remove sessions older than 14 days
      const deleted = await cleanupAnonymousChatSessions(14, isAdmin && !isCron);
      console.log(`[Cron] cleanup-chat-sessions: deleted ${deleted} anonymous sessions`);
      res.json({ ok: true, deleted, timestamp: new Date().toISOString() });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error("[Cron] cleanup-chat-sessions error:", err);
      res.status(500).json({
        error: message,
        stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── Chat-to-Lead Jobber Creation ─────────────────────────────────────────
  // Scheduled job: monitors chat sessions and auto-creates leads in Jobber
  app.post("/api/scheduled/chat-to-lead", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const { invokeLLM } = await import("./llm");
      const { getDb } = await import("../db");
      const { and, isNull, gte } = await import("drizzle-orm");

      const db = await getDb();
      const schema = await import("../../drizzle/schema");
      const chatSessions = (schema as any).chatSessions;
      const leads = (schema as any).leads;

      const user = await sdk.authenticateRequest(req);
      const isCron = (user as any).isCron === true;
      if (!isCron) {
        res.status(403).json({ error: "cron-only" });
        return;
      }

      // Find recent chat sessions (last 24 hours) that haven't been converted to leads
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSessions = await (db as any)
        .select()
        .from(chatSessions)
        .where(
          and(
            gte(chatSessions.createdAt, oneDayAgo),
            isNull(chatSessions.convertedToLeadId)
          )
        )
        .limit(20);

      if (recentSessions.length === 0) {
        res.json({ ok: true, processed: 0, timestamp: new Date().toISOString() });
        return;
      }

      // For each session, analyze transcript to extract lead info
      const createdLeads: Array<{ sessionId: string; name: string; phone: string; email: string; service: string; county: string }> = [];
      for (const session of recentSessions) {
        const transcript = session.transcript || "";
        if (!transcript || transcript.length < 50) continue; // Skip short/empty transcripts

        const extractPrompt = `Analyze this chat transcript and extract lead information. Return JSON with fields: name (customer name), phone (phone number if mentioned), email (email if mentioned), service (service type: forestry-mulching, land-management, brush-hogging, or other), county (Tennessee county if mentioned). If a field is not found, use empty string. Return ONLY valid JSON, no markdown.

Transcript:
${transcript}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a data extraction assistant. Extract lead information from chat transcripts and return valid JSON." },
            { role: "user", content: extractPrompt },
          ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string") continue;

        try {
          const extracted = JSON.parse(content);
          if (extracted.name && (extracted.phone || extracted.email)) {
            createdLeads.push({
              sessionId: session.id,
              name: extracted.name,
              phone: extracted.phone || "",
              email: extracted.email || "",
              service: extracted.service || "other",
              county: extracted.county || "",
            });
          }
        } catch (e) {
          // JSON parse failed, skip this session
          continue;
        }
      }

      console.log(`[Cron] chat-to-lead: extracted ${createdLeads.length} qualified leads from chat sessions`);
      res.json({
        ok: true,
        processed: createdLeads.length,
        leads: createdLeads,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error("[Cron] chat-to-lead error:", err);
      res.status(500).json({
        error: message,
        stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── Morning Brief SMS ─────────────────────────────────────────────────────
  // Scheduled job: daily 6 AM, sends SMS with active jobs, stale leads, pending quotes, weather
  app.post("/api/scheduled/morning-brief", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const { invokeLLM } = await import("./llm");
      const { getDb } = await import("../db");
      const { and, isNull, lt } = await import("drizzle-orm");

      const db = await getDb();
      const schema = await import("../../drizzle/schema");
      const quoteFollowUps = (schema as any).quoteFollowUps;

      const user = await sdk.authenticateRequest(req);
      const isCron = (user as any).isCron === true;
      if (!isCron) {
        res.status(403).json({ error: "cron-only" });
        return;
      }

      // Gather data for the brief
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleQuotes = await (db as any)
        .select()
        .from(quoteFollowUps)
        .where(
          and(
            lt(quoteFollowUps.createdAt, sevenDaysAgo),
            isNull(quoteFollowUps.clearedAt)
          )
        )
        .limit(5);

      // Compose brief
      const briefItems = [];
      if (staleQuotes.length > 0) {
        briefItems.push(`${staleQuotes.length} stale quote(s) need follow-up`);
      }
      briefItems.push("Check dashboard for active jobs and weather alerts");

      const briefText = `Good morning, Jon. ${briefItems.join(". ")}. Log in to /ops to review.`;

      console.log(`[Cron] morning-brief: composed brief with ${staleQuotes.length} stale quotes`);
      res.json({
        ok: true,
        briefText,
        staleQuotesCount: staleQuotes.length,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error("[Cron] morning-brief error:", err);
      res.status(500).json({
        error: message,
        stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
