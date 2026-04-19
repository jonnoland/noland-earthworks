/**
 * Jobs Page — Noland Earthworks
 * Primary data source: Jobber (live via tRPC)
 * Features: status filter tabs, search, slide-out detail panel, delete, local job creation
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  Briefcase, Plus, Search, Trash2,
  MapPin, DollarSign, Loader2, X,
  RefreshCw, ExternalLink, AlertCircle,
  Phone, Mail, User, ChevronRight,
  Calendar, CheckCircle2, Clock,
  FileText, History, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Status config ────────────────────────────────────────────────────────────

const JOBBER_STATUS_COLORS: Record<string, string> = {
  QUOTE:               "bg-yellow-500/15 text-yellow-400",
  ACTIVE:              "bg-blue-500/15 text-blue-400",
  REQUIRES_INVOICING:  "bg-purple-500/15 text-purple-400",
  COMPLETED:           "bg-green-500/15 text-green-400",
  ARCHIVED:            "bg-secondary/50 text-muted-foreground",
};

const JOBBER_STATUS_LABELS: Record<string, string> = {
  QUOTE:               "Quote",
  ACTIVE:              "Active",
  REQUIRES_INVOICING:  "Requires Invoicing",
  COMPLETED:           "Completed",
  ARCHIVED:            "Archived",
};

const STATUS_TABS = ["ALL", "ACTIVE", "QUOTE", "REQUIRES_INVOICING", "COMPLETED", "ARCHIVED"] as const;
type StatusTab = typeof STATUS_TABS[number];

function StatusBadge({ status }: { status: string }) {
  const cls = JOBBER_STATUS_COLORS[status] ?? "bg-secondary/50 text-muted-foreground";
  const label = JOBBER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
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
        Connect your Jobber account to view live job data from your CRM.
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

function DeleteJobModal({
  job,
  onConfirm,
  onCancel,
  isPending,
}: {
  job: { id: string; jobNumber?: number | null; title?: string | null };
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const label = job.title || `Job #${job.jobNumber ?? ""}`;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Delete Job</h3>
        <p className="text-xs text-muted-foreground">
          Permanently delete <span className="font-medium text-foreground">{label}</span> from Jobber. This cannot be undone.
        </p>
        <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-semibold text-red-400">The following will also be deleted in Jobber:</p>
          <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
            <li>All job details, visits, and work orders</li>
            <li>Any linked invoices and payment records</li>
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

// ─── Job Detail Panel ─────────────────────────────────────────────────────────

type DetailTab = "details" | "history";

function JobDetailPanel({
  jobId,
  onClose,
  onDelete,
}: {
  jobId: string;
  onClose: () => void;
  onDelete: (job: any) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const { data: job, isLoading, error } = trpc.jobber.jobDetail.useQuery(
    { id: jobId },
    { retry: false }
  );

  const { data: history, isLoading: historyLoading } = trpc.jobber.jobHistory.useQuery(
    { id: jobId },
    { enabled: activeTab === "history", retry: false }
  );

  const createInvoice = trpc.jobber.createInvoiceForJob.useMutation({
    onSuccess: (inv) => {
      toast.success(`Invoice #${inv?.invoiceNumber ?? ""} created in Jobber.`);
      setShowInvoiceForm(false);
      setInvoiceNote("");
    },
    onError: (e) => toast.error(e.message || "Failed to create invoice."),
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
        <div className="shrink-0 border-b border-border">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {isLoading ? "Loading..." : job ? `Job #${job.jobNumber ?? "—"}` : "Job Detail"}
              </span>
              {job?.jobStatus && <StatusBadge status={job.jobStatus} />}
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Tabs */}
          {!isLoading && job && (
            <div className="flex px-5 gap-1 pb-0">
              {(["details", "history"] as DetailTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "details" ? <FileText className="w-3 h-3" /> : <History className="w-3 h-3" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && (error || !job) && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Could not load job details.</p>
            </div>
          )}

          {/* ── History Tab ── */}
          {!isLoading && job && activeTab === "history" && (
            <>
              {historyLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!historyLoading && history && (
                <>
                  {/* Visits timeline */}
                  {(history as any).visits?.nodes?.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Visits</p>
                      <div className="relative pl-4">
                        <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                        {(history as any).visits.nodes.map((visit: any, i: number) => (
                          <div key={visit.id} className="relative mb-4 last:mb-0">
                            <div className={cn(
                              "absolute -left-2.5 top-1.5 w-2 h-2 rounded-full border-2",
                              visit.isComplete
                                ? "bg-green-500 border-green-500"
                                : "bg-blue-500 border-blue-500"
                            )} />
                            <div className="rounded-md bg-secondary/30 border border-border px-3 py-2.5 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-foreground">
                                  {visit.title || `Visit ${i + 1}`}
                                </span>
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full",
                                  visit.isComplete
                                    ? "bg-green-500/15 text-green-400"
                                    : "bg-blue-500/15 text-blue-400"
                                )}>
                                  {visit.isComplete ? "Complete" : "Scheduled"}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {visit.startAt ? new Date(visit.startAt).toLocaleString("en-US", {
                                  month: "short", day: "numeric", year: "numeric",
                                  hour: "numeric", minute: "2-digit",
                                }) : "No date"}
                                {visit.endAt && visit.endAt !== visit.startAt && (
                                  <> – {new Date(visit.endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</>
                                )}
                              </div>
                              {visit.assignedUsers?.nodes?.length > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  Assigned: {visit.assignedUsers.nodes.map((u: any) => u.name).join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoices */}
                  {(history as any).invoices?.nodes?.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Invoices</p>
                      <div className="space-y-2">
                        {(history as any).invoices.nodes.map((inv: any) => (
                          <div key={inv.id} className="flex items-center justify-between rounded-md bg-secondary/20 border border-border px-3 py-2.5">
                            <div>
                              <p className="text-xs font-medium text-foreground">
                                Invoice #{inv.invoiceNumber}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {inv.invoiceStatus?.replace(/_/g, " ")} · Due {formatDate(inv.dueDate)}
                              </p>
                            </div>
                            <span className="text-xs font-semibold text-foreground">
                              {formatMoney(inv.amounts?.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(history as any).visits?.nodes?.length === 0 &&
                    (history as any).invoices?.nodes?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <History className="w-8 h-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">No history found for this job.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!isLoading && job && activeTab === "details" && (
            <>
              {/* Title */}
              {job.title && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</p>
                  <p className="text-sm font-medium text-foreground">{job.title}</p>
                </div>
              )}

              {/* Client */}
              {job.client && (
                <div className="rounded-lg bg-secondary/30 border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {job.client.name || job.client.companyName || "—"}
                  </p>
                  {job.client.companyName && job.client.name && (
                    <p className="text-xs text-muted-foreground">{job.client.companyName}</p>
                  )}
                  {job.client.phones?.[0]?.number && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {job.client.phones[0].number}
                    </div>
                  )}
                  {job.client.emails?.[0]?.address && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {job.client.emails[0].address}
                    </div>
                  )}
                </div>
              )}

              {/* Property */}
              {job.property?.address?.street1 && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>
                    {job.property.address.street1}
                    {job.property.address.city && `, ${job.property.address.city}`}
                    {job.property.address.province && `, ${job.property.address.province}`}
                    {job.property.address.postalCode && ` ${job.property.address.postalCode}`}
                  </span>
                </div>
              )}

              {/* Dates */}
              <div className="rounded-lg bg-secondary/30 border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Dates</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {job.startAt && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Start</p>
                      <p className="font-medium text-foreground">{formatDate(job.startAt)}</p>
                    </div>
                  )}
                  {job.endAt && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">End</p>
                      <p className="font-medium text-foreground">{formatDate(job.endAt)}</p>
                    </div>
                  )}
                  {job.completedAt && (
                    <div>
                      <p className="text-muted-foreground mb-0.5">Completed</p>
                      <p className="font-medium text-green-400">{formatDate(job.completedAt)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground mb-0.5">Created</p>
                    <p className="font-medium text-foreground">{formatDate(job.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Total */}
              {job.total != null && (
                <div className="rounded-lg bg-secondary/30 border border-border p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-foreground">Job Total</span>
                    <span className="text-base font-bold text-primary">{formatMoney(job.total)}</span>
                  </div>
                </div>
              )}

              {/* Line Items */}
              {(job as any).lineItems?.nodes?.length > 0 && (
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
                        {(job as any).lineItems.nodes.map((item: any, i: number) => (
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

              {/* Visits */}
              {(job as any).visits?.nodes?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Visits</p>
                  <div className="space-y-2">
                    {(job as any).visits.nodes.map((visit: any, i: number) => (
                      <div key={i} className="flex items-center justify-between rounded-md bg-secondary/20 border border-border px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {visit.isComplete
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            : <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          }
                          <span className="text-xs font-medium text-foreground">
                            {visit.title || `Visit ${i + 1}`}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(visit.startAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions / Notes */}
              {(job as any).instructions && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Instructions</p>
                  <p className="text-xs text-muted-foreground bg-secondary/30 rounded-md p-3 whitespace-pre-wrap">
                    {(job as any).instructions}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {!isLoading && job && (
          <div className="shrink-0 border-t border-border px-5 py-4 space-y-3">
            {/* Send Invoice inline form */}
            {showInvoiceForm && (
              <div className="rounded-lg bg-secondary/30 border border-border p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Create Invoice in Jobber</p>
                <textarea
                  value={invoiceNote}
                  onChange={e => setInvoiceNote(e.target.value)}
                  placeholder="Optional message to client..."
                  rows={2}
                  className="w-full bg-secondary/50 border border-border rounded-md px-2.5 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInvoiceForm(false)}
                    className="flex-1 py-1.5 rounded-md text-xs text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createInvoice.mutate({ jobId: job.id, message: invoiceNote || undefined })}
                    disabled={createInvoice.isPending}
                    className="flex-1 py-1.5 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {createInvoice.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Create Invoice
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    onDelete(job);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
                {!showInvoiceForm && (
                  <button
                    onClick={() => setShowInvoiceForm(true)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Invoice
                  </button>
                )}
              </div>
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
        )}
      </div>
    </>
  );
}

// ─── Local Job Form types (kept for the Add Job modal) ────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  land_clearing: "Land Clearing",
  forestry_mulching: "Forestry Mulching",
  brush_removal: "Brush Removal",
  stump_grinding: "Stump Grinding",
  wildfire_mitigation: "Wildfire Mitigation",
};

const JOB_TYPE_OPTIONS = ["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"] as const;
const STATUS_OPTIONS = ["estimate", "scheduled", "in_progress", "completed", "invoiced", "paid"] as const;
type JobType = typeof JOB_TYPE_OPTIONS[number];
type JobStatus = typeof STATUS_OPTIONS[number];

interface JobFormData {
  title: string; client: string; address: string; jobType: JobType;
  status: JobStatus; acres: string; crewDays: string; totalPrice: string; notes: string;
  clientEmail: string; scheduledDate: string; scheduledEndDate: string; isHighPriority: boolean;
}

const emptyForm: JobFormData = {
  title: "", client: "", address: "", jobType: "land_clearing",
  status: "estimate", acres: "", crewDays: "", totalPrice: "", notes: "",
  clientEmail: "", scheduledDate: "", scheduledEndDate: "", isHighPriority: false,
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("ALL");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    jobNumber?: number | null;
    title?: string | null;
  } | null>(null);

  // Local job creation form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<JobFormData>(emptyForm);

  const utils = trpc.useUtils();

  // ── Jobber jobs query ──
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.jobs.useQuery({ first: 100 }, { retry: false });

  // ── Delete mutation ──
  const deleteJob = trpc.jobber.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job deleted from Jobber.");
      utils.jobber.jobs.invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete job.");
      setDeleteTarget(null);
    },
  });

  // ── Local job create (for manually tracked jobs) ──
  const { data: catalog = [] } = trpc.ops.settings.getServiceCatalog.useQuery();
  const createLocalJob = trpc.ops.jobs.create.useMutation({
    onSuccess: () => {
      toast.success("Job created locally.");
      utils.ops.jobs.list.invalidate();
      setShowAddModal(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const PRICE_PER_ACRE: Record<string, number> = {
    forestry_mulching: 1800, land_clearing: 1400,
    brush_removal: 900, stump_grinding: 600, wildfire_mitigation: 1200,
  };

  const estimatedPrice = useMemo(() => {
    const acres = parseFloat(form.acres);
    if (!acres || acres <= 0) return null;
    const catalogEntry = catalog.find(
      c => c.serviceType?.toLowerCase().replace(/[^a-z]/g, "_") === form.jobType ||
           c.serviceType?.toLowerCase().includes(form.jobType.replace(/_/g, " ").split(" ")[0])
    );
    const DAY_RATE = 1800;
    if (catalogEntry && catalogEntry.normalAcresPerDay) {
      const days = Math.ceil(acres / Number(catalogEntry.normalAcresPerDay));
      return Math.round(days * DAY_RATE / 100) * 100;
    }
    const rate = PRICE_PER_ACRE[form.jobType] ?? 1200;
    return Math.round(acres * rate / 100) * 100;
  }, [form.acres, form.jobType, catalog]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLocalJob.mutate({
      ...form,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate) : undefined,
      scheduledEndDate: form.scheduledEndDate ? new Date(form.scheduledEndDate) : undefined,
      isHighPriority: form.isHighPriority,
    });
  };

  // ── Derived data ──
  const notConnected =
    !isLoading &&
    (error?.message?.includes("not connected") ||
      error?.message?.includes("not authorized") ||
      error?.message?.includes("token") ||
      !data);

  const nodes: Array<{
    id: string;
    jobNumber?: number | null;
    title?: string | null;
    jobStatus?: string | null;
    jobType?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    total?: number | null;
    createdAt?: string | null;
    client?: { id?: string; name?: string | null; companyName?: string | null } | null;
    property?: { address?: { street1?: string | null; city?: string | null } | null } | null;
  }> = (data as any)?.nodes ?? [];

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  const filtered = useMemo(() => {
    return nodes.filter((job) => {
      const matchStatus = statusTab === "ALL" || job.jobStatus === statusTab;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (job.title ?? "").toLowerCase().includes(q) ||
        (job.client?.name ?? "").toLowerCase().includes(q) ||
        (job.client?.companyName ?? "").toLowerCase().includes(q) ||
        String(job.jobNumber ?? "").includes(q);
      return matchStatus && matchSearch;
    });
  }, [nodes, statusTab, search]);

  // Stats from Jobber data
  const activeCount = nodes.filter(j => j.jobStatus === "ACTIVE").length;
  const totalRevenue = nodes.reduce((s, j) => s + (j.total ?? 0), 0);
  const requiresInvoicingCount = nodes.filter(j => j.jobStatus === "REQUIRES_INVOICING").length;

  return (
    <DashboardLayout title="Jobs" subtitle="Live from Jobber">
      <div className="space-y-5 pb-10">
        {/* Stats row */}
        {!isLoading && !notConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Jobs", value: totalCount.toString() },
              { label: "Active", value: activeCount.toString() },
              { label: "Requires Invoicing", value: requiresInvoicingCount.toString() },
              { label: "Total Value", value: formatMoney(totalRevenue) },
            ].map((stat, i) => (
              <div key={i} className="ops-card p-4">
                <div className="text-lg font-bold text-foreground ops-metric-value">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Header: search + refresh + add */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">All Jobs</h2>
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
                placeholder="Search jobs..."
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
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Job
            </Button>
          </div>
        </div>

        {/* Status filter tabs */}
        {!isLoading && !notConnected && (
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => {
              const count = tab === "ALL" ? nodes.length : nodes.filter(j => j.jobStatus === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
                  }`}
                >
                  {tab === "ALL" ? "All" : JOBBER_STATUS_LABELS[tab] ?? tab.replace(/_/g, " ")}
                  {count > 0 && (
                    <span className={`ml-1.5 text-[10px] ${statusTab === tab ? "opacity-80" : "opacity-60"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
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

        {/* Jobs table */}
        {!isLoading && !notConnected && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Briefcase className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search || statusTab !== "ALL"
                    ? "No jobs match your filters."
                    : "No jobs found in Jobber."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Job #</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Start</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Total</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((job, idx) => (
                        <tr
                          key={job.id}
                          onClick={() => setSelectedJobId(job.id)}
                          className={cn(
                            "border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer",
                            idx % 2 === 0 ? "" : "bg-secondary/5",
                            selectedJobId === job.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            #{job.jobNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                            <div className="flex items-center gap-1.5">
                              {job.title || "Untitled Job"}
                              <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                            {job.client?.name || job.client?.companyName || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={job.jobStatus ?? "ACTIVE"} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                            {formatDate(job.startAt)}
                          </td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell">
                            <div className="flex items-center justify-end gap-1 text-foreground font-medium">
                              <DollarSign className="w-3 h-3 text-green-500" />
                              {formatMoney(job.total)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(job);
                              }}
                              title="Delete job"
                              className="text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* Job detail slide-out panel */}
      {selectedJobId && (
        <JobDetailPanel
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onDelete={(job) => setDeleteTarget(job)}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteJobModal
          job={deleteTarget}
          onConfirm={() => deleteJob.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteJob.isPending}
        />
      )}

      {/* Add Job Modal (local job creation) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">New Job</h2>
              <button
                onClick={() => { setShowAddModal(false); setForm(emptyForm); }}
                className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4 bg-secondary/30 rounded-md px-3 py-2">
              This creates a local job record. To create a job in Jobber, use{" "}
              <a href="https://secure.getjobber.com/home" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Jobber directly
              </a>.
            </p>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Bear Creek Clearing"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Client *</label>
                  <input required value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="Client name"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Job site address"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Type</label>
                  <select value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value as JobType }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
                    {JOB_TYPE_OPTIONS.map(t => <option key={t} value={t}>{JOB_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as JobStatus }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Acres</label>
                  <input type="number" step="0.1" value={form.acres} onChange={e => setForm(f => ({ ...f, acres: e.target.value }))} placeholder="0.0"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Crew-Days</label>
                  <input type="number" step="0.5" value={form.crewDays} onChange={e => setForm(f => ({ ...f, crewDays: e.target.value }))} placeholder="0"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Total Price ($)</label>
                  <div className="flex gap-1.5">
                    <input type="number" step="100" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} placeholder="0"
                      className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                    {estimatedPrice !== null && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, totalPrice: estimatedPrice.toString() }))}
                        className="shrink-0 px-2.5 py-1.5 rounded-md bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-semibold border border-primary/20 transition-colors whitespace-nowrap">
                        Use ${estimatedPrice.toLocaleString()}
                      </button>
                    )}
                  </div>
                  {estimatedPrice !== null && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      Catalog estimate for {form.acres} ac {JOB_TYPE_LABELS[form.jobType]}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Client Email</label>
                  <input type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="client@email.com"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Scheduled Start</label>
                  <input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Scheduled End</label>
                  <input type="date" value={form.scheduledEndDate} onChange={e => setForm(f => ({ ...f, scheduledEndDate: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Job notes..." rows={2}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isHighPriority}
                      onClick={() => setForm(f => ({ ...f, isHighPriority: !f.isHighPriority }))}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
                        form.isHighPriority ? "bg-red-500" : "bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        form.isHighPriority ? "translate-x-4" : "translate-x-0"
                      )} />
                    </button>
                    <span className="text-xs font-medium text-muted-foreground">
                      High Priority
                      {form.isHighPriority && <span className="ml-1.5 text-red-400 font-semibold">— flagged</span>}
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setForm(emptyForm); }}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createLocalJob.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {createLocalJob.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
