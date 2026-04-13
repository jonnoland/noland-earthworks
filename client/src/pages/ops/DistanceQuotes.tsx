/**
 * /ops/distance-quotes — Distance Quotes list
 * Lists all formal quotes saved from the Distance Pricing Adjustment tool.
 * Supports status management (draft → sent → accepted/declined/expired) and delete.
 */

import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import {
  FileText, Trash2, ChevronDown, MapPin,
  Clock, CheckCircle, XCircle, AlertTriangle, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-blue-900/40 text-blue-300",
  accepted: "bg-green-900/40 text-green-400",
  declined: "bg-red-900/40 text-red-400",
  expired: "bg-yellow-900/40 text-yellow-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  sent: <Clock className="w-3 h-3" />,
  accepted: <CheckCircle className="w-3 h-3" />,
  declined: <XCircle className="w-3 h-3" />,
  expired: <AlertTriangle className="w-3 h-3" />,
};

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsDistanceQuotes() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: quotes = [], isLoading, refetch } = trpc.ops.distanceQuotes.list.useQuery();
  const updateStatus = trpc.ops.distanceQuotes.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });
  const deleteQuote = trpc.ops.distanceQuotes.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Quote deleted."); setDeleteConfirmId(null); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = filterStatus === "all"
    ? quotes
    : quotes.filter(q => q.status === filterStatus);

  const counts = {
    all: quotes.length,
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    accepted: quotes.filter(q => q.status === "accepted").length,
    declined: quotes.filter(q => q.status === "declined").length,
    expired: quotes.filter(q => q.status === "expired").length,
  };

  const totalAcceptedCents = quotes
    .filter(q => q.status === "accepted")
    .reduce((sum, q) => sum + q.adjustedJobTotalCents, 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Distance Quotes</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Formal quotes saved from the{" "}
              <Link href="/ops/pricing" className="text-primary underline hover:text-primary/80 transition-colors">
                Distance Pricing tool
              </Link>
            </p>
          </div>
          <Link href="/ops/pricing">
            <button className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-all">
              <Plus className="w-3.5 h-3.5" />
              New Quote
            </button>
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Quotes", value: counts.all, color: "text-foreground" },
            { label: "Sent", value: counts.sent, color: "text-blue-400" },
            { label: "Accepted", value: counts.accepted, color: "text-green-400" },
            { label: "Accepted Value", value: fmt(totalAcceptedCents), color: "text-primary" },
          ].map((card, i) => (
            <div key={i} className="ops-card p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{card.label}</div>
              <div className={cn("text-xl font-bold", card.color)}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {(["all", "draft", "sent", "accepted", "declined", "expired"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all",
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
              <span className="text-[10px] opacity-70">
                {s === "all" ? counts.all : counts[s as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Quotes list */}
        {isLoading ? (
          <div className="ops-card p-8 text-center text-sm text-muted-foreground">Loading quotes...</div>
        ) : filtered.length === 0 ? (
          <div className="ops-card p-10 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filterStatus === "all"
                ? "No distance quotes saved yet. Run a distance calculation on the Pricing page and click Save as Quote."
                : `No ${STATUS_LABELS[filterStatus].toLowerCase()} quotes.`}
            </p>
            <Link href="/ops/pricing">
              <button className="mt-4 flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-all mx-auto">
                <Plus className="w-3.5 h-3.5" />
                Go to Pricing Tool
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(quote => (
              <div key={quote.id} className="ops-card overflow-hidden">
                {/* Row header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === quote.id ? null : quote.id)}
                >
                  <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0", STATUS_COLORS[quote.status])}>
                    {STATUS_ICONS[quote.status]}
                    {STATUS_LABELS[quote.status]}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{quote.clientName}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{quote.jobAddress}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-sm font-bold text-primary">{fmt(quote.adjustedJobTotalCents)}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDate(quote.createdAt)}</div>
                  </div>

                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", expandedId === quote.id ? "rotate-180" : "")} />
                </div>

                {/* Expanded detail */}
                {expandedId === quote.id && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Job Type", value: quote.jobType },
                        { label: "Acres", value: quote.jobAcres ?? "—" },
                        { label: "Crew Days", value: quote.crewDaysNeeded },
                        { label: "Distance", value: `${quote.distanceMiles} mi${quote.driveDuration ? ` (${quote.driveDuration})` : ""}` },
                        { label: "Base Day Rate", value: fmt(quote.baseDayRateCents) },
                        { label: "Mob Surcharge", value: quote.mobSurchargeCents === 0 ? "None" : `+${fmt(quote.mobSurchargeCents)}/day` },
                        { label: "Adjusted Day Rate", value: fmt(quote.adjustedDayRateCents) },
                        { label: "Price / Acre", value: fmt(quote.pricePerAcreCents) },
                      ].map((item, i) => (
                        <div key={i} className="bg-secondary/40 rounded-md p-2.5">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{item.label}</div>
                          <div className="text-xs font-semibold text-foreground">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {(quote.clientPhone || quote.clientEmail) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {quote.clientPhone && <span>Phone: <span className="text-foreground">{quote.clientPhone}</span></span>}
                        {quote.clientEmail && <span>Email: <span className="text-foreground">{quote.clientEmail}</span></span>}
                      </div>
                    )}

                    {quote.notes && (
                      <div className="bg-secondary/30 rounded-md p-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Notes: </span>{quote.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status change dropdown */}
                      <div className="relative group">
                        <button className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/70 text-xs font-medium px-3 py-1.5 rounded-md transition-all text-foreground">
                          Update Status <ChevronDown className="w-3 h-3" />
                        </button>
                        <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-10 min-w-[140px] hidden group-hover:block">
                          {(["draft", "sent", "accepted", "declined", "expired"] as const)
                            .filter(s => s !== quote.status)
                            .map(s => (
                              <button
                                key={s}
                                onClick={() => updateStatus.mutate({ id: quote.id, status: s })}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-foreground first:rounded-t-lg last:rounded-b-lg"
                              >
                                {STATUS_ICONS[s]}
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Delete */}
                      {deleteConfirmId === quote.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400">Delete this quote?</span>
                          <button
                            onClick={() => deleteQuote.mutate({ id: quote.id })}
                            className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md transition-all"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(quote.id)}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}

                      <span className="ml-auto text-[11px] text-muted-foreground">
                        Created {fmtDate(quote.createdAt)}
                        {quote.sentAt ? ` · Sent ${fmtDate(quote.sentAt)}` : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
