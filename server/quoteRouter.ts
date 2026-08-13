import { z } from "zod";
import { invokeLLM, type Message, type TextContent, type FileContent } from "./_core/llm";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { Resend } from "resend";
import { createOpsLead, upsertOpsLeadByPhone, getOwnerUser, getDb, upsertNativeClient } from "./db";
import { storagePut } from "./storage";
import { quoteSubmissions, nativeQuotes } from "../drizzle/schema";
import { sendOwnerSms } from "./sms";
import { qualifyLead } from "./leadQualifier";
import { getServiceDisplayName } from "./serviceTaxonomy";
import { opsLeads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Strip markdown code fences from LLM JSON responses
function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}


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
            <a href="https://nolandearthworks.com/ops/quotes" style="display:inline-block;background:#E07B2A;color:#ffffff;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:14px 32px;border-radius:6px;text-decoration:none;">View in All Quotes &rarr;</a>
            <p style="margin:12px 0 0;font-size:12px;color:#aaa;">This request has been added to your All Quotes section under Web Requests.</p>
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

    // 3. In-app Manus notification disabled — owner prefers not to receive these
    // Quote requests are visible in /ops/leads with full AI scoring and detail
    const scoreLabel = qualification ? `[${qualification.score.toUpperCase()}]` : "";
    if (false as boolean) {
    try {
      await notifyOwner({ // disabled
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
    } // end disabled block

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
    // Jobber sync removed — quote is stored natively via quoteSubmissions table

    // Persist submission to quote_submissions log
    let submissionId: number | null = null;
    let leadId: number | null = null;
    try {
      const db = await getDb();
      if (db) {
        const [submissionResult] = await db.insert(quoteSubmissions).values({
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
        });
        submissionId = (submissionResult as any).insertId ?? null;
        console.log(`[Quote] Submission logged for ${input.name} (id=${submissionId})`);
      }
    } catch (logErr) {
      console.warn("[Quote] Failed to log submission:", logErr);
    }

    // Auto-create a lead in the ops dashboard
    try {
      const owner = await getOwnerUser();
      if (owner) {
        const serviceLabel = getServiceDisplayName(input.service);
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
        const { leadId: upsertedLeadId, created: quoteLeadCreated } = await upsertOpsLeadByPhone({
          userId: owner.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: address || undefined,
          source: "website",
          stage: "new",
          jobType: serviceLabel,
          notes: notes || undefined,
          clientType: input.clientType ?? "residential",
        });
        leadId = upsertedLeadId;
        console.log(`[Quote] Lead ${quoteLeadCreated ? "created" : "updated"} for ${input.name}`);
      } else {
        console.warn("[Quote] Owner not found in DB — lead not created (owner must log in once first)");
      }
    } catch (err) {
      console.warn("[Quote] Failed to create ops lead:", err);
    }

    // Auto-upsert into native_clients so the client directory stays current
    try {
      const address = [input.street, input.city, input.state, input.zip].filter(Boolean).join(", ");
      await upsertNativeClient({
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        address: address || null,
        source: "website_quote",
      });
    } catch (clientErr) {
      console.warn("[Quote] Failed to upsert native client:", clientErr);
    }


    // Auto-create a native quote (web_request) so it appears in All Quotes section
    try {
      const db2 = await getDb();
      if (db2) {
        const address = [input.street, input.city, input.state, input.zip]
          .filter(Boolean)
          .join(", ");
        const serviceLabel = getServiceDisplayName(input.service);
        const title = `${serviceLabel} \u2014 ${input.name}${input.county ? ` (${input.county} Co.)` : ""}`;
        const { randomBytes } = await import("crypto");
        const portalToken = randomBytes(32).toString("hex");
        // Parse ballparkRange (e.g. "$2,000 \u2013 $4,500") into a midpoint totalCents for the AI estimate
        const aiRange = qualification?.ballparkRange ?? "";
        let aiTotalCents = 0;
        let aiLineItems = "[]";
        if (aiRange) {
          const nums = aiRange.replace(/[$,]/g, "").match(/\d+(?:\.\d+)?/g);
          if (nums && nums.length >= 2) {
            const lo = parseFloat(nums[0]);
            const hi = parseFloat(nums[1]);
            const mid = Math.round((lo + hi) / 2);
            aiTotalCents = mid * 100;
            const acreageLabel = input.acreage ? ` (${input.acreage.replace(/-/g, "\u2013")} ac)` : "";
            aiLineItems = JSON.stringify([{
              description: `${serviceLabel}${acreageLabel} \u2014 AI estimate pending site visit`,
              qty: 1,
              unitPriceCents: aiTotalCents,
              totalCents: aiTotalCents,
            }]);
          }
        }
        const notes = [
          `[Web Request]`,
          aiRange ? `AI Estimate: ${aiRange}` : "",
          qualification?.ballparkNote ? `Note: ${qualification.ballparkNote}` : "",
          qualification?.score ? `AI Score: ${qualification.score.toUpperCase()}` : "",
          qualification?.summary ? `AI Summary: ${qualification.summary}` : "",
          qualification?.flags?.length ? `AI Flags: ${qualification.flags.join(" | ")}` : "",
          input.acreage ? `Acreage: ${input.acreage}` : "",
          input.message ? `Client Message: ${input.message}` : "",
        ].filter(Boolean).join("\n");
        const [nativeResult] = await db2.insert(nativeQuotes).values({
          clientName: input.name,
          clientEmail: input.email || null,
          clientPhone: input.phone || null,
          propertyAddress: address || null,
          title,
          serviceType: serviceLabel,
          acreage: input.acreage || null,
          clientMessage: input.message || null,
          internalNotes: notes,
          lineItems: aiLineItems,
          totalCents: aiTotalCents,
          status: "web_request",
          portalToken,
        });
        const newNativeQuoteId = (nativeResult as any).insertId ?? null;
        console.log(`[Quote] Native quote (web_request) created for ${input.name} (nativeQuoteId=${newNativeQuoteId})`);
        // Link the submission back to the native quote
        if (submissionId && newNativeQuoteId) {
          try {
            const { eq } = await import("drizzle-orm");
            await db2.update(quoteSubmissions).set({ nativeQuoteId: newNativeQuoteId }).where(eq(quoteSubmissions.id, submissionId));
            console.log(`[Quote] Linked submission ${submissionId} → native quote ${newNativeQuoteId}`);
          } catch (linkErr) {
            console.warn("[Quote] Failed to link submission to native quote:", linkErr);
          }
        }
        if (leadId && newNativeQuoteId) {
          await db2
            .update(opsLeads)
            .set({ nativeQuoteId: newNativeQuoteId, updatedAt: new Date() })
            .where(eq(opsLeads.id, leadId));
          console.log(`[Quote] Linked lead ${leadId} → native quote ${newNativeQuoteId}`);
        }
      }
    } catch (nativeErr) {
      console.warn("[Quote] Failed to create native web_request quote:", nativeErr);
    }

    return {
      success: true,
      ballparkRange: input.estimatedRange || qualification?.ballparkRange || "",
      ballparkNote: input.estimatedRange
        ? "This preliminary range combines the services and measurements you selected. Final pricing is confirmed after an on-site review."
        : qualification?.ballparkNote ?? "",
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

      // 2. Convert lat/lon to Web Mercator (WKID 102100) for the ArcGIS query.
      //    Use the correct Mercator Y formula (not the simplified tan version).
      const x = lng * 20037508.34 / 180;
      const sinLat = Math.sin(lat * Math.PI / 180);
      const y = Math.log((1 + sinLat) / (1 - sinLat)) / 2 * 20037508.34 / Math.PI;

      // 3. Query the Tennessee Property Boundaries Public Use feature service.
      //    Use a 30-metre bounding-box envelope via HTTP POST (form-encoded).
      //    A GET point query silently fails when the URL exceeds ArcGIS limits;
      //    POST avoids that and the envelope reliably intersects the parcel polygon.
      const buf = 30; // metres
      const envelope = JSON.stringify({
        xmin: Math.round(x - buf), ymin: Math.round(y - buf),
        xmax: Math.round(x + buf), ymax: Math.round(y + buf),
        spatialReference: { wkid: 102100 },
      });
      const parcelParams = new URLSearchParams({
        geometry: envelope,
        geometryType: "esriGeometryEnvelope",
        spatialRel: "esriSpatialRelIntersects",
        outFields: "PARCELID,ADDRESS,OWNER,OWNER2,DEEDAC,COUNTY_NAME,LINK_TPAD,LINK_TPV",
        f: "json",
      });
      const parcelServiceUrl = "https://services1.arcgis.com/YuVBSS7Y1of2Qud1/arcgis/rest/services/Tennessee_Property_Boundaries_Public_Use/FeatureServer/0/query";
      const parcelRes = await fetch(parcelServiceUrl, {
        method: "POST",
        body: parcelParams,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!parcelRes.ok) throw new Error("Parcel service request failed");
      const parcelData = await parcelRes.json() as {
        features?: Array<{ attributes: Record<string, unknown> }>;
        error?: { message: string };
      };
      if (parcelData.error) throw new Error(`Parcel service error: ${parcelData.error.message}`);
      if (!parcelData.features || parcelData.features.length === 0) {
        return { found: false, reason: "No parcel found at this location" };
      }

      // When the envelope intersects multiple parcels, prefer the one whose
      // address string most closely matches the geocoded address, or the one
      // with the largest deed acreage as a tiebreaker.
      const geocodedStreet = (geoData.results[0].formatted_address || "").split(",")[0].toUpperCase().trim();
      const bestFeature = parcelData.features.reduce((best, f) => {
        const fAddr = (typeof f.attributes.ADDRESS === "string" ? f.attributes.ADDRESS : "").toUpperCase();
        const bAddr = (typeof best.attributes.ADDRESS === "string" ? best.attributes.ADDRESS : "").toUpperCase();
        // Score: does the parcel address appear in the geocoded street (or vice versa)?
        const fScore = fAddr && geocodedStreet.includes(fAddr.split(" ")[0]) ? 1 : 0;
        const bScore = bAddr && geocodedStreet.includes(bAddr.split(" ")[0]) ? 1 : 0;
        if (fScore !== bScore) return fScore > bScore ? f : best;
        // Tiebreak: larger deed acreage wins
        const fAc = typeof f.attributes.DEEDAC === "number" ? f.attributes.DEEDAC : 0;
        const bAc = typeof best.attributes.DEEDAC === "number" ? best.attributes.DEEDAC : 0;
        return fAc >= bAc ? f : best;
      });
      const attr = bestFeature.attributes;
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
  extractRfpData: publicProcedure
    .input(
      z.object({
        rfpDocumentUrls: z.array(z.string().url()).min(1).max(5),
      })
    )
    .mutation(async ({ input }) => {
      // Fetch text content from each uploaded document URL and concatenate
      const docTexts: string[] = [];
      for (const url of input.rfpDocumentUrls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const contentType = res.headers.get("content-type") ?? "";
          // For plain text files, read directly
          if (contentType.includes("text/plain")) {
            const text = await res.text();
            docTexts.push(text.slice(0, 8000));
          } else {
            // For binary formats (PDF, Word, Excel), pass the URL directly to the LLM as a file_url
            // We'll include the URL reference in the prompt so the LLM knows about it
            docTexts.push(`[Document: ${url}]`);
          }
        } catch {
          // skip unreadable docs
        }
      }

      // Build the extraction prompt
      const documentContext = docTexts.length > 0
        ? docTexts.join("\n\n---\n\n")
        : input.rfpDocumentUrls.map((u) => `[Document URL: ${u}]`).join("\n");

      // Build message content — include file_url entries for PDF/Word docs so the LLM can read them
      const fileUrlEntries = input.rfpDocumentUrls.map((url) => ({
        type: "file_url" as const,
        file_url: { url },
      }));

      const llmMessages: Message[] = [
        {
          role: "system",
          content:
            "You are a government contract analyst. Extract key information from RFP and bid documents for a land clearing and forestry mulching company. Return structured JSON only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text" as const,
              text: `Extract the following from the attached RFP/bid document(s):\n\n1. All submission deadlines (date and time, what they are for)\n2. Key project requirements (scope, specifications, mandatory items)\n3. Estimated project size (acreage, linear feet, or dollar value if mentioned)\n4. Issuing agency name and contact\n5. Any bonding, insurance, or certification requirements\n\nDocument context:\n${documentContext}`,
            } as TextContent,
            ...fileUrlEntries as FileContent[],
          ],
        },
      ];

      const result = await invokeLLM({
        messages: [
          ...llmMessages.slice(0, 1),
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: `Extract the following from the attached RFP/bid document(s) and include a confidence score (0-100) for each field indicating how certain you are the value is correct and complete:\n\n1. All submission deadlines (date and time, what they are for)\n2. Key project requirements (scope, specifications, mandatory items)\n3. Estimated project size (acreage, linear feet, or dollar value if mentioned)\n4. Issuing agency name and contact\n5. Any bonding, insurance, or certification requirements\n6. A plain-language summary\n\nFor confidence scores: 80-100 = clearly stated in the document; 50-79 = inferred or partially stated; 0-49 = guessed or not found.\n\nDocument context:\n${documentContext}`,
              } as TextContent,
              ...fileUrlEntries as FileContent[],
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "rfp_extraction",
            strict: true,
            schema: {
              type: "object",
              properties: {
                deadlines: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      date: { type: "string", description: "ISO date string or human-readable date" },
                      description: { type: "string", description: "What this deadline is for" },
                      confidence: { type: "integer", description: "Confidence score 0-100" },
                    },
                    required: ["date", "description", "confidence"],
                    additionalProperties: false,
                  },
                },
                requirements: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string", description: "Requirement text" },
                      confidence: { type: "integer", description: "Confidence score 0-100" },
                    },
                    required: ["text", "confidence"],
                    additionalProperties: false,
                  },
                  description: "Key project requirements and mandatory items",
                },
                projectSize: { type: "string", description: "Estimated project size (acreage, linear feet, or dollar value)" },
                projectSizeConfidence: { type: "integer", description: "Confidence score 0-100 for projectSize" },
                issuingAgency: { type: "string", description: "Name of the issuing government agency" },
                issuingAgencyConfidence: { type: "integer", description: "Confidence score 0-100 for issuingAgency" },
                agencyContact: { type: "string", description: "Contact name, email, or phone for the issuing agency" },
                agencyContactConfidence: { type: "integer", description: "Confidence score 0-100 for agencyContact" },
                bondingInsurance: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string", description: "Bonding/insurance requirement text" },
                      confidence: { type: "integer", description: "Confidence score 0-100" },
                    },
                    required: ["text", "confidence"],
                    additionalProperties: false,
                  },
                  description: "Bonding, insurance, or certification requirements",
                },
                summary: { type: "string", description: "One-paragraph plain-language summary of the RFP" },
                summaryConfidence: { type: "integer", description: "Confidence score 0-100 for summary" },
              },
              required: ["deadlines", "requirements", "projectSize", "projectSizeConfidence", "issuingAgency", "issuingAgencyConfidence", "agencyContact", "agencyContactConfidence", "bondingInsurance", "summary", "summaryConfidence"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices[0]?.message?.content ?? "{}";
      const raw = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      try {
        const parsed = JSON.parse(stripCodeFence(raw)) as {
          deadlines: Array<{ date: string; description: string; confidence: number }>;
          requirements: Array<{ text: string; confidence: number }>;
          projectSize: string;
          projectSizeConfidence: number;
          issuingAgency: string;
          issuingAgencyConfidence: number;
          agencyContact: string;
          agencyContactConfidence: number;
          bondingInsurance: Array<{ text: string; confidence: number }>;
          summary: string;
          summaryConfidence: number;
        };
        return parsed;
      } catch {
        return {
          deadlines: [],
          requirements: [],
          projectSize: "",
          projectSizeConfidence: 0,
          issuingAgency: "",
          issuingAgencyConfidence: 0,
          agencyContact: "",
          agencyContactConfidence: 0,
          bondingInsurance: [],
          summary: "Could not parse RFP document. Please review the attached files manually.",
          summaryConfidence: 0,
        };
      }
    }),

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
