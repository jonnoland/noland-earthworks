import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { Resend } from "resend";
import { createJobberRequest, isJobberConnected, createJobberClientFromLead } from "./jobber";
import { createOpsLead, upsertOpsLeadByPhone, getOwnerUser, getDb } from "./db";
import { storagePut } from "./storage";
import { quoteSubmissions } from "../drizzle/schema";
import { sendOwnerSms } from "./sms";
import { qualifyLead } from "./leadQualifier";
import { opsLeads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
  addOns: z.array(z.string()).optional().default([]),
  // Parcel data from TN statewide parcel API
  parcelOwner: z.string().max(255).optional().default(""),
  parcelId: z.string().max(100).optional().default(""),
  deedAcres: z.number().optional(),
  adjustedAcres: z.number().optional(),
  /** ROW Clearing — primary unit (linear feet). When provided, acreage field is ignored for ROW. */
  rowLinearFeet: z.number().int().min(1).max(200000).optional(),
  /** ROW Clearing — corridor width in feet. Defaults to 30 ft when not provided. */
  rowCorridorWidthFt: z.number().int().min(4).max(500).optional(),
  estimatedRange: z.string().max(100).optional().default(""),
  /** Property photos — array of S3 CDN URLs uploaded before form submission */
  propertyPhotoUrls: z.array(z.string().url()).max(10).optional().default([]),
  /** Map pin latitude dropped by the user */
  propertyPinLat: z.number().min(-90).max(90).optional(),
  /** Map pin longitude dropped by the user */
  propertyPinLng: z.number().min(-180).max(180).optional(),
  /** Client type — drives proposal workflow (unit-price for government) */
  clientType: z.enum(["residential", "commercial", "government"]).optional().default("residential"),
  /** RFP/bid document CDN URLs — only set for government/municipal leads */
  rfpDocumentUrls: z.array(z.string().url()).max(5).optional().default([]),
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
              ${row("Client Type", `<strong style="text-transform:capitalize;">${escapeHtml(data.clientType ?? "residential")}</strong>${data.clientType === "government" ? " &nbsp;<span style=\"display:inline-block;background:#1a4f8a;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;padding:2px 7px;border-radius:3px;\">GOV</span>" : ""}`)} 
              ${row("Service Requested", `<strong>${escapeHtml(data.service)}</strong>`)}
              ${row("County", escapeHtml(data.county) + " County")}
              ${(data.service === 'right-of-way-clearing' || data.service === 'Right-of-Way Clearing')
                ? (data.rowLinearFeet ? row("Corridor Length", `${data.rowLinearFeet.toLocaleString()} linear feet`) : (data.acreage ? row("Acreage (provided)", escapeHtml(data.acreage)) : ""))
                : (data.acreage ? row("Acreage", escapeHtml(data.acreage)) : "")}
              ${(data.service === 'right-of-way-clearing' || data.service === 'Right-of-Way Clearing') && data.rowCorridorWidthFt ? row("Corridor Width", `${data.rowCorridorWidthFt} ft`) : ""}
              ${(data.service === 'right-of-way-clearing' || data.service === 'Right-of-Way Clearing') && data.rowLinearFeet && data.rowCorridorWidthFt ? row("Effective Acres", `${((data.rowLinearFeet * data.rowCorridorWidthFt) / 43560).toFixed(3)} acres`) : ""}
              ${addressLines.length ? row("Property Address", addressLines.map(escapeHtml).join("<br />")) : ""}
              ${data.addOns && data.addOns.length > 0 ? row("Add-On Services", data.addOns.map(escapeHtml).join("<br />")) : ""}
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

        ${data.propertyPinLat != null && data.propertyPinLng != null ? `
        <!-- Section: Property Location Pin -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Property Location</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0ede6;border-radius:6px;overflow:hidden;">
              <tr>
                <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;width:38%;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">Coordinates</span>
                </td>
                <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;">
                  <span style="font-size:14px;color:#1a1a1a;">${data.propertyPinLat.toFixed(5)}, ${data.propertyPinLng.toFixed(5)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 16px;width:38%;">
                  <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">Open in Maps</span>
                </td>
                <td style="padding:10px 16px;">
                  <a href="https://www.google.com/maps?q=${data.propertyPinLat},${data.propertyPinLng}" style="color:#E07B2A;text-decoration:none;font-weight:600;font-size:14px;">View on Google Maps &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ""}

        ${data.rfpDocumentUrls && data.rfpDocumentUrls.length > 0 ? `
        <!-- Section: RFP Documents -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1a4f8a;border-bottom:2px solid #1a4f8a;padding-bottom:6px;">RFP / Bid Documents (${data.rfpDocumentUrls.length})</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${data.rfpDocumentUrls.map((url, i) => {
                const fileName = url.split("/").pop()?.replace(/^\d+-[a-z0-9]+-/, "") ?? `Document ${i + 1}`;
                return `<tr><td style="padding:4px 0;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#1a4f8a;font-size:13px;">${escapeHtml(decodeURIComponent(fileName))}</a></td></tr>`;
              }).join("")}
            </table>
          </td>
        </tr>` : ""}

        ${data.propertyPhotoUrls && data.propertyPhotoUrls.length > 0 ? `
        <!-- Section: Property Photos -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#E07B2A;border-bottom:2px solid #E07B2A;padding-bottom:6px;">Property Photos (${data.propertyPhotoUrls.length})</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${data.propertyPhotoUrls.map((url, i) => `
                <td style="padding:4px;width:${Math.floor(100 / Math.min(data.propertyPhotoUrls!.length, 3))}%;vertical-align:top;">
                  <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                    <img src="${escapeHtml(url)}" alt="Property photo ${i + 1}" width="100%" style="display:block;border-radius:4px;border:1px solid #f0ede6;" />
                  </a>
                </td>`).join("")}
              </tr>
            </table>
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
              ${(data.service === 'right-of-way-clearing' || data.service === 'Right-of-Way Clearing')
                ? (data.rowLinearFeet ? row("Corridor Length", `${data.rowLinearFeet.toLocaleString()} linear feet`) : (data.acreage ? row("Acreage (provided)", escapeHtml(data.acreage)) : ""))
                : (data.acreage ? row("Acreage", escapeHtml(data.acreage)) : "")}
              ${(data.service === 'right-of-way-clearing' || data.service === 'Right-of-Way Clearing') && data.rowCorridorWidthFt ? row("Corridor Width", `${data.rowCorridorWidthFt} ft`) : ""}
              ${addressLines.length ? row("Property Address", addressLines.map(escapeHtml).join("<br />")) : ""}
              ${data.addOns && data.addOns.length > 0 ? row("Add-On Services", data.addOns.map(escapeHtml).join("<br />")) : ""}
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
    // 0. Run AI lead qualifier (non-blocking — fires in background)
    let qualification: Awaited<ReturnType<typeof qualifyLead>> | null = null;
    try {
      qualification = await qualifyLead(input);
      console.log(`[Quote] AI score for ${input.name}: ${qualification.score}`);
    } catch (err) {
      console.warn("[Quote] AI qualifier failed (non-fatal):", err);
    }

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
    const scoreLabel = qualification ? `[${qualification.score.toUpperCase()}]` : "";
    try {
      await notifyOwner({
        title: `New Quote Request ${scoreLabel} — ${input.name} (${input.service})`,
        content: [
          qualification ? `AI Score: ${qualification.score.toUpperCase()}` : "",
          qualification?.summary ? `Summary: ${qualification.summary}` : "",
          qualification?.flags && qualification.flags.length > 0 ? `Flags: ${qualification.flags.join(" | ")}` : "",
          ``,
          `Name: ${input.name}`,
          `Phone: ${input.phone}`,
          `Email: ${input.email}`,
          input.clientType && input.clientType !== "residential" ? `Client Type: ${input.clientType.toUpperCase()}` : "",
          `Service: ${input.service}`,
          `County: ${input.county} County`,
          (() => {
            const isRow = input.service === 'right-of-way-clearing' || input.service === 'Right-of-Way Clearing';
            if (isRow && input.rowLinearFeet) {
              const corridorWidth = input.rowCorridorWidthFt ?? 30;
              const effAcres = ((input.rowLinearFeet * corridorWidth) / 43560).toFixed(3);
              return `ROW: ${input.rowLinearFeet.toLocaleString()} linear feet × ${corridorWidth} ft wide = ${effAcres} effective acres`;
            }
            return input.acreage ? `Acreage: ${input.acreage}` : "";
          })(),
          (input.street || input.city) ? `Address: ${[input.street, [input.city, input.state, input.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}` : "",
          input.message ? `\nProject Details:\n${input.message}` : "",
          input.propertyPhotoUrls && input.propertyPhotoUrls.length > 0 ? `\nProperty Photos: ${input.propertyPhotoUrls.length} photo${input.propertyPhotoUrls.length > 1 ? "s" : ""} attached` : "",
          input.propertyPinLat != null && input.propertyPinLng != null ? `Property Pin: https://www.google.com/maps?q=${input.propertyPinLat},${input.propertyPinLng}` : "",
          input.rfpDocumentUrls && input.rfpDocumentUrls.length > 0 ? `\nRFP Documents: ${input.rfpDocumentUrls.length} file${input.rfpDocumentUrls.length > 1 ? "s" : ""} attached` : "",
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
        `New Quote ${scoreLabel} — Noland Earthworks`,
        `Name: ${input.name}`,
        `Phone: ${input.phone}`,
        `Service: ${input.service} | ${input.county} County`,
        (() => {
          const isRow = input.service === 'right-of-way-clearing' || input.service === 'Right-of-Way Clearing';
          if (isRow && input.rowLinearFeet) {
            const corridorWidth = input.rowCorridorWidthFt ?? 30;
            const effAcres = ((input.rowLinearFeet * corridorWidth) / 43560).toFixed(2);
            return `ROW: ${input.rowLinearFeet.toLocaleString()} LF × ${corridorWidth} ft = ${effAcres} ac`;
          }
          return input.acreage ? `Acreage: ${input.acreage}` : "";
        })(),
        addressPart ? `Address: ${addressPart}` : "",
        qualification?.summary ? `AI: ${qualification.summary}` : "",
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
            `https://nolandearthworks.com/api/jobber/authorize`,
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
          rowLinearFeet: input.rowLinearFeet ?? null,
          rowCorridorWidthFt: input.rowCorridorWidthFt ?? null,
          street: input.street || null,
          city: input.city || null,
          state: input.state || null,
          zip: input.zip || null,
          message: input.message || null,
          addOns: input.addOns && input.addOns.length > 0 ? JSON.stringify(input.addOns) : null,
          parcelOwner: input.parcelOwner || null,
          parcelId: input.parcelId || null,
          deedAcres: input.deedAcres != null ? String(input.deedAcres) : null,
          adjustedAcres: input.adjustedAcres != null ? String(input.adjustedAcres) : null,
          estimatedRange: input.estimatedRange || null,
          propertyPhotoUrls: input.propertyPhotoUrls && input.propertyPhotoUrls.length > 0 ? JSON.stringify(input.propertyPhotoUrls) : null,
          propertyPinLat: input.propertyPinLat != null ? String(input.propertyPinLat) : null,
          propertyPinLng: input.propertyPinLng != null ? String(input.propertyPinLng) : null,
          rfpDocumentUrls: input.rfpDocumentUrls && input.rfpDocumentUrls.length > 0 ? JSON.stringify(input.rfpDocumentUrls) : null,
          clientType: input.clientType ?? "residential",
          aiScore: qualification?.score ?? null,
          aiSummary: qualification?.summary ?? null,
          aiFlags: qualification?.flags && qualification.flags.length > 0 ? JSON.stringify(qualification.flags) : null,
          aiDraftResponse: qualification?.draftResponse ?? null,
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
          "Land Management": "land_clearing",
          "Forestry Mulching": "forestry_mulching",
          "Brush Removal": "brush_removal",
          "Stump Grinding": "stump_grinding",
          "Wildfire Mitigation": "wildfire_mitigation",
          "Trail Cutting": "trail_cutting",
          "trail-cutting": "trail_cutting",
        };
        const address = [input.street, input.city, input.state, input.zip]
          .filter(Boolean)
          .join(", ");
        const notes = [
          qualification ? `AI Score: ${qualification.score.toUpperCase()}` : "",
          qualification?.summary ? `AI Summary: ${qualification.summary}` : "",
          qualification?.flags && qualification.flags.length > 0 ? `AI Flags: ${qualification.flags.join(" | ")}` : "",
          (() => {
            const isRow = input.service === 'right-of-way-clearing' || input.service === 'Right-of-Way Clearing';
            if (isRow && input.rowLinearFeet) {
              const corridorWidth = input.rowCorridorWidthFt ?? 30;
              const effAcres = ((input.rowLinearFeet * corridorWidth) / 43560).toFixed(3);
              return `ROW: ${input.rowLinearFeet.toLocaleString()} linear feet × ${corridorWidth} ft wide = ${effAcres} effective acres`;
            }
            return input.acreage ? `Acreage: ${input.acreage}` : "";
          })(),
          address ? `Address: ${address}` : "",
          input.message ? `\nProject Details:\n${input.message}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        // Upsert by phone — prevents duplicate leads when the same person submits multiple quote requests
        const { created: quoteLeadCreated } = await upsertOpsLeadByPhone({
          userId: owner.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: address || undefined,
          source: "website",
          stage: "new",
          jobType: serviceMap[input.service] ?? input.service,
          notes: notes || undefined,
          clientType: input.clientType ?? "residential",
        });
        console.log(`[Quote] Lead ${quoteLeadCreated ? "created" : "updated"} for ${input.name}`);
      } else {
        console.warn("[Quote] Owner not found in DB — lead not created (owner must log in once first)");
      }
    } catch (err) {
      console.warn("[Quote] Failed to create ops lead:", err);
    }

    // Add to Jobber clients list (fire-and-forget)
    createJobberClientFromLead({
      name: input.name,
      email: input.email || undefined,
      phone: input.phone || undefined,
      address: [input.street, input.city, input.state, input.zip].filter(Boolean).join(", ") || undefined,
    }).catch(err => console.warn("[Quote] Jobber client creation failed:", err));

    return {
      success: true,
      ballparkRange: qualification?.ballparkRange ?? "",
      ballparkNote: qualification?.ballparkNote ?? "",
    };
  }),

  // ─── Parcel Lookup ────────────────────────────────────────────────────────────
  // Geocodes an address via Google, then queries the Tennessee statewide parcel
  // feature service (free, no API key, updated monthly by the Comptroller).
  // Returns deed acreage, owner of record, county, and a link to the TN
  // Property Assessor page for the parcel.
  parcelLookup: publicProcedure
    .input(z.object({ address: z.string().min(3) }))
    .query(async ({ input }) => {
      // 1. Geocode the address to lat/lon using Google Maps Geocoding API
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input.address + ", Tennessee")}&key=${ENV.googlePlacesApiKey}`;
      const geoRes = await fetch(geocodeUrl);
      if (!geoRes.ok) throw new Error("Geocoding request failed");
      const geoData = await geoRes.json() as {
        status: string;
        results: Array<{
          geometry: { location: { lat: number; lng: number } };
          formatted_address: string;
          address_components: Array<{ long_name: string; short_name: string; types: string[] }>;
        }>;
      };
      if (geoData.status !== "OK" || !geoData.results.length) {
        return { found: false, reason: "Address not found" };
      }
      const { lat, lng } = geoData.results[0].geometry.location;

      // 2. Convert lat/lon to Web Mercator (WKID 102100) for the ArcGIS query
      const x = lng * 20037508.34 / 180;
      const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / Math.PI * 20037508.34;
      const geometry = JSON.stringify({ x: Math.round(x), y: Math.round(y), spatialReference: { wkid: 102100 } });

      // 3. Query the Tennessee Property Boundaries Public Use feature service
      const parcelUrl = `https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query?geometry=${encodeURIComponent(geometry)}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=PARCELID,ADDRESS,OWNER,OWNER2,DEEDAC,COUNTY_NAME,LINK_TPAD,LINK_TPV&f=json`;
      const parcelRes = await fetch(parcelUrl);
      if (!parcelRes.ok) throw new Error("Parcel service request failed");
      const parcelData = await parcelRes.json() as {
        features?: Array<{ attributes: Record<string, unknown> }>;
        error?: { message: string };
      };
      if (parcelData.error) throw new Error(`Parcel service error: ${parcelData.error.message}`);
      if (!parcelData.features || parcelData.features.length === 0) {
        return { found: false, reason: "No parcel found at this location" };
      }

      const attr = parcelData.features[0].attributes;
      const deedAcres = typeof attr.DEEDAC === "number" ? attr.DEEDAC : null;
      const owner = typeof attr.OWNER === "string" ? attr.OWNER : null;
      const owner2 = typeof attr.OWNER2 === "string" && attr.OWNER2 ? attr.OWNER2 : null;
      const countyName = typeof attr.COUNTY_NAME === "string" ? attr.COUNTY_NAME : null;
      const parcelAddress = typeof attr.ADDRESS === "string" ? attr.ADDRESS : null;
      const tpadLink = typeof attr.LINK_TPAD === "string" ? attr.LINK_TPAD : null;
      const tpvLink = typeof attr.LINK_TPV === "string" ? attr.LINK_TPV : null;

      const parcelId = typeof attr.PARCELID === "string" ? attr.PARCELID : null;
      return {
        found: true,
        lat,
        lng,
        deedAcres,
        owner,
        owner2,
        countyName,
        parcelAddress,
        parcelId,
        tpadLink,
        tpvLink,
        geocodedAddress: geoData.results[0].formatted_address,
      };
    }),

  // ─── Property Photo Upload ────────────────────────────────────────────────────
  // Accepts a base64-encoded image, uploads to S3, returns the CDN URL.
  // Called from the quote form before final submission so URLs can be embedded.
  uploadRfpDocument: publicProcedure
    .input(
      z.object({
        base64: z.string().min(1),
        mimeType: z.string().default("application/pdf"),
        fileName: z.string().max(200).default("document"),
      })
    )
    .mutation(async ({ input }) => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
      ];
      if (!allowedTypes.includes(input.mimeType)) {
        throw new Error(`Unsupported document type: ${input.mimeType}`);
      }
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.byteLength > 25 * 1024 * 1024) {
        throw new Error("Document exceeds 25 MB limit");
      }
      const extMap: Record<string, string> = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "text/plain": "txt",
      };
      const ext = extMap[input.mimeType] ?? "bin";
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const key = `rfp-documents/${Date.now()}-${randomSuffix}-${safeName}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, fileName: input.fileName };
    }),

  uploadPropertyPhoto: publicProcedure
    .input(
      z.object({
        base64: z.string().min(1),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/heic", "image/webp", "image/gif"];
      if (!allowedTypes.includes(input.mimeType)) {
        throw new Error(`Unsupported image type: ${input.mimeType}`);
      }
      // Enforce 10 MB limit on the decoded buffer
      const buffer = Buffer.from(input.base64, "base64");
      if (buffer.byteLength > 10 * 1024 * 1024) {
        throw new Error("Image exceeds 10 MB limit");
      }
      const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const key = `property-photos/${Date.now()}-${randomSuffix}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  // Google Places Autocomplete — server-side proxy so no SDK needed on the quote page
  placesAutocomplete: publicProcedure
    .input(z.object({ input: z.string().min(1).max(200) }))
    .query(async ({ input }) => {
      const apiKey = ENV.googlePlacesApiKey;
      if (!apiKey) return { suggestions: [] };
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input.input)}&components=country:us&types=address&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return { suggestions: [] };
      const data = await res.json() as { predictions?: Array<{ description: string; place_id: string }> };
      return {
        suggestions: (data.predictions ?? []).slice(0, 5).map((p) => ({
          description: p.description,
          placeId: p.place_id,
        })),
      };
    }),
});
