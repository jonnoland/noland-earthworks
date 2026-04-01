import { writeFileSync } from "fs";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const data = {
  name: "John Smith",
  phone: "6155550123",
  email: "john.smith@example.com",
  service: "Forestry Mulching",
  county: "Williamson County",
  acreage: "5-10 acres",
  street: "123 Oak Hollow Lane",
  city: "Franklin",
  state: "TN",
  zip: "37064",
  message: "We have about 8 acres of dense cedar and brush that needs to be cleared for a new pasture. The property has some rocky terrain on the east side.",
};

const logoUrl = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_d2051edf.png";
const submittedAt = "Wednesday, April 1, 2026 at 9:34 AM CDT";

const addressLines = [data.street, [data.city, data.state, data.zip].filter(Boolean).join(" ")].filter(Boolean);

const row = (label, value) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;width:38%;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999;">${label}</span>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f0ede6;">
        <span style="font-size:14px;color:#1a1a1a;">${value}</span>
      </td>
    </tr>`;

const html = `
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
              ${row("County", escapeHtml(data.county))}
              ${data.acreage ? row("Acreage", escapeHtml(data.acreage)) : ""}
              ${addressLines.length ? row("Property Address", addressLines.map(escapeHtml).join("<br />")) : ""}
            </table>
          </td>
        </tr>

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
        </tr>

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
            <p style="margin:6px 0 0;font-size:11px;color:#555;">Veteran-Owned &amp; Operated &bull; Middle Tennessee</p>
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

writeFileSync("/tmp/email-preview.html", html);
console.log("Email preview written to /tmp/email-preview.html");
