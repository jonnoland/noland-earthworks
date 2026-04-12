import twilio from "twilio";
import { ENV } from "./server/_core/env";

const { twilioAccountSid, twilioAuthToken, twilioFromNumber, ownerPhone } = ENV;

console.log("Twilio Account SID:", twilioAccountSid ? `${twilioAccountSid.substring(0, 8)}...` : "NOT SET");
console.log("Auth Token set:", !!twilioAuthToken);
console.log("From number:", twilioFromNumber || "NOT SET");
console.log("Owner phone:", ownerPhone || "NOT SET");
console.log("");

if (!twilioAccountSid || !twilioAuthToken) {
  console.error("Credentials missing — cannot check messages.");
  process.exit(1);
}

const client = twilio(twilioAccountSid, twilioAuthToken);

// Fetch messages from the last 24 hours
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

try {
  const messages = await client.messages.list({
    dateSentAfter: since,
    limit: 10,
  });

  if (messages.length === 0) {
    console.log("No messages sent in the last 24 hours.");
    console.log("Checking all-time last 5 messages...");
    const allMessages = await client.messages.list({ limit: 5 });
    if (allMessages.length === 0) {
      console.log("No messages found at all in this Twilio account.");
    } else {
      allMessages.forEach((m, i) => {
        console.log(`[${i + 1}] ${m.dateSent} | ${m.status} | To: ${m.to} | Body: ${m.body?.substring(0, 100)}`);
      });
    }
  } else {
    console.log(`Found ${messages.length} message(s) in the last 24 hours:`);
    messages.forEach((m, i) => {
      console.log(`\n[${i + 1}] Status: ${m.status}`);
      console.log(`    To: ${m.to}`);
      console.log(`    From: ${m.from}`);
      console.log(`    Sent: ${m.dateSent}`);
      console.log(`    Body: ${m.body?.substring(0, 150)}`);
    });
  }
} catch (err: any) {
  console.error("Twilio API error:", err.message);
  if (err.code) console.error("Error code:", err.code);
}

process.exit(0);
