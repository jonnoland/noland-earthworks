/**
 * Jobber API integration
 * - OAuth token management (exchange, refresh, store)
 * - GraphQL helpers: clientCreate, requestCreate
 */
import { getDb } from "./db";
import { jobberTokens } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { desc } from "drizzle-orm";

const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: ENV.jobberClientId,
      client_secret: ENV.jobberClientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobber token exchange failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  await saveTokens(data.access_token, data.refresh_token, data.expires_in);
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: ENV.jobberClientId,
      client_secret: ENV.jobberClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobber token refresh failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  await saveTokens(data.access_token, data.refresh_token, data.expires_in);
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function saveTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  // Upsert: delete all existing rows and insert fresh one (single-account setup)
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobberTokens);
  await db.insert(jobberTokens).values({ accessToken, refreshToken, expiresAt });
}

async function getValidAccessToken(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(jobberTokens).orderBy(desc(jobberTokens.updatedAt)).limit(1);
  if (rows.length === 0) {
    throw new Error("Jobber not connected. Please authorize via /api/jobber/authorize.");
  }
  const row = rows[0];
  // Refresh if token expires within 5 minutes
  if (row.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { accessToken } = await refreshAccessToken(row.refreshToken);
    return accessToken;
  }
  return row.accessToken;
}

export async function isJobberConnected(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(jobberTokens).limit(1);
  return rows.length > 0;
}

// ─── GraphQL helper ───────────────────────────────────────────────────────────

async function jobberGraphQL(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const token = await getValidAccessToken();
  const res = await fetch(JOBBER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2024-11-15",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobber GraphQL HTTP error: ${res.status} ${text}`);
  }
  const json = await res.json() as { data?: unknown; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Jobber GraphQL error: ${json.errors.map(e => e.message).join(", ")}`);
  }
  return json.data;
}

// ─── Business logic ───────────────────────────────────────────────────────────

interface QuoteFormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  county: string;
  acreage?: string;
  message?: string;
}

export async function createJobberRequest(data: QuoteFormData): Promise<void> {
  // Split name into first/last (best effort)
  const nameParts = data.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? data.name;
  const lastName = nameParts.slice(1).join(" ") || "";

  // 1. Create the client
  const clientMutation = `
    mutation CreateClient($input: ClientCreateInput!) {
      clientCreate(input: $input) {
        client {
          id
        }
        userErrors {
          message
          path
        }
      }
    }
  `;

  const clientInput: Record<string, unknown> = {
    firstName,
    emails: [{ description: "MAIN", primary: true, address: data.email }],
    phones: [{ description: "MAIN", primary: true, number: data.phone }],
  };
  if (lastName) clientInput.lastName = lastName;

  const clientData = await jobberGraphQL(clientMutation, { input: clientInput }) as {
    clientCreate: { client: { id: string } | null; userErrors: Array<{ message: string }> };
  };

  if (!clientData.clientCreate.client) {
    const errs = clientData.clientCreate.userErrors.map(e => e.message).join(", ");
    throw new Error(`Jobber clientCreate failed: ${errs}`);
  }

  const clientId = clientData.clientCreate.client.id;

  // 2. Build request title and description
  const title = `${data.service} — ${data.county} County`;
  const descParts = [
    `Service: ${data.service}`,
    `County: ${data.county} County`,
    data.acreage ? `Acreage: ${data.acreage}` : "",
    data.message ? `\nProject Details:\n${data.message}` : "",
  ].filter(Boolean);
  const description = descParts.join("\n");

  // 3. Create the request
  const requestMutation = `
    mutation CreateRequest($input: RequestCreateInput!) {
      requestCreate(input: $input) {
        request {
          id
          jobberWebUri
        }
        userErrors {
          message
          path
        }
      }
    }
  `;

  const requestData = await jobberGraphQL(requestMutation, {
    input: {
      clientId,
      title,
      instructions: description,
    },
  }) as {
    requestCreate: {
      request: { id: string; jobberWebUri: string } | null;
      userErrors: Array<{ message: string }>;
    };
  };

  if (!requestData.requestCreate.request) {
    const errs = requestData.requestCreate.userErrors.map(e => e.message).join(", ");
    throw new Error(`Jobber requestCreate failed: ${errs}`);
  }

  console.log(`[Jobber] Created request: ${requestData.requestCreate.request.jobberWebUri}`);
}
