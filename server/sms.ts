/**
 * SMS helper — sends text messages via Twilio.
 * Credentials are injected from environment variables (no manual setup required).
 * Silently skips sending if credentials are not configured (dev/test environments).
 */
import twilio from "twilio";
import { ENV } from "./_core/env";
import { recordOwnerSmsAlert } from "./db";

export type OwnerSmsAlertDetails = {
  alertType?: string;
  leadName?: string | null;
  service?: string | null;
  estimatedValueCents?: number | null;
};

export function parseOwnerSmsRecipients(raw: string): string[] {
  return Array.from(new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^\+[1-9]\d{7,14}$/.test(value))
  ));
}

function getAlertRecipients(): string[] {
  const configured = parseOwnerSmsRecipients(ENV.ownerSmsAlertRecipients);
  if (configured.length > 0) return configured;
  return ENV.ownerPhone && /^\+[1-9]\d{7,14}$/.test(ENV.ownerPhone) ? [ENV.ownerPhone] : [];
}

function enrichProspectAlert(message: string, details: OwnerSmsAlertDetails) {
  if (!message.startsWith("New Prospect") || message.includes("Requested service:")) {
    return { message, details };
  }

  const lines = message.split("\n");
  const contact = lines.find((line) => line.startsWith("Contact: "))?.replace("Contact: ", "") || "Prospect";
  return {
    message: [
      lines[0],
      `Lead: ${contact}`,
      "Requested service: Prospect review",
      "Estimated value: Not assessed",
      ...lines.slice(1),
    ].join("\n"),
    details: {
      alertType: "prospect",
      leadName: contact,
      service: "Prospect review",
      estimatedValueCents: null,
      ...details,
    },
  };
}

async function sendToRecipients(message: string, recipients: string[], details: OwnerSmsAlertDetails = {}): Promise<boolean> {
  const { twilioAccountSid, twilioAuthToken, twilioFromNumber } = ENV;
  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber || recipients.length === 0) {
    console.warn("[SMS] Twilio credentials or owner recipients not configured — skipping SMS.");
    return false;
  }

  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    const results = await Promise.allSettled(
      recipients.map(async (to) => client.messages.create({ body: message, from: twilioFromNumber, to }))
    );
    await Promise.allSettled(results.map((result, index) => recordOwnerSmsAlert({
      alertType: details.alertType ?? "owner_sms",
      recipient: recipients[index],
      leadName: details.leadName ?? null,
      service: details.service ?? null,
      estimatedValueCents: details.estimatedValueCents ?? null,
      message,
      twilioSid: result.status === "fulfilled" ? result.value.sid : null,
      status: result.status === "fulfilled" ? "accepted" : "failed",
      errorMessage: result.status === "rejected" ? (result.reason instanceof Error ? result.reason.message : String(result.reason)) : null,
    })));
    const sentCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.length - sentCount;
    if (failedCount > 0) console.error(`[SMS] ${failedCount} owner alert recipient(s) failed.`);
    console.log(`[SMS] Owner alert sent to ${sentCount}/${recipients.length} configured recipient(s).`);
    return sentCount > 0;
  } catch (err) {
    console.error("[SMS] Failed to send:", err);
    return false;
  }
}

/**
 * Send an SMS to the owner's phone number.
 * @returns true on success, false if credentials are missing or send fails
 */
export async function sendOwnerSms(message: string): Promise<boolean> {
  return sendToRecipients(message, ENV.ownerPhone ? [ENV.ownerPhone] : getAlertRecipients());
}

/** Sends an internal operational alert to every configured owner recipient. */
export async function sendOwnerAlertSms(message: string, details: OwnerSmsAlertDetails = {}): Promise<boolean> {
  const enriched = enrichProspectAlert(message, details);
  return sendToRecipients(enriched.message, getAlertRecipients(), enriched.details);
}
