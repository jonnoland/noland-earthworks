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
 *   recordInvoiceCheck — record a received check and close the invoice
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nativeJobs, nativeInvoices, nativeInvoiceRefunds, nativeQuotes, nativeJobScheduleDates, businessSettings } from "../drizzle/schema";
import { eq, desc, like, or, and, inArray } from "drizzle-orm";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { attachJobScheduleDates, saveJobScheduleDates } from "./nativeJobScheduleDates";
import { createInvoiceCheckoutSession, expireInvoiceCheckoutSession, isStripeConfigured, refundInvoicePayment } from "./stripe";
import { GOOGLE_REVIEW_URL } from "@shared/googleReview";
import { resolveInvoiceQuoteId } from "./nativeInvoiceQuoteLink";
import { calculateInvoiceRefund } from "./invoiceRefunds";

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
            like(nativeJobs.parcelId, term),
            like(nativeJobs.parcelOwner, term),
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

      return attachJobScheduleDates(db, rows);
    }),

  /**
   * Non-cancelled jobs for Operations map placement. Older converted jobs can retain
   * Parcel ID and work-area data on their source quote, so expose that data as
   * a non-destructive fallback rather than geocoding a broad rural address.
   */
  activeMap: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const jobs = await db
      .select()
      .from(nativeJobs)
      .where(or(eq(nativeJobs.status, "scheduled"), eq(nativeJobs.status, "in_progress"), eq(nativeJobs.status, "completed")))
      .orderBy(desc(nativeJobs.createdAt));

    const quoteIds = jobs.flatMap((job) => job.quoteId == null ? [] : [job.quoteId]);
    const linkedQuotes = quoteIds.length > 0
      ? await db
        .select({
          id: nativeQuotes.id,
          parcelId: nativeQuotes.parcelId,
          parcelCounty: nativeQuotes.parcelCounty,
          parcelOwner: nativeQuotes.parcelOwner,
          parcelDeededAcreage: nativeQuotes.parcelDeededAcreage,
          propertyViewerUrl: nativeQuotes.propertyViewerUrl,
          workAreaPolygon: nativeQuotes.workAreaPolygon,
          workAreaMeasuredAt: nativeQuotes.workAreaMeasuredAt,
          acreage: nativeQuotes.acreage,
          title: nativeQuotes.title,
          status: nativeQuotes.status,
          totalCents: nativeQuotes.totalCents,
        })
        .from(nativeQuotes)
        .where(inArray(nativeQuotes.id, quoteIds))
      : [];
    const quoteById = new Map(linkedQuotes.map((quote) => [quote.id, quote]));
    const effectiveJobs = jobs.map((job) => {
      const quote = job.quoteId == null ? undefined : quoteById.get(job.quoteId);
      return {
        ...job,
        parcelId: job.parcelId ?? quote?.parcelId ?? null,
        parcelCounty: job.parcelCounty ?? quote?.parcelCounty ?? null,
        parcelOwner: job.parcelOwner ?? quote?.parcelOwner ?? null,
        parcelDeededAcreage: job.parcelDeededAcreage ?? quote?.parcelDeededAcreage ?? null,
        propertyViewerUrl: job.propertyViewerUrl ?? quote?.propertyViewerUrl ?? null,
        workAreaPolygon: job.workAreaPolygon ?? quote?.workAreaPolygon ?? null,
        workAreaMeasuredAt: job.workAreaMeasuredAt ?? quote?.workAreaMeasuredAt ?? null,
        acreage: job.acreage ?? quote?.acreage ?? null,
        quoteTitle: quote?.title ?? null,
        quoteStatus: quote?.status ?? null,
        quoteTotalCents: quote?.totalCents ?? job.totalCents,
      };
    });
    return attachJobScheduleDates(db, effectiveJobs);
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
      return (await attachJobScheduleDates(db, [job]))[0];
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
        scheduledDates: z.array(z.date()).max(31).optional(),
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
      const { id, scheduledDates, ...fields } = input;

      const [existing] = await db
        .select()
        .from(nativeJobs)
        .where(eq(nativeJobs.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      // Auto-set completedAt when status changes to completed
      const updateData: Record<string, unknown> = { ...fields };
      if (fields.status === "completed" && fields.completedAt === undefined) {
        updateData.completedAt = new Date();
      }

      const explicitDates = scheduledDates !== undefined
        ? scheduledDates
        : fields.scheduledDate === undefined
          ? undefined
          : fields.scheduledDate
            ? [fields.scheduledDate]
            : [];
      if (explicitDates !== undefined) {
        const normalizedDates = await saveJobScheduleDates(db, id, explicitDates);
        // Preserve the earliest work date for legacy schedule and invoice paths.
        updateData.scheduledDate = normalizedDates[0] ?? null;
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

      return (await attachJobScheduleDates(db, [updated]))[0];
    }),

  /**
   * Delete a job.
   */
  delete: ownerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(nativeJobScheduleDates).where(eq(nativeJobScheduleDates.jobId, input.id));
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
        paymentMethod: z.enum(["online", "check"]).optional().default("online"),
        checkNumber: z.string().trim().max(100).optional(),
        checkReceivedAt: z.date().optional(),
        checkNote: z.string().trim().max(1000).optional(),
        sendCheckReceipt: z.boolean().optional().default(true),
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

      if (input.paymentMethod === "check" && !input.checkNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter the check number before recording a completed-job payment.",
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
      const isCheckPayment = input.paymentMethod === "check";
      const checkPaidAt = input.checkReceivedAt ?? new Date();
      let paymentLinkUrl: string | null = null;
      let stripeCheckoutSessionId: string | null = null;
      let stripePaymentIntentId: string | null = null;
      let paymentLinkError: string | undefined;

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
        paymentLinkUrl,
        notes: input.notes,
        dueDate: input.dueDate,
      });

      const htmlBuffer = Buffer.from(invoiceHtml, "utf8");
      const fileKey = `invoices/${job.id}-${Date.now()}.html`;
      let { url: pdfUrl } = await storagePut(fileKey, htmlBuffer, "text/html");

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
          status: isCheckPayment ? "paid" : "unpaid",
          pdfUrl,
          dueDate: input.dueDate,
          notes: input.notes,
          ...(isCheckPayment ? {
            paidAt: checkPaidAt,
            paymentMethod: "check",
            paymentReference: input.checkNumber,
            paymentNotes: input.checkNote?.trim() || undefined,
          } : {}),
        });

      const invoiceId = (inserted as unknown as { insertId: number }).insertId;

      if (!isCheckPayment && isStripeConfigured() && totalCents > 0) {
        try {
          const checkout = await createInvoiceCheckoutSession({
            invoiceId,
            jobId: job.id,
            invoiceNumber,
            amountCents: totalCents,
            customerEmail: job.clientEmail,
            customerName: job.clientName,
            successUrl: `https://nolandearthworks.com/?payment=success&invoice=${invoiceId}`,
            cancelUrl: `https://nolandearthworks.com/?payment=cancelled&invoice=${invoiceId}`,
          });
          paymentLinkUrl = checkout.url;
          stripeCheckoutSessionId = checkout.sessionId;
          stripePaymentIntentId = checkout.paymentIntentId;
          await db.update(nativeInvoices).set({
            stripePaymentLinkUrl: paymentLinkUrl,
            stripeCheckoutSessionId,
            stripePaymentIntentId,
          }).where(eq(nativeInvoices.id, invoiceId));

          const finalInvoiceHtml = buildInvoiceHtml({
            invoiceNumber,
            job,
            lineItems,
            subtotalCents,
            depositPaidCents,
            totalCents,
            paymentLinkUrl,
            notes: input.notes,
            dueDate: input.dueDate,
          });
          const finalFile = await storagePut(`invoices/${job.id}-${Date.now()}-payment.html`, Buffer.from(finalInvoiceHtml, "utf8"), "text/html");
          pdfUrl = finalFile.url;
          await db.update(nativeInvoices).set({ pdfUrl }).where(eq(nativeInvoices.id, invoiceId));
        } catch (err) {
          paymentLinkError = err instanceof Error ? err.message : "Stripe could not create the payment link.";
          console.error("[Invoice] Failed to create Stripe payment link:", err);
        }
      }

      // Mark job as invoiced
      await db
        .update(nativeJobs)
        .set({
          invoicedCents: totalCents,
          invoicedAt: new Date(),
          ...(isCheckPayment ? { paidCents: totalCents, paidAt: checkPaidAt } : {}),
        })
        .where(eq(nativeJobs.id, job.id));

      if (isCheckPayment && job.quoteId) {
        await db
          .update(nativeQuotes)
          .set({
            finalPaymentStatus: "paid",
            status: "paid",
            nextActionType: "final_payment_paid",
            nextActionDueAt: null,
          })
          .where(eq(nativeQuotes.id, job.quoteId));
      }

      // Email the final-payment invoice when requested.
      let emailSent = false;
      let emailSendError: string | undefined;
      let checkReceipt: CheckPaymentReceiptResult | null = null;
      if (!isCheckPayment && input.sendEmail && job.clientEmail && ENV.resendApiKey) {
        try {
          const [settings] = await db
            .select({ googleReviewUrl: businessSettings.googleReviewUrl })
            .from(businessSettings)
            .limit(1);
          const googleReviewUrl = settings?.googleReviewUrl?.trim() || GOOGLE_REVIEW_URL;
          const emailHtml = buildInvoiceEmailHtml({
            invoiceNumber,
            job,
            lineItems,
            subtotalCents,
            depositPaidCents,
            totalCents,
            pdfUrl,
            paymentLinkUrl,
            notes: input.notes,
            dueDate: input.dueDate,
            googleReviewUrl,
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
          if (paymentLinkError) {
            emailSendError = `Invoice email sent, but Stripe could not create the online payment link: ${paymentLinkError}`;
          }
        } catch (err) {
          console.error("[Invoice] Failed to send email:", err);
          emailSendError = err instanceof Error ? err.message : "The invoice was created, but the email could not be sent.";
        }
      } else if (!isCheckPayment && input.sendEmail) {
        emailSendError = job.clientEmail
          ? paymentLinkError
            ? `Email delivery is not configured, and Stripe could not create the payment link: ${paymentLinkError}`
            : "Email delivery is not configured. The invoice was created but not sent."
          : "This job has no customer email address. The invoice was created but not sent.";
      }

      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, invoiceId))
        .limit(1);

      let directCheckDocuments: { paidInvoiceUrl: string; paymentReceiptUrl: string } | null = null;
      if (isCheckPayment && invoice) {
        try {
          directCheckDocuments = await savePaidCheckDocuments({
            invoice,
            job,
            checkNumber: input.checkNumber!,
            paidAt: checkPaidAt,
          });
          await db
            .update(nativeInvoices)
            .set({ pdfUrl: directCheckDocuments.paidInvoiceUrl, paymentReceiptUrl: directCheckDocuments.paymentReceiptUrl })
            .where(eq(nativeInvoices.id, invoice.id));
        } catch (error) {
          console.error(`[Invoices] Could not save paid documents for invoice #${invoiceId}:`, error);
        }

        checkReceipt = await sendFinalPaymentReceipt({
          invoice: {
            id: invoiceId,
            clientName: job.clientName,
            clientEmail: job.clientEmail,
            totalCents,
          },
          method: "check",
          reference: input.checkNumber!,
          paidAt: checkPaidAt,
          paidInvoiceUrl: directCheckDocuments?.paidInvoiceUrl ?? invoice.pdfUrl,
        });

        if (checkReceipt.sent) {
          await db
            .update(nativeInvoices)
            .set({ paymentReceiptEmailId: checkReceipt.emailId, paymentReceiptSentAt: new Date() })
            .where(eq(nativeInvoices.id, invoiceId));
        } else if (checkReceipt.attempted) {
          emailSendError = "Check payment was recorded, but the payment receipt email could not be delivered.";
        }
      }

      return {
        ...invoice,
        pdfUrl: directCheckDocuments?.paidInvoiceUrl ?? invoice?.pdfUrl ?? null,
        paymentReceiptUrl: directCheckDocuments?.paymentReceiptUrl ?? invoice?.paymentReceiptUrl ?? null,
        emailSent,
        emailSendError,
        paymentLinkError,
        receiptAttempted: checkReceipt?.attempted ?? false,
        receiptSent: checkReceipt?.sent ?? false,
        receiptReason: checkReceipt && !checkReceipt.sent ? checkReceipt.reason : undefined,
      };
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
   * Resend an existing unpaid invoice. A fresh Stripe Checkout Session is
   * created so legacy invoices and expired links receive current card + ACH
   * payment options. Any prior open session is expired first to prevent an
   * accidental duplicate payment.
   */
  resendInvoice: ownerProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [invoice] = await db.select().from(nativeInvoices).where(eq(nativeInvoices.id, input.invoiceId)).limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status === "paid") {
        throw new TRPCError({ code: "CONFLICT", message: "This invoice is already marked paid and cannot be resent." });
      }
      if (invoice.status === "void") {
        throw new TRPCError({ code: "CONFLICT", message: "Void invoices cannot be resent." });
      }
      if (!invoice.clientEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add a customer email address before resending this invoice." });
      }
      if (!ENV.resendApiKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Invoice email delivery is not configured." });
      }

      const [job] = await db.select().from(nativeJobs).where(eq(nativeJobs.id, invoice.jobId)).limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "The job linked to this invoice was not found." });

      const invoiceNumber = `INV-${String(invoice.id).padStart(4, "0")}`;
      const lineItems: InvoiceParams["lineItems"] = JSON.parse(invoice.lineItems || "[]");
      let paymentLinkUrl = invoice.stripePaymentLinkUrl;
      let stripeCheckoutSessionId = invoice.stripeCheckoutSessionId;
      let stripePaymentIntentId = invoice.stripePaymentIntentId;

      if (invoice.totalCents > 0) {
        if (!isStripeConfigured()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured, so a card and ACH payment link cannot be created." });
        }
        if (stripeCheckoutSessionId) {
          try {
            await expireInvoiceCheckoutSession(stripeCheckoutSessionId);
          } catch (err) {
            const message = err instanceof Error ? err.message : "The previous Stripe checkout could not be verified.";
            throw new TRPCError({ code: "CONFLICT", message });
          }
        }

        const checkout = await createInvoiceCheckoutSession({
          invoiceId: invoice.id,
          jobId: invoice.jobId,
          invoiceNumber,
          amountCents: invoice.totalCents,
          customerEmail: invoice.clientEmail,
          customerName: invoice.clientName,
          successUrl: `https://nolandearthworks.com/?payment=success&invoice=${invoice.id}`,
          cancelUrl: `https://nolandearthworks.com/?payment=cancelled&invoice=${invoice.id}`,
        });
        paymentLinkUrl = checkout.url;
        stripeCheckoutSessionId = checkout.sessionId;
        stripePaymentIntentId = checkout.paymentIntentId;
      }

      const invoiceHtml = buildInvoiceHtml({
        invoiceNumber,
        job,
        lineItems,
        subtotalCents: invoice.subtotalCents,
        depositPaidCents: invoice.depositPaidCents,
        totalCents: invoice.totalCents,
        paymentLinkUrl,
        notes: invoice.notes ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
      });
      const { url: pdfUrl } = await storagePut(
        `invoices/${invoice.jobId}-${Date.now()}-resent.html`,
        Buffer.from(invoiceHtml, "utf8"),
        "text/html"
      );
      await db.update(nativeInvoices).set({
        pdfUrl,
        stripePaymentLinkUrl: paymentLinkUrl,
        stripeCheckoutSessionId,
        stripePaymentIntentId,
      }).where(eq(nativeInvoices.id, invoice.id));

      const [settings] = await db
        .select({ googleReviewUrl: businessSettings.googleReviewUrl })
        .from(businessSettings)
        .limit(1);
      const googleReviewUrl = settings?.googleReviewUrl?.trim() || GOOGLE_REVIEW_URL;
      const emailHtml = buildInvoiceEmailHtml({
        invoiceNumber,
        job,
        lineItems,
        subtotalCents: invoice.subtotalCents,
        depositPaidCents: invoice.depositPaidCents,
        totalCents: invoice.totalCents,
        pdfUrl,
        paymentLinkUrl,
        notes: invoice.notes ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
        googleReviewUrl,
      });
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Noland Earthworks <quotes@nolandearthworks.com>",
          to: invoice.clientEmail,
          subject: `Invoice ${invoiceNumber} — Noland Earthworks`,
          html: emailHtml,
        }),
      });
      const resData = await res.json() as { id?: string; message?: string };
      if (!res.ok || !resData.id) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: resData.message || "The email provider did not accept the invoice resend.",
        });
      }

      const emailSentAt = new Date();
      await db.update(nativeInvoices).set({
        status: "sent",
        emailSentId: resData.id,
        emailSentAt,
      }).where(eq(nativeInvoices.id, invoice.id));

      return {
        success: true,
        invoiceId: invoice.id,
        clientEmail: invoice.clientEmail,
        paymentLinkUrl,
        emailSentAt,
      };
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
      if (invoice.status === "paid") {
        return { success: true, alreadyPaid: true };
      }

      const paidCents = input.paidCents ?? invoice.totalCents;
      const paidAt = new Date();

      await db
        .update(nativeInvoices)
        .set({
          status: "paid",
          paidAt,
          achPaymentPendingAt: null,
          paymentMethod: "cash",
          paymentReference: null,
          paymentNotes: null,
        })
        .where(eq(nativeInvoices.id, input.invoiceId));

      await db
        .update(nativeJobs)
        .set({ paidCents, paidAt })
        .where(eq(nativeJobs.id, invoice.jobId));

      const quoteId = await resolveInvoiceQuoteId(db, invoice);
      if (quoteId !== null) {
        await db
          .update(nativeQuotes)
          .set({
            finalPaymentStatus: "paid",
            status: "paid",
            nextActionType: "final_payment_paid",
            nextActionDueAt: null,
          })
          .where(eq(nativeQuotes.id, quoteId));
      }

      let paidDocuments: { paidInvoiceUrl: string; paymentReceiptUrl: string } | null = null;
      try {
        paidDocuments = await savePaidFinalDocuments({
          invoice,
          job: {
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientPhone: invoice.clientPhone,
            propertyAddress: invoice.propertyAddress,
            serviceType: invoice.serviceType,
          },
          method: "cash",
          paidAt,
        });
        await db.update(nativeInvoices).set({
          pdfUrl: paidDocuments.paidInvoiceUrl,
          paymentReceiptUrl: paidDocuments.paymentReceiptUrl,
        }).where(eq(nativeInvoices.id, invoice.id));
      } catch (error) {
        console.error(`[Invoices] Could not save cash payment documents for invoice #${invoice.id}:`, error);
      }

      const receipt = await sendFinalPaymentReceipt({
        invoice,
        method: "cash",
        paidAt,
        paidInvoiceUrl: paidDocuments?.paidInvoiceUrl ?? invoice.pdfUrl,
      });
      if (receipt.sent) {
        await db.update(nativeInvoices).set({
          paymentReceiptEmailId: receipt.emailId,
          paymentReceiptSentAt: new Date(),
        }).where(eq(nativeInvoices.id, invoice.id));
      }

      return {
        success: true,
        paidInvoiceUrl: paidDocuments?.paidInvoiceUrl ?? invoice.pdfUrl,
        paymentReceiptUrl: paidDocuments?.paymentReceiptUrl ?? null,
        receiptSent: receipt.sent,
      };
    }),

  /**
   * Records an in-hand check against a final invoice. When a prior hosted
   * Checkout link exists, it is retired first to prevent double collection.
   */
  recordInvoiceCheck: ownerProcedure
    .input(z.object({
      invoiceId: z.number().int(),
      checkNumber: z.string().trim().min(1).max(100),
      receivedAt: z.date().optional(),
      note: z.string().trim().max(1000).optional(),
      sendReceipt: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status === "paid") throw new TRPCError({ code: "CONFLICT", message: "This invoice is already paid." });
      if (invoice.status === "void") throw new TRPCError({ code: "CONFLICT", message: "Void invoices cannot receive a check payment." });
      if (invoice.achPaymentPendingAt) {
        throw new TRPCError({ code: "CONFLICT", message: "An ACH payment is awaiting bank settlement. Do not record a check payment unless the ACH payment fails." });
      }

      if (invoice.stripeCheckoutSessionId) {
        try {
          await expireInvoiceCheckoutSession(invoice.stripeCheckoutSessionId);
        } catch (error) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error instanceof Error
              ? `Could not close the open online payment link: ${error.message}`
              : "Could not close the open online payment link. Refresh the invoice and try again.",
          });
        }
      }

      const paidAt = input.receivedAt ?? new Date();
      const paymentNotes = input.note?.trim() || null;
      await db
        .update(nativeInvoices)
        .set({
          status: "paid",
          paidAt,
          achPaymentPendingAt: null,
          paymentMethod: "check",
          paymentReference: input.checkNumber,
          paymentNotes,
          stripePaymentLinkUrl: null,
          paymentReceiptEmailId: null,
          paymentReceiptSentAt: null,
        })
        .where(eq(nativeInvoices.id, invoice.id));

      await db
        .update(nativeJobs)
        .set({ paidCents: invoice.totalCents, paidAt })
        .where(eq(nativeJobs.id, invoice.jobId));

      const quoteId = await resolveInvoiceQuoteId(db, invoice);
      if (quoteId !== null) {
        await db
          .update(nativeQuotes)
          .set({
            finalPaymentStatus: "paid",
            status: "paid",
            nextActionType: "final_payment_paid",
            nextActionDueAt: null,
          })
          .where(eq(nativeQuotes.id, quoteId));
      }

      let paidDocuments: { paidInvoiceUrl: string; paymentReceiptUrl: string } | null = null;
      try {
        paidDocuments = await savePaidCheckDocuments({
          invoice,
          job: {
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientPhone: invoice.clientPhone,
            propertyAddress: invoice.propertyAddress,
            serviceType: invoice.serviceType,
          },
          checkNumber: input.checkNumber,
          paidAt,
        });
        await db
          .update(nativeInvoices)
          .set({ pdfUrl: paidDocuments.paidInvoiceUrl, paymentReceiptUrl: paidDocuments.paymentReceiptUrl })
          .where(eq(nativeInvoices.id, invoice.id));
      } catch (error) {
        console.error(`[Invoices] Could not save paid documents for invoice #${invoice.id}:`, error);
      }

      const receipt: CheckPaymentReceiptResult = await sendFinalPaymentReceipt({
        invoice,
        method: "check",
        reference: input.checkNumber,
        paidAt,
        paidInvoiceUrl: paidDocuments?.paidInvoiceUrl ?? invoice.pdfUrl,
      });

      if (receipt.sent) {
        await db
          .update(nativeInvoices)
          .set({ paymentReceiptEmailId: receipt.emailId, paymentReceiptSentAt: new Date() })
          .where(eq(nativeInvoices.id, invoice.id));
      }

      return {
        success: true,
        paidAt,
        checkNumber: input.checkNumber,
        paidInvoiceUrl: paidDocuments?.paidInvoiceUrl ?? invoice.pdfUrl,
        paymentReceiptUrl: paidDocuments?.paymentReceiptUrl ?? null,
        receipt: receipt.sent
          ? { attempted: true, sent: true }
          : { attempted: receipt.attempted, sent: false, reason: receipt.reason },
      };
    }),

  /** Re-sends a customer receipt for any settled final payment without changing payment status. */
  resendPaymentReceipt: ownerProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status !== "paid") {
        throw new TRPCError({ code: "CONFLICT", message: "Only paid invoices can receive a payment receipt resend." });
      }
      const method: FinalInvoicePaymentMethod = invoice.paymentMethod === "check" || invoice.paymentMethod === "stripe"
        ? invoice.paymentMethod
        : "cash";
      const detail = method === "stripe" ? (invoice.paymentNotes === "ach" ? "ach" as const : "card" as const) : undefined;

      let paidDocuments: { paidInvoiceUrl: string; paymentReceiptUrl: string };
      try {
        paidDocuments = await savePaidFinalDocuments({
          invoice,
          job: {
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientPhone: invoice.clientPhone,
            propertyAddress: invoice.propertyAddress,
            serviceType: invoice.serviceType,
          },
          method,
          reference: invoice.paymentReference,
          detail,
          paidAt: invoice.paidAt ?? new Date(),
        });
      } catch (error) {
        console.error(`[Invoices] Could not prepare paid documents for invoice #${invoice.id}:`, error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not prepare the paid invoice and receipt. Try again shortly." });
      }

      const receipt = await sendFinalPaymentReceipt({
        invoice,
        method,
        reference: invoice.paymentReference,
        detail,
        paidAt: invoice.paidAt ?? new Date(),
        paidInvoiceUrl: paidDocuments.paidInvoiceUrl,
      });

      if (!receipt.sent) {
        const message = receipt.reason === "missing_email"
          ? "Add a customer email address before resending this payment receipt."
          : receipt.reason === "email_not_configured"
            ? "Payment receipt email delivery is not configured."
            : "The email provider could not deliver the payment receipt. Try again shortly.";
        throw new TRPCError({
          code: receipt.reason === "delivery_failed" ? "INTERNAL_SERVER_ERROR" : "PRECONDITION_FAILED",
          message,
        });
      }

      const receiptSentAt = new Date();
      await db
        .update(nativeInvoices)
        .set({
          pdfUrl: paidDocuments.paidInvoiceUrl,
          paymentReceiptUrl: paidDocuments.paymentReceiptUrl,
          paymentReceiptEmailId: receipt.emailId,
          paymentReceiptSentAt: receiptSentAt,
        })
        .where(eq(nativeInvoices.id, invoice.id));

      return {
        success: true,
        invoiceId: invoice.id,
        clientEmail: invoice.clientEmail,
        receiptSentAt,
        paidInvoiceUrl: paidDocuments.paidInvoiceUrl,
        paymentReceiptUrl: paidDocuments.paymentReceiptUrl,
      };
    }),

  /** Rebuilds a settled invoice's paid document and payment receipt without sending email. */
  refreshPaidDocuments: ownerProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status !== "paid") {
        throw new TRPCError({ code: "CONFLICT", message: "A final payment receipt is available after this invoice is paid." });
      }

      const method: FinalInvoicePaymentMethod = invoice.paymentMethod === "check" || invoice.paymentMethod === "stripe"
        ? invoice.paymentMethod
        : "cash";
      const detail = method === "stripe" ? (invoice.paymentNotes === "ach" ? "ach" as const : "card" as const) : undefined;
      try {
        const paidDocuments = await savePaidFinalDocuments({
          invoice,
          job: {
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientPhone: invoice.clientPhone,
            propertyAddress: invoice.propertyAddress,
            serviceType: invoice.serviceType,
          },
          method,
          reference: invoice.paymentReference,
          detail,
          paidAt: invoice.paidAt ?? new Date(),
        });
        await db
          .update(nativeInvoices)
          .set({ pdfUrl: paidDocuments.paidInvoiceUrl, paymentReceiptUrl: paidDocuments.paymentReceiptUrl })
          .where(eq(nativeInvoices.id, invoice.id));
        return { success: true, invoiceId: invoice.id, ...paidDocuments };
      } catch (error) {
        console.error(`[Invoices] Could not refresh paid documents for invoice #${invoice.id}:`, error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not rebuild the paid invoice and receipt. Try again shortly." });
      }
    }),

  /**
   * Processes a Stripe refund or records an offline check/cash refund against a
   * settled final invoice. The confirmation flag is deliberately required so a
   * caller cannot make a refund by accidentally submitting the dialog.
   */
  refundInvoice: ownerProcedure
    .input(z.object({
      invoiceId: z.number().int(),
      amountCents: z.number().int().positive(),
      method: z.enum(["stripe", "check", "cash"]),
      offlineReference: z.string().trim().max(255).optional(),
      notes: z.string().trim().max(2000).optional(),
      confirmRefund: z.literal(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, input.invoiceId))
        .limit(1);
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status !== "paid") {
        throw new TRPCError({ code: "CONFLICT", message: "Only settled paid invoices can be refunded." });
      }

      let refundCalculation: ReturnType<typeof calculateInvoiceRefund>;
      try {
        refundCalculation = calculateInvoiceRefund(invoice.totalCents, invoice.refundedCents, input.amountCents);
      } catch (error) {
        throw new TRPCError({
          code: error instanceof Error && error.message.includes("fully refunded") ? "CONFLICT" : "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Refund amount is invalid.",
        });
      }

      let refundReference = input.offlineReference?.trim() || null;
      if (input.method === "stripe") {
        if (invoice.paymentMethod !== "stripe" || !invoice.stripePaymentIntentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This invoice does not have a Stripe payment available for an automatic Stripe refund. Record an offline check or cash refund instead." });
        }
        try {
          const stripeRefund = await refundInvoicePayment(invoice.stripePaymentIntentId, input.amountCents);
          refundReference = stripeRefund.refundId;
        } catch (error) {
          console.error(`[Invoices] Stripe refund failed for invoice #${invoice.id}:`, error);
          throw new TRPCError({ code: "BAD_GATEWAY", message: "Stripe could not process the refund. No invoice records were changed." });
        }
      } else if (!refundReference) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a check number or cash refund reference for an offline refund." });
      }

      const refundedAt = new Date();
      const { refundedCents, remainingCents, fullyRefunded } = refundCalculation;

      await db.insert(nativeInvoiceRefunds).values({
        invoiceId: invoice.id,
        amountCents: input.amountCents,
        method: input.method,
        reference: refundReference,
        notes: input.notes?.trim() || null,
        refundedAt,
      });
      await db.update(nativeInvoices).set({
        status: fullyRefunded ? "refunded" : "paid",
        refundedCents,
        refundedAt,
        refundMethod: input.method,
        refundReference,
        refundNotes: input.notes?.trim() || null,
      }).where(eq(nativeInvoices.id, invoice.id));
      await db.update(nativeJobs).set({
        paidCents: Math.max(0, (invoice.totalCents - refundedCents)),
        paidAt: fullyRefunded ? null : invoice.paidAt,
      }).where(eq(nativeJobs.id, invoice.jobId));

      const quoteId = await resolveInvoiceQuoteId(db, invoice);
      if (quoteId !== null) {
        await db.update(nativeQuotes).set({
          status: fullyRefunded ? "converted" : "paid",
          finalPaymentStatus: fullyRefunded ? "refunded" : "partially_refunded",
          nextActionType: fullyRefunded ? "refund_recorded" : "partial_refund_recorded",
          nextActionDueAt: null,
        }).where(eq(nativeQuotes.id, quoteId));
      }

      return {
        success: true,
        invoiceId: invoice.id,
        amountCents: input.amountCents,
        refundedCents,
        remainingCents,
        fullyRefunded,
        method: input.method,
        reference: refundReference,
        refundedAt,
      };
    }),

  /**
   * Rebuilds stored paid documents for a legacy check invoice. No customer
   * message is sent and the existing paid status is never changed.
   */
  refreshPaidCheckDocuments: ownerProcedure
    .input(z.object({ invoiceId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [invoice] = await db
        .select()
        .from(nativeInvoices)
        .where(eq(nativeInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      if (invoice.status !== "paid" || invoice.paymentMethod !== "check" || !invoice.paymentReference) {
        throw new TRPCError({ code: "CONFLICT", message: "Only paid check invoices with a saved check number can be refreshed." });
      }

      let paidDocuments: { paidInvoiceUrl: string; paymentReceiptUrl: string };
      try {
        paidDocuments = await savePaidCheckDocuments({
          invoice,
          job: {
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientPhone: invoice.clientPhone,
            propertyAddress: invoice.propertyAddress,
            serviceType: invoice.serviceType,
          },
          checkNumber: invoice.paymentReference,
          paidAt: invoice.paidAt ?? new Date(),
        });
      } catch (error) {
        console.error(`[Invoices] Could not refresh paid documents for invoice #${invoice.id}:`, error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not rebuild the paid invoice and receipt. Try again shortly." });
      }

      await db
        .update(nativeInvoices)
        .set({ pdfUrl: paidDocuments.paidInvoiceUrl, paymentReceiptUrl: paidDocuments.paymentReceiptUrl })
        .where(eq(nativeInvoices.id, invoice.id));

      return { success: true, invoiceId: invoice.id, ...paidDocuments };
    }),
});

// ─── HTML Builders ─────────────────────────────────────────────────────────────

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function esc(str: string | null | undefined): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type PaymentReceiptInvoice = Pick<typeof nativeInvoices.$inferSelect, "id" | "clientName" | "clientEmail" | "totalCents">;
export type FinalInvoicePaymentMethod = "check" | "cash" | "stripe";

type PaymentReceiptResult =
  | { attempted: false; sent: false; reason: "missing_email" | "email_not_configured" | "not_requested" }
  | { attempted: true; sent: true; emailId: string }
  | { attempted: true; sent: false; reason: "delivery_failed" };
type CheckReceiptInvoice = PaymentReceiptInvoice;
type CheckPaymentReceiptResult = PaymentReceiptResult;

function paymentMethodDescription(method: FinalInvoicePaymentMethod, reference?: string | null, detail?: string | null): string {
  if (method === "check") return `Check${reference ? ` #${reference}` : ""}`;
  if (method === "cash") return "Cash";
  return detail === "ach" ? "ACH bank transfer (Stripe)" : "Card payment (Stripe)";
}

export async function sendFinalPaymentReceipt({
  invoice,
  method,
  reference,
  detail,
  paidAt,
  paidInvoiceUrl,
}: {
  invoice: PaymentReceiptInvoice;
  method: FinalInvoicePaymentMethod;
  reference?: string | null;
  detail?: "ach" | "card" | null;
  paidAt: Date;
  paidInvoiceUrl?: string | null;
}): Promise<PaymentReceiptResult> {
  if (!invoice.clientEmail) return { attempted: false, sent: false, reason: "missing_email" };
  if (!ENV.resendApiKey) return { attempted: false, sent: false, reason: "email_not_configured" };

  const invoiceNumber = `INV-${String(invoice.id).padStart(4, "0")}`;
  const firstName = invoice.clientName?.trim().split(/\s+/)[0] || "there";
  const methodLabel = paymentMethodDescription(method, reference, detail);
  const receivedDate = paidAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const receiptHtml = `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f4f1ec;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;">
      <tr><td style="height:5px;background:#E07B2A;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 36px;background:#1a1a1a;"><div style="font-size:19px;font-weight:700;color:#fff;">NOLAND <span style="color:#E07B2A;">EARTHWORKS</span></div><div style="margin-top:6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Payment Receipt</div></td></tr>
      <tr><td style="padding:28px 36px;">
        <p style="margin:0 0 14px;font-size:16px;">Hi ${esc(firstName)},</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#555;">Thank you. Your final payment has been received and your final invoice is marked paid.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden;margin-bottom:20px;">
          <tr><td style="padding:10px 16px;background:#f9f7f4;font-size:12px;color:#666;">Invoice</td><td align="right" style="padding:10px 16px;background:#f9f7f4;font-size:12px;font-weight:700;">${esc(invoiceNumber)}</td></tr>
          <tr><td style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;color:#666;">Payment method</td><td align="right" style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;font-weight:700;">${esc(methodLabel)}</td></tr>
          <tr><td style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;color:#666;">Date received</td><td align="right" style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;font-weight:700;">${esc(receivedDate)}</td></tr>
          <tr><td style="padding:12px 16px;border-top:2px solid #E07B2A;font-size:15px;font-weight:700;">Amount received</td><td align="right" style="padding:12px 16px;border-top:2px solid #E07B2A;font-size:16px;font-weight:700;color:#E07B2A;">${fmt(invoice.totalCents)}</td></tr>
        </table>
        ${paidInvoiceUrl ? `<p style="margin:0 0 16px;font-size:13px;"><a href="${esc(paidInvoiceUrl)}" style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:5px;font-weight:700;">View Paid Final Invoice</a></p>` : ""}
        <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">If you have any questions, call me at <a href="tel:6154064819" style="color:#E07B2A;">(615) 406-4819</a> or reply to this email.</p>
      </td></tr>
      <tr><td style="padding:18px 36px;background:#1a1a1a;text-align:center;font-size:12px;color:#aaa;">Noland Earthworks, LLC &nbsp;&bull;&nbsp; Veteran-Owned &amp; Operated</td></tr>
      <tr><td style="height:4px;background:#E07B2A;font-size:0;">&nbsp;</td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Noland Earthworks <quotes@nolandearthworks.com>",
        to: invoice.clientEmail,
        reply_to: "quotes@nolandearthworks.com",
        subject: `Payment received — ${invoiceNumber}`,
        html: receiptHtml,
      }),
    });
    const data = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !data.id) {
      console.warn(`[Invoices] Payment receipt delivery failed for invoice #${invoice.id}: ${data.message ?? response.statusText}`);
      return { attempted: true, sent: false, reason: "delivery_failed" };
    }
    return { attempted: true, sent: true, emailId: data.id };
  } catch (error) {
    console.warn(`[Invoices] Payment receipt delivery failed for invoice #${invoice.id}:`, error);
    return { attempted: true, sent: false, reason: "delivery_failed" };
  }
}

async function sendCheckPaymentReceipt({
  invoice,
  checkNumber,
  paidAt,
}: {
  invoice: PaymentReceiptInvoice;
  checkNumber: string;
  paidAt: Date;
}): Promise<PaymentReceiptResult> {
  return sendFinalPaymentReceipt({ invoice, method: "check", reference: checkNumber, paidAt });
}

export function buildPaymentReceiptHtml({
  invoice,
  method,
  reference,
  detail,
  paidAt,
}: {
  invoice: PaymentReceiptInvoice;
  method: FinalInvoicePaymentMethod;
  reference?: string | null;
  detail?: "ach" | "card" | null;
  paidAt: Date;
}): string {
  const invoiceNumber = `INV-${String(invoice.id).padStart(4, "0")}`;
  const firstName = invoice.clientName?.trim().split(/\s+/)[0] || "there";
  const methodLabel = paymentMethodDescription(method, reference, detail);
  const receivedDate = paidAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#f4f1ec;font-family:Arial,sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f4f1ec;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;">
      <tr><td style="height:5px;background:#E07B2A;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 36px;background:#1a1a1a;"><div style="font-size:19px;font-weight:700;color:#fff;">NOLAND <span style="color:#E07B2A;">EARTHWORKS</span></div><div style="margin-top:6px;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Payment Receipt</div></td></tr>
      <tr><td style="padding:28px 36px;">
        <p style="margin:0 0 14px;font-size:16px;">Hi ${esc(firstName)},</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#555;">Thank you. Your final payment has been received and your final invoice is marked paid.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden;margin-bottom:20px;">
          <tr><td style="padding:10px 16px;background:#f9f7f4;font-size:12px;color:#666;">Invoice</td><td align="right" style="padding:10px 16px;background:#f9f7f4;font-size:12px;font-weight:700;">${esc(invoiceNumber)}</td></tr>
          <tr><td style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;color:#666;">Payment method</td><td align="right" style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;font-weight:700;">${esc(methodLabel)}</td></tr>
          <tr><td style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;color:#666;">Date received</td><td align="right" style="padding:10px 16px;border-top:1px solid #eee;font-size:12px;font-weight:700;">${esc(receivedDate)}</td></tr>
          <tr><td style="padding:12px 16px;border-top:2px solid #E07B2A;font-size:15px;font-weight:700;">Amount received</td><td align="right" style="padding:12px 16px;border-top:2px solid #E07B2A;font-size:16px;font-weight:700;color:#15803d;">${fmt(invoice.totalCents)}</td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">If you have any questions, call me at <a href="tel:6154064819" style="color:#E07B2A;">(615) 406-4819</a> or reply to this email.</p>
      </td></tr>
      <tr><td style="padding:18px 36px;background:#1a1a1a;text-align:center;font-size:12px;color:#aaa;">Noland Earthworks, LLC &nbsp;&bull;&nbsp; Veteran-Owned &amp; Operated</td></tr>
      <tr><td style="height:4px;background:#E07B2A;font-size:0;">&nbsp;</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function buildCheckPaymentReceiptHtml({
  invoice,
  checkNumber,
  paidAt,
}: {
  invoice: CheckReceiptInvoice;
  checkNumber: string;
  paidAt: Date;
}): string {
  return buildPaymentReceiptHtml({ invoice, method: "check", reference: checkNumber, paidAt });
}

export async function savePaidFinalDocuments({
  invoice,
  job,
  method,
  reference,
  detail,
  paidAt,
}: {
  invoice: typeof nativeInvoices.$inferSelect;
  job: InvoiceParams["job"];
  method: FinalInvoicePaymentMethod;
  reference?: string | null;
  detail?: "ach" | "card" | null;
  paidAt: Date;
}): Promise<{ paidInvoiceUrl: string; paymentReceiptUrl: string }> {
  const invoiceNumber = `INV-${String(invoice.id).padStart(4, "0")}`;
  const lineItems: InvoiceParams["lineItems"] = JSON.parse(invoice.lineItems || "[]");
  const paymentStatus = { method, reference, detail, paidAt };
  const paidInvoiceHtml = buildInvoiceHtml({
    invoiceNumber,
    job,
    lineItems,
    subtotalCents: invoice.subtotalCents,
    depositPaidCents: invoice.depositPaidCents,
    totalCents: invoice.totalCents,
    notes: invoice.notes ?? undefined,
    dueDate: invoice.dueDate ?? undefined,
    paymentStatus,
  });
  const receiptHtml = buildPaymentReceiptHtml({ invoice, method, reference, detail, paidAt });
  const suffix = `${invoice.id}-${Date.now()}`;
  const [paidInvoiceFile, paymentReceiptFile] = await Promise.all([
    storagePut(`invoices/${suffix}-paid.html`, Buffer.from(paidInvoiceHtml, "utf8"), "text/html"),
    storagePut(`payment-receipts/${suffix}.html`, Buffer.from(receiptHtml, "utf8"), "text/html"),
  ]);
  return { paidInvoiceUrl: paidInvoiceFile.url, paymentReceiptUrl: paymentReceiptFile.url };
}

async function savePaidCheckDocuments({
  invoice,
  job,
  checkNumber,
  paidAt,
}: {
  invoice: typeof nativeInvoices.$inferSelect;
  job: InvoiceParams["job"];
  checkNumber: string;
  paidAt: Date;
}): Promise<{ paidInvoiceUrl: string; paymentReceiptUrl: string }> {
  return savePaidFinalDocuments({ invoice, job, method: "check", reference: checkNumber, paidAt });
}

export interface InvoiceParams {
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
  paymentLinkUrl?: string | null;
  googleReviewUrl?: string;
  notes?: string;
  dueDate?: Date;
  paymentStatus?: {
    method: FinalInvoicePaymentMethod;
    reference?: string | null;
    detail?: "ach" | "card" | null;
    paidAt: Date;
  };
}

export function buildInvoiceHtml(p: InvoiceParams): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const issuedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const jobDate = (p.job.completedAt ?? p.job.scheduledDate)?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) ?? "—";
  const dueStr = p.dueDate?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) ?? "Upon receipt";
  const paidDate = p.paymentStatus?.paidAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const paymentMethod = p.paymentStatus
    ? paymentMethodDescription(p.paymentStatus.method, p.paymentStatus.reference, p.paymentStatus.detail)
    : null;
  const paymentSummary = p.paymentStatus
    ? `Paid by ${paymentMethod} on ${esc(paidDate ?? "—")}`
    : null;

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
    .page { position:relative; max-width:800px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.10); }
    .paid-stamp { position:absolute; z-index:2; top:46%; right:30px; transform:rotate(-16deg); border:8px solid #15803d; border-radius:10px; padding:8px 20px; color:#15803d; font-size:64px; line-height:1; font-weight:900; letter-spacing:7px; opacity:.16; pointer-events:none; }
  </style>
</head>
<body>
  <div class="page">
    <div style="background:#E07B2A;height:5px;"></div>
    <div style="background:#1a1a1a;padding:28px 36px;display:flex;justify-content:space-between;align-items:center;">
      <img src="${logoUrl}" alt="Noland Earthworks" height="52" style="display:block;" />
      <div style="text-align:right;">
        <div style="display:inline-block;background:${p.paymentStatus ? "#16a34a" : "#E07B2A"};color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:4px;">${p.paymentStatus ? "Paid Invoice" : "Invoice"}</div>
        <div style="color:#aaa;font-size:13px;margin-top:8px;">${esc(p.invoiceNumber)}</div>
      </div>
    </div>
    ${p.paymentStatus ? `<div class="paid-stamp" aria-label="Paid in full">PAID</div>
    <div style="position:relative;z-index:3;margin:20px 36px 0;padding:16px 18px;background:#ecfdf3;border:2px solid #86efac;border-radius:8px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.1px;color:#15803d;">Payment Summary</div>
          <div style="margin-top:4px;font-size:20px;font-weight:800;color:#166534;">PAID IN FULL</div>
        </div>
        <div style="font-size:13px;color:#166534;text-align:right;line-height:1.6;">
          <div><strong>Method:</strong> ${paymentMethod}</div>
          ${p.paymentStatus.method === "check" ? `<div><strong>Check number:</strong> ${p.paymentStatus.reference ? `#${esc(p.paymentStatus.reference)}` : "—"}</div>` : ""}
          <div><strong>Date received:</strong> ${esc(paidDate ?? "—")}</div>
        </div>
      </div>
    </div>` : ""}
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
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;margin-top:12px;margin-bottom:4px;">${p.paymentStatus ? "Paid" : "Payment Due"}</div>
        <div style="font-size:14px;color:${p.paymentStatus ? "#16a34a" : "#1a1a1a"};font-weight:600;">${p.paymentStatus ? esc(paidDate ?? "—") : dueStr}</div>
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
          <td style="padding:10px 16px;font-size:16px;font-weight:700;color:#1a1a1a;">${p.paymentStatus ? "Balance Paid" : "Balance Due"}</td>
          <td style="padding:10px 16px;font-size:16px;font-weight:700;color:${p.paymentStatus ? "#16a34a" : "#E07B2A"};text-align:right;">${fmt(p.totalCents)}</td>
        </tr>
      </table>
    </div>
    ${p.notes ? `
    <div style="padding:0 36px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;">Notes</p>
      <div style="background:#f9f7f4;border:1px solid #f0ede6;border-radius:6px;padding:14px 16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${esc(p.notes)}</div>
    </div>` : ""}
    <div style="padding:${p.paymentLinkUrl ? "20px" : "16px"} 36px;background:${p.paymentStatus ? "#f0fdf4" : "#fdf6ee"};border-top:1px solid ${p.paymentStatus ? "#bbf7d0" : "#f0e4cc"};${p.paymentLinkUrl ? "text-align:center;" : ""}">
      ${paymentSummary ? `<p style="margin:0;font-size:13px;color:#166534;"><strong>Payment received:</strong> ${paymentSummary}. Thank you.</p>` : p.paymentLinkUrl ? `<p style="margin:0 0 10px;font-size:13px;color:#7a4f1a;"><strong>Pay this invoice online</strong> by card or ACH bank transfer.</p>
      <a href="${esc(p.paymentLinkUrl)}" style="display:inline-block;background:#E07B2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:700;">Pay Invoice Securely &rarr;</a>
      <p style="margin:12px 0 0;font-size:13px;color:#7a4f1a;">` : `<p style="margin:0;font-size:13px;color:#7a4f1a;">`}
        ${paymentSummary ? "" : `<strong>Payment:</strong> Check, cash, or electronic transfer. Make checks payable to <strong>Noland Earthworks, LLC</strong>.
        Questions? Call <a href="tel:6154064819" style="color:#E07B2A;">(615) 406-4819</a> or email <a href="mailto:quotes@nolandearthworks.com" style="color:#E07B2A;">quotes@nolandearthworks.com</a>.
      `}</p>
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

export function buildInvoiceEmailHtml(p: InvoiceParams & { pdfUrl: string }): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const dueStr = p.dueDate?.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) ?? "Upon receipt";
  const firstName = p.job.clientName.trim().split(/\s+/)[0] || "there";

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
            ${p.paymentLinkUrl ? `<div style="text-align:center;margin-bottom:12px;">
              <a href="${esc(p.paymentLinkUrl)}" style="display:inline-block;background:#E07B2A;color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">Pay by Card or ACH &rarr;</a>
            </div>` : ""}
            <div style="text-align:center;">
              <a href="${esc(p.pdfUrl)}" style="display:inline-block;background:#E07B2A;color:#fff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">View Invoice &rarr;</a>
            </div>
            ${p.googleReviewUrl ? `<div style="margin:24px 0 0;padding:18px 20px;background:#fdf6ee;border:1px solid #f0e4cc;border-radius:6px;text-align:center;">
              <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(firstName)}, happy with the completed work?</p>
              <p style="margin:0 0 14px;font-size:13px;color:#555;line-height:1.55;">A quick Google review helps other landowners make a confident decision and helps me keep improving the work.</p>
              <a href="${esc(p.googleReviewUrl)}" style="display:inline-block;background:#1a1a1a;color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:12px 22px;border-radius:6px;text-decoration:none;">Leave a Google Review &rarr;</a>
            </div>` : ""}
            <p style="margin:20px 0 0;font-size:13px;color:#555;line-height:1.6;">
              Online payment accepts card or ACH bank transfer. ACH payments may take several business days to settle. Check, cash, or other electronic transfer arrangements are also accepted.<br />
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
