/**
 * Ads tRPC router — owner-only procedures for the Ads page.
 * Covers: AI copy generation (single + all-five), per-platform publishing,
 * post history CRUD, scheduling, ad spend tracking, platform connection status,
 * and LinkedIn credential management.
 *
 * Extracted from opsRouter.ts for maintainability.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { and, desc, eq } from "drizzle-orm";

/**
 * Owner-only guard — mirrors the one in opsRouter.ts.
 * Only the site owner (matched by OWNER_OPEN_ID or role=admin) can call these.
 */
const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwnerByOpenId = ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByOpenId && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

// ─── Social Posts sub-router ──────────────────────────────────────────────────
export const socialPostsRouter = router({
  /** Generate AI ad copy + image for a single platform */
  generate: ownerProcedure
    .input(z.object({
      jobDescription: z.string().max(1000).optional(),
      adTypes: z.array(z.enum([
        "before_after", "problem_solution", "education", "seasonal_urgency",
        "veteran_trust", "reclaim_your_land", "specific_use_case", "general",
      ])).min(1).max(3).default(["general"]),
      platform: z.enum(["facebook", "instagram", "both", "x"]).default("both"),
      tone: z.enum(["casual", "professional"]).default("casual"),
      generateImage: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const platformNote = input.platform === "both"
        ? "Write one post that works for both Facebook and Instagram."
        : input.platform === "x"
          ? "Write a post for X (formerly Twitter). Keep the post body under 280 characters total. Be punchy and direct — X rewards brevity. No hashtag overload (1-2 max). End with a short CTA."
          : `Write a post for ${input.platform === "facebook" ? "Facebook" : "Instagram"}.`;
      const toneNote = input.tone === "professional"
        ? "Tone: professional and direct, but still genuine and human."
        : "Tone: casual, warm, southern hospitality. Like a neighbor talking to a neighbor. Genuine, not salesy.";

      const adTypeInstructions: Record<string, string> = {
        before_after: "Ad type: Before/After transformation. Open with the problem (overgrown, unusable land). Close with the result (clean, cleared, usable). This is the highest-performing format — make the contrast vivid and real.",
        problem_solution: "Ad type: Problem/Solution. Hook with a specific problem a Middle Tennessee landowner faces (overgrown fence line, can't use their acreage, fire hazard, brush taking over a pasture). Then present forestry mulching as the clean, fast solution. Emphasize: no burn piles, no hauling, no erosion.",
        education: "Ad type: Education. Explain what forestry mulching actually is and why it beats bush hogging or bulldozing. Target people who don't know the service exists. Keep it plain and practical — not a lecture.",
        seasonal_urgency: "Ad type: Seasonal Urgency. Fall and winter are the best time to clear — dormant vegetation, firmer ground, better visibility, faster results. Encourage booking now before the calendar fills up. Keep it honest, not pushy.",
        veteran_trust: "Ad type: Veteran-Owned Trust. Lead with the veteran-owned identity. Reliability, integrity, showing up when committed, doing the work as quoted. This is not a marketing angle — it is how the business operates. Speak to landowners who value that.",
        reclaim_your_land: "Ad type: Reclaim Your Land. Emotional angle — the landowner bought this property for a reason and it has gotten away from them. Speak to that feeling directly. Make it feel like Jon understands their situation. End with a low-pressure invitation to call.",
        specific_use_case: "Ad type: Specific Use Case. Pick one specific scenario: pasture reclamation for a farmer, fence line clearing, lot clearing for a residential developer, or right-of-way clearing. Speak directly to that landowner's situation.",
        general: "Ad type: Choose the best angle based on what performs well for land clearing companies. Consider before/after, problem/solution, or veteran trust as the top performers.",
      };

      const adTypeNote = input.adTypes.length === 1
        ? (adTypeInstructions[input.adTypes[0]] ?? adTypeInstructions.general)
        : `Blend these ${input.adTypes.length} ad styles into one cohesive post: ${input.adTypes.map((t: string) => adTypeInstructions[t] ?? "").join(" ")}`;

      const jobContext = input.jobDescription
        ? `Base the ad on this specific job or context: ${input.jobDescription}`
        : `No specific job was provided. Draw on your knowledge of what Noland Earthworks does — forestry mulching, land clearing, brush removal, pasture reclamation, fence line clearing, right-of-way clearing in Middle Tennessee. Use real, specific details that a Tennessee landowner would recognize.`;

      const competitorContext = `Competitor ad intelligence (for reference, do NOT copy — write in Jon's voice):
- Hook style that works: "Are you a property owner in Middle Tennessee with overgrown land you haven't been able to use?"
- Effective body: "Most people think clearing land means weeks of chainsaw work, burn piles, and hauling debris. Forestry mulching grinds it all down into nutrient-rich mulch right on the spot. No burn piles. No hauling fees. No erosion."
- Effective CTA: "Click this ad, fill out the info and we will give you a call for a quote."
- What works: specific, plain language; before/after contrast; addressing the exact problem the landowner has; low-pressure CTA.
- What does not work: generic "call us for land clearing"; stock images; corporate language.`;

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You write social media ads for Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee. ${platformNote} ${toneNote} ${adTypeNote} Rules: No emojis. No hashtag overload (max 3 relevant hashtags, only if appropriate for the platform). No corporate jargon. No banned phrases: "solutions", "industry-leading", "best-in-class", "we are passionate", "dedicated team", "we strive to", "cutting-edge". Sound like a real person who does this work — not a marketing department. End with a direct, low-pressure CTA (call, text, or visit nolandearthworks.com). Keep the post body under 150 words. Also write a short image generation prompt (under 60 words) describing a realistic, gritty photo of land clearing or forestry mulching work in Tennessee — no people, no logos, no text in the image. ${competitorContext} Return JSON: { "draft": "...", "headline": "...", "imagePrompt": "..." }`,
          },
          { role: "user", content: jobContext },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "social_ad",
            strict: true,
            schema: {
              type: "object",
              properties: {
                draft: { type: "string", description: "The full post body text" },
                headline: { type: "string", description: "Short punchy headline, max 8 words" },
                imagePrompt: { type: "string", description: "Image generation prompt for a realistic land clearing photo" },
              },
              required: ["draft", "headline", "imagePrompt"],
              additionalProperties: false,
            },
          },
        },
      });

      let parsed: { draft: string; headline: string; imagePrompt: string };
      try {
        parsed = JSON.parse(result.choices?.[0]?.message?.content as string ?? "{}");
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Try again." });
      }
      if (!parsed.draft) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return ad copy. Try again." });

      let imageUrl: string | null = null;
      if (input.generateImage && parsed.imagePrompt) {
        try {
          const imgResult = await generateImage({ prompt: parsed.imagePrompt });
          imageUrl = imgResult.url ?? null;
        } catch (e) {
          console.error("[Ads] Image generation failed:", e);
        }
      }

      return { draft: parsed.draft, headline: parsed.headline, imagePrompt: parsed.imagePrompt, imageUrl };
    }),

  /** Generate separate, platform-optimized ad copy for all five platforms in one call */
  generateForAll: ownerProcedure
    .input(z.object({
      jobDescription: z.string().max(1000).optional(),
      adTypes: z.array(z.enum([
        "before_after", "problem_solution", "education", "seasonal_urgency",
        "veteran_trust", "reclaim_your_land", "specific_use_case", "general",
      ])).min(1).max(3).default(["general"]),
      tone: z.enum(["casual", "professional"]).default("casual"),
      generateImage: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const toneNote = input.tone === "professional"
        ? "Tone: professional and direct, but still genuine and human."
        : "Tone: casual, warm, southern hospitality. Like a neighbor talking to a neighbor. Genuine, not salesy.";

      const adTypeInstructions: Record<string, string> = {
        before_after: "Ad type: Before/After transformation. Open with the problem (overgrown, unusable land). Close with the result (clean, cleared, usable). This is the highest-performing format — make the contrast vivid and real.",
        problem_solution: "Ad type: Problem/Solution. Hook with a specific problem a Middle Tennessee landowner faces. Then present forestry mulching as the clean, fast solution. Emphasize: no burn piles, no hauling, no erosion.",
        education: "Ad type: Education. Explain what forestry mulching actually is and why it beats bush hogging or bulldozing. Keep it plain and practical.",
        seasonal_urgency: "Ad type: Seasonal Urgency. Fall and winter are the best time to clear — dormant vegetation, firmer ground, better visibility, faster results. Encourage booking now before the calendar fills up.",
        veteran_trust: "Ad type: Veteran-Owned Trust. Lead with the veteran-owned identity. Reliability, integrity, showing up when committed, doing the work as quoted.",
        reclaim_your_land: "Ad type: Reclaim Your Land. Emotional angle — the landowner bought this property for a reason and it has gotten away from them. End with a low-pressure invitation to call.",
        specific_use_case: "Ad type: Specific Use Case. Pick one specific scenario: pasture reclamation, fence line clearing, lot clearing, or right-of-way clearing.",
        general: "Ad type: Choose the best angle based on what performs well for land clearing companies. Consider before/after, problem/solution, or veteran trust.",
      };
      const adTypeNote = input.adTypes.length === 1
        ? (adTypeInstructions[input.adTypes[0]] ?? adTypeInstructions.general)
        : `Blend these ${input.adTypes.length} ad styles into one cohesive post: ${input.adTypes.map((t: string) => adTypeInstructions[t] ?? "").join(" ")}`;

      const jobContext = input.jobDescription
        ? `Base the ad on this specific job or context: ${input.jobDescription}`
        : `No specific job was provided. Draw on your knowledge of what Noland Earthworks does — forestry mulching, land clearing, brush removal, pasture reclamation, fence line clearing, right-of-way clearing in Middle & West Tennessee.`;

      const competitorContext = `Competitor ad intelligence (for reference, do NOT copy — write in Jon's voice):
- Hook style that works: "Are you a property owner in Middle Tennessee with overgrown land you haven't been able to use?"
- Effective body: "Most people think clearing land means weeks of chainsaw work, burn piles, and hauling debris. Forestry mulching grinds it all down into nutrient-rich mulch right on the spot. No burn piles. No hauling fees. No erosion."
- What works: specific, plain language; before/after contrast; addressing the exact problem the landowner has; low-pressure CTA.`;

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You write social media ads for Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle & West Tennessee. ${toneNote} ${adTypeNote} Rules: No emojis. No corporate jargon. No banned phrases: "solutions", "industry-leading", "best-in-class", "we are passionate", "dedicated team", "we strive to", "cutting-edge". Sound like a real person who does this work. ${competitorContext} Return JSON with five separate platform-optimized posts. Facebook: conversational, up to 150 words, 2-3 hashtags max. Instagram: visual-first, shorter (under 100 words), 3-5 relevant hashtags. X: punchy, under 280 characters total including any hashtags, 1-2 hashtags max. LinkedIn: professional tone, up to 200 words, industry-focused, 2-3 relevant hashtags, suitable for a B2B audience of developers, property managers, and municipal contacts. Google: short, direct ad copy for a Google search ad — one headline (max 30 characters), one description (max 90 characters), and a brief extended description (up to 60 words) that could serve as a display ad body. All five must end with a direct CTA (call, text, or visit nolandearthworks.com). Also write one image generation prompt (under 60 words) for a realistic gritty photo of land clearing work in Tennessee — no people, no logos, no text.`,
          },
          { role: "user", content: jobContext },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "all_platform_ads",
            strict: true,
            schema: {
              type: "object",
              properties: {
                facebook: {
                  type: "object",
                  properties: {
                    draft: { type: "string", description: "Facebook post body" },
                    headline: { type: "string", description: "Short headline, max 8 words" },
                  },
                  required: ["draft", "headline"],
                  additionalProperties: false,
                },
                instagram: {
                  type: "object",
                  properties: {
                    draft: { type: "string", description: "Instagram caption" },
                    headline: { type: "string", description: "Short headline, max 8 words" },
                  },
                  required: ["draft", "headline"],
                  additionalProperties: false,
                },
                x: {
                  type: "object",
                  properties: {
                    draft: { type: "string", description: "X post, max 280 chars" },
                    headline: { type: "string", description: "Short headline, max 8 words" },
                  },
                  required: ["draft", "headline"],
                  additionalProperties: false,
                },
                linkedin: {
                  type: "object",
                  properties: {
                    draft: { type: "string", description: "LinkedIn post body, up to 200 words, professional tone" },
                    headline: { type: "string", description: "Short headline, max 8 words" },
                  },
                  required: ["draft", "headline"],
                  additionalProperties: false,
                },
                google: {
                  type: "object",
                  properties: {
                    draft: { type: "string", description: "Google ad extended description, up to 60 words" },
                    headline: { type: "string", description: "Google ad headline, max 30 characters" },
                    description: { type: "string", description: "Google ad description line, max 90 characters" },
                  },
                  required: ["draft", "headline", "description"],
                  additionalProperties: false,
                },
                imagePrompt: { type: "string", description: "Image generation prompt" },
              },
              required: ["facebook", "instagram", "x", "linkedin", "google", "imagePrompt"],
              additionalProperties: false,
            },
          },
        },
      });

      let parsed: {
        facebook: { draft: string; headline: string };
        instagram: { draft: string; headline: string };
        x: { draft: string; headline: string };
        linkedin: { draft: string; headline: string };
        google: { draft: string; headline: string; description: string };
        imagePrompt: string;
      };
      try {
        parsed = JSON.parse(result.choices?.[0]?.message?.content as string ?? "{}");
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid JSON. Try again." });
      }
      if (!parsed.facebook?.draft) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI did not return ad copy. Try again." });

      let imageUrl: string | null = null;
      if (input.generateImage && parsed.imagePrompt) {
        try {
          const imgResult = await generateImage({ prompt: parsed.imagePrompt });
          imageUrl = imgResult.url ?? null;
        } catch (e) {
          console.error("[Ads] Image generation failed:", e);
        }
      }

      return {
        facebook: { draft: parsed.facebook.draft, headline: parsed.facebook.headline },
        instagram: { draft: parsed.instagram.draft, headline: parsed.instagram.headline },
        x: { draft: parsed.x.draft, headline: parsed.x.headline },
        linkedin: { draft: parsed.linkedin?.draft ?? "", headline: parsed.linkedin?.headline ?? "" },
        google: { draft: parsed.google?.draft ?? "", headline: parsed.google?.headline ?? "", description: parsed.google?.description ?? "" },
        imagePrompt: parsed.imagePrompt,
        imageUrl,
      };
    }),

  /** Re-generate copy for a single platform without touching the others */
  regeneratePlatform: ownerProcedure
    .input(z.object({
      platform: z.enum(["facebook", "instagram", "x", "linkedin", "google"]),
      adTypes: z.array(z.enum(["before_after", "problem_solution", "education", "seasonal_urgency", "veteran_trust", "reclaim_your_land", "specific_use_case", "general"])).min(1).max(3).default(["general"]),
      tone: z.enum(["professional", "casual", "urgent"]).default("casual"),
      jobDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const toneMap: Record<string, string> = {
        professional: "Tone: professional and direct.",
        casual: "Tone: casual, warm, southern hospitality — like Jon talking to a neighbor.",
        urgent: "Tone: urgent but not pushy — the calendar is filling up.",
      };
      const adTypeInstructions: Record<string, string> = {
        problem_solution: "Ad type: Problem/Solution. Hook with a specific problem a Middle Tennessee landowner faces. Then present forestry mulching as the clean, fast solution.",
        education: "Ad type: Education. Explain what forestry mulching actually is and why it beats bush hogging or bulldozing.",
        seasonal_urgency: "Ad type: Seasonal Urgency. Fall and winter are the best time to clear — dormant vegetation, firmer ground, better visibility.",
        veteran_trust: "Ad type: Veteran-Owned Trust. Lead with the veteran-owned identity.",
        reclaim_your_land: "Ad type: Reclaim Your Land. Emotional angle — the landowner bought this property for a reason and it has gotten away from them.",
        specific_use_case: "Ad type: Specific Use Case. Pick one: pasture reclamation, fence line clearing, lot clearing, or right-of-way clearing.",
        general: "Ad type: Choose the best angle based on what performs well for land clearing companies.",
      };
      const platformInstructions: Record<string, string> = {
        facebook: "Write a Facebook post: conversational, up to 150 words, 2-3 hashtags max, end with a direct CTA (call, text, or visit nolandearthworks.com).",
        instagram: "Write an Instagram caption: visual-first, under 100 words, 3-5 relevant hashtags, end with a direct CTA.",
        x: "Write an X (Twitter) post: punchy, MUST be under 280 characters total including hashtags, 1-2 hashtags max, end with a direct CTA.",
        linkedin: "Write a LinkedIn post: professional tone, up to 200 words, industry-focused for developers, property managers, and municipal contacts, 2-3 relevant hashtags, end with a direct CTA (call, text, or visit nolandearthworks.com).",
        google: "Write Google Ads copy: a headline (max 30 characters), a description line (max 90 characters), and an extended description (up to 60 words) suitable for a display ad. Direct, specific, no fluff. End with a CTA.",
      };
      const jobContext = input.jobDescription
        ? `Base the ad on this specific job or context: ${input.jobDescription}`
        : `No specific job provided. Draw on Noland Earthworks services — forestry mulching, land clearing, brush removal, pasture reclamation, fence line clearing, right-of-way clearing in Middle & West Tennessee.`;
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You write social media ads for Jon Noland, owner of Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle & West Tennessee. ${toneMap[input.tone]} ${input.adTypes.length === 1 ? adTypeInstructions[input.adTypes[0]] : input.adTypes.map((t: string) => adTypeInstructions[t] ?? "").join(" ")} ${platformInstructions[input.platform]} Rules: No emojis. No corporate jargon. No banned phrases: "solutions", "industry-leading", "best-in-class", "we are passionate", "dedicated team", "we strive to", "cutting-edge". Sound like a real person who does this work. Return JSON with draft (the post body) and headline (max 8 words).`,
          },
          { role: "user", content: jobContext },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "single_platform_ad",
            strict: true,
            schema: {
              type: "object",
              properties: {
                draft: { type: "string", description: "Post body" },
                headline: { type: "string", description: "Short headline, max 8 words" },
              },
              required: ["draft", "headline"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = result.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return { draft: parsed.draft ?? "", headline: parsed.headline ?? "" };
    }),

  /** Save a generated post to history */
  savePost: ownerProcedure
    .input(z.object({
      jobDescription: z.string(),
      draft: z.string(),
      headline: z.string().optional(),
      platform: z.string(),
      published: z.boolean().default(false),
      imageUrl: z.string().optional(),
      imageKey: z.string().optional(),
      scheduledAt: z.string().optional(),
      status: z.enum(["draft", "scheduled", "published", "failed"]).default("draft"),
      igDraft: z.string().optional(),
      xDraft: z.string().optional(),
      liDraft: z.string().optional(),
      googleHeadline: z.string().optional(),
      googleDescription: z.string().optional(),
      googleDraft: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { socialPosts } = await import("../../drizzle/schema");
      const result = await db.insert(socialPosts).values({
        userId: ctx.user.id,
        jobDescription: input.jobDescription,
        draft: input.draft,
        headline: input.headline ?? null,
        platform: input.platform,
        published: input.published,
        imageUrl: input.imageUrl ?? null,
        imageKey: input.imageKey ?? null,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        status: input.status,
        igDraft: input.igDraft ?? null,
        xDraft: input.xDraft ?? null,
        liDraft: input.liDraft ?? null,
        googleHeadline: input.googleHeadline ?? null,
        googleDescription: input.googleDescription ?? null,
        googleDraft: input.googleDraft ?? null,
        createdAt: new Date(),
      });
      const insertId = (result as any)[0]?.insertId ?? null;
      return { success: true, id: insertId };
    }),

  /** Upload a job photo to S3 and return the CDN URL */
  uploadPhoto: ownerProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      filename: z.string().default("job-photo.jpg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const suffix = Date.now();
      const key = `ads/photos/${ctx.user.id}-${suffix}-${input.filename}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),

  /** Schedule a post for future publishing */
  schedulePost: ownerProcedure
    .input(z.object({
      id: z.number().int().positive(),
      scheduledAt: z.string(),
      platforms: z.array(z.enum(["facebook", "instagram", "x", "linkedin", "google"])).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { socialPosts } = await import("../../drizzle/schema");
      const hasAll = input.platforms.includes("facebook") && input.platforms.includes("instagram") && input.platforms.includes("x") && input.platforms.includes("linkedin") && input.platforms.includes("google");
      const hasBoth = input.platforms.includes("facebook") && input.platforms.includes("instagram") && !input.platforms.includes("x") && !input.platforms.includes("linkedin") && !input.platforms.includes("google");
      const platformValue = hasAll ? "all" : hasBoth ? "both" : input.platforms[0];
      await db.update(socialPosts)
        .set({ scheduledAt: new Date(input.scheduledAt), status: "scheduled", platform: platformValue })
        .where(and(eq(socialPosts.id, input.id), eq(socialPosts.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Publish a post to Facebook Page */
  publishToFacebook: ownerProcedure
    .input(z.object({
      postId: z.number().int().positive(),
      message: z.string(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const pageId = ENV.facebookPageId;
      const accessToken = ENV.facebookPageAccessToken;
      if (!pageId || !accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Facebook Page credentials not configured. Add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in project secrets." });
      }

      let fbPostId: string;
      if (input.imageUrl) {
        const photoRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.imageUrl, caption: input.message, access_token: accessToken }),
        });
        const photoData = await photoRes.json() as any;
        if (!photoRes.ok || photoData.error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Facebook API error: ${photoData.error?.message ?? "Unknown error"}` });
        }
        fbPostId = photoData.post_id ?? photoData.id;
      } else {
        const feedRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: input.message, access_token: accessToken }),
        });
        const feedData = await feedRes.json() as any;
        if (!feedRes.ok || feedData.error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Facebook API error: ${feedData.error?.message ?? "Unknown error"}` });
        }
        fbPostId = feedData.id;
      }

      const db = await getDb();
      if (db) {
        const { socialPosts } = await import("../../drizzle/schema");
        await db.update(socialPosts).set({ fbPostId, published: true, postedAt: new Date() }).where(eq(socialPosts.id, input.postId));
      }

      return { success: true, fbPostId, url: `https://www.facebook.com/${pageId}/posts/${fbPostId.split("_")[1] ?? fbPostId}` };
    }),

  /** Publish a post to Instagram (via Instagram Graph API) */
  publishToInstagram: ownerProcedure
    .input(z.object({
      postId: z.number().int().positive(),
      caption: z.string(),
      imageUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const igUserId = ENV.instagramUserId;
      const accessToken = ENV.instagramAccessToken;
      if (!igUserId || !accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Instagram credentials not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID." });
      }

      const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: input.imageUrl, caption: input.caption, access_token: accessToken }),
      });
      const containerData = await containerRes.json() as any;
      if (!containerRes.ok || containerData.error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Instagram media container error: ${containerData.error?.message ?? "Unknown"}` });
      }

      const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
      });
      const publishData = await publishRes.json() as any;
      if (!publishRes.ok || publishData.error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Instagram publish error: ${publishData.error?.message ?? "Unknown"}` });
      }
      const igPostId = publishData.id;

      const db = await getDb();
      if (db) {
        const { socialPosts } = await import("../../drizzle/schema");
        await db.update(socialPosts).set({ igPostId, published: true, postedAt: new Date() }).where(eq(socialPosts.id, input.postId));
      }

      return { success: true, igPostId };
    }),

  /** Publish a post to X (Twitter) using OAuth 1.0a static credentials */
  publishToX: ownerProcedure
    .input(z.object({
      postId: z.number().int().positive(),
      text: z.string(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { getXClient } = await import("../xRoutes");
      const client = getXClient();
      const rwClient = client.readWrite;

      let mediaId: string | undefined;
      if (input.imageUrl) {
        try {
          const imgRes = await fetch(input.imageUrl);
          if (imgRes.ok) {
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
            const uploadedMedia = await rwClient.v1.uploadMedia(imgBuffer, { mimeType: contentType });
            mediaId = uploadedMedia;
          }
        } catch (err) {
          console.warn("[X] Image upload failed, posting text-only:", err);
        }
      }

      const tweetParams: Record<string, unknown> = {};
      if (mediaId) tweetParams.media = { media_ids: [mediaId] };
      const tweet = await rwClient.v2.tweet(input.text, tweetParams);
      const xPostId = tweet.data?.id;

      const db = await getDb();
      if (db && xPostId) {
        const { socialPosts } = await import("../../drizzle/schema");
        await db.update(socialPosts).set({ xPostId, published: true, postedAt: new Date() }).where(eq(socialPosts.id, input.postId));
      }

      return { success: true, xPostId };
    }),

  /** Check X connection status */
  xStatus: ownerProcedure.query(() => {
    const configured = !!(ENV.twitterApiKey && ENV.twitterApiSecret && ENV.twitterAccessToken && ENV.twitterAccessTokenSecret);
    return { connected: configured, screenName: configured ? "nolandearthwrks" : null };
  }),

  /** Disconnect X account — no-op for static credentials */
  xDisconnect: ownerProcedure.mutation(() => {
    return { success: true };
  }),

  /** Publish a post to LinkedIn (organic UGC post) */
  publishToLinkedIn: ownerProcedure
    .input(z.object({
      postId: z.number().int().positive(),
      text: z.string(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { linkedinCredentials, socialPosts } = await import("../../drizzle/schema");
      const rows = await db.select().from(linkedinCredentials).limit(1);
      const cred = rows[0];
      if (!cred?.accessToken || !cred?.authorUrn) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "LinkedIn credentials not configured. Open LinkedIn settings on the Ads page to add your access token and author URN.",
        });
      }

      const body: Record<string, unknown> = {
        author: cred.authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: input.text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      const liRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cred.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(body),
      });

      const liData = await liRes.json() as any;
      if (!liRes.ok) {
        const msg = liData?.message ?? liData?.serviceErrorCode ?? "LinkedIn post failed";
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `LinkedIn: ${msg}` });
      }

      const liPostId: string = liData.id ?? liData["id"] ?? "";
      await db.update(socialPosts)
        .set({ published: true, postedAt: new Date(), liPostId: liPostId || null })
        .where(eq(socialPosts.id, input.postId));

      return { success: true, liPostId };
    }),

  /** Publish to Facebook, Instagram, and X simultaneously (legacy all-platforms) */
  publishToAll: ownerProcedure
    .input(z.object({
      postId: z.number().int().positive(),
      message: z.string(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const results: {
        facebook?: { success: boolean; postId?: string; error?: string };
        instagram?: { success: boolean; postId?: string; error?: string };
        x?: { success: boolean; postId?: string; error?: string };
      } = {};

      // --- Facebook ---
      try {
        const pageId = ENV.facebookPageId;
        const accessToken = ENV.facebookPageAccessToken;
        if (!pageId || !accessToken) throw new Error("Facebook credentials not configured");
        let fbPostId: string;
        if (input.imageUrl) {
          const r = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: input.imageUrl, caption: input.message, access_token: accessToken }),
          });
          const d = await r.json() as any;
          if (!r.ok || d.error) throw new Error(d.error?.message ?? "FB photo post failed");
          fbPostId = d.post_id ?? d.id;
        } else {
          const r = await fetch(`https://graph.facebook.com/v20.0/${pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: input.message, access_token: accessToken }),
          });
          const d = await r.json() as any;
          if (!r.ok || d.error) throw new Error(d.error?.message ?? "FB feed post failed");
          fbPostId = d.id;
        }
        const db = await getDb();
        if (db) {
          const { socialPosts } = await import("../../drizzle/schema");
          await db.update(socialPosts).set({ fbPostId, published: true, postedAt: new Date() }).where(eq(socialPosts.id, input.postId));
        }
        results.facebook = { success: true, postId: fbPostId };
      } catch (err: any) {
        results.facebook = { success: false, error: err.message ?? "Unknown error" };
      }

      // --- Instagram ---
      try {
        const igUserId = ENV.instagramUserId;
        const accessToken = ENV.instagramAccessToken;
        if (!igUserId || !accessToken) throw new Error("Instagram credentials not configured. Set INSTAGRAM_ACCESS_TOKEN.");
        if (!input.imageUrl) throw new Error("Instagram requires an image");
        const containerRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: input.imageUrl, caption: input.message, access_token: accessToken }),
        });
        const containerData = await containerRes.json() as any;
        if (!containerRes.ok || containerData.error) throw new Error(containerData.error?.message ?? "IG container error");
        const publishRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
        });
        const publishData = await publishRes.json() as any;
        if (!publishRes.ok || publishData.error) throw new Error(publishData.error?.message ?? "IG publish error");
        const igPostId = publishData.id;
        const db = await getDb();
        if (db) {
          const { socialPosts } = await import("../../drizzle/schema");
          await db.update(socialPosts).set({ igPostId, published: true, postedAt: new Date() }).where(eq(socialPosts.id, input.postId));
        }
        results.instagram = { success: true, postId: igPostId };
      } catch (err: any) {
        results.instagram = { success: false, error: err.message ?? "Unknown error" };
      }

      // --- X (OAuth 1.0a) ---
      try {
        const { getXClient } = await import("../xRoutes");
        const xClient = getXClient().readWrite;
        let mediaId: string | undefined;
        if (input.imageUrl) {
          try {
            const imgRes = await fetch(input.imageUrl);
            if (imgRes.ok) {
              const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
              const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
              mediaId = await xClient.v1.uploadMedia(imgBuffer, { mimeType: contentType });
            }
          } catch { /* post text-only if image upload fails */ }
        }
        const tweetParams: Record<string, unknown> = {};
        if (mediaId) tweetParams.media = { media_ids: [mediaId] };
        const tweet = await xClient.v2.tweet(input.message, tweetParams);
        const xPostId = tweet.data?.id;
        const db = await getDb();
        if (db && xPostId) {
          const { socialPosts } = await import("../../drizzle/schema");
          await db.update(socialPosts).set({ xPostId, published: true, postedAt: new Date() }).where(eq(socialPosts.id, input.postId));
        }
        results.x = { success: true, postId: xPostId };
      } catch (err: any) {
        results.x = { success: false, error: err.message ?? "Unknown error" };
      }

      return results;
    }),

  /** Cancel a scheduled post — reverts it back to draft status */
  cancelSchedule: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { socialPosts } = await import("../../drizzle/schema");
      await db.update(socialPosts)
        .set({ status: "draft", scheduledAt: null })
        .where(and(eq(socialPosts.id, input.id), eq(socialPosts.userId, ctx.user.id)));
      return { success: true };
    }),

  /** List saved posts */
  list: ownerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const { socialPosts } = await import("../../drizzle/schema");
    return db.select().from(socialPosts)
      .where(eq(socialPosts.userId, ctx.user.id))
      .orderBy(desc(socialPosts.createdAt))
      .limit(50);
  }),

  /** Delete a saved post */
  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { socialPosts } = await import("../../drizzle/schema");
      await db.delete(socialPosts)
        .where(and(eq(socialPosts.id, input.id), eq(socialPosts.userId, ctx.user.id)));
      return { success: true };
    }),
});

// ─── Ad Spend sub-router ──────────────────────────────────────────────────────
export const adSpendRouter = router({
  list: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { adSpend } = await import("../../drizzle/schema");
    return db.select().from(adSpend).orderBy(desc(adSpend.spentAt)).limit(500);
  }),

  add: ownerProcedure
    .input(z.object({
      platform: z.enum(["facebook", "instagram", "x", "linkedin", "google", "other"]),
      component: z.string().min(1).max(100),
      amountCents: z.number().int().min(1),
      notes: z.string().max(500).optional(),
      spentAt: z.date(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { adSpend } = await import("../../drizzle/schema");
      await db.insert(adSpend).values({
        platform: input.platform,
        component: input.component,
        amountCents: input.amountCents,
        notes: input.notes ?? null,
        spentAt: input.spentAt,
      });
      return { success: true };
    }),

  delete: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { adSpend } = await import("../../drizzle/schema");
      await db.delete(adSpend).where(eq(adSpend.id, input.id));
      return { success: true };
    }),
});

// ─── Platform Connection Status ───────────────────────────────────────────────
export const platformConnectionStatusProcedure = ownerProcedure.query(async () => {
  // Facebook
  let facebookOk = false;
  let facebookHandle: string | null = null;
  let facebookError: string | null = null;
  const fbToken = ENV.facebookPageAccessToken;
  const fbPageId = ENV.facebookPageId;
  if (fbToken && fbPageId) {
    try {
      const fbRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}?fields=name&access_token=${fbToken}`);
      const fbData = await fbRes.json() as any;
      if (fbRes.ok && !fbData.error) { facebookOk = true; facebookHandle = fbData.name ?? null; }
      else { facebookError = fbData.error?.message ?? "Token invalid or expired"; }
    } catch (e: any) { facebookError = e.message ?? "Network error"; }
  } else { facebookError = "Credentials not configured"; }

  // Instagram
  let instagramOk = false;
  let instagramHandle: string | null = null;
  let instagramError: string | null = null;
  const igToken = ENV.instagramAccessToken;
  const igUserId = ENV.instagramUserId;
  if (igToken && igUserId) {
    try {
      const igRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${igToken}`);
      const igData = await igRes.json() as any;
      if (igRes.ok && !igData.error) { instagramOk = true; instagramHandle = igData.username ? `@${igData.username}` : "@nolandearthworks"; }
      else { instagramError = igData.error?.message ?? "Token invalid or expired"; }
    } catch (e: any) { instagramError = e.message ?? "Network error"; }
  } else { instagramError = "Instagram credentials not configured. Set INSTAGRAM_ACCESS_TOKEN."; }

  // X
  let xOk = false;
  let xHandle: string | null = null;
  let xError: string | null = null;
  const xConfigured = !!(ENV.twitterApiKey && ENV.twitterApiSecret && ENV.twitterAccessToken && ENV.twitterAccessTokenSecret);
  if (xConfigured) {
    try {
      const { getXClient } = await import("../xRoutes");
      const client = getXClient();
      const me = await client.v2.me();
      xOk = true; xHandle = `@${me.data.username}`;
    } catch (e: any) { xError = e.message ?? "X credentials invalid"; }
  } else { xError = "Credentials not configured"; }

  // LinkedIn
  let linkedinOk = false;
  let linkedinHandle: string | null = null;
  let linkedinError: string | null = null;
  try {
    const db = await getDb();
    if (db) {
      const { linkedinCredentials } = await import("../../drizzle/schema");
      const rows = await db.select().from(linkedinCredentials).limit(1);
      const cred = rows[0];
      if (cred?.accessToken && cred?.authorUrn) {
        const liRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${cred.accessToken}` } });
        if (liRes.ok) {
          const liData = await liRes.json() as any;
          linkedinOk = true; linkedinHandle = cred.displayName ?? liData.name ?? liData.sub ?? cred.authorUrn;
        } else { linkedinError = "Token invalid or expired. Re-enter credentials in LinkedIn settings."; }
      } else { linkedinError = "LinkedIn credentials not configured. Click the settings icon to add your access token and author URN."; }
    } else { linkedinError = "DB unavailable"; }
  } catch (e: any) { linkedinError = e.message ?? "LinkedIn check failed"; }

  // Google Business Profile
  let googleOk = false;
  let googleHandle: string | null = null;
  let googleError: string | null = null;
  try {
    const db = await getDb();
    if (db) {
      const { googleOAuthTokens } = await import("../../drizzle/schema");
      const rows = await db.select().from(googleOAuthTokens).limit(1);
      const tok = rows[0];
      if (tok?.accessToken) { googleOk = true; googleHandle = tok.businessName ?? "Connected"; }
      else { googleError = "Not connected. Use the Google Reviews page to connect."; }
    } else { googleError = "DB unavailable"; }
  } catch (e: any) { googleError = e.message ?? "Google Business Profile check failed"; }

  return {
    facebook: { ok: facebookOk, handle: facebookHandle, error: facebookError },
    instagram: { ok: instagramOk, handle: instagramHandle, error: instagramError },
    x: { ok: xOk, handle: xHandle, error: xError },
    linkedin: { ok: linkedinOk, handle: linkedinHandle, error: linkedinError },
    google: { ok: googleOk, handle: googleHandle, error: googleError },
  };
});

// ─── LinkedIn Settings sub-router ─────────────────────────────────────────────
export const linkedinSettingsRouter = router({
  get: ownerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const { linkedinCredentials } = await import("../../drizzle/schema");
    const rows = await db.select().from(linkedinCredentials).limit(1);
    const cred = rows[0];
    if (!cred) return null;
    return {
      hasCredentials: true,
      authorUrn: cred.authorUrn,
      displayName: cred.displayName ?? null,
      tokenPreview: cred.accessToken.length > 6 ? `...${cred.accessToken.slice(-6)}` : "(set)",
    };
  }),

  save: ownerProcedure
    .input(z.object({
      accessToken: z.string().min(10, "Access token is required"),
      authorUrn: z.string().min(10, "Author URN is required (e.g. urn:li:person:abc123)"),
      displayName: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { linkedinCredentials } = await import("../../drizzle/schema");
      const existing = await db.select().from(linkedinCredentials).limit(1);
      if (existing.length > 0) {
        await db.update(linkedinCredentials)
          .set({ accessToken: input.accessToken, authorUrn: input.authorUrn, displayName: input.displayName ?? null })
          .where(eq(linkedinCredentials.id, existing[0].id));
      } else {
        await db.insert(linkedinCredentials).values({ accessToken: input.accessToken, authorUrn: input.authorUrn, displayName: input.displayName ?? null });
      }
      return { success: true };
    }),

  delete: ownerProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const { linkedinCredentials } = await import("../../drizzle/schema");
    await db.delete(linkedinCredentials);
    return { success: true };
  }),
});

// ─── Ads router (top-level export) ───────────────────────────────────────────
export const adsRouter = router({
  socialPosts: socialPostsRouter,
  adSpend: adSpendRouter,
  platformConnectionStatus: platformConnectionStatusProcedure,
  linkedinSettings: linkedinSettingsRouter,
});
