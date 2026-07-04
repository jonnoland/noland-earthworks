/**
 * AI Lead Qualifier
 * Scores incoming quote submissions as Strong / Marginal / Weak,
 * identifies red flags, summarizes the lead, and drafts an initial
 * response message in Jon's voice.
 *
 * Also generates a customer-facing ballpark range shown on the
 * quote confirmation page after submission.
 */

import { invokeLLM } from "./_core/llm";
import type { QuoteInput } from "./quoteRouter";

export type LeadScore = "strong" | "marginal" | "weak";

export interface LeadQualification {
  score: LeadScore;
  summary: string;        // 1–2 sentence plain-English summary for Jon
  flags: string[];        // Red flags or notable concerns
  draftResponse: string;  // Draft initial response in Jon's voice
  ballparkRange: string;  // Customer-facing rough range, e.g. "$2,000 – $4,500"
  ballparkNote: string;   // One-sentence caveat explaining why it's a rough range
}

const SYSTEM_PROMPT = `You are an AI assistant for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee. Your job is to qualify incoming quote requests and score them for the owner, Jon Noland.

SCORING CRITERIA:

STRONG lead (score: "strong"):
- Clear project goal (land management, forestry mulching, pasture reclamation, site prep)
- Acreage in the 2–20 acre range
- Located in Middle or West Tennessee service area
- Customer seems realistic about scope and timeline
- No red flags

MARGINAL lead (score: "marginal"):
- Project is within scope but has complicating factors
- Acreage is very small (<1 acre) or very large (>50 acres, may need phasing)
- Some ambiguity in scope or customer expectations
- Minor concerns but still worth pursuing

WEAK lead (score: "weak"):
- Expects grading, excavation, or hauling (outside scope)
- Suburban lot under 0.5 acres that won't justify mobilization
- Vague with no clear goal or property details
- Price-shopping language ("just want a ballpark", "cheapest option")
- Out of service area
- Unrealistic expectations

SERVICES OFFERED:
- Forestry mulching (primary — grinds brush/saplings/small trees into mulch, no debris piles)
- Land clearing / site prep
- Right-of-way clearing
- Trail cutting (linear clearing for hiking, hunting, or equipment access trails)
- Brush hogging (secondary, lower margin)
- Stump grinding (add-on)

SERVICES NOT OFFERED (flag these):
- Grading, leveling, excavation
- Debris hauling
- Tree removal (large trees, arborist work)

SERVICE AREA: Middle Tennessee and West Tennessee — all 35 counties including Davidson, Williamson, Maury, Marshall, Rutherford, Wilson, Sumner, Robertson, Cheatham, Dickson, Hickman, Lawrence, Giles, Lincoln, Bedford, Montgomery, and all surrounding counties.

PRICING REFERENCE (Middle & West Tennessee market rates — use to compute ballparkRange):

Forestry Mulching (per acre):
  - Light brush / saplings under 4": $1,000 – $1,500/acre
  - Moderate growth, trees up to 8": $1,500 – $2,500/acre
  - Heavy timber / dense cedar: $2,500 – $4,500+/acre
  - Minimum job: $1,800

Land Management / Land Management (per acre):
  - Light clearing (mostly brush, flat): $1,500 – $3,000/acre
  - Moderate clearing (mixed timber, some slope): $3,000 – $6,000/acre
  - Heavy clearing (dense timber, steep terrain): $6,000 – $12,000+/acre

Vegetation Management / Right-of-Way (per acre):
  - Light ROW: $1,200 – $2,500/acre
  - Overgrown ROW: $2,500 – $5,500+/acre

Property Maintenance / Brush Hogging (per acre):
  - Pasture/field maintenance: $150 – $400/acre
  - Brush control: $400 – $900/acre
  - Full reclamation: $900 – $2,000+/acre

Trail Cutting (per linear foot — primary quoting unit; standard trail width 6–16 ft):
  - Flat terrain, light brush: $2.00 – $3.00/linear ft
  - Sloped terrain (+20%): $2.40 – $3.60/linear ft
  - Rocky terrain (+40%): $2.80 – $4.20/linear ft
  - Minimum job: $500
  - Example: 1,000 linear ft × 10 ft wide × $2.50/lf = $2,500
  - Effective acreage (for reference): length × width ÷ 43,560 sq ft

Add-ons:
  - Post-clear seeding: $150 – $700/acre
  - Stump grinding: $150 – $400/stump or $500 – $1,200/acre

BALLPARK RANGE RULES:
- Compute a total project range (not per-acre) using the acreage provided and the pricing reference above
- If acreage is not provided, use a per-acre range only and note that total depends on acreage
- Use the lower bound of the appropriate tier for the low end, upper bound for the high end
- Round to the nearest $500 for cleaner numbers
- If the job is out of scope (grading, hauling, excavation), set ballparkRange to "" (empty string)
- If the lead is too vague to estimate, set ballparkRange to "" (empty string)
- ballparkNote must be one sentence, plain language, explaining that this is a rough range pending a site visit — never promise a price

DRAFT RESPONSE VOICE:
Write in Jon's voice — direct, professional, warm. Sound like a real person who does this work. No corporate language. No emojis. No "we strive to" or "industry-leading." Keep it to 2–3 sentences. Reference the specific service and county when possible.`;

export async function qualifyLead(input: QuoteInput): Promise<LeadQualification> {
  const submissionText = [
    `Name: ${input.name}`,
    `Service Requested: ${input.service}`,
    `County: ${input.county} County, TN`,
    input.acreage ? `Acreage: ${input.acreage}` : "Acreage: Not specified",
    input.street || input.city ? `Address: ${[input.street, input.city, input.state, input.zip].filter(Boolean).join(", ")}` : "",
    input.addOns && input.addOns.length > 0 ? `Add-ons requested: ${input.addOns.join(", ")}` : "",
    input.message ? `Customer message: "${input.message}"` : "Customer message: None provided",
  ].filter(Boolean).join("\n");

  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Please qualify this incoming quote request and return a JSON response:\n\n${submissionText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lead_qualification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: {
                type: "string",
                enum: ["strong", "marginal", "weak"],
                description: "Lead quality score",
              },
              summary: {
                type: "string",
                description: "1-2 sentence plain-English summary of the lead for Jon",
              },
              flags: {
                type: "array",
                items: { type: "string" },
                description: "List of red flags or notable concerns. Empty array if none.",
              },
              draftResponse: {
                type: "string",
                description: "Draft initial response message in Jon's voice, 2-3 sentences",
              },
              ballparkRange: {
                type: "string",
                description: "Customer-facing rough total project range, e.g. '$2,000 – $4,500'. Empty string if job is out of scope or too vague to estimate.",
              },
              ballparkNote: {
                type: "string",
                description: "One-sentence plain-language caveat explaining this is a rough range pending a site visit. Empty string if ballparkRange is empty.",
              },
            },
            required: ["score", "summary", "flags", "draftResponse", "ballparkRange", "ballparkNote"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

    return {
      score: parsed.score as LeadScore,
      summary: parsed.summary as string,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      draftResponse: parsed.draftResponse as string,
      ballparkRange: (parsed.ballparkRange as string) ?? "",
      ballparkNote: (parsed.ballparkNote as string) ?? "",
    };
  } catch (err) {
    console.error("[LeadQualifier] Failed to qualify lead:", err);
    // Return a safe fallback — do not block the quote submission
    return {
      score: "marginal",
      summary: `Quote request from ${input.name} for ${input.service} in ${input.county} County.`,
      flags: ["AI qualification failed — review manually"],
      draftResponse: `Hi ${input.name.split(" ")[0]}, thanks for reaching out to Noland Earthworks. I'll take a look at your project details and be in touch shortly to discuss next steps.`,
      ballparkRange: "",
      ballparkNote: "",
    };
  }
}
