/**
 * Ops Invoices page — live Jobber invoice data
 * Calls trpc.jobber.invoices to fetch invoices from Jobber CRM.
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
  DollarSign,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  TrendingDown,
} from "lucide-react";

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
  VIEWED: "bg-purple-500/15 text-purple-400",
  PARTIAL: "bg-yellow-500/15 text-yellow-400",
  PAID: "bg-green-500/15 text-green-400",
  OVERDUE: "bg-red-500/15 text-red-400",
  BAD_DEBT: "bg-red-500/20 text-red-500",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-secondary/50 text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
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
        Connect your Jobber account to view live invoice data from your CRM.
      </p>
      <Link href="/ops/settings">
        <Button variant="default" size="sm" className="mt-2">
          Connect Jobber in Settings
        </Button>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsInvoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.invoices.useQuery({ first: 100 }, { retry: false });

  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: Array<{
    id: string;
    invoiceNumber?: number | null;
    invoiceStatus?: string | null;
    dueDate?: string | null;
    issuedDate?: string | null;
    createdAt?: string | null;
    subject?: string | null;
    amounts?: {
      subtotal?: number | null;
      total?: number | null;
      outstanding?: number | null;
    } | null;
    client?: { id?: string; name?: string | null; companyName?: string | null } | null;
  }> = (data as any)?.nodes ?? [];

  const statuses = ["ALL", ...Array.from(new Set(nodes.map((i) => i.invoiceStatus ?? "DRAFT")))];

  const filtered = nodes.filter((inv) => {
    const matchStatus = statusFilter === "ALL" || inv.invoiceStatus === statusFilter;
    const qStr = search.toLowerCase();
    const matchSearch =
      !qStr ||
      (inv.client?.name ?? "").toLowerCase().includes(qStr) ||
      (inv.client?.companyName ?? "").toLowerCase().includes(qStr) ||
      String(inv.invoiceNumber ?? "").includes(qStr) ||
      (inv.subject ?? "").toLowerCase().includes(qStr);
    return matchStatus && matchSearch;
  });

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  // KPI summaries
  const totalOutstanding = nodes
    .filter((i) => i.invoiceStatus !== "PAID")
    .reduce((sum, i) => sum + (i.amounts?.outstanding ?? 0), 0);
  const overdueCount = nodes.filter((i) => i.invoiceStatus === "OVERDUE").length;

  return (
    <DashboardLayout title="Invoices" subtitle="Live from Jobber CRM">
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">All Invoices</h2>
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
                placeholder="Search invoices..."
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

        {/* KPI summary cards (only when connected) */}
        {!isLoading && !notConnected && nodes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Outstanding</p>
              <p className="text-lg font-bold text-foreground mt-1">{formatMoney(totalOutstanding)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Overdue</p>
              <p className={`text-lg font-bold mt-1 ${overdueCount > 0 ? "text-red-400" : "text-foreground"}`}>
                {overdueCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 col-span-2 sm:col-span-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Invoices</p>
              <p className="text-lg font-bold text-foreground mt-1">{totalCount}</p>
            </div>
          </div>
        )}

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
                <DollarSign className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search || statusFilter !== "ALL"
                    ? "No invoices match your filters."
                    : "No invoices found in Jobber."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Invoice #</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Outstanding</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv, idx) => {
                        const isOverdue = inv.invoiceStatus === "OVERDUE";
                        return (
                          <tr
                            key={inv.id}
                            className={`border-b border-border last:border-0 hover:bg-secondary/20 transition-colors ${
                              idx % 2 === 0 ? "" : "bg-secondary/5"
                            } ${isOverdue ? "border-l-2 border-l-red-500/50" : ""}`}
                          >
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              #{inv.invoiceNumber ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-foreground font-medium hidden sm:table-cell">
                              {inv.client?.name || inv.client?.companyName || "—"}
                            </td>
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <span className="font-medium text-foreground">
                                {formatMoney(inv.amounts?.total)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right hidden lg:table-cell">
                              {(inv.amounts?.outstanding ?? 0) > 0 ? (
                                <div className="flex items-center justify-end gap-1 text-red-400">
                                  <TrendingDown className="w-3 h-3" />
                                  {formatMoney(inv.amounts?.outstanding)}
                                </div>
                              ) : (
                                <span className="text-green-500">Paid</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={inv.invoiceStatus ?? "DRAFT"} />
                            </td>
                            <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                              {formatDate(inv.dueDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Jobber link */}
            <div className="flex justify-end">
              <a
                href="https://app.getjobber.com/invoices"
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
    </DashboardLayout>
  );
}
