/**
 * Ops Quotes page — live Jobber quote data
 * Calls trpc.jobber.quotes to fetch quotes from Jobber CRM.
 * Shows a "Connect Jobber" banner when not connected.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(val: number | null | undefined): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(val);
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-secondary/50 text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-400",
  CHANGES_REQUESTED: "bg-yellow-500/15 text-yellow-400",
  APPROVED: "bg-green-500/15 text-green-400",
  CONVERTED: "bg-primary/15 text-primary",
  ARCHIVED: "bg-secondary/50 text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-secondary/50 text-muted-foreground";
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Not-connected banner ─────────────────────────────────────────────────────

function NotConnectedBanner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
        <AlertCircle className="w-7 h-7 text-yellow-500" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">Jobber Not Connected</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Connect your Jobber account to view live quote data from your CRM.
      </p>
      <Link href="/ops/settings">
        <Button variant="default" size="sm" className="mt-2">
          Connect Jobber in Settings
        </Button>
      </Link>
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteQuoteModal({
  quote,
  onConfirm,
  onCancel,
  isPending,
}: {
  quote: { id: string; quoteNumber?: number | null; title?: string | null; client?: { name?: string | null; companyName?: string | null } | null };
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const label = quote.title || `Quote #${quote.quoteNumber ?? ""}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Delete Quote</h3>
        <p className="text-xs text-muted-foreground">
          Permanently delete <span className="font-medium text-foreground">{label}</span> from Jobber. This cannot be undone.
        </p>
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-red-400">The following will also be deleted in Jobber:</p>
          <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
            <li>All line items and pricing details</li>
            <li>Quote approval history and client communications</li>
          </ul>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            Delete from Jobber
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsQuotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    quoteNumber?: number | null;
    title?: string | null;
    client?: { name?: string | null; companyName?: string | null } | null;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.quotes.useQuery({ first: 100 }, { retry: false });

  const deleteQuote = trpc.jobber.deleteQuote.useMutation({
    onSuccess: () => {
      toast.success("Quote deleted from Jobber.");
      utils.jobber.quotes.invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete quote.");
      setDeleteTarget(null);
    },
  });

  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: Array<{
    id: string;
    quoteNumber?: number | null;
    title?: string | null;
    quoteStatus?: string | null;
    createdAt?: string | null;
    amounts?: { subtotal?: number | null; total?: number | null } | null;
    client?: { id?: string; name?: string | null; companyName?: string | null } | null;
    property?: { address?: { street1?: string | null; city?: string | null } | null } | null;
  }> = (data as any)?.nodes ?? [];

  const statuses = ["ALL", ...Array.from(new Set(nodes.map((q) => q.quoteStatus ?? "DRAFT")))];

  const filtered = nodes.filter((q) => {
    const matchStatus = statusFilter === "ALL" || q.quoteStatus === statusFilter;
    const qStr = search.toLowerCase();
    const matchSearch =
      !qStr ||
      (q.title ?? "").toLowerCase().includes(qStr) ||
      (q.client?.name ?? "").toLowerCase().includes(qStr) ||
      (q.client?.companyName ?? "").toLowerCase().includes(qStr) ||
      String(q.quoteNumber ?? "").includes(qStr);
    return matchStatus && matchSearch;
  });

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  return (
    <DashboardLayout title="Quotes" subtitle="Live from Jobber CRM">
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">All Quotes</h2>
            {!isLoading && !notConnected && (
              <Badge variant="secondary" className="text-xs">
                {totalCount} total
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-secondary/30 border-border"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Status filter tabs */}
        {!isLoading && !notConnected && statuses.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                }`}
              >
                {s === "ALL" ? "All" : s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not connected */}
        {!isLoading && notConnected && <NotConnectedBanner />}

        {/* Table */}
        {!isLoading && !notConnected && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <FileText className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search || statusFilter !== "ALL"
                    ? "No quotes match your filters."
                    : "No quotes found in Jobber."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Quote #</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Total</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((quote, idx) => (
                        <tr
                          key={quote.id}
                          className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${
                            idx % 2 === 0 ? "" : "bg-secondary/5"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            #{quote.quoteNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                            {quote.title || "Untitled Quote"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {quote.client?.name || quote.client?.companyName || "—"}
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            <div className="flex items-center justify-end gap-1 text-foreground font-medium">
                              <DollarSign className="w-3 h-3 text-green-500" />
                              {formatMoney(quote.amounts?.total)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={quote.quoteStatus ?? "DRAFT"} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            {formatDate(quote.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`https://app.getjobber.com/quotes/${quote.id.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Jobber"
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Jobber
                              </a>
                              <button
                                onClick={() => setDeleteTarget(quote)}
                                title="Delete quote"
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jobber link */}
            <div className="flex justify-end">
              <a
                href="https://app.getjobber.com/quotes"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open in Jobber
              </a>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteQuoteModal
          quote={deleteTarget}
          onConfirm={() => deleteQuote.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteQuote.isPending}
        />
      )}
    </DashboardLayout>
  );
}
