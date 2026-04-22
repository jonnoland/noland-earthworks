/**
 * Jobber tRPC router — admin-only procedures for the admin console
 * Uses the existing jobber.ts helper for all API calls.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { isJobberConnected, jobberGraphQL } from "./jobber";
import { getDb, getJobNotes, addJobNote, deleteJobNote } from "./db";
import { jobberTokens, leadSourceTags } from "../drizzle/schema";
import { sql } from "drizzle-orm";

const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";

/**
 * Owner-only guard — only the site owner can call these procedures.
 * Primary check: openId matches OWNER_OPEN_ID env var.
 * Fallback (when OWNER_OPEN_ID is not injected or user has a secondary account): role must be admin.
 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access only." });
  }
  return next({ ctx });
});

export const jobberRouter = router({
  /** Returns whether Jobber is currently connected */
  connectionStatus: adminProcedure.query(async () => {
    const connected = await isJobberConnected();

    let expiresAt: Date | null = null;
    let accountName: string | null = null;
    let connectedAt: Date | null = null;
    try {
      const dbConn = await getDb();
      if (dbConn) {
        const rows = await dbConn.select().from(jobberTokens).limit(1);
        if (rows.length > 0) {
          expiresAt = rows[0]?.expiresAt ?? null;
          accountName = (rows[0] as any).accountName ?? null;
          connectedAt = (rows[0] as any).createdAt ?? null;
        }
      }
    } catch { /* ignore */ }
    return { connected, expiresAt, accountName, connectedAt };
  }),

  /** Disconnect Jobber by deleting stored tokens */
  disconnect: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    await db.delete(jobberTokens);
    return { success: true };
  }),

  /** Returns the Jobber OAuth authorization URL */
  getAuthUrl: adminProcedure.query(() => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: ENV.jobberClientId,
      redirect_uri: ENV.jobberRedirectUri,
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
              amounts { subtotal total invoiceBalance }
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

  // ─── Lead Source Tracking ─────────────────────────────────────────────────

  /** Set or update the lead source for a Jobber request */
  setLeadSource: protectedProcedure
    .input(z.object({
      jobberRequestId: z.string(),
      clientName: z.string().optional(),
      source: z.enum([
        "google_search", "google_maps", "facebook", "instagram",
        "word_of_mouth", "yard_sign", "truck_wrap", "website",
        "repeat_customer", "angi", "nextdoor", "other",
      ]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Upsert: insert or update on duplicate jobberRequestId
      await db
        .insert(leadSourceTags)
        .values({
          jobberRequestId: input.jobberRequestId,
          clientName: input.clientName ?? null,
          source: input.source,
          notes: input.notes ?? null,
        })
        .onDuplicateKeyUpdate({
          set: {
            source: input.source,
            clientName: input.clientName ?? null,
            notes: input.notes ?? null,
          },
        });
      return { success: true };
    }),

  /** Get all lead source tags */
  getLeadSources: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(leadSourceTags).orderBy(leadSourceTags.createdAt);
  }),

  // ─── Delete Mutations ───────────────────────────────────────────────────────

  /** Delete (or archive) a client from Jobber */
  deleteClient: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const data = await jobberGraphQL(`
          mutation DeleteClient($id: EncodedId!) {
            clientDelete(input: { id: $id }) {
              clientId
              userErrors { message path }
            }
          }
        `, { id: input.id }) as any;
        const errors = data?.clientDelete?.userErrors;
        if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0].message });
        return { success: true, deletedId: data?.clientDelete?.clientId };
      } catch (err: any) {
        // Fallback: if clientDelete doesn't exist in this API version, archive instead
        if (err?.message?.includes("clientDelete") || err?.message?.includes("Field")) {
          const archiveData = await jobberGraphQL(`
            mutation ArchiveClient($id: EncodedId!) {
              clientArchive(input: { id: $id }) {
                clientId
                userErrors { message path }
              }
            }
          `, { id: input.id }) as any;
          const archiveErrors = archiveData?.clientArchive?.userErrors;
          if (archiveErrors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: archiveErrors[0].message });
          return { success: true, deletedId: archiveData?.clientArchive?.clientId };
        }
        throw err;
      }
    }),

  /** Get full detail for a single Jobber quote */
  quoteDetail: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetQuoteDetail($id: EncodedId!) {
          quote(id: $id) {
            id quoteNumber title quoteStatus createdAt message
            amounts { subtotal total depositAmount }
            client { id name companyName phones { number } emails { address } }
            property { address { street1 city province postalCode } }
            lineItems {
              nodes {
                name description quantity unitPrice unitCost taxable
              }
            }
          }
        }
      `, { id: input.id }) as any;
      return data.quote ?? null;
    }),

  /** Delete a quote from Jobber */
  deleteQuote: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const data = await jobberGraphQL(`
        mutation DeleteQuote($id: EncodedId!) {
          quoteDelete(input: { id: $id }) {
            quoteId
            userErrors { message path }
          }
        }
      `, { id: input.id }) as any;
      const errors = data?.quoteDelete?.userErrors;
      if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0].message });
      return { success: true, deletedId: data?.quoteDelete?.quoteId };
    }),

  /** Delete a job from Jobber */
  deleteJob: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const data = await jobberGraphQL(`
        mutation DeleteJob($id: EncodedId!) {
          jobDelete(input: { id: $id }) {
            jobId
            userErrors { message path }
          }
        }
      `, { id: input.id }) as any;
      const errors = data?.jobDelete?.userErrors;
      if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0].message });
      return { success: true, deletedId: data?.jobDelete?.jobId };
    }),

  /** Delete an invoice from Jobber */
  deleteInvoice: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const data = await jobberGraphQL(`
        mutation DeleteInvoice($id: EncodedId!) {
          invoiceDelete(input: { id: $id }) {
            invoiceId
            userErrors { message path }
          }
        }
      `, { id: input.id }) as any;
      const errors = data?.invoiceDelete?.userErrors;
      if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0].message });
      return { success: true, deletedId: data?.invoiceDelete?.invoiceId };
    }),

  /** Delete a request from Jobber */
  deleteRequest: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const data = await jobberGraphQL(`
        mutation DeleteRequest($id: EncodedId!) {
          requestDelete(input: { id: $id }) {
            requestId
            userErrors { message path }
          }
        }
      `, { id: input.id }) as any;
      const errors = data?.requestDelete?.userErrors;
      if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0].message });
      return { success: true, deletedId: data?.requestDelete?.requestId };
    }),

  /** Get full invoice detail including line items */
  invoiceDetail: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetInvoiceDetail($id: EncodedId!) {
          invoice(id: $id) {
            id invoiceNumber invoiceStatus dueDate issuedDate createdAt subject message
            amounts { subtotal total invoiceBalance }
            client { id name companyName phones { number } emails { address } }
            property { address { street1 city province postalCode } }
            lineItems {
              nodes {
                name description quantity unitPrice unitCost taxable
              }
            }
          }
        }
      `, { id: input.id }) as any;
      return data.invoice ?? null;
    }),

  /** Convert an approved quote to a job in Jobber */
  quoteConvertToJob: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const data = await jobberGraphQL(`
        mutation ConvertQuoteToJob($id: EncodedId!) {
          quoteConvertToJob(input: { id: $id }) {
            job { id jobNumber title }
            userErrors { message path }
          }
        }
      `, { id: input.id }) as any;
      const errors = data?.quoteConvertToJob?.userErrors;
      if (errors?.length) throw new TRPCError({ code: "BAD_REQUEST", message: errors[0].message });
      return { success: true, job: data?.quoteConvertToJob?.job };
    }),

  /** Get full client detail: quotes, jobs, invoices, revenue, and balance */
  clientDetail: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetClientDetail($id: EncodedId!) {
          client(id: $id) {
            id name companyName isLead balance createdAt
            emails { address }
            phones { number description }
            billingAddress { street1 city province postalCode }
            quotes(first: 50) {
              nodes {
                id quoteNumber title quoteStatus createdAt
                amounts { subtotal total }
              }
            }
            jobs(first: 50) {
              nodes {
                id jobNumber title jobStatus startAt total
              }
            }
            invoices(first: 50) {
              nodes {
                id invoiceNumber title invoiceStatus dueDate
                amounts { total invoiceBalance }
              }
            }
          }
        }
      `, { id: input.id }) as any;
      return data.client ?? null;
    }),

  /** Get full detail for a single Jobber job */
  jobDetail: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetJobDetail($id: EncodedId!) {
          job(id: $id) {
            id jobNumber title jobStatus jobType total
            startAt endAt completedAt createdAt
            instructions
            client { id name companyName phones { number } emails { address } }
            property { address { street1 city province postalCode } }
            lineItems {
              nodes {
                name description quantity unitPrice unitCost taxable
              }
            }
            visits(first: 10) {
              nodes {
                id title startAt endAt isComplete
              }
            }
          }
        }
      `, { id: input.id }) as any;
      return data.job ?? null;
    }),

  /** Get job history: visits + invoices for the history timeline */
  jobHistory: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await jobberGraphQL(`
        query GetJobHistory($id: EncodedId!) {
          job(id: $id) {
            id jobNumber
            visits(first: 20) {
              nodes {
                id title startAt endAt isComplete
                assignedUsers { nodes { id name } }
              }
            }
            invoices(first: 10) {
              nodes {
                id invoiceNumber title invoiceStatus dueDate
                amounts { total }
              }
            }
          }
        }
      `, { id: input.id }) as any;
      return data.job ?? null;
    }),

  /** Create a draft invoice for a Jobber job */
  createInvoiceForJob: adminProcedure
    .input(z.object({
      jobId: z.string(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Fetch job to get client ID and title
      const jobData = await jobberGraphQL(`
        query GetJobForInvoice($id: EncodedId!) {
          job(id: $id) {
            id jobNumber title
            client { id }
          }
        }
      `, { id: input.jobId }) as any;
      const job = jobData.job;
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });

      const invoiceData = await jobberGraphQL(`
        mutation CreateInvoice($input: InvoiceCreateInput!) {
          invoiceCreate(input: $input) {
            invoice {
              id invoiceNumber invoiceStatus
            }
            userErrors { message }
          }
        }
      `, {
        input: {
          clientId: job.client.id,
          jobId: input.jobId,
          message: input.message ?? `Invoice for ${job.title ?? `Job #${job.jobNumber}`}`,
        }
      }) as any;

      const errors = invoiceData?.invoiceCreate?.userErrors;
      if (errors?.length) throw new TRPCError({ code: 'BAD_REQUEST', message: errors[0].message });
      return invoiceData?.invoiceCreate?.invoice ?? null;
    }),

  /** Get manual notes for a job (from local DB) */
  getJobNotes: adminProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      return getJobNotes(input.jobId);
    }),

  /** Add a manual note to a job's history timeline */
  addJobNote: adminProcedure
    .input(z.object({ jobId: z.string(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const row = await addJobNote(input.jobId, ctx.user.id, input.content);
      return row;
    }),

  /** Delete a manual job note */
  deleteJobNote: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteJobNote(input.id);
      return { success: true };
    }),

  /** Pull Products & Services catalog from Jobber */
  getJobberServices: adminProcedure.query(async () => {
    const connected = await isJobberConnected();
    if (!connected) return { nodes: [], totalCount: 0 };
    const data = await jobberGraphQL(`
      query GetProductsAndServices {
        productsAndServices(first: 200) {
          nodes {
            id
            name
            description
            defaultUnitCost
            internalUnitCost
            markup
            category
            taxable
            visible
            durationMinutes
            onlineBookingEnabled
          }
          totalCount
        }
      }
    `) as any;
    return data.productsAndServices ?? { nodes: [], totalCount: 0 };
  }),

  /** Create a new product/service in the Jobber catalog */
  createJobberService: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      defaultUnitCost: z.number().optional(),
      category: z.enum(["LABOR", "MATERIAL", "SERVICE", "EXPENSE"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const connected = await isJobberConnected();
      if (!connected) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Jobber not connected" });
      // Jobber API v2024-11-15 uses productOrServiceCreate
      const data = await jobberGraphQL(`
        mutation CreateProductOrService($input: ProductOrServiceCreateInput!) {
          productOrServiceCreate(input: $input) {
            productOrService {
              id
              name
              defaultUnitCost
            }
            userErrors { message }
          }
        }
      `, {
        input: {
          name: input.name,
          description: input.description ?? "",
          defaultUnitCost: input.defaultUnitCost ?? 0,
          category: input.category ?? "SERVICE",
          taxable: false,
          visible: true,
        }
      }) as any;
      const result = data?.productOrServiceCreate;
      if (result?.userErrors?.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.userErrors[0].message });
      }
      return result?.productOrService ?? null;
    }),

  /** Update the defaultUnitCost of an existing Jobber product/service */
  updateJobberServicePrice: adminProcedure
    .input(z.object({
      id: z.string(),
      defaultUnitCost: z.number(),
    }))
    .mutation(async ({ input }) => {
      const connected = await isJobberConnected();
      if (!connected) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Jobber not connected" });
      const data = await jobberGraphQL(`
        mutation UpdateProductOrServicePrice($id: EncodedId!, $input: ProductOrServiceUpdateInput!) {
          productOrServiceUpdate(id: $id, input: $input) {
            productOrService {
              id
              name
              defaultUnitCost
            }
            userErrors { message }
          }
        }
      `, {
        id: input.id,
        input: { defaultUnitCost: input.defaultUnitCost }
      }) as any;
      const result = data?.productOrServiceUpdate;
      if (result?.userErrors?.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.userErrors[0].message });
      }
      return result?.productOrService ?? null;
    }),

  /**
   * Fetch active services from the Noland Jobber Service Manager app.
   * This is a public endpoint on the service manager — no auth required.
   */
  fetchServicesFromManager: adminProcedure.query(async () => {
    const res = await fetch(
      "https://nolandjobber-c3cs6zr4.manus.space/api/trpc/jobber.listServices?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D",
      { headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch services from service manager" });
    const json = await res.json() as any;
    // tRPC batch response: [{ result: { data: { json: { services: [...] } } } }]
    const services = json?.[0]?.result?.data?.json?.services ?? json?.[0]?.result?.data?.json ?? [];
    return services as Array<{
      id: string;
      name: string;
      description: string;
      unitPrice: number;
      unitCost: number;
      category: string;
      taxable: boolean;
      active: boolean;
    }>;
  }),

  /**
   * Create a new quote in Jobber.
   * Requires an existing Jobber clientId and at least one line item.
   */
  quoteCreate: adminProcedure
    .input(z.object({
      clientId: z.string(),
      title: z.string().min(1),
      message: z.string().optional(),
      lineItems: z.array(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
        productOrServiceId: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ input }) => {
      const connected = await isJobberConnected();
      if (!connected) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Jobber not connected" });
      const lineItemsInput = input.lineItems.map(item => ({
        name: item.name,
        description: item.description ?? "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        ...(item.productOrServiceId ? { productOrServiceId: item.productOrServiceId } : {}),
      }));
      const data = await jobberGraphQL(`
        mutation CreateQuote($input: QuoteCreateInput!) {
          quoteCreate(input: $input) {
            quote {
              id
              quoteNumber
              title
              quoteStatus
              createdAt
              amounts { subtotal total }
              client { id name }
            }
            userErrors { message path }
          }
        }
      `, {
        input: {
          clientId: input.clientId,
          title: input.title,
          message: input.message ?? "",
          lineItems: lineItemsInput,
        }
      }) as any;
      const errors = data?.quoteCreate?.userErrors;
      if (errors?.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: errors.map((e: any) => e.message).join("; ") });
      }
      return data?.quoteCreate?.quote ?? null;
    }),

  /** Get aggregated lead source breakdown (count per source) */
  getLeadSourceBreakdown: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        source: leadSourceTags.source,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(leadSourceTags)
      .groupBy(leadSourceTags.source)
      .orderBy(sql`count(*) desc`);
    return rows;
  }),
});
