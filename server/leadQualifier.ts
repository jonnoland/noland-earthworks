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
export type RangeConfidence = "high" | "moderate" | "low";

export interface LeadQualification {
  score: LeadScore;
  summary: string;        // 1–2 sentence plain-English summary for Jon
  flags: string[];        // Red flags or notable concerns
  draftResponse: string;  // Draft initial response in Jon's voice
  ballparkRange: string;  // Customer-facing rough range, e.g. "$2,000 – $4,500"
  ballparkNote: string;   // One-sentence caveat explaining why it's a rough range
  rangeConfidence: RangeConfidence; // Confidence in the preliminary range based on submitted scope data
  rangeConfidenceScore: number; // 0–100; an explanation aid, not a price guarantee
  rangeConfidenceReason: string; // One concise plain-English basis for the confidence assessment
  rangeRiskFactors: string[]; // Specific conditions requiring site verification
}

export const SYSTEM_PROMPT = `You are an AI assistant for Noland Earthworks, LLC — a veteran-owned land management and forestry mulching company in Middle Tennessee. Your job is to qualify incoming quote requests and score them for the owner, Jon Noland.

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
- Land Management / site assessment
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

Land Management (per acre):
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

Trail Cutting (effective acres = length × width ÷ 43,560; also quotable per linear foot; standard trail width 6–16 ft):
  - Flat terrain, light brush: $2.00 – $4.00/linear ft (or $600–$1,100/effective acre)
  - Sloped terrain (+20%): $2.40 – $4.80/linear ft
  - Rocky terrain (+40%): $2.80 – $5.60/linear ft
  - Minimum job: $500
  - Example: 1,000 linear ft × 10 ft wide = 0.23 effective acres; at $3/lf = $3,000
  - Effective acreage: length × width ÷ 43,560 sq ft

Add-ons:
  - Stump grinding: $150 – $400/stump or $500 – $1,200/acre

BALLPARK RANGE RULES:
- Compute a total project range (not per-acre) using the acreage provided and the pricing reference above
- If acreage is not provided, use a per-acre range only and note that total depends on acreage
- Use the lower bound of the appropriate tier for the low end, upper bound for the high end
- Round to the nearest $500 for cleaner numbers
- If the job is out of scope (grading, hauling, excavation), set ballparkRange to "" (empty string)
- If the lead is too vague to estimate, set ballparkRange to "" (empty string)
- ballparkNote must be one sentence, plain language, explaining that this is a rough range pending a site visit — never promise a price

MULTI-SERVICE WEB QUOTE RULES:
- The request may include a primary service plus one or more additional services. Read every bullet under "Structured preliminary service estimates"; each bullet is a requested scope item, not optional background information.
- When structured estimates are present, treat their service names, measurements, and low/high ranges as authoritative. Do not drop, rename, or merge a service into the primary request.
- The ballparkRange must reflect the combined project range across every structured service item. Never calculate it from only the primary service.
- For two or more requested services, your summary and draftResponse must name every requested service in plain language. Example: "Forestry mulching plus trail cutting in Dickson County."
- Do not invent a new service, measurement, rate, or discount. If a line needs site verification, retain it and state that site conditions will confirm the final scope.

RANGE CONFIDENCE & RISK:
- Assess the preliminary range only from the detail supplied in the request, especially each structured service estimate, its measurement, and its calculation basis. This is an explanation of estimate reliability, never a price guarantee.
- Return rangeConfidence as "high", "moderate", or "low", plus a rangeConfidenceScore from 0 to 100. Use high only when every requested service has a clear measurement and calculation basis with no material uncertainty described. Use moderate for a reasonable estimate with one or more site conditions still unverified. Use low when scope, measurements, terrain, vegetation, access, utilities, or the requested service mix are materially unclear.
- rangeConfidenceReason must be one plain-English sentence that explains what supports or limits the preliminary range. It must refer to the available measurements or calculation basis when present.
- rangeRiskFactors must be a concise list of specific factors to confirm during the site visit, such as dense vegetation, slope, access, rocks, utilities, corridor width, or an unclear work boundary. Use an empty array only when none are evident from the request.

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
    input.serviceBreakdown.length > 0 ? `Structured preliminary service estimates (every bullet below is a requested scope item and must remain in the combined AI estimate):\n${input.serviceBreakdown.map((item) => `- ${item.label}: $${Math.round(item.lowCents / 100).toLocaleString()} – $${Math.round(item.highCents / 100).toLocaleString()}${item.measurement ? ` (${item.measurement})` : ""}${item.calculation ? ` | Basis: ${item.calculation}` : ""}`).join("\n")}` : "",
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
              rangeConfidence: {
                type: "string",
                enum: ["high", "moderate", "low"],
                description: "Confidence category for the preliminary range based only on the submitted measurements and calculation basis",
              },
              rangeConfidenceScore: {
                type: "integer",
                minimum: 0,
                maximum: 100,
                description: "0-100 confidence score for estimate reliability; this is not a price guarantee",
              },
              rangeConfidenceReason: {
                type: "string",
                description: "One plain-English sentence explaining what supports or limits the preliminary range",
              },
              rangeRiskFactors: {
                type: "array",
                items: { type: "string" },
                description: "Specific site or scope factors that need confirmation during the site visit",
              },
            },
            required: ["score", "summary", "flags", "draftResponse", "ballparkRange", "ballparkNote", "rangeConfidence", "rangeConfidenceScore", "rangeConfidenceReason", "rangeRiskFactors"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    const parsed = JSON.parse(stripCodeFence(typeof content === "string" ? content : JSON.stringify(content)));
    const confidence = parsed.rangeConfidence === "high" || parsed.rangeConfidence === "moderate" || parsed.rangeConfidence === "low"
      ? parsed.rangeConfidence as RangeConfidence
      : "low";
    const confidenceScore = Number(parsed.rangeConfidenceScore);

    return {
      score: parsed.score as LeadScore,
      summary: parsed.summary as string,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      draftResponse: parsed.draftResponse as string,
      ballparkRange: (parsed.ballparkRange as string) ?? "",
      ballparkNote: (parsed.ballparkNote as string) ?? "",
      rangeConfidence: confidence,
      rangeConfidenceScore: Number.isFinite(confidenceScore) ? Math.max(0, Math.min(100, Math.round(confidenceScore))) : 0,
      rangeConfidenceReason: (parsed.rangeConfidenceReason as string) ?? "A site visit is needed to confirm the work area and conditions.",
      rangeRiskFactors: Array.isArray(parsed.rangeRiskFactors) ? parsed.rangeRiskFactors.filter((factor: unknown): factor is string => typeof factor === "string") : [],
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
      rangeConfidence: "low",
      rangeConfidenceScore: 0,
      rangeConfidenceReason: "AI qualification was unavailable, so the preliminary range needs a site visit before it can be relied on.",
      rangeRiskFactors: ["Site conditions and the full work boundary need to be confirmed."],
    };
  }
}

function stripCodeFence(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}
