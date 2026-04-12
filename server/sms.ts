/**
 * SMS helper — sends text messages via Twilio.
 * Credentials are injected from environment variables (no manual setup required).
 * Silently skips sending if credentials are not configured (dev/test environments).
 */
import twilio from "twilio";
import { ENV } from "./_core/env";

/**
 * Send an SMS to the owner's phone number.
 * @returns true on success, false if credentials are missing or send fails
 */
export async function sendOwnerSms(message: string): Promise<boolean> {
  const { twilioAccountSid, twilioAuthToken, twilioFromNumber, ownerPhone } = ENV;

  if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber || !ownerPhone) {
    console.warn("[SMS] Twilio credentials or OWNER_PHONE not configured — skipping SMS.");
    return false;
  }

  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    await client.messages.create({
      body: message,
      from: twilioFromNumber,
      to: ownerPhone,
    });
    console.log(`[SMS] Sent to ${ownerPhone}`);
    return true;
  } catch (err) {
    console.error("[SMS] Failed to send:", err);
    return false;
  }
}
