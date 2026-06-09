/**
 * Leads Page — Noland Earthworks
 * Kanban board: 5 equal-width columns filling full viewport height
 * Bottom bar: CLOSED label + Won | Lost | On Hold strips + Phone Ready pill
 * Slide-in detail panel on lead click
 * Map View: all active leads plotted as pins with InfoWindow popups
 * Travel time: DirectionsService from business address to each lead
 */

import DashboardLayout from "@/components/DashboardLayout";
import { MapView, loadMapScript } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";

import {
  Phone, Mail, MessageSquare, BotMessageSquare, FileText, Calendar,
  Plus, Search, X, Loader2, XCircle,
  MapPin, ExternalLink, Trash2,
  AlarmClock, User, PhoneCall,
  ClipboardList, Star, Snowflake, RefreshCw,
  Map as MapIcon, LayoutGrid, Clock, Navigation,
  Brain, Copy, Check, CheckCheck, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Source Conversion Chart ─────────────────────────────────────────────────

const SOURCE_CHART_COLORS: Record<string, string> = {
  google:   "#3b82f6",
  facebook: "#6366f1",
  referral: "#a855f7",
  website:  "#E07B2A",
  direct:   "#22c55e",
  other:    "#555",
};

function SourceConversionChart({ leads, onSourceClick }: { leads: Lead[]; onSourceClick: (src: string) => void }) {
  const data = useMemo(() => {
    const sources = ["facebook", "google", "website", "referral", "direct", "other"];
    return sources
      .map(src => {
        const total = leads.filter(l => l.source === src).length;
        if (total === 0) return null;
        const won = leads.filter(l => l.source === src && l.stage === "won").length;
        const active = leads.filter(l => l.source === src && !["won", "lost"].includes(l.stage)).length;
        const lost = leads.filter(l => l.source === src && l.stage === "lost").length;
        const rate = total > 0 ? Math.round((won / total) * 100) : 0;
        return { src, label: SOURCE_LABELS[src] ?? src, total, won, active, lost, rate };
      })
      .filter(Boolean) as { src: string; label: string; total: number; won: number; active: number; lost: number; rate: number }[];
  }, [leads]);

  if (data.length === 0) return null;

  const totalLeads = leads.length;
  const totalWon = leads.filter(l => l.stage === "won").length;
  const overallRate = totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;

  return (
    <div className="px-4 py-3 border-b border-[#1e1e1e] bg-[#080808] shrink-0">
      {/* Summary row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#555]">Lead Source Performance</p>
        <div className="flex items-center gap-3 text-[11px] text-[#555]">
          <span>{totalLeads} total</span>
          <span className="text-green-400 font-semibold">{totalWon} won</span>
          <span className="text-[#666]">Overall: <span className="text-white font-bold">{overallRate}%</span></span>
        </div>
      </div>

      {/* Source cards */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 6)}, minmax(0, 1fr))` }}>
        {data.map(d => {
          const color = SOURCE_CHART_COLORS[d.src] ?? "#555";
          const wonPct = d.total > 0 ? (d.won / d.total) * 100 : 0;
          const activePct = d.total > 0 ? (d.active / d.total) * 100 : 0;
          return (
            <button
              key={d.src}
              onClick={() => onSourceClick(d.src)}
              className="group flex flex-col gap-1.5 bg-[#0f0f0f] hover:bg-[#141414] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg p-2.5 text-left transition-colors"
            >
              {/* Source label + count */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold truncate" style={{ color }}>{d.label}</span>
                <span className="text-[10px] text-[#555] ml-1 shrink-0">{d.total}</span>
              </div>

              {/* Stacked bar */}
              <div className="h-1.5 w-full rounded-full bg-[#1a1a1a] overflow-hidden flex">
                <div className="h-full rounded-l-full transition-all" style={{ width: `${wonPct}%`, backgroundColor: color, opacity: 1 }} />
                <div className="h-full transition-all" style={{ width: `${activePct}%`, backgroundColor: color, opacity: 0.3 }} />
              </div>

              {/* Conversion rate */}
              <div className="flex items-end justify-between">
                <span className="text-[10px] text-[#555]">
                  <span className="text-green-400 font-bold">{d.won}</span> won
                  {d.active > 0 && <span className="text-[#555]"> · {d.active} active</span>}
                </span>
                <span className="text-xs font-bold" style={{ color: d.rate >= 30 ? "#22c55e" : d.rate >= 10 ? "#E07B2A" : "#666" }}>
                  {d.rate}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_ADDRESS = "93 Halliburton Road, Vanleer, TN 37181";

const KANBAN_STAGES = [
  { id: "new",           label: "New Lead",   subtitle: "Fresh inquiries" },
  { id: "contacted",     label: "Contacted",  subtitle: "Leads you've spoken with" },
  { id: "estimate_sent", label: "Site Visit", subtitle: "Site visits scheduled" },
  { id: "negotiating",   label: "Quote Sent", subtitle: "Proposals delivered" },
  { id: "converted",     label: "Follow-Up",  subtitle: "Chasing decisions" },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Search", facebook: "Facebook", referral: "Referral",
  website: "Chat / Website", direct: "Direct", field_app: "Field App", other: "Other",
};
const SOURCE_COLORS: Record<string, string> = {
  google: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  facebook: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  referral: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  website: "bg-[#E07B2A]/15 text-[#E07B2A] border-[#E07B2A]/30",
  direct: "bg-green-500/15 text-green-400 border-green-500/25",
  other: "bg-[#444]/30 text-[#888] border-[#444]/40",
};

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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  requestedVisitAt?: Date | string | null;
  visitConfirmedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  aiScore?: string | null;
  aiSummary?: string | null;
  aiFlags?: string | null;
  aiDraftResponse?: string | null;
  chatSessionId?: number | null;
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({ lead, onClick, onDragStart }: { lead: Lead; onClick: () => void; onDragStart: (id: number) => void }) {
  const staleDays = (() => {
    if (lead.stage === "won" || lead.stage === "lost") return 0;
    const lastUpdate = lead.updatedAt ?? lead.createdAt;
    if (!lastUpdate) return 0;
    return Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24));
  })();
  const isStale = staleDays >= 3;

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(lead.id); }}
      onClick={onClick}
      className={cn(
        "w-full text-left bg-[#181818] border rounded-lg px-3 py-2.5 hover:bg-[#1e1e1e] transition-all group cursor-grab active:cursor-grabbing select-none",
        isStale
          ? "border-amber-500/40 hover:border-amber-500/60"
          : "border-[#2a2a2a] hover:border-[#3a3a3a]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-[#666]">
              {lead.estimatedValue ? `$${Number(lead.estimatedValue).toLocaleString()}` : "No estimate"}
            </span>
            <span className="text-[#444]">·</span>
            <span className="text-[11px] text-[#666]">{formatDate(lead.createdAt)}</span>
          </div>
        </div>
        {lead.phone && (
          <div className="shrink-0 w-7 h-7 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
            <Phone className="w-3.5 h-3.5 text-green-400" />
          </div>
        )}
      </div>
      {/* Source + AI score badges */}
      {(lead.source || lead.aiScore) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {lead.source && (
            <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${
              SOURCE_COLORS[lead.source] ?? SOURCE_COLORS.other
            }`}>
              {SOURCE_LABELS[lead.source] ?? lead.source}
            </span>
          )}
          {lead.aiScore && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
              lead.aiScore === "strong"
                ? "bg-green-500/15 text-green-400 border-green-500/25"
                : lead.aiScore === "marginal"
                ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                : "bg-red-500/15 text-red-400 border-red-500/25"
            }`}>
              <Brain className="w-2.5 h-2.5" />
              {lead.aiScore.charAt(0).toUpperCase() + lead.aiScore.slice(1)}
            </span>
          )}
          {isStale && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-400 border-amber-500/30">
              <Clock className="w-2.5 h-2.5" />
              {staleDays}d stale
            </span>
          )}
          {lead.requestedVisitAt && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border ${
              lead.visitConfirmedAt
                ? "bg-green-500/15 text-green-400 border-green-500/25"
                : "bg-teal-500/15 text-teal-400 border-teal-500/25"
            }`}>
              <Calendar className="w-2.5 h-2.5" />
              {lead.visitConfirmedAt ? "Confirmed " : ""}
              {new Date(lead.requestedVisitAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage, leads, onLeadClick, onDragStart, onDrop, isDragOver,
}: {
  stage: typeof KANBAN_STAGES[number];
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDragStart: (id: number) => void;
  onDrop: (stageId: string) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col flex-1 min-w-0 bg-[#111] border border-[#222] rounded-xl overflow-hidden transition-colors",
        isDragOver && "border-[#E07B2A]/50 bg-[#E07B2A]/5"
      )}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
      onDrop={e => { e.preventDefault(); onDrop(stage.id); }}
    >
      {/* Column header */}
      <div className="px-4 py-3 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{stage.label}</span>
          <span className="text-xs text-[#555] font-mono">{leads.length}</span>
        </div>
        {leads.length === 0 && (
          <p className={cn("text-[11px] mt-0.5", isDragOver ? "text-[#E07B2A]/60" : "text-[#444]")}>
            {isDragOver ? "Drop here" : stage.subtitle}
          </p>
        )}
      </div>
      {/* Cards area */}
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} onDragStart={onDragStart} />
        ))}
        {isDragOver && leads.length > 0 && (
          <div className="h-10 border-2 border-dashed border-[#E07B2A]/40 rounded-lg bg-[#E07B2A]/5" />
        )}
      </div>
    </div>
  );
}

// ─── All Leads Map View ───────────────────────────────────────────────────────

// ─── Site Visits Map ─────────────────────────────────────────────────────────

function SiteVisitsMap({ leads, onLeadClick }: { leads: Lead[]; onLeadClick: (lead: Lead) => void }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const leadsWithAddress = leads.filter(l => l.address);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (leadsWithAddress.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();
    let geocodedCount = 0;

    map.addListener("click", () => {
      if (infoWindowRef.current) infoWindowRef.current.close();
    });

    leadsWithAddress.forEach(lead => {
      if (!lead.address) return;
      geocoder.geocode({ address: lead.address }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;
        const loc = results[0].geometry.location;
        bounds.extend(loc);
        geocodedCount++;

        // Teal pin for unconfirmed, green for confirmed
        const isConfirmed = !!lead.visitConfirmedAt;
        const pinEl = document.createElement("div");
        pinEl.style.cssText = `
          width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); background: ${isConfirmed ? "#22c55e" : "#14b8a6"};
          border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          cursor: pointer;
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: loc,
          title: lead.name,
          content: pinEl,
        });

        const visitDate = lead.requestedVisitAt
          ? new Date(lead.requestedVisitAt).toLocaleString("en-US", {
              weekday: "short", month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit",
            })
          : "";

        const infoContent = `
          <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:10px 12px;min-width:200px;font-family:system-ui,sans-serif;">
            <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;">${lead.name}</div>
            ${lead.jobType ? `<div style="font-size:11px;color:#14b8a6;margin-bottom:4px;">${lead.jobType}</div>` : ""}
            <div style="font-size:11px;color:${isConfirmed ? "#22c55e" : "#14b8a6"};margin-bottom:4px;">${isConfirmed ? "Confirmed" : "Requested"}: ${visitDate}</div>
            ${lead.address ? `<div style="font-size:10px;color:#666;">${lead.address}</div>` : ""}
          </div>
        `;

        marker.addListener("click", () => {
          if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow({ disableAutoPan: false });
          }
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open({ anchor: marker, map });
          onLeadClick(lead);
        });

        markersRef.current.push(marker);

        if (geocodedCount === leadsWithAddress.length) {
          if (geocodedCount === 1) { map.setCenter(loc); map.setZoom(12); }
          else { map.fitBounds(bounds, 60); }
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => { m.map = null; });
      markersRef.current = [];
      if (infoWindowRef.current) infoWindowRef.current.close();
    };
  }, []);

  if (leadsWithAddress.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#555]">
        <Calendar className="w-10 h-10 text-[#2a2a2a]" />
        <p className="text-sm">No scheduled site visits to map.</p>
        <p className="text-xs text-[#444]">Visits appear here once a visitor requests a date from the estimate calculator.</p>
      </div>
    );
  }

  const confirmedCount = leadsWithAddress.filter(l => l.visitConfirmedAt).length;
  const pendingCount = leadsWithAddress.length - confirmedCount;

  return (
    <div className="flex-1 relative">
      <MapView
        className="w-full h-full"
        initialCenter={{ lat: 35.9, lng: -86.8 }}
        initialZoom={9}
        onMapReady={handleMapReady}
      />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 border border-[#2a2a2a] rounded-lg px-3 py-2 flex items-center gap-3">
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-teal-500 border border-white/50" />
            <span className="text-[11px] text-[#aaa]">{pendingCount} pending</span>
          </div>
        )}
        {confirmedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white/50" />
            <span className="text-[11px] text-[#aaa]">{confirmedCount} confirmed</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── All Leads Map ────────────────────────────────────────────────────────────

function AllLeadsMap({ leads, onLeadClick }: { leads: Lead[]; onLeadClick: (lead: Lead) => void }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const leadsWithAddress = leads.filter(l => l.address && !["won", "lost"].includes(l.stage));

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (leadsWithAddress.length === 0) return;

    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();
    let geocodedCount = 0;

    // Close any open InfoWindow when clicking the map background
    map.addListener("click", () => {
      if (infoWindowRef.current) infoWindowRef.current.close();
    });

    leadsWithAddress.forEach(lead => {
      if (!lead.address) return;
      geocoder.geocode({ address: lead.address }, (results, status) => {
        if (status !== "OK" || !results?.[0]) return;
        const loc = results[0].geometry.location;
        bounds.extend(loc);
        geocodedCount++;

        // Build a custom amber pin element
        const pinEl = document.createElement("div");
        pinEl.style.cssText = `
          width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); background: #E07B2A;
          border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          cursor: pointer;
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: loc,
          title: lead.name,
          content: pinEl,
        });

        // InfoWindow content
        const stageBadge = KANBAN_STAGES.find(s => s.id === lead.stage)?.label ?? lead.stage;
        const infoContent = `
          <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:10px 12px;min-width:180px;font-family:system-ui,sans-serif;">
            <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;">${lead.name}</div>
            ${lead.jobType ? `<div style="font-size:11px;color:#E07B2A;margin-bottom:4px;">${lead.jobType}</div>` : ""}
            <div style="font-size:11px;color:#888;margin-bottom:6px;">${stageBadge}</div>
            ${lead.address ? `<div style="font-size:10px;color:#666;">${lead.address}</div>` : ""}
          </div>
        `;

        marker.addListener("click", () => {
          if (!infoWindowRef.current) {
            infoWindowRef.current = new google.maps.InfoWindow({
              disableAutoPan: false,
            });
          }
          infoWindowRef.current.setContent(infoContent);
          infoWindowRef.current.open({ anchor: marker, map });
          onLeadClick(lead);
        });

        markersRef.current.push(marker);

        // Fit bounds after all geocoding completes
        if (geocodedCount === leadsWithAddress.length) {
          if (geocodedCount === 1) {
            map.setCenter(loc);
            map.setZoom(12);
          } else {
            map.fitBounds(bounds, 60);
          }
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => { m.map = null; });
      markersRef.current = [];
      if (infoWindowRef.current) infoWindowRef.current.close();
    };
  }, []);

  if (leadsWithAddress.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#555]">
        <MapIcon className="w-10 h-10 text-[#2a2a2a]" />
        <p className="text-sm">No active leads with addresses to map.</p>
        <p className="text-xs text-[#444]">Add a property address to a lead to see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <MapView
        className="w-full h-full"
        initialCenter={{ lat: 35.9, lng: -86.8 }}
        initialZoom={9}
        onMapReady={handleMapReady}
      />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 border border-[#2a2a2a] rounded-lg px-3 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-[#E07B2A] border border-white/50" />
        <span className="text-[11px] text-[#aaa]">{leadsWithAddress.length} active lead{leadsWithAddress.length !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

function LeadDetailPanel({
  lead, onClose, onStageChange, onDelete,
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
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [travelDist, setTravelDist] = useState<string | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stageSuggestion, setStageSuggestion] = useState<{ suggestedStage: string | null; reason: string } | null>(null);
  const [proposalDraft, setProposalDraft] = useState<{ projectDescription?: string; scopeOfWork?: string[]; inclusions?: string[]; exclusions?: string[]; siteConditions?: string; estimatedTimeline?: string; paymentTerms?: string } | null>(null);
  const [showProposal, setShowProposal] = useState(false);

  const utils = trpc.useUtils();
  const { data: notes = [], isLoading: notesLoading } = trpc.ops.leads.listNotes.useQuery({ leadId: lead.id });

  const deleteChatSession = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("Chat session deleted.");
      utils.ops.leads.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to delete chat session."),
  });

  const qualifyLead = trpc.ops.leads.qualifyLead.useMutation({
    onSuccess: () => {
      toast.success("Lead scored");
      utils.ops.leads.list.invalidate();
    },
    onError: () => toast.error("Failed to score lead"),
  });

  const suggestStage = trpc.ops.leads.suggestStageAdvancement.useQuery(
    { leadId: lead.id },
    { enabled: false, retry: false }
  );

  const draftProposal = trpc.ops.ai.draftProposalFromLead.useMutation({
    onSuccess: (data) => { setProposalDraft(data); setShowProposal(true); },
    onError: () => toast.error("Failed to draft proposal"),
  });

  const generateFollowUp = trpc.ops.leads.generateFollowUp.useMutation({
    onSuccess: (data) => {
      setFollowUpDraft(typeof data.draft === "string" ? data.draft : String(data.draft ?? ""));
      toast.success("Follow-up draft ready");
    },
    onError: () => toast.error("Failed to generate follow-up"),
  });

  const handleCopyDraft = () => {
    if (!followUpDraft) return;
    navigator.clipboard.writeText(followUpDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addNote = trpc.ops.leads.addNote.useMutation({
    onSuccess: () => { setNoteText(""); utils.ops.leads.listNotes.invalidate({ leadId: lead.id }); },
    onError: () => toast.error("Failed to add note"),
  });

  const confirmVisit = trpc.ops.leads.confirmVisit.useMutation({
    onSuccess: () => {
      toast.success(lead.email ? "Visit confirmed. Confirmation email sent to visitor." : "Visit confirmed.");
      utils.ops.leads.list.invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to confirm visit"),
  });

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (!lead.address) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: lead.address }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        map.setCenter(loc);
        map.setZoom(13);
        if (markerRef.current) markerRef.current.map = null;
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position: loc, title: lead.name });

        // Get driving time from business address
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: BUSINESS_ADDRESS,
            destination: lead.address!,
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (result, routeStatus) => {
            if (routeStatus === "OK" && result?.routes?.[0]?.legs?.[0]) {
              const leg = result.routes[0].legs[0];
              setTravelTime(leg.duration?.text ?? null);
              setTravelDist(leg.distance?.text ?? null);
            }
          }
        );
      }
    });
  }, [lead.address, lead.name]);

  const NOTE_ICONS: Record<string, React.ReactNode> = {
    note: <ClipboardList className="w-3.5 h-3.5 text-[#666]" />,
    call: <PhoneCall className="w-3.5 h-3.5 text-green-400" />,
    text: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
    email: <Mail className="w-3.5 h-3.5 text-purple-400" />,
    stage_change: <RefreshCw className="w-3.5 h-3.5 text-amber-400" />,
    system: <AlarmClock className="w-3.5 h-3.5 text-[#666]" />,
  };

  const stageBadge = KANBAN_STAGES.find(s => s.id === lead.stage)?.label ?? lead.stage;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-[360px] bg-[#0d0d0d] border-l border-[#222] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[#1e1e1e]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white truncate">{lead.name}</h2>
                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/25">
                  Warm
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 mt-0.5">
                {lead.phone && <span className="text-xs text-[#888]">{lead.phone}</span>}
                {lead.email && <span className="text-xs text-[#888] truncate">{lead.email}</span>}
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 p-1.5 rounded-md hover:bg-[#1e1e1e] transition-colors">
              <X className="w-4 h-4 text-[#666]" />
            </button>
          </div>

          {/* Action row */}
          <div className="grid grid-cols-4 gap-1.5">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                className="flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-2 rounded-md transition-colors">
                <Phone className="w-3.5 h-3.5" />Call
              </a>
            )}
            {lead.phone && (
              <a href={`sms:${lead.phone}`}
                className="flex flex-col items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold py-2 rounded-md transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />Text
              </a>
            )}
            <button
              onClick={() => {
                const params = new URLSearchParams();
                params.set("newQuote", "1");
                if (lead.name) params.set("clientName", lead.name);
                if (lead.phone) params.set("clientPhone", lead.phone);
                if (lead.email) params.set("clientEmail", lead.email);
                if (lead.address) params.set("clientAddress", lead.address);
                if (lead.jobType) params.set("jobType", lead.jobType);
                navigate(`/ops/quotes?${params.toString()}`);
              }}
              className="flex flex-col items-center justify-center gap-1 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[11px] text-[#aaa] py-2 rounded-md transition-colors">
              <FileText className="w-3.5 h-3.5" />Create Quote
            </button>
            <button
              onClick={() => { navigate("/ops/schedule"); toast.info("Schedule a site visit from the Schedule page"); }}
              className="flex flex-col items-center justify-center gap-1 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[11px] text-[#aaa] py-2 rounded-md transition-colors">
              <Calendar className="w-3.5 h-3.5" />Schedule Visit
            </button>
          </div>
          {/* Chat session actions — only shown for chat-sourced leads */}
          {lead.chatSessionId && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => navigate(`/ops/chat-sessions?session=${lead.chatSessionId}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-600/15 hover:bg-teal-600/25 border border-teal-500/25 text-teal-400 text-[11px] font-semibold py-2 rounded-md transition-colors">
                <BotMessageSquare className="w-3.5 h-3.5" />
                View Transcript
              </button>
              <button
                onClick={() => {
                  if (!confirm("Delete this chat session? This cannot be undone.")) return;
                  deleteChatSession.mutate({ sessionId: lead.chatSessionId! });
                }}
                disabled={deleteChatSession.isPending}
                title="Delete chat session"
                className="flex items-center justify-center gap-1.5 px-3 bg-red-900/20 hover:bg-red-900/40 border border-red-700/30 text-red-400 text-[11px] font-semibold py-2 rounded-md transition-colors disabled:opacity-50">
                {deleteChatSession.isPending
                  ? <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin inline-block" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Lead info */}
          <div className="px-4 py-3 border-b border-[#1e1e1e] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/25">
                {stageBadge}
              </span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[11px] text-[#555]">Created {formatDate(lead.createdAt)}</span>
                {lead.updatedAt && new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
                  <span className="text-[10px] text-[#444]">
                    Updated {timeAgo(lead.updatedAt)}
                  </span>
                )}
              </div>
            </div>
            {lead.source && (
              <p className="text-xs text-[#666]">
                <span className="text-[#888]">Source:</span> {SOURCE_LABELS[lead.source] ?? lead.source}
              </p>
            )}
            {lead.address && (
              <p className="text-xs text-[#666] flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#555]" />
                {lead.address}
              </p>
            )}
            {lead.requestedVisitAt && (
              <div className={`text-xs rounded px-2 py-1.5 border space-y-1.5 ${
                lead.visitConfirmedAt
                  ? "bg-green-500/10 border-green-500/20"
                  : "bg-teal-500/10 border-teal-500/20"
              }`}>
                <div className="flex items-center gap-1.5">
                  <Calendar className={`w-3.5 h-3.5 shrink-0 ${lead.visitConfirmedAt ? "text-green-400" : "text-teal-400"}`} />
                  <span className={`font-medium ${lead.visitConfirmedAt ? "text-green-300" : "text-teal-300"}`}>
                    {lead.visitConfirmedAt ? "Visit confirmed:" : "Requested visit:"}
                  </span>
                  <span className={lead.visitConfirmedAt ? "text-green-400" : "text-teal-400"}>
                    {new Date(lead.requestedVisitAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                {!lead.visitConfirmedAt && (
                  <button
                    onClick={() => confirmVisit.mutate({ leadId: lead.id })}
                    disabled={confirmVisit.isPending}
                    className="w-full flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-[11px] font-semibold py-1.5 rounded transition-colors"
                  >
                    {confirmVisit.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                    Confirm Visit{lead.email ? " & Send Email" : ""}
                  </button>
                )}
                {lead.visitConfirmedAt && (
                  <p className="text-[10px] text-green-400/70">
                    Confirmed {new Date(lead.visitConfirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Map + Travel Time */}
          {lead.address && (
            <>
              <div className="relative h-44 border-b border-[#1e1e1e] overflow-hidden">
                <MapView
                  className="w-full h-full"
                  initialCenter={{ lat: 35.9, lng: -86.8 }}
                  initialZoom={10}
                  onMapReady={handleMapReady}
                />
                <a
                  href={`https://maps.google.com/?saddr=${encodeURIComponent(BUSINESS_ADDRESS)}&daddr=${encodeURIComponent(lead.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 hover:bg-black/90 text-white text-[11px] font-medium px-2 py-1 rounded-md transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />Directions
                </a>
              </div>
              {/* Travel time bar */}
              <div className="px-4 py-2.5 border-b border-[#1e1e1e] flex items-center gap-3 bg-[#0f0f0f]">
                <div className="flex items-center gap-1.5 text-[#E07B2A]">
                  <Clock className="w-3.5 h-3.5" />
                  {travelTime ? (
                    <span className="text-xs font-semibold text-white">{travelTime}</span>
                  ) : (
                    <span className="text-xs text-[#555]">Calculating...</span>
                  )}
                </div>
                {travelDist && (
                  <>
                    <span className="text-[#333]">·</span>
                    <div className="flex items-center gap-1.5 text-[#666]">
                      <Navigation className="w-3 h-3" />
                      <span className="text-xs text-[#666]">{travelDist}</span>
                    </div>
                  </>
                )}
                <span className="text-[10px] text-[#444] ml-auto">from Vanleer</span>
              </div>
            </>
          )}

          {/* AI Actions Row */}
          <div className="mx-4 mb-2 flex gap-2">
            <button
              onClick={() => qualifyLead.mutate({ leadId: lead.id })}
              disabled={qualifyLead.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#E07B2A]/40 text-[11px] text-[#aaa] hover:text-[#E07B2A] py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {qualifyLead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              {qualifyLead.isPending ? "Scoring..." : "Score Lead"}
            </button>
            <button
              onClick={async () => {
                const r = await suggestStage.refetch();
                if (r.data) setStageSuggestion(r.data);
              }}
              disabled={suggestStage.isFetching}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-blue-500/40 text-[11px] text-[#aaa] hover:text-blue-400 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {suggestStage.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {suggestStage.isFetching ? "Thinking..." : "Suggest Stage"}
            </button>
            <button
              onClick={() => draftProposal.mutate({ leadId: lead.id })}
              disabled={draftProposal.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-green-500/40 text-[11px] text-[#aaa] hover:text-green-400 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {draftProposal.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
              {draftProposal.isPending ? "Drafting..." : "Draft Proposal"}
            </button>
          </div>

          {/* Stage Suggestion */}
          {stageSuggestion && (
            <div className="mx-4 mb-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Stage Suggestion</span>
                <button onClick={() => setStageSuggestion(null)} className="text-[10px] text-[#555] hover:text-[#888]"><X className="w-3 h-3" /></button>
              </div>
              <p className="text-xs text-[#ccc]">
                Move to <span className="font-bold text-blue-300">{stageSuggestion.suggestedStage}</span> — {stageSuggestion.reason}
              </p>
              {stageSuggestion.suggestedStage && stageSuggestion.suggestedStage !== lead.stage && (
                <button
                  onClick={() => { onStageChange(lead.id, stageSuggestion.suggestedStage!); setStageSuggestion(null); }}
                  className="w-full text-[11px] bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md transition-colors"
                >
                  Apply — Move to {stageSuggestion.suggestedStage}
                </button>
              )}
            </div>
          )}

          {/* Proposal Draft Modal */}
          {showProposal && proposalDraft && (
            <div className="mx-4 mb-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-green-400 uppercase tracking-wider">AI Proposal Draft</span>
                <button onClick={() => setShowProposal(false)} className="text-[10px] text-[#555] hover:text-[#888]"><X className="w-3 h-3" /></button>
              </div>
              {proposalDraft.projectDescription && (
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Project Description</p>
                  <p className="text-xs text-[#ccc]">{String(proposalDraft.projectDescription ?? "")}</p>
                </div>
              )}
              {Array.isArray(proposalDraft.scopeOfWork) && (
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Scope of Work</p>
                  <ul className="space-y-0.5">{(proposalDraft.scopeOfWork as string[]).map((s, i) => <li key={i} className="text-xs text-[#ccc] flex gap-1"><span className="text-green-400">&#9656;</span><span>{s}</span></li>)}</ul>
                </div>
              )}
              {Array.isArray(proposalDraft.exclusions) && (
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Exclusions</p>
                  <ul className="space-y-0.5">{(proposalDraft.exclusions as string[]).map((s, i) => <li key={i} className="text-xs text-red-400 flex gap-1"><span>&#9656;</span><span>{s}</span></li>)}</ul>
                </div>
              )}
              {proposalDraft.estimatedTimeline && (
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Timeline</p>
                  <p className="text-xs text-[#ccc]">{String(proposalDraft.estimatedTimeline ?? "")}</p>
                </div>
              )}
              <button
                onClick={() => {
                  const text = `PROJECT DESCRIPTION\n${proposalDraft.projectDescription}\n\nSCOPE OF WORK\n${(proposalDraft.scopeOfWork as string[])?.join("\n- ")}\n\nEXCLUSIONS\n${(proposalDraft.exclusions as string[])?.join("\n- ")}\n\nTIMELINE\n${proposalDraft.estimatedTimeline}\n\nPAYMENT TERMS\n${proposalDraft.paymentTerms}\n\nPRICE: [TO BE DETERMINED AFTER SITE VISIT]`;
                  navigator.clipboard.writeText(text).then(() => toast.success("Proposal copied"));
                }}
                className="w-full text-[11px] bg-green-700 hover:bg-green-800 text-white py-1.5 rounded-md transition-colors"
              >
                Copy Full Proposal
              </button>
            </div>
          )}

          {/* AI Score section */}
          {(lead.aiScore || lead.aiSummary || lead.aiFlags) && (
            <div className="mx-4 my-3 p-3 rounded-lg border space-y-2 bg-[#0f0f0f] border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-[#E07B2A]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#555]">AI Assessment</span>
                {lead.aiScore && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={`ml-auto cursor-default text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          lead.aiScore === "strong"
                            ? "bg-green-500/15 text-green-400 border-green-500/25"
                            : lead.aiScore === "marginal"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                            : "bg-red-500/15 text-red-400 border-red-500/25"
                        }`}>
                          {lead.aiScore.charAt(0).toUpperCase() + lead.aiScore.slice(1)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs text-xs space-y-1.5 p-3">
                        {lead.aiSummary && (
                          <p className="text-foreground">{lead.aiSummary}</p>
                        )}
                        {lead.aiFlags && (() => {
                          let flags: string[] = [];
                          try { flags = JSON.parse(lead.aiFlags); } catch { flags = [lead.aiFlags]; }
                          return flags.length > 0 ? (
                            <ul className="space-y-0.5">
                              {flags.map((f, i) => (
                                <li key={i} className="flex items-start gap-1 text-amber-400">
                                  <span className="mt-0.5 shrink-0">&#9654;</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null;
                        })()}
                        {!lead.aiSummary && !lead.aiFlags && (
                          <p className="text-muted-foreground">No reasoning available.</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {lead.aiSummary && (
                <p className="text-[11px] text-[#888] leading-relaxed">{lead.aiSummary}</p>
              )}
              {lead.aiFlags && (() => {
                try {
                  const flags = JSON.parse(lead.aiFlags) as string[];
                  return flags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {flags.map((flag, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : null;
                } catch { return null; }
              })()}
            </div>
          )}

          {/* AI Follow-Up Draft */}
          <div className="mx-4 mb-3">
            {!followUpDraft ? (
              <button
                onClick={() => generateFollowUp.mutate({ leadId: lead.id })}
                disabled={generateFollowUp.isPending}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#E07B2A]/40 text-xs text-[#aaa] hover:text-[#E07B2A] py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {generateFollowUp.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generating follow-up...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" />Generate Follow-up Draft</>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#555] flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#E07B2A]" />Follow-Up Draft
                  </span>
                  <button
                    onClick={() => setFollowUpDraft(null)}
                    className="text-[10px] text-[#555] hover:text-[#888] transition-colors"
                  >Regenerate</button>
                </div>
                <textarea
                  value={followUpDraft}
                  onChange={e => setFollowUpDraft(e.target.value)}
                  rows={5}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-xs text-white resize-none focus:outline-none focus:border-[#E07B2A]/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyDraft}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-xs text-[#aaa] py-2 rounded-md transition-colors"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                  {lead.phone && (
                    <a
                      href={`sms:${lead.phone}?body=${encodeURIComponent(followUpDraft)}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-md transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />Send via Text
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}?subject=${encodeURIComponent("Following up — Noland Earthworks")}&body=${encodeURIComponent(followUpDraft)}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-md transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />Send via Email
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Speed-to-contact nudge */}
          {lead.stage === "new" && (
            <div className="mx-4 my-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300 font-medium">Call this lead ASAP — speed to contact wins deals.</p>
            </div>
          )}

          {/* Call Now + Mark Lost */}
          {lead.phone && (
            <div className="px-4 pb-3 space-y-2">
              <a href={`tel:${lead.phone}`}
                className="w-full flex items-center justify-center gap-2 bg-[#E07B2A] hover:bg-[#c96e24] text-white text-sm font-bold py-3 rounded-lg transition-colors">
                <Phone className="w-4 h-4" />Call Now
              </a>
              <button
                onClick={() => { onStageChange(lead.id, "lost"); onClose(); }}
                className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#666] py-2 rounded-lg transition-colors">
                <XCircle className="w-3.5 h-3.5 text-red-500" />Mark Lost
              </button>
            </div>
          )}

          {/* Stage selector */}
          <div className="px-4 pb-3 border-b border-[#1e1e1e]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555] mb-2">Move to Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {[...KANBAN_STAGES,
                { id: "won" as const, label: "Won" },
                { id: "lost" as const, label: "Lost" },
              ].map(s => (
                <button key={s.id}
                  onClick={() => onStageChange(lead.id, s.id)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                    lead.stage === s.id
                      ? "bg-[#E07B2A]/20 text-[#E07B2A] border-[#E07B2A]/40 font-semibold"
                      : "bg-[#1a1a1a] text-[#666] border-[#2a2a2a] hover:border-[#444] hover:text-[#aaa]"
                  )}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-white mb-3">Activity</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && noteText.trim() && addNote.mutate({ leadId: lead.id, content: noteText.trim(), type: "note" })}
                placeholder="Add a note..."
                className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-white placeholder:text-[#555] focus:outline-none focus:border-[#E07B2A]/50"
              />
              <button
                onClick={() => noteText.trim() && addNote.mutate({ leadId: lead.id, content: noteText.trim(), type: "note" })}
                disabled={!noteText.trim() || addNote.isPending}
                className="shrink-0 flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-xs text-[#aaa] px-3 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {addNote.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Note
              </button>
            </div>

            {/* System entry */}
            <div className="flex gap-2.5 mb-3">
              <div className="w-6 h-6 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-[#555]" />
              </div>
              <div>
                <p className="text-xs text-white">New lead added: {lead.name}</p>
                <p className="text-[11px] text-[#555]">{timeAgo(lead.createdAt)}</p>
              </div>
            </div>

            {notesLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#555]" />
                <span className="text-xs text-[#555]">Loading...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center shrink-0 mt-0.5">
                      {NOTE_ICONS[note.type] ?? <ClipboardList className="w-3.5 h-3.5 text-[#555]" />}
                    </div>
                    <div>
                      <p className="text-xs text-white">{note.content}</p>
                      <p className="text-[11px] text-[#555]">{timeAgo(note.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#1e1e1e] flex gap-2">
          <button
            onClick={() => { navigate("/ops/jobs"); toast.info("Convert to a job from the Jobs page"); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-xs text-[#aaa] px-3 py-2 rounded-md transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />View Full Deal
          </button>
          <button
            onClick={() => toast.info("Contact detail coming soon")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-xs text-[#aaa] px-3 py-2 rounded-md transition-colors">
            <User className="w-3.5 h-3.5" />View Contact
          </button>
          <button
            onClick={() => onDelete(lead.id)}
            className="shrink-0 p-2 bg-[#1a1a1a] hover:bg-red-500/15 border border-[#2a2a2a] hover:border-red-500/30 rounded-md transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-[#555] hover:text-red-400" />
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
  source: "google", jobType: "Land Management", estimatedValue: "", notes: "",
};

function AddLeadModal({ onClose, onCreate }: { onClose: () => void; onCreate: (form: AddLeadForm) => void }) {
  const [form, setForm] = useState<AddLeadForm>(emptyForm);
  const set = (k: keyof AddLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#111] border border-[#222] rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
          <h2 className="text-sm font-bold text-white">Add Lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#1e1e1e] transition-colors">
            <X className="w-4 h-4 text-[#666]" />
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
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555]">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={set(f.key)} placeholder={f.placeholder}
                className="mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#E07B2A]/50" />
            </div>
          ))}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555]">Source</label>
            <select value={form.source} onChange={set("source")}
              className="mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07B2A]/50">
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555]">Job Type</label>
            <select value={form.jobType} onChange={set("jobType")}
              className="mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07B2A]/50">
              {["Land Management", "Forestry Mulching", "Brush Removal", "Stump Grinding", "Wildfire Mitigation"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#555]">Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Any additional context..."
              className="mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-3 py-2 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#E07B2A]/50 resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[#1e1e1e] flex gap-3 justify-end">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-md bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#aaa] transition-colors">Cancel</button>
          <button
            onClick={() => { if (!form.name.trim()) { toast.error("Name is required"); return; } onCreate(form); }}
            className="text-xs px-4 py-2 rounded-md bg-[#E07B2A] hover:bg-[#c96e24] text-white font-semibold transition-colors">
            Add Lead
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Leads() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "map" | "visits">("kanban");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [aiScoreFilter, setAiScoreFilter] = useState<string>("all");
  const [staleFilter, setStaleFilter] = useState<boolean>(false);

  const utils = trpc.useUtils();
  const { data: leads = [], isLoading } = trpc.ops.leads.list.useQuery();

  // Pre-load Maps script when switching to map view
  useEffect(() => {
    if (viewMode === "map" || viewMode === "visits") {
      loadMapScript().catch(() => {});
    }
  }, [viewMode]);

  const createLead = trpc.ops.leads.create.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); setShowAddModal(false); toast.success("Lead added"); },
    onError: () => toast.error("Failed to add lead"),
  });

  const updateLead = trpc.ops.leads.update.useMutation({
    onSuccess: () => utils.ops.leads.list.invalidate(),
    onError: () => toast.error("Failed to update lead"),
  });

  const deleteLead = trpc.ops.leads.delete.useMutation({
    onSuccess: () => { utils.ops.leads.list.invalidate(); setSelectedLead(null); toast.success("Lead deleted"); },
    onError: () => toast.error("Failed to delete lead"),
  });

  const bulkUpdateStage = trpc.ops.leads.bulkUpdateStage.useMutation({
    onSuccess: (result) => {
      utils.ops.leads.list.invalidate();
      setStaleFilter(false);
      toast.success(`${result.updated} lead${result.updated === 1 ? "" : "s"} marked as Contacted`);
    },
    onError: () => toast.error("Bulk update failed"),
  });

  const handleStageChange = (id: number, stage: string) => {
    updateLead.mutate({ id, stage: stage as any });
    if (selectedLead?.id === id) setSelectedLead(prev => prev ? { ...prev, stage } : null);
  };

  const handleDragStart = (id: number) => setDraggingId(id);

  const handleDrop = (stageId: string) => {
    if (draggingId !== null) {
      handleStageChange(draggingId, stageId);
      toast.success("Lead moved");
    }
    setDraggingId(null);
    setDragOverStage(null);
  };

  const isLeadStale = (l: Lead) => {
    if (l.stage === "won" || l.stage === "lost") return false;
    const lastUpdate = l.updatedAt ?? l.createdAt;
    if (!lastUpdate) return false;
    return Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24)) >= 3;
  };

  const filtered = (leads as Lead[]).filter(l => {
    if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
    if (aiScoreFilter !== "all" && l.aiScore !== aiScoreFilter) return false;
    if (staleFilter && !isLeadStale(l)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || (l.phone ?? "").includes(q) || (l.address ?? "").toLowerCase().includes(q);
  });

  const byStage = (id: string) => filtered.filter(l => l.stage === id);
  const activeCount = filtered.filter(l => !["won", "lost"].includes(l.stage)).length;

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

  return (
    <DashboardLayout>
      {/* Outer wrapper: fills remaining height after sidebar header */}
      <div className="flex flex-col h-full bg-[#0a0a0a]">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold text-white">Leads</h1>
            {activeCount > 0 && <span className="text-xs text-[#666]">{activeCount} active</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-[#111] border border-[#222] rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "kanban" ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-[#aaa]"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />Board
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "map" ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-[#aaa]"
                )}
              >
                <MapIcon className="w-3.5 h-3.5" />Map
              </button>
              <button
                onClick={() => setViewMode("visits")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors",
                  viewMode === "visits" ? "bg-[#1e1e1e] text-white" : "text-[#555] hover:text-[#aaa]"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />Visits
              </button>
            </div>
            {/* Bulk action icon */}
            <button className="p-2 rounded-md hover:bg-[#1a1a1a] border border-[#222] transition-colors" title="Bulk actions">
              <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            {/* Dialer */}
            <button
              onClick={() => toast.info("Dialer coming soon")}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#222] text-xs text-[#aaa] px-3 py-1.5 rounded-md transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Dialer
              {activeCount > 0 && (
                <span className="bg-[#E07B2A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>
              )}
            </button>
            {/* Add Lead */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-[#E07B2A] hover:bg-[#c96e24] text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Add Lead
            </button>
          </div>
        </div>

        {/* Source Conversion Chart */}
        <SourceConversionChart leads={leads as Lead[]} onSourceClick={src => setSourceFilter(src)} />

        {/* Search + Source filter bar */}
        <div className="px-4 py-2 border-b border-[#1e1e1e] shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#444]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-[#111] border border-[#222] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-[#444] focus:outline-none focus:border-[#333]"
            />
          </div>
          {/* Source filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {[
              { key: "all", label: "All Sources" },
              { key: "facebook", label: "Facebook" },
              { key: "google", label: "Google" },
              { key: "website", label: "Chat / Website" },
              { key: "referral", label: "Referral" },
              { key: "direct", label: "Direct" },
              { key: "other", label: "Other" },
            ].map(({ key, label }) => {
              const count = key === "all"
                ? (leads as Lead[]).length
                : (leads as Lead[]).filter(l => l.source === key).length;
              if (key !== "all" && count === 0) return null;
              const isActive = sourceFilter === key;
              const colorClass = key === "facebook"
                ? isActive ? "bg-indigo-500/30 text-indigo-300 border-indigo-500/50" : "bg-indigo-500/10 text-indigo-400/70 border-indigo-500/20 hover:border-indigo-500/40"
                : key === "google"
                ? isActive ? "bg-blue-500/30 text-blue-300 border-blue-500/50" : "bg-blue-500/10 text-blue-400/70 border-blue-500/20 hover:border-blue-500/40"
                : key === "website"
                ? isActive ? "bg-[#E07B2A]/30 text-[#E07B2A] border-[#E07B2A]/50" : "bg-[#E07B2A]/10 text-[#E07B2A]/70 border-[#E07B2A]/20 hover:border-[#E07B2A]/40"
                : key === "referral"
                ? isActive ? "bg-purple-500/30 text-purple-300 border-purple-500/50" : "bg-purple-500/10 text-purple-400/70 border-purple-500/20 hover:border-purple-500/40"
                : key === "direct"
                ? isActive ? "bg-green-500/30 text-green-300 border-green-500/50" : "bg-green-500/10 text-green-400/70 border-green-500/20 hover:border-green-500/40"
                : isActive ? "bg-[#2a2a2a] text-white border-[#444]" : "bg-[#111] text-[#555] border-[#222] hover:border-[#333] hover:text-[#888]";
              return (
                <button
                  key={key}
                  onClick={() => setSourceFilter(key)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    colorClass
                  )}
                >
                  {label}
                  <span className={cn(
                    "text-[10px] font-bold px-1 py-0.5 rounded-full",
                    isActive ? "bg-white/15" : "bg-white/5"
                  )}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* AI Score filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <Brain className="w-3 h-3 text-[#444] shrink-0" />
            {[
              { key: "all", label: "All Scores" },
              { key: "strong", label: "Strong" },
              { key: "marginal", label: "Marginal" },
              { key: "weak", label: "Weak" },
            ].map(({ key, label }) => {
              const count = key === "all"
                ? (leads as Lead[]).filter(l => l.aiScore).length
                : (leads as Lead[]).filter(l => l.aiScore === key).length;
              if (key !== "all" && count === 0) return null;
              const isActive = aiScoreFilter === key;
              const colorClass = key === "strong"
                ? isActive ? "bg-green-500/30 text-green-300 border-green-500/50" : "bg-green-500/10 text-green-400/70 border-green-500/20 hover:border-green-500/40"
                : key === "marginal"
                ? isActive ? "bg-amber-500/30 text-amber-300 border-amber-500/50" : "bg-amber-500/10 text-amber-400/70 border-amber-500/20 hover:border-amber-500/40"
                : key === "weak"
                ? isActive ? "bg-red-500/30 text-red-300 border-red-500/50" : "bg-red-500/10 text-red-400/70 border-red-500/20 hover:border-red-500/40"
                : isActive ? "bg-[#2a2a2a] text-white border-[#444]" : "bg-[#111] text-[#555] border-[#222] hover:border-[#333] hover:text-[#888]";
              return (
                <button
                  key={key}
                  onClick={() => setAiScoreFilter(key)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    colorClass
                  )}
                >
                  {label}
                  <span className={cn(
                    "text-[10px] font-bold px-1 py-0.5 rounded-full",
                    isActive ? "bg-white/15" : "bg-white/5"
                  )}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* Stale filter pill */}
          {(() => {
            const staleCount = (leads as Lead[]).filter(isLeadStale).length;
            if (staleCount === 0) return null;
            return (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#444] shrink-0" />
                <button
                  onClick={() => setStaleFilter(v => !v)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    staleFilter
                      ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                      : "bg-amber-500/10 text-amber-400/70 border-amber-500/20 hover:border-amber-500/40"
                  )}
                >
                  Stale
                  <span className={cn(
                    "text-[10px] font-bold px-1 py-0.5 rounded-full",
                    staleFilter ? "bg-white/15" : "bg-white/5"
                  )}>{staleCount}</span>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#444]" />
              </div>
            ) : (
              <AllLeadsMap
                leads={filtered}
                onLeadClick={lead => setSelectedLead(lead)}
              />
            )}
          </div>
        )}

        {/* Site Visits Map */}
        {viewMode === "visits" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#444]" />
              </div>
            ) : (
              <SiteVisitsMap
                leads={(leads as Lead[]).filter(l => l.requestedVisitAt)}
                onLeadClick={lead => setSelectedLead(lead)}
              />
            )}
          </div>
        )}

        {/* Bulk action bar — visible when stale filter is active */}
        {staleFilter && viewMode === "kanban" && (() => {
          const staleLeads = filtered.filter(isLeadStale);
          if (staleLeads.length === 0) return null;
          return (
            <div className="shrink-0 mx-4 mb-2 flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300 font-medium">
                  {staleLeads.length} stale lead{staleLeads.length === 1 ? "" : "s"} visible
                </span>
              </div>
              <button
                disabled={bulkUpdateStage.isPending}
                onClick={() => bulkUpdateStage.mutate({ ids: staleLeads.map(l => l.id), stage: "contacted" })}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkUpdateStage.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Mark All as Contacted
              </button>
            </div>
          );
        })()}

        {/* Kanban board — fills remaining space */}
        {viewMode === "kanban" && (
          <div
            className="flex-1 overflow-hidden"
            onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-[#444]" />
              </div>
            ) : (
              <div className="flex gap-0 h-full">
                {KANBAN_STAGES.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex flex-col flex-1 min-w-0 overflow-hidden border-r border-[#1e1e1e] last:border-r-0"
                    onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id); }}
                    onDragLeave={() => setDragOverStage(null)}
                    onDrop={e => { e.preventDefault(); handleDrop(stage.id); }}
                  >
                    {/* Column header */}
                    <div className={cn(
                      "px-4 py-3 border-b shrink-0 transition-colors",
                      dragOverStage === stage.id ? "border-[#E07B2A]/40 bg-[#E07B2A]/5" : "border-[#1e1e1e]"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{stage.label}</span>
                        <span className="text-xs text-[#555] font-mono">{byStage(stage.id).length}</span>
                      </div>
                      {byStage(stage.id).length === 0 && (
                        <p className={cn("text-[11px] mt-0.5", dragOverStage === stage.id ? "text-[#E07B2A]/60" : "text-[#3a3a3a]")}>
                          {dragOverStage === stage.id ? "Drop here" : stage.subtitle}
                        </p>
                      )}
                    </div>
                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {byStage(stage.id).map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onClick={() => setSelectedLead(lead)}
                          onDragStart={handleDragStart}
                        />
                      ))}
                      {dragOverStage === stage.id && byStage(stage.id).length > 0 && (
                        <div className="h-10 border-2 border-dashed border-[#E07B2A]/40 rounded-lg bg-[#E07B2A]/5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CLOSED bottom bar — only in kanban view */}
        {viewMode === "kanban" && (
          <div className="shrink-0 border-t border-[#1e1e1e]">
            <div className="text-center py-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#333]">CLOSED</span>
            </div>
            <div className="flex">
              {/* Won */}
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 border-t-2 border-green-500/40 bg-green-500/5">
                <Star className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400">Won</span>
                <span className="text-xs text-green-500/60 font-mono">{byStage("won").length}</span>
              </div>
              {/* Lost */}
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 border-t-2 border-red-500/40 bg-red-500/5 border-x border-x-[#1e1e1e]">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Lost</span>
                <span className="text-xs text-red-500/60 font-mono">{byStage("lost").length}</span>
              </div>
              {/* On Hold */}
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 border-t-2 border-blue-500/40 bg-blue-500/5">
                <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">On Hold</span>
                <span className="text-xs text-blue-500/60 font-mono">{byStage("on_hold").length}</span>
              </div>
              {/* Phone Ready pill — right side */}
              <div className="flex items-center px-4 border-l border-[#1e1e1e]">
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Phone Ready
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStageChange={handleStageChange}
          onDelete={id => deleteLead.mutate({ id })}
        />
      )}

      {/* Add lead modal */}
      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} onCreate={handleCreate} />
      )}
    </DashboardLayout>
  );
}
