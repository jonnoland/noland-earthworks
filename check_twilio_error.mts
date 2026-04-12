import twilio from "twilio";
import { ENV } from "./server/_core/env";

const client = twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);

const messages = await client.messages.list({ limit: 3 });
for (const m of messages) {
  console.log(`SID: ${m.sid}`);
  console.log(`Status: ${m.status}`);
  console.log(`To: ${m.to}`);
  console.log(`From: ${m.from}`);
  console.log(`Sent: ${m.dateSent}`);
  console.log(`Error Code: ${m.errorCode}`);
  console.log(`Error Message: ${m.errorMessage}`);
  console.log(`Body: ${m.body?.substring(0, 100)}`);
  console.log("---");
}
process.exit(0);
