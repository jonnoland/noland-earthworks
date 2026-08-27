/**
 * nativeJobsRouter — native job management
 *
 * Covers the full job lifecycle after a quote is converted:
 *   list            — paginated list with search/status filter
 *   getById         — single job
 *   update          — edit status, schedule, notes, etc.
 *   delete          — hard delete
 *   generateInvoice — build HTML invoice, store in S3, optionally email client
 *   listInvoices    — list invoices for a job (or all)
 *   markInvoicePaid — mark invoice as paid
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nativeJobs, nativeInvoices, nativeQuotes } from "../drizzle/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

// ─── Owner guard ──────────────────────────────────────────────────────────────
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

// ─── Router ────────────────────────────────────────────────────────────────────

export const nativeJobsRouter = router({
  /**
   * List all native jobs with optional search and status filter.
   */
  list: ownerProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["all", "scheduled", "in_progress", "completed", "cancelled"]).optional().default("all"),
        limit: z.number().int().min(1).max(200).optional().default(100),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(nativeJobs.status, input.status as "scheduled" | "in_progress" | "completed" | "cancelled"));
      }

      if (input.search) {
        const term = `%${input.search}%`;
        conditions.push(
          or(
            like(nativeJobs.clientName, term),
            like(nativeJobs.propertyAddress, term),
            like(nativeJobs.serviceType, term),
            like(nativeJobs.clientEmail, term),
            like(nativeJobs.clientPhone, term)
          )
        );
      }

      const rows = await db
        .select()
        .from(nativeJobs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(nativeJobs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  /**
   * Get a single job by ID.
   */
  getById: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [job] = await db
        .select()
        .from(nativeJobs)
        .where(eq(nativeJobs.id, input.id))
        .limit(1);

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      return job;
    }),

  /**
   * Update a job's status, scheduled date, completion date, or notes.
   */
  update: ownerProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
        scheduledDate: z.date().nullable().optional(),
        completedAt: z.date().nullable().optional(),
        internalNotes: z.string().max(5000).optional(),
        clientName: z.string().max(255).optional(),
        clientEmail: z.string().max(255).optional(),
        clientPhone: z.string().max(30).optional(),
        propertyAddress: z.string().max(500).optional(),
        serviceType: z.string().max(100).optional(),
        acreage: z.string().max(50).optional(),
        totalCents: z.number().int().min(0).optional(),
        lineItems: z.string().optional(),
        paidCents: z.number().int().min(0).nullable().optional(),
        paidAt: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...fields } = input;

      // Auto-set completedAt when status changes to completed
      const updateData: Record<string, unknown> = { ...fields };
      if (fields.status === "completed" && fields.completedAt === undefined) {
        updateData.completedAt = new Date();
      }

      await db
        .update(nativeJobs)
        .set(updateData as Partial<typeof nativeJobs.$inferInsert>)
        .where(eq(nativeJobs.id, id));

      const [updated] = await db
        .select()
        .from(nativeJobs)
        .where(eq(nativeJobs.id, id))
        .limit(1);

      return updated;
    }),

  /**
   * Delete a job.
   */
  delete: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(nativeJobs).where(eq(nativeJobs.id, input.id));
      return { success: true };
    }),

  /**
   * Generate an HTML invoice for a completed job and optionally email it to the client.
   * Returns the invoice record.
   */
  generateInvoice: ownerProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        sendEmail: z.boolean().optional().default(false),
        notes: z.string().max(2000).optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db
        .select()
        .from(nativeJobs)
        .where(eq(nativeJobs.id, input.jobId))
        .limit(1);

      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      if (job.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Mark the job complete before sending the final payment invoice.",
        });
      }

      const [existingInvoice] = await db
        .select({ id: nativeInvoices.id })
        .from(nativeInvoices)
        .where(eq(nativeInvoices.jobId, job.id))
        .limit(1);

      if (existingInvoice) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A final invoice has already been created for this job.",
        });
      }

      // Load deposit info from the source quote
      let depositPaidCents = 0;
      if (job.quoteId) {
        const [quote] = await db
          .select({ depositPaidCents: nativeQuotes.depositPaidCents })
          .from(nativeQuotes)
          .where(eq(nativeQuotes.id, job.quoteId))
          .limit(1);
        depositPaidCents = quote?.depositPaidCents ?? 0;
      }

      const lineItems: Array<{ description: string; qty: number; unitPriceCents: number; totalCents: number; measurementUnit?: "linear_foot" }> =
        JSON.parse(job.lineItems || "[]");

      const subtotalCents = lineItems.reduce((sum, li) => sum + li.totalCents, 0) || job.totalCents;
      const totalCents = Math.max(0, subtotalCents - depositPaidCents);

      // Build invoice number from count
      const allInvoices = await db.select({ id: nativeInvoices.id }).from(nativeInvoices);
      const invoiceNumber = `INV-${String(allInvoices.length + 1).padStart(4, "0")}`;

      // Build and upload the HTML invoice
      const invoiceHtml = buildInvoiceHtml({
        invoiceNumber,
        job,
        lineItems,
        subtotalCents,
        depositPaidCents,
        totalCents,
        notes: input.notes,
        dueDate: input.dueDate,
      });

      const htmlBuffer = Buffer.from(invoiceHtml, "utf8");
      const fileKey = `invoices/${job.id}-${Date.now()}.html`;
      const { url: pdfUrl } = await storagePut(fileKey, htmlBuffer, "text/html");

      // Insert invoice record
      const inserted = await db
        .insert(nativeInvoices)
        .values({
          jobId: job.id,
          quoteId: job.quoteId ?? undefined,
          clientName: job.clientName,
          clientEmail: job.clientEmail ?? undefined,
          clientPhone: job.clientPhone ?? undefined,
          propertyAddress: job.propertyAddress ?? undefined,
          serviceType: job.serviceType ?? undefined,
          lineItems: job.lineItems,
          subtotalCents,
          depositPaidCents,
          totalCents,
          status: "unpaid",
          pdfUrl,
          dueDate: input.dueDate,
          notes: input.notes,
        });

      const invoiceId = (inserted as unknown as { insertId: number }).insertId;

      // Mark job as invoiced
      await db
        .update(nativeJobs)
        .set({ invoicedCents: totalCents, invoicedAt: new Date() })
        .where(eq(nativeJobs.id, job.id));

      // Email the final-payment invoice when requested.
      let emailSent = false;
      let emailSendError: string | undefined;
      if (input.sendEmail && job.clientEmail && ENV.resendApiKey) {
        try {
          const emailHtml = buildInvoiceEmailHtml({
            invoiceNumber,
            job,
            lineItems,
            subtotalCents,
            depositPaidCents,
            totalCents,
            pdfUrl,
            notes: input.notes,
            dueDate: input.dueDate,
          });

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ENV.resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Noland Earthworks <quotes@nolandearthworks.com>",
              to: job.clientEmail,
              subject: `Invoice ${invoiceNumber} — Noland Earthworks`,
              html: emailHtml,
            }),
          });

          const resData = await res.json() as { id?: string; message?: string };
          if (!res.ok || !resData.id) {
            throw new Error(resData.message || "Email provider did not accept the invoice.");
          }
          const emailSentId = resData.id;

          await db
            .update(nativeInvoices)
            .set({ emailSentId, emailSentAt: new Date(), status: "sent" })
            .where(eq(nativeInvoices.id, invoiceId));
          emailSent = true;
        } catch (err) {
          console.error("[Invoice] Failed to send email:", err);
          emailSendError = err instanceof Error ? err.message : "The invoice was created, but the email could not be sent.";
        }
      } else if (input.sendEmail) {
        emailSendError = job.clientEmail
          ? "Email delivery is not configured. The invoice was created but not sent."
          : "This job has no customer email address. The invoice was created but not sent.";
      }

      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, invoiceId))
        .limit(1);

      return { ...invoice, emailSent, emailSendError };
    }),

  /**
   * List invoices — optionally filtered by job.
   */
  listInvoices: ownerProcedure
    .input(z.object({ jobId: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const rows = await db
        .select()
        .from(nativeInvoices)
        .where(input.jobId ? eq(nativeInvoices.jobId, input.jobId) : undefined)
        .orderBy(desc(nativeInvoices.createdAt));
      return rows;
    }),

  /**
   * Mark an invoice as paid and update the parent job.
   */
  markInvoicePaid: ownerProcedure
    .input(z.object({ invoiceId: z.number().int(), paidCents: z.number().int().min(0).optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      const paidCents = input.paidCents ?? invoice.totalCents;
      const paidAt = new Date();

      await db
        .update(nativeInvoices)
        .set({ status: "paid", paidAt })
        .where(eq(nativeInvoices.id, input.invoiceId));

      await db
        .update(nativeJobs)
        .set({ paidCents, paidAt })
        .where(eq(nativeJobs.id, invoice.jobId));

      return { success: true };
    }),
});

// ─── HTML Builders ─────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface InvoiceParams {
  invoiceNumber: string;
  job: {
    clientName: string;
    clientEmail?: string | null;
    clientPhone?: string | null;
    propertyAddress?: string | null;
    serviceType?: string | null;
    acreage?: string | null;
    completedAt?: Date | null;
    scheduledDate?: Date | null;
  };
  lineItems: Array<{ description: string; qty: number; unitPriceCents: number; totalCents: number; measurementUnit?: "linear_foot" }>;
  subtotalCents: number;
  depositPaidCents: number;
  totalCents: number;
  notes?: string;
  dueDate?: Date;
}

function buildInvoiceHtml(p: InvoiceParams): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const issuedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const jobDate = (p.job.completedAt ?? p.job.scheduledDate)?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) ?? "—";
  const dueStr = p.dueDate?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) ?? "Upon receipt";

  const lineItemRows = p.lineItems.map(li => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;font-size:14px;color:#1a1a1a;">${esc(li.description)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;font-size:14px;color:#1a1a1a;text-align:center;">${li.qty}${li.measurementUnit === "linear_foot" ? " linear ft" : ""}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;font-size:14px;color:#1a1a1a;text-align:right;">${fmt(li.unitPriceCents)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;font-size:14px;color:#1a1a1a;text-align:right;font-weight:600;">${fmt(li.totalCents)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${esc(p.invoiceNumber)} — Noland Earthworks</title>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
      .page { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
    }
    body { margin: 0; padding: 32px 16px; background: #f4f1ec; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .page { max-width: 800px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.10); }
  </style>
</head>
<body>
  <div class="page">
    <div style="background:#E07B2A;height:5px;"></div>
    <div style="background:#1a1a1a;padding:28px 36px;display:flex;justify-content:space-between;align-items:center;">
      <img src="${logoUrl}" alt="Noland Earthworks" height="52" style="display:block;" />
      <div style="text-align:right;">
        <div style="display:inline-block;background:#E07B2A;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:4px;">Invoice</div>
        <div style="color:#aaa;font-size:13px;margin-top:8px;">${esc(p.invoiceNumber)}</div>
      </div>
    </div>
    <div style="padding:24px 36px;display:flex;gap:32px;flex-wrap:wrap;border-bottom:1px solid #f0ede6;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;margin-bottom:4px;">Bill To</div>
        <div style="font-size:15px;font-weight:700;color:#1a1a1a;">${esc(p.job.clientName)}</div>
        ${p.job.clientEmail ? `<div style="font-size:13px;color:#555;">${esc(p.job.clientEmail)}</div>` : ""}
        ${p.job.clientPhone ? `<div style="font-size:13px;color:#555;">${esc(p.job.clientPhone)}</div>` : ""}
        ${p.job.propertyAddress ? `<div style="font-size:13px;color:#555;margin-top:4px;">${esc(p.job.propertyAddress)}</div>` : ""}
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;margin-bottom:4px;">Invoice Date</div>
        <div style="font-size:14px;color:#1a1a1a;">${issuedDate}</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;margin-top:12px;margin-bottom:4px;">Job Date</div>
        <div style="font-size:14px;color:#1a1a1a;">${jobDate}</div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;margin-top:12px;margin-bottom:4px;">Payment Due</div>
        <div style="font-size:14px;color:#1a1a1a;font-weight:600;">${dueStr}</div>
      </div>
    </div>
    ${p.job.serviceType || p.job.acreage ? `
    <div style="padding:16px 36px;background:#fdf6ee;border-bottom:1px solid #f0e4cc;">
      <span style="font-size:13px;color:#7a4f1a;">
        <strong>Service:</strong> ${esc(p.job.serviceType ?? "Land Management")}
        ${p.job.acreage ? ` &nbsp;&bull;&nbsp; <strong>Acreage:</strong> ${esc(p.job.acreage)} acres` : ""}
      </span>
    </div>` : ""}
    <div style="padding:24px 36px 0;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Services Rendered</p>
    </div>
    <div style="padding:0 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede6;border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:#f9f7f4;">
            <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;text-align:left;">Description</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;text-align:center;">Qty</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;text-align:right;">Unit Price</th>
            <th style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemRows || `<tr><td colspan="4" style="padding:16px;text-align:center;color:#999;font-size:14px;">No line items</td></tr>`}
        </tbody>
      </table>
    </div>
    <div style="padding:16px 36px 24px;display:flex;justify-content:flex-end;">
      <table cellpadding="0" cellspacing="0" style="min-width:280px;">
        <tr>
          <td style="padding:6px 16px;font-size:13px;color:#555;">Subtotal</td>
          <td style="padding:6px 16px;font-size:13px;color:#1a1a1a;text-align:right;">${fmt(p.subtotalCents)}</td>
        </tr>
        ${p.depositPaidCents > 0 ? `
        <tr>
          <td style="padding:6px 16px;font-size:13px;color:#555;">Deposit Paid</td>
          <td style="padding:6px 16px;font-size:13px;color:#16a34a;text-align:right;">− ${fmt(p.depositPaidCents)}</td>
        </tr>` : ""}
        <tr style="border-top:2px solid #E07B2A;">
          <td style="padding:10px 16px;font-size:16px;font-weight:700;color:#1a1a1a;">Balance Due</td>
          <td style="padding:10px 16px;font-size:16px;font-weight:700;color:#E07B2A;text-align:right;">${fmt(p.totalCents)}</td>
        </tr>
      </table>
    </div>
    ${p.notes ? `
    <div style="padding:0 36px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;">Notes</p>
      <div style="background:#f9f7f4;border:1px solid #f0ede6;border-radius:6px;padding:14px 16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${esc(p.notes)}</div>
    </div>` : ""}
    <div style="padding:16px 36px;background:#fdf6ee;border-top:1px solid #f0e4cc;">
      <p style="margin:0;font-size:13px;color:#7a4f1a;">
        <strong>Payment:</strong> Check, cash, or electronic transfer. Make checks payable to <strong>Noland Earthworks, LLC</strong>.
        Questions? Call <a href="tel:6154064819" style="color:#E07B2A;">(615) 406-4819</a> or email <a href="mailto:quotes@nolandearthworks.com" style="color:#E07B2A;">quotes@nolandearthworks.com</a>.
      </p>
    </div>
    <div style="background:#1a1a1a;padding:18px 36px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#888;">
        <strong style="color:#E07B2A;">Noland Earthworks, LLC</strong> &nbsp;&bull;&nbsp;
        <a href="tel:6154064819" style="color:#aaa;text-decoration:none;">(615) 406-4819</a> &nbsp;&bull;&nbsp;
        <a href="mailto:quotes@nolandearthworks.com" style="color:#aaa;text-decoration:none;">quotes@nolandearthworks.com</a>
      </p>
      <p style="margin:6px 0 0;font-size:11px;color:#555;">Veteran-Owned &amp; Operated &bull; Middle &amp; West Tennessee</p>
    </div>
    <div style="background:#E07B2A;height:4px;"></div>
  </div>
  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="background:#E07B2A;color:#fff;border:none;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.5px;">Print / Save as PDF</button>
  </div>
</body>
</html>`;
}

function buildInvoiceEmailHtml(p: InvoiceParams & { pdfUrl: string }): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const dueStr = p.dueDate?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) ?? "Upon receipt";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Invoice ${esc(p.invoiceNumber)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
        <tr><td style="background:#E07B2A;height:5px;font-size:0;">&nbsp;</td></tr>
        <tr>
          <td style="background:#1a1a1a;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td><img src="${logoUrl}" alt="Noland Earthworks" height="52" style="display:block;" /></td>
                <td align="right"><span style="display:inline-block;background:#E07B2A;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:4px;">Invoice ${esc(p.invoiceNumber)}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 36px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;">Hi ${esc(p.job.clientName)},</p>
            <p style="margin:0 0 16px;font-size:14px;color:#555;line-height:1.6;">
              Thank you for the opportunity to work on your property. Please find your invoice below.
              Payment is due <strong>${dueStr}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede6;border-radius:6px;overflow:hidden;margin-bottom:20px;">
              <tr style="background:#f9f7f4;">
                <td style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">Description</td>
                <td style="padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;text-align:right;">Amount</td>
              </tr>
              ${p.lineItems.map(li => `
              <tr>
                <td style="padding:10px 16px;border-top:1px solid #f0ede6;font-size:14px;color:#1a1a1a;">${esc(li.description)}</td>
                <td style="padding:10px 16px;border-top:1px solid #f0ede6;font-size:14px;color:#1a1a1a;text-align:right;">${fmt(li.totalCents)}</td>
              </tr>`).join("")}
              ${p.depositPaidCents > 0 ? `
              <tr>
                <td style="padding:10px 16px;border-top:1px solid #f0ede6;font-size:13px;color:#555;">Deposit Paid</td>
                <td style="padding:10px 16px;border-top:1px solid #f0ede6;font-size:13px;color:#16a34a;text-align:right;">− ${fmt(p.depositPaidCents)}</td>
              </tr>` : ""}
              <tr style="border-top:2px solid #E07B2A;">
                <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#1a1a1a;">Balance Due</td>
                <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#E07B2A;text-align:right;">${fmt(p.totalCents)}</td>
              </tr>
            </table>
            <div style="text-align:center;">
              <a href="${esc(p.pdfUrl)}" style="display:inline-block;background:#E07B2A;color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">View Invoice &rarr;</a>
            </div>
            <p style="margin:20px 0 0;font-size:13px;color:#555;line-height:1.6;">
              Payment accepted by check, cash, or electronic transfer.<br />
              Questions? Call <a href="tel:6154064819" style="color:#E07B2A;">(615) 406-4819</a> or reply to this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#1a1a1a;padding:18px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#888;">
              <strong style="color:#E07B2A;">Noland Earthworks, LLC</strong> &nbsp;&bull;&nbsp;
              <a href="tel:6154064819" style="color:#aaa;text-decoration:none;">(615) 406-4819</a> &nbsp;&bull;&nbsp;
              <a href="mailto:quotes@nolandearthworks.com" style="color:#aaa;text-decoration:none;">quotes@nolandearthworks.com</a>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#555;">Veteran-Owned &amp; Operated &bull; Middle &amp; West Tennessee</p>
          </td>
        </tr>
        <tr><td style="background:#E07B2A;height:4px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
