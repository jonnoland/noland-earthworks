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
import { registerFacebookWebhookRoutes } from "../facebookWebhookRoutes";
import { registerGoogleRoutes } from "../googleRoutes";
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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Storage proxy for /manus-storage/* paths
  registerStorageProxy(app);
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Jobber OAuth routes: /api/jobber/authorize, /api/jobber/callback, /api/jobber/status
  registerJobberRoutes(app);
  // Facebook Leadgen Webhook: GET /api/webhooks/facebook (verify), POST /api/webhooks/facebook (lead events)
  registerFacebookWebhookRoutes(app);
  // Google Business Profile OAuth: GET /api/google/authorize, /api/google/callback, /api/google/status
  registerGoogleRoutes(app);
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

  // Maps JavaScript API proxy — serves the Maps SDK script server-side.
  // Uses VITE_FRONTEND_FORGE_API_KEY (the frontend key) and forwards the
  // Origin header from the browser request, which the Forge proxy requires.
  app.get("/api/maps/js", async (req, res) => {
    try {
      const baseUrl = (process.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.manus.ai").replace(/\/+$/, "");
      const apiKey = process.env.VITE_FRONTEND_FORGE_API_KEY;
      if (!apiKey) {
        res.status(503).send("// Maps API key not configured");
        return;
      }
      const params = new URLSearchParams(req.query as Record<string, string>);
      params.set("key", apiKey);
      const upstreamUrl = `${baseUrl}/v1/maps/proxy/maps/api/js?${params.toString()}`;
      // The Forge Maps proxy requires an Origin header matching the registered domain.
      // Forward the browser's Origin if present; fall back to the production domain.
      const origin = (req.headers.origin as string) || (req.headers.referer ? new URL(req.headers.referer as string).origin : "https://nolandearthworks.com");
      const upstream = await fetch(upstreamUrl, {
        headers: { "Origin": origin },
      });
      const body = await upstream.text();
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(upstream.status).send(body);
    } catch (err) {
      console.error("Maps JS proxy error:", err);
      res.status(502).send("// Maps proxy error");
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
