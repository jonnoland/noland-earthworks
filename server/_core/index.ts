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
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Sitemap + robots.txt
  registerSitemapRoutes(app);
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
