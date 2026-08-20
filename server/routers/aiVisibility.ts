import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aiVisibilityAudits, aiVisibilityPrompts, seoArticles } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { calculateAiVisibilityDiagnostic } from "../aiVisibilityScoring";

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

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
  region: string;
}> = [
  // Local service — Middle Tennessee, no brand name
  {
    prompt: "Which forestry mulching contractors serve rural acreage in Middle Tennessee? Name specific companies and coverage areas.",
    category: "local_service",
    platform: "grok",
    region: "Middle TN",
  },
  {
    prompt: "Who offers forestry mulching near Columbia and Maury County, Tennessee for overgrown brush and cedar?",
    category: "local_service",
    platform: "grok",
    region: "Middle TN",
  },
  {
    prompt: "Which forestry mulching contractors serve the Nashville area and nearby rural properties in Tennessee?",
    category: "local_service",
    platform: "grok",
    region: "Middle TN",
  },
  {
    prompt: "Veteran-owned forestry mulching company in Tennessee — any recommendations?",
    category: "local_service",
    platform: "grok",
    region: "Tennessee",
  },
  // Local service — West Tennessee
  {
    prompt: "Who does forestry mulching in West Tennessee? Looking for a contractor near Jackson or Henderson.",
    category: "local_service",
    platform: "grok",
    region: "West TN",
  },
  {
    prompt: "Forestry mulching and vegetation management contractors in West Tennessee — which companies cover rural properties?",
    category: "local_service",
    platform: "grok",
    region: "West TN",
  },
  // Branded — direct name queries
  {
    prompt: "What is Noland Earthworks LLC and what services do they offer?",
    category: "branded",
    platform: "grok",
    region: "Tennessee",
  },
  {
    prompt: "What public business information is available about Noland Earthworks and its forestry mulching services?",
    category: "branded",
    platform: "grok",
    region: "Tennessee",
  },
  {
    prompt: "Jon Noland forestry mulching Tennessee — tell me about his company",
    category: "branded",
    platform: "grok",
    region: "Tennessee",
  },
  // Use case — specific forestry mulching jobs
  {
    prompt: "I need forestry mulching to reclaim overgrown pasture in Middle Tennessee — who can help?",
    category: "use_case",
    platform: "grok",
    region: "Middle TN",
  },
  {
    prompt: "Who uses a forestry mulcher to clear cedar thickets and overgrown brush in Tennessee without burning or hauling?",
    category: "use_case",
    platform: "grok",
    region: "Tennessee",
  },
  {
    prompt: "Who provides forestry mulching for lot vegetation clearing and site preparation in Middle Tennessee?",
    category: "use_case",
    platform: "grok",
    region: "Middle TN",
  },
  {
    prompt: "Best way to clear cedar thickets in Tennessee without burning — what companies do this?",
    category: "use_case",
    platform: "grok",
    region: "Tennessee",
  },
  // Competitor — share of voice
  {
    prompt: "Compare forestry mulching companies in Middle Tennessee — who are the top options and what sets them apart?",
    category: "competitor",
    platform: "grok",
    region: "Middle TN",
  },
  {
    prompt: "Which Tennessee companies are known for forestry mulching, and what service areas do they cover?",
    category: "competitor",
    platform: "grok",
    region: "Tennessee",
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

type AuditPromptResult = {
  prompt: string;
  category: string;
  platform: string;
  response: string;
  mentioned: boolean;
  prominence: string;
  sentiment: string;
  cited: boolean;
  score: number;
};

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runWorker));
  return results;
}

async function auditPrompt(p: (typeof AUDIT_PROMPTS)[number]): Promise<AuditPromptResult> {
  let response = "";
  let mentioned = false;
  let prominence = "none";
  let sentiment = "neutral";
  let cited = false;
  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Answer the user's question naturally and thoroughly, then analyze that answer for a specific business. Return JSON only.

Business identifiers: Noland Earthworks, Noland Earthworks LLC, Jon Noland, nolandearthworks.com.

Only set mentioned=true when an identifier is present in the answer. prominence is primary, secondary, or none. sentiment is positive, neutral, or negative. cited is true only when nolandearthworks.com appears in the answer.`,
        },
        { role: "user", content: p.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "visibility_prompt_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              response: { type: "string" },
              mentioned: { type: "boolean" },
              prominence: { type: "string", enum: ["primary", "secondary", "none"] },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
              cited: { type: "boolean" },
            },
            required: ["response", "mentioned", "prominence", "sentiment", "cited"],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = llmResponse.choices?.[0]?.message?.content;
    const rawText = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "{}");
    const analysis = JSON.parse(stripCodeFence(rawText));
    response = typeof analysis.response === "string" ? analysis.response : "";
    mentioned = analysis.mentioned === true;
    prominence = ["primary", "secondary", "none"].includes(analysis.prominence) ? analysis.prominence : "none";
    sentiment = ["positive", "neutral", "negative"].includes(analysis.sentiment) ? analysis.sentiment : "neutral";
    cited = analysis.cited === true;
  } catch (error) {
    const detail = error instanceof Error ? error.message.toLowerCase() : "";
    response = detail.includes("unavailable") || detail.includes("non-json")
      ? "[Service temporarily unavailable]"
      : "[Query failed]";
  }
  return { prompt: p.prompt, category: p.category, platform: p.platform, response, mentioned, prominence, sentiment, cited, score: scorePromptResult(response, mentioned, prominence, sentiment, cited) };
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
    recs.push("Strengthen visible geographic context on the forestry mulching service page and the county pages most relevant to current work. Explain the property types, vegetation, and on-site assessment process for Maury, Williamson, Hickman, and Lewis counties; measure non-branded impressions and qualified leads after publishing.");
  }
  if (brandedMisses.length > 0) {
    recs.push("Your brand is not appearing in direct branded queries. Ensure your Google Business Profile, website About page, and schema markup (Organization schema) all consistently use the exact name 'Noland Earthworks LLC'.");
  }
  if (useCaseMisses.length > 1) {
    recs.push("Strengthen visible service-page answers for pasture reclamation, cedar thickets, fence lines, and right-of-way work. Clear headings and direct answers help landowners and parsers understand the exact fit; validate the result with Bing AI Performance and Search Console.");
  }
  if (citedCount === 0) {
    recs.push("No domain links appeared in this controlled AI-answer diagnostic. Treat this as a prompt signal, not a citation report; use Bing Webmaster Tools AI Performance to measure real cited URLs and grounding queries.");
  }
  if (citedCount < 2) {
    recs.push("Earn relevant local references from Tennessee agriculture, farming, real-estate, and community organizations. These listings can corroborate business details and create referral paths; measure actual citation activity in Bing AI Performance.");
  }
  if (positiveCount < mentionedCount * 0.7 && mentionedCount > 0) {
    recs.push("Some mentions have neutral or unclear sentiment. Add verified project facts to service pages and gallery captions: work area, vegetation type, terrain, timeline, and the finished use of the land. Do not add unverified outcomes or reviews.");
  }
  if (mentionedCount === 0) {
    recs.push("No mentions appeared across this prompt set. Prioritize helpful, first-hand forestry-mulching pages for Middle Tennessee, Columbia and Maury County, veteran-owned owner-operator context, and cedar pasture reclamation. Measure non-branded impressions and qualified leads rather than a model score alone.");
    recs.push("Keep business details consistent in Google Business Profile, Bing Places, Apple Business Connect, relevant Tennessee directories, and veteran-owned registries. Confirm each listing is accurate before relying on it as a discovery signal.");
  }
  if (recs.length === 0) {
    recs.push("The controlled prompt set is showing strong coverage. Maintain verified project updates, current business-profile details, and recurring checks of Bing AI Performance, Search Console, and qualified organic leads.");
  }
  return tagRecommendations(recs);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const aiVisibilityRouter = router({
  /**
   * Run a full AI visibility audit.
  * Queries Grok with controlled forestry-mulching prompts, scores each, and stores the diagnostic.
  */
  runAudit: protectedProcedure.mutation(async () => {
    const promptResults = await mapWithConcurrency(AUDIT_PROMPTS, 3, auditPrompt);
    const unavailableCount = promptResults.filter((result) => result.response === "[Service temporarily unavailable]").length;

    // Calculate aggregate scores
    const mentionedResults = promptResults.filter(r => r.mentioned);
    const totalPrompts = promptResults.length;
    const mentionRate = mentionedResults.length / totalPrompts;
    const diagnostic = calculateAiVisibilityDiagnostic(promptResults);
    const overallScore = diagnostic.overallScore;

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
      unavailableCount,
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
          content: `Your llms.txt file is already served at https://nolandearthworks.com/llms.txt\n\nIt provides a plain-language reference to your business, services, service area, and key pages. Google has said llms.txt is not a ranking signal, so treat it as supplementary documentation rather than a visibility lever.\n\nNo action needed — keep the file accurate when core business facts change.`,
        };
      }

      if (fixType === "build_backlinks") {
        return {
          fixType,
          autoApplied: false,
          title: "Backlink Outreach Steps",
          content: `Prioritize relevant, factual references for Noland Earthworks:\n\n1. Keep Google Business Profile, Bing Places, Apple Business Connect, and veteran-owned registry details current.\n2. Consider a Maury County Chamber of Commerce listing if membership fits the business.\n3. Pursue appropriate Tennessee agriculture, farming, landowner, and real-estate association listings.\n4. Share verified project details with local publications when there is a real story angle.\n5. Participate in specialist forums only when you can provide useful, first-hand answers; do not create links solely for rankings.\n\nVerify every eligibility requirement and avoid directories that require claims you cannot support. Use Search Console and Bing AI Performance to assess whether referral, discovery, or citation activity changes.`,
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
