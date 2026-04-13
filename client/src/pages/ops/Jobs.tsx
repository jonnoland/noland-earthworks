/**
 * Jobs Page — Noland Earthworks
 * Live data from tRPC: list, create, update, delete
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Briefcase, Plus, Search, Trash2, Edit3, ChevronDown,
  MapPin, Clock, DollarSign, Loader2, X,
  RefreshCw, ExternalLink, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const JOB_TYPE_LABELS: Record<string, string> = {
  land_clearing: "Land Clearing",
  forestry_mulching: "Forestry Mulching",
  brush_removal: "Brush Removal",
  stump_grinding: "Stump Grinding",
  wildfire_mitigation: "Wildfire Mitigation",
};

const STATUS_COLORS: Record<string, string> = {
  estimate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  invoiced: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const STATUS_OPTIONS = ["estimate", "scheduled", "in_progress", "completed", "invoiced", "paid"] as const;
const JOB_TYPE_OPTIONS = ["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"] as const;

type JobStatus = typeof STATUS_OPTIONS[number];
type JobType = typeof JOB_TYPE_OPTIONS[number];

interface JobFormData {
  title: string; client: string; address: string; jobType: JobType;
  status: JobStatus; acres: string; crewDays: string; totalPrice: string; notes: string;
}

const emptyForm: JobFormData = {
  title: "", client: "", address: "", jobType: "land_clearing",
  status: "estimate", acres: "", crewDays: "", totalPrice: "", notes: "",
};

// ─── Jobber Jobs Section ─────────────────────────────────────────────────────────────

const JOBBER_STATUS_COLORS: Record<string, string> = {
  QUOTE: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  ACTIVE: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  REQUIRES_INVOICING: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  COMPLETED: "bg-green-500/15 text-green-400 border-green-500/30",
  ARCHIVED: "bg-secondary/50 text-muted-foreground border-border",
};

function JobberJobsSection() {
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.jobs.useQuery({ first: 50 }, { retry: false });

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

  const formatMoney = (val: number | null | undefined) =>
    val == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  const formatDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="px-6 pb-6">
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/10 border-b border-border">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Live from Jobber</span>
            {!isLoading && !notConnected && (
              <span className="text-[10px] bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded-full">
                {totalCount} jobs
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh Jobber jobs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <a
              href="https://app.getjobber.com/jobs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open in Jobber
            </a>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Not connected */}
        {!isLoading && notConnected && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <AlertCircle className="w-6 h-6 text-yellow-500/60" />
            <p className="text-xs text-muted-foreground">
              Connect Jobber in{" "}
              <a href="/ops/settings" className="text-primary hover:underline">Settings</a>{" "}
              to see live jobs.
            </p>
          </div>
        )}

        {/* Jobs list */}
        {!isLoading && !notConnected && (
          <>
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Briefcase className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No jobs found in Jobber.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/10">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Job #</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Start</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((job, idx) => (
                      <tr
                        key={job.id}
                        className={cn(
                          "border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors",
                          idx % 2 === 0 ? "" : "bg-secondary/5"
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-muted-foreground">#{job.jobNumber ?? "—"}</td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">
                          {job.title || "Untitled Job"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {job.client?.name || job.client?.companyName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              JOBBER_STATUS_COLORS[job.jobStatus ?? "ACTIVE"] ?? "bg-secondary/50 text-muted-foreground border-border"
                            )}
                          >
                            {(job.jobStatus ?? "ACTIVE").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {formatDate(job.startAt)}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="flex items-center justify-end gap-0.5 text-primary font-semibold">
                            <DollarSign className="w-3 h-3" />
                            {formatMoney(job.total)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<JobFormData>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: jobs = [], isLoading } = trpc.ops.jobs.list.useQuery();

  const createJob = trpc.ops.jobs.create.useMutation({
    onSuccess: () => { utils.ops.jobs.list.invalidate(); toast.success("Job created"); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const updateJob = trpc.ops.jobs.update.useMutation({
    onSuccess: () => { utils.ops.jobs.list.invalidate(); toast.success("Job updated"); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteJob = trpc.ops.jobs.delete.useMutation({
    onSuccess: () => { utils.ops.jobs.list.invalidate(); toast.success("Job deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (job: typeof jobs[0]) => {
    setForm({
      title: job.title, client: job.client, address: job.address ?? "",
      jobType: job.jobType as JobType, status: job.status as JobStatus,
      acres: job.acres ?? "", crewDays: job.crewDays ?? "",
      totalPrice: job.totalPrice ?? "", notes: job.notes ?? "",
    });
    setEditingId(job.id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId !== null) updateJob.mutate({ id: editingId, ...form });
    else createJob.mutate(form);
  };

  const filtered = jobs.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.client.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const isPending = createJob.isPending || updateJob.isPending;
  const totalRevenue = jobs.reduce((s, j) => s + Number(j.totalPrice ?? 0), 0);
  const totalAcres = jobs.reduce((s, j) => s + Number(j.acres ?? 0), 0);

  return (
    <DashboardLayout title="Jobs" subtitle="Manage your land clearing jobs">
      <div className="p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Jobs", value: jobs.length.toString() },
            { label: "Active / In Progress", value: jobs.filter(j => j.status === "in_progress").length.toString() },
            { label: "Total Revenue", value: `$${totalRevenue.toLocaleString()}` },
            { label: "Total Acres", value: `${totalAcres.toFixed(1)} ac` },
          ].map((stat, i) => (
            <div key={i} className="ops-card p-4">
              <div className="text-lg font-bold text-foreground ops-metric-value">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search jobs..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-md text-xs text-foreground outline-none focus:border-primary/50 w-52 placeholder:text-muted-foreground/40" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-secondary/50 border border-border rounded-md text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer">
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all">
            <Plus className="w-3.5 h-3.5" />
            New Job
          </button>
        </div>

        {/* Jobs grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="ops-card p-12 text-center">
            <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No jobs found</p>
            <p className="text-xs text-muted-foreground mb-4">
              {search || filterStatus !== "all" ? "Try adjusting your filters" : "Create your first job to get started"}
            </p>
            {!search && filterStatus === "all" && (
              <button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all">
                + New Job
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(job => (
              <div key={job.id} className="ops-card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {job.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.client}</p>
                  </div>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", STATUS_COLORS[job.status])}>
                    {job.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{JOB_TYPE_LABELS[job.jobType]}</span>
                  {job.address && <span className="flex items-center gap-1 truncate max-w-[160px]"><MapPin className="w-3 h-3 shrink-0" />{job.address}</span>}
                  {job.acres && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.acres} ac</span>}
                  {job.totalPrice && <span className="flex items-center gap-1 text-primary font-semibold"><DollarSign className="w-3 h-3" />${Number(job.totalPrice).toLocaleString()}</span>}
                </div>
                {job.notes && <p className="text-[11px] text-muted-foreground/70 line-clamp-2 border-t border-border/50 pt-2">{job.notes}</p>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(job)} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(job.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Jobber Jobs Section ── */}
      <JobberJobsSection />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {editingId ? "Edit Job" : "New Job"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
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
                  <input type="number" step="100" value={form.totalPrice} onChange={e => setForm(f => ({ ...f, totalPrice: e.target.value }))} placeholder="0"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Job notes..." rows={2}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Delete Job</h3>
            <p className="text-xs text-muted-foreground">
              This will permanently remove the job record. This cannot be undone.
            </p>
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-semibold text-red-400">The following will also be deleted:</p>
              <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
                <li>All schedule entries linked to this job</li>
                <li>All notes and field data on the record</li>
              </ul>
              <p className="text-[11px] text-muted-foreground mt-1">Any associated Jobber records are not affected.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteJob.mutate({ id: deleteConfirmId }); setDeleteConfirmId(null); }}
                disabled={deleteJob.isPending}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteJob.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
