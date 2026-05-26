/**
 * Public AI Chat Widget Router
 * Handles chat sessions for the public-facing AI assistant on nolandearthworks.com.
 * No authentication required — sessions are tracked by a random session token.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { chatSessions, chatMessages } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { createOpsLead, getOwnerUser } from "./db";
import { notifyOwner } from "./_core/notification";
import crypto from "crypto";

const CHAT_SYSTEM_PROMPT = `You are the AI assistant for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee. Your name is not important; you represent Noland Earthworks.

YOUR ROLE:
- Answer questions about our services, service area, process, and what to expect
- Help visitors understand if their project is a good fit
- Collect their contact information and guide them to request a quote
- Be warm, direct, and genuine — like talking to a real person who knows this business

ABOUT NOLAND EARTHWORKS:
- Owner: Jon Noland, U.S. Army veteran (9 years, two deployments to Afghanistan)
- Location: Middle Tennessee, serving all 35 counties across Middle and West Tennessee
- Primary service: Forestry mulching — grinds brush, saplings, and small trees into mulch that stays on the ground as cover. No debris piles, no hauling, no burning. Cleaner result than bush hogging.
- Also offers: Land clearing, site prep, right-of-way clearing, brush hogging, stump grinding
- Does NOT offer: Grading, excavation, debris hauling, large tree removal (arborist work)
- Equipment: Tracked forestry mulcher — handles slopes, wet ground, and difficult terrain that wheeled machines cannot
- Best fit jobs: 2–20 acres, rural landowners, farmers reclaiming pasture, residential developers, lot clearing
- Website: nolandearthworks.com | Quote form: nolandearthworks.com/quote

PRICING:
- Never give specific prices. Always say pricing depends on acreage, terrain, vegetation density, and site conditions, and that an accurate quote requires a site assessment.
- Direct pricing questions to the quote form at nolandearthworks.com/quote

COLLECTING CONTACT INFO:
- If someone seems interested in getting work done, naturally ask for their name, phone number, and best time to reach them
- Once you have their name and phone, let them know Jon will follow up personally

VOICE AND TONE:
- Warm, direct, confident — like a real person, not a chatbot
- No corporate language, no filler phrases
- No emojis
- Short answers first; expand if asked
- Never oversell — the work speaks for itself

COMMON QUESTIONS TO HANDLE:
- "What is forestry mulching?" — Explain clearly: grinds vegetation into mulch that stays on site, no piles to burn or haul, cleaner than bush hogging
- "Do you do grading/leveling/hauling?" — No, refer out. We focus on clearing and mulching.
- "How much does it cost?" — Depends on site conditions, need a site visit for an accurate quote
- "How long does it take?" — Depends on acreage and conditions, typically 1 day to several days
- "Do you serve [county]?" — Yes if it's in Middle or West Tennessee
- "Are you licensed/insured?" — Yes, fully insured

Keep responses concise. If a visitor is ready to get a quote, direct them to nolandearthworks.com/quote or offer to collect their info.`;

export const chatRouter = router({
  /** Start or resume a chat session */
  startSession: publicProcedure
    .input(z.object({ sessionToken: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { sessionToken: crypto.randomUUID(), messages: [] };

      // Resume existing session
      if (input.sessionToken) {
        const existing = await db
          .select()
          .from(chatSessions)
          .where(eq(chatSessions.sessionToken, input.sessionToken))
          .limit(1);

        if (existing.length > 0) {
          const msgs = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, existing[0].id))
            .orderBy(chatMessages.createdAt);

          return {
            sessionToken: input.sessionToken,
            messages: msgs.map(m => ({ role: m.role, content: m.content })),
          };
        }
      }

      // Create new session
      const token = crypto.randomUUID();
      await db.insert(chatSessions).values({ sessionToken: token });
      return { sessionToken: token, messages: [] };
    }),

  /** Send a message and get an AI response */
  sendMessage: publicProcedure
    .input(z.object({
      sessionToken: z.string(),
      message: z.string().min(1).max(2000),
      visitorName: z.string().optional(),
      visitorPhone: z.string().optional(),
      visitorEmail: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        // Fallback: return a canned response if DB is unavailable
        return {
          response: "Thanks for reaching out to Noland Earthworks. For the fastest response, please fill out the quote form at nolandearthworks.com/quote or call us directly.",
          leadCreated: false,
        };
      }

      // Get or create session
      let session = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.sessionToken, input.sessionToken))
        .limit(1)
        .then(rows => rows[0]);

      if (!session) {
        const [inserted] = await db.insert(chatSessions).values({
          sessionToken: input.sessionToken,
          visitorName: input.visitorName ?? null,
          visitorPhone: input.visitorPhone ?? null,
          visitorEmail: input.visitorEmail ?? null,
        });
        session = await db
          .select()
          .from(chatSessions)
          .where(eq(chatSessions.sessionToken, input.sessionToken))
          .limit(1)
          .then(rows => rows[0]);
      }

      if (!session) throw new Error("Failed to create chat session");

      // Update visitor info if provided
      if (input.visitorName || input.visitorPhone || input.visitorEmail) {
        await db.update(chatSessions)
          .set({
            visitorName: input.visitorName ?? session.visitorName,
            visitorPhone: input.visitorPhone ?? session.visitorPhone,
            visitorEmail: input.visitorEmail ?? session.visitorEmail,
          })
          .where(eq(chatSessions.id, session.id));
      }

      // Load conversation history
      const history = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, session.id))
        .orderBy(chatMessages.createdAt);

      // Save user message
      await db.insert(chatMessages).values({
        sessionId: session.id,
        role: "user",
        content: input.message,
      });

      // Build messages for LLM
      const llmMessages = [
        { role: "system" as const, content: CHAT_SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.message },
      ];

      // Get AI response
      const result = await invokeLLM({ messages: llmMessages });
      const aiResponse = result?.choices?.[0]?.message?.content ?? "Thanks for reaching out. For the fastest response, please fill out our quote form at nolandearthworks.com/quote.";
      const responseText = typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse);

      // Save AI response
      await db.insert(chatMessages).values({
        sessionId: session.id,
        role: "assistant",
        content: responseText,
      });

      // Auto-create lead if we have name + phone and haven't yet
      let leadCreated = false;
      const updatedSession = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.id, session.id))
        .limit(1)
        .then(rows => rows[0]);

      const hasContactInfo = (updatedSession?.visitorName || input.visitorName) &&
        (updatedSession?.visitorPhone || input.visitorPhone);

      if (hasContactInfo && !updatedSession?.leadCreated) {
        try {
          const owner = await getOwnerUser();
          if (owner) {
            const name = updatedSession?.visitorName || input.visitorName || "Website Visitor";
            const phone = updatedSession?.visitorPhone || input.visitorPhone || "";
            const email = updatedSession?.visitorEmail || input.visitorEmail || "";

            await createOpsLead({
              userId: owner.id,
              name,
              phone,
              email: email || undefined,
              source: "website",
              stage: "new",
              notes: `Lead from AI chat widget.\n\nConversation summary:\n${history.slice(-4).map(m => `${m.role === "user" ? "Visitor" : "AI"}: ${m.content}`).join("\n")}`,
            });

            await db.update(chatSessions)
              .set({ leadCreated: true })
              .where(eq(chatSessions.id, session.id));

            await notifyOwner({
              title: `New Chat Lead — ${name}`,
              content: [
                `A visitor provided their contact info via the AI chat widget.`,
                ``,
                `Name: ${name}`,
                phone ? `Phone: ${phone}` : "",
                email ? `Email: ${email}` : "",
                ``,
                `Last message: "${input.message}"`,
                ``,
                `View leads: https://www.nolandearthworks.com/ops/leads`,
              ].filter(Boolean).join("\n"),
            });

            leadCreated = true;
          }
        } catch (err) {
          console.warn("[Chat] Failed to create lead from chat session:", err);
        }
      }

      return { response: responseText, leadCreated };
    }),

  /** Owner: list all chat sessions */
  listSessions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(chatSessions)
        .orderBy(desc(chatSessions.updatedAt))
        .limit(50);
    }),

  /** Owner: get messages for a specific session */
  getSessionMessages: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, input.sessionId))
        .orderBy(chatMessages.createdAt);
    }),
});
