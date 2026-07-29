/**
 * Ops Quotes page — live Jobber quote data
 * Calls trpc.jobber.quotes to fetch quotes from Jobber CRM.
 * Clicking a row opens a slide-out detail panel with full quote info.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { TN_COUNTY_TAX_RATES, TN_COUNTY_NAMES, formatTaxRate } from "@shared/tnTaxRates";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  DollarSign,
  Trash2,
  Loader2,
  X,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  User,
  Briefcase,
  Plus,
  PlusCircle,
  Pencil,
  CheckCircle,
  Copy,
  ArchiveRestore,
  Sparkles,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Globe,
  ClipboardList,
  Eye,
  Building2,
  BookmarkPlus,
  Archive,
  BookmarkCheck,
  CheckCircle2,
  Smartphone,
  Image,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import PropertyMapDrawer from "@/components/PropertyMapDrawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line, Area,
} from "recharts";
import {
  TrendingUp, ArrowLeft, Send, XCircle, MapPin as MapPinIcon, CreditCard,
  Settings2, GripVertical, ToggleLeft, ToggleRight, Users, Receipt,
} from "lucide-react";
import { NativeAllQuotesSection } from "@/pages/ops/NativeAllQuotesSection";
import NativeJobsSection from "@/pages/ops/NativeJobsSection";
import NativeClientsSection from "@/pages/ops/NativeClientsSection";
import NativeInvoicesSection from "@/pages/ops/NativeInvoicesSection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Decode a Jobber GraphQL encoded ID (base64 gid://jobber/Type/12345)
 * and return the numeric ID portion for use in web URLs.
 * Falls back to the raw encoded ID if decoding fails.
 */
function decodeJobberId(encodedId: string): string {
  try {
    const decoded = atob(encodedId);
    // Format: gid://jobber/Quote/12345
    const parts = decoded.split("/");
    const numericId = parts[parts.length - 1];
    if (numericId && /^\d+$/.test(numericId)) return numericId;
  } catch { /* ignore */ }
  return encodedId;
}

function jobberQuoteUrl(encodedId: string): string {
  return `https://secure.getjobber.com/quotes/${decodeJobberId(encodedId)}`;
}

function jobberJobUrl(encodedId: string): string {
  return `https://secure.getjobber.com/jobs/${decodeJobberId(encodedId)}`;
}

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

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  DRAFT:             { bg: "bg-zinc-700/50",         text: "text-zinc-400",   dot: "bg-zinc-400",   label: "Draft" },
  SENT:              { bg: "bg-blue-500/15",          text: "text-blue-400",  dot: "bg-blue-400",  label: "Sent" },
  CHANGES_REQUESTED: { bg: "bg-yellow-500/15",        text: "text-yellow-400", dot: "bg-yellow-400", label: "Changes Requested" },
  APPROVED:          { bg: "bg-green-500/20",          text: "text-green-400", dot: "bg-green-400", label: "Approved" },
  CONVERTED:         { bg: "bg-amber-500/15",          text: "text-amber-400", dot: "bg-amber-400", label: "Converted" },
  CONVERTED_TO_JOB:  { bg: "bg-amber-500/15",          text: "text-amber-400", dot: "bg-amber-400", label: "Converted" },
  ARCHIVED:          { bg: "bg-zinc-700/50",           text: "text-zinc-500",  dot: "bg-zinc-500",  label: "Archived" },
};

// Keep STATUS_COLORS for any legacy references
const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, `${v.bg} ${v.text}`])
);

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-zinc-700/50 text-zinc-400">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
        {status.replace(/_/g, " ")}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
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

// ─── Distance Quotes helpers ────────────────────────────────────────────────
const DQ_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", accepted: "Accepted", declined: "Declined", expired: "Expired",
};
const DQ_STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-blue-900/40 text-blue-300",
  accepted: "bg-green-900/40 text-green-400",
  declined: "bg-red-900/40 text-red-400",
  expired: "bg-yellow-900/40 text-yellow-400",
};
const DQ_STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="w-3 h-3" />,
  sent: <Clock className="w-3 h-3" />,
  accepted: <CheckCircle className="w-3 h-3" />,
  declined: <XCircle className="w-3 h-3" />,
  expired: <AlertTriangle className="w-3 h-3" />,
};
function fmtCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Quote Detail Panel ───────────────────────────────────────────────────────

function DistanceQuotesTab() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [emailConfirmId, setEmailConfirmId] = useState<number | null>(null);
  const [portalConfirmId, setPortalConfirmId] = useState<number | null>(null);
  const [portalNote, setPortalNote] = useState("");
  const [copiedPortalId, setCopiedPortalId] = useState<number | null>(null);

  const { data: dqQuotes = [], isLoading: dqLoading, refetch: dqRefetch } = trpc.ops.distanceQuotes.list.useQuery();
  const dqUpdateStatus = trpc.ops.distanceQuotes.updateStatus.useMutation({
    onSuccess: () => dqRefetch(),
    onError: (e) => toast.error(e.message),
  });
  const dqDelete = trpc.ops.distanceQuotes.delete.useMutation({
    onSuccess: () => { dqRefetch(); toast.success("Quote deleted."); setDeleteConfirmId(null); },
    onError: (e) => toast.error(e.message),
  });
  const dqEmail = trpc.ops.distanceQuotes.emailQuote.useMutation({
    onSuccess: () => { dqRefetch(); toast.success("Quote emailed to client."); setEmailConfirmId(null); },
    onError: (e) => toast.error(e.message),
  });
  const dqSendPortal = trpc.ops.distanceQuotes.sendPortalLink.useMutation({
    onSuccess: (data) => {
      dqRefetch();
      toast.success("Portal link sent to client.");
      setPortalConfirmId(null);
      setPortalNote("");
      // Copy link to clipboard
      navigator.clipboard.writeText(data.portalUrl).catch(() => {});
    },
    onError: (e) => toast.error(e.message),
  });

  const dqFiltered = filterStatus === "all" ? dqQuotes : dqQuotes.filter(q => q.status === filterStatus);
  const dqCounts = {
    all: dqQuotes.length,
    draft: dqQuotes.filter(q => q.status === "draft").length,
    sent: dqQuotes.filter(q => q.status === "sent").length,
    accepted: dqQuotes.filter(q => q.status === "accepted").length,
    declined: dqQuotes.filter(q => q.status === "declined").length,
    expired: dqQuotes.filter(q => q.status === "expired").length,
  };
  const totalAcceptedCents = dqQuotes.filter(q => q.status === "accepted").reduce((s, q) => s + q.adjustedJobTotalCents, 0);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Distance Quotes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Formal quotes saved from the{" "}
            <Link href="/ops/pricing" className="text-primary underline hover:text-primary/80 transition-colors">Distance Pricing tool</Link>
          </p>
        </div>
        <Link href="/ops/pricing">
          <button className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-all">
            <Plus className="w-3.5 h-3.5" /> New Quote
          </button>
        </Link>
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Quotes", value: dqCounts.all, color: "text-foreground" },
          { label: "Sent", value: dqCounts.sent, color: "text-blue-400" },
          { label: "Accepted", value: dqCounts.accepted, color: "text-green-400" },
          { label: "Accepted Value", value: fmtCents(totalAcceptedCents), color: "text-primary" },
        ].map((card, i) => (
          <div key={i} className="ops-card p-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{card.label}</div>
            <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>
      {/* Status filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {(["all", "draft", "sent", "accepted", "declined", "expired"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              filterStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : DQ_STATUS_LABELS[s]}
            <span className="text-[10px] opacity-70">{s === "all" ? dqCounts.all : dqCounts[s as keyof typeof dqCounts]}</span>
          </button>
        ))}
      </div>
      {/* List */}
      {dqLoading ? (
        <div className="ops-card p-8 text-center text-sm text-muted-foreground">Loading quotes...</div>
      ) : dqFiltered.length === 0 ? (
        <div className="ops-card p-10 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {filterStatus === "all" ? "No distance quotes saved yet. Run a distance calculation on the Pricing page and click Save as Quote." : `No ${DQ_STATUS_LABELS[filterStatus].toLowerCase()} quotes.`}
          </p>
          <Link href="/ops/pricing">
            <button className="mt-4 flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-all mx-auto">
              <Plus className="w-3.5 h-3.5" /> Go to Pricing Tool
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {dqFiltered.map(quote => (
            <div key={quote.id} className="ops-card overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedId(expandedId === quote.id ? null : quote.id)}
              >
                <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 ${DQ_STATUS_COLORS[quote.status]}`}>
                  {DQ_STATUS_ICONS[quote.status]}{DQ_STATUS_LABELS[quote.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{quote.clientName}</div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <MapPinIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{quote.jobAddress}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-sm font-bold text-primary">{fmtCents(quote.adjustedJobTotalCents)}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtDate(quote.createdAt)}</div>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedId === quote.id ? "rotate-180" : ""}`} />
              </div>
              {expandedId === quote.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Job Type", value: quote.jobType },
                      { label: "Acres", value: quote.jobAcres ?? "—" },
                      { label: "Crew Days", value: quote.crewDaysNeeded },
                      { label: "Distance", value: `${quote.distanceMiles} mi${quote.driveDuration ? ` (${quote.driveDuration})` : ""}` },
                      { label: "Base Day Rate", value: fmtCents(quote.baseDayRateCents) },
                      { label: "Travel Surcharge", value: quote.mobSurchargeCents === 0 ? "None" : `+${fmtCents(quote.mobSurchargeCents)}/day` },
                      { label: "Adjusted Day Rate", value: fmtCents(quote.adjustedDayRateCents) },
                      { label: "Price / Acre", value: fmtCents(quote.pricePerAcreCents) },
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
                  <div className="flex items-center gap-2 flex-wrap">
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
                              onClick={() => dqUpdateStatus.mutate({ id: quote.id, status: s })}
                              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-foreground first:rounded-t-lg last:rounded-b-lg"
                            >
                              {DQ_STATUS_ICONS[s]}{DQ_STATUS_LABELS[s]}
                            </button>
                          ))}
                      </div>
                    </div>
                    {quote.clientEmail && (
                      emailConfirmId === quote.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-400">Email quote to {quote.clientEmail}?</span>
                          <button onClick={() => dqEmail.mutate({ id: quote.id })} disabled={dqEmail.isPending} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md transition-all disabled:opacity-50">
                            <Send className="w-3 h-3" />{dqEmail.isPending ? "Sending..." : "Send"}
                          </button>
                          <button onClick={() => setEmailConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEmailConfirmId(quote.id)} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1.5">
                          <Mail className="w-3.5 h-3.5" />Email Quote
                        </button>
                      )
                    )}
                    {/* Send Portal Link */}
                    {quote.clientEmail && (
                      portalConfirmId === quote.id ? (
                        <div className="flex flex-col gap-2 w-full border-t border-border pt-3 mt-1">
                          <p className="text-xs text-amber-400 font-medium">Send portal link to {quote.clientEmail}?</p>
                          <p className="text-[11px] text-muted-foreground">Client will receive a branded email with a link to view, approve/decline, and pay a deposit — no login required.</p>
                          <input
                            type="text"
                            placeholder="Optional note to include in the email..."
                            value={portalNote}
                            onChange={e => setPortalNote(e.target.value)}
                            className="w-full text-xs bg-secondary border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => dqSendPortal.mutate({ id: quote.id, note: portalNote || undefined })}
                              disabled={dqSendPortal.isPending}
                              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-md transition-all disabled:opacity-50"
                            >
                              <Send className="w-3 h-3" />{dqSendPortal.isPending ? "Sending..." : "Send Portal Link"}
                            </button>
                            <button onClick={() => { setPortalConfirmId(null); setPortalNote(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPortalConfirmId(quote.id)}
                          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors px-2 py-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {(quote as any).portalToken ? "Resend Portal Link" : "Send Portal Link"}
                        </button>
                      )
                    )}
                    {/* Portal status indicators */}
                    {(quote as any).portalToken && (
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-auto">
                        {(quote as any).portalViewedAt && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Eye className="w-3 h-3" />Viewed {fmtDate((quote as any).portalViewedAt)}
                          </span>
                        )}
                        {(quote as any).clientAction === "approved" && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />Approved
                          </span>
                        )}
                        {(quote as any).clientAction === "declined" && (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="w-3 h-3" />Declined
                          </span>
                        )}
                        {(quote as any).depositPaidAt && (
                          <span className="flex items-center gap-1 text-green-400">
                            <CreditCard className="w-3 h-3" />Deposit paid
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const url = `https://nolandearth-pymczdcn.manus.space/quote/${(quote as any).portalToken}`;
                            navigator.clipboard.writeText(url);
                            setCopiedPortalId(quote.id);
                            setTimeout(() => setCopiedPortalId(null), 2000);
                          }}
                          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <Copy className="w-3 h-3" />{copiedPortalId === quote.id ? "Copied!" : "Copy link"}
                        </button>
                      </div>
                    )}
                    {deleteConfirmId === quote.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400">Delete this quote?</span>
                        <button onClick={() => dqDelete.mutate({ id: quote.id })} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-md transition-all">Confirm</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(quote.id)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1.5">
                        <Trash2 className="w-3.5 h-3.5" />Delete
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
  );
}

// ─── Quote Analytics Tab ──────────────────────────────────────────────────────

const QA_AMBER = "#f59e0b";
const QA_GREEN = "#22c55e";
const QA_BLUE = "#3b82f6";
const QA_MUTED = "#6b7280";
const QA_STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", sent: "#3b82f6", accepted: "#22c55e", declined: "#ef4444", expired: "#f59e0b",
};
const QA_JOB_TYPE_COLORS = [QA_AMBER, QA_GREEN, QA_BLUE, "#a855f7", "#ec4899", "#14b8a6"];

function QaKpiCard({ label, value, sub, color = "text-foreground", icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="ops-card p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

const QaCustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue") ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Portal Add-ons Manager ─────────────────────────────────────────────────
function PortalAddOnsManager() {
  const utils = trpc.useUtils();
  const { data: addOns, isLoading } = trpc.ops.portalAddOns.list.useQuery();
  const createMut = trpc.ops.portalAddOns.create.useMutation({ onSuccess: () => utils.ops.portalAddOns.list.invalidate() });
  const updateMut = trpc.ops.portalAddOns.update.useMutation({ onSuccess: () => utils.ops.portalAddOns.list.invalidate() });
  const deleteMut = trpc.ops.portalAddOns.delete.useMutation({ onSuccess: () => utils.ops.portalAddOns.list.invalidate() });

  const [editId, setEditId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ label: "", description: "", estimateCents: 0, isActive: true });
  const [editForm, setEditForm] = useState({ label: "", description: "", estimateCents: 0, isActive: true });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const handleCreate = async () => {
    if (!form.label.trim()) { toast.error("Label is required"); return; }
    await createMut.mutateAsync({ label: form.label, description: form.description || undefined, estimateCents: form.estimateCents, isActive: form.isActive });
    setForm({ label: "", description: "", estimateCents: 0, isActive: true });
    setShowNew(false);
    toast.success("Add-on created");
  };

  const handleUpdate = async (id: number) => {
    await updateMut.mutateAsync({ id, label: editForm.label, description: editForm.description || undefined, estimateCents: editForm.estimateCents, isActive: editForm.isActive });
    setEditId(null);
    toast.success("Add-on updated");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this add-on? It will no longer appear on the client portal.")) return;
    await deleteMut.mutateAsync({ id });
    toast.success("Add-on deleted");
  };

  const startEdit = (ao: any) => {
    setEditId(ao.id);
    setEditForm({ label: ao.label, description: ao.description ?? "", estimateCents: ao.estimateCents, isActive: ao.isActive });
  };

  if (isLoading) return <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading add-ons...</div>;

  return (
    <div className="space-y-4 pb-10">
      <div className="ops-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Portal Add-on Services</h2>
            <p className="text-xs text-muted-foreground mt-0.5">These options appear on the client quote portal before the client signs. Clients can select any combination before approving.</p>
          </div>
          <button
            onClick={() => setShowNew(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Add-on
          </button>
        </div>

        {showNew && (
          <div className="mb-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
            <p className="text-xs font-semibold text-amber-400">New Add-on</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Label *</label>
                <input className="w-full mt-1 bg-secondary/30 border border-border rounded px-2.5 py-1.5 text-xs text-foreground" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Fence Line Clearing" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Description</label>
                <input className="w-full mt-1 bg-secondary/30 border border-border rounded px-2.5 py-1.5 text-xs text-foreground" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description shown to client" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Estimate ($)</label>
                <input type="number" min="0" className="w-full mt-1 bg-secondary/30 border border-border rounded px-2.5 py-1.5 text-xs text-foreground" value={form.estimateCents / 100} onChange={e => setForm(f => ({ ...f, estimateCents: Math.round(parseFloat(e.target.value || '0') * 100) }))} placeholder="850" />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-amber-500" />
                  Active (visible on portal)
                </label>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={handleCreate} disabled={createMut.isPending} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50">Save Add-on</button>
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 rounded bg-secondary hover:bg-secondary/70 text-foreground text-xs">Cancel</button>
            </div>
          </div>
        )}

        {/* Search + filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              className="w-full pl-8 pr-3 py-1.5 bg-secondary/30 border border-border rounded text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              placeholder="Search add-ons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "active", "inactive"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${
                  filterStatus === s
                    ? "bg-amber-500 text-black"
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {(!addOns || addOns.length === 0) ? (
          <div className="text-center py-10 text-sm text-muted-foreground">No add-ons yet. Click "New Add-on" to create the first one.</div>
        ) : (() => {
          const filtered = addOns.filter((ao: any) => {
            const matchSearch = !search.trim() || ao.label.toLowerCase().includes(search.toLowerCase()) || (ao.description ?? "").toLowerCase().includes(search.toLowerCase());
            const matchStatus = filterStatus === "all" || (filterStatus === "active" ? ao.isActive : !ao.isActive);
            return matchSearch && matchStatus;
          });
          if (filtered.length === 0) return <div className="text-center py-8 text-sm text-muted-foreground">No add-ons match your search.</div>;
          return (
          <div className="space-y-2">
            {filtered.map((ao: any) => (
              <div key={ao.id} className={`rounded-lg border p-3 transition-colors ${ao.isActive ? 'border-border bg-secondary/10' : 'border-border/40 bg-secondary/5 opacity-60'}`}>
                {editId === ao.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Label *</label>
                        <input className="w-full mt-1 bg-secondary/30 border border-border rounded px-2.5 py-1.5 text-xs text-foreground" value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Description</label>
                        <input className="w-full mt-1 bg-secondary/30 border border-border rounded px-2.5 py-1.5 text-xs text-foreground" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Estimate ($)</label>
                        <input type="number" min="0" className="w-full mt-1 bg-secondary/30 border border-border rounded px-2.5 py-1.5 text-xs text-foreground" value={editForm.estimateCents / 100} onChange={e => setEditForm(f => ({ ...f, estimateCents: Math.round(parseFloat(e.target.value || "0") * 100) }))} />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="accent-amber-500" />
                          Active
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(ao.id)} disabled={updateMut.isPending} className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold disabled:opacity-50">Save</button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded bg-secondary hover:bg-secondary/70 text-foreground text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{ao.label}</span>
                          {!ao.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">Hidden</span>}
                        </div>
                        {ao.description && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ao.description}</p>}
                        <p className="text-[11px] text-amber-400 font-semibold mt-1">~{fmt(ao.estimateCents)} estimate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateMut.mutate({ id: ao.id, isActive: !ao.isActive })}
                        title={ao.isActive ? "Hide from portal" : "Show on portal"}
                        className="p-1.5 rounded hover:bg-secondary/50 transition-colors"
                      >
                        {ao.isActive ? <ToggleRight className="w-4 h-4 text-amber-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                      </button>
                      <button onClick={() => startEdit(ao)} className="p-1.5 rounded hover:bg-secondary/50 transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(ao.id)} disabled={deleteMut.isPending} className="p-1.5 rounded hover:bg-red-500/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          );
        })()}

        <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border">
          Add-on estimates are shown to clients as approximate figures. Final pricing is confirmed after site visit. Changes here take effect on all future portal links immediately.
        </p>
      </div>
    </div>
  );
}

function QuoteAnalyticsTab() {
  const { data: qaData, isLoading: qaLoading } = trpc.ops.distanceQuotes.analytics.useQuery();

  if (qaLoading) return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading analytics...</div>;

  if (!qaData || qaData.total === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center space-y-4">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto" />
        <h2 className="text-base font-semibold text-foreground">No quote data yet</h2>
        <p className="text-sm text-muted-foreground">Save quotes from the Distance Pricing tool to start seeing analytics here.</p>
        <Link href="/ops/pricing">
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-all">Go to Pricing Tool</button>
        </Link>
      </div>
    );
  }

  const qaPipelineData = [
    { name: "Draft", value: Math.round(qaData.pipeline.draftCents / 100), fill: QA_STATUS_COLORS.draft },
    { name: "Sent", value: Math.round(qaData.pipeline.sentCents / 100), fill: QA_STATUS_COLORS.sent },
    { name: "Accepted", value: Math.round(qaData.pipeline.acceptedCents / 100), fill: QA_STATUS_COLORS.accepted },
    { name: "Declined", value: Math.round(qaData.pipeline.declinedCents / 100), fill: QA_STATUS_COLORS.declined },
  ].filter(d => d.value > 0);
  const qaTotalPipeline = qaData.pipeline.draftCents + qaData.pipeline.sentCents + qaData.pipeline.acceptedCents + qaData.pipeline.declinedCents;

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QaKpiCard label="Total Quotes" value={qaData.total} icon={<TrendingUp className="w-4 h-4" />} />
        <QaKpiCard label="Overall Acceptance" value={`${qaData.overallAcceptanceRate}%`} sub={`${qaData.statusBreakdown.find(s => s.status === "accepted")?.count ?? 0} accepted`} color="text-green-400" icon={<CheckCircle className="w-4 h-4" />} />
        <QaKpiCard label="Accepted Revenue" value={fmtCents(qaData.pipeline.acceptedCents)} sub="from accepted quotes" color="text-primary" icon={<DollarSign className="w-4 h-4" />} />
        <QaKpiCard label="Total Pipeline" value={fmtCents(qaTotalPipeline)} sub="all statuses" icon={<MapPinIcon className="w-4 h-4" />} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ops-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-4">Acceptance Rate by Job Type</h3>
          {qaData.acceptanceByJobType.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={qaData.acceptanceByJobType} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="jobType" tick={{ fontSize: 10, fill: QA_MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: QA_MUTED }} unit="%" domain={[0, 100]} />
                <RechartsTooltip content={<QaCustomTooltip />} />
                <Bar dataKey="acceptanceRate" name="Acceptance Rate %" radius={[3, 3, 0, 0]}>
                  {qaData.acceptanceByJobType.map((_, i) => <Cell key={i} fill={QA_JOB_TYPE_COLORS[i % QA_JOB_TYPE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="ops-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-4">Quote Status Breakdown</h3>
          {qaData.statusBreakdown.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={qaData.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} label={({ status, percent }: any) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {qaData.statusBreakdown.map((entry, i) => <Cell key={i} fill={QA_STATUS_COLORS[entry.status] ?? QA_MUTED} />)}
                </Pie>
                <RechartsTooltip formatter={(val: number, name: string) => [val, name]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="ops-card p-4">
        <h3 className="text-xs font-semibold text-foreground mb-4">Monthly Trends</h3>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={qaData.monthlyTrends} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: QA_MUTED }} />
            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: QA_MUTED }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: QA_MUTED }} tickFormatter={v => `$${v.toLocaleString()}`} />
            <RechartsTooltip content={<QaCustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="created" name="Created" fill="#374151" radius={[2, 2, 0, 0]} />
            <Bar yAxisId="left" dataKey="accepted" name="Accepted" fill={QA_GREEN} radius={[2, 2, 0, 0]} />
            <Area yAxisId="right" type="monotone" dataKey="revenueDollars" name="Revenue $" fill={`${QA_AMBER}20`} stroke={QA_AMBER} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ops-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-4">Distance Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={qaData.distanceDistribution} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: QA_MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: QA_MUTED }} allowDecimals={false} />
              <RechartsTooltip content={<QaCustomTooltip />} />
              <Bar dataKey="count" name="Quotes" fill={QA_BLUE} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="ops-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-4">Revenue Pipeline by Status</h3>
          {qaPipelineData.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No revenue data</p> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={qaPipelineData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: QA_MUTED }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: QA_MUTED }} width={55} />
                <RechartsTooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {qaPipelineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="ops-card p-4">
        <h3 className="text-xs font-semibold text-foreground mb-4">Job Type Performance Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Job Type</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Quotes</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Accepted</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Rate</th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total Value</th>
              <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Accepted Value</th>
            </tr></thead>
            <tbody>
              {qaData.acceptanceByJobType.sort((a, b) => b.acceptanceRate - a.acceptanceRate).map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{row.jobType}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{row.total}</td>
                  <td className="py-2.5 px-3 text-right text-green-400">{row.accepted}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-semibold ${row.acceptanceRate >= 60 ? "text-green-400" : row.acceptanceRate >= 30 ? "text-yellow-400" : "text-red-400"}`}>{row.acceptanceRate}%</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">{fmtCents(row.totalRevenueCents)}</td>
                  <td className="py-2.5 pl-3 text-right font-semibold text-primary">{fmtCents(row.acceptedRevenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpsQuotes() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(() => {
    // Open a specific quote panel if ?quote=ID is in the URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("quote");
    }
    return null;
  });
  const utils = trpc.useUtils();;
  // Priority 4: Stale Quote Follow-Up
  const [showStalePanel, setShowStalePanel] = useState(false);
  const [staleFollowUpDrafts, setStaleFollowUpDrafts] = useState<Record<number, string>>({});
  const [draftingFor, setDraftingFor] = useState<number | null>(null);
  const { data: staleQuotes = [] } = trpc.ops.getStaleQuotes.useQuery();
  const draftFollowUpMutation = trpc.ops.draftQuoteFollowUp.useMutation({
    onSuccess: (data: any, variables: any) => {
      setStaleFollowUpDrafts(prev => ({ ...prev, [variables.quoteId]: data.draft }));
      setDraftingFor(null);
    },
    onError: (err: any) => { toast.error(err.message || "Draft failed."); setDraftingFor(null); },
  });

  const [, navigate] = useLocation();
  return (
    <DashboardLayout title="Quotes" subtitle="All Quotes · Distance Quotes · Analytics">
      <Tabs defaultValue="all-quotes" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="all-quotes" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> All Quotes
          </TabsTrigger>
          <TabsTrigger value="distance" className="gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5" /> Distance Quotes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5 text-xs">
            <Briefcase className="w-3.5 h-3.5" /> Jobs
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Clients
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5 text-xs">
            <Receipt className="w-3.5 h-3.5" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5 text-xs">
            <Settings2 className="w-3.5 h-3.5" /> Add-ons
          </TabsTrigger>
        </TabsList>

        {/* ── ALL QUOTES TAB (Native — Jobber replacement) ── */}
        <TabsContent value="all-quotes" className="mt-0">
          <NativeAllQuotesSection />
        </TabsContent>

        {/* ── DISTANCE QUOTES TAB ── */}
        <TabsContent value="distance" className="mt-0">
          <DistanceQuotesTab />
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="mt-0">
          <QuoteAnalyticsTab />
        </TabsContent>

        {/* ── ADD-ONS MANAGER TAB ── */}
        <TabsContent value="jobs" className="mt-0" style={{ minHeight: 500 }}>
          <NativeJobsSection />
        </TabsContent>
        <TabsContent value="clients" className="mt-0" style={{ minHeight: 500 }}>
          <NativeClientsSection />
        </TabsContent>
        <TabsContent value="invoices" className="mt-0" style={{ minHeight: 500 }}>
          <NativeInvoicesSection />
        </TabsContent>
                <TabsContent value="addons" className="mt-0">
          <PortalAddOnsManager />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
