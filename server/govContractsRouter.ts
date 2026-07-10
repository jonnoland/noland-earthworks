/**
 * govContractsRouter.ts
 * Fetches active federal contract opportunities from SAM.gov's public search API.
 * No API key required — uses the same public endpoint the SAM.gov website uses.
 *
 * Target NAICS codes for Noland Earthworks:
 *   115310 — Support Activities for Forestry (primary)
 *   561730 — Landscaping Services
 *   238910 — Site Preparation Contractors
 *   562910 — Remediation Services
 *   237990 — Other Heavy and Civil Engineering Construction
 *
 * Geography: TN + bordering states within ~150 miles of Vanleer, TN (37181):
 *   TN, KY, AL, MS, AR, VA, NC, GA, MO
 */

import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { businessSettings } from "../drizzle/schema";

const SAM_SEARCH_URL = "https://sam.gov/api/prod/sgs/v1/search/";

// States within ~150 miles of Vanleer, TN
const NEARBY_STATES = new Set(["TN", "KY", "AL", "MS", "AR", "VA", "NC", "GA", "MO"]);

// NAICS codes relevant to land clearing / forestry mulching
const TARGET_NAICS = new Set(["115310", "561730", "238910", "562910", "237990", "333120"]);

// Keywords that indicate relevant work
const RELEVANT_KEYWORDS = [
  "land clearing", "brush clearing", "forestry", "mulching", "vegetation",
  "right-of-way", "right of way", "ROW", "site preparation", "site prep",
  "mowing", "brush removal", "tree removal", "clearing", "grubbing",
  "invasive species", "trail clearing", "fence line", "pasture"
];

interface SamResult {
  _id: string;
  title: string;
  type: { code: string; value: string } | null;
  publishDate: string | null;
  responseDate: string | null;
  responseDateActual: string | null;
  naics: Array<{ code: string; value: string }> | null;
  placeOfPerformance: Array<{
    state: { code: string; name: string } | null;
    city: { name: string } | null;
    zip: string | null;
  }> | null;
  organizationHierarchy: Array<{
    name: string;
    level: number;
    type: string;
  }> | null;
  pointOfContacts: Array<{
    fullName: string;
    email: string;
    phone: string;
    type: string;
  }> | null;
  solicitationNumber: string | null;
  isCanceled: boolean;
  solicitation: {
    setAside: { code: string; value: string } | null;
  } | null;
}

interface SamApiResponse {
  _embedded: { results: SamResult[] };
  page: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
}

function buildSamUrl(params: {
  query: string;
  page: number;
  pageSize: number;
}): string {
  const url = new URL(SAM_SEARCH_URL);
  url.searchParams.set("index", "opp");
  url.searchParams.set("q", params.query);
  url.searchParams.set("is_active", "true");
  url.searchParams.set("page", String(params.page));
  url.searchParams.set("pageSize", String(params.pageSize));
  url.searchParams.set("sort", "-publishDate");
  return url.toString();
}

async function fetchSamOpportunities(query: string, page = 0, pageSize = 50): Promise<SamApiResponse> {
  const url = buildSamUrl({ query, page, pageSize });
  const res = await fetch(url, {
    headers: {
      "Accept": "application/hal+json",
      "User-Agent": "Mozilla/5.0 (compatible; NolandEarthworks/1.0)",
    },
  });
  if (!res.ok) {
    throw new Error(`SAM.gov API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<SamApiResponse>;
}

function isRelevantByKeyword(title: string): boolean {
  const lower = title.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function isNearbyState(result: SamResult): boolean {
  const pops = result.placeOfPerformance ?? [];
  // If no place of performance listed, include it (could be TN)
  if (!pops.length || pops.every(p => !p.state?.code)) return true;
  return pops.some(p => p.state?.code && NEARBY_STATES.has(p.state.code.toUpperCase()));
}

function hasRelevantNaics(result: SamResult): boolean {
  const naics = result.naics ?? [];
  if (!naics.length) return false;
  return naics.some(n => TARGET_NAICS.has(n.code));
}

function getDaysUntilDeadline(responseDate: string | null): number | null {
  if (!responseDate) return null;
  const deadline = new Date(responseDate);
  const now = new Date();
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getAgencyName(result: SamResult): string {
  const hierarchy = result.organizationHierarchy ?? [];
  // Level 1 = department, level 2 = sub-tier/agency
  const subTier = hierarchy.find(h => h.level === 2);
  const dept = hierarchy.find(h => h.level === 1);
  return subTier?.name ?? dept?.name ?? "Federal Agency";
}

// ── Company info helper ─────────────────────────────────────────────────────
async function getCompanyInfo() {
  const db = await getDb();
  const rows = db
    ? await db.select().from(businessSettings).limit(1)
    : [];
  const s = rows[0];
  return {
    companyName: s?.companyName ?? "Noland Earthworks, LLC",
    ownerName: "Jon M. Noland",
    phone: s?.phone ?? "(615) 406-4819",
    email: s?.email ?? "jonnoland@nolandearthworks.com",
    address: s?.address ?? "93 Halliburton Road",
    city: s?.city ?? "Vanleer",
    state: s?.state ?? "Tennessee",
    zip: s?.zip ?? "37181",
    website: s?.website ?? "https://www.nolandearthworks.com",
    cageCode: ENV.cageCode || "17VJ2",
    uniqueEntityId: ENV.uniqueEntityId || "G6E8E4SDM2K4",
  };
}

export const govContractsRouter = router({
  /**
   * Search active SAM.gov opportunities relevant to land clearing / forestry mulching.
   * Fetches multiple keyword queries in parallel and deduplicates by _id.
   */
  search: adminProcedure
    .input(z.object({
      naicsFilter: z.string().optional(), // e.g. "115310" or "all"
      stateFilter: z.string().optional(), // e.g. "TN" or "all"
      page: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      try {
        // Run parallel queries for different keyword sets
        const queries = [
          "land clearing forestry mulching vegetation",
          "brush clearing right-of-way mowing",
          "site preparation clearing grubbing",
        ];

        const results = await Promise.allSettled(
          queries.map(q => fetchSamOpportunities(q, 0, 100))
        );

        // Collect all results and deduplicate by _id
        const seen = new Set<string>();
        const allResults: SamResult[] = [];

        for (const r of results) {
          if (r.status === "fulfilled") {
            for (const item of r.value._embedded?.results ?? []) {
              if (!seen.has(item._id) && !item.isCanceled) {
                seen.add(item._id);
                allResults.push(item);
              }
            }
          }
        }

        // Filter: must be relevant by keyword OR by NAICS code
        let filtered = allResults.filter(r =>
          isRelevantByKeyword(r.title) || hasRelevantNaics(r)
        );

        // Apply NAICS filter if specified
        if (input.naicsFilter && input.naicsFilter !== "all") {
          filtered = filtered.filter(r =>
            (r.naics ?? []).some(n => n.code === input.naicsFilter)
          );
        }

        // Apply state filter
        if (input.stateFilter && input.stateFilter !== "all") {
          filtered = filtered.filter(r => {
            const pops = r.placeOfPerformance ?? [];
            return pops.some(p => p.state?.code?.toUpperCase() === input.stateFilter!.toUpperCase());
          });
        } else {
          // Default: only nearby states
          filtered = filtered.filter(isNearbyState);
        }

        // Sort: active deadlines first, then by posted date
        filtered.sort((a, b) => {
          const dA = getDaysUntilDeadline(a.responseDate);
          const dB = getDaysUntilDeadline(b.responseDate);
          // Items with upcoming deadlines first
          if (dA !== null && dB !== null) return dA - dB;
          if (dA !== null) return -1;
          if (dB !== null) return 1;
          // Then by posted date descending
          return (b.publishDate ?? "").localeCompare(a.publishDate ?? "");
        });

        // Paginate
        const pageSize = 20;
        const start = input.page * pageSize;
        const paginated = filtered.slice(start, start + pageSize);

        // Shape the response
        const opportunities = paginated.map(r => {
          const pops = r.placeOfPerformance ?? [];
          const stateCode = pops.find(p => p.state?.code)?.state?.code ?? null;
          const cityName = pops.find(p => p.city?.name)?.city?.name ?? null;
          const daysLeft = getDaysUntilDeadline(r.responseDate);
          const primaryContact = (r.pointOfContacts ?? []).find(c => c.type === "primary");

          return {
            id: r._id,
            title: r.title,
            solicitationNumber: r.solicitationNumber ?? null,
            agency: getAgencyName(r),
            type: r.type?.value ?? "Solicitation",
            naics: (r.naics ?? []).map(n => ({ code: n.code, label: n.value })),
            postedDate: r.publishDate ? r.publishDate.split("T")[0] : null,
            responseDeadline: r.responseDate ? r.responseDate.split("T")[0] : null,
            daysUntilDeadline: daysLeft,
            isUrgent: daysLeft !== null && daysLeft <= 7,
            isExpired: daysLeft !== null && daysLeft < 0,
            state: stateCode,
            city: cityName,
            setAside: r.solicitation?.setAside?.value ?? null,
            contactName: primaryContact?.fullName ?? null,
            contactEmail: primaryContact?.email ?? null,
            contactPhone: primaryContact?.phone ?? null,
            samLink: `https://sam.gov/opp/${r._id}/view`,
          };
        });

        // Count by state for the filter sidebar
        const stateCounts: Record<string, number> = {};
        for (const r of filtered) {
          const pops = r.placeOfPerformance ?? [];
          const code = pops.find(p => p.state?.code)?.state?.code;
          if (code) stateCounts[code] = (stateCounts[code] ?? 0) + 1;
        }

        // Count by NAICS
        const naicsCounts: Record<string, number> = {};
        for (const r of filtered) {
          for (const n of r.naics ?? []) {
            naicsCounts[n.code] = (naicsCounts[n.code] ?? 0) + 1;
          }
        }

        return {
          opportunities,
          totalCount: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize),
          currentPage: input.page,
          stateCounts,
          naicsCounts,
        };
      } catch (err) {
        console.error("[GovContracts] SAM.gov fetch failed:", err);
        return {
          opportunities: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 0,
          stateCounts: {},
          naicsCounts: {},
          error: err instanceof Error ? err.message : "Failed to fetch opportunities",
        };
      }
    }),

  /**
   * Generate a bid preparation package for a specific SAM.gov opportunity.
   * Returns a pre-filled cover sheet, AI-generated capability statement,
   * and a pricing worksheet scaffold.
   */
  bidPrep: adminProcedure
    .input(z.object({
      opportunityId: z.string(),
      title: z.string(),
      agency: z.string(),
      solicitationNumber: z.string().nullable(),
      naics: z.array(z.object({ code: z.string(), label: z.string() })),
      responseDeadline: z.string().nullable(),
      state: z.string().nullable(),
      city: z.string().nullable(),
      setAside: z.string().nullable(),
      contactName: z.string().nullable(),
      contactEmail: z.string().nullable(),
      samLink: z.string(),
    }))
    .mutation(async ({ input }) => {
      const company = await getCompanyInfo();
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });

      // Build AI prompt for capability statement
      const primaryNaics = input.naics[0];
      const naicsLabel = primaryNaics
        ? `${primaryNaics.code} — ${primaryNaics.label}`
        : "Land Clearing / Forestry Services";

      const prompt = `You are writing a federal government contract capability statement for a small veteran-owned business.

Company: ${company.companyName}
Owner: ${company.ownerName} (Veteran, U.S. Army)
Location: ${company.city}, ${company.state}
CAGE Code: ${company.cageCode}
Unique Entity ID: ${company.uniqueEntityId}
Website: ${company.website}

Solicitation: ${input.title}
Agency: ${input.agency}
NAICS: ${naicsLabel}
Place of Performance: ${[input.city, input.state].filter(Boolean).join(", ") || "Tennessee region"}
Set-Aside: ${input.setAside || "None specified"}

Core capabilities:
- Forestry mulching: tracked mulcher grinds brush, saplings, and small trees into mulch left on site. No debris hauling, no burning.
- Land clearing and right-of-way clearing on challenging terrain including slopes and wet ground.
- Site preparation for development, pasture reclamation, fence line clearing, trail cutting.
- Single-operator company — owner performs all work personally, ensuring consistent quality and accountability.
- Veteran-owned and operated. Registered in SAM.gov with active CAGE code.

Write a professional capability statement (3 short paragraphs, plain language, no jargon or buzzwords) that:
1. Opens with who we are and what we do
2. Describes our specific capability for this solicitation
3. Closes with our veteran status, reliability, and contact info

Keep it under 250 words. Do not use bullet points. Do not use phrases like 'industry-leading', 'passionate about', 'dedicated team', or 'cutting-edge'.`;

      let capabilityStatement = "";
      let coverLetter = "";

      try {
        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional government contract writer for a small veteran-owned business. Write in plain, direct language. No corporate jargon." },
            { role: "user", content: prompt },
          ],
        });
        capabilityStatement = (llmResult?.choices?.[0]?.message?.content as string) ?? "";
      } catch (err) {
        console.error("[GovContracts] LLM capability statement failed:", err);
        capabilityStatement = `${company.companyName} is a veteran-owned forestry mulching and land clearing company based in ${company.city}, ${company.state}. Owner-operated by ${company.ownerName}, a U.S. Army veteran. We specialize in forestry mulching, right-of-way clearing, and site preparation using a tracked forestry mulcher capable of handling dense vegetation, steep slopes, and wet ground conditions. CAGE Code: ${company.cageCode}. UEI: ${company.uniqueEntityId}.`;
      }

      // Build cover letter
      try {
        const coverPrompt = `Write a brief, professional cover letter (1 short paragraph, under 80 words) for a federal solicitation response.

To: ${input.contactName || "Contracting Officer"}, ${input.agency}
Solicitation: ${input.solicitationNumber ? `#${input.solicitationNumber} — ` : ""}${input.title}
Deadline: ${input.responseDeadline || "As specified"}
From: ${company.ownerName}, ${company.companyName}

Tone: direct, professional, no fluff. Mention veteran-owned status once. Do not use buzzwords.`;

        const coverResult = await invokeLLM({
          messages: [
            { role: "system", content: "You write concise federal contract cover letters for small businesses. Plain language only." },
            { role: "user", content: coverPrompt },
          ],
        });
        coverLetter = (coverResult?.choices?.[0]?.message?.content as string) ?? "";
      } catch (err) {
        console.error("[GovContracts] LLM cover letter failed:", err);
        coverLetter = `${company.ownerName}\n${company.companyName}\n${company.address}, ${company.city}, ${company.state} ${company.zip}\n${company.phone} | ${company.email}\n\n${today}\n\n${input.contactName || "Contracting Officer"}\n${input.agency}\n\nRe: ${input.solicitationNumber ? `Solicitation #${input.solicitationNumber} — ` : ""}${input.title}\n\nPlease find enclosed our response to the above-referenced solicitation. ${company.companyName} is a veteran-owned and operated forestry mulching company based in ${company.city}, ${company.state}, registered in SAM.gov with CAGE Code ${company.cageCode} and UEI ${company.uniqueEntityId}. We are fully capable of performing the described scope of work and welcome the opportunity to serve ${input.agency}.\n\nRespectfully,\n${company.ownerName}\nOwner/Operator\n${company.companyName}`;
      }

      // Build AI-completed pricing worksheet
      let pricingWorksheet = "";
      try {
        const pricingPrompt = `You are a federal government contract pricing specialist helping a small veteran-owned forestry mulching company bid on a federal solicitation.

Company: ${company.companyName} (single operator, owner-operated, veteran-owned small business)
Equipment: One tracked forestry mulcher — handles dense brush, saplings, small trees, slopes, wet ground
Location: ${company.city}, ${company.state}
CAGE Code: ${company.cageCode}
UEI: ${company.uniqueEntityId}

Solicitation: ${input.title}
Agency: ${input.agency}
NAICS: ${input.naics.map(n => `${n.code} — ${n.label}`).join(", ") || "115310 — Support Activities for Forestry"}
Place of Performance: ${[input.city, input.state].filter(Boolean).join(", ") || "Tennessee region"}
Set-Aside: ${input.setAside || "None specified"}
Deadline: ${input.responseDeadline || "Not specified"}

Pricing context:
- Federal government contracts for forestry mulching / land clearing in Tennessee and surrounding states typically range from $800 to $2,500 per acre depending on terrain, density, and access.
- Mobilization for government contracts in this region typically runs $1,500 to $4,500 depending on distance.
- Site inspection / pre-work assessment is typically $500 to $1,500 as a lump sum.
- Government contracts often have multiple option years — price conservatively for base year, slightly higher for options.
- Veteran-owned small businesses can price 5-15% above the lowest competitive bid and still win on set-aside contracts.
- Maximize profit while remaining competitive: aim for the upper-middle range of market rates, not the lowest.

Generate a COMPLETED pricing worksheet with specific dollar amounts filled in. Use your knowledge of current federal contract rates for this type of work in this region. Include:
1. A header block with solicitation info and vendor credentials
2. 3-4 CLIN line items with specific unit prices, estimated quantities, and calculated totals
3. A total bid price
4. A brief pricing rationale section (2-3 sentences) explaining the basis for the pricing
5. Standard notes section

Format the output as plain text, suitable for copying into a bid response. Use consistent column alignment. Do not use markdown. Fill in all dollar amounts — do not leave blanks.`;

        const pricingResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a federal contract pricing specialist. Generate completed pricing worksheets with specific, competitive dollar amounts. Never leave blanks. Use plain text formatting only." },
            { role: "user", content: pricingPrompt },
          ],
        });
        pricingWorksheet = (pricingResult?.choices?.[0]?.message?.content as string) ?? "";
      } catch (err) {
        console.error("[GovContracts] LLM pricing worksheet failed:", err);
      }

      // Fallback if AI fails
      if (!pricingWorksheet) {
        pricingWorksheet = [
          `PRICING WORKSHEET`,
          `Solicitation: ${input.solicitationNumber ? `#${input.solicitationNumber} — ` : ""}${input.title}`,
          `Agency: ${input.agency}`,
          `Date: ${today}`,
          ``,
          `Vendor: ${company.companyName}`,
          `CAGE Code: ${company.cageCode}`,
          `UEI: ${company.uniqueEntityId}`,
          ``,
          `LINE ITEMS`,
          `────────────────────────────────────────────────────────────`,
          `CLIN 0001  Forestry Mulching / Land Clearing`,
          `           Unit: Acre   Qty: ___   Unit Price: $1,800   Total: $___`,
          ``,
          `CLIN 0002  Mobilization / Demobilization`,
          `           Unit: LS    Qty: 1     Unit Price: $2,500    Total: $2,500`,
          ``,
          `CLIN 0003  Site Inspection / Pre-Work Assessment`,
          `           Unit: LS    Qty: 1     Unit Price: $750      Total: $750`,
          ``,
          `────────────────────────────────────────────────────────────`,
          `TOTAL BID PRICE:  $___________________`,
          ``,
          `PRICING RATIONALE`,
          `Unit pricing reflects current federal contract rates for forestry mulching in Tennessee ($1,500–$2,200/acre).`,
          `Mobilization based on estimated distance from Vanleer, TN to place of performance.`,
          ``,
          `NOTES`,
          `- All prices are firm-fixed-price unless otherwise specified in the solicitation.`,
          `- Pricing includes operator labor, equipment, fuel, and standard consumables.`,
          `- Pricing excludes: stump grinding below grade, grading, hauling, or burning.`,
          `- Site visit required prior to final pricing on complex terrain.`,
          `- Payment terms: Net 30 from invoice date.`,
        ].join("\n");
      }

      return {
        company,
        today,
        opportunity: input,
        coverLetter,
        capabilityStatement,
        pricingWorksheet,
      };
    }),
});
