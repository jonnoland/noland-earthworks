/**
 * NativeJobsSection — Jobs tab in Ops Quotes page
 *
 * Replaces Jobber's Jobs tab. Shows all native jobs (created from converted quotes)
 * with a Jobber-style two-column layout: table on left, slide-out detail on right.
 *
 * Actions:
 *   - Filter by status (All / Scheduled / In Progress / Completed / Cancelled)
 *   - Search by client name, address, service type
 *   - View job details in slide-out panel
 *   - Update status (Scheduled → In Progress → Completed)
 *   - Edit scheduled date and internal notes
 *   - Generate invoice (HTML, opens in new tab + optional email)
 *   - Mark invoice as paid
 *   - Delete job
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, RefreshCw, X, MapPin, Phone, Mail, User,
  Calendar, CheckCircle, Clock, XCircle, FileText,
  DollarSign, Trash2, Edit2, ExternalLink, ChevronRight,
  Briefcase, Send, Download
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NativeJob {
  id: number;
  quoteId: number | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  propertyAddress: string | null;
  serviceType: string | null;
  acreage: string | null;
  totalCents: number;
  lineItems: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledDate: Date | null;
  completedAt: Date | null;
  internalNotes: string | null;
  invoicedCents: number | null;
  invoicedAt: Date | null;
  paidCents: number | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LineItem {
  description: string;
  qty: number;
  unitPriceCents: number;
  totalCents: number;
}

interface GeneratedInvoiceResult {
  totalCents: number;
  emailSent: boolean;
  emailSendError?: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function JobStatusBadge({ status, paidAt, invoicedAt }: { status: string; paidAt?: Date | null; invoicedAt?: Date | null }) {
  if (paidAt) return <Badge className="bg-green-600 text-white text-xs">Paid</Badge>;
  if (invoicedAt) return <Badge className="bg-amber-600 text-white text-xs">Invoiced</Badge>;
  if (status === "completed") return <Badge className="bg-emerald-600 text-white text-xs">Completed</Badge>;
  if (status === "in_progress") return <Badge className="bg-blue-500 text-white text-xs">In Progress</Badge>;
  if (status === "cancelled") return <Badge className="bg-red-600 text-white text-xs">Cancelled</Badge>;
  return <Badge className="bg-zinc-500 text-white text-xs">Scheduled</Badge>;
}

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Generate Invoice Dialog ──────────────────────────────────────────────────

function GenerateInvoiceDialog({
  job,
  open,
  onClose,
  onSuccess,
}: {
  job: NativeJob;
  open: boolean;
  onClose: () => void;
  onSuccess: (invoice: GeneratedInvoiceResult) => void;
}) {
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const generateMut = trpc.nativeJobs.generateInvoice.useMutation({
    onSuccess: (invoice) => {
      if (invoice.emailSent) {
        toast.success(`Final payment invoice emailed to ${job.clientEmail}`);
      } else if (invoice.emailSendError) {
        toast.error(`Invoice created, but not emailed: ${invoice.emailSendError}`);
      } else {
        toast.success("Final payment invoice created");
      }
      if (invoice?.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
      }
      utils.nativeJobs.list.invalidate();
      utils.nativeJobs.listInvoices.invalidate();
      onSuccess(invoice);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Generate Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            <p className="font-semibold">Final payment invoice</p>
            <p className="mt-1 text-xs text-amber-100/75">Any recorded quote deposit is deducted automatically. The remaining balance will be sent to the customer for payment.</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-sm">
            <div className="text-zinc-400 mb-1">Client</div>
            <div className="font-medium">{job.clientName}</div>
            {job.propertyAddress && <div className="text-zinc-400 text-xs mt-1">{job.propertyAddress}</div>}
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 text-sm">
            <div className="text-zinc-400 mb-1">Amount</div>
            <div className="text-amber-400 font-bold text-lg">{fmt(job.totalCents)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment instructions, thank-you note, etc."
              className="bg-zinc-800 border-zinc-700 text-sm resize-none"
              rows={3}
            />
          </div>
          {job.clientEmail ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-zinc-300">Email invoice to {job.clientEmail}</span>
            </label>
          ) : (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              No customer email is saved on this job. You can create the invoice, but add an email address first if you need to send it directly.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-zinc-600">Cancel</Button>
          <Button
            onClick={() => generateMut.mutate({ jobId: job.id, sendEmail, notes: notes || undefined })}
            disabled={generateMut.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {generateMut.isPending ? "Creating Final Invoice..." : sendEmail && job.clientEmail ? "Create & Send Final Invoice" : "Create Final Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Job Dialog ──────────────────────────────────────────────────────────

function EditJobDialog({
  job,
  open,
  onClose,
  onSuccess,
}: {
  job: NativeJob;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [scheduledDate, setScheduledDate] = useState(
    job.scheduledDate ? new Date(job.scheduledDate).toISOString().split("T")[0] : ""
  );
  const [notes, setNotes] = useState(job.internalNotes ?? "");
  const [status, setStatus] = useState(job.status);
  const utils = trpc.useUtils();

  const updateMut = trpc.nativeJobs.update.useMutation({
    onSuccess: () => {
      toast.success("Job updated");
      utils.nativeJobs.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Edit Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Status</Label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as NativeJob["status"])}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Scheduled Date</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-zinc-300 text-sm">Internal Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Job notes, site conditions, equipment notes..."
              className="bg-zinc-800 border-zinc-700 text-sm resize-none"
              rows={4}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-zinc-600">Cancel</Button>
          <Button
            onClick={() =>
              updateMut.mutate({
                id: job.id,
                status,
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                internalNotes: notes,
              })
            }
            disabled={updateMut.isPending}
            className="bg-amber-600 hover:bg-amber-500 text-white"
          >
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Section ─────────────────────────────────────────────────────────────

export default function NativeJobsSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "in_progress" | "completed" | "cancelled">("all");
  const [selectedJob, setSelectedJob] = useState<NativeJob | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: jobs = [], isLoading, refetch } = trpc.nativeJobs.list.useQuery({
    search: search || undefined,
    status: statusFilter,
    limit: 100,
  });

  const { data: invoices = [] } = trpc.nativeJobs.listInvoices.useQuery({});

  const deleteMut = trpc.nativeJobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Job deleted");
      utils.nativeJobs.list.invalidate();
      if (selectedJob?.id === deleteConfirmId) setSelectedJob(null);
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const markPaidMut = trpc.nativeJobs.markInvoicePaid.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      utils.nativeJobs.list.invalidate();
      utils.nativeJobs.listInvoices.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMut = trpc.nativeJobs.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.nativeJobs.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Status filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: jobs.length, scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 };
    for (const j of jobs) {
      if (j.status in counts) counts[j.status]++;
    }
    return counts;
  }, [jobs]);

  const jobInvoices = useMemo(() => {
    if (!selectedJob) return [];
    return invoices.filter(inv => inv.jobId === selectedJob.id);
  }, [invoices, selectedJob]);

  const lineItems: LineItem[] = useMemo(() => {
    if (!selectedJob) return [];
    try { return JSON.parse(selectedJob.lineItems || "[]"); } catch { return []; }
  }, [selectedJob]);

  const statusPills: Array<{ key: typeof statusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "scheduled", label: "Scheduled" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Left: Table ── */}
      <div className={`flex flex-col ${selectedJob ? "w-[55%]" : "w-full"} min-h-0 transition-all duration-200`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-zinc-800 border-zinc-700 text-sm h-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="text-zinc-400 hover:text-white h-9 w-9"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (jobs.length === 0) return;
              const headers = ["ID", "Client", "Phone", "Email", "Address", "Service", "Acreage", "Status", "Scheduled Date", "Completed At", "Total ($)", "Deposit Paid ($)", "Balance Due ($)", "Notes"];
              const rows = jobs.map(j => [
                j.id,
                j.clientName,
                j.clientPhone ?? "",
                j.clientEmail ?? "",
                j.propertyAddress ?? "",
                j.serviceType ?? "",
                j.acreage ?? "",
                j.status,
                j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString() : "",
                j.completedAt ? new Date(j.completedAt).toLocaleDateString() : "",
                ((j.totalCents ?? 0) / 100).toFixed(2),
                ((j.paidCents ?? 0) / 100).toFixed(2),
                (((j.totalCents ?? 0) - (j.paidCents ?? 0)) / 100).toFixed(2),
                (j.internalNotes ?? "").replace(/"/g, "'").replace(/\n/g, " "),
              ]);
              const csv = [headers, ...rows]
                .map(r => r.map(v => `"${v}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `noland-jobs-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-zinc-400 hover:text-white h-9 w-9"
            title="Export filtered jobs to CSV"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-4 py-2 border-b border-zinc-800 overflow-x-auto">
          {statusPills.map(pill => (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === pill.key
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {pill.label}
              {statusCounts[pill.key] > 0 && (
                <span className="ml-1.5 opacity-70">{statusCounts[pill.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-2">
              <Briefcase className="w-8 h-8 opacity-30" />
              <p className="text-sm">No jobs found</p>
              <p className="text-xs text-zinc-600">Jobs are created when you convert a quote.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Service</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job as NativeJob)}
                    className={`border-b border-zinc-800/50 cursor-pointer transition-colors ${
                      selectedJob?.id === job.id
                        ? "bg-amber-900/20 border-l-2 border-l-amber-500"
                        : idx % 2 === 0
                        ? "bg-zinc-900/50 hover:bg-zinc-800/50"
                        : "bg-zinc-900 hover:bg-zinc-800/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{job.clientName}</div>
                      {job.propertyAddress && (
                        <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[180px]">{job.propertyAddress}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div>{job.serviceType ?? "—"}</div>
                      {job.acreage && <div className="text-xs text-zinc-500">{job.acreage} ac</div>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {fmtDate(job.scheduledDate ?? job.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-medium whitespace-nowrap">
                      {fmt(job.totalCents)}
                    </td>
                    <td className="px-4 py-3">
                      <JobStatusBadge status={job.status} paidAt={job.paidAt} invoicedAt={job.invoicedAt} />
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      {selectedJob && (
        <div className="w-[45%] border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-900">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <h3 className="font-semibold text-white">{selectedJob.clientName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <JobStatusBadge status={selectedJob.status} paidAt={selectedJob.paidAt} invoicedAt={selectedJob.invoicedAt} />
                {selectedJob.quoteId && (
                  <span className="text-xs text-zinc-500">Quote #{selectedJob.quoteId}</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedJob(null)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Contact info */}
            <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Contact</div>
              {selectedJob.clientEmail && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <a href={`mailto:${selectedJob.clientEmail}`} className="hover:text-amber-400">{selectedJob.clientEmail}</a>
                </div>
              )}
              {selectedJob.clientPhone && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <a href={`tel:${selectedJob.clientPhone}`} className="hover:text-amber-400">{selectedJob.clientPhone}</a>
                </div>
              )}
              {selectedJob.propertyAddress && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{selectedJob.propertyAddress}</span>
                </div>
              )}
            </div>

            {/* Job details */}
            <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Job Details</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-zinc-500 text-xs">Service</div>
                  <div className="text-zinc-200">{selectedJob.serviceType ?? "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Acreage</div>
                  <div className="text-zinc-200">{selectedJob.acreage ? `${selectedJob.acreage} acres` : "—"}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Scheduled</div>
                  <div className="text-zinc-200">{fmtDate(selectedJob.scheduledDate)}</div>
                </div>
                <div>
                  <div className="text-zinc-500 text-xs">Completed</div>
                  <div className="text-zinc-200">{fmtDate(selectedJob.completedAt)}</div>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Financials</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Job Total</span>
                <span className="text-amber-400 font-bold text-base">{fmt(selectedJob.totalCents)}</span>
              </div>
              {selectedJob.invoicedCents != null && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-zinc-400">Invoiced</span>
                  <span className="text-zinc-200">{fmt(selectedJob.invoicedCents)}</span>
                </div>
              )}
              {selectedJob.paidCents != null && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-zinc-400">Paid</span>
                  <span className="text-green-400">{fmt(selectedJob.paidCents)}</span>
                </div>
              )}
            </div>

            {/* Line items */}
            {lineItems.length > 0 && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Line Items</div>
                <div className="space-y-1">
                  {lineItems.map((li, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300 truncate mr-2">{li.description}</span>
                      <span className="text-zinc-400 whitespace-nowrap">{fmt(li.totalCents)}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-700 pt-1 mt-1 flex items-center justify-between text-sm font-semibold">
                    <span className="text-zinc-300">Total</span>
                    <span className="text-amber-400">{fmt(selectedJob.totalCents)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Internal notes */}
            {selectedJob.internalNotes && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Internal Notes</div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedJob.internalNotes}</p>
              </div>
            )}

            {/* Invoices list */}
            {jobInvoices.length > 0 && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Invoices</div>
                <div className="space-y-2">
                  {jobInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="text-zinc-200">{fmt(inv.totalCents)}</div>
                        <div className="text-xs text-zinc-500">{fmtDate(inv.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.status === "paid" ? (
                          <Badge className="bg-green-600 text-white text-xs">Paid</Badge>
                        ) : inv.status === "sent" ? (
                          <Badge className="bg-sky-600 text-white text-xs">Sent</Badge>
                        ) : (
                          <Badge className="bg-zinc-600 text-white text-xs">Unpaid</Badge>
                        )}
                        {inv.pdfUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white"
                            onClick={() => window.open(inv.pdfUrl!, "_blank")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {inv.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-900/20"
                            onClick={() => markPaidMut.mutate({ invoiceId: inv.id })}
                            disabled={markPaidMut.isPending}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick status update */}
            {selectedJob.status !== "completed" && selectedJob.status !== "cancelled" && (
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Quick Actions</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedJob.status === "scheduled" && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8"
                      onClick={() => updateStatusMut.mutate({ id: selectedJob.id, status: "in_progress" })}
                      disabled={updateStatusMut.isPending}
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      Start Job
                    </Button>
                  )}
                  {selectedJob.status === "in_progress" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                      onClick={() => updateStatusMut.mutate({ id: selectedJob.id, status: "completed", completedAt: new Date() })}
                      disabled={updateStatusMut.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Panel footer actions */}
          <div className="border-t border-zinc-800 p-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600 text-zinc-300 hover:text-white text-xs h-8"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
            {selectedJob.status === "completed" && !selectedJob.invoicedAt && (
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-8"
                onClick={() => setShowInvoiceDialog(true)}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Send Final Invoice
              </Button>
            )}
            {selectedJob.invoicedAt && !selectedJob.paidAt && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white text-xs h-8"
                onClick={() => {
                  const inv = jobInvoices[0];
                  if (inv) markPaidMut.mutate({ invoiceId: inv.id });
                }}
                disabled={markPaidMut.isPending || jobInvoices.length === 0}
              >
                <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                Mark Paid
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-xs h-8 ml-auto"
              onClick={() => setDeleteConfirmId(selectedJob.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      {showInvoiceDialog && selectedJob && (
        <GenerateInvoiceDialog
          job={selectedJob}
          open={showInvoiceDialog}
          onClose={() => setShowInvoiceDialog(false)}
          onSuccess={(invoice) => {
            utils.nativeJobs.list.invalidate();
            utils.nativeJobs.listInvoices.invalidate();
            setSelectedJob((current) => current?.id === selectedJob.id
              ? { ...current, invoicedCents: invoice.totalCents, invoicedAt: new Date() }
              : current);
          }}
        />
      )}

      {showEditDialog && selectedJob && (
        <EditJobDialog
          job={selectedJob}
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            utils.nativeJobs.list.invalidate();
          }}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Job?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">This will permanently delete the job record. This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-zinc-600">Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => deleteConfirmId !== null && deleteMut.mutate({ id: deleteConfirmId })}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
