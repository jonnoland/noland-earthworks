import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aiVisibilityAudits, aiVisibilityPrompts, seoArticles } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

// ─── Recommendation Fix Types ─────────────────────────────────────────────────

export type AeoFixType =
  | "generate_blog_posts"     // AI writes 4 blog post drafts targeting missing keywords
  | "fix_brand_schema"        // Patch Organization schema in index.html
  | "generate_faq_content"    // AI writes FAQ content for use-case gaps
  | "llms_txt_exists"         // llms.txt already exists and is served
  | "build_backlinks"         // Manual outreach steps
  | "improve_sentiment"       // AI rewrites outcome-focused copy snippets
  | "submit_directories"      // List of directories to submit to
  | "maintain_momentum";      // Already strong — maintenance tips

export interface TaggedRecommendation {
  text: string;
  fixType: AeoFixType;
  fixLabel: string;
  autoFixable: boolean; // true = backend can do it; false = show instructions
}

function tagRecommendations(recs: string[]): TaggedRecommendation[] {
  return recs.map(text => {
    if (text.includes("location-specific content") || text.includes("service area pages")) {
      return { text, fixType: "generate_blog_posts", fixLabel: "Generate Blog Drafts", autoFixable: true };
    }
    if (text.includes("brand is not appearing") || text.includes("Organization schema")) {
      return { text, fixType: "fix_brand_schema", fixLabel: "Fix Brand Schema", autoFixable: true };
    }
    if (text.includes("FAQ content") || text.includes("use case")) {
      return { text, fixType: "generate_faq_content", fixLabel: "Generate FAQ Content", autoFixable: true };
    }
    if (text.includes("llms.txt")) {
      return { text, fixType: "llms_txt_exists", fixLabel: "View llms.txt", autoFixable: false };
    }
    if (text.includes("backlinks") || text.includes("domain authority")) {
      return { text, fixType: "build_backlinks", fixLabel: "Get Backlink Steps", autoFixable: false };
    }
    if (text.includes("sentiment") || text.includes("outcome language")) {
      return { text, fixType: "improve_sentiment", fixLabel: "Generate Copy Snippets", autoFixable: true };
    }
    if (text.includes("directories") || text.includes("Yelp") || text.includes("HomeAdvisor")) {
      return { text, fixType: "submit_directories", fixLabel: "Get Directory List", autoFixable: false };
    }
    if (text.includes("blog posts") && text.includes("Priority action")) {
      return { text, fixType: "generate_blog_posts", fixLabel: "Generate Blog Drafts", autoFixable: true };
    }
    return { text, fixType: "maintain_momentum", fixLabel: "View Tips", autoFixable: false };
  });
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const AUDIT_PROMPTS: Array<{
  prompt: string;
  category: "local_service" | "branded" | "competitor" | "use_case" | "general";
  platform: "grok";
}> = [
  // Local service — forestry mulching intent, no brand name
  {
    prompt: "Who does forestry mulching in Middle Tennessee? Give me specific companies.",
    category: "local_service",
    platform: "grok",
  },
  {
    prompt: "Best forestry mulching contractors near Columbia Tennessee",
    category: "local_service",
    platform: "grok",
  },
  {
    prompt: "Forestry mulching services near Nashville Tennessee — who should I call?",
    category: "local_service",
    platform: "grok",
  },
  {
    prompt: "Veteran-owned forestry mulching company in Tennessee — any recommendations?",
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
    prompt: "Is Noland Earthworks LLC a reputable forestry mulching company in Tennessee?",
    category: "branded",
    platform: "grok",
  },
  // Use case — specific forestry mulching jobs
  {
    prompt: "I need forestry mulching to reclaim overgrown pasture in Middle Tennessee — who can help?",
    category: "use_case",
    platform: "grok",
  },
  {
    prompt: "Who uses a forestry mulcher to clear cedar thickets and overgrown brush in Tennessee without burning or hauling?",
    category: "use_case",
    platform: "grok",
  },
  {
    prompt: "Forestry mulching for lot clearing and site prep in Middle Tennessee",
    category: "use_case",
    platform: "grok",
  },
  // Competitor — share of voice for forestry mulching specifically
  {
    prompt: "Compare forestry mulching companies in Middle Tennessee — who are the top options?",
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
}>): TaggedRecommendation[] {
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
    recs.push("No mentions detected across any query type. Priority action: publish at least 4 blog posts targeting 'forestry mulching Middle Tennessee', 'land management Columbia TN', 'veteran land management Tennessee', and 'cedar clearing pasture reclamation Tennessee'.");
    recs.push("Submit your business to AI-indexed directories: Yelp, HomeAdvisor, Angi, Thumbtack, and the Tennessee Department of Agriculture contractor registry. These are primary sources AI models reference for local service recommendations.");
  }
  if (recs.length === 0) {
    recs.push("Strong visibility across all query types. Maintain momentum by publishing monthly job content (before/after posts, project descriptions) and keeping your Google Business Profile active with recent photos and responses.");
  }
  return tagRecommendations(recs);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiVisibilityRouter = router({
  /**
   * Run a full AI visibility audit.
   * Queries Grok with all 10 prompts, scores each, stores results.
   */
  runAudit: protectedProcedure.mutation(async () => {
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

    // Generate recommendations (tagged)
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
  getLatest: protectedProcedure.query(async () => {
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

  /**
   * Apply an AEO fix for a specific recommendation type.
   * Auto-fixable types generate content/patches; manual types return instructions.
   */
  applyAeoFix: protectedProcedure
    .input(z.object({
      fixType: z.enum([
        "generate_blog_posts",
        "fix_brand_schema",
        "generate_faq_content",
        "llms_txt_exists",
        "build_backlinks",
        "improve_sentiment",
        "submit_directories",
        "maintain_momentum",
      ]),
    }))
    .mutation(async ({ input }) => {
      const { fixType } = input;

      if (fixType === "llms_txt_exists") {
        return {
          fixType,
          autoApplied: false,
          title: "llms.txt is already live",
          content: `Your llms.txt file is already served at https://nolandearthworks.com/llms.txt\n\nIt describes your business, all 5 services, and your 35-county service area in plain text. AI crawlers (ChatGPT, Claude, Perplexity) use this file to understand your site.\n\nNo action needed — this fix is already in place.`,
        };
      }

      if (fixType === "build_backlinks") {
        return {
          fixType,
          autoApplied: false,
          title: "Backlink Outreach Steps",
          content: `Priority backlink targets for Noland Earthworks:\n\n1. Tennessee Farm Bureau (tnfarmbureau.org) — Submit a vendor listing under their contractor directory.\n2. Tennessee Department of Agriculture (tn.gov/agriculture) — Register as a licensed contractor.\n3. Maury County Chamber of Commerce (maurychamber.com) — Member business directory listing.\n4. Middle Tennessee Association of Realtors — Reach out to request a preferred vendor listing.\n5. LawnSite.com forums — Create a profile and participate in forestry mulching threads (builds domain authority through forum backlinks).\n6. ArboristSite.com — Same approach as LawnSite.\n7. Local news outlets (Maury County Times, Columbia Daily Herald) — Offer a quote or story angle on veteran-owned businesses in Middle Tennessee.\n8. HomeAdvisor / Angi — Paid listings but generate high-authority backlinks and AI citation signals.`,
        };
      }

      if (fixType === "submit_directories") {
        return {
          fixType,
          autoApplied: false,
          title: "Directory Submission List",
          content: `Submit Noland Earthworks to these AI-indexed directories:\n\n**Free:**\n- Yelp: yelp.com/biz/add\n- Angi (formerly Angie's List): angi.com/pro\n- HomeAdvisor: homeadvisor.com/c.html\n- Thumbtack: thumbtack.com/pro\n- Houzz: houzz.com/pro\n- BBB (Better Business Bureau): bbb.org/get-accredited\n- Google Business Profile: business.google.com (verify you are active)\n- Bing Places: bingplaces.com\n- Apple Maps: mapsconnect.apple.com\n\n**Tennessee-specific:**\n- Tennessee Department of Agriculture contractor registry\n- Maury County Chamber of Commerce member directory\n- Tennessee Small Business Development Center directory\n\n**Veteran-owned:**\n- VetBiz.gov (SBA veteran-owned business registry)\n- NVBDC (National Veteran Business Development Council)\n- Tennessee Department of General Services SDVOSB registry`,
        };
      }

      if (fixType === "maintain_momentum") {
        return {
          fixType,
          autoApplied: false,
          title: "Maintaining Strong AI Visibility",
          content: `Your AI visibility is strong. To maintain and improve it:\n\n1. Post one before/after job photo to Google Business Profile every 2 weeks.\n2. Publish one blog post per month targeting a specific county or use case.\n3. Respond to every Google review within 48 hours — AI models weight recency and engagement.\n4. Keep your Google Business Profile hours, services, and description current.\n5. Add job completion photos to your website gallery after each project.\n6. Ask satisfied customers to mention specific services and location in their reviews (e.g., \"forestry mulching in Maury County\").`,
        };
      }

      // Auto-fixable types — use AI to generate content
      if (fixType === "generate_blog_posts") {
        const dbConn = await getDb();
        const blogTopics = [
          { keyword: "forestry mulching Middle Tennessee", title: "What Is Forestry Mulching and Why It's the Best Way to Clear Land in Middle Tennessee" },
          { keyword: "land management Columbia TN", title: "Land Management in Columbia, TN: What to Expect and How to Choose the Right Contractor" },
          { keyword: "veteran land management Tennessee", title: "Veteran-Owned Land Management in Tennessee: Why It Matters and What Sets It Apart" },
          { keyword: "cedar clearing pasture reclamation Tennessee", title: "Reclaiming Pasture from Cedar Thickets in Middle Tennessee: A Practical Guide" },
        ];

        const drafts: Array<{ title: string; keyword: string; wordCount: number }> = [];
        for (const topic of blogTopics) {
          try {
            const res = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `You are writing blog content for Noland Earthworks, LLC — a veteran-owned forestry mulching and land management company in Middle Tennessee. Owner is Jon Noland. Write in a direct, confident, first-person voice. No emojis. No corporate jargon. Sound like a real person who does this work. Avoid: 'solutions', 'industry-leading', 'best-in-class', 'passionate', 'dedicated team', 'cutting-edge'. Target length: 800-1000 words.`,
                },
                {
                  role: "user",
                  content: `Write a blog post titled: "${topic.title}"\n\nPrimary keyword to target: ${topic.keyword}\n\nInclude:\n- A strong opening paragraph that speaks directly to a landowner's problem\n- 3-4 H2 sections covering the topic thoroughly\n- Specific references to Middle Tennessee geography, terrain, and conditions\n- A closing paragraph with a clear call to action (call or visit nolandearthworks.com)\n- Naturally mention Noland Earthworks and Jon Noland at least 3 times\n\nWrite in Markdown format.`,
                },
              ],
            });
            const body = typeof res.choices?.[0]?.message?.content === "string"
              ? res.choices[0].message.content
              : "";
            const wordCount = body.split(/\s+/).filter(Boolean).length;

            if (dbConn && body) {
              await dbConn.insert(seoArticles).values({
                targetKeyword: topic.keyword,
                title: topic.title,
                bodyMarkdown: body,
                wordCount,
                status: "draft",
              });
            }
            drafts.push({ title: topic.title, keyword: topic.keyword, wordCount });
          } catch (_) {
            drafts.push({ title: topic.title, keyword: topic.keyword, wordCount: 0 });
          }
        }

        return {
          fixType,
          autoApplied: true,
          title: `${drafts.length} Blog Post Drafts Generated`,
          content: `The following blog post drafts have been saved to your SEO Articles library (accessible from the SEO tab):\n\n${drafts.map((d, i) => `${i + 1}. **${d.title}**\n   Keyword: ${d.keyword} | ~${d.wordCount} words`).join("\n\n")}\n\nReview and publish each post to your website blog. These target the exact keyword gaps identified in your AI visibility audit.`,
        };
      }

      if (fixType === "fix_brand_schema") {
        // The Organization schema is already in index.html — verify and report
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an SEO technical consultant. Provide a JSON-LD Organization schema snippet.",
            },
            {
              role: "user",
              content: `Generate a complete JSON-LD Organization schema for:\n- Name: Noland Earthworks LLC\n- URL: https://nolandearthworks.com\n- Phone: 615-406-4819\n- Email: info@nolandearthworks.com\n- Description: Veteran-owned forestry mulching and land management company serving 35 counties in Middle and West Tennessee\n- Services: Forestry Mulching, Land Management, Vegetation Management, Right-of-Way Clearing, Property Maintenance\n- Area served: Middle and West Tennessee\n- Founded: 2020\n- Owner: Jon Noland\n\nReturn only the JSON-LD script block, no explanation.`,
            },
          ],
        });
        const schema = typeof res.choices?.[0]?.message?.content === "string"
          ? res.choices[0].message.content
          : "";

        return {
          fixType,
          autoApplied: false,
          title: "Organization Schema — Verify in index.html",
          content: `Your Organization schema is already present in index.html. Verify it matches this optimized version and update if needed:\n\n${schema}\n\nKey fields AI models use for brand recognition: @type, name, url, telephone, description, areaServed, and founder.`,
        };
      }

      if (fixType === "generate_faq_content") {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are writing FAQ content for Noland Earthworks, LLC. Write in Jon Noland's voice — direct, confident, no jargon. No emojis.",
            },
            {
              role: "user",
              content: `Write 8 FAQ questions and answers covering these use cases that AI models are not currently surfacing Noland Earthworks for:\n\n1. Pasture reclamation from overgrown brush and cedar\n2. Cedar thicket clearing in Middle Tennessee\n3. Fence line clearing and restoration\n4. Right-of-way and trail cutting\n\nFor each FAQ:\n- Question should be phrased as a landowner would ask it\n- Answer should be 2-4 sentences, specific to Middle Tennessee conditions\n- Mention Noland Earthworks or Jon Noland naturally in at least 4 answers\n- Include a call to action in the last answer\n\nFormat as Markdown with ## for each question.`,
            },
          ],
        });
        const content = typeof res.choices?.[0]?.message?.content === "string"
          ? res.choices[0].message.content
          : "";

        return {
          fixType,
          autoApplied: false,
          title: "FAQ Content for Use-Case Gaps",
          content: `Add this FAQ content to your website's FAQ page or as a dedicated section on your services pages. AI models heavily reference structured Q&A content for local service recommendations.\n\n---\n\n${content}`,
        };
      }

      if (fixType === "improve_sentiment") {
        const res = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are writing website copy for Noland Earthworks, LLC. Write in Jon Noland's voice — direct, confident, outcome-focused. No emojis. No corporate jargon.",
            },
            {
              role: "user",
              content: `Write 5 short outcome-focused copy snippets (2-3 sentences each) for the Noland Earthworks website. Each snippet should:\n- Describe a specific, concrete result a customer got\n- Reference Middle Tennessee geography or terrain\n- Use specific language (acreage, timeline, terrain type)\n- Sound like Jon Noland wrote it himself\n\nExamples of the right tone: \"Took 8 acres of cedar thicket in Maury County down to clean ground in a single day. The owner hadn't been able to use that pasture in 10 years.\" \"Cleared a 400-foot fence line in Hickman County that had been swallowed by brush — fence posts were still standing underneath.\"\n\nWrite 5 more like these.`,
            },
          ],
        });
        const content = typeof res.choices?.[0]?.message?.content === "string"
          ? res.choices[0].message.content
          : "";

        return {
          fixType,
          autoApplied: false,
          title: "Outcome-Focused Copy Snippets",
          content: `Add these snippets to your website's testimonials section, homepage, or service pages. Specific outcome language improves how AI models describe your work.\n\n---\n\n${content}`,
        };
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown fix type: ${fixType}` });
    }),

  /** Get audit history for the trend chart (last 10 audits) */
  getHistory: protectedProcedure.query(async () => {
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
