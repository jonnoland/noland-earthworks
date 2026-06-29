/**
 * Twilio SMS Proxy — Inbound & Reply-from-Cell Handler
 *
 * Flow:
 *  1. Customer texts the Twilio number → POST /api/twilio/inbound
 *     - Message logged to CRM (conversations + messages tables)
 *     - Forwarded to owner cell as: "[Name] <phone>: <message body>"
 *     - Conversation marked unread
 *
 *  2. Owner replies from their cell → POST /api/twilio/owner-reply
 *     - Twilio fires this webhook when the owner's cell receives a text
 *       that starts with a routing prefix "[Name]" or a phone number
 *     - Alternatively, owner texts the Twilio number directly with format:
 *       "REPLY <phone>: <message>" to route to a specific customer
 *     - Message sent to customer, logged as outbound in CRM
 */

import type { Express, Request, Response } from "express";
import twilio from "twilio";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { conversations, messages } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/** Normalize phone to E.164 format (+1XXXXXXXXXX) */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

/** Validate Twilio request signature to prevent spoofing */
function validateTwilioSignature(req: Request): boolean {
  if (!ENV.twilioAuthToken) return false;
  const signature = req.headers["x-twilio-signature"] as string;
  if (!signature) return false;
  const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
  return twilio.validateRequest(ENV.twilioAuthToken, signature, url, req.body);
}

/** Find or create a conversation for a given phone number */
async function findOrCreateConversation(
  db: Awaited<ReturnType<typeof getDb>>,
  fromPhone: string,
  fromName: string
): Promise<number> {
  if (!db) throw new Error("DB unavailable");

  // Look for existing conversation with this phone number
  const existing = await db
    .select()
    .from(conversations)
    .where(eq(conversations.contactPhone, fromPhone))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Create new conversation
  const [result] = await db.insert(conversations).values({
    contactName: fromName,
    contactPhone: fromPhone,
    lastMessage: null,
    lastMessageAt: null,
    unread: false,
  });
  return (result as unknown as { insertId: number }).insertId;
}

/** Forward a message to the owner's cell phone */
async function forwardToOwner(
  client: twilio.Twilio,
  contactName: string,
  contactPhone: string,
  body: string
): Promise<void> {
  if (!ENV.ownerPhone) {
    console.warn("[TwilioProxy] OWNER_PHONE not set — cannot forward inbound SMS");
    return;
  }

  // Format: "[Contact Name] <phone>: message body"
  const forwardBody = `[${contactName}] ${contactPhone}:\n${body}`;

  await client.messages.create({
    body: forwardBody.slice(0, 1600),
    from: ENV.twilioFromNumber,
    to: ENV.ownerPhone,
  });
}

export function registerTwilioRoutes(app: Express): void {
  /**
   * POST /api/twilio/inbound
   * Twilio calls this when a customer texts the business number.
   * Logs to CRM, marks conversation unread, forwards to owner cell.
   */
  app.post("/api/twilio/inbound", async (req: Request, res: Response) => {
    try {
      // Validate Twilio signature (skip in dev/test)
      if (process.env.NODE_ENV === "production" && !validateTwilioSignature(req)) {
        console.warn("[TwilioProxy] Invalid Twilio signature on /inbound");
        res.status(403).send("Forbidden");
        return;
      }

      const { From, Body, FromCity, FromState } = req.body as {
        From?: string;
        Body?: string;
        FromCity?: string;
        FromState?: string;
      };

      if (!From || !Body) {
        res.status(400).send("Missing From or Body");
        return;
      }

      const fromPhone = normalizePhone(From);
      const fromName = FromCity && FromState
        ? `${FromCity}, ${FromState}`
        : fromPhone;

      const db = await getDb();
      if (!db) {
        console.error("[TwilioProxy] DB unavailable");
        res.type("text/xml").send("<Response></Response>");
        return;
      }

      // Find or create conversation
      const convId = await findOrCreateConversation(db, fromPhone, fromName);

      // Log inbound message
      await db.insert(messages).values({
        conversationId: convId,
        direction: "inbound",
        body: Body,
        status: "received",
        sentAt: new Date(),
      });

      // Update conversation metadata
      await db.update(conversations)
        .set({
          lastMessage: Body,
          lastMessageAt: new Date(),
          unread: true,
          // Update name if we have a better one from Twilio geo data
          ...(FromCity && FromState ? {} : {}),
        })
        .where(eq(conversations.id, convId));

      // Get contact name for forwarding
      const [conv] = await db.select().from(conversations).where(eq(conversations.id, convId)).limit(1);
      const contactName = conv?.contactName ?? fromPhone;

      // Forward to owner cell
      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber && ENV.ownerPhone) {
        const client = twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);
        try {
          await forwardToOwner(client, contactName, fromPhone, Body);
          console.log(`[TwilioProxy] Forwarded inbound from ${fromPhone} to owner ${ENV.ownerPhone}`);
        } catch (fwdErr) {
          console.error("[TwilioProxy] Forward to owner failed:", fwdErr);
        }
      }

      // Respond to Twilio with empty TwiML (no auto-reply)
      res.type("text/xml").send("<Response></Response>");
    } catch (err) {
      console.error("[TwilioProxy] /inbound error:", err);
      res.type("text/xml").send("<Response></Response>");
    }
  });

  /**
   * POST /api/twilio/owner-reply
   * Twilio calls this when the OWNER texts the Twilio number from their cell.
   * Parses the routing prefix and sends the reply to the correct customer.
   *
   * Supported reply formats from owner's cell:
   *   1. "REPLY +16151234567: Hey, Tuesday works for me"
   *   2. "[Mike Johnson]: Hey, Tuesday works for me"  (uses most recent conv with that name)
   *   3. Plain text → routes to the most recently active conversation
   */
  app.post("/api/twilio/owner-reply", async (req: Request, res: Response) => {
    try {
      // Validate Twilio signature (skip in dev/test)
      if (process.env.NODE_ENV === "production" && !validateTwilioSignature(req)) {
        console.warn("[TwilioProxy] Invalid Twilio signature on /owner-reply");
        res.status(403).send("Forbidden");
        return;
      }

      const { From, Body } = req.body as { From?: string; Body?: string };

      if (!From || !Body) {
        res.status(400).send("Missing From or Body");
        return;
      }

      // Verify this is from the owner's number
      const fromPhone = normalizePhone(From);
      const ownerPhone = normalizePhone(ENV.ownerPhone ?? "");
      if (fromPhone !== ownerPhone) {
        console.warn(`[TwilioProxy] /owner-reply from non-owner number: ${fromPhone}`);
        res.type("text/xml").send("<Response></Response>");
        return;
      }

      const db = await getDb();
      if (!db) {
        res.type("text/xml").send("<Response></Response>");
        return;
      }

      let targetPhone: string | null = null;
      let messageBody = Body.trim();

      // Parse format 1: "REPLY +16151234567: message"
      const replyMatch = Body.match(/^REPLY\s+(\+?[\d\s\-().]+):\s*([\s\S]+)$/i);
      if (replyMatch) {
        targetPhone = normalizePhone(replyMatch[1].trim());
        messageBody = replyMatch[2].trim();
      }

      // Parse format 2: "[Name]: message" — find most recent conv with that name
      if (!targetPhone) {
        const nameMatch = Body.match(/^\[([^\]]+)\]:\s*([\s\S]+)$/);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          messageBody = nameMatch[2].trim();
          const [conv] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.contactName, name))
            .orderBy(desc(conversations.lastMessageAt))
            .limit(1);
          if (conv) targetPhone = conv.contactPhone;
        }
      }

      // Format 3: plain text → most recently active conversation
      if (!targetPhone) {
        const [conv] = await db
          .select()
          .from(conversations)
          .orderBy(desc(conversations.lastMessageAt))
          .limit(1);
        if (conv) {
          targetPhone = conv.contactPhone;
          messageBody = Body.trim();
        }
      }

      if (!targetPhone) {
        console.warn("[TwilioProxy] Could not determine target for owner reply");
        res.type("text/xml").send("<Response></Response>");
        return;
      }

      // Find the conversation for this phone
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.contactPhone, targetPhone))
        .limit(1);

      if (!conv) {
        console.warn(`[TwilioProxy] No conversation found for ${targetPhone}`);
        res.type("text/xml").send("<Response></Response>");
        return;
      }

      // Send the reply to the customer via Twilio
      if (ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber) {
        const client = twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);
        let twilioSid: string | undefined;
        try {
          const msg = await client.messages.create({
            body: messageBody,
            from: ENV.twilioFromNumber,
            to: targetPhone,
          });
          twilioSid = msg.sid;
          console.log(`[TwilioProxy] Owner reply sent to ${targetPhone} (SID: ${twilioSid})`);
        } catch (sendErr) {
          console.error("[TwilioProxy] Failed to send owner reply:", sendErr);
        }

        // Log outbound message to CRM
        await db.insert(messages).values({
          conversationId: conv.id,
          direction: "outbound",
          body: messageBody,
          twilioSid,
          status: twilioSid ? "sent" : "failed",
          sentAt: new Date(),
        });

        // Update conversation
        await db.update(conversations)
          .set({ lastMessage: messageBody, lastMessageAt: new Date() })
          .where(eq(conversations.id, conv.id));
      }

      // Respond to Twilio with empty TwiML
      res.type("text/xml").send("<Response></Response>");
    } catch (err) {
      console.error("[TwilioProxy] /owner-reply error:", err);
      res.type("text/xml").send("<Response></Response>");
    }
  });

  /**
   * GET /api/twilio/status
   * Quick health check — confirms Twilio credentials and phone numbers are configured.
   */
  app.get("/api/twilio/status", (_req: Request, res: Response) => {
    res.json({
      configured: !!(ENV.twilioAccountSid && ENV.twilioAuthToken && ENV.twilioFromNumber),
      fromNumber: ENV.twilioFromNumber || null,
      ownerPhone: ENV.ownerPhone ? `***${ENV.ownerPhone.slice(-4)}` : null,
      inboundWebhook: "/api/twilio/inbound",
      ownerReplyWebhook: "/api/twilio/owner-reply",
    });
  });
}
