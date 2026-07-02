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
  TrendingUp, ArrowLeft, Send, XCircle, MapPin as MapPinIcon,
} from "lucide-react";

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

// ─── Quote Detail Panel ───────────────────────────────────────────────────────

function QuoteDetailPanel({
  quoteId,
  onClose,
  onDelete,
  onEdit,
  isDeletePending,
}: {
  quoteId: string;
  onClose: () => void;
  onDelete: (quote: any) => void;
  onEdit: (quote: any) => void;
  isDeletePending?: boolean;
}) {
  const utils = trpc.useUtils();
  const { data: quote, isLoading, error } = trpc.jobber.quoteDetail.useQuery(
    { id: quoteId },
    { retry: false }
  );

  // Satellite map for the property address
  const propertyAddress = quote?.property?.address
    ? [
        quote.property.address.street1,
        quote.property.address.city,
        quote.property.address.province ?? "TN",
        quote.property.address.postalCode,
      ].filter(Boolean).join(", ")
    : null;
  const { data: satData, isLoading: satLoading } = trpc.ops.quotes.satelliteImage.useQuery(
    { address: propertyAddress ?? "" },
    { enabled: !!propertyAddress, staleTime: 1000 * 60 * 30, retry: false }
  );

  // Follow-up flag for this quote
  const { data: followUps } = trpc.jobber.quoteFollowUpList.useQuery();
  const followUp = followUps?.find((f) => f.jobberQuoteId === quoteId);
  const hasActiveFollowUp = followUp && !followUp.cleared;

  const clearFollowUp = trpc.jobber.quoteFollowUpClear.useMutation({
    onSuccess: () => {
      toast.success("Follow-up cleared.");
      utils.jobber.quoteFollowUpList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to clear follow-up.");
    },
  });

  // Ref for the Convert to Job button — used to auto-scroll after Mark as Approved
  const convertToJobRef = useRef<HTMLButtonElement>(null);
  // Track whether the quote was just approved so we can scroll on the next render
  const justApprovedRef = useRef(false);

  // Loading state for "Open in Jobber" / "Convert to Job" buttons
  const [isOpeningJobber, setIsOpeningJobber] = useState(false);

  // Opens a Jobber URL in a new tab with a brief loading indicator
  const openInJobber = (id: string) => {
    setIsOpeningJobber(true);
    window.open(jobberQuoteUrl(id), "_blank", "noopener,noreferrer");
    setTimeout(() => setIsOpeningJobber(false), 1500);
  };

  const openJobInJobber = (jobId: string) => {
    window.open(jobberJobUrl(jobId), "_blank", "noopener,noreferrer");
  };

  // Scroll to Convert to Job button whenever the quote transitions to APPROVED
  // and the button becomes visible in the DOM.
  useEffect(() => {
    if (quote?.quoteStatus === "APPROVED" && justApprovedRef.current) {
      justApprovedRef.current = false;
      // Small timeout lets React finish rendering the button before scrolling
      setTimeout(() => {
        convertToJobRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    }
  }, [quote?.quoteStatus]);

  const markApproved = trpc.jobber.quoteMarkApproved.useMutation({
    onSuccess: (result) => {
      const job = (result as any)?.createdJob;
      const jobErr = (result as any)?.jobError;
      if (job?.jobNumber) {
        toast.success(`Quote approved. Job #${job.jobNumber} created in Jobber.`);
      } else if (jobErr) {
        toast.success("Quote approved.");
        toast.error(`Job creation failed: ${jobErr}`);
      } else {
        toast.success("Quote approved. Follow-up flag added.");
      }
      justApprovedRef.current = true;
      utils.jobber.quotes.invalidate();
      utils.jobber.quoteDetail.invalidate({ id: quoteId });
      utils.jobber.quoteFollowUpList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to mark quote as approved.");
    },
  });

  const duplicateQuote = trpc.jobber.quoteDuplicate.useMutation({
    onSuccess: (newQuote) => {
      toast.success(`Quote duplicated — Draft #${newQuote?.quoteNumber ?? "new"} created.`);
      utils.jobber.quotes.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to duplicate quote.");
    },
  });

  const restoreQuote = trpc.jobber.quoteRestore.useMutation({
    onSuccess: () => {
      toast.success("Quote restored to Draft.");
      utils.jobber.quotes.invalidate();
      utils.jobber.quoteDetail.invalidate({ id: quoteId });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to restore quote.");
    },
  });

  // ── Link to Lead ──────────────────────────────────────────────────────────
  const [showLinkLeadPicker, setShowLinkLeadPicker] = useState(false);
  const [leadPickerSearch, setLeadPickerSearch] = useState("");
  // Check if this quote is already linked to a lead
  const { data: linkedLead, isLoading: linkedLeadLoading } = trpc.ops.getLeadByQuoteId.useQuery(
    { jobberQuoteId: quoteId },
    { retry: false, staleTime: 1000 * 60 * 5 }
  );
  // Unlinked leads for the picker
  const { data: unlinkedLeads = [] } = trpc.ops.getUnlinkedLeads.useQuery(
    undefined,
    { enabled: showLinkLeadPicker, retry: false }
  );
  const filteredLeads = unlinkedLeads.filter((l: any) => {
    if (!leadPickerSearch) return true;
    const q = leadPickerSearch.toLowerCase();
    return (l.name ?? "").toLowerCase().includes(q) ||
      (l.address ?? "").toLowerCase().includes(q);
  });
  const linkQuoteToLead = trpc.ops.linkQuoteToLead.useMutation({
    onSuccess: () => {
      toast.success("Quote linked to lead.");
      setShowLinkLeadPicker(false);
      utils.ops.getLeadByQuoteId.invalidate({ jobberQuoteId: quoteId });
      utils.ops.leads.list.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to link quote to lead."),
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
              {isLoading ? "Loading..." : quote ? `Quote #${quote.quoteNumber ?? "—"}` : "Quote Detail"}
            </span>
            {quote?.quoteStatus && <StatusBadge status={quote.quoteStatus} />}
            {hasActiveFollowUp && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Follow-up
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Satellite imagery strip — shown when property address is available */}
        {propertyAddress && (
          <div className="relative w-full h-36 bg-secondary/20 overflow-hidden shrink-0">
            {satLoading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading satellite view...
              </div>
            )}
            {satData?.url && (
              <>
                <img
                  src={satData.url}
                  alt={`Satellite view of ${propertyAddress}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-end justify-between">
                  <span className="text-[10px] text-white/80 truncate">{propertyAddress}</span>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(propertyAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white transition-colors shrink-0 ml-2"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    View in Maps
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (error || !quote) && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Could not load quote details.</p>
            </div>
          )}

          {!isLoading && quote && (
            <>
              {/* Created Job Banner — shown when a job was auto-created from this quote */}
              {followUp?.jobberJobNumber && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-300">Job #{followUp.jobberJobNumber} created</p>
                      <p className="text-[11px] text-amber-400/70">Converted from this quote</p>
                    </div>
                  </div>
                  {followUp.jobberJobId && (
                    <button
                      onClick={() => openJobInJobber(followUp.jobberJobId!)}
                      className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Job
                    </button>
                  )}
                </div>
              )}

              {/* Title */}
              {quote.title && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</p>
                  <p className="text-sm font-medium text-foreground">{quote.title}</p>
                </div>
              )}

              {/* Client */}
              {quote.client && (
                <div className="rounded-lg bg-secondary/30 border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {quote.client.name || quote.client.companyName || "—"}
                  </p>
                  {quote.client.companyName && quote.client.name && (
                    <p className="text-xs text-muted-foreground">{quote.client.companyName}</p>
                  )}
                  {quote.client.phones?.[0]?.number && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {quote.client.phones[0].number}
                    </div>
                  )}
                  {quote.client.emails?.[0]?.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {quote.client.emails[0].address}
                    </div>
                  )}
                </div>
              )}

              {/* Property */}
              {quote.property?.address?.street1 && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>
                    {quote.property.address.street1}
                    {quote.property.address.city && `, ${quote.property.address.city}`}
                    {quote.property.address.province && `, ${quote.property.address.province}`}
                    {quote.property.address.postalCode && ` ${quote.property.address.postalCode}`}
                  </span>
                </div>
              )}

              {/* Amounts */}
              {quote.amounts && (
                <div className="rounded-lg bg-secondary/30 border border-border p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Amounts</p>
                  <div className="space-y-2">
                    {quote.amounts.subtotal != null && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium text-foreground">{formatMoney(quote.amounts.subtotal)}</span>
                      </div>
                    )}
                    {quote.amounts.depositAmount != null && quote.amounts.depositAmount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Deposit</span>
                        <span className="font-medium text-foreground">{formatMoney(quote.amounts.depositAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t border-border pt-2 mt-1">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-primary">{formatMoney(quote.amounts.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Line Items */}
              {quote.lineItems?.nodes?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Line Items</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-secondary/20 border-b border-border">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Price</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.lineItems.nodes.map((item: any, i: number) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-foreground">{item.name || "—"}</p>
                              {item.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">
                              {item.quantity ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">
                              {item.unitPrice != null ? formatMoney(item.unitPrice) : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-foreground">
                              {item.quantity != null && item.unitPrice != null
                                ? formatMoney(item.quantity * item.unitPrice)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Message / Notes */}
              {quote.message && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notes / Message</p>
                  <p className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-3 whitespace-pre-wrap">
                    {quote.message}
                  </p>
                </div>
              )}

              {/* Created date */}
              <p className="text-[11px] text-muted-foreground">
                Created {formatDate(quote.createdAt)}
              </p>
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isLoading && quote && (
          <div className="shrink-0 border-t border-border px-5 py-4 space-y-2">
            {/* Linked lead badge or Link to Lead button */}
            {linkedLead ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/25 rounded-md">
                <User className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="text-[11px] text-green-300 font-medium truncate">
                  Linked: {linkedLead.name}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">Lead</span>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowLinkLeadPicker(p => !p)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-muted-foreground border border-border hover:border-primary hover:text-primary transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  {showLinkLeadPicker ? "Cancel" : "Link to Lead"}
                </button>
                {showLinkLeadPicker && (
                  <div className="border border-border rounded-md overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-secondary/20">
                      <input
                        type="text"
                        placeholder="Search leads..."
                        value={leadPickerSearch}
                        onChange={e => setLeadPickerSearch(e.target.value)}
                        className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredLeads.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-muted-foreground text-center">No unlinked leads found</p>
                      ) : (
                        filteredLeads.map((l: any) => (
                          <button
                            key={l.id}
                            onClick={() => linkQuoteToLead.mutate({
                              leadId: l.id,
                              jobberQuoteId: quoteId,
                              jobberQuoteNumber: quote.quoteNumber != null ? Number(quote.quoteNumber) : undefined,
                              estimateAmount: quote.amounts?.total != null ? Number(quote.amounts.total) : undefined,
                            })}
                            disabled={linkQuoteToLead.isPending}
                            className="w-full flex items-start gap-2 px-3 py-2 hover:bg-secondary/40 transition-colors text-left border-b border-border last:border-0 disabled:opacity-50"
                          >
                            <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{l.name}</p>
                              {l.address && <p className="text-[10px] text-muted-foreground truncate">{l.address}</p>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Open in Jobber — for DRAFT or CHANGES_REQUESTED, opens quote in Jobber to send natively */}
            {(quote.quoteStatus === "DRAFT" || quote.quoteStatus === "CHANGES_REQUESTED") && (
              <button
                onClick={() => openInJobber(quote.id)}
                disabled={isOpeningJobber}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-70"
              >
                {isOpeningJobber ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                {isOpeningJobber ? "Opening..." : "Open in Jobber"}
              </button>
            )}

            {/* Mark as Approved — show for SENT quotes */}
            {quote.quoteStatus === "SENT" && (
              <button
                onClick={() => markApproved.mutate({ id: quote.id })}
                disabled={markApproved.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {markApproved.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                {markApproved.isPending ? "Approving & Creating Job..." : "Approve & Create Job"}
              </button>
            )}

            {/* Restore — show for ARCHIVED quotes */}
            {quote.quoteStatus === "ARCHIVED" && (
              <button
                onClick={() => restoreQuote.mutate({ id: quote.id })}
                disabled={restoreQuote.isPending}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-yellow-600 hover:bg-yellow-700 transition-colors disabled:opacity-50"
              >
                {restoreQuote.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArchiveRestore className="w-3.5 h-3.5" />
                )}
                Restore to Draft
              </button>
            )}

            {/* Convert to Job — only shown if no job has been auto-created yet */}
            {(quote.quoteStatus === "APPROVED" || quote.quoteStatus === "SENT") && !followUp?.jobberJobNumber && (
              <button
                ref={convertToJobRef}
                onClick={() => openInJobber(quote.id)}
                disabled={isOpeningJobber}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isOpeningJobber ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Briefcase className="w-3.5 h-3.5" />
                )}
                {isOpeningJobber ? "Opening..." : "Open in Jobber"}
                {!isOpeningJobber && <ExternalLink className="w-3 h-3 opacity-70" />}
              </button>
            )}
            {/* View Job — shown when a job was auto-created from this quote */}
            {followUp?.jobberJobNumber && followUp?.jobberJobId && (
              <button
                onClick={() => openJobInJobber(followUp.jobberJobId!)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5" />
                View Job #{followUp.jobberJobNumber} in Jobber
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  onDelete(quote);
                  onClose();
                }}
                disabled={isDeletePending}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {isDeletePending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeletePending ? "Deleting..." : "Delete"}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => duplicateQuote.mutate({ id: quote.id })}
                  disabled={duplicateQuote.isPending}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                >
                  {duplicateQuote.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Duplicate
                </button>
                <button
                  onClick={() => onEdit(quote)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                {hasActiveFollowUp ? (
                  <button
                    onClick={() => clearFollowUp.mutate({ jobberQuoteId: quoteId })}
                    disabled={clearFollowUp.isPending}
                    className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
                    title="Mark follow-up as done"
                  >
                    {clearFollowUp.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    Clear Follow-up
                  </button>
                ) : (
                  <button
                    onClick={() => openInJobber(quote.id)}
                    disabled={isOpeningJobber}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {isOpeningJobber ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3 h-3" />
                    )}
                    {isOpeningJobber ? "Opening..." : "Open in Jobber"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Create Quote Modal ───────────────────────────────────────────────────────
type ServiceItem = {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  unitCost: number;
  category: string;
  taxable: boolean;
  active: boolean;
};
 type LineItem = {
  jobberLineItemId?: string; // present when editing an existing line item
  productOrServiceId?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  itemDiscountType?: "percent" | "flat";
  itemDiscountValue?: number;
};
type ClientNode = {
  id: string;
  name?: string | null;
  companyName?: string | null;
  emails?: Array<{ address: string }> | null;
  phones?: Array<{ number: string }> | null;
};

// ─── Edit Quote Modal ─────────────────────────────────────────────────────────

type EditQuoteProps = {
  quoteId: string;
  initialTitle: string;
  initialMessage: string;
  initialLineItems: LineItem[];
  onClose: () => void;
  onSaved: () => void;
};

function EditQuoteModal({ quoteId, initialTitle, initialMessage, initialLineItems, onClose, onSaved }: EditQuoteProps) {
  const [title, setTitle] = useState(initialTitle);
  const [message, setMessage] = useState(initialMessage);
  const [lineItems, setLineItems] = useState<LineItem[]>(initialLineItems);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  const { data: services, isLoading: servicesLoading } = trpc.jobber.fetchServicesFromManager.useQuery(
    undefined,
    { retry: false }
  );

  const updateQuote = trpc.jobber.quoteUpdate.useMutation();
  const addLineItem = trpc.jobber.quoteLineItemAdd.useMutation();
  const deleteLineItem = trpc.jobber.quoteLineItemDelete.useMutation();

  const activeServices: ServiceItem[] = useMemo(() => {
    const all = (services as ServiceItem[] | undefined) ?? [];
    const q = serviceSearch.toLowerCase();
    return all.filter((s) => s.active && (!q || s.name.toLowerCase().includes(q)));
  }, [services, serviceSearch]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  function addServiceAsLineItem(svc: ServiceItem) {
    setLineItems((prev) => [
      ...prev,
      { name: svc.name, description: svc.description, quantity: 1, unitPrice: svc.unitPrice },
    ]);
    setShowServicePicker(false);
    setServiceSearch("");
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addBlankLineItem() {
    setLineItems((prev) => [...prev, { name: "", description: "", quantity: 1, unitPrice: 0 }]);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Enter a quote title."); return; }
    if (lineItems.length === 0) { toast.error("Add at least one line item."); return; }
    const invalid = lineItems.find((item) => !item.name.trim());
    if (invalid) { toast.error("All line items must have a name."); return; }

    setSaving(true);
    try {
      // 1. Update title and message
      await updateQuote.mutateAsync({ id: quoteId, title: title.trim(), message: message.trim() });

      // 2. Delete all existing line items that were originally on the quote
      const toDelete = initialLineItems.filter((li) => li.jobberLineItemId);
      for (const li of toDelete) {
        await deleteLineItem.mutateAsync({ lineItemId: li.jobberLineItemId! });
      }

      // 3. Add all current line items fresh
      for (const item of lineItems) {
        await addLineItem.mutateAsync({
          quoteId,
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      }

      toast.success("Quote updated in Jobber.");
      utils.jobber.quoteDetail.invalidate({ id: quoteId });
      utils.jobber.quotes.invalidate();
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save quote.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Edit Quote</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quote Title *</label>
            <input
              type="text"
              placeholder="e.g. Forestry Mulching — 5 Acres, Smith Property"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message (optional)</label>
            <textarea
              placeholder="Notes or message to include on the quote..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Line Items *</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowServicePicker((v) => !v)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  From Services
                </button>
                <button
                  onClick={addBlankLineItem}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Custom
                </button>
              </div>
            </div>

            {showServicePicker && (
              <div className="rounded-lg border border-border bg-card mb-3 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="pl-7 h-7 text-xs bg-secondary/30 border-border"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {servicesLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-3">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading services…
                    </div>
                  ) : activeServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No services found.</p>
                  ) : (
                    activeServices.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => addServiceAsLineItem(svc)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors border-b border-border last:border-0 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{svc.name}</p>
                          {svc.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{svc.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-primary shrink-0">{formatMoney(svc.unitPrice)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {lineItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No line items. Add from your services or enter a custom item.
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-secondary/10 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          placeholder="Item name *"
                          value={item.name}
                          onChange={(e) => updateLineItem(idx, "name", e.target.value)}
                          className="h-7 text-xs bg-secondary/30 border-border"
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                          className="h-7 text-xs bg-secondary/30 border-border"
                        />
                      </div>
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="text-muted-foreground hover:text-red-400 transition-colors mt-0.5 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <label className="text-[11px] text-muted-foreground">Qty</label>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 1)}
                          className="w-16 h-7 rounded-md border border-border bg-secondary/30 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-[11px] text-muted-foreground">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">$</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-24 h-7 rounded-md border border-border bg-secondary/30 pl-5 pr-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="ml-auto text-xs font-medium text-foreground">
                        = {formatMoney(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {lineItems.length > 0 && (
              <div className="flex justify-end mt-2">
                <p className="text-xs text-muted-foreground">
                  Subtotal: <span className="font-semibold text-foreground">{formatMoney(subtotal)}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">Saves changes directly to Jobber.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !title.trim() || lineItems.length === 0}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Quote Modal ────────────────────────────────────────────────────────

type CreateQuoteModalProps = {
  onClose: () => void;
  onCreated: (result?: { quoteId?: string; quoteNumber?: number }) => void;
  prefill?: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    jobType?: string;
    leadId?: number;
    message?: string;
    lineItems?: { name: string; description: string; quantity: number; unitPrice: number }[];
  };
};

// ─── AI Quote Assistant Panel ─────────────────────────────────────────────────

type AIAssistPanelProps = {
  onClose: () => void;
  clientName?: string;
  onApply: (result: {
    title: string;
    message: string;
    lineItems: { name: string; description: string; quantity: number; unitPrice: number }[];
  }) => void;
};

// ─── AI Assist field option lists ───────────────────────────────────────────
const TN_COUNTIES_AI = [
  "Bedford","Benton","Bledsoe","Blount","Bradley","Campbell","Cannon","Carroll",
  "Carter","Cheatham","Chester","Claiborne","Clay","Cocke","Coffee","Crockett",
  "Cumberland","Davidson","Decatur","DeKalb","Dickson","Dyer","Fayette","Fentress",
  "Franklin","Gibson","Giles","Grainger","Greene","Grundy","Hamblen","Hamilton",
  "Hancock","Hardeman","Hardin","Hawkins","Haywood","Henderson","Henry","Hickman",
  "Houston","Humphreys","Jackson","Jefferson","Johnson","Knox","Lake","Lauderdale",
  "Lawrence","Lewis","Lincoln","Loudon","McMinn","McNairy","Macon","Madison",
  "Marion","Marshall","Maury","Meigs","Monroe","Montgomery","Moore","Morgan",
  "Obion","Overton","Perry","Pickett","Polk","Putnam","Rhea","Roane","Robertson",
  "Rutherford","Scott","Sequatchie","Sevier","Shelby","Smith","Stewart","Sullivan",
  "Sumner","Tipton","Trousdale","Unicoi","Union","Van Buren","Warren","Washington",
  "Wayne","Weakley","White","Williamson","Wilson",
];
const VEGETATION_OPTIONS = [
  "Light brush / grass",
  "Moderate brush",
  "Heavy brush",
  "Light cedar",
  "Heavy cedar",
  "Cedar and privet mix",
  "Mixed hardwood saplings",
  "Thick briars and vines",
  "Overgrown fence line",
  "Young pine thicket",
  "Mixed cedar and hardwood",
  "Honeysuckle and invasives",
];
const TERRAIN_OPTIONS = [
  "Flat",
  "Gently rolling",
  "Rolling",
  "Steep slopes",
  "Mixed flat and rolling",
  "Mixed rolling and steep",
  "Creek bottom / low-lying",
  "Hilltop / ridge",
];
const OBSTACLE_OPTIONS = [
  "None",
  "Fence lines",
  "Fence lines and structures",
  "Stumps",
  "Stumps and rock",
  "Standing water / wet areas",
  "Structures nearby",
  "Utilities overhead",
  "Rock outcroppings",
  "Multiple obstacles — see notes",
];

function AIAssistPanel({ onClose, clientName, onApply }: AIAssistPanelProps) {
  // Structured fields
  const [fieldCounty, setFieldCounty] = useState("");
  const [fieldAcreage, setFieldAcreage] = useState("");
  const [fieldVegetation, setFieldVegetation] = useState("");
  const [fieldTerrain, setFieldTerrain] = useState("");
  const [fieldObstacles, setFieldObstacles] = useState("");
  const [fieldCustomerWants, setFieldCustomerWants] = useState("");
  // Legacy context (kept for satellite analysis append)
  const [context, setContext] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Priority 5: Satellite Property Analysis
  const [satAddress, setSatAddress] = useState("");
  const [satResult, setSatResult] = useState<string | null>(null);
  const [satMapUrl, setSatMapUrl] = useState<string | null>(null);
  const satelliteAnalyze = trpc.ops.analyzePropertySatellite.useMutation({
    onSuccess: (data: any) => {
      setSatResult(data.analysis);
      setSatMapUrl(data.mapUrl ?? null);
      if (data.analysis) {
        setContext(prev => prev ? `${prev}\n\nSatellite analysis: ${data.analysis}` : `Satellite analysis: ${data.analysis}`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Satellite analysis failed."),
  });

  const aiAssist = trpc.ops.quotes.aiAssistQuote.useMutation({
    onError: (err) => toast.error(err.message || "AI assist failed. Try again."),
    onSuccess: (data) => {
      // Seed editable draft lines from AI result
      setEditableDraftLines(data.lineItems.map((li) => ({
        name: li.name ?? "",
        description: li.description ?? "",
        quantity: Math.max(0.01, parseFloat(String(li.quantity)) || 1),
        unitPrice: Math.max(0, parseFloat(String(li.unitPrice)) || 0),
      })));
    },
  });
  const [editableDraftLines, setEditableDraftLines] = useState<Array<{ name: string; description: string; quantity: number; unitPrice: number }>>([]);

  function updateDraftLine(idx: number, field: string, value: string | number) {
    setEditableDraftLines((prev) => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const toUpload = Array.from(files).slice(0, 6 - imageUrls.length);
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} exceeds 10 MB`); continue; }
      setUploadingIdx(i);
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const resp = await fetch("/api/gallery/upload-base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ base64, mimeType: file.type, filename: file.name }),
        });
        if (!resp.ok) throw new Error("Upload failed");
        const { url } = await resp.json() as { url: string };
        setImageUrls(prev => [...prev, url]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploadingIdx(null);
      }
    }
  }

  // Build the context string from structured fields + free-form customer wants
  function buildContext(): string {
    const parts: string[] = [];
    if (fieldCounty) parts.push(`Location: ${fieldCounty} County, TN`);
    if (fieldAcreage) parts.push(`Approximate acreage: ${fieldAcreage} acres`);
    if (fieldVegetation) parts.push(`Vegetation type and density: ${fieldVegetation}`);
    if (fieldTerrain) parts.push(`Terrain: ${fieldTerrain}`);
    if (fieldObstacles) parts.push(`Obstacles: ${fieldObstacles}`);
    if (fieldCustomerWants.trim()) parts.push(`What the customer wants done: ${fieldCustomerWants.trim()}`);
    if (context.trim()) parts.push(context.trim()); // satellite analysis appended here
    return parts.join("\n");
  }

  async function handleRun() {
    const builtContext = buildContext();
    if (builtContext.trim().length < 10) { toast.error("Fill in at least a county and acreage to get started."); return; }
    await aiAssist.mutateAsync({ context: builtContext.trim(), imageUrls, clientName });
    // Result is stored in aiAssist.data — user reviews it, then clicks "Apply to Quote"
  }

  function handleApply() {
    if (!aiAssist.data) return;
    const serviceLabel: Record<string, string> = {
      "forestry-mulching": "Forestry Mulching",
      "land-management": "Land Management",
      "brush-hogging": "Brush Hogging",
      "right-of-way-clearing": "Right-of-Way Clearing",
      "vegetation-management": "Vegetation Management",
    };
    const svcName = serviceLabel[aiAssist.data.inferredService] ?? aiAssist.data.inferredService;
    const acresLabel = aiAssist.data.inferredAcres > 0 ? ` — ${aiAssist.data.inferredAcres} Acres` : "";
    onApply({
      title: `${svcName}${acresLabel}`,
      message: aiAssist.data.quoteMessage,
      lineItems: editableDraftLines.length > 0
        ? editableDraftLines
        : aiAssist.data.lineItems.map((li) => ({
            name: li.name ?? "",
            description: li.description ?? "",
            quantity: Math.max(0.01, parseFloat(String(li.quantity)) || 1),
            unitPrice: Math.max(0, parseFloat(String(li.unitPrice)) || 0),
          })),
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">AI Quote Assistant</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">Describe the job — AI will draft the quote</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Structured Job Description */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Job Description <span className="text-destructive">*</span>
            </label>

            {/* Row 1: County + Acreage */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Location / County</p>
                <Select value={fieldCounty} onValueChange={setFieldCounty}>
                  <SelectTrigger className="h-8 text-xs bg-secondary/20 border-border">
                    <SelectValue placeholder="Select county..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TN_COUNTIES_AI.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c} County</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium">Approximate Acreage</p>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  placeholder="e.g. 5"
                  value={fieldAcreage}
                  onChange={(e) => setFieldAcreage(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-secondary/20 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Row 2: Vegetation */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Vegetation Type and Density</p>
              <Select value={fieldVegetation} onValueChange={setFieldVegetation}>
                <SelectTrigger className="h-8 text-xs bg-secondary/20 border-border">
                  <SelectValue placeholder="Select vegetation type..." />
                </SelectTrigger>
                <SelectContent>
                  {VEGETATION_OPTIONS.map((v) => (
                    <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Terrain */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Terrain</p>
              <Select value={fieldTerrain} onValueChange={setFieldTerrain}>
                <SelectTrigger className="h-8 text-xs bg-secondary/20 border-border">
                  <SelectValue placeholder="Select terrain type..." />
                </SelectTrigger>
                <SelectContent>
                  {TERRAIN_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 4: Obstacles */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">Obstacles</p>
              <Select value={fieldObstacles} onValueChange={setFieldObstacles}>
                <SelectTrigger className="h-8 text-xs bg-secondary/20 border-border">
                  <SelectValue placeholder="Select obstacles..." />
                </SelectTrigger>
                <SelectContent>
                  {OBSTACLE_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 5: What the customer wants done — free form */}
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium">What the Customer Wants Done <span className="text-destructive">*</span></p>
              <textarea
                placeholder={`Describe the customer's goal in plain language. e.g. "Mulch everything clean, leave the big oaks, clear the fence line on the south side."`}
                value={fieldCustomerWants}
                onChange={(e) => setFieldCustomerWants(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Priority 5: Satellite Property Analysis */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Satellite Analysis <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional — enter property address)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="123 Farm Rd, Hickman County, TN"
                value={satAddress}
                onChange={e => setSatAddress(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => { if (satAddress.trim()) satelliteAnalyze.mutate({ address: satAddress.trim() }); }}
                disabled={!satAddress.trim() || satelliteAnalyze.isPending}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {satelliteAnalyze.isPending ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing</> : <><Globe className="w-3 h-3" />Analyze</>}
              </button>
            </div>
            {satMapUrl && (
              <img src={satMapUrl} alt="Satellite view" className="w-full rounded-lg border border-border object-cover max-h-40" />
            )}
            {satResult && (
              <div className="rounded-lg bg-secondary/20 border border-border p-3">
                <p className="text-xs text-foreground leading-relaxed">{satResult}</p>
                <p className="text-[11px] text-primary mt-1">Analysis appended to job description above.</p>
              </div>
            )}
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Site Photos <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional — up to 6)</span>
            </label>
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-video bg-secondary/20">
                    <img src={url} alt={`Site photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageUrls.length < 6 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingIdx !== null}
                className="w-full rounded-lg border border-dashed border-border bg-secondary/10 hover:bg-secondary/20 transition-colors py-4 flex flex-col items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                {uploadingIdx !== null ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Uploading…</span></>
                ) : (
                  <><Image className="w-5 h-5" /><span className="text-xs">Click to add site photos</span><span className="text-[11px] text-muted-foreground/60">JPG, PNG, WEBP — up to 10 MB each</span></>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
          </div>

          {/* Result preview */}
          {aiAssist.data && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-semibold text-foreground">AI Draft Ready</p>
                <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  aiAssist.data.confidence === "high" ? "bg-green-500/20 text-green-400" :
                  aiAssist.data.confidence === "medium" ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                }`}>{aiAssist.data.confidence} confidence</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground"><span className="text-foreground font-medium">Service:</span> {aiAssist.data.inferredService} — {aiAssist.data.inferredAcres} acres, {aiAssist.data.inferredDensity} density, {aiAssist.data.inferredTerrain} terrain</p>
                <p className="text-muted-foreground"><span className="text-foreground font-medium">Price range:</span> ${aiAssist.data.priceLow.toLocaleString()} – ${aiAssist.data.priceHigh.toLocaleString()}{aiAssist.data.estimatedDays ? ` · ${aiAssist.data.estimatedDays} day${aiAssist.data.estimatedDays !== 1 ? "s" : ""} on site` : ""}</p>
                <p className="text-muted-foreground"><span className="text-foreground font-medium">Scope:</span> {aiAssist.data.scopeNotes}</p>
                {aiAssist.data.riskFlags.length > 0 && (
                  <div className="flex items-start gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-amber-400/90 text-[11px]">{aiAssist.data.riskFlags.join(" · ")}</p>
                  </div>
                )}
                {aiAssist.data.siteVisitRequired && (
                  <p className="text-amber-400 text-[11px] font-medium">Site visit required before finalizing price.</p>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  {editableDraftLines.length} Line Items — <span className="normal-case font-normal">edit before applying</span>
                </p>
                <div className="space-y-2">
                  {editableDraftLines.map((li, i) => (
                    <div key={i} className="rounded-md border border-border/60 bg-secondary/10 p-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={li.name}
                          onChange={(e) => updateDraftLine(i, "name", e.target.value)}
                          placeholder="Item name"
                          className="flex-1 h-6 rounded border border-border bg-secondary/20 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] text-muted-foreground whitespace-nowrap">Qty</label>
                        <input
                          type="number" min="0.01" step="0.01"
                          value={li.quantity}
                          onChange={(e) => updateDraftLine(i, "quantity", parseFloat(e.target.value) || 1)}
                          className="w-14 h-6 rounded border border-border bg-secondary/20 px-2 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <label className="text-[10px] text-muted-foreground whitespace-nowrap">Unit $</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={li.unitPrice}
                          onChange={(e) => updateDraftLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="w-20 h-6 rounded border border-border bg-secondary/20 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="ml-auto text-xs font-medium text-foreground">
                          ${(li.quantity * li.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">Draft total</span>
                  <span className="text-xs font-bold text-foreground">
                    ${editableDraftLines.reduce((s, li) => s + li.quantity * li.unitPrice, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">AI will populate the quote form. You can edit before creating.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={aiAssist.isPending}>Cancel</Button>
            {aiAssist.data ? (
              <Button size="sm" onClick={handleRun} variant="outline" disabled={aiAssist.isPending} className="gap-1.5">
                {aiAssist.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running…</> : <><RefreshCw className="w-3.5 h-3.5" />Re-run</>}
              </Button>
            ) : null}
            {aiAssist.data ? (
              <Button size="sm" onClick={handleApply} className="gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Apply to Quote
              </Button>
            ) : (
              <Button size="sm" onClick={handleRun} disabled={aiAssist.isPending || context.trim().length < 10} className="gap-1.5 min-w-[110px]">
                {aiAssist.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing…</> : <><Sparkles className="w-3.5 h-3.5" />Generate Draft</>}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Create Quote Modal ────────────────────────────────────────────────────────

function CreateQuoteModal({ onClose, onCreated, prefill }: CreateQuoteModalProps) {
  const linkQuoteToLead = trpc.ops.linkQuoteToLead.useMutation();
  const [title, setTitle] = useState(() => {
    if (prefill?.jobType) return prefill.jobType;
    return "";
  });
  const [message, setMessage] = useState(() => prefill?.message ?? "");
  const [clientSearch, setClientSearch] = useState(() => prefill?.clientName ?? "");
  const [selectedClient, setSelectedClient] = useState<ClientNode | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>(() =>
    prefill?.lineItems?.map((li) => ({
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
    })) ?? []
  );
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const autoSelectedRef = useRef(false);

  const { data: clientsData, isLoading: clientsLoading } = trpc.jobber.clients.useQuery(
    { first: 200 },
    { retry: false }
  );
  const { data: services, isLoading: servicesLoading } = trpc.jobber.fetchServicesFromManager.useQuery(
    undefined,
    { retry: false }
  );

  const createQuote = trpc.jobber.quoteCreate.useMutation({
    onSuccess: (quote) => {
      const qId = (quote as any)?.id as string | undefined;
      const qNum = (quote as any)?.quoteNumber as number | undefined;
      toast.success(`Quote #${qNum ?? ""} created in Jobber.`);
      // Link the quote back to the originating lead if one was passed in
      if (prefill?.leadId && qId) {
        // Compute total from line items so the amount is stored immediately
        const computedTotal = lineItems.reduce((sum, li) => {
          const qty = Number(li.quantity) || 0;
          const price = Number(li.unitPrice) || 0;
          return sum + qty * price;
        }, 0);
        linkQuoteToLead.mutate({
          leadId: prefill.leadId,
          jobberQuoteId: qId,
          jobberQuoteNumber: qNum,
          estimateAmount: computedTotal > 0 ? computedTotal : undefined,
        });
      }
      onCreated({ quoteId: qId, quoteNumber: qNum });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create quote.");
    },
  });

  const clients: ClientNode[] = (clientsData as any)?.nodes ?? [];
  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients
      .filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.companyName ?? "").toLowerCase().includes(q) ||
          (c.emails?.[0]?.address ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [clients, clientSearch]);

  const activeServices: ServiceItem[] = useMemo(() => {
    const all = (services as ServiceItem[] | undefined) ?? [];
    const q = serviceSearch.toLowerCase();
    return all.filter((s) => s.active && (!q || s.name.toLowerCase().includes(q)));
  }, [services, serviceSearch]);

  // Auto-select the first matching client when prefill name is provided and clients have loaded
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!prefill?.clientName) return;
    if (clientsLoading || clients.length === 0) return;
    const match = filteredClients[0];
    if (match) {
      setSelectedClient(match);
      setClientSearch("");
      autoSelectedRef.current = true;
    }
  }, [prefill?.clientName, clientsLoading, filteredClients, clients.length]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const [selectedCounty, setSelectedCounty] = useState("");
  const [taxableLineItems, setTaxableLineItems] = useState<Set<number>>(new Set());
  const [discountType, setDiscountType] = useState<"percent" | "flat">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState("");
  const [discountReasonOpen, setDiscountReasonOpen] = useState(false);
  const [showMapDrawer, setShowMapDrawer] = useState(false);
  const [measuredAcres, setMeasuredAcres] = useState<number | null>(null);
  const [savedPolygon, setSavedPolygon] = useState<google.maps.LatLngLiteral[] | undefined>(undefined);
  // Per-item discount helper
  function itemLineTotal(item: LineItem): number {
    const base = item.quantity * item.unitPrice;
    if (!item.itemDiscountValue) return base;
    const d = item.itemDiscountType === "percent"
      ? base * Math.min(100, Math.max(0, item.itemDiscountValue)) / 100
      : Math.min(base, Math.max(0, item.itemDiscountValue));
    return base - d;
  }
  const subtotalAfterItemDiscounts = lineItems.reduce((sum, item) => sum + itemLineTotal(item), 0);
  const discountAmount = discountType === "percent"
    ? subtotalAfterItemDiscounts * Math.min(100, Math.max(0, discountValue)) / 100
    : Math.min(subtotalAfterItemDiscounts, Math.max(0, discountValue));
  const discountedSubtotal = subtotalAfterItemDiscounts - discountAmount;
  const taxRate = selectedCounty ? (TN_COUNTY_TAX_RATES[selectedCounty]?.totalTax ?? 0) : 0;
  const taxableSubtotal = lineItems.reduce((sum, item, idx) =>
    taxableLineItems.has(idx) ? sum + itemLineTotal(item) : sum, 0) - discountAmount;
  const taxAmount = Math.max(0, taxableSubtotal) * taxRate;
  const grandTotal = discountedSubtotal + taxAmount;

  function addServiceAsLineItem(svc: ServiceItem) {
    setLineItems((prev) => [
      ...prev,
      {
        productOrServiceId: svc.id,
        name: svc.name,
        description: svc.description,
        quantity: 1,
        unitPrice: svc.unitPrice,
      },
    ]);
    setShowServicePicker(false);
    setServiceSearch("");
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function removeLineItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addBlankLineItem() {
    setLineItems((prev) => [...prev, { name: "", description: "", quantity: 1, unitPrice: 0 }]);
  }

  function handleSubmit() {
    if (!selectedClient) { toast.error("Select a client."); return; }
    if (!title.trim()) { toast.error("Enter a quote title."); return; }
    if (lineItems.length === 0) { toast.error("Add at least one line item."); return; }
    const invalid = lineItems.find((item) => !item.name.trim());
    if (invalid) { toast.error("All line items must have a name."); return; }
    createQuote.mutate({
      clientId: selectedClient.id,
      title: title.trim(),
      message: message.trim() || undefined,
      lineItems: lineItems.map((item) => ({
        name: item.name,
        description: item.description || undefined,
        quantity: Math.max(0.01, parseFloat(String(item.quantity)) || 1),
        unitPrice: Math.max(0, parseFloat(String(item.unitPrice)) || 0),
        productOrServiceId: item.productOrServiceId,
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── AI Assist overlay ── */}
        {showAIAssist && (
          <AIAssistPanel
            clientName={selectedClient?.name || selectedClient?.companyName || clientSearch || undefined}
            onClose={() => setShowAIAssist(false)}
            onApply={({ title: aiTitle, message: aiMessage, lineItems: aiItems }) => {
              setTitle(aiTitle);
              setMessage(aiMessage);
              setLineItems(aiItems.map(li => ({ name: li.name, description: li.description, quantity: li.quantity, unitPrice: li.unitPrice })));
              setShowAIAssist(false);
              toast.success("AI draft applied. Review and adjust before creating.");
            }}
          />
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <PlusCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground leading-tight">New Quote</h3>
              <p className="text-[11px] text-muted-foreground leading-tight">Draft will be created in Jobber</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIAssist(true)}
              className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Assist
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Body: two-column ── */}
        <div className="flex-1 overflow-hidden flex min-h-0">

          {/* Left column — client, title, message */}
          <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-y-auto bg-secondary/10">
            {/* Client section */}
            <div className="px-5 pt-5 pb-4 border-b border-border space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Client</p>
              {selectedClient ? (
                <div className="rounded-lg bg-card border border-border px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selectedClient.name || selectedClient.companyName || "—"}
                    </p>
                    {selectedClient.emails?.[0]?.address && (
                      <p className="text-[11px] text-muted-foreground truncate">{selectedClient.emails[0].address}</p>
                    )}
                    {selectedClient.phones?.[0]?.number && (
                      <p className="text-[11px] text-muted-foreground">{selectedClient.phones[0].number}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                    aria-label="Change client"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-card border-border"
                    />
                  </div>
                  {clientsLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : filteredClients.length > 0 ? (
                    <div className="rounded-lg border border-border bg-card max-h-44 overflow-y-auto divide-y divide-border">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors"
                        >
                          <p className="text-xs font-medium text-foreground">{c.name || c.companyName || "—"}</p>
                          {c.emails?.[0]?.address && (
                            <p className="text-[11px] text-muted-foreground">{c.emails[0].address}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : clientSearch ? (
                    <p className="text-xs text-muted-foreground py-1">No clients found.</p>
                  ) : null}
                </div>
              )}
            </div>

                        {/* Title section */}
            <div className="px-5 pt-4 pb-4 border-b border-border space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Quote Title <span className="text-destructive">*</span></p>
              <Input
                placeholder="e.g. Forestry Mulching — 5 Acres"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs bg-card border-border"
              />
            </div>
            {/* Property Map section */}
            <div className="px-5 pt-4 pb-4 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Property Map</p>
                <div className="flex items-center gap-2">
                  {measuredAcres !== null && (
                    <span className="text-[10px] text-primary font-medium">{measuredAcres.toFixed(2)} acres measured</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMapDrawer((v) => !v)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {showMapDrawer ? "Hide map" : measuredAcres !== null ? "Edit" : "Measure acreage"}
                  </button>
                </div>
              </div>
              {showMapDrawer && (
                <PropertyMapDrawer
                  initialAddress={selectedClient ? [selectedClient.name, selectedClient.companyName].filter(Boolean).join(" ") + " Tennessee" : undefined}
                  initialPolygon={savedPolygon}
                  onApply={(acres, polygon) => {
                    setMeasuredAcres(acres);
                    setSavedPolygon(polygon);
                    // Auto-update title if it doesn't already mention acreage
                    setTitle((prev) => {
                      if (!prev) return `Forestry Mulching — ${acres.toFixed(2)} Acres`;
                      // Replace existing acreage mention if present
                      const updated = prev.replace(/\d+(\.\d+)?\s*[Aa]cres?/, `${acres.toFixed(2)} Acres`);
                      if (updated !== prev) return updated;
                      // Append if no acreage found
                      return `${prev} — ${acres.toFixed(2)} Acres`;
                    });
                    toast.success(`${acres.toFixed(2)} acres applied to quote.`);
                    setShowMapDrawer(false);
                  }}
                />
              )}
            </div>
            {/* Message section */}
            <div className="px-5 pt-4 pb-5 flex-1 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Client Message</p>
              <textarea
                placeholder="Notes or message to include on the quote..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Right column — line items */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Line items header */}
            <div className="px-5 pt-5 pb-3 border-b border-border shrink-0 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Line Items <span className="text-destructive">*</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowServicePicker((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  From Services
                </button>
                <button
                  onClick={addBlankLineItem}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Custom Item
                </button>
              </div>
            </div>

            {/* Service picker */}
            {showServicePicker && (
              <div className="border-b border-border bg-secondary/10 px-5 py-3 shrink-0">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search services..."
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-card border-border"
                    autoFocus
                  />
                </div>
                <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto divide-y divide-border">
                  {servicesLoading ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-3">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading services…
                    </div>
                  ) : activeServices.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3">No services found.</p>
                  ) : (
                    activeServices.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => addServiceAsLineItem(svc)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{svc.name}</p>
                          {svc.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{svc.description}</p>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground shrink-0">
                          {svc.unitPrice > 0 ? `$${svc.unitPrice.toFixed(2)}` : "—"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Line items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {lineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-secondary/40 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No line items yet. Add from your services or enter a custom item.
                  </p>
                </div>
              ) : (
                lineItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-3 space-y-2.5">
                    {/* Row 1: name + remove */}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Item name *"
                        value={item.name}
                        onChange={(e) => updateLineItem(idx, "name", e.target.value)}
                        className="flex-1 h-8 text-xs bg-secondary/20 border-border font-medium"
                      />
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors p-1"
                        aria-label="Remove line item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Row 2: description */}
                    <Input
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                      className="h-7 text-xs bg-secondary/20 border-border text-muted-foreground"
                    />
                    {/* Row 3: qty + unit price + total */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-muted-foreground whitespace-nowrap">Qty</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 1)}
                          className="w-16 h-7 rounded-md border border-border bg-secondary/20 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-muted-foreground whitespace-nowrap">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateLineItem(idx, "unitPrice", isNaN(val) ? 0 : Math.max(0, val));
                            }}
                            className={`w-24 h-7 rounded-md border bg-secondary/20 pl-5 pr-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                              item.unitPrice < 0 ? "border-red-500 ring-1 ring-red-500" : "border-border"
                            }`}
                          />
                          {item.unitPrice < 0 && (
                            <p className="absolute left-0 top-full mt-0.5 text-[10px] text-red-400 whitespace-nowrap">Must be ≥ 0</p>
                          )}
                        </div>
                      </div>
                      <div className="ml-auto text-xs font-semibold text-foreground">
                         {item.itemDiscountValue ? (
                           <span className="line-through text-muted-foreground mr-1">{formatMoney(item.quantity * item.unitPrice)}</span>
                         ) : null}
                         {formatMoney(itemLineTotal(item))}
                       </div>
                     </div>
                     {/* Per-item discount row */}
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] text-muted-foreground whitespace-nowrap">Item discount</span>
                       <div className="flex items-center rounded border border-border overflow-hidden">
                         <button type="button" onClick={() => updateLineItem(idx, "itemDiscountType", "percent")}
                           className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                             (item.itemDiscountType ?? "percent") === "percent" ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                           }`}>%</button>
                         <button type="button" onClick={() => updateLineItem(idx, "itemDiscountType", "flat")}
                           className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                             item.itemDiscountType === "flat" ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                           }`}>$</button>
                       </div>
                       <input
                         type="number" min="0" step="0.01"
                         value={item.itemDiscountValue || ""}
                         placeholder="0"
                         onChange={(e) => updateLineItem(idx, "itemDiscountValue", Math.max(0, parseFloat(e.target.value) || 0))}
                         className="w-20 h-6 rounded border border-border bg-secondary/20 px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                       />
                       {(item.itemDiscountValue ?? 0) > 0 && (
                         <span className="text-[10px] text-green-400 ml-auto">
                           −{formatMoney(item.itemDiscountType === "flat"
                             ? Math.min(item.quantity * item.unitPrice, item.itemDiscountValue ?? 0)
                             : item.quantity * item.unitPrice * Math.min(100, item.itemDiscountValue ?? 0) / 100
                           )}
                         </span>
                       )}
                     </div>
                   </div>
                 ))
               )}
            </div>

            {/* Tax + Total bar */}
            {lineItems.length > 0 && (
              <div className="px-5 py-4 border-t border-border shrink-0 bg-secondary/10 space-y-3">
                {/* County selector */}
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">Property County</label>
                  <select
                    value={selectedCounty}
                    onChange={(e) => { setSelectedCounty(e.target.value); setTaxableLineItems(new Set()); }}
                    className="flex-1 h-7 rounded-md border border-border bg-secondary/20 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Select county for tax reference --</option>
                    {TN_COUNTY_NAMES.map((c) => (
                      <option key={c} value={c}>{c} County — {formatTaxRate(TN_COUNTY_TAX_RATES[c].totalTax)} combined</option>
                    ))}
                  </select>
                </div>

                {/* Taxable line item toggles */}
                {selectedCounty && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Mark taxable line items (materials/equipment only — services on real property are generally exempt):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lineItems.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTaxableLineItems((prev) => {
                            const next = new Set(prev);
                            if (next.has(idx)) next.delete(idx); else next.add(idx);
                            return next;
                          })}
                          className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                            taxableLineItems.has(idx)
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                              : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {item.name || `Item ${idx + 1}`} {taxableLineItems.has(idx) ? "(taxable)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discount */}
                <div className="space-y-2 pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Discount</span>
                    <div className="flex items-center rounded-md border border-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDiscountType("percent")}
                        className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                          discountType === "percent" ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                        }`}
                      >%</button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("flat")}
                        className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                          discountType === "flat" ? "bg-primary text-primary-foreground" : "bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                        }`}
                      >$</button>
                    </div>
                    <div className="relative flex-1">
                      {discountType === "flat" && (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">$</span>
                      )}
                      <input
                        type="number"
                        min="0"
                        max={discountType === "percent" ? 100 : undefined}
                        step="0.01"
                        value={discountValue || ""}
                        placeholder="0"
                        onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        className={`w-full h-7 rounded-md border border-border bg-secondary/20 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                          discountType === "flat" ? "pl-5 pr-2" : "px-2"
                        }`}
                      />
                      {discountType === "percent" && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground pointer-events-none">%</span>
                      )}
                    </div>
                    {discountAmount > 0 && (
                      <span className="text-xs text-green-400 whitespace-nowrap shrink-0">−{formatMoney(discountAmount)}</span>
                    )}
                  </div>
                  {/* Quick-select percentage buttons */}
                  {discountType === "percent" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Quick:</span>
                      {[5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountValue(pct)}
                          className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                            discountValue === pct
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/20 border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >{pct}%</button>
                      ))}
                    </div>
                  )}
                  {/* Reason / promo code — combobox */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">Reason / Code</span>
                    <Popover open={discountReasonOpen} onOpenChange={setDiscountReasonOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={discountReason}
                            placeholder="e.g. Repeat customer, VETERAN10..."
                            onChange={(e) => {
                              setDiscountReason(e.target.value);
                              setDiscountReasonOpen(true);
                            }}
                            onFocus={() => setDiscountReasonOpen(true)}
                            className="w-full h-7 rounded-md border border-border bg-secondary/20 px-2 pr-6 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-0 w-64"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command>
                          <CommandList>
                            <CommandEmpty className="py-2 text-xs text-muted-foreground text-center">
                              Press Enter to use "{discountReason || "custom text"}"
                            </CommandEmpty>
                            <CommandGroup heading="Common promo codes">
                              {[
                                "Repeat customer",
                                "VETERAN10",
                                "Military discount",
                                "Senior discount",
                                "Referral",
                                "Neighbor referral",
                                "First-time customer",
                                "Seasonal promotion",
                                "Bundle discount",
                                "SPRING25",
                                "FALL25",
                              ]
                                .filter((s) =>
                                  !discountReason ||
                                  s.toLowerCase().includes(discountReason.toLowerCase())
                                )
                                .map((suggestion) => (
                                  <CommandItem
                                    key={suggestion}
                                    value={suggestion}
                                    onSelect={() => {
                                      setDiscountReason(suggestion);
                                      setDiscountReasonOpen(false);
                                    }}
                                    className="text-xs cursor-pointer"
                                  >
                                    {suggestion}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{lineItems.length} line item{lineItems.length !== 1 ? "s" : ""} — Subtotal</span>
                    <span className="text-xs font-medium text-foreground">{formatMoney(subtotalAfterItemDiscounts)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Discount ({discountType === "percent" ? `${discountValue}%` : "flat"})
                        {discountReason ? ` — ${discountReason}` : ""}
                      </span>
                      <span className="text-xs text-green-400">−{formatMoney(discountAmount)}</span>
                    </div>
                  )}
                  {selectedCounty && taxAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {selectedCounty} County Tax ({formatTaxRate(taxRate)} — state {formatTaxRate(TN_COUNTY_TAX_RATES[selectedCounty].stateTax)} + local {formatTaxRate(TN_COUNTY_TAX_RATES[selectedCounty].localTax)})
                      </span>
                      <span className="text-xs text-amber-400">{formatMoney(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-foreground">Total</span>
                    <span className="text-sm font-bold text-foreground">{formatMoney(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3 bg-card">
          <p className="text-[11px] text-muted-foreground">Quote will be saved as a Draft in Jobber.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={createQuote.isPending}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview(true)}
              disabled={!selectedClient || !title.trim() || lineItems.length === 0}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createQuote.isPending || !selectedClient || !title.trim() || lineItems.length === 0}
              className="min-w-[110px]"
            >
              {createQuote.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Creating…</>
              ) : (
                "Create Quote"
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* ── Quote Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowPreview(false)}>
          <div
            className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Noland Earthworks, LLC</p>
                  <p className="text-[10px] text-gray-500">Veteran-Owned Land Management • Middle & West Tennessee</p>
                </div>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quote meta */}
            <div className="px-6 pt-5 pb-3 flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Quote for</p>
                <p className="text-base font-semibold text-gray-900">{selectedClient?.name ?? selectedClient?.companyName ?? ""}</p>
                {selectedClient?.emails?.[0]?.address && (
                  <p className="text-xs text-gray-500">{selectedClient.emails[0].address}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Date</p>
                <p className="text-sm text-gray-700">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Draft</p>
              </div>
            </div>

            {/* Title */}
            <div className="px-6 pb-3">
              <p className="text-lg font-bold text-gray-900">{title}</p>
            </div>

            {/* Message */}
            {message.trim() && (
              <div className="px-6 pb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</p>
              </div>
            )}

            {/* Line items table */}
            <div className="px-6 pb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">Service</th>
                    <th className="text-right py-2 text-xs uppercase tracking-wider text-gray-500 font-semibold w-16">Qty</th>
                    <th className="text-right py-2 text-xs uppercase tracking-wider text-gray-500 font-semibold w-24">Unit Price</th>
                    <th className="text-right py-2 text-xs uppercase tracking-wider text-gray-500 font-semibold w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2.5 pr-4">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                      </td>
                      <td className="py-2.5 text-right text-gray-700">{item.quantity}</td>
                      <td className="py-2.5 text-right text-gray-700">{formatMoney(item.unitPrice)}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900">{formatMoney(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal */}
            <div className="px-6 pb-5">
              <div className="flex justify-end">
                <div className="border-t-2 border-gray-900 pt-2 min-w-[180px]">
                  <div className="flex justify-between gap-8">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="text-sm font-bold text-gray-900">{formatMoney(subtotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer note */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <p className="text-[11px] text-gray-500 text-center">This is a preview only. The quote will be saved as a Draft in Jobber before sending to the client.</p>
              <div className="flex justify-center mt-3">
                <Button size="sm" onClick={() => setShowPreview(false)} className="gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI Quote Analysis Result type ──────────────────────────────────────────
type PriceBreakdown = {
  baseRate: number;
  acreage: number;
  rawAcreage?: number;
  minimumEnforced?: boolean;
  densityMultiplier: number;
  terrainMultiplier: number;
  accessMultiplier: number;
  seasonalMultiplier: number;
  complexityMultiplier: number;
  volumeDiscount: number;
  mobilization: number;
  calculatedLow: number;
  calculatedHigh: number;
};
type AIQuoteAnalysis = {
  scopeNotes: string;
  lineItems: { name: string; description: string; quantity: number; unitPrice: number }[];
  priceLow: number;
  priceHigh: number;
  estimatedDays: number | null;
  quoteMessage: string;
  riskFlags: string[];
  siteVisitRequired: boolean;
  confidence: "high" | "medium" | "low";
  priceBreakdown?: PriceBreakdown;
  baseRateSource?: "manual" | "benchmark" | "default";
};

// ─── Website Request Card ─────────────────────────────────────────────────────
type QuoteSubmission = {
  id: number;
  name: string;
  phone: string;
  email: string;
  service: string;
  county: string;
  acreage?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  message?: string | null;
  addOns?: string | null;
  jobberStatus: string;
  createdAt: Date | string;
  aiScore?: string | null;
  aiSummary?: string | null;
  aiFlags?: string | null;
  aiDraftResponse?: string | null;
  parcelOwner?: string | null;
  parcelId?: string | null;
  deedAcres?: number | string | null;
  adjustedAcres?: number | string | null;
  estimatedRange?: string | null;
};

// Progressive status messages shown during AI analysis
const AI_STATUS_MESSAGES = [
  "Reading the request...",
  "Checking acreage and service type...",
  "Applying pricing model...",
  "Assessing terrain and access conditions...",
  "Identifying risk factors...",
  "Building line items...",
  "Drafting quote message...",
  "Finalizing estimate...",
];

function WebsiteRequestCard({
  submission,
  onBuildQuote,
}: {
  submission: QuoteSubmission;
  onBuildQuote: (prefill: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    jobType?: string;
    message?: string;
    lineItems?: { name: string; description: string; quantity: number; unitPrice: number }[];
  }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [analysis, setAnalysis] = useState<AIQuoteAnalysis | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [editedPriceLow, setEditedPriceLow] = useState<number>(0);
  const [editedPriceHigh, setEditedPriceHigh] = useState<number>(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const utils = trpc.useUtils();

  const saveDraft = trpc.ops.quotes.saveDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft saved.");
      setDraftSaved(true);
      utils.ops.quotes.listDrafts.invalidate();
    },
    onError: (err) => toast.error(`Failed to save draft: ${err.message}`),
  });

  // Build full address for satellite imagery
  const fullAddress = [
    submission.street,
    submission.city,
    submission.state ?? "TN",
    submission.zip,
  ].filter(Boolean).join(", ");

  // Fallback to county + TN if no street address
  const satelliteAddress = fullAddress || `${submission.county} County, TN`;
  const hasPreciseAddress = !!(submission.street && submission.city);

  // Fetch satellite imagery — only when the card has an address worth showing
  const { data: satData, isLoading: satLoading } = trpc.ops.quotes.satelliteImage.useQuery(
    { address: satelliteAddress },
    { enabled: hasPreciseAddress, staleTime: 1000 * 60 * 30, retry: false }
  );

  const analyze = trpc.ops.quotes.analyzeSubmission.useMutation({
    onMutate: () => {
      setStatusIdx(0);
      statusTimerRef.current = setInterval(() => {
        setStatusIdx((i) => (i + 1 < AI_STATUS_MESSAGES.length ? i + 1 : i));
      }, 1800);
    },
    onSuccess: (result) => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      setAnalysis(result);
      setEditedMessage(result.quoteMessage);
      setEditedPriceLow(result.priceLow);
      setEditedPriceHigh(result.priceHigh);
      setExpanded(true);
    },
    onError: (err) => {
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      toast.error(`AI analysis failed: ${err.message}`);
    },
  });

  const deleteSubmission = trpc.ops.quotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Request removed.");
      utils.ops.quotes.list.invalidate();
    },
    onError: (err) => toast.error(`Failed to delete: ${err.message}`),
  });

  const address = [submission.street, submission.city, submission.state]
    .filter(Boolean)
    .join(", ");

  const addOnsList: string[] = (() => {
    try { return JSON.parse(submission.addOns ?? "[]"); } catch { return []; }
  })();

  const CONFIDENCE_COLORS: Record<string, string> = {
    high: "text-green-400",
    medium: "text-yellow-400",
    low: "text-red-400",
  };

  function handleBuildQuote() {
    onBuildQuote({
      clientName: submission.name,
      clientPhone: submission.phone,
      clientEmail: submission.email,
      clientAddress: address,
      jobType: analysis
        ? `${submission.service} — ${submission.acreage ?? ""} ${submission.county} County`.trim()
        : submission.service,
      message: analysis ? editedMessage : undefined,
      lineItems: analysis?.lineItems,
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* ── Compact summary row ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/20 transition-colors">
        {/* Expand / collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
            expanded
              ? "bg-primary/15 border-primary/40 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          }`}
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>

        {/* Name + service + county */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{submission.name}</span>
          <span className="text-[11px] text-muted-foreground bg-secondary/40 rounded-full px-2 py-0.5 shrink-0">{submission.service}</span>
          {submission.acreage && (
            <span className="text-[11px] text-muted-foreground shrink-0">{submission.acreage} ac</span>
          )}
          <span className="text-[11px] text-muted-foreground shrink-0">{submission.county} Co.</span>
          {submission.aiScore && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`cursor-default text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    submission.aiScore === "strong"
                      ? "bg-green-500/15 text-green-400 border-green-500/25"
                      : submission.aiScore === "marginal"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                      : "bg-red-500/15 text-red-400 border-red-500/25"
                  }`}>
                    {submission.aiScore.charAt(0).toUpperCase() + submission.aiScore.slice(1)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1.5 p-3">
                  {submission.aiSummary && (
                    <p className="text-foreground">{submission.aiSummary}</p>
                  )}
                  {submission.aiFlags && (() => {
                    let flags: string[] = [];
                    try { flags = JSON.parse(submission.aiFlags); } catch { flags = [submission.aiFlags]; }
                    return flags.length > 0 ? (
                      <ul className="space-y-0.5">
                        {flags.map((f, i) => (
                          <li key={i} className="flex items-start gap-1 text-amber-400">
                            <span className="mt-0.5 shrink-0">&#9654;</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null;
                  })()}
                  {!submission.aiSummary && !submission.aiFlags && (
                    <p className="text-muted-foreground">No reasoning available.</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {analysis && (
            <span className="text-[11px] font-semibold text-green-400 shrink-0">
              ${editedPriceLow.toLocaleString()} – ${editedPriceHigh.toLocaleString()}
            </span>
          )}
        </div>

        {/* Date */}
        <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">
          {new Date(submission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => analyze.mutate({
              service: submission.service,
              county: submission.county,
              acreage: submission.acreage ?? undefined,
              message: submission.message ?? undefined,
              addOns: submission.addOns ?? undefined,
              name: submission.name,
            })}
            disabled={analyze.isPending}
            title={analysis ? "Re-analyze with AI" : "Analyze with AI"}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
          >
            {analyze.isPending ? (
              <><Loader2 className="w-3 h-3 animate-spin" /><span className="hidden sm:inline">{AI_STATUS_MESSAGES[statusIdx]}</span></>
            ) : (
              <><Sparkles className="w-3 h-3" /><span className="hidden sm:inline">{analysis ? "Re-run" : "Analyze"}</span></>
            )}
          </button>
          <button
            onClick={handleBuildQuote}
            title="Build Quote in Jobber"
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <PlusCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Build</span>
          </button>
          <button
            onClick={() => deleteSubmission.mutate({ id: submission.id })}
            disabled={deleteSubmission.isPending}
            className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50"
            title="Remove request"
          >
            {deleteSubmission.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded detail panel — contact info, satellite, and AI analysis */}
      {expanded && (
        <div className="border-t border-border bg-secondary/5 px-4 py-3 space-y-3">
          {/* Contact + address row */}
          <div className="flex items-center gap-4 flex-wrap">
            <a href={`tel:${submission.phone}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
              <Phone className="w-3 h-3" />{submission.phone}
            </a>
            <a href={`mailto:${submission.email}`} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
              <Mail className="w-3 h-3" />{submission.email}
            </a>
            {address && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3" />{address}
              </span>
            )}
          </div>
          {submission.message && (
            <p className="text-[11px] text-muted-foreground italic">"{submission.message}"</p>
          )}
          {addOnsList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {addOnsList.map((a: string) => (
                <span key={a} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{a}</span>
              ))}
            </div>
          )}
          {/* Parcel data row */}
          {(submission.parcelOwner || submission.deedAcres || submission.estimatedRange) && (() => {
            const deedAc = submission.deedAcres != null ? parseFloat(String(submission.deedAcres)) : null;
            const adjAc = submission.adjustedAcres != null ? parseFloat(String(submission.adjustedAcres)) : null;
            return (
              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                {submission.parcelOwner && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Owner:</span>
                    {submission.parcelOwner}
                  </span>
                )}
                {deedAc != null && deedAc > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Deed:</span>
                    {deedAc.toFixed(2)} ac
                    {adjAc != null && Math.abs(adjAc - deedAc) > 0.01 && (
                      <span className="text-[10px] font-semibold bg-orange-500/15 text-orange-400 rounded-full px-2 py-0.5">
                        Adjusted: {adjAc.toFixed(1)} ac
                      </span>
                    )}
                  </span>
                )}
                {submission.estimatedRange && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Est:</span>
                    <span className="text-orange-400 font-medium">{submission.estimatedRange}</span>
                  </span>
                )}
              </div>
            );
          })()}
          {/* Satellite strip */}
          {hasPreciseAddress && (
            <div className="relative w-full h-32 rounded-md bg-secondary/20 overflow-hidden">
              {satLoading && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading satellite view...
                </div>
              )}
              {satData?.url && (
                <>
                  <img
                    src={satData.url}
                    alt={`Satellite view of ${address}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-end justify-between">
                    <span className="text-[10px] text-white/80 truncate">{address}</span>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white transition-colors shrink-0 ml-2"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View in Maps
                    </a>
                  </div>
                </>
              )}
              {!satLoading && !satData?.url && (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                  Satellite imagery unavailable
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Analysis panel */}
      {expanded && analysis && (
        <div className="border-t border-border bg-secondary/10 px-4 py-4 space-y-4">
          {/* Confidence + site visit banner */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${CONFIDENCE_COLORS[analysis.confidence]}`}>
              {analysis.confidence} confidence
            </span>
            {analysis.baseRateSource && (
              <span className={`text-[11px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-0.5 ${
                analysis.baseRateSource === "manual"
                  ? "bg-blue-500/15 text-blue-400"
                  : analysis.baseRateSource === "benchmark"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-zinc-700/50 text-zinc-400"
              }`}>
                {analysis.baseRateSource === "manual" ? "Manual Rate" : analysis.baseRateSource === "benchmark" ? "Market Benchmark" : "Default Rate"}
              </span>
            )}
            {analysis.siteVisitRequired && (
              <span className="flex items-center gap-1 text-[11px] text-yellow-400 bg-yellow-500/10 rounded-full px-2.5 py-0.5">
                <AlertTriangle className="w-3 h-3" />
                Site visit required before quoting
              </span>
            )}
            {analysis.estimatedDays && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                Est. {analysis.estimatedDays} day{analysis.estimatedDays !== 1 ? "s" : ""} on site
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AI Pricing
              </span>
              <span className="text-muted-foreground text-xs">$</span>
              <input
                type="number"
                value={editedPriceLow}
                onChange={(e) => setEditedPriceLow(Number(e.target.value))}
                className="w-20 text-sm font-semibold text-foreground bg-transparent border-b border-border focus:border-primary focus:outline-none text-right"
                min={0}
                step={100}
              />
              <span className="text-muted-foreground text-xs">–  $</span>
              <input
                type="number"
                value={editedPriceHigh}
                onChange={(e) => setEditedPriceHigh(Number(e.target.value))}
                className="w-20 text-sm font-semibold text-foreground bg-transparent border-b border-border focus:border-primary focus:outline-none text-right"
                min={0}
                step={100}
              />
            </div>
          </div>
          {/* Price breakdown */}
          {analysis.priceBreakdown && (
            <details className="group">
              <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 select-none hover:text-foreground transition-colors">
                <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                Price Breakdown
              </summary>
              <div className="mt-2 rounded-md border border-border bg-secondary/20 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">Base rate</td>
                      <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatMoney(analysis.priceBreakdown.baseRate)}/acre</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">Acreage</td>
                      <td className="px-3 py-1.5 text-right font-medium text-foreground">
                        {analysis.priceBreakdown.acreage > 0 ? `${analysis.priceBreakdown.acreage} acres` : "Not specified"}
                        {analysis.priceBreakdown.minimumEnforced && (
                          <span className="ml-1.5 text-[10px] text-amber-400 font-normal">(1-acre min applied)</span>
                        )}
                      </td>
                    </tr>
                    {analysis.priceBreakdown.densityMultiplier !== 1.0 && (
                      <tr className="border-b border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">Density multiplier</td>
                        <td className="px-3 py-1.5 text-right font-medium text-amber-400">{analysis.priceBreakdown.densityMultiplier.toFixed(2)}x</td>
                      </tr>
                    )}
                    {analysis.priceBreakdown.terrainMultiplier !== 1.0 && (
                      <tr className="border-b border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">Terrain multiplier</td>
                        <td className="px-3 py-1.5 text-right font-medium text-amber-400">{analysis.priceBreakdown.terrainMultiplier.toFixed(2)}x</td>
                      </tr>
                    )}
                    {analysis.priceBreakdown.accessMultiplier !== 1.0 && (
                      <tr className="border-b border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">Access multiplier</td>
                        <td className="px-3 py-1.5 text-right font-medium text-amber-400">{analysis.priceBreakdown.accessMultiplier.toFixed(2)}x</td>
                      </tr>
                    )}
                    {analysis.priceBreakdown.seasonalMultiplier !== 1.0 && (
                      <tr className="border-b border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">Seasonal adjustment</td>
                        <td className="px-3 py-1.5 text-right font-medium text-blue-400">{analysis.priceBreakdown.seasonalMultiplier > 1 ? "+" : ""}{Math.round((analysis.priceBreakdown.seasonalMultiplier - 1) * 100)}%</td>
                      </tr>
                    )}
                    {analysis.priceBreakdown.complexityMultiplier !== 1.0 && (
                      <tr className="border-b border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">Complexity premium</td>
                        <td className="px-3 py-1.5 text-right font-medium text-amber-400">+{Math.round((analysis.priceBreakdown.complexityMultiplier - 1) * 100)}%</td>
                      </tr>
                    )}
                    {analysis.priceBreakdown.volumeDiscount > 0 && (
                      <tr className="border-b border-border">
                        <td className="px-3 py-1.5 text-muted-foreground">Volume discount</td>
                        <td className="px-3 py-1.5 text-right font-medium text-green-400">−{analysis.priceBreakdown.volumeDiscount}%</td>
                      </tr>
                    )}
                    <tr className="border-b border-border">
                      <td className="px-3 py-1.5 text-muted-foreground">Mobilization</td>
                      <td className="px-3 py-1.5 text-right font-medium text-foreground">{formatMoney(analysis.priceBreakdown.mobilization)}</td>
                    </tr>
                    <tr className="bg-secondary/30">
                      <td className="px-3 py-2 font-semibold text-foreground">Calculated range</td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">{formatMoney(analysis.priceBreakdown.calculatedLow)} – {formatMoney(analysis.priceBreakdown.calculatedHigh)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Scope notes */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Scope Notes</p>
            <p className="text-xs text-foreground leading-relaxed">{analysis.scopeNotes}</p>
          </div>

          {/* Risk flags */}
          {analysis.riskFlags.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Risk Flags</p>
              <div className="space-y-1">
                {analysis.riskFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-yellow-300/80">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-yellow-400" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested line items */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Suggested Line Items</p>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/30 border-b border-border">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit Price</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.lineItems.map((li, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{li.name}</p>
                        {li.description && <p className="text-muted-foreground text-[11px]">{li.description}</p>}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{li.quantity}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatMoney(li.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">{formatMoney(li.quantity * li.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quote message — editable */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Quote Message (editable)</p>
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Regenerate with custom prompt */}
          <div className="flex gap-2 items-center border-t border-border pt-3">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customPrompt.trim() && !analyze.isPending) {
                  analyze.mutate({
                    service: submission.service,
                    county: submission.county,
                    acreage: submission.acreage ?? undefined,
                    message: submission.message ?? undefined,
                    addOns: submission.addOns ?? undefined,
                    name: submission.name,
                    customPrompt: customPrompt.trim(),
                  });
                }
              }}
              placeholder='Adjust quote (e.g. "add a rush fee", "increase mobilization")'
              className="flex-1 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs shrink-0"
              disabled={analyze.isPending || !customPrompt.trim()}
              onClick={() => analyze.mutate({
                service: submission.service,
                county: submission.county,
                acreage: submission.acreage ?? undefined,
                message: submission.message ?? undefined,
                addOns: submission.addOns ?? undefined,
                name: submission.name,
                customPrompt: customPrompt.trim(),
              })}
            >
              {analyze.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </Button>
          </div>

          {/* Build Quote CTA + Save Draft */}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              disabled={saveDraft.isPending || draftSaved}
              onClick={() => saveDraft.mutate({
                submissionId: submission.id,
                customerName: submission.name,
                customerEmail: submission.email,
                service: submission.service,
                county: submission.county,
                acreage: submission.acreage ?? undefined,
                aiResult: JSON.stringify({ ...analysis, quoteMessage: editedMessage, priceLow: editedPriceLow, priceHigh: editedPriceHigh }),
              })}
            >
              {saveDraft.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : draftSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" />
              )}
              {draftSaved ? "Draft Saved" : "Save Draft"}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleBuildQuote}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Build Quote in Jobber
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Website Requests Section ─────────────────────────────────────────────────
// ─── Draft Preview Modal ──────────────────────────────────────────────────────
type ParsedDraft = {
  scopeNotes?: string;
  scopeSummary?: string;
  lineItems?: { name: string; description: string; quantity: number; unitPrice: number }[];
  priceLow?: number;
  priceHigh?: number;
  totalEstimate?: { low?: number; high?: number };
  quoteMessage?: string;
  riskFlags?: string[];
  siteVisitRequired?: boolean;
  confidence?: string;
  estimatedDays?: number | null;
};

function DraftPreviewModal({
  draft,
  onClose,
  onPushToJobber,
}: {
  draft: { id: number; customerName?: string | null; customerEmail?: string | null; service?: string | null; county?: string | null; acreage?: string | null; aiResult: string; status: string; createdAt: Date | string };
  onClose: () => void;
  onPushToJobber: () => void;
}) {
  let parsed: ParsedDraft = {};
  try { parsed = JSON.parse(draft.aiResult); } catch { /* ignore */ }

  const priceLow = parsed.priceLow ?? parsed.totalEstimate?.low;
  const priceHigh = parsed.priceHigh ?? parsed.totalEstimate?.high;
  const scopeText = parsed.scopeNotes ?? parsed.scopeSummary ?? "";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {draft.customerName ?? "Draft Quote"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {[draft.service, draft.county, draft.acreage].filter(Boolean).join(" · ")}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Price range */}
          {(priceLow != null || priceHigh != null) && (
            <div className="rounded-md bg-primary/8 border border-primary/20 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Estimated Range</span>
              <span className="text-sm font-semibold text-foreground">
                ${priceLow?.toLocaleString()} – ${priceHigh?.toLocaleString()}
              </span>
            </div>
          )}

          {/* Scope notes */}
          {scopeText && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Scope Notes</p>
              <p className="text-xs text-foreground leading-relaxed">{scopeText}</p>
            </div>
          )}

          {/* Line items */}
          {parsed.lineItems && parsed.lineItems.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Line Items</p>
              <div className="space-y-1">
                {parsed.lineItems.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{item.name}</span>
                      {item.description && <span className="text-muted-foreground ml-1">— {item.description}</span>}
                    </div>
                    <span className="shrink-0 text-foreground font-medium">
                      {item.quantity > 1 ? `${item.quantity} × ` : ""}${item.unitPrice.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quote message */}
          {parsed.quoteMessage && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Quote Message</p>
              <p className="text-xs text-foreground leading-relaxed italic">"{parsed.quoteMessage}"</p>
            </div>
          )}

          {/* Risk flags */}
          {parsed.riskFlags && parsed.riskFlags.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Risk Flags</p>
              <ul className="space-y-0.5">
                {parsed.riskFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-amber-600 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-2">
            {parsed.confidence && (
              <span>Confidence: <span className="capitalize font-medium">{parsed.confidence}</span></span>
            )}
            {parsed.estimatedDays != null && (
              <span>Est. {parsed.estimatedDays} day{parsed.estimatedDays !== 1 ? "s" : ""} on site</span>
            )}
            {parsed.siteVisitRequired && (
              <span className="text-amber-600 font-medium">Site visit required</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 gap-1.5 text-xs"
              onClick={() => { onClose(); onPushToJobber(); }}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Push to Jobber
            </Button>
            <Button variant="outline" className="text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WebsiteRequestsSection({
  onBuildQuote,
}: {
  onBuildQuote: (prefill: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    jobType?: string;
    message?: string;
    lineItems?: { name: string; description: string; quantity: number; unitPrice: number }[];
  }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"requests" | "drafts" | "field">("requests");
  type DraftRow = { id: number; customerName?: string | null; customerEmail?: string | null; service?: string | null; county?: string | null; acreage?: string | null; aiResult: string; status: string; notes?: string | null; createdAt: Date | string; updatedAt: Date | string; submissionId: number };
  const [previewDraft, setPreviewDraft] = useState<DraftRow | null>(null);
  // Track which drafts have been pushed to Jobber in this session (optimistic, before DB refetch)
  const [pushedDraftIds, setPushedDraftIds] = useState<Set<number>>(new Set());

  // Manual request entry
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualService, setManualService] = useState("forestry-mulching");
  const [manualCounty, setManualCounty] = useState("");
  const [manualAcreage, setManualAcreage] = useState("");
  const [manualStreet, setManualStreet] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualZip, setManualZip] = useState("");
  const [manualMessage, setManualMessage] = useState("");
  const utils = trpc.useUtils();
  const createManual = trpc.ops.quotes.createManual.useMutation({
    onSuccess: () => {
      toast.success("Request added.");
      setShowManualForm(false);
      setManualName(""); setManualPhone(""); setManualEmail("");
      setManualService("forestry-mulching"); setManualCounty(""); setManualAcreage("");
      setManualStreet(""); setManualCity(""); setManualZip(""); setManualMessage("");
      utils.ops.quotes.list.invalidate();
      setActiveTab("requests");
    },
    onError: (err) => toast.error(`Failed to add request: ${err.message}`),
  });

  const { data: submissions, isLoading, refetch, isFetching } = trpc.ops.quotes.list.useQuery(
    { limit: 50 },
    { retry: false }
  );
  const { data: drafts, isLoading: draftsLoading, refetch: refetchDrafts, isFetching: draftsFetching } = trpc.ops.quotes.listDrafts.useQuery(
    undefined,
    { retry: false }
  );
  const deleteDraftMutation = trpc.ops.quotes.deleteDraft.useMutation({
    onSuccess: () => { refetchDrafts(); toast.success("Draft deleted."); },
    onError: () => toast.error("Failed to delete draft."),
  });
  const updateDraftStatusMutation = trpc.ops.quotes.updateDraftStatus.useMutation({
    onSuccess: () => { refetchDrafts(); },
    onError: () => toast.error("Failed to update draft status."),
  });

  const list = (submissions ?? []) as QuoteSubmission[];
  const draftList = drafts ?? [];
  const [aiScoreFilter, setAiScoreFilter] = useState<string>("all");
  const [staleFilter, setStaleFilter] = useState<boolean>(false);

  const isSubmissionStale = (s: QuoteSubmission) => {
    const daysSince = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= 3;
  };

  const filteredList = list.filter(s => {
    if (aiScoreFilter !== "all" && s.aiScore !== aiScoreFilter) return false;
    if (staleFilter && !isSubmissionStale(s)) return false;
    return true;
  });

  const { data: fieldQuoteList, isLoading: fieldLoading, refetch: refetchField, isFetching: fieldFetching } = trpc.fieldQuote.list.useQuery(
    { limit: 100 },
    { retry: false }
  );

  const [deletingFieldId, setDeletingFieldId] = useState<number | null>(null);
  const [confirmDeleteFieldId, setConfirmDeleteFieldId] = useState<number | null>(null);
  const deleteFieldQuote = trpc.fieldQuote.delete.useMutation({
    onSuccess: () => {
      toast.success("Field quote deleted.");
      refetchField();
      setConfirmDeleteFieldId(null);
      setDeletingFieldId(null);
    },
    onError: (err) => {
      toast.error(`Delete failed: ${err.message}`);
      setDeletingFieldId(null);
    },
  });

  const isRefreshing = activeTab === "requests" ? isFetching : activeTab === "field" ? fieldFetching : draftsFetching;
  const handleRefresh = () => activeTab === "requests" ? refetch() : activeTab === "field" ? refetchField() : refetchDrafts();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Website Requests</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualForm(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
            title="Add a potential client manually"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Manual
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border pb-0">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
            activeTab === "requests"
              ? "bg-background border border-b-background border-border text-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Inbound
          {!isLoading && list.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">{list.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("drafts")}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
            activeTab === "drafts"
              ? "bg-background border border-b-background border-border text-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Saved Drafts
          {!draftsLoading && draftList.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-semibold">{draftList.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("field")}
          className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
            activeTab === "field"
              ? "bg-background border border-b-background border-border text-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            Field
          </span>
          {!fieldLoading && fieldQuoteList && fieldQuoteList.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/15 text-blue-500 text-[10px] font-semibold">{fieldQuoteList.length}</span>
          )}
        </button>
      </div>

      {/* Inbound requests tab */}
      {activeTab === "requests" && (
        <>
          {/* Stale filter pill */}
          {!isLoading && list.some(isSubmissionStale) && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              <button
                onClick={() => setStaleFilter(v => !v)}
                className={`shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  staleFilter
                    ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                    : "bg-amber-500/10 text-amber-400/70 border-amber-500/20 hover:border-amber-500/40"
                }`}
              >
                Stale
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${
                  staleFilter ? "bg-white/15" : "bg-white/5"
                }`}>{list.filter(isSubmissionStale).length}</span>
              </button>
            </div>
          )}
          {/* AI Score filter pills */}
          {!isLoading && list.some(s => s.aiScore) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "all", label: "All" },
                { key: "strong", label: "Strong" },
                { key: "marginal", label: "Marginal" },
                { key: "weak", label: "Weak" },
              ].map(({ key, label }) => {
                const count = key === "all" ? list.filter(s => s.aiScore).length : list.filter(s => s.aiScore === key).length;
                if (key !== "all" && count === 0) return null;
                const isActive = aiScoreFilter === key;
                const colorClass = key === "strong"
                  ? isActive ? "bg-green-500/30 text-green-300 border-green-500/50" : "bg-green-500/10 text-green-400/70 border-green-500/20 hover:border-green-500/40"
                  : key === "marginal"
                  ? isActive ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-amber-500/10 text-amber-400/70 border-amber-500/20 hover:border-amber-500/40"
                  : key === "weak"
                  ? isActive ? "bg-red-500/30 text-red-300 border-red-500/50" : "bg-red-500/10 text-red-400/70 border-red-500/20 hover:border-red-500/40"
                  : isActive ? "bg-secondary text-foreground border-border" : "bg-transparent text-muted-foreground border-border/50 hover:border-border";
                return (
                  <button
                    key={key}
                    onClick={() => setAiScoreFilter(key)}
                    className={`shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${colorClass}`}
                  >
                    {label}
                    <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${isActive ? "bg-white/15" : "bg-white/5"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <ClipboardList className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No website requests yet.</p>
            </div>
          )}
          {!isLoading && list.length > 0 && (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-2">
              {filteredList.map((sub) => (
                <WebsiteRequestCard
                  key={sub.id}
                  submission={sub}
                  onBuildQuote={onBuildQuote}
                />
              ))}
              {filteredList.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center gap-2">
                  <p className="text-xs text-muted-foreground">No requests match this filter.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Saved drafts tab */}
      {activeTab === "drafts" && (
        <>
          {draftsLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!draftsLoading && draftList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <BookmarkCheck className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No saved drafts yet. Use the AI Quote Assistant to analyze a request, then click Save as Draft.</p>
            </div>
          )}
          {!draftsLoading && draftList.length > 0 && (
            <div className="space-y-2">
              {draftList.map((draft) => {
                let parsed: ParsedDraft = {};
                try { parsed = JSON.parse(draft.aiResult); } catch { /* ignore */ }
                const priceLow = parsed.priceLow ?? parsed.totalEstimate?.low;
                const priceHigh = parsed.priceHigh ?? parsed.totalEstimate?.high;
                const scopeText = parsed.scopeNotes ?? parsed.scopeSummary ?? "";

                const alreadySent = pushedDraftIds.has(draft.id) || draft.status === "sent";
                function handlePushToJobber() {
                  if (alreadySent) return;
                  onBuildQuote({
                    clientName: draft.customerName ?? undefined,
                    clientEmail: draft.customerEmail ?? undefined,
                    jobType: [draft.service, draft.acreage, draft.county ? `${draft.county} County` : undefined].filter(Boolean).join(" — "),
                    message: parsed.quoteMessage,
                    lineItems: parsed.lineItems,
                  });
                  // Mark as sent in DB and update local state immediately
                  setPushedDraftIds((prev) => new Set(prev).add(draft.id));
                  updateDraftStatusMutation.mutate({ id: draft.id, status: "sent" });
                }

                return (
                  <div key={draft.id} className="rounded-md border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{draft.customerName ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">
                          {[draft.service, draft.county, draft.acreage].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant={draft.status === "sent" ? "default" : draft.status === "archived" ? "outline" : "secondary"}
                          className="text-[10px] capitalize"
                        >
                          {draft.status}
                        </Badge>
                      </div>
                    </div>
                    {scopeText && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{scopeText}</p>
                    )}
                    {(priceLow != null || priceHigh != null) && (
                      <p className="text-xs font-medium text-foreground">
                        Est. ${priceLow?.toLocaleString()} – ${priceHigh?.toLocaleString()}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Saved {new Date(draft.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 gap-1"
                        onClick={() => setPreviewDraft(draft as DraftRow)}
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </Button>
                      {alreadySent ? (
                        <span className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-medium text-green-400 bg-green-500/10 border border-green-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Sent to Jobber
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className="h-6 text-xs px-2 gap-1"
                          onClick={handlePushToJobber}
                        >
                          <PlusCircle className="w-3 h-3" />
                          Push to Jobber
                        </Button>
                      )}
                      {!alreadySent && draft.status === "saved" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2 text-muted-foreground"
                          onClick={() => updateDraftStatusMutation.mutate({ id: draft.id, status: "sent" })}
                          disabled={updateDraftStatusMutation.isPending}
                        >
                          Mark Sent
                        </Button>
                      )}
                      {draft.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2 text-muted-foreground"
                          onClick={() => updateDraftStatusMutation.mutate({ id: draft.id, status: "archived" })}
                          disabled={updateDraftStatusMutation.isPending}
                        >
                          Archive
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-destructive hover:text-destructive ml-auto"
                        onClick={() => { if (confirm("Delete this draft?")) deleteDraftMutation.mutate({ id: draft.id }); }}
                        disabled={deleteDraftMutation.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Field Submissions tab */}
      {activeTab === "field" && (
        <>
          {fieldLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!fieldLoading && (!fieldQuoteList || fieldQuoteList.length === 0) && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Smartphone className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No field submissions yet. Use the Noland Field mobile app to submit quotes from the job site.</p>
            </div>
          )}
          {!fieldLoading && fieldQuoteList && fieldQuoteList.length > 0 && (
            <div className="space-y-2">
              {fieldQuoteList.map((fq) => {
                const scoreColor = fq.aiScore === "strong" ? "text-green-600" : fq.aiScore === "weak" ? "text-destructive" : "text-amber-500";
                const scoreBg = fq.aiScore === "strong" ? "bg-green-500/10" : fq.aiScore === "weak" ? "bg-destructive/10" : "bg-amber-500/10";
                const photoUrls = Array.isArray(fq.photoUrls) ? fq.photoUrls as string[] : [];
                const aiFlags = Array.isArray(fq.aiFlags) ? fq.aiFlags as string[] : [];
                return (
                  <div key={fq.id} className="rounded-md border border-border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{fq.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[fq.serviceType, fq.acreage ? `${fq.acreage} ac` : null, fq.terrainType].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {fq.aiScore && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${scoreColor} ${scoreBg}`}>
                          {fq.aiScore}
                        </span>
                      )}
                    </div>
                    {fq.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {fq.address}
                      </p>
                    )}
                    {fq.aiSummary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{fq.aiSummary}</p>
                    )}
                    {aiFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {aiFlags.map((flag, i) => (
                          <span key={i} className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">{flag}</span>
                        ))}
                      </div>
                    )}
                    {photoUrls.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Image className="w-3 h-3" />
                        {photoUrls.length} photo{photoUrls.length !== 1 ? "s" : ""}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {fq.phone && (
                        <a href={`tel:${fq.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />{fq.phone}
                        </a>
                      )}
                      {fq.email && (
                        <a href={`mailto:${fq.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" />{fq.email}
                        </a>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(fq.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {fq.aiDraftResponse && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">Draft response</summary>
                        <p className="mt-1 text-foreground/80 whitespace-pre-wrap">{fq.aiDraftResponse}</p>
                      </details>
                    )}
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onBuildQuote({
                          clientName: fq.name,
                          clientEmail: fq.email ?? undefined,
                          jobType: [fq.serviceType, fq.acreage ? `${fq.acreage} acres` : null].filter(Boolean).join(" — "),
                          message: fq.aiDraftResponse ?? undefined,
                        })}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Build Quote in Jobber
                      </Button>
                      {confirmDeleteFieldId === fq.id ? (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            disabled={deletingFieldId === fq.id}
                            onClick={() => {
                              setDeletingFieldId(fq.id);
                              deleteFieldQuote.mutate({ id: fq.id });
                            }}
                          >
                            {deletingFieldId === fq.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => setConfirmDeleteFieldId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteFieldId(fq.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Manual request entry modal */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowManualForm(false); }}>
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Add Manual Request</h3>
              </div>
              <button onClick={() => setShowManualForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Contact info */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Client name"
                    className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                    <input
                      type="tel"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      placeholder="615-000-0000"
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Job details */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Job Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Service <span className="text-destructive">*</span></label>
                    <select
                      value={manualService}
                      onChange={(e) => setManualService(e.target.value)}
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="forestry-mulching">Forestry Mulching</option>
                      <option value="land-management">Land Management</option>
                      <option value="brush-hogging">Brush Hogging</option>
                      <option value="right-of-way-clearing">Right-of-Way Clearing</option>
                      <option value="vegetation-management">Vegetation Management</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">County <span className="text-destructive">*</span></label>
                    <select
                      value={manualCounty}
                      onChange={(e) => setManualCounty(e.target.value)}
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">Select county...</option>
                      {TN_COUNTIES_AI.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Approximate Acreage</label>
                  <input
                    type="number"
                    value={manualAcreage}
                    onChange={(e) => setManualAcreage(e.target.value)}
                    placeholder="e.g. 5"
                    min={1}
                    step={0.5}
                    className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Property address */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Property Address <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">(for satellite map)</span></p>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Street</label>
                  <input
                    type="text"
                    value={manualStreet}
                    onChange={(e) => setManualStreet(e.target.value)}
                    placeholder="123 Main St"
                    className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">City</label>
                    <input
                      type="text"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      placeholder="Columbia"
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">ZIP</label>
                    <input
                      type="text"
                      value={manualZip}
                      onChange={(e) => setManualZip(e.target.value)}
                      placeholder="38401"
                      className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes / What they need done</label>
                <textarea
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  placeholder="Describe the work needed, any special conditions, how you heard about them..."
                  rows={3}
                  className="w-full rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowManualForm(false)}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!manualName.trim()) { toast.error("Name is required."); return; }
                    if (!manualCounty) { toast.error("County is required."); return; }
                    createManual.mutate({
                      name: manualName.trim(),
                      phone: manualPhone.trim(),
                      email: manualEmail.trim(),
                      service: manualService,
                      county: manualCounty,
                      acreage: manualAcreage || undefined,
                      street: manualStreet || undefined,
                      city: manualCity || undefined,
                      state: "TN",
                      zip: manualZip || undefined,
                      message: manualMessage || undefined,
                    });
                  }}
                  disabled={createManual.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {createManual.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Add Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft preview modal */}
      {previewDraft && (
        <DraftPreviewModal
          draft={previewDraft}
          onClose={() => setPreviewDraft(null)}
          onPushToJobber={() => {
            let parsed: ParsedDraft = {};
            try { parsed = JSON.parse(previewDraft.aiResult); } catch { /* ignore */ }
            onBuildQuote({
              clientName: previewDraft.customerName ?? undefined,
              clientEmail: previewDraft.customerEmail ?? undefined,
              jobType: [previewDraft.service, previewDraft.acreage, previewDraft.county ? `${previewDraft.county} County` : undefined].filter(Boolean).join(" — "),
              message: parsed.quoteMessage,
              lineItems: parsed.lineItems,
            });
            setPreviewDraft(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Distance Quotes Tab ────────────────────────────────────────────────────

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

function DistanceQuotesTab() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [emailConfirmId, setEmailConfirmId] = useState<number | null>(null);

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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    quoteNumber?: number | null;
    title?: string | null;
    client?: { name?: string | null; companyName?: string | null } | null;
  } | null>(null);
  // Read prefill data from URL params (set by Leads page Create Quote button)
  const [createModalPrefill] = useState<{
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    jobType?: string;
    leadId?: number;
  } | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const p = new URLSearchParams(window.location.search);
    if (!p.get("newQuote")) return undefined;
    const rawLeadId = p.get("leadId");
    return {
      clientName: p.get("clientName") ?? undefined,
      clientPhone: p.get("clientPhone") ?? undefined,
      clientEmail: p.get("clientEmail") ?? undefined,
      clientAddress: p.get("clientAddress") ?? undefined,
      jobType: p.get("jobType") ?? undefined,
      leadId: rawLeadId ? parseInt(rawLeadId, 10) : undefined,
    };
  });
  // Dynamic prefill from AI analysis (overrides URL prefill)
  const [aiPrefill, setAiPrefill] = useState<{
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    jobType?: string;
    message?: string;
    lineItems?: { name: string; description: string; quantity: number; unitPrice: number }[];
  } | undefined>(undefined);

  const [showCreateModal, setShowCreateModal] = useState(() => {
    // Auto-open modal if ?newQuote=1 is in the URL
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("newQuote") === "1";
  });
  const [editTarget, setEditTarget] = useState<{
    quoteId: string;
    title: string;
    message: string;
    lineItems: LineItem[];
  } | null>(null);
  const utils = trpc.useUtils();;
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.quotes.useQuery({ first: 100 }, { retry: false });
  const { data: followUps } = trpc.jobber.quoteFollowUpList.useQuery();

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

  const deleteQuote = trpc.jobber.deleteQuote.useMutation({
    onSuccess: () => {
      toast.success("Quote removed from Jobber.");
      utils.jobber.quotes.invalidate();
      setDeleteTarget(null);
      // Auto-close the detail panel so the user returns to the refreshed list
      setSelectedQuoteId(null);
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
    <DashboardLayout title="Quotes" subtitle="Jobber CRM · Distance Quotes · Analytics">
      <Tabs defaultValue="jobber" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="jobber" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Jobber Quotes
          </TabsTrigger>
          <TabsTrigger value="distance" className="gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5" /> Distance Quotes
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ── JOBBER QUOTES TAB ── */}
        <TabsContent value="jobber" className="mt-0">
      <div className="space-y-5 pb-10">

        {/* Priority 4: Stale Quote Follow-Up Panel */}
        {staleQuotes.length > 0 && (
          <div className="ops-card p-4 border-amber-500/30">
            <button
              className="w-full flex items-center justify-between"
              onClick={() => setShowStalePanel(p => !p)}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Quotes Needing Follow-Up</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-semibold">{staleQuotes.length}</span>
              </div>
              {showStalePanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showStalePanel && (
              <div className="mt-3 space-y-3">
                {staleQuotes.map((q: any) => {
                  const daysSince = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  const draft = staleFollowUpDrafts[q.id];
                  return (
                    <div key={q.id} className="rounded-md bg-secondary/20 border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{q.clientName ?? q.title ?? `Quote #${q.id}`}</p>
                          <p className="text-[11px] text-muted-foreground">{q.service ?? "Land clearing / forestry mulching"} &middot; {daysSince} days since sent</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 shrink-0"
                          disabled={draftingFor === q.id}
                          onClick={() => {
                            setDraftingFor(q.id);
                            draftFollowUpMutation.mutate({
                              quoteId: q.id,
                              clientName: q.clientName ?? "there",
                              service: q.service ?? "land management",
                              acreage: q.acreage ?? undefined,
                              daysSinceSent: daysSince,
                            });
                          }}
                        >
                          {draftingFor === q.id ? <><Loader2 className="w-3 h-3 animate-spin" />Drafting...</> : <><Sparkles className="w-3 h-3 text-orange-400" />Draft SMS</>}
                        </Button>
                      </div>
                      {draft && (
                        <div className="rounded bg-primary/5 border border-primary/20 p-2">
                          <p className="text-xs text-foreground leading-relaxed">{draft}</p>
                          <button
                            className="text-[11px] text-primary hover:text-primary/80 mt-1.5 transition-colors"
                            onClick={() => { navigator.clipboard.writeText(draft); toast.success("Copied to clipboard."); }}
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Two-column grid: left = All Quotes, right = Website Requests ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

          {/* ── LEFT: All Quotes (3/5 width on xl) ── */}
          <div className="xl:col-span-3 space-y-4">

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
                <div className="relative flex-1 sm:w-56">
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
                {!notConnected && !isLoading && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    New Quote
                  </Button>
                )}
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
                              onClick={() => setSelectedQuoteId(quote.id)}
                              className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer ${
                                idx % 2 === 0 ? "" : "bg-secondary/5"
                              } ${selectedQuoteId === quote.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                            >
                              <td className="px-4 py-3 font-mono text-muted-foreground">
                                #{quote.quoteNumber ?? "—"}
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                                <div className="flex items-center gap-1.5">
                                  {quote.title || "Untitled Quote"}
                                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                </div>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedQuoteId(quote.id);
                                    }}
                                    title="Edit quote"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {quote.quoteStatus === "APPROVED" && (() => {
                                    const fu = followUps?.find((f) => f.jobberQuoteId === quote.id);
                                    const jobId = fu?.jobberJobId;
                                    const jobNum = fu?.jobberJobNumber;
                                    return (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (jobId) {
                                            window.open(jobberJobUrl(jobId), "_blank", "noopener,noreferrer");
                                          } else {
                                            window.open(jobberQuoteUrl(quote.id), "_blank", "noopener,noreferrer");
                                          }
                                        }}
                                        title={jobNum ? `View Job #${jobNum} in Jobber` : "Open in Jobber"}
                                        className="text-muted-foreground hover:text-amber-400 transition-colors"
                                      >
                                        <Briefcase className="w-3.5 h-3.5" />
                                      </button>
                                    );
                                  })()}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteTarget(quote);
                                    }}
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
          </div>{/* end left column */}

          {/* ── RIGHT: Website Requests (2/5 width on xl) — sticky so it stays in view ── */}
          <div className="xl:col-span-2">
            <div className="xl:sticky xl:top-4">
              <WebsiteRequestsSection
                onBuildQuote={(prefill) => {
                  setAiPrefill(prefill);
                  setShowCreateModal(true);
                }}
              />
            </div>
          </div>{/* end right column */}

        </div>{/* end two-column grid */}
      </div>
        </TabsContent>{/* end jobber tab */}

        {/* ── DISTANCE QUOTES TAB ── */}
        <TabsContent value="distance" className="mt-0">
          <DistanceQuotesTab />
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="mt-0">
          <QuoteAnalyticsTab />
        </TabsContent>

      </Tabs>

      {/* Quote detail slide-out panel */}
      {selectedQuoteId && !editTarget && (
        <QuoteDetailPanel
          quoteId={selectedQuoteId}
          onClose={() => setSelectedQuoteId(null)}
          onDelete={(quote) => setDeleteTarget(quote)}
          isDeletePending={deleteQuote.isPending}
          onEdit={(q) => {
            setEditTarget({
              quoteId: q.id,
              title: q.title ?? "",
              message: q.message ?? "",
              lineItems: (q.lineItems?.nodes ?? []).map((li: any) => ({
                jobberLineItemId: li.id,
                name: li.name ?? "",
                description: li.description ?? "",
                quantity: li.quantity ?? 1,
                unitPrice: li.unitPrice ?? 0,
              })),
            });
          }}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteQuoteModal
          quote={deleteTarget}
          onConfirm={() => deleteQuote.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteQuote.isPending}
        />
      )}
      {/* Create Quote modal */}
      {showCreateModal && (
        <CreateQuoteModal
          onClose={() => {
            setShowCreateModal(false);
            setAiPrefill(undefined);
            // Clean ?newQuote params from URL without triggering a navigation
            const clean = window.location.pathname;
            window.history.replaceState({}, "", clean);
          }}
          onCreated={() => { utils.jobber.quotes.invalidate(); }}
          prefill={aiPrefill ?? createModalPrefill}
        />
      )}
      {/* Edit Quote modal */}
      {editTarget && (
        <EditQuoteModal
          quoteId={editTarget.quoteId}
          initialTitle={editTarget.title}
          initialMessage={editTarget.message}
          initialLineItems={editTarget.lineItems}
          onClose={() => setEditTarget(null)}
          onSaved={() => setEditTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
