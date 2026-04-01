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
      redirect_uri: "https://www.nolandearthworks.com/api/jobber/callback",
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
  const rows = await db.select().from(jobberTokens).limit(1);
  return rows.length > 0;
}

// ─── GraphQL helper ───────────────────────────────────────────────────────────

export async function jobberGraphQL(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const token = await getValidAccessToken();
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

// Map website service names to Jobber line item names
const SERVICE_LINE_ITEMS: Record<string, string> = {
  "Land Clearing": "Land Clearing",
  "Forestry Mulching": "Forestry Mulching",
  "Vegetation Management": "Vegetation Management",
  "Property Maintenance": "Property Maintenance",
  "Multiple Services": "Multiple Services",
};

export async function createJobberRequest(data: QuoteFormData): Promise<void> {
  // Split name into first/last (best effort)
  const nameParts = data.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? data.name;
  const lastName = nameParts.slice(1).join(" ") || "";

  // 1. Search for existing client by email to avoid duplicates
  let clientId = await findClientByEmail(data.email);

  if (clientId) {
    console.log(`[Jobber] Found existing client: ${clientId}`);
  } else {
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
}
