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
import * as cheerio from "cheerio";

/**
 * Fetch a SAM.gov opportunity page and extract the scope of work / description text.
 * SAM.gov renders content server-side so a plain fetch is sufficient.
 */
async function fetchSamOpportunityScope(samLink: string): Promise<string> {
  try {
    const res = await fetch(samLink, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[GovContracts] SAM.gov page fetch returned ${res.status} for ${samLink}`);
      return "";
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove script/style noise
    $("script, style, nav, header, footer").remove();

    // SAM.gov opportunity pages render key content in these selectors
    const scopeSelectors = [
      "[class*='description']",
      "[class*='Description']",
      "[class*='statement-of-work']",
      "[class*='scope']",
      "[class*='Scope']",
      "[id*='description']",
      "[id*='scope']",
      ".opportunity-description",
      ".opp-description",
      "sam-opportunity-description",
      "[data-testid*='description']",
    ];

    let scopeText = "";
    for (const sel of scopeSelectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 100) {
        scopeText = el.text().trim();
        break;
      }
    }

    // Fallback: grab the largest text block on the page
    if (!scopeText) {
      let bestLen = 0;
      $("p, div, section").each((_, el) => {
        const text = $(el).clone().children().remove().end().text().trim();
        if (text.length > bestLen && text.length < 8000) {
          bestLen = text.length;
          scopeText = text;
        }
      });
    }

    // Trim to 3000 chars to keep prompts manageable
    return scopeText.slice(0, 3000);
  } catch (err) {
    console.warn("[GovContracts] Failed to fetch SAM.gov opportunity page:", (err as Error).message?.slice(0, 120));
    return "";
  }
}

const SAM_SEARCH_URL = "https://sam.gov/api/prod/sgs/v1/search/";

// Vanleer, TN coordinates (37181)
const VANLEER_LAT = 36.2534;
const VANLEER_LNG = -87.5334;
const MAX_RADIUS_MILES = 150;

// Approximate lat/lng for major TN cities and nearby cities used in SAM.gov place-of-performance
// Used to estimate distance when only city+state is available
const CITY_COORDS: Record<string, [number, number]> = {
  // Tennessee
  "nashville": [36.1627, -86.7816],
  "memphis": [35.1495, -90.0490],
  "knoxville": [35.9606, -83.9207],
  "chattanooga": [35.0456, -85.3097],
  "clarksville": [36.5298, -87.3595],
  "murfreesboro": [35.8456, -86.3903],
  "franklin": [35.9251, -86.8689],
  "jackson": [35.6145, -88.8139],
  "johnson city": [36.3134, -82.3535],
  "bartlett": [35.2045, -89.8742],
  "hendersonville": [36.3048, -86.6200],
  "kingsport": [36.5484, -82.5618],
  "collierville": [35.0420, -89.6645],
  "smyrna": [35.9826, -86.5186],
  "columbia": [35.6151, -87.0353],
  "spring hill": [35.7512, -86.9300],
  "brentwood": [36.0331, -86.7828],
  "germantown": [35.0870, -89.8101],
  "cookeville": [36.1628, -85.5016],
  "gallatin": [36.3884, -86.4469],
  "lebanon": [36.2081, -86.2911],
  "dickson": [36.0773, -87.3878],
  "lawrenceburg": [35.2423, -87.3317],
  "shelbyville": [35.4834, -86.4603],
  "tullahoma": [35.3620, -86.2094],
  "dyersburg": [36.0345, -89.3845],
  "paris": [36.3020, -88.3267],
  "union city": [36.4242, -89.0570],
  "martin": [36.3431, -88.8512],
  "morristown": [36.2134, -83.2952],
  "bristol": [36.5951, -82.1882],
  "maryville": [35.7565, -83.9710],
  "cleveland": [35.1595, -84.8766],
  "athens": [35.4428, -84.5930],
  "mcminnville": [35.6834, -85.7697],
  "pulaski": [35.2001, -87.0317],
  "fayetteville": [35.1517, -86.5672],
  "winchester": [35.1859, -86.1119],
  "lewisburg": [35.4487, -86.7886],
  "linden": [35.6148, -87.8417],
  "waverly": [36.0837, -87.7964],
  "camden": [36.0584, -88.0995],
  "huntingdon": [36.0001, -88.4270],
  "centerville": [35.7784, -87.4664],
  "charlotte": [36.1773, -87.3394],
  "dover": [36.4851, -87.8336],
  "erin": [36.3187, -87.6953],
  "hohenwald": [35.5487, -87.5511],
  "waynesboro": [35.3187, -87.7614],
  "savannah": [35.2270, -88.2503],
  "selmer": [35.1701, -88.5945],
  "bolivar": [35.2548, -88.9995],
  "henderson": [35.4384, -88.6417],
  "lexington": [35.6512, -88.3928],
  "trenton": [35.9812, -88.9417],
  "humboldt": [35.8212, -88.9120],
  "milan": [35.9198, -88.7584],
  "vanleer": [36.2534, -87.5334],
  "ashland city": [36.2812, -87.0636],
  "springfield": [36.5087, -86.8850],
  "white house": [36.4712, -86.6528],
  "portland": [36.5812, -86.5128],
  "goodlettsville": [36.3226, -86.7136],
  "la vergne": [36.0151, -86.5811],
  "mount juliet": [36.2001, -86.5189],
  "crossville": [35.9487, -85.0269],
  "livingston": [36.3812, -85.3228],
  "sparta": [35.9262, -85.4647],
  // Nearby out-of-state cities within 150 miles
  "hopkinsville": [36.8656, -87.4886],  // KY ~90mi
  "bowling green": [36.9903, -86.4436], // KY ~120mi
  "paducah": [37.0834, -88.5998],       // KY ~130mi
  "huntsville": [34.7304, -86.5861],    // AL ~140mi
  "muscle shoals": [34.7448, -87.6677], // AL ~100mi
  "florence": [34.7998, -87.6773],      // AL ~100mi
  "decatur": [34.6059, -86.9833],       // AL ~120mi
  "corinth": [34.9343, -88.5223],       // MS ~130mi
};

/**
 * Haversine distance in miles between two lat/lng points.
 */
function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns true if the opportunity's place of performance is within 150 miles of Vanleer, TN.
 * Strategy:
 *   1. Must be in TN (or no state specified — defaults to include).
 *   2. If a city is listed, check its approximate coordinates against the 150-mile radius.
 *   3. If only state=TN and no city, include it (all of TN fits within 150 miles of Vanleer).
 */
function isWithin150MilesOfVanleer(result: SamResult): boolean {
  const pops = result.placeOfPerformance ?? [];

  // No place of performance listed — include (could be TN)
  if (!pops.length || pops.every(p => !p.state?.code)) return true;

  return pops.some(pop => {
    const stateCode = pop.state?.code?.toUpperCase();

    // Must be TN
    if (stateCode && stateCode !== "TN") {
      // Allow nearby out-of-state cities that are within 150 miles
      const cityKey = pop.city?.name?.toLowerCase().trim() ?? "";
      const coords = CITY_COORDS[cityKey];
      if (!coords) return false;
      return haversineDistanceMiles(VANLEER_LAT, VANLEER_LNG, coords[0], coords[1]) <= MAX_RADIUS_MILES;
    }

    // State is TN — check city distance if available
    const cityKey = pop.city?.name?.toLowerCase().trim() ?? "";
    if (cityKey && CITY_COORDS[cityKey]) {
      const [lat, lng] = CITY_COORDS[cityKey];
      return haversineDistanceMiles(VANLEER_LAT, VANLEER_LNG, lat, lng) <= MAX_RADIUS_MILES;
    }

    // TN with no recognizable city — include (all TN is within 150 miles)
    return stateCode === "TN";
  });
}

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

// Legacy alias kept for any remaining references
const isNearbyState = isWithin150MilesOfVanleer;

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

        // Filter: must be relevant by keyword OR by NAICS code, and not expired/canceled
        const now = new Date();
        let filtered = allResults.filter(r => {
          if (r.isCanceled) return false;
          // Drop expired — response deadline is in the past
          if (r.responseDate) {
            const deadline = new Date(r.responseDate);
            if (deadline < now) return false;
          }
          return isRelevantByKeyword(r.title) || hasRelevantNaics(r);
        });

        // Apply NAICS filter if specified
        if (input.naicsFilter && input.naicsFilter !== "all") {
          filtered = filtered.filter(r =>
            (r.naics ?? []).some(n => n.code === input.naicsFilter)
          );
        }

        // Always apply 150-mile Vanleer radius filter (TN-focused)
        filtered = filtered.filter(isWithin150MilesOfVanleer);

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

      // Fetch the actual scope of work from the SAM.gov opportunity page
      const scopeOfWork = await fetchSamOpportunityScope(input.samLink);
      const scopeContext = scopeOfWork
        ? `\n\nACTUAL SCOPE OF WORK (extracted from SAM.gov opportunity page):\n${scopeOfWork}`
        : "";

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
2. Describes our specific capability for this solicitation — if scope of work is provided below, reference the specific tasks described
3. Closes with our veteran status, reliability, and contact info

Keep it under 250 words. Do not use bullet points. Do not use phrases like 'industry-leading', 'passionate about', 'dedicated team', or 'cutting-edge'.${scopeContext}`;

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

Tone: direct, professional, no fluff. Mention veteran-owned status once. Do not use buzzwords.${scopeContext}`;

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
- If the scope of work below specifies acreage, number of acres, or specific quantities — use those exact numbers in your line items.${scopeContext}

Generate a COMPLETED pricing worksheet with specific dollar amounts filled in. Use your knowledge of current federal contract rates for this type of work in this region. If actual scope details are provided above, use them to set accurate quantities. Include:
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
