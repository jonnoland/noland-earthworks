// Credentials passed via environment variables
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM_NUMBER;
const ownerPhone = process.env.OWNER_PHONE;

console.log("SID set:", !!sid, sid ? `(${sid.substring(0, 6)}...)` : "MISSING");
console.log("Token set:", !!token);
console.log("From:", from || "MISSING");
console.log("Owner phone:", ownerPhone || "MISSING");

if (!sid || !token) {
  console.error("Twilio credentials not found in environment.");
  process.exit(1);
}

const { default: twilio } = await import("twilio");
const client = twilio(sid, token);

try {
  const messages = await client.messages.list({ limit: 5 });
  if (messages.length === 0) {
    console.log("No messages found in Twilio account.");
  } else {
    console.log(`\nLast ${messages.length} message(s):`);
    messages.forEach((m, i) => {
      console.log(`\n[${i + 1}] Status: ${m.status}`);
      console.log(`    To: ${m.to}`);
      console.log(`    From: ${m.from}`);
      console.log(`    Sent: ${m.dateSent}`);
      console.log(`    Body: ${m.body?.substring(0, 120)}`);
    });
  }
} catch (err) {
  console.error("Twilio API error:", err.message);
}
