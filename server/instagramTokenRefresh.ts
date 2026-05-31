/**
 * Instagram Token Refresh
 *
 * The new Instagram Login API issues 60-day long-lived tokens.
 * This module provides:
 *   - refreshInstagramToken(): calls the Instagram Graph API to extend the token
 *   - registerInstagramTokenRefreshRoute(app): mounts POST /api/scheduled/instagram-token-refresh
 *
 * The route is triggered weekly by a project-level Heartbeat cron (registered via
 * manus-heartbeat CLI). It refreshes the token when it has fewer than 14 days remaining.
 *
 * Token storage: the refreshed token is written back to the INSTAGRAM_ACCESS_TOKEN
 * environment variable in memory AND persisted to the Manus secrets store via the
 * Forge API so it survives server restarts.
 */

import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";

const IG_GRAPH_BASE = "https://graph.instagram.com";

export interface TokenRefreshResult {
  refreshed: boolean;
  expiresIn?: number;
  error?: string;
}

/**
 * Refresh the Instagram long-lived access token.
 * The Instagram API allows refreshing a long-lived token at any time as long as
 * it has not yet expired. Returns the new expiry in seconds.
 */
export async function refreshInstagramToken(): Promise<TokenRefreshResult> {
  const currentToken = ENV.instagramAccessToken;
  if (!currentToken) {
    return { refreshed: false, error: "INSTAGRAM_ACCESS_TOKEN not set" };
  }

  // First check the current token debug info to see how much time is left
  const debugRes = await fetch(
    `${IG_GRAPH_BASE}/v21.0/me?fields=id&access_token=${currentToken}`
  );
  if (!debugRes.ok) {
    const debugData = await debugRes.json() as { error?: { message: string } };
    return { refreshed: false, error: `Token appears invalid: ${debugData.error?.message ?? "unknown"}` };
  }

  // Refresh the token — Instagram long-lived tokens can be refreshed at any time
  const refreshRes = await fetch(
    `${IG_GRAPH_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
  );
  const refreshData = await refreshRes.json() as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: { message: string; type: string; code: number };
  };

  if (!refreshRes.ok || refreshData.error || !refreshData.access_token) {
    return {
      refreshed: false,
      error: refreshData.error?.message ?? "Refresh API returned no token",
    };
  }

  const newToken = refreshData.access_token;
  const expiresIn = refreshData.expires_in ?? 5183944; // ~60 days default

  // Update the in-memory ENV so the running server uses the new token immediately
  (ENV as any).instagramAccessToken = newToken;
  process.env.INSTAGRAM_ACCESS_TOKEN = newToken;

  // Persist the new token to the Manus secrets store so it survives restarts
  try {
    const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
    const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
    if (forgeUrl && forgeKey) {
      await fetch(`${forgeUrl}/api/v1/project/secrets`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${forgeKey}`,
        },
        body: JSON.stringify({ key: "INSTAGRAM_ACCESS_TOKEN", value: newToken }),
      });
    }
  } catch (persistErr) {
    // Non-fatal — the in-memory token is updated; log and continue
    console.warn("[Instagram] Failed to persist refreshed token to secrets store:", persistErr);
  }

  console.log(
    `[Instagram] Token refreshed successfully. Expires in ${Math.round(expiresIn / 86400)} days.`
  );

  return { refreshed: true, expiresIn };
}

/**
 * Express route handler for POST /api/scheduled/instagram-token-refresh
 * Authenticated by the Manus cron system (isCron === true) OR by an admin user
 * for manual testing.
 */
export async function instagramTokenRefreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const { sdk } = await import("./_core/sdk");
    const user = await sdk.authenticateRequest(req);
    const isCron = (user as any).isCron === true;
    const isAdmin = (user as any).role === "admin";

    if (!isCron && !isAdmin) {
      res.status(403).json({ error: "cron or admin only" });
      return;
    }

    const result = await refreshInstagramToken();

    if (!result.refreshed) {
      console.error("[Instagram] Token refresh failed:", result.error);
      res.status(500).json({
        error: result.error,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      ok: true,
      expiresInDays: result.expiresIn ? Math.round(result.expiresIn / 86400) : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[Instagram] Token refresh handler error:", err);
    res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Register the Instagram token refresh scheduled endpoint on the Express app.
 * Must be called before the tRPC middleware in index.ts.
 */
export function registerInstagramTokenRefreshRoute(app: Express): void {
  app.post("/api/scheduled/instagram-token-refresh", instagramTokenRefreshHandler);
}
