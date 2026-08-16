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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NativeInvoicesSection() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);

  // Fetch all invoices (no jobId filter = all)
  const { data: allInvoices = [], isLoading } = trpc.nativeJobs.listInvoices.useQuery({});

  const markPaidMutation = trpc.nativeJobs.markInvoicePaid.useMutation({
    onSuccess: () => {
      utils.nativeJobs.listInvoices.invalidate();
      utils.nativeJobs.list.invalidate();
      toast.success("Invoice marked as paid");
      setMarkPaidId(null);
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
                      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusBadgeClass(inv.status)}`}
                    >
                      {statusIcon(inv.status)}
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {inv.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(inv.pdfUrl!, "_blank")}
                          className="h-7 px-2 text-zinc-400 hover:text-zinc-200 text-xs"
                          title="View invoice"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(inv.status === "unpaid" || inv.status === "sent") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMarkPaidId(inv.id)}
                          className="h-7 px-2 text-green-400 hover:text-green-300 text-xs"
                          title="Mark as paid"
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

      {/* Mark Paid Confirmation */}
      <AlertDialog open={markPaidId !== null} onOpenChange={(v) => !v && setMarkPaidId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark invoice as paid?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {invoiceToMarkPaid && (
                <>
                  Invoice #{String(invoiceToMarkPaid.id).padStart(4, "0")} for{" "}
                  <strong className="text-zinc-200">{invoiceToMarkPaid.clientName}</strong> —{" "}
                  {formatCents(invoiceToMarkPaid.totalCents)}. This will also update the job record.
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
              Mark Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
