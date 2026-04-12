import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { Resend } from "resend";
import { createJobberRequest, isJobberConnected } from "./jobber";
import { createOpsLead, getOwnerUser, getDb } from "./db";
import { quoteSubmissions } from "../drizzle/schema";
import { sendOwnerSms } from "./sms";

const quoteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(30).regex(/[0-9]/, "Phone must contain at least one digit"),
  email: z.string().email("Valid email is required").max(320),
  service: z.string().min(1, "Service is required").max(100),
  county: z.string().min(1, "County is required").max(100),
  acreage: z.string().max(50).optional().default(""),
  // Property / service address
  street: z.string().max(200).optional().default(""),
  city: z.string().max(100).optional().default(""),
  state: z.string().max(50).optional().default("TN"),
  zip: z.string().max(20).optional().default(""),
  message: z.string().max(2000).optional().default(""),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(data: QuoteInput): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const submittedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const addressLines = [
    data.street,
    [data.city, data.state, data.zip].filter(Boolean).join(" "),
  ].filter(Boolean);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;width:38%;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">${label}</span>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;">
        <span style="font-size:14px;color:#1a1a1a;">${value}</span>
      </td>
    </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Quote Request — Noland Earthworks</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">

        <!-- Top accent bar -->
        <tr><td style="background:#E07B2A;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${logoUrl}" alt="Noland Earthworks" height="52" style="display:block;" />
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="display:inline-block;background:#E07B2A;color:#ffffff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:4px;">New Quote Request</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background:#fdf6ee;border-bottom:1px solid #f0e4cc;padding:14px 36px;">
            <p style="margin:0;font-size:13px;color:#7a4f1a;">
              &#128276;&nbsp; A new quote request was submitted on <strong>${submittedAt}</strong>.
            </p>
          </td>
        </tr>

        <!-- Section: Contact Information -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Contact Information</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede6;border-radius:6px;overflow:hidden;">
              ${row("Full Name", escapeHtml(data.name))}
              ${row("Phone", `<a href="tel:${escapeHtml(data.phone)}" style="color:#E07B2A;text-decoration:none;font-weight:600;">${escapeHtml(data.phone)}</a>`)}
              ${row("Email", `<a href="mailto:${escapeHtml(data.email)}" style="color:#E07B2A;text-decoration:none;">${escapeHtml(data.email)}</a>`)}
            </table>
          </td>
        </tr>

        <!-- Section: Project Details -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Project Details</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede6;border-radius:6px;overflow:hidden;">
              ${row("Service Requested", `<strong>${escapeHtml(data.service)}</strong>`)}
              ${row("County", escapeHtml(data.county) + " County")}
              ${data.acreage ? row("Acreage", escapeHtml(data.acreage)) : ""}
              ${addressLines.length ? row("Property Address", addressLines.map(escapeHtml).join("<br />")) : ""}
            </table>
          </td>
        </tr>

        ${data.message ? `
        <!-- Section: Additional Notes -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Additional Notes</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <div style="background:#f9f7f4;border:1px solid #f0ede6;border-radius:6px;padding:14px 16px;font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.message)}</div>
          </td>
        </tr>` : ""}

        <!-- CTA -->
        <tr>
          <td style="padding:28px 36px;text-align:center;">
            <a href="https://secure.getjobber.com/work_requests" style="display:inline-block;background:#E07B2A;color:#ffffff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">View in Jobber &rarr;</a>
            <p style="margin:12px 0 0;font-size:12px;color:#aaa;">This request has been automatically synced to your Jobber account.</p>
          </td>
        </tr>

        <!-- Footer -->
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

        <!-- Bottom accent bar -->
        <tr><td style="background:#E07B2A;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildConfirmationEmailHtml(data: QuoteInput): string {
  const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
  const firstName = escapeHtml(data.name.split(" ")[0]);

  const addressLines = [
    data.street,
    [data.city, data.state, data.zip].filter(Boolean).join(" "),
  ].filter(Boolean);

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:9px 16px;border-bottom:1px solid #f0ede6;width:38%;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">${label}</span>
      </td>
      <td style="padding:9px 16px;border-bottom:1px solid #f0ede6;">
        <span style="font-size:14px;color:#1a1a1a;">${value}</span>
      </td>
    </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>We Received Your Quote Request — Noland Earthworks</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
    <tr><td align="center">

      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">

        <!-- Top accent bar -->
        <tr><td style="background:#E07B2A;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:28px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${logoUrl}" alt="Noland Earthworks" height="52" style="display:block;" />
                </td>
                <td align="right" style="vertical-align:middle;">
                  <span style="display:inline-block;background:#E07B2A;color:#ffffff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:6px 14px;border-radius:4px;">Request Received</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 36px 0;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#1a1a1a;">Thanks, ${firstName}!</h2>
            <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">We've received your quote request and will be in touch shortly. A member of our team typically responds within <strong>1 business day</strong>.</p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:20px 36px 0;"><hr style="border:none;border-top:1px solid #f0ede6;margin:0;" /></td></tr>

        <!-- Summary section header -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Your Request Summary</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede6;border-radius:6px;overflow:hidden;">
              ${row("Service", `<strong>${escapeHtml(data.service)}</strong>`)}
              ${row("County", escapeHtml(data.county) + " County")}
              ${data.acreage ? row("Acreage", escapeHtml(data.acreage)) : ""}
              ${addressLines.length ? row("Property Address", addressLines.map(escapeHtml).join("<br />")) : ""}
            </table>
          </td>
        </tr>

        <!-- Questions callout -->
        <tr>
          <td style="padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6ee;border:1px solid #f0e4cc;border-radius:8px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#7a4f1a;">Have questions in the meantime?</p>
                  <p style="margin:0;font-size:13px;color:#7a4f1a;line-height:1.5;">Call or text us at <a href="tel:6154064819" style="color:#E07B2A;font-weight:600;text-decoration:none;">(615) 406-4819</a> or reply directly to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 28px;text-align:center;">
            <a href="https://www.nolandearthworks.com" style="display:inline-block;background:#E07B2A;color:#ffffff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">Visit Our Website &rarr;</a>
          </td>
        </tr>

        <!-- Footer -->
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

        <!-- Bottom accent bar -->
        <tr><td style="background:#E07B2A;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`.trim();
}

export const quoteRouter = router({
  submit: publicProcedure.input(quoteSchema).mutation(async ({ input }) => {
    // 1. Send email via the pre-injected RESEND_API_KEY system secret
    if (ENV.resendApiKey) {
      try {
        const resend = new Resend(ENV.resendApiKey);
        const { error } = await resend.emails.send({
          from: "Noland Earthworks <noreply@nolandearthworks.com>",
          to: ["quotes@nolandearthworks.com"],
          replyTo: input.email,
          subject: `New Quote Request — ${input.service} (${input.county} County)`,
          html: buildEmailHtml(input),
        });
        if (error) {
          console.error("[Quote] Resend error:", error);
        }
      } catch (err) {
        console.error("[Quote] Failed to send email:", err);
      }
    }

    // 2. Send confirmation email to the customer
    if (ENV.resendApiKey) {
      try {
        const resend = new Resend(ENV.resendApiKey);
        const { error } = await resend.emails.send({
          from: "Noland Earthworks <noreply@nolandearthworks.com>",
          to: [input.email],
          replyTo: "quotes@nolandearthworks.com",
          subject: `We received your quote request — Noland Earthworks`,
          html: buildConfirmationEmailHtml(input),
        });
        if (error) {
          console.error("[Quote] Customer confirmation email error:", error);
        } else {
          console.log(`[Quote] Confirmation email sent to ${input.email}`);
        }
      } catch (err) {
        console.error("[Quote] Failed to send customer confirmation email:", err);
      }
    }

    // 3. Always send in-app owner notification as backup
    try {
      await notifyOwner({
        title: `New Quote Request — ${input.name} (${input.service})`,
        content: [
          `Name: ${input.name}`,
          `Phone: ${input.phone}`,
          `Email: ${input.email}`,
          `Service: ${input.service}`,
          `County: ${input.county} County`,
          input.acreage ? `Acreage: ${input.acreage}` : "",
          (input.street || input.city) ? `Address: ${[input.street, [input.city, input.state, input.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}` : "",
          input.message ? `\nProject Details:\n${input.message}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (err) {
      console.warn("[Quote] Owner notification failed:", err);
    }

    // 3b. Send SMS push notification to owner's phone
    try {
      const addressPart = [input.street, input.city].filter(Boolean).join(", ");
      const smsBody = [
        `🔔 New Quote — Noland Earthworks`,
        `Name: ${input.name}`,
        `Phone: ${input.phone}`,
        `Service: ${input.service} | ${input.county} County`,
        input.acreage ? `Acreage: ${input.acreage}` : "",
        addressPart ? `Address: ${addressPart}` : "",
        `View leads: https://www.nolandearthworks.com/ops/leads`,
      ]
        .filter(Boolean)
        .join("\n");
      await sendOwnerSms(smsBody);
    } catch (err) {
      console.warn("[Quote] SMS notification failed:", err);
    }

    // 3. Send to Jobber if connected — persist result to quote_submissions log
    let jobberStatus: "synced" | "failed" | "skipped" = "skipped";
    let jobberRequestId: string | undefined;
    let jobberRequestUrl: string | undefined;
    let jobberError: string | undefined;

    try {
      const jobberReady = await isJobberConnected();
      if (jobberReady) {
        const result = await createJobberRequest(input);
        jobberStatus = "synced";
        jobberRequestId = result.requestId;
        jobberRequestUrl = result.requestUrl;
      }
    } catch (err) {
      jobberStatus = "failed";
      jobberError = err instanceof Error ? err.message : String(err);
      console.error("[Quote] Jobber request creation failed:", err);
      // Non-fatal: email + notification already sent.
      // Notify owner so no lead is silently lost.
      try {
        await notifyOwner({
          title: "⚠️ Jobber Sync Failed — Manual Entry Required",
          content: [
            `A quote was submitted but could NOT be automatically added to Jobber.`,
            ``,
            `Customer: ${input.name}`,
            `Phone: ${input.phone}`,
            `Email: ${input.email}`,
            `Service: ${input.service}`,
            `County: ${input.county}`,
            input.acreage ? `Acreage: ${input.acreage}` : "",
            input.message ? `Details: ${input.message}` : "",
            ``,
            `Error: ${jobberError}`,
            ``,
            `Please add this request to Jobber manually, or re-authorize at:`,
            `https://www.nolandearthworks.com/api/jobber/authorize`,
          ]
            .filter(line => line !== undefined)
            .join("\n"),
        });
      } catch (notifyErr) {
        console.warn("[Quote] Jobber failure notification also failed:", notifyErr);
      }
    }

    // Persist submission to quote_submissions log
    try {
      const db = await getDb();
      if (db) {
        await db.insert(quoteSubmissions).values({
          name: input.name,
          phone: input.phone,
          email: input.email,
          service: input.service,
          county: input.county,
          acreage: input.acreage || null,
          street: input.street || null,
          city: input.city || null,
          state: input.state || null,
          zip: input.zip || null,
          message: input.message || null,
          jobberStatus,
          jobberRequestId: jobberRequestId ?? null,
          jobberRequestUrl: jobberRequestUrl ?? null,
          jobberError: jobberError ?? null,
        });
        console.log(`[Quote] Submission logged for ${input.name} (Jobber: ${jobberStatus})`);
      }
    } catch (logErr) {
      console.warn("[Quote] Failed to log submission:", logErr);
    }

    // Auto-create a lead in the ops dashboard
    try {
      const owner = await getOwnerUser();
      if (owner) {
        // Map the free-text service to a jobType enum value
        const serviceMap: Record<string, string> = {
          "Land Clearing": "land_clearing",
          "Forestry Mulching": "forestry_mulching",
          "Brush Removal": "brush_removal",
          "Stump Grinding": "stump_grinding",
          "Wildfire Mitigation": "wildfire_mitigation",
        };
        const address = [input.street, input.city, input.state, input.zip]
          .filter(Boolean)
          .join(", ");
        const notes = [
          input.acreage ? `Acreage: ${input.acreage}` : "",
          address ? `Address: ${address}` : "",
          input.message ? `\nProject Details:\n${input.message}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        await createOpsLead({
          userId: owner.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: address || undefined,
          source: "website",
          stage: "new",
          jobType: serviceMap[input.service] ?? input.service,
          notes: notes || undefined,
        });
        console.log(`[Quote] Lead created for ${input.name}`);
      } else {
        console.warn("[Quote] Owner not found in DB — lead not created (owner must log in once first)");
      }
    } catch (err) {
      console.warn("[Quote] Failed to create ops lead:", err);
    }

    return { success: true };
  }),
});
