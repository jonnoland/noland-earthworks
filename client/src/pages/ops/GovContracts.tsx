/**
 * GovContracts — Federal contract opportunity feed for Noland Earthworks.
 * Pulls active solicitations from SAM.gov filtered to land clearing / forestry
 * mulching NAICS codes within ~150 miles of Vanleer, TN.
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Clock,
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Landmark,
} from "lucide-react";

// ── NAICS reference labels ────────────────────────────────────────────────────
const NAICS_LABELS: Record<string, string> = {
  "115310": "Support Activities for Forestry",
  "561730": "Landscaping Services",
  "238910": "Site Preparation Contractors",
  "562910": "Remediation Services",
  "237990": "Other Heavy Civil Engineering",
  "333120": "Construction Machinery Mfg",
};

// ── State portal links ────────────────────────────────────────────────────────
const STATE_PORTALS = [
  {
    name: "Tennessee eProcurement",
    url: "https://www.tn.gov/generalservices/procurement/central-procurement-office/cpo-solicitations.html",
    note: "State of TN solicitations — search 'land clearing' or 'forestry'",
  },
  {
    name: "TN Dept. of Transportation",
    url: "https://www.tn.gov/tdot/business-with-tdot/contracts-and-letting.html",
    note: "TDOT right-of-way and vegetation management contracts",
  },
  {
    name: "TN Dept. of Environment & Conservation",
    url: "https://www.tn.gov/environment/about-tdec/tdec-procurement.html",
    note: "TDEC land management and remediation solicitations",
  },
  {
    name: "Kentucky eProcurement",
    url: "https://eprocurement.ky.gov/",
    note: "KY state and county solicitations",
  },
  {
    name: "Alabama Procurement",
    url: "https://vendor.staars.alabama.gov/",
    note: "AL state solicitations — land clearing and site prep",
  },
  {
    name: "USACE Huntsville District",
    url: "https://www.sah.usace.army.mil/Missions/Contracting/",
    note: "Army Corps of Engineers — TN/AL/MS region contracts",
  },
  {
    name: "TVA Procurement",
    url: "https://www.tva.com/about-tva/procurement",
    note: "Tennessee Valley Authority — vegetation management and ROW",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function DeadlineBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-muted-foreground">No deadline listed</span>;
  if (days < 0) return <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500">Expired</Badge>;
  if (days <= 3) return <Badge className="text-xs bg-red-600 text-white">{days}d left — Urgent</Badge>;
  if (days <= 7) return <Badge className="text-xs bg-amber-600 text-white">{days}d left</Badge>;
  if (days <= 14) return <Badge className="text-xs bg-yellow-700 text-white">{days}d left</Badge>;
  return <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-300">{days}d left</Badge>;
}

function NaicsBadge({ code }: { code: string }) {
  const label = NAICS_LABELS[code];
  return (
    <span
      className="inline-block text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400"
      title={label ?? code}
    >
      {code}{label ? ` — ${label}` : ""}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GovContracts() {
  const [naicsFilter, setNaicsFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching, refetch } = trpc.govContracts.search.useQuery(
    { naicsFilter, stateFilter, page },
    {
      retry: 1,
      staleTime: 5 * 60 * 1000, // cache for 5 minutes
    }
  );

  const opportunities = data?.opportunities ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const stateCounts = (data?.stateCounts ?? {}) as Record<string, number>;
  const naicsCounts = (data?.naicsCounts ?? {}) as Record<string, number>;

  const handleFilterChange = () => {
    setPage(0);
  };

  return (
    <DashboardLayout
      title="Government Contracts"
      subtitle="Active federal solicitations relevant to land clearing and forestry mulching"
    >
      <div className="space-y-6">

        {/* ── Header bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">
                Live feed from{" "}
                <a
                  href="https://sam.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:underline"
                >
                  SAM.gov
                </a>
                {" "}— filtered to TN and nearby states within ~150 miles of Vanleer.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-zinc-700 text-zinc-300 hover:text-white shrink-0"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin mr-1.5" : "mr-1.5"} />
            Refresh
          </Button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">NAICS:</span>
            <Select
              value={naicsFilter}
              onValueChange={(v) => { setNaicsFilter(v); handleFilterChange(); }}
            >
              <SelectTrigger className="h-8 w-[240px] text-xs border-zinc-700 bg-zinc-900">
                <SelectValue placeholder="All NAICS codes" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-xs">All NAICS codes</SelectItem>
                {Object.entries(NAICS_LABELS).map(([code, label]) => (
                  <SelectItem key={code} value={code} className="text-xs">
                    {code} — {label}
                    {naicsCounts[code] ? ` (${naicsCounts[code]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">State:</span>
            <Select
              value={stateFilter}
              onValueChange={(v) => { setStateFilter(v); handleFilterChange(); }}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs border-zinc-700 bg-zinc-900">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all" className="text-xs">All states</SelectItem>
                {Object.entries(stateCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([code, count]) => (
                    <SelectItem key={code} value={code} className="text-xs">
                      {code} ({count})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {!isLoading && (
            <span className="text-xs text-muted-foreground ml-auto">
              {totalCount} opportunit{totalCount === 1 ? "y" : "ies"} found
            </span>
          )}
        </div>

        {/* ── Error state ── */}
        {(data as any)?.error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-sm">
            <AlertTriangle size={15} className="shrink-0" />
            <span>SAM.gov is temporarily unavailable: {String((data as any).error)}. Try refreshing in a moment.</span>
          </div>
        )}

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-zinc-800 rounded w-1/2 mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 bg-zinc-800 rounded w-20" />
                  <div className="h-5 bg-zinc-800 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && !data?.error && opportunities.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Landmark size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No active opportunities found for the selected filters.</p>
            <p className="text-xs mt-1">Try broadening the NAICS or state filter, or check back later.</p>
          </div>
        )}

        {/* ── Opportunity cards ── */}
        {!isLoading && opportunities.length > 0 && (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className={`rounded-lg border bg-zinc-900/60 p-4 transition-colors hover:bg-zinc-900 ${
                  opp.isUrgent
                    ? "border-amber-700/60"
                    : opp.isExpired
                    ? "border-zinc-800 opacity-60"
                    : "border-zinc-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white leading-snug">{opp.title}</h3>
                    {opp.solicitationNumber && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">Sol. #{opp.solicitationNumber}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <DeadlineBadge days={opp.daysUntilDeadline} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="shrink-0" />
                    {opp.agency}
                  </span>
                  {(opp.state || opp.city) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      {[opp.city, opp.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {opp.postedDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="shrink-0" />
                      Posted {opp.postedDate}
                    </span>
                  )}
                  {opp.responseDeadline && (
                    <span>
                      Deadline: {opp.responseDeadline}
                    </span>
                  )}
                  {opp.type && (
                    <span className="text-zinc-500">{opp.type}</span>
                  )}
                  {opp.setAside && (
                    <span className="text-amber-600 font-medium">{opp.setAside}</span>
                  )}
                </div>

                {/* NAICS codes */}
                {opp.naics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {opp.naics.map(n => (
                      <NaicsBadge key={n.code} code={n.code} />
                    ))}
                  </div>
                )}

                {/* Contact info */}
                {(opp.contactName || opp.contactEmail || opp.contactPhone) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 mb-3">
                    {opp.contactName && <span>{opp.contactName}</span>}
                    {opp.contactEmail && (
                      <a href={`mailto:${opp.contactEmail}`} className="flex items-center gap-1 hover:text-amber-400">
                        <Mail size={10} />
                        {opp.contactEmail}
                      </a>
                    )}
                    {opp.contactPhone && (
                      <span className="flex items-center gap-1">
                        <Phone size={10} />
                        {opp.contactPhone}
                      </span>
                    )}
                  </div>
                )}

                <a
                  href={opp.samLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-medium"
                >
                  View on SAM.gov
                  <ExternalLink size={11} />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="border-zinc-700 text-zinc-300"
            >
              <ChevronLeft size={14} className="mr-1" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="border-zinc-700 text-zinc-300"
            >
              Next
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ── State & Municipal Portals ── */}
        <div className="pt-4 border-t border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            State &amp; Municipal Portals
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            State and county contracts are not on SAM.gov. Check these portals directly for
            TN eProcurement, TDOT right-of-way work, and TVA vegetation management contracts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STATE_PORTALS.map(portal => (
              <a
                key={portal.name}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{portal.name}</span>
                  <ExternalLink size={12} className="text-zinc-500 shrink-0" />
                </div>
                <span className="text-xs text-zinc-500">{portal.note}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── SAM.gov registration note ── */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-xs text-zinc-400 space-y-1">
          <p className="font-medium text-zinc-300">SAM.gov Registration</p>
          <p>
            To bid on federal contracts you must have an active SAM.gov registration (free) and a CAGE code.
            Registration takes 1–3 business days. Your NAICS codes to register:{" "}
            <span className="text-zinc-300">115310, 238910, 561730</span>.
          </p>
          <a
            href="https://sam.gov/content/entity-registration"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-amber-500 hover:text-amber-400 font-medium mt-1"
          >
            Register on SAM.gov
            <ExternalLink size={10} />
          </a>
        </div>

      </div>
    </DashboardLayout>
  );
}
