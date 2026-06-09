/**
 * Ops Invoices page — live Jobber invoice data
 * Calls trpc.jobber.invoices to fetch invoices from Jobber CRM.
 * Clicking a row opens a slide-out detail panel with line items and amounts.
 * Supports per-row delete and bulk delete via checkboxes.
 */
import { useState, useMemo } from "react";
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
  Trash2,
  Loader2,
  X,
  FileText,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  title,
  description,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-red-400">The following will also be deleted in Jobber:</p>
          <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
            <li>All line items and payment records</li>
            <li>Invoice history and client-facing PDF</li>
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

// ─── Invoice Detail Panel ─────────────────────────────────────────────────────

function InvoiceDetailPanel({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) {
  const { data: inv, isLoading } = trpc.jobber.invoiceDetail.useQuery(
    { id: invoiceId },
    { retry: false }
  );
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [followUpEmail, setFollowUpEmail] = useState<string | null>(null);
  const generateFollowUp = trpc.jobber.generateInvoiceFollowUp.useMutation({
    onSuccess: (data) => { setFollowUpDraft(data.draft); setFollowUpEmail(data.clientEmail); },
    onError: (e) => toast.error(e.message || "Failed to generate follow-up."),
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {isLoading ? "Loading..." : inv ? `Invoice #${inv.invoiceNumber}` : "Invoice Detail"}
            </span>
            {inv && <StatusBadge status={inv.invoiceStatus ?? "DRAFT"} />}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !inv && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
              <AlertCircle className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Invoice details not available.</p>
            </div>
          )}

          {!isLoading && inv && (
            <>
              {/* Client */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    {(inv as any).client?.name || (inv as any).client?.companyName || "—"}
                  </p>
                  {(inv as any).client?.phones?.[0]?.number && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {(inv as any).client.phones[0].number}
                    </div>
                  )}
                  {(inv as any).client?.emails?.[0]?.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {(inv as any).client.emails[0].address}
                    </div>
                  )}
                </div>
              </div>

              {/* Property */}
              {(inv as any).property?.address?.street1 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Property</p>
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/20 p-3">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-foreground">
                      {(inv as any).property.address.street1}
                      {(inv as any).property.address.city && `, ${(inv as any).property.address.city}`}
                      {(inv as any).property.address.province && `, ${(inv as any).property.address.province}`}
                      {(inv as any).property.address.postalCode && ` ${(inv as any).property.address.postalCode}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-secondary/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Issued</p>
                  <p className="text-xs font-medium text-foreground">{formatDate((inv as any).issuedDate)}</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Due</p>
                  <p className={cn("text-xs font-medium", (inv as any).invoiceStatus === "OVERDUE" ? "text-red-400" : "text-foreground")}>
                    {formatDate((inv as any).dueDate)}
                  </p>
                </div>
              </div>

              {/* Subject / message */}
              {(inv as any).subject && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</p>
                  <p className="text-xs text-foreground">{(inv as any).subject}</p>
                </div>
              )}
              {(inv as any).message && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Message</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(inv as any).message}</p>
                </div>
              )}

              {/* Line Items */}
              {(inv as any).lineItems?.nodes?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Line Items</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Price</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inv as any).lineItems.nodes.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-foreground">{item.name}</p>
                              {item.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">{item.quantity ?? 1}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">{formatMoney(item.unitPrice)}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-foreground">
                              {formatMoney((item.quantity ?? 1) * (item.unitPrice ?? 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Amounts summary */}
              <div className="rounded-lg border border-border bg-secondary/10 p-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatMoney((inv as any).amounts?.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-2">
                  <span>Total</span>
                  <span>{formatMoney((inv as any).amounts?.total)}</span>
                </div>
                {((inv as any).amounts?.invoiceBalance ?? 0) > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-red-400 border-t border-border pt-2">
                    <span>Outstanding Balance</span>
                    <span>{formatMoney((inv as any).amounts?.invoiceBalance)}</span>
                  </div>
                )}
                {((inv as any).amounts?.invoiceBalance ?? 0) === 0 && (inv as any).invoiceStatus === "PAID" && (
                  <div className="flex justify-between text-xs font-semibold text-green-400 border-t border-border pt-2">
                    <span>Paid in Full</span>
                    <span>{formatMoney((inv as any).amounts?.total)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* AI Follow-Up Email — only for overdue/sent invoices with a balance */}
        {!isLoading && inv && ["OVERDUE", "SENT", "VIEWED", "PARTIAL"].includes((inv as any).invoiceStatus ?? "") && ((inv as any).amounts?.invoiceBalance ?? 0) > 0 && (
          <div className="shrink-0 px-5 py-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">AI Follow-Up Email</p>
              <button
                onClick={() => generateFollowUp.mutate({ invoiceId })}
                disabled={generateFollowUp.isPending}
                className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-primary text-[10px] font-semibold px-2.5 py-1 rounded-md transition-colors"
              >
                {generateFollowUp.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generateFollowUp.isPending ? "Generating..." : "Generate Draft"}
              </button>
            </div>
            {followUpDraft && (
              <div className="space-y-2">
                <textarea
                  value={followUpDraft}
                  onChange={e => setFollowUpDraft(e.target.value)}
                  rows={6}
                  className="w-full bg-secondary/40 border border-primary/30 rounded-md px-3 py-2 text-xs text-foreground resize-none outline-none focus:border-primary/50 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(followUpDraft); toast.success("Copied."); }}
                    className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-semibold px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  {followUpEmail && (
                    <a
                      href={`mailto:${followUpEmail}?subject=Invoice %23${(inv as any).invoiceNumber} - Payment Reminder&body=${encodeURIComponent(followUpDraft)}`}
                      className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      <Mail className="w-3 h-3" /> Open in Email
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-border">
          <a
            href="https://secure.getjobber.com/home"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Jobber
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Invoice row type ─────────────────────────────────────────────────────────

type InvoiceNode = {
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
    invoiceBalance?: number | null;
  } | null;
  client?: { id?: string; name?: string | null; companyName?: string | null } | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsInvoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<InvoiceNode | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.invoices.useQuery({ first: 100 }, { retry: false });

  // AI #4: Invoice Risk Flagging
  const [riskReport, setRiskReport] = useState<{ summary: string; flags: { invoiceId: string; clientName: string; amount: number; daysOverdue: number; riskLevel: string; recommendation: string }[] } | null>(null);
  const [showRiskPanel, setShowRiskPanel] = useState(false);
  const flagRisks = trpc.ops.ai.flagInvoiceRisks.useMutation({
    onSuccess: (data) => { setRiskReport(data as any); setShowRiskPanel(true); toast.success("Invoice risk scan complete."); },
    onError: (err) => toast.error(`Risk scan failed: ${err.message}`),
  });
  const handleRiskScan = () => {
    const invoicesForScan = nodes.map((inv) => ({
      id: inv.id,
      invoiceNumber: String(inv.invoiceNumber ?? ""),
      clientName: inv.client?.name || inv.client?.companyName || "Unknown",
      balance: Number((inv as any).amounts?.invoiceBalance ?? 0),
      total: Number((inv as any).amounts?.total ?? 0),
      issuedDate: (inv as any).issuedDate ?? undefined,
      dueDate: (inv as any).dueDate ?? undefined,
      status: inv.invoiceStatus ?? "DRAFT",
    }));
    flagRisks.mutate({ jobberInvoices: invoicesForScan });
  };

  const deleteInvoice = trpc.jobber.deleteInvoice.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted from Jobber.");
      utils.jobber.invoices.invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete invoice.");
      setDeleteTarget(null);
    },
  });

  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: InvoiceNode[] = useMemo(
    () => (data as any)?.nodes ?? [],
    [data]
  );

  const statuses = useMemo(
    () => ["ALL", ...Array.from(new Set(nodes.map((i) => i.invoiceStatus ?? "DRAFT")))],
    [nodes]
  );

  const filtered = useMemo(() => {
    return nodes.filter((inv) => {
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
  }, [nodes, search, statusFilter]);

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  // KPI summaries
  const totalOutstanding = nodes
    .filter((i) => i.invoiceStatus !== "PAID")
    .reduce((sum, i) => sum + (i.amounts?.invoiceBalance ?? 0), 0);
  const overdueCount = nodes.filter((i) => i.invoiceStatus === "OVERDUE").length;

  // ── Checkbox helpers ──────────────────────────────────────────────────
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.add(i.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    setBulkPending(true);
    const ids = Array.from(selected);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        await deleteInvoice.mutateAsync({ id });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setBulkPending(false);
    setShowBulkConfirm(false);
    setSelected(new Set());
    utils.jobber.invoices.invalidate();
    if (successCount > 0) toast.success(`${successCount} invoice${successCount > 1 ? "s" : ""} deleted from Jobber.`);
    if (failCount > 0) toast.error(`${failCount} deletion${failCount > 1 ? "s" : ""} failed.`);
  }

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
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              onClick={handleRiskScan}
              disabled={flagRisks.isPending || notConnected}
            >
              {flagRisks.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI Risk Scan
            </Button>
          </div>
        </div>

        {/* AI Risk Report Panel */}
        {flagRisks.isPending && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 rounded bg-red-400/20" />
              <div className="h-3 w-36 rounded bg-red-400/20" />
            </div>
            <div className="h-3 w-full rounded bg-white/5" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-md border border-border bg-card p-3 space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-1/3 rounded bg-white/10" />
                  <div className="h-3 w-16 rounded bg-red-400/20" />
                </div>
                <div className="h-3 w-2/3 rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}
        {showRiskPanel && riskReport && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Invoice Risk Report</span>
              </div>
              <button onClick={() => setShowRiskPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">{riskReport.summary}</p>
            {riskReport.flags.length === 0 ? (
              <p className="text-xs text-green-400">No high-risk invoices detected.</p>
            ) : (
              <div className="space-y-2">
                {riskReport.flags.map((flag, i) => (
                  <div key={i} className="rounded-md border border-border bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{flag.clientName}</span>
                      <Badge className={flag.riskLevel === "high" ? "bg-red-500/20 text-red-400 border-red-500/30" : flag.riskLevel === "medium" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {flag.riskLevel}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">${flag.amount.toLocaleString()} — {flag.daysOverdue} days overdue</p>
                    <p className="text-xs text-foreground/80">{flag.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs font-medium text-red-400">
              {selected.size} invoice{selected.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete {selected.size} Selected
              </button>
            </div>
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
                        <th className="px-3 py-2.5 w-8">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleAll}
                            className="w-3.5 h-3.5 accent-primary cursor-pointer"
                            aria-label="Select all"
                          />
                        </th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Invoice #</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Outstanding</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Due Date</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((inv, idx) => {
                        const isOverdue = inv.invoiceStatus === "OVERDUE";
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className={cn(
                              "border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer",
                              selected.has(inv.id) ? "bg-red-500/5" : idx % 2 === 0 ? "" : "bg-secondary/5",
                              isOverdue ? "border-l-2 border-l-red-500/50" : "",
                              selectedInvoiceId === inv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                            )}
                          >
                            <td className="px-3 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected.has(inv.id)}
                                onChange={() => toggleOne(inv.id)}
                                className="w-3.5 h-3.5 accent-primary cursor-pointer"
                                aria-label={`Select invoice #${inv.invoiceNumber}`}
                              />
                            </td>
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
                              {(inv.amounts?.invoiceBalance ?? 0) > 0 ? (
                                <div className="flex items-center justify-end gap-1 text-red-400">
                                  <TrendingDown className="w-3 h-3" />
                                  {formatMoney(inv.amounts?.invoiceBalance)}
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
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedInvoiceId(inv.id)}
                                  title="View details"
                                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                  Details
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(inv)}
                                  title="Delete invoice"
                                  className="text-muted-foreground hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
                href="https://secure.getjobber.com/home"
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

      {/* Invoice detail slide-out panel */}
      {selectedInvoiceId && (
        <InvoiceDetailPanel
          invoiceId={selectedInvoiceId}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}

      {/* Single delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          title="Delete Invoice"
          description={
            <>
              Permanently delete{" "}
              <span className="font-medium text-foreground">
                Invoice #{deleteTarget.invoiceNumber ?? ""}
              </span>{" "}
              for {deleteTarget.client?.name || deleteTarget.client?.companyName || "this client"} from Jobber. This cannot be undone.
            </>
          }
          onConfirm={() => deleteInvoice.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteInvoice.isPending}
        />
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkConfirm && (
        <DeleteModal
          title={`Delete ${selected.size} Invoice${selected.size > 1 ? "s" : ""}`}
          description={
            <>
              Permanently delete{" "}
              <span className="font-medium text-foreground">
                {selected.size} selected invoice{selected.size > 1 ? "s" : ""}
              </span>{" "}
              from Jobber. This cannot be undone.
            </>
          }
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkConfirm(false)}
          isPending={bulkPending}
        />
      )}
    </DashboardLayout>
  );
}
