/**
 * Jobber API helper — OAuth token management + GraphQL query utilities
 * All functions are server-side only.
 */
import { getDb } from "./db";
import { jobberTokens } from "../drizzle/schema";
import { ENV } from "./_core/env";

const JOBBER_API_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";

// ─── Token Storage ───────────────────────────────────────────────────────────

export async function getStoredToken() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(jobberTokens).limit(1);
  return rows[0] ?? null;
}

export async function upsertToken(data: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + data.expiresIn * 1000);
  const existing = await getStoredToken();
  if (existing) {
    await db
      .update(jobberTokens)
      .set({ accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt });
  } else {
    await db.insert(jobberTokens).values({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt,
    });
  }
}

// ─── OAuth Flow ───────────────────────────────────────────────────────────────

export function getJobberAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ENV.jobberClientId,
    redirect_uri: redirectUri,
    state: "admin-connect",
  });
  return `${JOBBER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    client_id: ENV.jobberClientId,
    client_secret: ENV.jobberClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Jobber token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: ENV.jobberClientId,
    client_secret: ENV.jobberClientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Jobber token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

// ─── GraphQL Executor ─────────────────────────────────────────────────────────

export async function jobberQuery<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  let token = await getStoredToken();
  if (!token) throw new Error("Jobber not connected. Please connect via Admin > Settings.");

  // Auto-refresh if expired (with 60s buffer)
  if (token.expiresAt.getTime() - 60_000 < Date.now()) {
    const refreshed = await refreshAccessToken(token.refreshToken);
    await upsertToken({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresIn: refreshed.expires_in,
    });
    token = await getStoredToken();
  }

  const res = await fetch(JOBBER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token!.accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": "2025-01-20",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Jobber GraphQL request failed: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ─── Typed Query Helpers ──────────────────────────────────────────────────────

export async function fetchJobberJobs(first = 50) {
  const data = await jobberQuery<any>(`
    query GetJobs($first: Int) {
      jobs(first: $first) {
        nodes {
          id
          jobNumber
          title
          jobStatus
          jobType
          total
          startAt
          endAt
          completedAt
          createdAt
          client { id name companyName phones { number } }
          property { address { street1 city province postalCode } }
          visits(first: 5) { nodes { id startAt endAt status title } }
        }
        totalCount
      }
    }
  `, { first });
  return data.jobs;
}

export async function fetchJobberQuotes(first = 50) {
  const data = await jobberQuery<any>(`
    query GetQuotes($first: Int) {
      quotes(first: $first) {
        nodes {
          id
          quoteNumber
          title
          quoteStatus
          createdAt
          amounts { subtotal depositAmount total }
          client { id name companyName phones { number } }
          property { address { street1 city province postalCode } }
        }
        totalCount
      }
    }
  `, { first });
  return data.quotes;
}

export async function fetchJobberClients(first = 100) {
  const data = await jobberQuery<any>(`
    query GetClients($first: Int) {
      clients(first: $first) {
        nodes {
          id
          name
          companyName
          isLead
          balance
          createdAt
          emails { address }
          phones { number description }
          billingAddress { street1 city province postalCode }
        }
        totalCount
      }
    }
  `, { first });
  return data.clients;
}

export async function fetchJobberInvoices(first = 50) {
  const data = await jobberQuery<any>(`
    query GetInvoices($first: Int) {
      invoices(first: $first) {
        nodes {
          id
          invoiceNumber
          invoiceStatus
          dueDate
          issuedDate
          amounts { subtotal total invoiceBalance depositAmount }
          client { id name companyName }
          subject
          createdAt
        }
        totalCount
      }
    }
  `, { first });
  return data.invoices;
}

export async function fetchJobberRequests(first = 50) {
  const data = await jobberQuery<any>(`
    query GetRequests($first: Int) {
      requests(first: $first) {
        nodes {
          id
          title
          requestStatus
          source
          createdAt
          contactName
          phone
          email
          client { id name companyName }
          property { address { street1 city province postalCode } }
        }
        totalCount
      }
    }
  `, { first });
  return data.requests;
}

export async function fetchJobberTimesheets(first = 100) {
  const data = await jobberQuery<any>(`
    query GetTimesheets($first: Int) {
      timesheetEntries(first: $first) {
        nodes {
          id
          startAt
          endAt
          note
          durationInSeconds
          user { id name }
          job { id jobNumber title }
        }
        totalCount
      }
    }
  `, { first });
  return data.timesheetEntries;
}

export async function fetchJobberUsers() {
  const data = await jobberQuery<any>(`
    query GetUsers {
      users {
        nodes {
          id
          name
          email { raw }
          status
          isAccountOwner
          avatar { url }
        }
      }
    }
  `);
  return data.users;
}

export async function fetchJobberVisits(first = 50) {
  const data = await jobberQuery<any>(`
    query GetVisits($first: Int) {
      visits(first: $first) {
        nodes {
          id
          title
          startAt
          endAt
          status
          job { id jobNumber title client { name } }
          assignedUsers { nodes { id name } }
        }
        totalCount
      }
    }
  `, { first });
  return data.visits;
}
