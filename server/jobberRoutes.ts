/**
 * Express routes for Jobber OAuth flow
 * GET  /api/jobber/authorize  → redirects to Jobber OAuth consent screen
 * GET  /api/jobber/callback   → exchanges code for tokens and stores them
 * GET  /api/jobber/status     → returns whether Jobber is connected
 */
import type { Express } from "express";
import { ENV } from "./_core/env";
import { exchangeCodeForTokens, isJobberConnected, jobberGraphQL } from "./jobber";

const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";

export function registerJobberRoutes(app: Express) {
  // Redirect to Jobber OAuth consent screen
  app.get("/api/jobber/authorize", (_req, res) => {
    const params = new URLSearchParams({
      client_id: ENV.jobberClientId,
      redirect_uri: "https://www.nolandearthworks.com/api/jobber/callback",
      response_type: "code",
    });
    res.redirect(`${JOBBER_AUTH_URL}?${params.toString()}`);
  });

  // Jobber redirects here after user approves
  app.get("/api/jobber/callback", async (req, res) => {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.status(400).send("Missing authorization code from Jobber.");
      return;
    }
    try {
      await exchangeCodeForTokens(code);
      res.redirect("/admin/settings?jobber=connected");
    } catch (err) {
      console.error("[Jobber] OAuth callback error:", err);
      res.status(500).send(`Failed to connect Jobber: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Temporary introspect endpoint — for dev use only
  app.post("/api/jobber/introspect", async (req, res) => {
    try {
      const { query, variables } = req.body as { query: string; variables?: Record<string, unknown> };
      const data = await jobberGraphQL(query, variables ?? {});
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Status check endpoint
  app.get("/api/jobber/status", async (_req, res) => {
    try {
      const connected = await isJobberConnected();
      res.json({ connected });
    } catch {
      res.json({ connected: false });
    }
  });
}
