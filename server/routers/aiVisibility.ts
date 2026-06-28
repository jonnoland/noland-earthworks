import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aiVisibilityAudits, aiVisibilityPrompts } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access only." });
  }
  return next({ ctx });
});

// ─── Prompts ──────────────────────────────────────────────────────────────────

const AUDIT_PROMPTS: Array<{
  prompt: string;
  category: "local_service" | "branded" | "competitor" | "use_case" | "general";
  platform: "grok";
}> = [
  // Local service — no brand name, pure intent
  {
    prompt: "Who does forestry mulching in Middle Tennessee? Give me specific companies.",
    category: "local_service",
    platform: "grok",
  },
  {
    prompt: "Best land clearing companies near Columbia Tennessee",
    category: "local_service",
    platform: "grok",
  },
  {
    prompt: "Veteran-owned land clearing company in Tennessee — any recommendations?",
    category: "local_service",
    platform: "grok",
  },
  {
    prompt: "Forestry mulching services near Nashville Tennessee — who should I call?",
    category: "local_service",
    platform: "grok",
  },
  // Branded — direct name queries
  {
    prompt: "What is Noland Earthworks and what services do they offer?",
    category: "branded",
    platform: "grok",
  },
  {
    prompt: "Is Noland Earthworks LLC a reputable land clearing company in Tennessee?",
    category: "branded",
    platform: "grok",
  },
  // Use case — specific job types
  {
    prompt: "I need to reclaim overgrown pasture in Middle Tennessee — who can help?",
    category: "use_case",
    platform: "grok",
  },
  {
    prompt: "Who clears cedar thickets and overgrown brush in Tennessee without burning or hauling?",
    category: "use_case",
    platform: "grok",
  },
  {
    prompt: "Fence line clearing and right-of-way clearing companies in Tennessee",
    category: "use_case",
    platform: "grok",
  },
  // Competitor — share of voice
  {
    prompt: "Compare Middle Tennessee Land Clearing LLC vs other land clearing companies in Tennessee",
    category: "competitor",
    platform: "grok",
  },
];

// ─── Scoring Logic ────────────────────────────────────────────────────────────

function scorePromptResult(response: string, mentioned: boolean, prominence: string, sentiment: string, cited: boolean): number {
  if (!mentioned) return 0;
  let score = 30; // base for any mention
  if (prominence === "primary") score += 40;
  else if (prominence === "secondary") score += 20;
  if (sentiment === "positive") score += 20;
  else if (sentiment === "neutral") score += 5;
  if (cited) score += 10;
  return Math.min(score, 100);
}

function generateRecommendations(promptResults: Array<{
  prompt: string;
  category: string;
  mentioned: boolean;
  prominence: string;
  sentiment: string;
  cited: boolean;
  score: number;
}>): string[] {
  const recs: string[] = [];
  const localMisses = promptResults.filter(r => r.category === "local_service" && !r.mentioned);
  const brandedMisses = promptResults.filter(r => r.category === "branded" && !r.mentioned);
  const useCaseMisses = promptResults.filter(r => r.category === "use_case" && !r.mentioned);
  const citedCount = promptResults.filter(r => r.cited).length;
  const positiveCount = promptResults.filter(r => r.sentiment === "positive").length;
  const mentionedCount = promptResults.filter(r => r.mentioned).length;

  if (localMisses.length > 1) {
    recs.push("Add more location-specific content targeting Middle Tennessee counties. AI models surface companies with strong geographic signals — publish service area pages for Maury, Williamson, Hickman, and Lewis counties.");
  }
  if (brandedMisses.length > 0) {
    recs.push("Your brand is not appearing in direct branded queries. Ensure your Google Business Profile, website About page, and schema markup (Organization schema) all consistently use the exact name 'Noland Earthworks LLC'.");
  }
  if (useCaseMisses.length > 1) {
    recs.push("Create dedicated FAQ content for specific use cases: pasture reclamation, cedar thicket clearing, fence line clearing, and right-of-way work. AI models pull from structured Q&A content heavily.");
  }
  if (citedCount === 0) {
    recs.push("No domain citations detected. Add an llms.txt file at nolandearthworks.com/llms.txt describing your business, services, and service area in plain text — this is the emerging standard for AI crawler indexing.");
  }
  if (citedCount < 2) {
    recs.push("Strengthen your domain authority by earning backlinks from Tennessee agriculture, farming, and real estate publications. AI models weight cited sources more heavily in local service recommendations.");
  }
  if (positiveCount < mentionedCount * 0.7 && mentionedCount > 0) {
    recs.push("Some mentions have neutral or unclear sentiment. Add more specific outcome language to your website: acreage cleared, typical timelines, before/after results. AI models reflect the tone of the content they index.");
  }
  if (mentionedCount === 0) {
    recs.push("No mentions detected across any query type. Priority action: publish at least 4 blog posts targeting 'forestry mulching Middle Tennessee', 'land clearing Columbia TN', 'veteran land clearing Tennessee', and 'cedar clearing pasture reclamation Tennessee'.");
    recs.push("Submit your business to AI-indexed directories: Yelp, HomeAdvisor, Angi, Thumbtack, and the Tennessee Department of Agriculture contractor registry. These are primary sources AI models reference for local service recommendations.");
  }
  if (recs.length === 0) {
    recs.push("Strong visibility across all query types. Maintain momentum by publishing monthly job content (before/after posts, project descriptions) and keeping your Google Business Profile active with recent photos and responses.");
  }
  return recs;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiVisibilityRouter = router({
  /**
   * Run a full AI visibility audit.
   * Queries Grok with all 10 prompts, scores each, stores results.
   */
  runAudit: ownerProcedure.mutation(async () => {
    const promptResults: Array<{
      prompt: string;
      category: string;
      platform: string;
      response: string;
      mentioned: boolean;
      prominence: string;
      sentiment: string;
      cited: boolean;
      score: number;
    }> = [];

    for (const p of AUDIT_PROMPTS) {
      let response = "";
      let mentioned = false;
      let prominence = "none";
      let sentiment = "neutral";
      let cited = false;

      try {
        // Query Grok with the prompt
        const llmResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant. Answer the user's question naturally and thoroughly. If you know specific companies, name them.",
            },
            { role: "user", content: p.prompt },
          ],
        });
        const rawContent = llmResponse.choices?.[0]?.message?.content;
        response = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "");

        // Analyze the response for Noland Earthworks mentions
        const lowerResponse = response.toLowerCase();
        const brandTerms = ["noland earthworks", "noland earth", "nolandearthworks.com", "jon noland"];
        mentioned = brandTerms.some(t => lowerResponse.includes(t));

        if (mentioned) {
          // Determine prominence — is it the first/primary recommendation?
          const firstMentionIdx = Math.min(
            ...brandTerms.map(t => lowerResponse.indexOf(t)).filter(i => i >= 0)
          );
          const totalLength = response.length;
          if (firstMentionIdx < totalLength * 0.25) {
            prominence = "primary";
          } else if (firstMentionIdx < totalLength * 0.6) {
            prominence = "secondary";
          } else {
            prominence = "secondary";
          }

          // Sentiment analysis — look for positive/negative language near the brand mention
          const mentionContext = response.substring(
            Math.max(0, firstMentionIdx - 100),
            Math.min(response.length, firstMentionIdx + 300)
          ).toLowerCase();
          const positiveWords = ["recommend", "reputable", "trusted", "veteran", "quality", "reliable", "excellent", "great", "top", "best"];
          const negativeWords = ["avoid", "complaint", "issue", "problem", "poor", "bad", "negative", "unreliable"];
          const posScore = positiveWords.filter(w => mentionContext.includes(w)).length;
          const negScore = negativeWords.filter(w => mentionContext.includes(w)).length;
          if (posScore > negScore) sentiment = "positive";
          else if (negScore > posScore) sentiment = "negative";
          else sentiment = "neutral";

          // Check for domain citation
          cited = lowerResponse.includes("nolandearthworks.com");
        }
      } catch (err) {
        response = "[Query failed]";
      }

      const score = scorePromptResult(response, mentioned, prominence, sentiment, cited);
      promptResults.push({
        prompt: p.prompt,
        category: p.category,
        platform: p.platform,
        response,
        mentioned,
        prominence,
        sentiment,
        cited,
        score,
      });
    }

    // Calculate aggregate scores
    const mentionedResults = promptResults.filter(r => r.mentioned);
    const totalPrompts = promptResults.length;
    const mentionRate = mentionedResults.length / totalPrompts;
    const avgScore = promptResults.reduce((sum, r) => sum + r.score, 0) / totalPrompts;

    // Overall score: weighted combination of mention rate and average score
    const overallScore = Math.round(mentionRate * 50 + avgScore * 0.5);

    // Platform scores (all grok for now, structured for future expansion)
    const grokResults = promptResults.filter(r => r.platform === "grok");
    const grokScore = grokResults.length > 0
      ? Math.round(grokResults.reduce((s, r) => s + r.score, 0) / grokResults.length)
      : 0;
    const platformScores = JSON.stringify({ grok: grokScore, gemini: null, perplexity: null, chatgpt: null });

    // Mention stats
    const mentionStats = JSON.stringify({
      mentions: mentionedResults.length,
      total: totalPrompts,
      positiveCount: promptResults.filter(r => r.sentiment === "positive").length,
      neutralCount: promptResults.filter(r => r.sentiment === "neutral" && r.mentioned).length,
      negativeCount: promptResults.filter(r => r.sentiment === "negative").length,
      citedCount: promptResults.filter(r => r.cited).length,
    });

    // Share of voice — competitor prompt: did we appear vs competitor?
    const competitorPrompts = promptResults.filter(r => r.category === "competitor");
    const shareOfVoice = competitorPrompts.length > 0
      ? Math.round((competitorPrompts.filter(r => r.mentioned).length / competitorPrompts.length) * 100)
      : 0;

    // Generate recommendations
    const recommendations = generateRecommendations(promptResults);

    // Store audit
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const [insertResult] = await dbConn.insert(aiVisibilityAudits).values({
      overallScore,
      platformScores,
      mentionStats,
      promptResults: JSON.stringify(promptResults),
      recommendations: JSON.stringify(recommendations),
      shareOfVoice,
    });

    const auditId = (insertResult as any).insertId as number;

    // Store individual prompt results
    for (const r of promptResults) {
      await dbConn.insert(aiVisibilityPrompts).values({
        auditId,
        prompt: r.prompt,
        category: r.category,
        platform: r.platform,
        response: r.response,
        mentioned: r.mentioned,
        prominence: r.prominence,
        sentiment: r.sentiment,
        cited: r.cited,
        score: r.score,
      });
    }

    return {
      auditId,
      overallScore,
      platformScores: JSON.parse(platformScores),
      mentionStats: JSON.parse(mentionStats),
      promptResults,
      recommendations,
      shareOfVoice,
    };
  }),

  /** Get the latest audit result */
  getLatest: ownerProcedure.query(async () => {
    const dbConn = await getDb();
    if (!dbConn) return null;
    const [latest] = await dbConn
      .select()
      .from(aiVisibilityAudits)
      .orderBy(desc(aiVisibilityAudits.createdAt))
      .limit(1);

    if (!latest) return null;

    const prompts = await dbConn
      .select()
      .from(aiVisibilityPrompts)
      .where(eq(aiVisibilityPrompts.auditId, latest.id))
      .orderBy(aiVisibilityPrompts.id);

    return {
      ...latest,
      platformScores: JSON.parse(latest.platformScores),
      mentionStats: JSON.parse(latest.mentionStats),
      promptResults: JSON.parse(latest.promptResults),
      recommendations: JSON.parse(latest.recommendations),
      prompts,
    };
  }),

  /** Get audit history for the trend chart (last 10 audits) */
  getHistory: ownerProcedure.query(async () => {
    const dbConn = await getDb();
    if (!dbConn) return [];
    const audits = await dbConn
      .select({
        id: aiVisibilityAudits.id,
        overallScore: aiVisibilityAudits.overallScore,
        shareOfVoice: aiVisibilityAudits.shareOfVoice,
        createdAt: aiVisibilityAudits.createdAt,
        mentionStats: aiVisibilityAudits.mentionStats,
      })
      .from(aiVisibilityAudits)
      .orderBy(desc(aiVisibilityAudits.createdAt))
      .limit(10);

    return audits.map((a: typeof audits[0]) => ({
      ...a,
      mentionStats: JSON.parse(a.mentionStats),
    })).reverse(); // chronological for chart
  }),
});
