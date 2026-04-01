/**
 * Express routes for Jobber OAuth flow
 * GET  /api/jobber/authorize  → redirects to Jobber OAuth consent screen
 * GET  /api/jobber/callback   → exchanges code for tokens and stores them
 * GET  /api/jobber/status     → returns whether Jobber is connected
 */
import type { Express } from "express";
import { ENV } from "./_core/env";
import { exchangeCodeForTokens, isJobberConnected } from "./jobber";

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
      res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:4rem;background:#121212;color:#F0EDE6;">
          <h2 style="color:#E07B2A;">✓ Jobber Connected Successfully</h2>
          <p>Quote form submissions will now automatically create requests in Jobber.</p>
          <p><a href="/" style="color:#E07B2A;">Return to website</a></p>
        </body></html>
      `);
    } catch (err) {
      console.error("[Jobber] OAuth callback error:", err);
      res.status(500).send(`Failed to connect Jobber: ${err instanceof Error ? err.message : String(err)}`);
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
