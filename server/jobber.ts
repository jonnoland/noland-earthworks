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

/**
 * Decode the exp claim from a JWT without verifying the signature.
 * Falls back to 55 minutes from now if decoding fails.
 */
function getExpiresAtFromJwt(jwt: string): Date {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) throw new Error("No payload");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    if (decoded.exp && typeof decoded.exp === "number") {
      return new Date(decoded.exp * 1000);
    }
  } catch {
    // fall through
  }
  // Default: 55 minutes from now (Jobber tokens expire in 60 min)
  return new Date(Date.now() + 55 * 60 * 1000);
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.jobberClientId,
      client_secret: ENV.jobberClientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: ENV.jobberRedirectUri,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobber token exchange failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in?: number };
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : getExpiresAtFromJwt(data.access_token);
  await saveTokens(data.access_token, data.refresh_token, expiresAt);
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: ENV.jobberClientId,
      client_secret: ENV.jobberClientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jobber token refresh failed: ${res.status} ${text}`);
  }
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in?: number };
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : getExpiresAtFromJwt(data.access_token);
  await saveTokens(data.access_token, data.refresh_token, expiresAt);
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function saveTokens(accessToken: string, refreshToken: string, expiresAt: Date): Promise<void> {
  // Upsert: delete all existing rows and insert fresh one (single-account setup)
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(jobberTokens);
  await db.insert(jobberTokens).values({ accessToken, refreshToken, expiresAt });
  console.log(`[Jobber] Tokens saved, expires at: ${expiresAt.toISOString()}`);
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
  const rows = await db.select().from(jobberTokens).orderBy(desc(jobberTokens.updatedAt)).limit(1);
  if (rows.length === 0) return false;
  // Consider connected only if token is not expired (with 5-min buffer for refresh)
  // A token that is expired but has a refresh token is still usable — getValidAccessToken will refresh it.
  // Only return false if the token is expired AND we have no way to refresh (no refreshToken).
  const row = rows[0];
  const isExpired = row.expiresAt.getTime() - Date.now() < 0;
  if (isExpired && !row.refreshToken) return false;
  return true;
}

// ─── GraphQL helper ───────────────────────────────────────────────────────────

export async function jobberGraphQL(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  let token: string;
  try {
    token = await getValidAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Wrap token errors in a clean message so callers get a useful TRPC error
    throw new Error(`Jobber not connected or token expired: ${msg}`);
  }
  const res = await fetch(JOBBER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
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

// ─── Background token refresh scheduler ─────────────────────────────────────

/**
 * How far in advance to proactively refresh the token.
 * The reactive path in getValidAccessToken uses 5 min;
 * the background scheduler uses a wider 10-minute window so it
 * almost always fires before any request needs the token.
 */
const PROACTIVE_REFRESH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * How often the background scheduler wakes up to check token health.
 * Jobber tokens expire in ~60 minutes, so checking every 5 minutes
 * gives plenty of lead time without hammering the DB.
 */
const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Attempt a proactive token refresh if the stored token is within
 * PROACTIVE_REFRESH_WINDOW_MS of expiry. Safe to call at any time;
 * logs but does not throw on failure so the scheduler never crashes.
 */
export async function proactiveTokenRefreshIfNeeded(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return; // DB not ready yet — skip silently
    const rows = await db
      .select()
      .from(jobberTokens)
      .orderBy(desc(jobberTokens.updatedAt))
      .limit(1);
    if (rows.length === 0) return; // Not connected — nothing to refresh

    const row = rows[0];
    const msUntilExpiry = row.expiresAt.getTime() - Date.now();

    if (msUntilExpiry > PROACTIVE_REFRESH_WINDOW_MS) {
      // Token is healthy — no action needed
      return;
    }

    if (msUntilExpiry <= 0) {
      console.warn("[Jobber] Token already expired — attempting emergency refresh");
    } else {
      const minsLeft = Math.round(msUntilExpiry / 60_000);
      console.log(`[Jobber] Token expires in ${minsLeft} min — proactively refreshing`);
    }

    await refreshAccessToken(row.refreshToken);
    console.log("[Jobber] Proactive token refresh succeeded");
  } catch (err) {
    // Log but do not rethrow — a failed background refresh is not fatal;
    // the reactive path in getValidAccessToken will retry on the next API call.
    console.error("[Jobber] Proactive token refresh failed:", err instanceof Error ? err.message : String(err));
  }
}

/**
 * Start the background scheduler that checks token health every
 * SCHEDULER_INTERVAL_MS. Idempotent — safe to call multiple times;
 * only one interval will run at a time.
 */
export function startJobberTokenRefreshScheduler(): void {
  if (schedulerTimer !== null) return; // Already running

  // Run once immediately on startup to catch any token that expired
  // while the server was offline.
  proactiveTokenRefreshIfNeeded().catch(() => {/* already logged inside */});

  schedulerTimer = setInterval(() => {
    proactiveTokenRefreshIfNeeded().catch(() => {/* already logged inside */});
  }, SCHEDULER_INTERVAL_MS);

  // Allow Node to exit cleanly even if the interval is still running
  if (schedulerTimer.unref) schedulerTimer.unref();

  console.log(`[Jobber] Token refresh scheduler started (interval: ${SCHEDULER_INTERVAL_MS / 60_000} min)`);
}

/**
 * Stop the background scheduler. Primarily used in tests to avoid
 * open handles after the test suite finishes.
 */
export function stopJobberTokenRefreshScheduler(): void {
  if (schedulerTimer !== null) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

// ─── Business logic ───────────────────────────────────────────────────────────

interface QuoteFormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  county: string;
  acreage?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  message?: string;
}

/** Build an AddressAttributes object if any address field is present. */
function buildAddressAttributes(data: QuoteFormData): Record<string, string> | null {
  const { street, city, state, zip } = data;
  if (!street && !city && !zip) return null;
  const addr: Record<string, string> = { country: "US" };
  if (street) addr.street1 = street;
  if (city) addr.city = city;
  if (state) addr.province = state;
  if (zip) addr.postalCode = zip;
  return addr;
}

/**
 * Search for an existing Jobber client by email address.
 * Returns the client ID if found, null otherwise.
 */
async function findClientByEmail(email: string): Promise<string | null> {
  // Skip search for placeholder emails
  if (!email || email === "(not provided)" || !email.includes("@")) return null;

  const searchQuery = `
    query FindClientByEmail($searchTerm: String!) {
      clientEmails(searchTerm: $searchTerm, first: 1) {
        nodes {
          address
          client {
            id
          }
        }
      }
    }
  `;
  try {
    const result = await jobberGraphQL(searchQuery, { searchTerm: email }) as {
      clientEmails: { nodes: Array<{ address: string; client: { id: string } }> };
    };
    // Exact match only — avoid partial matches on similar addresses
    const match = result.clientEmails.nodes.find(
      n => n.address.toLowerCase() === email.toLowerCase()
    );
    return match?.client.id ?? null;
  } catch {
    // If search fails, fall through to create a new client
    return null;
  }
}

/**
 * Normalize a phone number to digits only for comparison.
 * Strips spaces, dashes, parentheses, and leading US country code.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Strip leading 1 (US country code) if 11 digits
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/**
 * Search for an existing Jobber client by phone number.
 * Used as a fallback when email lookup returns null.
 * Returns the client ID if an exact normalized match is found, null otherwise.
 */
async function findClientByPhone(phone: string): Promise<string | null> {
  if (!phone || phone === "(not provided)") return null;
  const normalizedInput = normalizePhone(phone);
  if (normalizedInput.length < 7) return null;

  const searchQuery = `
    query FindClientByPhone($searchTerm: String!) {
      clientPhones(searchTerm: $searchTerm, first: 5) {
        nodes {
          number
          client {
            id
          }
        }
      }
    }
  `;
  try {
    const result = await jobberGraphQL(searchQuery, { searchTerm: phone }) as {
      clientPhones: { nodes: Array<{ number: string; client: { id: string } }> };
    };
    // Exact normalized match only — avoid false positives from partial matches
    const match = result.clientPhones.nodes.find(
      n => normalizePhone(n.number) === normalizedInput
    );
    return match?.client.id ?? null;
  } catch {
    // If search fails, fall through to create a new client
    return null;
  }
}

// Map website service names to Jobber line item names
const SERVICE_LINE_ITEMS: Record<string, string> = {
  "Land Management": "Land Management",
  "Forestry Mulching": "Forestry Mulching",
  "Vegetation Management": "Vegetation Management",
  "Property Maintenance": "Property Maintenance",
  "Trail Cutting": "Trail Cutting",
  "Multiple Services": "Multiple Services",
};

export interface JobberRequestResult {
  requestId: string;
  requestUrl: string;
}

export async function createJobberRequest(data: QuoteFormData): Promise<JobberRequestResult> {
  // Split name into first/last (best effort)
  const nameParts = data.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? data.name;
  const lastName = nameParts.slice(1).join(" ") || "";

  // 1. Search for existing client by email, then phone, to avoid duplicates
  let clientId = await findClientByEmail(data.email);

  if (clientId) {
    console.log(`[Jobber] Found existing client by email: ${clientId}`);
  } else {
    // Fallback: try phone-based lookup
    clientId = await findClientByPhone(data.phone);
    if (clientId) {
      console.log(`[Jobber] Found existing client by phone: ${clientId}`);
    }
  }

  if (!clientId) {
    // Create a new client
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
    // Attach property address if provided
    const addrAttrs = buildAddressAttributes(data);
    if (addrAttrs) {
      clientInput.properties = [{ address: addrAttrs }];
    }

    const clientData = await jobberGraphQL(clientMutation, { input: clientInput }) as {
      clientCreate: { client: { id: string } | null; userErrors: Array<{ message: string }> };
    };

    if (!clientData.clientCreate.client) {
      const errs = clientData.clientCreate.userErrors.map(e => e.message).join(", ");
      throw new Error(`Jobber clientCreate failed: ${errs}`);
    }

    clientId = clientData.clientCreate.client.id;
    console.log(`[Jobber] Created new client: ${clientId}`);
  }

  // 2. Build request title and description
  const title = `${data.service} — ${data.county} County`;
  const addressLine = [data.street, [data.city, data.state, data.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const descParts = [
    `Service: ${data.service}`,
    `County: ${data.county} County`,
    data.acreage ? `Acreage: ${data.acreage}` : "",
    addressLine ? `Property Address: ${addressLine}` : "",
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

  // 4. Build line items from the service type
  const lineItemName = SERVICE_LINE_ITEMS[data.service] ?? data.service;
  const lineItems = [
    {
      name: lineItemName,
      description: data.acreage ? `Approximate acreage: ${data.acreage}` : undefined,
      category: "SERVICE" as const,
      saveToProductsAndServices: false,
      quantity: 1,
    },
  ];

  const requestData = await jobberGraphQL(requestMutation, {
    input: {
      clientId,
      title,
      assessment: {
        instructions: description,
      },
      lineItems,
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
  return {
    requestId: requestData.requestCreate.request.id,
    requestUrl: requestData.requestCreate.request.jobberWebUri,
  };
}

/**
 * Create (or find existing) Jobber client from a lead.
 * Used when a new lead comes in from any source to ensure they appear in the Clients list.
 * Returns the Jobber client ID, or null if Jobber is not connected or creation fails.
 */
export async function createJobberClientFromLead(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<string | null> {
  try {
    const connected = await isJobberConnected();
    if (!connected) return null;

    const nameParts = data.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? data.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Check for existing client first to avoid duplicates
    let clientId: string | null = null;
    if (data.email) {
      clientId = await findClientByEmail(data.email);
    }
    if (!clientId && data.phone) {
      clientId = await findClientByPhone(data.phone);
    }
    if (clientId) {
      console.log(`[Jobber] Lead already exists as client: ${clientId}`);
      return clientId;
    }

    // Build client input
    const clientInput: Record<string, unknown> = { firstName };
    if (lastName) clientInput.lastName = lastName;
    if (data.email) {
      clientInput.emails = [{ description: "MAIN", primary: true, address: data.email }];
    }
    if (data.phone) {
      clientInput.phones = [{ description: "MAIN", primary: true, number: data.phone }];
    }
    if (data.address) {
      // Best-effort parse: treat the whole string as street line 1
      clientInput.properties = [{ address: { street1: data.address } }];
    }

    const clientMutation = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client { id }
          userErrors { message }
        }
      }
    `;
    const result = await jobberGraphQL(clientMutation, { input: clientInput }) as {
      clientCreate: { client: { id: string } | null; userErrors: Array<{ message: string }> };
    };
    if (!result.clientCreate.client) {
      const errs = result.clientCreate.userErrors.map(e => e.message).join(", ");
      console.warn(`[Jobber] createJobberClientFromLead failed: ${errs}`);
      return null;
    }
    console.log(`[Jobber] Created client from lead: ${result.clientCreate.client.id}`);
    return result.clientCreate.client.id;
  } catch (err) {
    console.warn("[Jobber] createJobberClientFromLead error:", err);
    return null;
  }
}
