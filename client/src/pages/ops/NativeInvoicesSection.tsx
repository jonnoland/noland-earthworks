/**
 * NativeInvoicesSection — centralized invoice management.
 *
 * Displays all generated invoices from native_invoices table.
 * Features: status filter pills, search, view invoice (opens S3 URL),
 * mark paid, and a summary stats row at the top.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Receipt,
  ExternalLink,
  CheckCircle,
  DollarSign,
  Clock,
  XCircle,
  Send,
  Copy,
  Banknote,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NativeInvoice = {
  id: number;
  jobId: number;
  quoteId: number | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  propertyAddress: string | null;
  serviceType: string | null;
  lineItems: string;
  subtotalCents: number;
  depositPaidCents: number;
  totalCents: number;
  status: "unpaid" | "sent" | "paid" | "void";
  pdfUrl: string | null;
  stripePaymentLinkUrl?: string | null;
  achPaymentPendingAt?: Date | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentNotes?: string | null;
  paymentReceiptEmailId?: string | null;
  paymentReceiptSentAt?: Date | null;
  paymentReceiptUrl?: string | null;
  emailSentId: string | null;
  emailSentAt: Date | null;
  paidAt: Date | null;
  dueDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "paid": return "bg-green-500/15 text-green-400 border-green-500/30";
    case "sent": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "unpaid": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "void": return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusIcon(status: string) {
  switch (status) {
    case "paid": return <CheckCircle className="w-3 h-3" />;
    case "sent": return <Send className="w-3 h-3" />;
    case "unpaid": return <Clock className="w-3 h-3" />;
    case "void": return <XCircle className="w-3 h-3" />;
    default: return null;
  }
}

function paymentMethodLabel(invoice: NativeInvoice): string {
  if (invoice.achPaymentPendingAt) return "Stripe ACH";
  if (invoice.paymentMethod === "check") {
    return invoice.paymentReference ? `Check #${invoice.paymentReference}` : "Check";
  }
  if (invoice.paymentMethod === "stripe") return "Stripe";
  if (invoice.paymentMethod === "cash") return "Cash";
  return invoice.status === "paid" ? "Unspecified" : "—";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NativeInvoicesSection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [checkPaymentId, setCheckPaymentId] = useState<number | null>(null);
  const [checkNumber, setCheckNumber] = useState("");
  const [checkReceivedAt, setCheckReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkNote, setCheckNote] = useState("");
  const [sendCheckReceipt, setSendCheckReceipt] = useState(true);
  const [resendId, setResendId] = useState<number | null>(null);
  const [resendReceiptId, setResendReceiptId] = useState<number | null>(null);

  // Fetch all invoices (no jobId filter = all)
  const { data: allInvoices = [], isLoading } = trpc.nativeJobs.listInvoices.useQuery({});

  const markPaidMutation = trpc.nativeJobs.markInvoicePaid.useMutation({
    onSuccess: () => {
      utils.nativeJobs.listInvoices.invalidate();
      utils.nativeJobs.list.invalidate();
      toast.success("Cash payment recorded — invoice marked paid");
      setMarkPaidId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const recordCheckMutation = trpc.nativeJobs.recordInvoiceCheck.useMutation({
    onSuccess: (result) => {
      utils.nativeJobs.listInvoices.invalidate();
      utils.nativeJobs.list.invalidate();
      utils.nativeQuotes.list.invalidate();
      if (result.receipt.sent) {
        toast.success(`Check #${result.checkNumber} recorded — receipt emailed to the customer`);
      } else if (result.receipt.attempted) {
        toast.warning(`Check #${result.checkNumber} recorded, but the receipt email could not be delivered.`);
      } else if (result.receipt.reason === "missing_email") {
        toast.success(`Check #${result.checkNumber} recorded — no customer email was available for a receipt.`);
      } else {
        toast.success(`Check #${result.checkNumber} recorded — invoice marked paid`);
      }
      setCheckPaymentId(null);
      setCheckNumber("");
      setCheckNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const resendMutation = trpc.nativeJobs.resendInvoice.useMutation({
    onSuccess: (result) => {
      utils.nativeJobs.listInvoices.invalidate();
      toast.success(`Invoice resent to ${result.clientEmail} with a fresh card / ACH payment link`);
      setResendId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resendReceiptMutation = trpc.nativeJobs.resendCheckPaymentReceipt.useMutation({
    onSuccess: (result) => {
      utils.nativeJobs.listInvoices.invalidate();
      toast.success(`Payment receipt resent to ${result.clientEmail}`);
      setResendReceiptId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter invoices
  const filtered = allInvoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      inv.clientName.toLowerCase().includes(term) ||
      (inv.clientEmail ?? "").toLowerCase().includes(term) ||
      (inv.propertyAddress ?? "").toLowerCase().includes(term) ||
      String(inv.id).includes(term);
    return matchesStatus && matchesSearch;
  });

  // Summary stats
  const totalInvoiced = allInvoices.reduce((s, i) => s + (i.totalCents ?? 0), 0);
  const totalPaid = allInvoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (i.totalCents ?? 0), 0);
  const totalOutstanding = allInvoices
    .filter((i) => i.status === "unpaid" || i.status === "sent")
    .reduce((s, i) => s + (i.totalCents ?? 0), 0);
  const countUnpaid = allInvoices.filter((i) => i.status === "unpaid" || i.status === "sent").length;

  const invoiceToMarkPaid = allInvoices.find((i) => i.id === markPaidId);
  const invoiceToRecordCheck = allInvoices.find((i) => i.id === checkPaymentId);
  const invoiceToResend = allInvoices.find((i) => i.id === resendId);
  const invoiceToResendReceipt = allInvoices.find((i) => i.id === resendReceiptId);

  function openCheckPayment(invoice: NativeInvoice) {
    setCheckPaymentId(invoice.id);
    setCheckNumber("");
    setCheckReceivedAt(new Date().toISOString().slice(0, 10));
    setCheckNote("");
    setSendCheckReceipt(Boolean(invoice.clientEmail));
  }

  function submitCheckPayment() {
    if (checkPaymentId === null) return;
    const reference = checkNumber.trim();
    if (!reference) {
      toast.error("Enter the check number before recording payment.");
      return;
    }
    const receivedAt = new Date(`${checkReceivedAt}T12:00:00`);
    if (Number.isNaN(receivedAt.getTime())) {
      toast.error("Enter a valid check received date.");
      return;
    }
    recordCheckMutation.mutate({
      invoiceId: checkPaymentId,
      checkNumber: reference,
      receivedAt,
      note: checkNote.trim() || undefined,
      sendReceipt: sendCheckReceipt,
    });
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 500 }}>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-zinc-800">
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <Receipt className="w-3.5 h-3.5" /> Total Invoiced
          </div>
          <div className="text-lg font-bold text-zinc-100">{formatCents(totalInvoiced)}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{allInvoices.length} invoice{allInvoices.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <CheckCircle className="w-3.5 h-3.5" /> Collected
          </div>
          <div className="text-lg font-bold text-green-400">{formatCents(totalPaid)}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {allInvoices.filter((i) => i.status === "paid").length} paid
          </div>
        </div>
        <div className="bg-zinc-800/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" /> Outstanding
          </div>
          <div className="text-lg font-bold text-amber-400">{formatCents(totalOutstanding)}</div>
          <div className="text-xs text-zinc-500 mt-0.5">{countUnpaid} pending</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-zinc-800">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                statusFilter === f.value
                  ? "bg-amber-600 border-amber-600 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-3 py-1.5 border-b border-zinc-800">
        <span className="text-xs text-zinc-500">
          {isLoading ? "Loading..." : `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
            Loading invoices...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600 text-sm gap-2">
            <Receipt className="w-8 h-8 opacity-30" />
            <p>No invoices found.</p>
            <p className="text-xs text-zinc-700">
              Generate invoices from the Jobs tab when a job is complete.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                <th className="text-left px-3 py-2 font-medium">Invoice #</th>
                <th className="text-left px-3 py-2 font-medium">Client</th>
                <th className="text-left px-3 py-2 font-medium">Service</th>
                <th className="text-left px-3 py-2 font-medium">Date</th>
                <th className="text-right px-3 py-2 font-medium">Amount</th>
                <th className="text-center px-3 py-2 font-medium">Payment</th>
                <th className="text-center px-3 py-2 font-medium">Status</th>
                <th className="text-center px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs text-zinc-400">
                      #{String(inv.id).padStart(4, "0")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-zinc-200 truncate max-w-[140px]">
                      {inv.clientName}
                    </div>
                    {inv.clientEmail && (
                      <div className="text-xs text-zinc-500 truncate max-w-[140px]">
                        {inv.clientEmail}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs truncate max-w-[120px]">
                    {inv.serviceType ?? "Land Management"}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">
                    {formatDate(inv.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="font-semibold text-zinc-200 text-xs">
                      {formatCents(inv.totalCents)}
                    </div>
                    {inv.depositPaidCents > 0 && (
                      <div className="text-[10px] text-zinc-500">
                        -{formatCents(inv.depositPaidCents)} dep.
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                        inv.paymentMethod === "check"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : inv.paymentMethod === "stripe" || inv.achPaymentPendingAt
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                            : inv.paymentMethod === "cash"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-zinc-700 bg-zinc-800 text-zinc-500"
                      }`}
                      title={inv.paymentNotes ?? undefined}
                    >
                      {paymentMethodLabel(inv)}
                    </span>
                    {inv.paymentReceiptSentAt && (
                      <span className="mt-1 block text-[9px] leading-none text-zinc-500">Receipt emailed</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {inv.achPaymentPendingAt ? (
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium bg-violet-500/15 text-violet-300 border-violet-500/40"
                          title="The customer submitted an ACH payment. Stripe has not confirmed the bank settlement yet."
                        >
                          <Clock className="w-3 h-3" />
                          Payment Pending
                        </span>
                        <span className="text-[9px] leading-none text-violet-300/70">
                          ACH submitted {formatDate(inv.achPaymentPendingAt)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusBadgeClass(inv.status)}`}
                        >
                          {statusIcon(inv.status)}
                          {statusLabel(inv.status)}
                        </span>
                        {inv.status === "paid" && inv.paymentMethod === "check" && inv.paymentReference && (
                          <span className="inline-flex items-center gap-1 text-[9px] leading-none text-emerald-300/75" title={inv.paymentNotes ?? undefined}>
                            <Banknote className="w-3 h-3" /> Check #{inv.paymentReference}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(inv.pdfUrl!, "_blank")}
                          className="h-7 px-2 text-zinc-400 hover:text-zinc-200 text-xs"
                          title={inv.status === "paid" && inv.paymentMethod === "check" ? "View paid final invoice" : "View invoice"}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {inv.paymentReceiptUrl && inv.status === "paid" && inv.paymentMethod === "check" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(inv.paymentReceiptUrl!, "_blank")}
                          className="h-7 px-2 text-emerald-400 hover:text-emerald-300 text-xs"
                          title="View final payment receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {inv.stripePaymentLinkUrl && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(inv.stripePaymentLinkUrl!, "_blank")}
                            className="h-7 px-2 text-amber-400 hover:text-amber-300 text-xs"
                            title="Open card / ACH payment link"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(inv.stripePaymentLinkUrl!);
                                toast.success("Payment link copied");
                              } catch {
                                toast.error("Could not copy the payment link");
                              }
                            }}
                            className="h-7 px-2 text-zinc-400 hover:text-zinc-200 text-xs"
                            title="Copy card / ACH payment link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {(inv.status === "unpaid" || inv.status === "sent") && !inv.achPaymentPendingAt && inv.clientEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResendId(inv.id)}
                          disabled={resendMutation.isPending}
                          className="h-7 px-2 text-blue-400 hover:text-blue-300 text-xs"
                          title="Resend invoice with a fresh card / ACH payment link"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {inv.status === "paid" && inv.paymentMethod === "check" && inv.clientEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResendReceiptId(inv.id)}
                          disabled={resendReceiptMutation.isPending}
                          className="h-7 px-2 text-emerald-400 hover:text-emerald-300 text-xs"
                          title={inv.paymentReceiptSentAt ? "Resend payment receipt" : "Send payment receipt"}
                        >
                          <Send className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(inv.status === "unpaid" || inv.status === "sent") && !inv.achPaymentPendingAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCheckPayment(inv)}
                          disabled={recordCheckMutation.isPending}
                          className="h-7 px-2 text-emerald-400 hover:text-emerald-300 text-xs"
                          title="Record check received"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(inv.status === "unpaid" || inv.status === "sent") && !inv.achPaymentPendingAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMarkPaidId(inv.id)}
                          className="h-7 px-2 text-green-400 hover:text-green-300 text-xs"
                          title="Record another offline payment method"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cash Payment Confirmation */}
      <AlertDialog open={markPaidId !== null} onOpenChange={(v) => !v && setMarkPaidId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Record cash payment?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {invoiceToMarkPaid && (
                <>
                  Invoice #{String(invoiceToMarkPaid.id).padStart(4, "0")} for{" "}
                  <strong className="text-zinc-200">{invoiceToMarkPaid.clientName}</strong> —{" "}
                  {formatCents(invoiceToMarkPaid.totalCents)}. This will mark the payment method as Cash and update the job record. If you have a check in hand, cancel and use the green banknote button so the check number is saved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => markPaidId && markPaidMutation.mutate({ invoiceId: markPaidId })}
              className="bg-green-700 hover:bg-green-600 text-white"
            >
              Record Cash Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record Check Received */}
      <Dialog open={checkPaymentId !== null} onOpenChange={(open) => !open && !recordCheckMutation.isPending && setCheckPaymentId(null)}>
        <DialogContent className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" /> Record Check Received
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {invoiceToRecordCheck ? (
                <>
                  Record the check you have in hand for invoice #{String(invoiceToRecordCheck.id).padStart(4, "0")} — {formatCents(invoiceToRecordCheck.totalCents)}. The open online payment link will be closed first to prevent a duplicate payment.
                </>
              ) : "Record the received check before marking this invoice paid."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-200">
              Check number
              <Input
                value={checkNumber}
                onChange={(event) => setCheckNumber(event.target.value)}
                placeholder="Example: 1048"
                maxLength={100}
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-200">
              Date received
              <Input
                type="date"
                value={checkReceivedAt}
                onChange={(event) => setCheckReceivedAt(event.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-200">
              Internal note <span className="font-normal text-zinc-500">(optional)</span>
              <Input
                value={checkNote}
                onChange={(event) => setCheckNote(event.target.value)}
                placeholder="Example: First Citizens Bank, deposited Oct. 3"
                maxLength={1000}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </label>
            <label className={`flex items-start gap-2 rounded-md border p-3 text-sm ${invoiceToRecordCheck?.clientEmail ? "border-emerald-500/30 bg-emerald-500/5 text-zinc-200" : "border-zinc-700 bg-zinc-800/50 text-zinc-500"}`}>
              <input
                type="checkbox"
                checked={sendCheckReceipt}
                onChange={(event) => setSendCheckReceipt(event.target.checked)}
                disabled={!invoiceToRecordCheck?.clientEmail}
                className="mt-0.5 h-4 w-4 accent-emerald-500 disabled:cursor-not-allowed"
              />
              <span>
                <span className="block font-medium">Email a payment receipt to the customer</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {invoiceToRecordCheck?.clientEmail
                    ? `A receipt for Check #${checkNumber.trim() || "…"} will go to ${invoiceToRecordCheck.clientEmail}.`
                    : "No customer email is saved on this invoice, so a receipt cannot be sent."}
                </span>
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckPaymentId(null)} disabled={recordCheckMutation.isPending} className="border-zinc-700 text-zinc-300">
              Cancel
            </Button>
            <Button onClick={submitCheckPayment} disabled={!checkNumber.trim() || recordCheckMutation.isPending} className="bg-emerald-700 hover:bg-emerald-600 text-white">
              {recordCheckMutation.isPending ? "Recording..." : "Record Check Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Invoice Confirmation */}
      <AlertDialog open={resendId !== null} onOpenChange={(v) => !v && setResendId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Resend this invoice?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {invoiceToResend && (
                <>
                  Invoice #{String(invoiceToResend.id).padStart(4, "0")} will be emailed again to{" "}
                  <strong className="text-zinc-200">{invoiceToResend.clientEmail}</strong>. A fresh Stripe payment link will replace the previous link and will accept card or ACH bank payment.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300" disabled={resendMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resendId && resendMutation.mutate({ invoiceId: resendId })}
              disabled={resendMutation.isPending}
              className="bg-blue-700 hover:bg-blue-600 text-white"
            >
              {resendMutation.isPending ? "Resending..." : "Resend Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Payment Receipt Confirmation */}
      <AlertDialog open={resendReceiptId !== null} onOpenChange={(v) => !v && setResendReceiptId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Resend payment receipt?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {invoiceToResendReceipt && (
                <>
                  The paid receipt for invoice #{String(invoiceToResendReceipt.id).padStart(4, "0")}
                  {invoiceToResendReceipt.paymentReference ? ` (Check #${invoiceToResendReceipt.paymentReference})` : ""} will be emailed to{" "}
                  <strong className="text-zinc-200">{invoiceToResendReceipt.clientEmail}</strong>. The invoice will remain paid.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300" disabled={resendReceiptMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resendReceiptId && resendReceiptMutation.mutate({ invoiceId: resendReceiptId })}
              disabled={resendReceiptMutation.isPending}
              className="bg-emerald-700 hover:bg-emerald-600 text-white"
            >
              {resendReceiptMutation.isPending ? "Resending Receipt..." : "Resend Payment Receipt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
