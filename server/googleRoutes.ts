/**
 * Express routes for Google Business Profile OAuth flow
 * GET  /api/google/authorize  → redirects to Google OAuth consent screen
 * GET  /api/google/callback   → exchanges code for tokens, stores them, fetches business name
 * GET  /api/google/status     → returns connection status (public, no auth required)
 */
import type { Express } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { googleOAuthTokens } from "../drizzle/schema";
import { desc } from "drizzle-orm";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Scopes needed for Google Business Profile API
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

/**
 * Exchange an authorization code for access + refresh tokens,
 * then fetch the business name and persist everything to the DB.
 */
async function exchangeCodeAndSave(code: string): Promise<void> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: ENV.googleRedirectUri,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : new Date(Date.now() + 55 * 60 * 1000);

  // Try to fetch the Google Business Profile account name
  let businessName: string | null = null;
  let locationName: string | null = null;
  try {
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${data.access_token}` } }
    );
    if (accountsRes.ok) {
      const accountsData = (await accountsRes.json()) as {
        accounts?: Array<{ name: string; accountName: string; type: string }>;
      };
      const account = accountsData.accounts?.[0];
      if (account) {
        businessName = account.accountName;
        // Try to fetch the first location for this account
        try {
          const locRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
            { headers: { Authorization: `Bearer ${data.access_token}` } }
          );
          if (locRes.ok) {
            const locData = (await locRes.json()) as {
              locations?: Array<{ name: string; title: string }>;
            };
            const loc = locData.locations?.[0];
            if (loc) {
              locationName = loc.name;
              // Use the location title as the business name if available
              if (loc.title) businessName = loc.title;
            }
          }
        } catch {
          // Location fetch is best-effort
        }
      }
    }
  } catch {
    // Business name fetch is best-effort — don't fail the whole flow
  }

  await saveGoogleTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    scope: data.scope ?? null,
    businessName,
    locationName,
  });
}

interface GoogleTokenPayload {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
  businessName: string | null;
  locationName: string | null;
}

async function saveGoogleTokens(payload: GoogleTokenPayload): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Upsert: delete existing row and insert fresh one (single-account setup)
  await db.delete(googleOAuthTokens);
  await db.insert(googleOAuthTokens).values({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken ?? undefined,
    expiresAt: payload.expiresAt,
    scope: payload.scope ?? undefined,
    businessName: payload.businessName ?? undefined,
    locationName: payload.locationName ?? undefined,
  });
  console.log(`[Google] Tokens saved, expires at: ${payload.expiresAt.toISOString()}`);
}

export async function isGoogleConnected(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(googleOAuthTokens).limit(1);
  return rows.length > 0;
}

export async function getGoogleConnectionInfo(): Promise<{
  connected: boolean;
  businessName: string | null;
  locationName: string | null;
  expiresAt: Date | null;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(googleOAuthTokens)
    .orderBy(desc(googleOAuthTokens.updatedAt))
    .limit(1);
  if (rows.length === 0) return { connected: false, businessName: null, locationName: null, expiresAt: null };
  const row = rows[0];
  return {
    connected: true,
    businessName: row.businessName ?? null,
    locationName: row.locationName ?? null,
    expiresAt: row.expiresAt,
  };
}

export function registerGoogleRoutes(app: Express) {
  // Redirect to Google OAuth consent screen
  app.get("/api/google/authorize", (_req, res) => {
    const params = new URLSearchParams({
      client_id: ENV.googleClientId,
      redirect_uri: ENV.googleRedirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  // Google redirects here after user approves
  app.get("/api/google/callback", async (req, res) => {
    const code = req.query.code as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      console.error("[Google] OAuth error:", error);
      res.redirect(`/ops/settings?google=error&reason=${encodeURIComponent(error)}`);
      return;
    }

    if (!code) {
      res.status(400).send("Missing authorization code from Google.");
      return;
    }

    try {
      await exchangeCodeAndSave(code);
      res.redirect("/ops/settings?google=connected");
    } catch (err) {
      console.error("[Google] OAuth callback error:", err);
      res.redirect(
        `/ops/settings?google=error&reason=${encodeURIComponent(
          err instanceof Error ? err.message : String(err)
        )}`
      );
    }
  });

  // Status check endpoint (used by the Settings page on load)
  app.get("/api/google/status", async (_req, res) => {
    try {
      const info = await getGoogleConnectionInfo();
      res.json(info ?? { connected: false, businessName: null, locationName: null, expiresAt: null });
    } catch {
      res.json({ connected: false, businessName: null, locationName: null, expiresAt: null });
    }
  });
}
