/**
 * Facebook Leads — displays leads captured via Facebook Lead Ads.
 * KPI summary | Status filter tabs | Lead cards with contact info and status management
 */
import { useState } from "react";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Facebook,
  User,
  Mail,
  Phone,
  Calendar,
  ChevronDown,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "contacted" | "converted" | "lost";

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: "New", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Clock },
  contacted: { label: "Contacted", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: MessageSquare },
  converted: { label: "Converted", color: "bg-green-500/20 text-green-300 border-green-500/30", icon: CheckCircle },
  lost: { label: "Lost", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: XCircle },
};

// ─── Components ───────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-white/50 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function LeadCard({ lead, onStatusChange, onNotesChange }: {
  lead: {
    id: number;
    leadId: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    status: LeadStatus;
    notes: string | null;
    createdAt: Date;
    adId: string | null;
    campaignId: string | null;
    fields: Record<string, string>;
  };
  onStatusChange: (id: number, status: LeadStatus) => void;
  onNotesChange: (id: number, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const statusConfig = STATUS_CONFIG[lead.status];
  const StatusIcon = statusConfig.icon;

  const handleSaveNotes = () => {
    onNotesChange(lead.id, notes);
    setEditingNotes(false);
  };

  const formattedDate = new Date(lead.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Build extra fields (exclude already-shown ones)
  const extraFields = Object.entries(lead.fields).filter(
    ([k]) => !["full_name", "first_name", "last_name", "email", "phone_number", "phone"].includes(k)
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white truncate">{lead.name ?? "Unknown"}</h3>
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border cursor-pointer",
                  statusConfig.color
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-10 overflow-hidden">
                  {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([s, cfg]) => (
                    <button
                      key={s}
                      onClick={() => { onStatusChange(lead.id, s); setShowStatusMenu(false); }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/10 text-left",
                        s === lead.status ? "bg-white/5" : ""
                      )}
                    >
                      <cfg.icon className="h-3.5 w-3.5" />
                      <span className={cfg.color.split(" ")[1]}>{cfg.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-white/50">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-1 hover:text-white/80">
                <Mail className="h-3 w-3" />
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-white/80">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-white/40 hover:text-white/80 transition-colors"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
          {/* Extra form fields */}
          {extraFields.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {extraFields.map(([key, value]) => (
                <div key={key} className="bg-white/5 rounded-lg p-2">
                  <p className="text-xs text-white/40 capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-sm text-white/80">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Campaign info */}
          {(lead.campaignId || lead.adId) && (
            <div className="flex gap-2 text-xs text-white/40">
              {lead.campaignId && <span>Campaign: {lead.campaignId}</span>}
              {lead.adId && <span>Ad: {lead.adId}</span>}
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-white/40">Notes</p>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-white/40 hover:text-white/80"
                >
                  Edit
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-white/5 border-white/20 text-white text-sm min-h-[80px]"
                  placeholder="Add notes about this lead..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNotes} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingNotes(false); setNotes(lead.notes ?? ""); }} className="text-white/60 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/60 italic">
                {notes || "No notes yet."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type StatusFilter = "all" | LeadStatus;

export default function FacebookLeadsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: summary } = trpc.facebookLeads.summary.useQuery();
  const { data, isLoading, refetch } = trpc.facebookLeads.list.useQuery({
    status: statusFilter,
    limit: 50,
    offset: 0,
  });

  const utils = trpc.useUtils();

  const updateStatus = trpc.facebookLeads.updateStatus.useMutation({
    onSuccess: () => {
      utils.facebookLeads.list.invalidate();
      utils.facebookLeads.summary.invalidate();
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const updateNotes = trpc.facebookLeads.updateNotes.useMutation({
    onSuccess: () => {
      utils.facebookLeads.list.invalidate();
      toast.success("Notes saved");
    },
    onError: () => toast.error("Failed to save notes"),
  });

  const statusTabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "all", label: "All", count: summary?.total },
    { key: "new", label: "New", count: summary?.new },
    { key: "contacted", label: "Contacted", count: summary?.contacted },
    { key: "converted", label: "Converted", count: summary?.converted },
    { key: "lost", label: "Lost", count: summary?.lost },
  ];

  return (
    <OpsDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Facebook className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Facebook Leads</h1>
              <p className="text-sm text-white/50">Leads captured via Facebook Lead Ads</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-white/20 text-white/70 hover:text-white bg-transparent"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <a
              href="https://www.facebook.com/ads/manager"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white/70 hover:text-white bg-transparent"
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ads Manager
              </Button>
            </a>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={TrendingUp} label="Total Leads" value={summary?.total ?? 0} color="bg-blue-600/20 text-blue-400" />
          <KpiCard icon={Clock} label="New" value={summary?.new ?? 0} color="bg-blue-500/20 text-blue-300" />
          <KpiCard icon={CheckCircle} label="Converted" value={summary?.converted ?? 0} color="bg-green-500/20 text-green-300" />
          <KpiCard icon={MessageSquare} label="Contacted" value={summary?.contacted ?? 0} color="bg-amber-500/20 text-amber-300" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5",
                statusFilter === tab.key
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  statusFilter === tab.key ? "bg-white/20" : "bg-white/10"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Leads List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data?.leads.length ? (
          <div className="text-center py-16">
            <Facebook className="h-12 w-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              {statusFilter === "all"
                ? "No Facebook leads yet. Leads will appear here automatically when someone submits a Lead Ad form."
                : `No ${statusFilter} leads.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead as Parameters<typeof LeadCard>[0]["lead"]}
                onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
                onNotesChange={(id, notes) => updateNotes.mutate({ id, notes })}
              />
            ))}
          </div>
        )}
      </div>
    </OpsDashboardLayout>
  );
}
