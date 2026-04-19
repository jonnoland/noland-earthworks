/**
 * teamRouter — Employee registration and approval procedures.
 *
 * Public:  submitRegistration  (no auth required — employees haven't logged in yet)
 * Owner:   listRegistrations, approveRegistration, denyRegistration
 */

import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { employeeRegistrations, type EmployeeRegistration } from "../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";

// ─── Role labels for human-readable notifications ────────────────────────────
const roleLabels: Record<string, string> = {
  field_crew: "Field Crew (schedule & jobs view)",
  office: "Office (jobs, invoices & quotes view)",
  supervisor: "Supervisor (full ops view except settings)",
};

// ─── Owner guard ─────────────────────────────────────────────────────────────
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required." });
  }
  return next({ ctx });
});

export const teamRouter = router({
  /**
   * Public — any visitor can submit a registration request.
   * No auth required because employees don't have an account yet.
   */
  submitRegistration: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email().max(320),
        phone: z.string().max(50).optional(),
        requestedRole: z.enum(["field_crew", "office", "supervisor"]),
        message: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check for duplicate pending/approved submission from same email
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db
        .select()
        .from(employeeRegistrations)
        .where(eq(employeeRegistrations.email, input.email))
        .limit(1);

      if (existing.length > 0 && existing[0].status !== "denied") {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            existing[0].status === "approved"
              ? "An account with this email has already been approved. Please sign in."
              : "A registration request for this email is already pending review.",
        });
      }

      const [row] = await db
        .insert(employeeRegistrations)
        .values({
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          requestedRole: input.requestedRole,
          message: input.message ?? null,
          status: "pending",
        })
        .$returningId();

      // Notify owner
      await notifyOwner({
        title: "New Employee Registration Request",
        content: `${input.name} (${input.email}) has requested ${roleLabels[input.requestedRole] ?? input.requestedRole} access.\n\nReview at /ops/team.`,
      });

      return { id: row.id };
    }),

  /**
   * Owner — list all registrations, newest first.
   */
  listRegistrations: ownerProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "denied", "all"]).optional().default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select()
        .from(employeeRegistrations)
        .orderBy(desc(employeeRegistrations.createdAt));

      if (input.status === "all") return rows;
      return rows.filter((r: EmployeeRegistration) => r.status === (input.status as EmployeeRegistration["status"]));
    }),

  /**
   * Owner — approve a registration.
   * Updates the record status; the employee then signs in via Manus OAuth.
   * The owner can optionally add a note.
   */
  approveRegistration: ownerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        ownerNote: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [reg] = await db
        .select()
        .from(employeeRegistrations)
        .where(eq(employeeRegistrations.id, input.id))
        .limit(1);

      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found." });
      if (reg.status === "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already approved." });
      }

      await db
        .update(employeeRegistrations)
        .set({ status: "approved", ownerNote: input.ownerNote ?? null })
        .where(eq(employeeRegistrations.id, input.id));

      return { success: true };
    }),

  /**
   * Owner — deny a registration with an optional note.
   */
  denyRegistration: ownerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        ownerNote: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [reg] = await db
        .select()
        .from(employeeRegistrations)
        .where(eq(employeeRegistrations.id, input.id))
        .limit(1);

      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found." });

      await db
        .update(employeeRegistrations)
        .set({ status: "denied", ownerNote: input.ownerNote ?? null })
        .where(eq(employeeRegistrations.id, input.id));

      return { success: true };
    }),

  /**
   * Owner — count of pending registrations (used for sidebar badge).
   */
  pendingCount: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const rows = await db
      .select()
      .from(employeeRegistrations)
      .where(eq(employeeRegistrations.status, "pending"));
    return { count: rows.length };
  }),
});
