/**
 * Ops Clients page — live Jobber client data
 * Clicking a client row opens a slide-out detail panel showing all their
 * quotes, jobs, invoices, total revenue, and outstanding balance.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Building2,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Loader2,
  X,
  ChevronRight,
  Briefcase,
  FileText,
  Receipt,
  DollarSign,
  Sparkles,
  Copy,
  CheckCircle2,
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

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function getClientName(client: {
  name?: string | null;
  companyName?: string | null;
}): string {
  return client.name || client.companyName || "Unknown";
}

function getEmail(emails?: Array<{ address: string }>): string {
  return emails?.[0]?.address ?? "—";
}

function getPhone(phones?: Array<{ number: string }>): string {
  return phones?.[0]?.number ?? "—";
}

function getCity(billingAddress?: { city?: string | null } | null): string {
  return billingAddress?.city ?? "—";
}

function statusColor(status: string): string {
  const s = status?.toLowerCase() ?? "";
  if (s.includes("paid") || s.includes("active") || s.includes("approved") || s.includes("complete")) return "text-green-400";
  if (s.includes("overdue") || s.includes("cancelled") || s.includes("declined")) return "text-red-400";
  if (s.includes("draft") || s.includes("pending") || s.includes("awaiting")) return "text-yellow-400";
  return "text-muted-foreground";
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
        Connect your Jobber account to view live client data from your CRM.
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
  warning,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  description: React.ReactNode;
  warning: React.ReactNode;
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
            {warning}
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
            Delete from Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Client Detail Panel ──────────────────────────────────────────────────────

function ClientDetailPanel({
  clientId,
  clientName,
  onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.jobber.clientDetail.useQuery(
    { id: clientId },
    { retry: false }
  );

  const client = data as any;

  const [clientSummary, setClientSummary] = useState("");
  const [summaryCopied, setSummaryCopied] = useState(false);
  const generateSummaryMutation = trpc.jobber.generateClientSummary.useMutation({
    onSuccess: (data) => setClientSummary(data.summary as string),
    onError: (err) => toast.error(err.message || "Failed to generate summary."),
  });

  const quotes: any[] = client?.quotes?.nodes ?? [];
  const jobs: any[] = client?.jobs?.nodes ?? [];
  const invoices: any[] = client?.invoices?.nodes ?? [];

  // Revenue = sum of paid invoices; outstanding = sum of invoiceBalance
  const totalRevenue = invoices.reduce((sum: number, inv: any) => {
    if ((inv.invoiceStatus ?? "").toLowerCase().includes("paid")) {
      return sum + (inv.amounts?.total ?? 0);
    }
    return sum;
  }, 0);

  const outstanding = invoices.reduce(
    (sum: number, inv: any) => sum + (inv.amounts?.invoiceBalance ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {clientName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{clientName}</h3>
              {client?.companyName && client.companyName !== clientName && (
                <p className="text-[11px] text-muted-foreground">{client.companyName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {/* Contact info */}
            {client && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                {getEmail(client.emails) !== "—" && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <a href={`mailto:${getEmail(client.emails)}`} className="hover:text-primary truncate">
                      {getEmail(client.emails)}
                    </a>
                  </div>
                )}
                {getPhone(client.phones) !== "—" && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    <a href={`tel:${getPhone(client.phones)}`} className="hover:text-primary">
                      {getPhone(client.phones)}
                    </a>
                  </div>
                )}
                {client.billingAddress?.city && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{client.billingAddress.city}, {client.billingAddress.province}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3 h-3 shrink-0" />
                  <span>Since {formatDate(client.createdAt)}</span>
                </div>
              </div>
            )}

            {/* Revenue summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3 h-3 text-green-400" />
                  <span className="text-[10px] font-medium text-green-400 uppercase tracking-wide">Total Revenue</span>
                </div>
                <p className="text-base font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Receipt className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] font-medium text-orange-400 uppercase tracking-wide">Outstanding</span>
                </div>
                <p className="text-base font-bold text-orange-400">{formatCurrency(outstanding)}</p>
              </div>
            </div>

            {/* Quotes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Quotes ({quotes.length})
                </h4>
              </div>
              {quotes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No quotes on file.</p>
              ) : (
                <div className="space-y-2">
                  {quotes.map((q: any) => (
                    <Link
                      key={q.id}
                      href={`/ops/quotes?quote=${q.id}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {q.title || `Quote #${q.quoteNumber}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(q.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(q.amounts?.total)}
                        </span>
                        <span className={`text-[10px] font-medium ${statusColor(q.quoteStatus ?? "")}`}>
                          {q.quoteStatus ?? "—"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Jobs */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Jobs ({jobs.length})
                </h4>
              </div>
              {jobs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No jobs on file.</p>
              ) : (
                <div className="space-y-2">
                  {jobs.map((j: any) => (
                    <Link
                      key={j.id}
                      href="/ops/jobs"
                      className="flex items-center justify-between px-3 py-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {j.title || `Job #${j.jobNumber}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatDate(j.startAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {j.total != null && (
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(j.total)}
                          </span>
                        )}
                        <span className={`text-[10px] font-medium ${statusColor(j.jobStatus ?? "")}`}>
                          {j.jobStatus ?? "—"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-3.5 h-3.5 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Invoices ({invoices.length})
                </h4>
              </div>
              {invoices.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No invoices on file.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv: any) => (
                    <Link
                      key={inv.id}
                      href="/ops/invoices"
                      className="flex items-center justify-between px-3 py-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {inv.title || `Invoice #${inv.invoiceNumber}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-foreground">
                          {formatCurrency(inv.amounts?.total)}
                        </span>
                        <span className={`text-[10px] font-medium ${statusColor(inv.invoiceStatus ?? "")}`}>
                          {inv.invoiceStatus ?? "—"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Client Summary */}
        {!isLoading && client && (
          <div className="px-5 py-4 border-t border-border shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Client Summary</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => generateSummaryMutation.mutate({
                  clientId,
                  clientName,
                  totalRevenue,
                  outstanding,
                  jobCount: jobs.length,
                  quoteCount: quotes.length,
                  invoiceCount: invoices.length,
                  recentJobs: jobs.slice(0, 3).map((j: any) => j.title || `Job #${j.jobNumber}`),
                })}
                disabled={generateSummaryMutation.isPending}
              >
                {generateSummaryMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="w-3 h-3 text-orange-400" />Generate Summary</>
                )}
              </Button>
            </div>
            {clientSummary && (
              <div className="space-y-2">
                <p className="text-xs text-foreground leading-relaxed">{clientSummary}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText(clientSummary);
                    setSummaryCopied(true);
                    toast.success("Copied.");
                    setTimeout(() => setSummaryCopied(false), 2000);
                  }}
                >
                  {summaryCopied ? (
                    <><CheckCircle2 className="w-3 h-3 text-green-400" />Copied</>
                  ) : (
                    <><Copy className="w-3 h-3" />Copy</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0">
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
      </div>
    </div>
  );
}

// ─── Client row type ──────────────────────────────────────────────────────────

type ClientNode = {
  id: string;
  name?: string | null;
  companyName?: string | null;
  isLead?: boolean | null;
  balance?: number | null;
  createdAt?: string | null;
  emails?: Array<{ address: string }>;
  phones?: Array<{ number: string; description?: string }>;
  billingAddress?: {
    street1?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
  } | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsClients() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ClientNode | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [detailClient, setDetailClient] = useState<ClientNode | null>(null);
  // hiddenIds: persisted in DB via hidden_clients table — survives page refresh
  const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.clients.useQuery({ first: 100 }, { retry: false });

  // Load persisted hidden client IDs from DB on mount
  const { data: persistedHiddenIds } = trpc.jobber.getHiddenClientIds.useQuery(undefined, { retry: false });
  const hiddenIds = useMemo(() => {
    const combined = new Set(localHiddenIds);
    (persistedHiddenIds ?? []).forEach(id => combined.add(id));
    return combined;
  }, [localHiddenIds, persistedHiddenIds]);

  // AI #11: Client Churn Risk Detection
  const [churnReport, setChurnReport] = useState<{ summary: string; clients: { name: string; daysInactive: number; reEngagementMessage: string; email: string | null }[] } | null>(null);
  const [showChurnPanel, setShowChurnPanel] = useState(false);
  const detectChurn = trpc.ops.ai.detectChurnRisk.useMutation({
    onSuccess: (data) => { setChurnReport(data as any); setShowChurnPanel(true); toast.success("Churn risk scan complete."); },
    onError: (err) => toast.error(`Churn scan failed: ${err.message}`),
  });

  const deleteClient = trpc.jobber.deleteClient.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Client deleted from dashboard.");
      setLocalHiddenIds((prev) => new Set(prev).add(variables.id));
      setSelected((prev) => { const next = new Set(prev); next.delete(variables.id); return next; });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete client.");
      setDeleteTarget(null);
    },
  });

  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: ClientNode[] = useMemo(
    () => ((data as any)?.nodes ?? []).filter((c: ClientNode) => !hiddenIds.has(c.id)),
    [data, hiddenIds]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return nodes;
    return nodes.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.companyName ?? "").toLowerCase().includes(q) ||
        getEmail(c.emails).toLowerCase().includes(q) ||
        getPhone(c.phones).toLowerCase().includes(q) ||
        getCity(c.billingAddress).toLowerCase().includes(q)
    );
  }, [nodes, search]);

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((c) => next.add(c.id));
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

  async function handleBulkDelete() {
    setBulkPending(true);
    const ids = Array.from(selected);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        await deleteClient.mutateAsync({ id });
        successCount++;
        setLocalHiddenIds((prev) => new Set(prev).add(id));
      } catch {
        failCount++;
      }
    }
    setBulkPending(false);
    setShowBulkConfirm(false);
    setSelected(new Set());
    if (successCount > 0) toast.success(`${successCount} client${successCount > 1 ? "s" : ""} deleted from dashboard.`);
    if (failCount > 0) toast.error(`${failCount} deletion${failCount > 1 ? "s" : ""} failed.`);
  }

  return (
    <DashboardLayout title="Clients" subtitle="Live from Jobber CRM">
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">All Clients</h2>
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
                placeholder="Search clients..."
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
              onClick={() => detectChurn.mutate()}
              disabled={detectChurn.isPending || notConnected}
            >
              {detectChurn.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Churn Scan
            </Button>
          </div>
        </div>

        {/* AI Churn Risk Panel */}
        {detectChurn.isPending && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 rounded bg-amber-400/20" />
              <div className="h-3 w-40 rounded bg-amber-400/20" />
            </div>
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-3/4 rounded bg-white/5" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-md border border-border bg-card p-3 space-y-2">
                <div className="h-3 w-1/2 rounded bg-white/10" />
                <div className="h-3 w-3/4 rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}
        {showChurnPanel && churnReport && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">Client Churn Risk Report</span>
              </div>
              <button onClick={() => setShowChurnPanel(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">{churnReport.summary}</p>
            {churnReport.clients.length === 0 ? (
              <p className="text-xs text-green-400">No inactive recurring clients detected.</p>
            ) : (
              <div className="space-y-2">
                {churnReport.clients.map((c, i) => (
                  <div key={i} className="rounded-md border border-border bg-card p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{c.name}</span>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {Math.round(c.daysInactive / 30)}mo inactive
                      </Badge>
                    </div>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    <p className="text-xs text-foreground/80 italic">"{c.reEngagementMessage}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bulk action bar */}
        {someSelected && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs font-medium text-red-400">
              {selected.size} client{selected.size > 1 ? "s" : ""} selected
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
                className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
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
                <Users className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No clients match your search." : "No clients found in Jobber."}
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
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Company</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">City</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden xl:table-cell">Added</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((client, idx) => (
                        <tr
                          key={client.id}
                          onClick={() => setDetailClient(client)}
                          className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer ${
                            selected.has(client.id) ? "bg-red-500/5" : idx % 2 === 0 ? "" : "bg-secondary/5"
                          } ${detailClient?.id === client.id ? "bg-primary/5" : ""}`}
                        >
                          {/* Row checkbox — stop propagation so clicking checkbox doesn't open panel */}
                          <td className="px-3 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(client.id)}
                              onChange={() => toggleOne(client.id)}
                              className="w-3.5 h-3.5 accent-primary cursor-pointer"
                              aria-label={`Select ${getClientName(client)}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">
                                  {getClientName(client).slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-foreground">
                                {getClientName(client)}
                              </span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {client.companyName ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 shrink-0" />
                                {client.companyName}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {getEmail(client.emails) !== "—" ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Mail className="w-3 h-3 shrink-0" />
                                <a
                                  href={`mailto:${getEmail(client.emails)}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {getEmail(client.emails)}
                                </a>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            {getPhone(client.phones) !== "—" ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Phone className="w-3 h-3 shrink-0" />
                                <a
                                  href={`tel:${getPhone(client.phones)}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {getPhone(client.phones)}
                                </a>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                            {getCity(client.billingAddress) !== "—" ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {getCity(client.billingAddress)}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                            {formatDate(client.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={client.isLead ? "outline" : "secondary"}
                              className="text-[10px]"
                            >
                              {client.isLead ? "Lead" : "Client"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href="https://secure.getjobber.com/home"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Jobber"
                                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Jobber
                              </a>
                              <button
                                onClick={() => setDeleteTarget(client)}
                                title="Delete client"
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

      {/* Client detail slide-out panel */}
      {detailClient && (
        <ClientDetailPanel
          clientId={detailClient.id}
          clientName={getClientName(detailClient)}
          onClose={() => setDetailClient(null)}
        />
      )}

      {/* Single delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          title="Delete Client"
          description={
            <>
              Remove{" "}
              <span className="font-medium text-foreground">{getClientName(deleteTarget)}</span>{" "}
              from this dashboard. This is a local-only action.
            </>
          }
          warning={
            <>
              <li>Client will no longer appear in this dashboard</li>
              <li>The client record in Jobber is not affected</li>
              <li>All quotes, jobs, and invoices remain in Jobber</li>
            </>
          }
          onConfirm={() => deleteClient.mutate({ id: deleteTarget.id, clientName: getClientName(deleteTarget) })}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteClient.isPending}
        />
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkConfirm && (
        <DeleteModal
          title={`Delete ${selected.size} Client${selected.size > 1 ? "s" : ""}`}
          description={
            <>
              Remove{" "}
              <span className="font-medium text-foreground">{selected.size} selected client{selected.size > 1 ? "s" : ""}</span>{" "}
              from this dashboard. This is a local-only action.
            </>
          }
          warning={
            <>
              <li>Clients will no longer appear in this dashboard</li>
              <li>Client records in Jobber are not affected</li>
              <li>All quotes, jobs, and invoices remain in Jobber</li>
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
