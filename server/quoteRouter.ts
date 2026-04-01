import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";
import { Resend } from "resend";
import { createJobberRequest, isJobberConnected } from "./jobber";

const quoteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(7, "Phone is required").max(30),
  email: z.string().email("Valid email is required").max(320),
  service: z.string().min(1, "Service is required").max(100),
  county: z.string().min(1, "County is required").max(100),
  acreage: z.string().max(50).optional().default(""),
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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1a1a1a; padding: 28px 32px; }
    .header h1 { color: #E07B2A; font-size: 22px; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
    .header p { color: #aaa; margin: 6px 0 0; font-size: 13px; }
    .body { padding: 28px 32px; }
    .field { margin-bottom: 18px; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .value { font-size: 15px; color: #222; background: #f9f9f9; padding: 10px 14px; border-radius: 5px; border-left: 3px solid #E07B2A; }
    .footer { background: #f0ede6; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; }
    .footer a { color: #E07B2A; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>New Quote Request</h1>
      <p>Submitted via nolandearthworks.com</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${escapeHtml(data.name)}</div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${escapeHtml(data.phone)}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value">${escapeHtml(data.email)}</div>
      </div>
      <div class="field">
        <div class="label">Service Requested</div>
        <div class="value">${escapeHtml(data.service)}</div>
      </div>
      <div class="field">
        <div class="label">County</div>
        <div class="value">${escapeHtml(data.county)} County</div>
      </div>
      ${data.acreage ? `
      <div class="field">
        <div class="label">Acreage</div>
        <div class="value">${escapeHtml(data.acreage)}</div>
      </div>` : ""}
      ${data.message ? `
      <div class="field">
        <div class="label">Project Details</div>
        <div class="value" style="white-space:pre-wrap;">${escapeHtml(data.message)}</div>
      </div>` : ""}
    </div>
    <div class="footer">
      Noland Earthworks, LLC &bull; <a href="tel:6154064819">(615) 406-4819</a> &bull; Middle Tennessee
    </div>
  </div>
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

    // 2. Always send in-app owner notification as backup
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
          input.message ? `\nProject Details:\n${input.message}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch (err) {
      console.warn("[Quote] Owner notification failed:", err);
    }

    // 3. Send to Jobber if connected
    try {
      const jobberReady = await isJobberConnected();
      if (jobberReady) {
        await createJobberRequest(input);
      }
    } catch (err) {
      console.error("[Quote] Jobber request creation failed:", err);
      // Non-fatal: email + notification already sent
    }

    return { success: true };
  }),
});
