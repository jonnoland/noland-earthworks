/**
 * Express routes for X (Twitter) OAuth 2.0 PKCE flow
 * GET  /api/x/authorize   → redirects to X consent screen
 * GET  /api/x/callback    → exchanges code for tokens and stores them
 * GET  /api/x/status      → returns whether X is connected
 * POST /api/x/disconnect  → revokes and removes stored tokens
 */
import type { Express } from "express";
import crypto from "crypto";
import { ENV } from "./_core/env";
import { getDb } from "./db";

const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_REVOKE_URL = "https://api.twitter.com/2/oauth2/revoke";
const X_SCOPES = "tweet.read tweet.write users.read offline.access media.write";

// In-memory PKCE state store (single-user app, one pending auth at a time)
let pendingPkce: { codeVerifier: string; state: string } | null = null;

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generatePkce() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64url(crypto.randomBytes(16));
  return { codeVerifier, codeChallenge, state };
}

export function registerXRoutes(app: Express) {
  // Redirect to X OAuth consent screen
  app.get("/api/x/authorize", (_req, res) => {
    const clientId = ENV.twitterClientId;
    if (!clientId) {
      res.status(500).send("X Client ID not configured. Add TWITTER_CLIENT_ID secret.");
      return;
    }
    const { codeVerifier, codeChallenge, state } = generatePkce();
    pendingPkce = { codeVerifier, state };

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: ENV.twitterRedirectUri,
      scope: X_SCOPES,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    res.redirect(`${X_AUTH_URL}?${params.toString()}`);
  });

  // X redirects here after user approves
  app.get("/api/x/callback", async (req, res) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      console.error("[X OAuth] User denied or error:", error);
      res.redirect("/ops/ads?x=denied");
      return;
    }

    if (!code || !state) {
      res.status(400).send("Missing code or state from X.");
      return;
    }

    if (!pendingPkce || pendingPkce.state !== state) {
      res.status(400).send("Invalid or expired OAuth state. Please try connecting again.");
      return;
    }

    const { codeVerifier } = pendingPkce;
    pendingPkce = null;

    try {
      // Exchange code for tokens
      const basicAuth = Buffer.from(`${ENV.twitterClientId}:${ENV.twitterClientSecret}`).toString("base64");
      const tokenRes = await fetch(X_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: ENV.twitterRedirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const tokenData = await tokenRes.json() as any;
      if (!tokenRes.ok || tokenData.error) {
        throw new Error(tokenData.error_description ?? tokenData.error ?? "Token exchange failed");
      }

      const { access_token, refresh_token, expires_in, scope } = tokenData;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

      // Fetch the authenticated user's screen name
      let screenName: string | null = null;
      let xUserId: string | null = null;
      try {
        const meRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const meData = await meRes.json() as any;
        screenName = meData?.data?.username ?? null;
        xUserId = meData?.data?.id ?? null;
      } catch {
        // Non-fatal — we can still store the token without the screen name
      }

      // Upsert token row (id=1)
      const db = await getDb();
      if (db) {
        const { xOAuthTokens } = await import("../drizzle/schema");
        await db.insert(xOAuthTokens).values({
          id: 1,
          accessToken: access_token,
          refreshToken: refresh_token ?? null,
          expiresAt: expiresAt ?? undefined,
          scope: scope ?? X_SCOPES,
          screenName,
          xUserId,
        }).onDuplicateKeyUpdate({
          set: {
            accessToken: access_token,
            refreshToken: refresh_token ?? null,
            expiresAt: expiresAt ?? undefined,
            scope: scope ?? X_SCOPES,
            screenName,
            xUserId,
          },
        });
      }

      console.log(`[X OAuth] Connected as @${screenName ?? "unknown"}`);
      res.redirect("/ops/ads?x=connected");
    } catch (err) {
      console.error("[X OAuth] Callback error:", err);
      res.redirect(`/ops/ads?x=error&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }
  });

  // Status check
  app.get("/api/x/status", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) { res.json({ connected: false }); return; }
      const { xOAuthTokens } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(xOAuthTokens).where(eq(xOAuthTokens.id, 1)).limit(1);
      const token = rows[0];
      if (!token) { res.json({ connected: false }); return; }
      res.json({ connected: true, screenName: token.screenName ?? null });
    } catch {
      res.json({ connected: false });
    }
  });

  // Disconnect — revoke token and delete row
  app.post("/api/x/disconnect", async (_req, res) => {
    try {
      const db = await getDb();
      if (db) {
        const { xOAuthTokens } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await db.select().from(xOAuthTokens).where(eq(xOAuthTokens.id, 1)).limit(1);
        const token = rows[0];
        if (token?.accessToken) {
          // Best-effort revocation
          try {
            const basicAuth = Buffer.from(`${ENV.twitterClientId}:${ENV.twitterClientSecret}`).toString("base64");
            await fetch(X_REVOKE_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
              },
              body: new URLSearchParams({ token: token.accessToken, token_type_hint: "access_token" }).toString(),
            });
          } catch { /* ignore revocation errors */ }
        }
        await db.delete(xOAuthTokens).where(eq(xOAuthTokens.id, 1));
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}

/**
 * Retrieve the stored X access token, refreshing it if expired.
 * Returns null if not connected.
 */
export async function getXAccessToken(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const { xOAuthTokens } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(xOAuthTokens).where(eq(xOAuthTokens.id, 1)).limit(1);
  const token = rows[0];
  if (!token) return null;

  // If token is not expiring within 5 minutes, return as-is
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (!token.expiresAt || token.expiresAt > fiveMinFromNow) {
    return token.accessToken;
  }

  // Attempt refresh
  if (!token.refreshToken) return null;
  try {
    const basicAuth = Buffer.from(`${ENV.twitterClientId}:${ENV.twitterClientSecret}`).toString("base64");
    const refreshRes = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }).toString(),
    });
    const refreshData = await refreshRes.json() as any;
    if (!refreshRes.ok || refreshData.error) throw new Error(refreshData.error_description ?? "Refresh failed");

    const { access_token, refresh_token: newRefresh, expires_in } = refreshData;
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    await db.update(xOAuthTokens)
      .set({ accessToken: access_token, refreshToken: newRefresh ?? token.refreshToken, expiresAt: expiresAt ?? undefined })
      .where(eq(xOAuthTokens.id, 1));

    return access_token;
  } catch (err) {
    console.error("[X OAuth] Token refresh failed:", err);
    return null;
  }
}
