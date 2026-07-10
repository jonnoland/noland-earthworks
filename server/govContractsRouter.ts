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
});
