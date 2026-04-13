/**
 * Leads Page — Noland Earthworks
 * Kanban board layout: New Lead | Contacted | Site Visit | Quote Sent | Follow-Up
 * Bottom bar: Won | Lost | On Hold
 * Slide-in detail panel on lead click
 */

import DashboardLayout from "@/components/DashboardLayout";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Phone, Mail, MessageSquare, FileText, Calendar,
  Plus, Search, X, Loader2, CheckCircle2, XCircle,
  MapPin, Clock, RefreshCw, ExternalLink, Trash2,
  ChevronRight, AlarmClock, User, PhoneCall, PhoneOff,
  ClipboardList, Star, Snowflake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

const KANBAN_STAGES = [
  { id: "new",           label: "New Lead",   subtitle: "Fresh inquiries",          color: "text-blue-400" },
  { id: "contacted",     label: "Contacted",  subtitle: "Leads you've spoken with", color: "text-cyan-400" },
  { id: "estimate_sent", label: "Site Visit", subtitle: "Site visits scheduled",    color: "text-amber-400" },
  { id: "negotiating",   label: "Quote Sent", subtitle: "Proposals delivered",      color: "text-purple-400" },
  { id: "converted",     label: "Follow-Up",  subtitle: "Chasing decisions",        color: "text-orange-400" },
] as const;

const CLOSED_STAGES = [
  { id: "won",  label: "Won",     icon: Star,      color: "text-green-400 border-green-500/30 bg-green-500/10" },
  { id: "lost", label: "Lost",    icon: XCircle,   color: "text-red-400 border-red-500/30 bg-red-500/10" },
  { id: "on_hold", label: "On Hold", icon: Snowflake, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
] as const;

type KanbanStageId = typeof KANBAN_STAGES[number]["id"];
type ClosedStageId = typeof CLOSED_STAGES[number]["id"];
type AnyStage = KanbanStageId | ClosedStageId | "all";

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Search", facebook: "Facebook", referral: "Referral",
  website: "Website Form", direct: "Direct", other: "Other",
};

const WARMTH_LABELS = ["Cold", "Warm", "Hot"] as const;
const WARMTH_COLORS = [
  "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-red-500/20 text-red-300 border-red-500/30",
] as const;

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  source: string;
  stage: string;
  jobType?: string | null;
  estimatedValue?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const warmthIdx = lead.stage === "new" ? 1 : lead.stage === "contacted" ? 2 : 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/40 hover:bg-card/80 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {lead.estimatedValue ? `$${Number(lead.estimatedValue).toLocaleString()}` : "No estimate"}
            {" · "}
            {formatDate(lead.createdAt)}
          </p>
        </div>
        {lead.phone && (
          <div className="shrink-0 w-7 h-7 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center group-hover:bg-green-500/25 transition-colors">
            <Phone className="w-3.5 h-3.5 text-green-400" />
          </div>
        )}
      </div>
      {lead.address && (
        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          {lead.address}
        </p>
      )}
    </button>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, leads, onLeadClick,
}: {
  stage: typeof KANBAN_STAGES[number];
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}) {
  return (
    <div className="flex flex-col min-w-[260px] flex-1 bg-[#0e0e0e] border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-semibold", stage.color)}>{stage.label}</span>
            <span className="text-xs bg-secondary border border-border text-muted-foreground px-1.5 py-0.5 rounded-full font-mono">
              {leads.length}
            </span>
          </div>
          {leads.length === 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{stage.subtitle}</p>
          )}
        </div>
      </div>
      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
        ))}
      </div>
    </div>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

function LeadDetailPanel({
  lead,
  onClose,
  onStageChange,
  onDelete,
}: {
  lead: Lead;
  onClose: () => void;
  onStageChange: (id: number, stage: string) => void;
  onDelete: (id: number) => void;
}) {
  const [, navigate] = useLocation();
  const [noteText, setNoteText] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const utils = trpc.useUtils();
  const { data: notes = [], isLoading: notesLoading } = trpc.ops.leads.listNotes.useQuery({ leadId: lead.id });

  const addNote = trpc.ops.leads.addNote.useMutation({
    onSuccess: () => {
      setNoteText("");
      utils.ops.leads.listNotes.invalidate({ leadId: lead.id });
    },
    onError: () => toast.error("Failed to add note"),
  });

  const updateLead = trpc.ops.leads.update.useMutation({
    onSuccess: () => {
      utils.ops.leads.list.invalidate();
      toast.success("Lead updated");
    },
  });

  // Geocode address and place marker when map is ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (!lead.address) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: lead.address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        map.setCenter(loc);
        map.setZoom(14);
        if (markerRef.current) markerRef.current.map = null;
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: loc,
          title: lead.name,
        });
      }
    });
  }, [lead.address, lead.name]);

  const warmthIdx = lead.stage === "new" ? 1 : lead.stage === "contacted" ? 2 : 0;

  const handleMarkLost = () => {
    onStageChange(lead.id, "lost");
    onClose();
  };

  const handleMarkWon = () => {
    onStageChange(lead.id, "won");
    onClose();
  };

  const handleSubmitNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ leadId: lead.id, content: noteText.trim(), type: "note" });
  };

  const NOTE_ICONS: Record<string, React.ReactNode> = {
    note: <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />,
    call: <PhoneCall className="w-3.5 h-3.5 text-green-400" />,
    text: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
    email: <Mail className="w-3.5 h-3.5 text-purple-400" />,
    stage_change: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
    system: <AlarmClock className="w-3.5 h-3.5 text-muted-foreground" />,
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-sm bg-[#0e0e0e] border-l border-border flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground truncate">{lead.name}</h2>
                <span className={cn(
                  "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                  WARMTH_COLORS[warmthIdx]
                )}>
                  {WARMTH_LABELS[warmthIdx]}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {lead.phone}
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate">
                    {lead.email}
                  </a>
                )}
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 p-1.5 rounded-md hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />Call
              </a>
            )}
            {lead.phone && (
              <a
                href={`sms:${lead.phone}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />Text
              </a>
            )}
            <button
              onClick={() => { navigate("/ops/quotes"); toast.info("Navigate to Quotes to create a quote for this lead"); }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium px-3 py-2 rounded-md transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />Create Quote
            </button>
            <button
              onClick={() => { navigate("/ops/schedule"); toast.info("Navigate to Schedule to book a site visit"); }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium px-3 py-2 rounded-md transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />Schedule Visit
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Lead info */}
          <div className="px-4 py-3 border-b border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                lead.stage === "new" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                lead.stage === "contacted" ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" :
                lead.stage === "estimate_sent" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                lead.stage === "negotiating" ? "bg-purple-500/15 text-purple-400 border-purple-500/30" :
                lead.stage === "won" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                lead.stage === "lost" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                "bg-secondary text-muted-foreground border-border"
              )}>
                {KANBAN_STAGES.find(s => s.id === lead.stage)?.label ?? lead.stage}
              </span>
              <span className="text-[11px] text-muted-foreground">{formatDate(lead.createdAt)}</span>
            </div>
            {lead.source && (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/60">Source:</span> {SOURCE_LABELS[lead.source] ?? lead.source}
              </p>
            )}
            {lead.address && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                {lead.address}
              </p>
            )}
            {lead.jobType && (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/60">Job type:</span> {lead.jobType}
              </p>
            )}
            {lead.estimatedValue && (
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground/60">Estimate:</span> ${Number(lead.estimatedValue).toLocaleString()}
              </p>
            )}
          </div>

          {/* Map */}
          {lead.address && (
            <div className="relative h-44 border-b border-border overflow-hidden">
              <MapView
                initialCenter={{ lat: 35.9, lng: -86.8 }}
                initialZoom={10}
                onMapReady={handleMapReady}
              />
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
              >
                <ExternalLink className="w-3 h-3" />Maps
              </a>
            </div>
          )}

          {/* Speed-to-contact nudge */}
          {lead.stage === "new" && (
            <div className="mx-4 my-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300 font-medium">Call this lead ASAP — speed to contact wins deals.</p>
            </div>
          )}

          {/* Call Now CTA */}
          {lead.phone && (
            <div className="px-4 pb-3 space-y-2">
              <a
                href={`tel:${lead.phone}`}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold py-3 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />Call Now
              </a>
              <button
                onClick={handleMarkLost}
                className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-secondary/60 border border-border text-xs text-muted-foreground py-2 rounded-lg transition-colors"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />Mark Lost
              </button>
            </div>
          )}

          {/* Stage selector */}
          <div className="px-4 pb-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Move to Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {[...KANBAN_STAGES, { id: "won" as const, label: "Won", color: "text-green-400" }, { id: "lost" as const, label: "Lost", color: "text-red-400" }].map(s => (
                <button
                  key={s.id}
                  onClick={() => { onStageChange(lead.id, s.id); }}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    lead.stage === s.id
                      ? "bg-primary/20 text-primary border-primary/40 font-semibold"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-foreground mb-3">Activity</p>

            {/* Add note */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmitNote()}
                placeholder="Add a note..."
                className="flex-1 bg-secondary/60 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <button
                onClick={handleSubmitNote}
                disabled={!noteText.trim() || addNote.isPending}
                className="shrink-0 flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs px-3 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {addNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Note
              </button>
            </div>

            {/* System entry */}
            <div className="flex gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-foreground font-medium">New lead added: {lead.name}</p>
                <p className="text-[11px] text-muted-foreground">{timeAgo(lead.createdAt)}</p>
              </div>
            </div>

            {/* Notes */}
            {notesLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading activity...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
                      {NOTE_ICONS[note.type] ?? <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="text-xs text-foreground">{note.content}</p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(note.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <button
            onClick={() => { navigate("/ops/jobs"); toast.info("Convert this lead to a job from the Jobs page"); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium px-3 py-2 rounded-md transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />View Full Deal
          </button>
          <button
            onClick={() => { /* future: contact detail */ toast.info("Contact detail coming soon"); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium px-3 py-2 rounded-md transition-colors"
          >
            <User className="w-3.5 h-3.5" />View Contact
          </button>
          <button
            onClick={() => onDelete(lead.id)}
            className="shrink-0 p-2 bg-secondary hover:bg-red-500/20 border border-border hover:border-red-500/30 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────

interface AddLeadForm {
  name: string; phone: string; email: string; address: string;
  source: string; jobType: string; estimatedValue: string; notes: string;
}

const emptyForm: AddLeadForm = {
  name: "", phone: "", email: "", address: "",
  source: "google", jobType: "Land Clearing", estimatedValue: "", notes: "",
};

function AddLeadModal({ onClose, onCreate }: { onClose: () => void; onCreate: (form: AddLeadForm) => void }) {
  const [form, setForm] = useState<AddLeadForm>(emptyForm);
  const set = (k: keyof AddLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Add Lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {[
            { label: "Name *", key: "name" as const, type: "text", placeholder: "Full name" },
            { label: "Phone", key: "phone" as const, type: "tel", placeholder: "(615) 000-0000" },
            { label: "Email", key: "email" as const, type: "email", placeholder: "email@example.com" },
            { label: "Property Address", key: "address" as const, type: "text", placeholder: "123 Main St, Columbia, TN" },
            { label: "Estimated Value ($)", key: "estimatedValue" as const, type: "number", placeholder: "0" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.placeholder}
                className="mt-1 w-full bg-secondary/60 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          ))}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Source</label>
            <select value={form.source} onChange={set("source")}
              className="mt-1 w-full bg-secondary/60 border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Job Type</label>
            <select value={form.jobType} onChange={set("jobType")}
              className="mt-1 w-full bg-secondary/60 border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50">
              {["Land Clearing", "Forestry Mulching", "Brush Removal", "Stump Grinding", "Wildfire Mitigation"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Any additional context..."
              className="mt-1 w-full bg-secondary/60 border border-border rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3 justify-end">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 border border-border transition-colors">Cancel</button>
          <button
            onClick={() => { if (!form.name.trim()) { toast.error("Name is required"); return; } onCreate(form); }}
            className="text-xs px-4 py-2 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
          >
            Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: leads = [], isLoading } = trpc.ops.leads.list.useQuery();

  const createLead = trpc.ops.leads.create.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); setShowAddModal(false); toast.success("Lead added"); },
    onError: () => toast.error("Failed to add lead"),
  });

  const updateLead = trpc.ops.leads.update.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); },
    onError: () => toast.error("Failed to update lead"),
  });

  const deleteLead = trpc.ops.leads.delete.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); setSelectedLead(null); toast.success("Lead deleted"); },
    onError: () => toast.error("Failed to delete lead"),
  });

  const handleStageChange = (id: number, stage: string) => {
    updateLead.mutate({ id, stage: stage as any });
    // Optimistically update selectedLead
    if (selectedLead?.id === id) {
      setSelectedLead(prev => prev ? { ...prev, stage } : null);
    }
  };

  const handleDelete = (id: number) => {
    deleteLead.mutate({ id });
  };

  const handleCreate = (form: AddLeadForm) => {
    createLead.mutate({
      name: form.name,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      source: form.source as any,
      stage: "new",
      jobType: form.jobType || undefined,
      estimatedValue: form.estimatedValue || undefined,
      notes: form.notes || undefined,
    });
  };

  // Filter leads
  const filtered = leads.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) ||
      (l.phone ?? "").toLowerCase().includes(q) ||
      (l.address ?? "").toLowerCase().includes(q);
  }) as Lead[];

  // Group by stage
  const byStage = (stageId: string) => filtered.filter(l => l.stage === stageId);

  const activeCount = filtered.filter(l => !["won", "lost"].includes(l.stage)).length;
  const wonCount = byStage("won").length;
  const lostCount = byStage("lost").length;
  const onHoldCount = byStage("on_hold").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-foreground">Leads</h1>
            {activeCount > 0 && (
              <span className="text-xs text-muted-foreground">{activeCount} active</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.info("Dialer coming soon")}
              className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border text-xs px-3 py-1.5 rounded-md transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Dialer
              {activeCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>
              )}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Add Lead
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-3 p-4 h-full min-w-max">
              {KANBAN_STAGES.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  leads={byStage(stage.id)}
                  onLeadClick={setSelectedLead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom closed bar */}
        <div className="shrink-0 border-t border-border px-4 py-2 flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">CLOSED</span>
          {CLOSED_STAGES.map(s => {
            const count = s.id === "won" ? wonCount : s.id === "lost" ? lostCount : onHoldCount;
            const Icon = s.icon;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg border text-xs font-semibold flex-1 justify-center",
                  s.color
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {s.label}
                <span className="font-mono">{count}</span>
              </div>
            );
          })}

          {/* Phone Ready indicator */}
          <div className="ml-auto flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Phone Ready
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStageChange={handleStageChange}
          onDelete={handleDelete}
        />
      )}

      {/* Add lead modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreate}
        />
      )}
    </DashboardLayout>
  );
}
