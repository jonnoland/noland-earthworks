/**
 * Leads Page — Noland Earthworks
 * Live data from tRPC: list, create, update stage, delete
 */

import DashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  UserPlus, Plus, Search, Trash2, Edit3,
  Phone, Mail, MapPin, DollarSign, Loader2, X, Briefcase,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STAGE_OPTIONS = ["new", "contacted", "converted", "estimate_sent", "negotiating", "won", "lost"] as const;
const SOURCE_OPTIONS = ["google", "facebook", "referral", "website", "direct", "other"] as const;

type LeadStage = typeof STAGE_OPTIONS[number];
type LeadSource = typeof SOURCE_OPTIONS[number];

const STAGE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", converted: "Converted", estimate_sent: "Estimate Sent", negotiating: "Negotiating", won: "Won", lost: "Lost",
};

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  converted: "bg-green-500/15 text-green-400 border-green-500/30",
  estimate_sent: "bg-primary/15 text-primary border-primary/30",
  negotiating: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  won: "bg-green-500/15 text-green-400 border-green-500/30",
  lost: "bg-red-500/15 text-red-400 border-red-500/30",
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

const JOB_TYPE_OPTIONS = ["land_clearing", "forestry_mulching", "brush_removal", "stump_grinding", "wildfire_mitigation"] as const;
type JobType = typeof JOB_TYPE_OPTIONS[number];
type JobStatus = "estimate" | "scheduled" | "in_progress" | "completed" | "invoiced" | "paid";

interface JobFormData {
  title: string; client: string; address: string; jobType: JobType;
  status: JobStatus; acres: string; crewDays: string; totalPrice: string; notes: string;
}
const emptyJobForm: JobFormData = {
  title: "", client: "", address: "", jobType: "land_clearing",
  status: "estimate", acres: "", crewDays: "", totalPrice: "", notes: "",
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  type SortField = "name" | "estimatedValue" | "createdAt" | "none";
  type SortDir = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField>("none");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<LeadFormData>(emptyForm);
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState<JobFormData>(emptyJobForm);
  const [convertingLeadId, setConvertingLeadId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: leads = [], isLoading } = trpc.ops.leads.list.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30 seconds so new quote submissions appear automatically
  });

  // Optimistic quick-update for inline status changes
  const quickUpdateStage = trpc.ops.leads.update.useMutation({
    onMutate: async ({ id, stage }) => {
      await utils.ops.leads.list.cancel();
      const prev = utils.ops.leads.list.getData();
      utils.ops.leads.list.setData(undefined, old =>
        old ? old.map(l => l.id === id ? { ...l, stage: stage ?? l.stage } : l) : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) utils.ops.leads.list.setData(undefined, ctx.prev);
      toast.error("Failed to update status");
    },
    onSettled: () => utils.ops.leads.list.invalidate(),
  });

  const createJob = trpc.ops.jobs.create.useMutation({
    onSuccess: () => {
      utils.ops.jobs.list.invalidate();
      // Auto-advance the source lead to "Converted"
      if (convertingLeadId !== null) {
        quickUpdateStage.mutate({ id: convertingLeadId, stage: "converted" });
        setConvertingLeadId(null);
      }
      toast.success("Job created — lead marked Converted!");
      setShowJobModal(false);
      setJobForm(emptyJobForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const openConvertToJob = (lead: typeof leads[0]) => {
    // Map lead jobType string to a valid JobType enum value
    const jobTypeMap: Record<string, JobType> = {
      "Land Clearing": "land_clearing",
      "Forestry Mulching": "forestry_mulching",
      "Brush Removal": "brush_removal",
      "Stump Grinding": "stump_grinding",
      "Wildfire Mitigation": "wildfire_mitigation",
    };
    const mappedJobType: JobType = (lead.jobType && jobTypeMap[lead.jobType]) ? jobTypeMap[lead.jobType] : "land_clearing";
    setJobForm({
      title: `${lead.name} — ${lead.jobType ?? "Land Clearing"}`,
      client: lead.name,
      address: lead.address ?? "",
      jobType: mappedJobType,
      status: "estimate",
      acres: "",
      crewDays: "",
      totalPrice: lead.estimatedValue ?? "",
      notes: lead.notes ?? "",
    });
    setConvertingLeadId(lead.id);
    setShowJobModal(true);
  };

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

  const filtered = useMemo(() => {
    const closedStages = ["won", "lost"];
    const base = leads.filter(l => {
      const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.address ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStage =
        filterStage === "all" ||
        (filterStage === "closed" ? closedStages.includes(l.stage) : l.stage === filterStage);
      return matchSearch && matchStage;
    });
    if (sortField === "none") return base;
    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "estimatedValue") cmp = Number(a.estimatedValue ?? 0) - Number(b.estimatedValue ?? 0);
      else if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [leads, search, filterStage, sortField, sortDir]);

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

        {/* Status filter tabs */}
        {(() => {
          const closedStages = ["won", "lost"];
          const tabs = [
            { key: "all",       label: "All",       count: leads.length },
            { key: "new",       label: "New",       count: leads.filter(l => l.stage === "new").length },
            { key: "contacted", label: "Contacted", count: leads.filter(l => l.stage === "contacted").length },
            { key: "converted", label: "Converted", count: leads.filter(l => l.stage === "converted").length },
            { key: "closed",    label: "Closed",    count: leads.filter(l => closedStages.includes(l.stage)).length },
          ];
          return (
            <div className="flex items-center gap-1 bg-secondary/40 border border-border rounded-lg p-1 w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStage(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    filterStage === tab.key
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                    filterStage === tab.key
                      ? tab.key === "new" ? "bg-blue-500/20 text-blue-400"
                        : tab.key === "contacted" ? "bg-cyan-500/20 text-cyan-400"
                        : tab.key === "converted" ? "bg-green-500/20 text-green-400"
                        : tab.key === "closed" ? "bg-muted text-muted-foreground"
                        : "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Header actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search leads..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-md text-xs text-foreground outline-none focus:border-primary/50 w-52 placeholder:text-muted-foreground/40" />
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
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Lead
                        {sortField === "name" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Location</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Source</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("estimatedValue")} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                        Value
                        {sortField === "estimatedValue" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">
                      <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                        Date
                        {sortField === "createdAt" ? (sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                      </button>
                    </th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id} className={cn("border-b border-border/50 hover:bg-secondary/20 transition-colors", i % 2 === 0 ? "" : "bg-secondary/5")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{lead.name}</span>
                          {(() => {
                            const closedStages = ["won", "lost", "converted"];
                            if (closedStages.includes(lead.stage)) return null;
                            const lastUpdate = lead.updatedAt ? new Date(lead.updatedAt).getTime() : (lead.createdAt ? new Date(lead.createdAt).getTime() : null);
                            if (!lastUpdate) return null;
                            const daysSince = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);
                            if (daysSince < 7) return null;
                            return (
                              <span
                                title={`No activity in ${Math.floor(daysSince)} days`}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                                style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.35)", whiteSpace: "nowrap" }}
                              >
                                {Math.floor(daysSince)}d stale
                              </span>
                            );
                          })()}
                        </div>
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
                        <select
                          value={lead.stage}
                          onChange={e => quickUpdateStage.mutate({ id: lead.id, stage: e.target.value as LeadStage })}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer outline-none bg-transparent appearance-none",
                            STAGE_COLORS[lead.stage]
                          )}
                        >
                          {STAGE_OPTIONS.map(s => (
                            <option key={s} value={s} className="bg-background text-foreground text-xs">
                              {STAGE_LABELS[s]}
                            </option>
                          ))}
                        </select>
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
                      <td className="px-4 py-3 text-right text-muted-foreground hidden xl:table-cell">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openConvertToJob(lead)}
                            title="Convert to Job"
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                            <Briefcase className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => openEdit(lead)} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if (confirm("Delete this lead?")) deleteLead.mutate({ id: lead.id }); }}
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
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Johnson Farm"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(615) 555-0100"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, TN"
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
      {/* Convert to Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ops-card w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Convert to Job</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Pre-filled from lead — review and save</p>
              </div>
              <button onClick={() => { setShowJobModal(false); setConvertingLeadId(null); }} className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createJob.mutate(jobForm); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Title *</label>
                  <input required value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Client *</label>
                  <input required value={jobForm.client} onChange={e => setJobForm(f => ({ ...f, client: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Job Type</label>
                  <select value={jobForm.jobType} onChange={e => setJobForm(f => ({ ...f, jobType: e.target.value as JobType }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
                    {JOB_TYPE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Address</label>
                  <input value={jobForm.address} onChange={e => setJobForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
                  <select value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value as JobStatus }))}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50">
                    {(["estimate","scheduled","in_progress","completed","invoiced","paid"] as JobStatus[]).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Total Price ($)</label>
                  <input type="number" step="100" value={jobForm.totalPrice} onChange={e => setJobForm(f => ({ ...f, totalPrice: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Acres</label>
                  <input value={jobForm.acres} onChange={e => setJobForm(f => ({ ...f, acres: e.target.value }))}
                    placeholder="e.g. 5"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Crew Days</label>
                  <input value={jobForm.crewDays} onChange={e => setJobForm(f => ({ ...f, crewDays: e.target.value }))}
                    placeholder="e.g. 2"
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
                  <textarea value={jobForm.notes} onChange={e => setJobForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                    className="w-full bg-secondary/50 border border-border rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowJobModal(false); setConvertingLeadId(null); }}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" disabled={createJob.isPending}
                  className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {createJob.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
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
