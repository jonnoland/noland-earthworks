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
  const openInJobber = (quoteId: string) => {
    setIsOpeningJobber(true);
    window.open(`https://secure.getjobber.com/quotes/${quoteId}`, "_blank", "noopener,noreferrer");
    setTimeout(() => setIsOpeningJobber(false), 1500);
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
    onSuccess: () => {
      toast.success("Quote marked as approved. Follow-up flag added.");
      // Signal that we want to scroll to Convert to Job once the status updates
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
                Mark as Approved
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

            {/* Convert to Job — opens quote in Jobber web app for native conversion */}
            {(quote.quoteStatus === "APPROVED" || quote.quoteStatus === "SENT") && (
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
                {isOpeningJobber ? "Opening..." : "Convert to Job"}
                {!isOpeningJobber && <ExternalLink className="w-3 h-3 opacity-70" />}
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

function CreateQuoteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientNode | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [showServicePicker, setShowServicePicker] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">New Quote</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Client selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Client *</label>
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-lg bg-secondary/30 border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedClient.name || selectedClient.companyName}</p>
                  {selectedClient.emails?.[0]?.address && (
                    <p className="text-[11px] text-muted-foreground">{selectedClient.emails[0].address}</p>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search clients by name or email..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-secondary/30 border-border"
                  />
                </div>
                {clientsLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading clients…
                  </div>
                ) : filteredClients.length > 0 ? (
                  <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto">
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition-colors border-b border-border last:border-0"
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

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quote Title *</label>
            <Input
              placeholder="e.g. Forestry Mulching — 5 Acres, Smith Property"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs bg-secondary/30 border-border"
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

            {/* Service picker dropdown */}
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
                        <span className="text-xs font-medium text-primary shrink-0">
                          {formatMoney(svc.unitPrice)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Line item rows */}
            {lineItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No line items yet. Add from your services or enter a custom item.
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
                          type="number"
                          min="0.01"
                          step="0.01"
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
                            type="number"
                            min="0"
                            step="0.01"
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

            {/* Subtotal */}
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
          <p className="text-[11px] text-muted-foreground">Quote will be created as a Draft in Jobber.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={createQuote.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createQuote.isPending || !selectedClient || !title.trim() || lineItems.length === 0}
            >
              {createQuote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              Create Quote
            </Button>
          </div>
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    quoteId: string;
    title: string;
    message: string;
    lineItems: LineItem[];
  } | null>(null);
  const utils = trpc.useUtils();;
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.quotes.useQuery({ first: 100 }, { retry: false });

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
                              {quote.quoteStatus === "APPROVED" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://secure.getjobber.com/quotes/${quote.id}`, "_blank", "noopener,noreferrer");
                                  }}
                                  title="Convert to Job in Jobber"
                                  className="text-muted-foreground hover:text-amber-400 transition-colors"
                                >
                                  <Briefcase className="w-3.5 h-3.5" />
                                </button>
                              )}
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
          onClose={() => setShowCreateModal(false)}
          onCreated={() => utils.jobber.quotes.invalidate()}
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
