/**
 * Leads Page — Noland Earthworks
 * Live data from tRPC: list, create, update stage, delete
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  UserPlus, Plus, Search, Trash2, Edit3, ChevronDown,
  Phone, Mail, MapPin, DollarSign, Loader2, X,
  RefreshCw, ExternalLink, AlertCircle, Inbox, Briefcase,
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STAGE_OPTIONS = ["new", "contacted", "estimate_sent", "negotiating", "won", "lost"] as const;
const CONVERTED_STAGE = "converted";
const SOURCE_OPTIONS = ["google", "facebook", "referral", "website", "direct", "other"] as const;

type LeadStage = typeof STAGE_OPTIONS[number];
type LeadSource = typeof SOURCE_OPTIONS[number];

const STAGE_LABELS: Record<string, string> = {
  new: "New Lead", contacted: "Contacted", estimate_sent: "Estimate Sent", negotiating: "Negotiating",
  won: "Won", lost: "Lost", converted: "Converted to Job",
};

const JOB_TYPE_OPTIONS = [
  { value: "land_clearing", label: "Land Clearing" },
  { value: "forestry_mulching", label: "Forestry Mulching" },
  { value: "brush_removal", label: "Brush Removal" },
  { value: "stump_grinding", label: "Stump Grinding" },
  { value: "wildfire_mitigation", label: "Wildfire Mitigation" },
] as const;

type JobTypeValue = typeof JOB_TYPE_OPTIONS[number]["value"];

interface ConvertForm {
  title: string;
  client: string;
  address: string;
  jobType: JobTypeValue;
  notes: string;
}

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  estimate_sent: "bg-primary/15 text-primary border-primary/30",
  negotiating: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  won: "bg-green-500/15 text-green-400 border-green-500/30",
  lost: "bg-red-500/15 text-red-400 border-red-500/30",
  converted: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

interface LeadFormData {
  name: string; phone: string; email: string; location: string; // maps to address in DB
  source: LeadSource; stage: LeadStage; jobType: string;
  estimatedValue: string; notes: string;
}

const emptyForm: LeadFormData = {
  name: "", phone: "", email: "", location: "",
  source: "google", stage: "new", jobType: "Land Clearing",
  estimatedValue: "", notes: "",
};

// ─── Jobber Requests Section ─────────────────────────────────────────────────

function JobberRequestsSection() {
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string>("");
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch, isFetching } =
    trpc.jobber.requests.useQuery({ first: 50 }, { retry: false });
  const deleteRequest = trpc.jobber.deleteRequest.useMutation({
    onSuccess: () => {
      toast.success("Request deleted from Jobber.");
      utils.jobber.requests.invalidate();
      setDeleteTargetId(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete request.");
      setDeleteTargetId(null);
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
    title?: string | null;
    requestStatus?: string | null;
    source?: string | null;
    createdAt?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    client?: { id?: string; name?: string | null; companyName?: string | null } | null;
    property?: { address?: { street1?: string | null; city?: string | null } | null } | null;
  }> = (data as any)?.nodes ?? [];

  const totalCount = (data as any)?.totalCount ?? nodes.length;

  const REQUEST_STATUS_COLORS: Record<string, string> = {
    NEW: "bg-blue-500/15 text-blue-400",
    ASSESSMENT: "bg-yellow-500/15 text-yellow-400",
    CONVERTED: "bg-green-500/15 text-green-400",
    ARCHIVED: "bg-secondary/50 text-muted-foreground",
  };

  return (
    <>
    <div className="px-6 pb-6">
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/10 border-b border-border">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">From Jobber</span>
            {!isLoading && !notConnected && (
              <span className="text-[10px] bg-secondary/50 text-muted-foreground px-2 py-0.5 rounded-full">
                {totalCount} requests
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Refresh Jobber requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <a
              href="https://app.getjobber.com/requests"
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
              to see live requests.
            </p>
          </div>
        )}

        {/* Requests list */}
        {!isLoading && !notConnected && (
          <>
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Inbox className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No requests found in Jobber.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/10">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Request</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((req, idx) => (
                      <tr
                        key={req.id}
                        className={cn(
                          "border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors",
                          idx % 2 === 0 ? "" : "bg-secondary/5"
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">
                          {req.title || "Untitled Request"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {req.client?.name || req.client?.companyName || req.contactName || "—"}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="space-y-0.5">
                            {req.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="w-2.5 h-2.5" />{req.phone}
                              </div>
                            )}
                            {req.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="w-2.5 h-2.5" />{req.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              REQUEST_STATUS_COLORS[req.requestStatus ?? "NEW"] ?? "bg-secondary/50 text-muted-foreground"
                            )}
                          >
                            {(req.requestStatus ?? "NEW").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { setDeleteTargetId(req.id); setDeleteTargetLabel(req.title || "this request"); }}
                            title="Delete request from Jobber"
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
            )}
          </>
        )}
      </div>
    </div>
    {/* Jobber request delete confirmation modal */}
    {deleteTargetId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Delete Request</h3>
          <p className="text-xs text-muted-foreground">
            Permanently delete <span className="font-medium text-foreground">{deleteTargetLabel}</span> from Jobber. This cannot be undone.
          </p>
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
            <p className="text-[11px] font-semibold text-red-400">The following will also be deleted in Jobber:</p>
            <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
              <li>All request details and contact information</li>
              <li>Any linked assessments or notes</li>
            </ul>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setDeleteTargetId(null)}
              className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteRequest.mutate({ id: deleteTargetId })}
              disabled={deleteRequest.isPending}
              className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {deleteRequest.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Delete from Jobber
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Leads() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LeadFormData>(emptyForm);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  // Convert-to-job modal state
  const [convertingLead, setConvertingLead] = useState<typeof leads[0] | null>(null);
  const [convertForm, setConvertForm] = useState<ConvertForm>({ title: "", client: "", address: "", jobType: "land_clearing", notes: "" });

  const utils = trpc.useUtils();
  const { data: leads = [], isLoading } = trpc.ops.leads.list.useQuery();

  const createLead = trpc.ops.leads.create.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); toast.success("Lead added"); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const updateLead = trpc.ops.leads.update.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); toast.success("Lead updated"); closeModal(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteLead = trpc.ops.leads.delete.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); toast.success("Lead deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const convertToJob = trpc.ops.leads.convertToJob.useMutation({
    onSuccess: (data) => {
      utils.ops.leads.list.invalidate();
      utils.ops.jobs.list.invalidate();
      setConvertingLead(null);
      toast.success("Lead converted to job");
      navigate("/ops/jobs");
    },
    onError: (e) => toast.error(e.message),
  });

  const openConvert = (lead: typeof leads[0]) => {
    const jobTypeMap: Record<string, JobTypeValue> = {
      "Land Clearing": "land_clearing", "land_clearing": "land_clearing",
      "Forestry Mulching": "forestry_mulching", "forestry_mulching": "forestry_mulching",
      "Brush Removal": "brush_removal", "brush_removal": "brush_removal",
      "Stump Grinding": "stump_grinding", "stump_grinding": "stump_grinding",
      "Wildfire Mitigation": "wildfire_mitigation", "wildfire_mitigation": "wildfire_mitigation",
    };
    setConvertForm({
      title: `${lead.name} — ${lead.jobType ?? "Land Clearing"}`,
      client: lead.name,
      address: lead.address ?? "",
      jobType: (lead.jobType ? jobTypeMap[lead.jobType] : undefined) ?? "land_clearing",
      notes: lead.notes ?? "",
    });
    setConvertingLead(lead);
  };

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };
  const openEdit = (lead: typeof leads[0]) => {
    setForm({
      name: lead.name, phone: lead.phone ?? "", email: lead.email ?? "",
      location: lead.address ?? "", source: lead.source as LeadSource,
      stage: lead.stage as LeadStage, jobType: lead.jobType ?? "Land Clearing",
      estimatedValue: lead.estimatedValue ?? "", notes: lead.notes ?? "",
    });
    setEditingId(lead.id);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { location, ...rest } = form;
    const payload = { ...rest, address: location };
    if (editingId !== null) updateLead.mutate({ id: editingId, ...payload });
    else createLead.mutate(payload);
  };

  const filtered = leads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.address ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === "all" || l.stage === filterStage;
    return matchSearch && matchStage;
  });

  const isPending = createLead.isPending || updateLead.isPending;
  const totalPipelineValue = leads.filter(l => !["won", "lost"].includes(l.stage))
    .reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);
  const wonValue = leads.filter(l => l.stage === "won")
    .reduce((s, l) => s + Number(l.estimatedValue ?? 0), 0);

  return (
    <DashboardLayout title="Leads" subtitle="Track your lead pipeline">
      <div className="p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Leads", value: leads.length.toString() },
            { label: "Open Pipeline", value: `$${totalPipelineValue.toLocaleString()}` },
            { label: "Won This Period", value: `$${wonValue.toLocaleString()}` },
            { label: "New This Week", value: leads.filter(l => l.stage === "new").length.toString() },
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
              <input type="text" placeholder="Search leads..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-md text-xs text-foreground outline-none focus:border-primary/50 w-52 placeholder:text-muted-foreground/40" />
            </div>
            <div className="relative">
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 bg-secondary/50 border border-border rounded-md text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer">
                <option value="all">All Stages</option>
                {STAGE_OPTIONS.map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all">
            <Plus className="w-3.5 h-3.5" />
            New Lead
          </button>
        </div>

        {/* Leads table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="ops-card p-12 text-center">
            <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">No leads found</p>
            <p className="text-xs text-muted-foreground mb-4">
              {search || filterStage !== "all" ? "Try adjusting your filters" : "Add your first lead to start tracking your pipeline"}
            </p>
            {!search && filterStage === "all" && (
              <button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all">
                + New Lead
              </button>
            )}
          </div>
        ) : (
          <div className="ops-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Lead</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Location</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stage</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Source</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Value</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id} className={cn("border-b border-border/50 hover:bg-secondary/20 transition-colors", i % 2 === 0 ? "" : "bg-secondary/5")}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{lead.name}</div>
                        {lead.notes && <div className="text-muted-foreground/60 text-[10px] mt-0.5 truncate max-w-[160px]">{lead.notes}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="space-y-0.5">
                          {lead.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-2.5 h-2.5" />{lead.phone}</div>}
                          {lead.email && <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-2.5 h-2.5" />{lead.email}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {lead.address && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />{lead.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", STAGE_COLORS[lead.stage])}>
                          {STAGE_LABELS[lead.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-muted-foreground capitalize">{lead.source}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {lead.estimatedValue && (
                          <span className="flex items-center justify-end gap-0.5 text-primary font-semibold">
                            <DollarSign className="w-3 h-3" />{Number(lead.estimatedValue).toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {lead.stage !== CONVERTED_STAGE && lead.stage !== "won" && lead.stage !== "lost" && (
                            <button
                              onClick={() => openConvert(lead)}
                              title="Convert to Job"
                              className="p-1.5 rounded-md hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors"
                            >
                              <Briefcase className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => openEdit(lead)} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(lead.id)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
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
      </div>

      {/* ── Jobber Requests Section ── */}
      <JobberRequestsSection />

      {/* Convert to Job Modal */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Convert to Job
              </h2>
              <button onClick={() => setConvertingLead(null)} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              A new job will be created from this lead and the lead will be marked as Converted.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                convertToJob.mutate({
                  leadId: convertingLead.id,
                  title: convertForm.title || undefined,
                  client: convertForm.client || undefined,
                  address: convertForm.address || undefined,
                  jobType: convertForm.jobType,
                  notes: convertForm.notes || undefined,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title</label>
                <input
                  required
                  value={convertForm.title}
                  onChange={e => setConvertForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Client Name</label>
                <input
                  required
                  value={convertForm.client}
                  onChange={e => setConvertForm(f => ({ ...f, client: e.target.value }))}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Property Address</label>
                <input
                  value={convertForm.address}
                  onChange={e => setConvertForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Optional"
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Job Type</label>
                <select
                  value={convertForm.jobType}
                  onChange={e => setConvertForm(f => ({ ...f, jobType: e.target.value as JobTypeValue }))}
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                >
                  {JOB_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={convertForm.notes}
                  onChange={e => setConvertForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional"
                  className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertToJob.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {convertToJob.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <Briefcase className="w-3 h-3" />
                  Convert to Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {editingId ? "Edit Lead" : "New Lead"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Name / Company *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Smith Ranch"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(512) 555-0100"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, TX"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Type</label>
                  <input value={form.jobType} onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))} placeholder="Land Clearing"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Stage</label>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value as LeadStage }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
                    {STAGE_OPTIONS.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as LeadSource }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Est. Value ($)</label>
                  <input type="number" step="100" value={form.estimatedValue} onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))} placeholder="0"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Lead notes..." rows={2}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/40" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {editingId ? "Save Changes" : "Add Lead"}
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
            <h3 className="text-sm font-semibold text-foreground">Delete Lead</h3>
            <p className="text-xs text-muted-foreground">
              This will permanently remove the lead record. This cannot be undone.
            </p>
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2.5 space-y-1">
              <p className="text-[11px] font-semibold text-red-400">The following will also be deleted:</p>
              <ul className="text-[11px] text-red-300/80 space-y-0.5 list-disc list-inside">
                <li>All contact info, notes, and estimated value</li>
                <li>Pipeline stage history for this lead</li>
              </ul>
              <p className="text-[11px] text-muted-foreground mt-1">If this lead was converted to a job, that job record is not affected.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteLead.mutate({ id: deleteConfirmId }); setDeleteConfirmId(null); }}
                disabled={deleteLead.isPending}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteLead.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
