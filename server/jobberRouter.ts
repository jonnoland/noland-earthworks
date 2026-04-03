/**
 * Jobber tRPC router — admin-only procedures for the admin console
 * Uses the existing jobber.ts helper for all API calls.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { isJobberConnected, jobberGraphQL } from "./jobber";
import { getDb } from "./db";
import { jobberTokens } from "../drizzle/schema";

const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";

// Admin-only guard: only the site owner can call these procedures
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access only." });
  }
  return next({ ctx });
});

export const jobberRouter = router({
  /** Returns whether Jobber is currently connected */
  connectionStatus: adminProcedure.query(async () => {
    const connected = await isJobberConnected();
    const db = await getDb();
    let expiresAt: Date | null = null;
    if (db && connected) {
      const rows = await db.select().from(jobberTokens).limit(1);
      expiresAt = rows[0]?.expiresAt ?? null;
    }
    return { connected, expiresAt };
  }),

  /** Returns the Jobber OAuth authorization URL */
  getAuthUrl: adminProcedure.query(() => {
    const redirectUri = "https://www.nolandearthworks.com/api/jobber/callback";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: ENV.jobberClientId,
      redirect_uri: redirectUri,
      state: "admin-connect",
    });
    return { url: `${JOBBER_AUTH_URL}?${params.toString()}` };
  }),

  // ─── Jobs ────────────────────────────────────────────────────────────────────
  jobs: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetJobs($first: Int) {
          jobs(first: $first) {
            nodes {
              id jobNumber title jobStatus jobType total
              startAt endAt completedAt createdAt
              client { id name companyName phones { number } }
              property { address { street1 city province postalCode } }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 50 }) as any;
      return data.jobs;
    }),

  // ─── Quotes ──────────────────────────────────────────────────────────────────
  quotes: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetQuotes($first: Int) {
          quotes(first: $first) {
            nodes {
              id quoteNumber title quoteStatus createdAt
              amounts { subtotal total }
              client { id name companyName phones { number } }
              property { address { street1 city province postalCode } }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 50 }) as any;
      return data.quotes;
    }),

  // ─── Clients ─────────────────────────────────────────────────────────────────
  clients: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetClients($first: Int) {
          clients(first: $first) {
            nodes {
              id name companyName isLead balance createdAt
              emails { address }
              phones { number description }
              billingAddress { street1 city province postalCode }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 100 }) as any;
      return data.clients;
    }),

  // ─── Invoices ────────────────────────────────────────────────────────────────
  invoices: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetInvoices($first: Int) {
          invoices(first: $first) {
            nodes {
              id invoiceNumber invoiceStatus dueDate issuedDate createdAt subject
              amounts { subtotal total outstanding }
              client { id name companyName }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 50 }) as any;
      return data.invoices;
    }),

  // ─── Requests (Leads) ────────────────────────────────────────────────────────
  requests: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetRequests($first: Int) {
          requests(first: $first) {
            nodes {
              id title requestStatus source createdAt
              contactName phone email
              client { id name companyName }
              property { address { street1 city province postalCode } }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 50 }) as any;
      return data.requests;
    }),

  // ─── Timesheets ──────────────────────────────────────────────────────────────
  timesheets: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetTimesheets($first: Int) {
          timesheetEntries(first: $first) {
            nodes {
              id startAt endAt note durationInSeconds
              user { id name }
              job { id jobNumber title }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 100 }) as any;
      return data.timesheetEntries;
    }),

  // ─── Users (Crews) ───────────────────────────────────────────────────────────
  users: adminProcedure.query(async () => {
    const data = await jobberGraphQL(`
      query GetUsers {
        users {
          nodes {
            id name status isAccountOwner
            email { raw }
          }
        }
      }
    `) as any;
    return data.users;
  }),

  // ─── Visits (Schedule) ───────────────────────────────────────────────────────
  visits: adminProcedure
    .input(z.object({ first: z.number().optional() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetVisits($first: Int) {
          visits(first: $first) {
            nodes {
              id title startAt endAt status
              job { id jobNumber title client { name } }
              assignedUsers { nodes { id name } }
            }
            totalCount
          }
        }
      `, { first: input.first ?? 100 }) as any;
      return data.visits;
    }),
});
