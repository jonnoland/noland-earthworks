/**
 * Payment tRPC router — Stripe deposit and balance payment flows.
 *
 * Procedures:
 *   createDepositSession   — owner creates a deposit checkout link for a job
 *   createBalanceSession   — owner creates a final balance checkout link for a job
 *   listMyPayments         — customer lists their own payment history
 *   getJobPayments         — owner gets all payments for a specific job
 *   isConfigured           — public check: returns true if Stripe keys are set
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router, adminProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { payments, users, jobs } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  isStripeConfigured,
  createCheckoutSession,
  getOrCreateStripeCustomer,
} from "./stripe";
import { ENV } from "./_core/env";
import { publicProcedure } from "./_core/trpc";

export const paymentRouter = router({
  /** Public check — lets the UI know if Stripe is wired up */
  isConfigured: publicProcedure.query(() => isStripeConfigured()),

  /**
   * Owner creates a deposit checkout session for a specific job.
   * customerId must be the users.id of the customer (not the owner).
   */
  createDepositSession: adminProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        customerId: z.number().int().positive(),
        amountCents: z.number().int().min(50, "Minimum $0.50"),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Load job and customer
      const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const [customer] = await db.select().from(users).where(eq(users.id, input.customerId)).limit(1);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      // Get or create Stripe Customer
      const stripeCustomerId = await getOrCreateStripeCustomer(
        customer.id,
        customer.email,
        customer.name,
        customer.stripeCustomerId
      );

      // Persist stripeCustomerId if new
      if (stripeCustomerId !== customer.stripeCustomerId) {
        await db.update(users).set({ stripeCustomerId }).where(eq(users.id, customer.id));
      }

      const { sessionId, url } = await createCheckoutSession({
        jobId: job.id,
        jobTitle: job.title,
        amountCents: input.amountCents,
        type: "deposit",
        customerEmail: customer.email,
        customerName: customer.name,
        stripeCustomerId,
        userId: customer.id,
        successUrl: `${input.origin}/portal/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${input.origin}/portal/cancel`,
      });

      // Record the pending payment
      await db.insert(payments).values({
        jobId: job.id,
        customerId: customer.id,
        type: "deposit",
        amountCents: input.amountCents,
        status: "pending",
        stripeSessionId: sessionId,
      });

      return { url };
    }),

  /**
   * Owner creates a final balance checkout session for a specific job.
   */
  createBalanceSession: adminProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        customerId: z.number().int().positive(),
        amountCents: z.number().int().min(50, "Minimum $0.50"),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      if (!isStripeConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const [customer] = await db.select().from(users).where(eq(users.id, input.customerId)).limit(1);
      if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

      const stripeCustomerId = await getOrCreateStripeCustomer(
        customer.id,
        customer.email,
        customer.name,
        customer.stripeCustomerId
      );

      if (stripeCustomerId !== customer.stripeCustomerId) {
        await db.update(users).set({ stripeCustomerId }).where(eq(users.id, customer.id));
      }

      const { sessionId, url } = await createCheckoutSession({
        jobId: job.id,
        jobTitle: job.title,
        amountCents: input.amountCents,
        type: "balance",
        customerEmail: customer.email,
        customerName: customer.name,
        stripeCustomerId,
        userId: customer.id,
        successUrl: `${input.origin}/portal/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${input.origin}/portal/cancel`,
      });

      await db.insert(payments).values({
        jobId: job.id,
        customerId: customer.id,
        type: "balance",
        amountCents: input.amountCents,
        status: "pending",
        stripeSessionId: sessionId,
      });

      return { url };
    }),

  /**
   * Customer views their own payment history.
   * Returns payments for all jobs linked to the logged-in user.
   */
  listMyPayments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: payments.id,
        jobId: payments.jobId,
        type: payments.type,
        amountCents: payments.amountCents,
        status: payments.status,
        paidAt: payments.paidAt,
        createdAt: payments.createdAt,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
      })
      .from(payments)
      .leftJoin(jobs, eq(payments.jobId, jobs.id))
      .where(eq(payments.customerId, ctx.user.id))
      .orderBy(desc(payments.createdAt));

    return rows;
  }),

  /**
   * Owner views all payments for a specific job.
   */
  getJobPayments: adminProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(payments)
        .where(eq(payments.jobId, input.jobId))
        .orderBy(desc(payments.createdAt));

      return rows;
    }),

  /**
   * Owner gets a summary of all jobs with their payment status.
   * Used on the ops Jobs page payment panel.
   */
  listJobPaymentSummaries: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));

    return rows;
  }),
});
