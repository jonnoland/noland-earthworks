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
import { Resend } from "resend";

// ─── Email helper ─────────────────────────────────────────────────────────────
function getResend() {
  return ENV.resendApiKey ? new Resend(ENV.resendApiKey) : null;
}

async function sendRegistrationEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) return; // silently skip if Resend not configured
  try {
    await resend.emails.send({
      from: "Noland Earthworks <noreply@nolandearthworks.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch {
    // Non-fatal — do not throw; owner notification still goes through
  }
}

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

      // Confirmation email to requestor
      await sendRegistrationEmail({
        to: input.email,
        subject: "Access Request Received — Noland Earthworks",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
            <div style="background:#1a1a1a;padding:24px 32px">
              <h1 style="color:#c2783c;font-size:20px;margin:0">Noland Earthworks, LLC</h1>
              <p style="color:#888;font-size:12px;margin:4px 0 0">Operations Portal</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:15px;margin:0 0 16px">Hi ${input.name},</p>
              <p style="font-size:14px;color:#333;margin:0 0 16px">
                Your access request for the Noland Earthworks Operations Portal has been received.
                The owner will review your request and you will receive a follow-up email once a decision has been made.
              </p>
              <div style="background:#f5f5f5;border-left:4px solid #c2783c;padding:12px 16px;margin:0 0 24px;border-radius:0 4px 4px 0">
                <p style="margin:0;font-size:13px;color:#555"><strong>Access level requested:</strong> ${roleLabels[input.requestedRole] ?? input.requestedRole}</p>
              </div>
              <p style="font-size:13px;color:#888;margin:0">
                If you did not submit this request, you can safely ignore this email.
              </p>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e0e0e0">
              <p style="font-size:11px;color:#aaa;margin:0">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated &mdash; Middle Tennessee</p>
            </div>
          </div>
        `,
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

      // Approval email to requestor
      await sendRegistrationEmail({
        to: reg.email,
        subject: "Your Access Has Been Approved — Noland Earthworks",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
            <div style="background:#1a1a1a;padding:24px 32px">
              <h1 style="color:#c2783c;font-size:20px;margin:0">Noland Earthworks, LLC</h1>
              <p style="color:#888;font-size:12px;margin:4px 0 0">Operations Portal</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:15px;margin:0 0 16px">Hi ${reg.name},</p>
              <p style="font-size:14px;color:#333;margin:0 0 16px">
                Your access request has been approved. You can now sign in to the Noland Earthworks Operations Portal.
              </p>
              <div style="background:#f0faf0;border-left:4px solid #22c55e;padding:12px 16px;margin:0 0 24px;border-radius:0 4px 4px 0">
                <p style="margin:0;font-size:13px;color:#555"><strong>Access level:</strong> ${roleLabels[reg.requestedRole] ?? reg.requestedRole}</p>
                ${input.ownerNote ? `<p style="margin:8px 0 0;font-size:13px;color:#555"><strong>Note from owner:</strong> ${input.ownerNote}</p>` : ""}
              </div>
              <a href="https://nolandearthworks.com/ops" style="display:inline-block;background:#c2783c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600">Sign In to Operations Portal</a>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e0e0e0">
              <p style="font-size:11px;color:#aaa;margin:0">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated &mdash; Middle Tennessee</p>
            </div>
          </div>
        `,
      });

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

      // Denial email to requestor
      await sendRegistrationEmail({
        to: reg.email,
        subject: "Update on Your Access Request — Noland Earthworks",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
            <div style="background:#1a1a1a;padding:24px 32px">
              <h1 style="color:#c2783c;font-size:20px;margin:0">Noland Earthworks, LLC</h1>
              <p style="color:#888;font-size:12px;margin:4px 0 0">Operations Portal</p>
            </div>
            <div style="padding:32px">
              <p style="font-size:15px;margin:0 0 16px">Hi ${reg.name},</p>
              <p style="font-size:14px;color:#333;margin:0 0 16px">
                After review, your access request for the Noland Earthworks Operations Portal was not approved at this time.
              </p>
              ${input.ownerNote ? `
              <div style="background:#fff8f0;border-left:4px solid #c2783c;padding:12px 16px;margin:0 0 24px;border-radius:0 4px 4px 0">
                <p style="margin:0;font-size:13px;color:#555"><strong>Note from owner:</strong> ${input.ownerNote}</p>
              </div>` : ""}
              <p style="font-size:13px;color:#888;margin:0">
                If you have questions, contact us at nolandearthworks.com.
              </p>
            </div>
            <div style="background:#f5f5f5;padding:16px 32px;border-top:1px solid #e0e0e0">
              <p style="font-size:11px;color:#aaa;margin:0">Noland Earthworks, LLC &mdash; Veteran-Owned &amp; Operated &mdash; Middle Tennessee</p>
            </div>
          </div>
        `,
      });

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
