/**
 * Ops Quotes page — live Jobber quote data
 * Calls trpc.jobber.quotes to fetch quotes from Jobber CRM.
 * Clicking a row opens a slide-out detail panel with full quote info.
 */
import { useState, useEffect, useMemo, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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
  onCreated: () => void;
  prefill?: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    jobType?: string;
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

function AIAssistPanel({ onClose, clientName, onApply }: AIAssistPanelProps) {
  const [context, setContext] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiAssist = trpc.ops.quotes.aiAssistQuote.useMutation({
    onError: (err) => toast.error(err.message || "AI assist failed. Try again."),
  });

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

  async function handleRun() {
    if (context.trim().length < 10) { toast.error("Describe the job first."); return; }
    const result = await aiAssist.mutateAsync({ context: context.trim(), imageUrls, clientName });
    // Map result to CreateQuoteModal fields
    const serviceLabel: Record<string, string> = {
      "forestry-mulching": "Forestry Mulching",
      "land-clearing": "Land Clearing",
      "brush-hogging": "Brush Hogging",
      "right-of-way-clearing": "Right-of-Way Clearing",
      "vegetation-management": "Vegetation Management",
    };
    const svcName = serviceLabel[result.inferredService] ?? result.inferredService;
    const acresLabel = result.inferredAcres > 0 ? ` — ${result.inferredAcres} Acres` : "";
    onApply({
      title: `${svcName}${acresLabel}`,
      message: result.quoteMessage,
      lineItems: result.lineItems,
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

          {/* Context input */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Job Description <span className="text-destructive">*</span>
            </label>
            <textarea
              placeholder={`Describe the job in your own words. Include:\n• Location / county\n• Approximate acreage\n• Vegetation type and density (light cedar, heavy brush, etc.)\n• Terrain (flat, rolling, steep)\n• Any obstacles — fences, structures, stumps, water\n• What the customer wants done\n\nExample: "5 acres in Hickman County, heavy cedar and privet, rolling terrain, fence line on the south edge, customer wants it mulched clean."`}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-border bg-secondary/20 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">{context.length}/2000 characters</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{aiAssist.data.lineItems.length} Line Items</p>
                <div className="space-y-1">
                  {aiAssist.data.lineItems.map((li, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-foreground truncate">{li.name}</span>
                      <span className="text-muted-foreground shrink-0">{li.quantity} × ${li.unitPrice.toLocaleString()}</span>
                    </div>
                  ))}
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
              <Button size="sm" onClick={() => onApply({ title: `${({
                "forestry-mulching": "Forestry Mulching",
                "land-clearing": "Land Clearing",
                "brush-hogging": "Brush Hogging",
                "right-of-way-clearing": "Right-of-Way Clearing",
                "vegetation-management": "Vegetation Management",
              } as Record<string, string>)[aiAssist.data!.inferredService] ?? aiAssist.data!.inferredService}${aiAssist.data!.inferredAcres > 0 ? ` — ${aiAssist.data!.inferredAcres} Acres` : ""}`, message: aiAssist.data!.quoteMessage, lineItems: aiAssist.data!.lineItems })} className="gap-1.5">
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
      toast.success(`Quote #${(quote as any)?.quoteNumber ?? ""} created in Jobber.`);
      onCreated();
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
        quantity: item.quantity,
        unitPrice: item.unitPrice,
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
                            onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                            className="w-24 h-7 rounded-md border border-border bg-secondary/20 pl-5 pr-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                      <div className="ml-auto text-xs font-semibold text-foreground">
                        {formatMoney(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Subtotal bar */}
            {lineItems.length > 0 && (
              <div className="px-5 py-3 border-t border-border shrink-0 bg-secondary/10 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Subtotal</span>
                  <span className="text-sm font-bold text-foreground">{formatMoney(subtotal)}</span>
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
      {/* Satellite imagery strip — shown when a precise address is available */}
      {hasPreciseAddress && (
        <div className="relative w-full h-36 bg-secondary/20 overflow-hidden">
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
              {/* Overlay: address + Google Maps link */}
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

      {/* Card header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{submission.name}</span>
            <span className="text-[11px] text-muted-foreground bg-secondary/40 rounded-full px-2 py-0.5">
              {submission.service}
            </span>
            {submission.acreage && (
              <span className="text-[11px] text-muted-foreground">{submission.acreage} acres</span>
            )}
            <span className="text-[11px] text-muted-foreground">{submission.county} County</span>
            {submission.aiScore && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`cursor-default text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
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
            <span className="text-[11px] text-muted-foreground">
              {new Date(submission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
          {submission.message && (
            <p className="mt-1.5 text-[11px] text-muted-foreground italic line-clamp-2">"{submission.message}"</p>
          )}
          {addOnsList.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {addOnsList.map((a: string) => (
                <span key={a} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">{a}</span>
              ))}
            </div>
          )}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {analysis && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Show"} Analysis
            </button>
          )}
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
            className="flex items-center gap-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50 transition-colors"
          >
            {analyze.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {analyze.isPending ? AI_STATUS_MESSAGES[statusIdx] : analysis ? "Re-analyze" : "Analyze with AI"}
          </button>
          <button
            onClick={handleBuildQuote}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Build Quote
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

      {/* AI Analysis panel */}
      {expanded && analysis && (
        <div className="border-t border-border bg-secondary/10 px-4 py-4 space-y-4">
          {/* Confidence + site visit banner */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${CONFIDENCE_COLORS[analysis.confidence]}`}>
              {analysis.confidence} confidence
            </span>
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
            <span className="ml-auto text-sm font-semibold text-foreground">
              {formatMoney(analysis.priceLow)} – {formatMoney(analysis.priceHigh)}
            </span>
          </div>

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
                aiResult: JSON.stringify({ ...analysis, quoteMessage: editedMessage }),
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
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
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
            <div className="space-y-2">
              {filteredList.map((sub) => (
                <WebsiteRequestCard
                  key={sub.id}
                  submission={sub}
                  onBuildQuote={onBuildQuote}
                />
              ))}
              {filteredList.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
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
  } | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const p = new URLSearchParams(window.location.search);
    if (!p.get("newQuote")) return undefined;
    return {
      clientName: p.get("clientName") ?? undefined,
      clientPhone: p.get("clientPhone") ?? undefined,
      clientEmail: p.get("clientEmail") ?? undefined,
      clientAddress: p.get("clientAddress") ?? undefined,
      jobType: p.get("jobType") ?? undefined,
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

        {/* Website Requests — AI-powered quote builder from inbound form submissions */}
        <WebsiteRequestsSection
          onBuildQuote={(prefill) => {
            setAiPrefill(prefill);
            setShowCreateModal(true);
          }}
        />

        {/* Divider */}
        <div className="border-t border-border pt-2" />

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
                                  // We need the full detail to pre-fill line items — open detail panel first
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
                                        // No auto-created job yet — open quote in Jobber
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
      </div>

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
          onCreated={() => utils.jobber.quotes.invalidate()}
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
