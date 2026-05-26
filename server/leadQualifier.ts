/**
 * AI Lead Qualifier
 * Scores incoming quote submissions as Strong / Marginal / Weak,
 * identifies red flags, summarizes the lead, and drafts an initial
 * response message in Jon's voice.
 */

import { invokeLLM } from "./_core/llm";
import type { QuoteInput } from "./quoteRouter";

export type LeadScore = "strong" | "marginal" | "weak";

export interface LeadQualification {
  score: LeadScore;
  summary: string;       // 1–2 sentence plain-English summary for Jon
  flags: string[];       // Red flags or notable concerns
  draftResponse: string; // Draft initial response in Jon's voice
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
- Brush hogging (secondary, lower margin)
- Stump grinding (add-on)

SERVICES NOT OFFERED (flag these):
- Grading, leveling, excavation
- Debris hauling
- Tree removal (large trees, arborist work)

SERVICE AREA: Middle Tennessee and West Tennessee — all 35 counties including Davidson, Williamson, Maury, Marshall, Rutherford, Wilson, Sumner, Robertson, Cheatham, Dickson, Hickman, Lawrence, Giles, Lincoln, Bedford, Montgomery, and all surrounding counties.

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
            },
            required: ["score", "summary", "flags", "draftResponse"],
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
    };
  } catch (err) {
    console.error("[LeadQualifier] Failed to qualify lead:", err);
    // Return a safe fallback — do not block the quote submission
    return {
      score: "marginal",
      summary: `Quote request from ${input.name} for ${input.service} in ${input.county} County.`,
      flags: ["AI qualification failed — review manually"],
      draftResponse: `Hi ${input.name.split(" ")[0]}, thanks for reaching out to Noland Earthworks. I'll take a look at your project details and be in touch shortly to discuss next steps.`,
    };
  }
}
