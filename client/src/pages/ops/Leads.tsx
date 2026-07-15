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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Phone, Mail, MessageSquare, BotMessageSquare, FileText, Calendar,
  Plus, Search, X, Loader2, XCircle,
  MapPin, ExternalLink, Trash2,
  AlarmClock, User, PhoneCall,
  ClipboardList, Star, Snowflake, RefreshCw,
  Map as MapIcon, LayoutGrid, Clock, Navigation,
  Brain, Copy, Check, CheckCheck, Sparkles, Unlink,
  Send, Radar, CheckCircle, Info, Save, CheckCircle2, Facebook, Pencil, History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  jobberQuoteId?: string | null;
  jobberQuoteNumber?: number | null;
  estimateAmount?: string | null;
  clientType?: string | null;
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
          {lead.clientType === "government" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-blue-500/15 text-blue-400 border-blue-500/25">
              GOV
            </span>
          )}
          {lead.clientType === "commercial" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/25">
              COM
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
    const [showContactModal, setShowContactModal] = useState(false);
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsBody, setSmsBody] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  // Site visit request state
  const [showSiteVisitModal, setShowSiteVisitModal] = useState(false);
  const [siteVisitTone, setSiteVisitTone] = useState<"professional" | "casual" | "urgent">("professional");
  const [siteVisitMessage, setSiteVisitMessage] = useState("");
  const [siteVisitCustom, setSiteVisitCustom] = useState("");
  const [siteVisitLogContact, setSiteVisitLogContact] = useState(true);

  // AI Quote state
  const [showAiQuote, setShowAiQuote] = useState(false);
  // Lead Qualifier structured inputs
  const [showQualifierInputs, setShowQualifierInputs] = useState(false);
  const [qlAcreage, setQlAcreage] = useState("");
  const [qlDensity, setQlDensity] = useState<"light"|"moderate"|"heavy"|"very_heavy">("moderate");
  const [qlTerrain, setQlTerrain] = useState<"flat"|"rolling"|"steep"|"very_steep">("flat");
  const [qlAccess, setQlAccess] = useState<"easy"|"moderate"|"difficult">("easy");
  const [qlStumps, setQlStumps] = useState<boolean | undefined>(undefined);
  const [qlStructures, setQlStructures] = useState<boolean | undefined>(undefined);
  const [aiQuoteResult, setAiQuoteResult] = useState<{
    service: string; estimatedAcres: number | null;
    estimateLow: number; estimateHigh: number;
    mobilizationNote: string; reasoning: string;
    missingInfo: string[]; confidence: "high" | "medium" | "low";
  } | null>(null);
  // Map jobType string to estimator service slug
  const inferServiceSlug = (jobType: string | null | undefined): string => {
    const jt = (jobType ?? "").toLowerCase();
    if (jt.includes("mulch"))      return "forestry-mulching";
    if (jt.includes("trail"))      return "trail-cutting";
    if (jt.includes("stump"))      return "stump-grinding-only";
    if (jt.includes("brush") || jt.includes("hog")) return "property-maintenance";
    if (jt.includes("row") || jt.includes("right")) return "right-of-way-clearing";
    if (jt.includes("vegetation")) return "vegetation-management";
    return "land-management";
  };
  const [aqService, setAqService] = useState(() => inferServiceSlug(lead.jobType));
  const [aqAcreage, setAqAcreage] = useState("");
  const [aqTerrain, setAqTerrain] = useState("flat");
  const [aqDensity, setAqDensity] = useState("moderate");
  const [aqAccess, setAqAccess] = useState("easy");
  const [aqMiles, setAqMiles] = useState("");

  // Editable result fields (populated from AI result, user can adjust before saving)
  const [editService, setEditService] = useState("");
  const [editAcres, setEditAcres] = useState("");
  const [editLow, setEditLow] = useState("");
  const [editHigh, setEditHigh] = useState("");
  const [editReasoning, setEditReasoning] = useState("");
  const [editMobNote, setEditMobNote] = useState("");
  const [quoteSaved, setQuoteSaved] = useState(false);

  // Populate edit fields when AI result arrives
  const populateEditFields = (r: NonNullable<typeof aiQuoteResult>) => {
    setEditService(r.service);
    setEditAcres(r.estimatedAcres != null ? String(r.estimatedAcres) : "");
    setEditLow(String(r.estimateLow));
    setEditHigh(String(r.estimateHigh));
    setEditReasoning(r.reasoning);
    setEditMobNote(r.mobilizationNote);
    setQuoteSaved(false);
  };

  // Load SMS templates (channel = 'sms') from the settings router
  const { data: allTemplates = [] } = trpc.ops.settings.getMessageTemplates.useQuery(undefined, {
    enabled: showSmsModal,
    staleTime: 60_000,
  });
  const smsTemplates = allTemplates.filter((t) => t.channel === "sms" && t.body);
  const utils = trpc.useUtils();
  const unlinkQuote = trpc.ops.unlinkQuoteFromLead.useMutation({
    onSuccess: () => {
      toast.success("Quote unlinked.");
      setShowQuotePreview(false);
      setConfirmUnlink(false);
      utils.ops.leads.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Failed to unlink quote."),
  });
  const { data: notes = [], isLoading: notesLoading } = trpc.ops.leads.listNotes.useQuery({ leadId: lead.id });
  const { data: contactLog = [], isLoading: contactLogLoading } = trpc.ops.leads.getContactLog.useQuery({ leadId: lead.id });

  // Live Jobber quote status for the linked quote badge
  const { data: linkedQuote, isLoading: quoteStatusLoading } = trpc.jobber.quoteDetail.useQuery(
    { id: lead.jobberQuoteId! },
    { enabled: !!lead.jobberQuoteId, retry: false, staleTime: 1000 * 60 * 5 }
  );

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

  const sendFollowUp = trpc.ops.leads.sendFollowUp.useMutation({
    onSuccess: (data) => {
      if (data.channel === "sms") {
        toast.success("Text sent via Twilio.");
      } else {
        toast.success("Email sent.");
      }
      utils.ops.leads.list.invalidate();
    },
    onError: (err) => toast.error(`Send failed: ${err.message}`),
  });

  const handleCopyDraft = () => {
    if (!followUpDraft) return;
    navigator.clipboard.writeText(followUpDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const aiQuoteMutation = trpc.ops.ai.quoteFromLead.useMutation({
    onSuccess: (data) => { setAiQuoteResult(data); populateEditFields(data); },
    onError: () => toast.error("AI quote analysis failed"),
  });

  const saveAiQuoteMutation = trpc.ops.leads.saveAiQuote.useMutation({
    onSuccess: () => {
      setQuoteSaved(true);
      toast.success("Quote saved to lead profile");
      utils.ops.leads.listNotes.invalidate({ leadId: lead.id });
      utils.ops.leads.list.invalidate();
    },
    onError: () => toast.error("Failed to save quote"),
  });

  const handleSaveAiQuote = () => {
    if (!aiQuoteResult) return;
    saveAiQuoteMutation.mutate({
      leadId: lead.id,
      service: editService || aiQuoteResult.service,
      estimatedAcres: editAcres ? parseFloat(editAcres) : aiQuoteResult.estimatedAcres,
      estimateLow: editLow ? parseFloat(editLow) : aiQuoteResult.estimateLow,
      estimateHigh: editHigh ? parseFloat(editHigh) : aiQuoteResult.estimateHigh,
      mobilizationNote: editMobNote,
      reasoning: editReasoning,
      missingInfo: aiQuoteResult.missingInfo,
      confidence: aiQuoteResult.confidence,
    });
  };

  const buildEmailDraft = () => {
    const svc = editService || aiQuoteResult?.service || "";
    const low = editLow ? parseFloat(editLow) : (aiQuoteResult?.estimateLow ?? 0);
    const high = editHigh ? parseFloat(editHigh) : (aiQuoteResult?.estimateHigh ?? 0);
    const acres = editAcres || (aiQuoteResult?.estimatedAcres ? String(aiQuoteResult.estimatedAcres) : null);
    const mobNote = editMobNote || aiQuoteResult?.mobilizationNote || "";
    return `Subject: Noland Earthworks — Preliminary Estimate for Your Property

Hi ${lead.name},

Thank you for reaching out. Based on the information you provided, here is a preliminary estimate for your project:

Service: ${svc}
${acres ? `Estimated acreage: ${acres} acres\n` : ""}Estimated range: $${low.toLocaleString()} – $${high.toLocaleString()}${mobNote ? `\nTravel: ${mobNote}` : ""}

Please keep in mind this is a general estimate based on the details available. An accurate quote requires a site visit so I can assess the terrain, vegetation density, and access conditions firsthand.

If you would like to schedule a site visit, reply to this email or give me a call at (615) 406-4819. I will get back to you the same day.

Jon Noland
Noland Earthworks, LLC
Veteran-Owned and Operated
(615) 406-4819
nolandearthworks.com`;
  };

  const runAiQuote = () => {
    aiQuoteMutation.mutate({
      leadId: lead.id,
      service: aqService || undefined,
      acreage: aqAcreage ? parseFloat(aqAcreage) : undefined,
      terrain: aqTerrain as "flat" | "rolling" | "steep" | "very_steep",
      vegetationDensity: aqDensity as "light" | "moderate" | "heavy" | "very_heavy",
      accessDifficulty: aqAccess as "easy" | "moderate" | "difficult",
      mobilizationMiles: aqMiles ? parseFloat(aqMiles) : undefined,
    });
  };

  const addNote = trpc.ops.leads.addNote.useMutation({
    onSuccess: () => { setNoteText(""); utils.ops.leads.listNotes.invalidate({ leadId: lead.id }); },
    onError: () => toast.error("Failed to add note"),
  });

  const sendInitialSms = trpc.ops.leads.sendInitialSms.useMutation({
    onSuccess: (data) => {
      toast.success("Text sent.");
      setSmsBody("");
      setShowSmsModal(false);
      // Navigate to the conversation in the CRM
      navigate(`/ops/conversations`);
    },
    onError: (err) => toast.error(`Send failed: ${err.message}`),
  });

  const generateSiteVisitRequest = trpc.ops.leads.generateSiteVisitRequest.useMutation({
    onSuccess: (data) => {
      setSiteVisitMessage(data.message);
    },
    onError: (err) => toast.error(`Generation failed: ${err.message}`),
  });
  const appendLeadNote = trpc.ops.leads.appendLeadNote.useMutation({
    onSuccess: () => {
      utils.ops.leads.list.invalidate();
    },
    onError: (err) => toast.error(`Failed to save note: ${err.message}`),
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
    <>
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
          <div className="grid grid-cols-5 gap-1.5">
            {lead.phone && (
              <a href={`tel:${lead.phone}`}
                className="flex flex-col items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold py-2 rounded-md transition-colors">
                <Phone className="w-3.5 h-3.5" />Call
              </a>
            )}
            {lead.phone && (
              <button
                onClick={() => setShowSmsModal(true)}
                className="flex flex-col items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold py-2 rounded-md transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />Text
              </button>
            )}
            <button
              onClick={() => {
                const params = new URLSearchParams();
                params.set("newQuote", "1");
                params.set("leadId", String(lead.id));
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
            <button
              onClick={() => {
                setSiteVisitMessage("");
                setSiteVisitTone("professional");
                setSiteVisitCustom("");
                setSiteVisitLogContact(true);
                setShowSiteVisitModal(true);
                generateSiteVisitRequest.mutate({ leadId: lead.id, tone: "professional" });
              }}
              className="flex flex-col items-center justify-center gap-1 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-[11px] text-teal-400 py-2 rounded-md transition-colors">
              <Sparkles className="w-3.5 h-3.5" />Site Visit Req
            </button>
          </div>
          {/* Linked Jobber quote badge — clickable with live status */}
          {lead.jobberQuoteId && (() => {
            const status = linkedQuote?.quoteStatus ?? null;
            const statusColor =
              status === "APPROVED" ? "text-green-400 border-green-500/30 bg-green-500/10" :
              status === "ARCHIVED" ? "text-[#666] border-[#333] bg-[#111]" :
              "text-amber-300 border-amber-500/25 bg-amber-500/10";
            const statusLabel =
              status === "APPROVED" ? "Approved" :
              status === "ARCHIVED" ? "Archived" :
              status === "DRAFT" ? "Draft" :
              quoteStatusLoading ? "..." : "Linked";
            // Decode Jobber base64 ID to numeric for URL
            let numericId = lead.jobberQuoteId;
            try {
              const decoded = atob(lead.jobberQuoteId);
              const parts = decoded.split("/");
              const last = parts[parts.length - 1];
              if (last && /^\d+$/.test(last)) numericId = last;
            } catch { /* ignore */ }
            return (
              <>
                <button
                  onClick={() => setShowQuotePreview(true)}
                  className={`mt-2 w-full flex items-center gap-2 px-2 py-1.5 border rounded-md hover:opacity-80 transition-opacity cursor-pointer ${statusColor}`}
                >
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="text-[11px] font-medium">
                    Quote {lead.jobberQuoteNumber ? `#${lead.jobberQuoteNumber}` : ""}
                  </span>
                  {lead.estimateAmount && (
                    <span className="text-[11px] font-bold text-white">
                      ${Number(lead.estimateAmount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/20">{statusLabel}</span>
                  <ExternalLink className="ml-auto w-3 h-3 shrink-0 opacity-60" />
                </button>
                {/* Quote preview modal */}
                {showQuotePreview && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowQuotePreview(false)}>
                    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      {/* Header */}
                      <div className={`flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] rounded-t-xl ${statusColor}`}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-semibold">
                            Quote {lead.jobberQuoteNumber ? `#${lead.jobberQuoteNumber}` : ""}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/30">{statusLabel}</span>
                        </div>
                        <button onClick={() => setShowQuotePreview(false)} className="text-[#666] hover:text-white transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Body */}
                      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {quoteStatusLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-[#555]" />
                          </div>
                        ) : linkedQuote ? (
                          <>
                            {/* Client */}
                            {linkedQuote.client && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Client</p>
                                <p className="text-sm text-white font-medium">{linkedQuote.client.name || linkedQuote.client.companyName}</p>
                                {linkedQuote.property?.address && (
                                  <p className="text-[11px] text-[#666]">
                                    {[linkedQuote.property.address.street1, linkedQuote.property.address.city, linkedQuote.property.address.province].filter(Boolean).join(", ")}
                                  </p>
                                )}
                              </div>
                            )}
                            {/* Line items */}
                            {linkedQuote.lineItems?.nodes?.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Line Items</p>
                                <div className="space-y-1">
                                  {linkedQuote.lineItems.nodes.map((item: any, i: number) => (
                                    <div key={i} className="flex items-start justify-between gap-2 text-[11px]">
                                      <span className="text-[#ccc] flex-1">{item.name}{item.description ? ` — ${item.description}` : ""}</span>
                                      <span className="text-white font-semibold shrink-0">
                                        {item.quantity !== 1 && <span className="text-[#666] mr-1">{item.quantity}×</span>}
                                        ${Number(item.unitPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Amounts */}
                            {linkedQuote.amounts && (
                              <div className="border-t border-[#2a2a2a] pt-2 space-y-1">
                                {linkedQuote.amounts.subtotal != null && (
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-[#666]">Subtotal</span>
                                    <span className="text-[#ccc]">${Number(linkedQuote.amounts.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                                {linkedQuote.amounts.total != null && (
                                  <div className="flex justify-between text-sm font-bold">
                                    <span className="text-white">Total</span>
                                    <span className="text-[#E07B2A]">${Number(linkedQuote.amounts.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Message/notes */}
                            {linkedQuote.message && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#555] mb-1">Notes</p>
                                <p className="text-[11px] text-[#999] whitespace-pre-wrap">{linkedQuote.message}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-[11px] text-[#555] text-center py-4">Quote details unavailable.</p>
                        )}
                      </div>
                      {/* Footer */}
                      <div className="px-4 py-3 border-t border-[#2a2a2a] space-y-2">
                        {confirmUnlink ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-red-400 flex-1">Remove this quote from the lead?</span>
                            <button
                              onClick={() => unlinkQuote.mutate({ leadId: lead.id })}
                              disabled={unlinkQuote.isPending}
                              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50"
                            >
                              {unlinkQuote.isPending ? "Removing..." : "Yes, remove"}
                            </button>
                            <button
                              onClick={() => setConfirmUnlink(false)}
                              className="px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[#666] text-[11px] font-semibold rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <a
                              href={`https://secure.getjobber.com/quotes/${numericId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[#aaa] text-[11px] font-semibold py-2 rounded-md transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open in Jobber
                            </a>
                            <button
                              onClick={() => setConfirmUnlink(true)}
                              className="px-3 py-2 bg-[#1e1e1e] hover:bg-red-600/10 border border-[#2a2a2a] hover:border-red-500/30 text-[#555] hover:text-red-400 text-[11px] font-semibold rounded-md transition-colors"
                              title="Unlink quote from this lead"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setShowQuotePreview(false)}
                              className="px-4 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] text-[#666] text-[11px] font-semibold py-2 rounded-md transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
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
          {/* Lead Qualifier — expandable structured inputs */}
          {showQualifierInputs && (
            <div className="mx-4 mb-2 bg-[#0f0f0f] border border-[#E07B2A]/30 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E07B2A]/70">Site Data (optional — improves score accuracy)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#666] block mb-0.5">Acreage</label>
                  <input
                    type="number" min="0.1" step="0.5" placeholder="e.g. 3.5"
                    value={qlAcreage}
                    onChange={e => setQlAcreage(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[11px] text-white placeholder-[#444] focus:outline-none focus:border-[#E07B2A]/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#666] block mb-0.5">Vegetation Density</label>
                  <select value={qlDensity} onChange={e => setQlDensity(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#E07B2A]/50">
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="heavy">Heavy</option>
                    <option value="very_heavy">Very Heavy</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#666] block mb-0.5">Terrain</label>
                  <select value={qlTerrain} onChange={e => setQlTerrain(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#E07B2A]/50">
                    <option value="flat">Flat</option>
                    <option value="rolling">Rolling</option>
                    <option value="steep">Steep</option>
                    <option value="very_steep">Very Steep</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#666] block mb-0.5">Access</label>
                  <select value={qlAccess} onChange={e => setQlAccess(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#E07B2A]/50">
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="difficult">Difficult</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-[11px] text-[#888] cursor-pointer">
                  <input type="checkbox" checked={qlStumps === true} onChange={e => setQlStumps(e.target.checked ? true : undefined)}
                    className="accent-[#E07B2A]" />
                  Stumps present
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-[#888] cursor-pointer">
                  <input type="checkbox" checked={qlStructures === true} onChange={e => setQlStructures(e.target.checked ? true : undefined)}
                    className="accent-[#E07B2A]" />
                  Near structures / fencing
                </label>
              </div>
            </div>
          )}
          <div className="mx-4 mb-2 flex gap-2">
            <button
              onClick={() => {
                if (!showQualifierInputs) { setShowQualifierInputs(true); return; }
                qualifyLead.mutate({
                  leadId: lead.id,
                  acreage: qlAcreage ? parseFloat(qlAcreage) : undefined,
                  vegetationDensity: qlDensity,
                  terrain: qlTerrain,
                  accessDifficulty: qlAccess,
                  hasStumps: qlStumps,
                  nearStructures: qlStructures,
                });
                setShowQualifierInputs(false);
              }}
              disabled={qualifyLead.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#E07B2A]/40 text-[11px] text-[#aaa] hover:text-[#E07B2A] py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {qualifyLead.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
              {qualifyLead.isPending ? "Scoring..." : showQualifierInputs ? "Run Score" : "Score Lead"}
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

          {/* AI Quote button — full-width row below the 3-button row */}
          <div className="mx-4 mb-3">
            <button
              onClick={() => { setShowAiQuote(v => !v); setAiQuoteResult(null); }}
              className={`w-full flex items-center justify-center gap-1.5 border text-[11px] py-2 rounded-lg transition-colors ${
                showAiQuote
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-[#1a1a1a] hover:bg-[#222] border-[#2a2a2a] hover:border-amber-500/40 text-[#aaa] hover:text-amber-400"
              }`}
            >
              <Radar className="w-3 h-3" />
              {showAiQuote ? "Hide AI Quote" : "AI Quote Estimate"}
            </button>
          </div>

          {/* AI Quote Panel */}
          {showAiQuote && (
            <div className="mx-4 mb-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">AI Quote Analysis</span>
                <button onClick={() => { setShowAiQuote(false); setAiQuoteResult(null); }} className="text-[10px] text-[#555] hover:text-[#888]"><X className="w-3 h-3" /></button>
              </div>

              {/* Adjustable inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Service</p>
                  <select
                    value={aqService}
                    onChange={e => setAqService(e.target.value)}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="forestry-mulching">Forestry Mulching</option>
                    <option value="land-management">Land Management</option>
                    <option value="vegetation-management">Vegetation Management</option>
                    <option value="right-of-way-clearing">ROW Clearing</option>
                    <option value="trail-cutting">Trail Cutting</option>
                    <option value="property-maintenance">Brush Hogging</option>
                    <option value="stump-grinding-only">Stump Grinding</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Acreage (optional)</p>
                  <input
                    type="number" min="0.1" max="500" step="0.5"
                    value={aqAcreage}
                    onChange={e => setAqAcreage(e.target.value)}
                    placeholder="AI will infer"
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white placeholder:text-[#444] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Terrain</p>
                  <select
                    value={aqTerrain}
                    onChange={e => setAqTerrain(e.target.value)}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="flat">Flat / Rolling</option>
                    <option value="rolling">Moderate Slope</option>
                    <option value="steep">Steep / Wet</option>
                    <option value="very_steep">Very Steep / Rocky</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Density</p>
                  <select
                    value={aqDensity}
                    onChange={e => setAqDensity(e.target.value)}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="light">Light</option>
                    <option value="moderate">Moderate</option>
                    <option value="heavy">Heavy</option>
                    <option value="very_heavy">Very Heavy</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Access</p>
                  <select
                    value={aqAccess}
                    onChange={e => setAqAccess(e.target.value)}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="difficult">Difficult</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Drive (miles)</p>
                  <input
                    type="number" min="0" max="300" step="1"
                    value={aqMiles}
                    onChange={e => setAqMiles(e.target.value)}
                    placeholder={travelDist ? travelDist.replace(/ mi.*/, "") : "0"}
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white placeholder:text-[#444] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <button
                onClick={runAiQuote}
                disabled={aiQuoteMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-[11px] font-semibold py-2 rounded-md transition-colors"
              >
                {aiQuoteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Radar className="w-3 h-3" />}
                {aiQuoteMutation.isPending ? "Analyzing..." : "Run AI Quote"}
              </button>

              {/* Result */}
              {aiQuoteResult && (
                <div className="space-y-3 pt-2 border-t border-amber-500/15">

                  {/* Header row: service + confidence badge */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider">AI Quote Result</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      aiQuoteResult.confidence === "high"
                        ? "bg-green-500/15 text-green-400 border-green-500/25"
                        : aiQuoteResult.confidence === "medium"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                        : "bg-red-500/15 text-red-400 border-red-500/25"
                    }`}>{aiQuoteResult.confidence} confidence</span>
                  </div>

                  {/* Editable fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Service</p>
                      <input
                        type="text"
                        value={editService}
                        onChange={e => setEditService(e.target.value)}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Low ($)</p>
                      <input
                        type="number" min="0"
                        value={editLow}
                        onChange={e => setEditLow(e.target.value)}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">High ($)</p>
                      <input
                        type="number" min="0"
                        value={editHigh}
                        onChange={e => setEditHigh(e.target.value)}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Acres (est.)</p>
                      <input
                        type="number" min="0" step="0.1"
                        value={editAcres}
                        onChange={e => setEditAcres(e.target.value)}
                        placeholder="—"
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white placeholder:text-[#444] focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Travel note</p>
                      <input
                        type="text"
                        value={editMobNote}
                        onChange={e => setEditMobNote(e.target.value)}
                        placeholder="—"
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white placeholder:text-[#444] focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Reasoning</p>
                      <textarea
                        rows={3}
                        value={editReasoning}
                        onChange={e => setEditReasoning(e.target.value)}
                        className="w-full bg-[#111] border border-[#2a2a2a] rounded px-2 py-1.5 text-[11px] text-white resize-none focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  {/* Missing info flags (read-only) */}
                  {Array.isArray(aiQuoteResult.missingInfo) && aiQuoteResult.missingInfo.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Missing Info</p>
                      <div className="flex flex-wrap gap-1">
                        {aiQuoteResult.missingInfo.map((item, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{item}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Save to Lead */}
                    <button
                      onClick={handleSaveAiQuote}
                      disabled={saveAiQuoteMutation.isPending || quoteSaved}
                      className={`flex items-center justify-center gap-1.5 text-[11px] font-semibold py-2 rounded-md transition-colors ${
                        quoteSaved
                          ? "bg-green-600/20 border border-green-500/30 text-green-400 cursor-default"
                          : "bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white"
                      }`}
                    >
                      {saveAiQuoteMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : quoteSaved ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      {quoteSaved ? "Saved" : "Save to Lead"}
                    </button>

                    {/* Email Draft */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(buildEmailDraft()).then(() => toast.success("Email draft copied to clipboard"));
                      }}
                      className="flex items-center justify-center gap-1.5 text-[11px] bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#aaa] py-2 rounded-md transition-colors"
                    >
                      <Mail className="w-3 h-3" /> Email Draft
                    </button>

                    {/* Copy raw estimate */}
                    <button
                      onClick={() => {
                        const low = editLow ? parseFloat(editLow) : aiQuoteResult.estimateLow;
                        const high = editHigh ? parseFloat(editHigh) : aiQuoteResult.estimateHigh;
                        const svc = editService || aiQuoteResult.service;
                        const acres = editAcres || (aiQuoteResult.estimatedAcres ? String(aiQuoteResult.estimatedAcres) : null);
                        const text = `AI QUOTE ESTIMATE — ${svc}\nRange: $${low.toLocaleString()} – $${high.toLocaleString()}${acres ? ` (${acres} acres est.)` : ""}\n\nReasoning: ${editReasoning || aiQuoteResult.reasoning}${editMobNote ? `\n\nTravel: ${editMobNote}` : ""}${aiQuoteResult.missingInfo?.length ? `\n\nMissing info needed:\n- ${aiQuoteResult.missingInfo.join("\n- ")}` : ""}`;
                        navigator.clipboard.writeText(text).then(() => toast.success("Quote estimate copied"));
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 text-[11px] bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#aaa] py-1.5 rounded-md transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy Raw Estimate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                    className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-xs text-[#aaa] py-2 px-3 rounded-md transition-colors shrink-0"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                  {lead.phone && (
                    <button
                      onClick={() => sendFollowUp.mutate({ leadId: lead.id, message: followUpDraft, channel: "sms" })}
                      disabled={sendFollowUp.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-md transition-colors"
                    >
                      {sendFollowUp.isPending && sendFollowUp.variables?.channel === "sms"
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</>
                        : <><MessageSquare className="w-3.5 h-3.5" />Send Text</>}
                    </button>
                  )}
                  {lead.email && (
                    <button
                      onClick={() => sendFollowUp.mutate({ leadId: lead.id, message: followUpDraft, channel: "email" })}
                      disabled={sendFollowUp.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-md transition-colors"
                    >
                      {sendFollowUp.isPending && sendFollowUp.variables?.channel === "email"
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</>
                        : <><Mail className="w-3.5 h-3.5" />Send Email</>}
                    </button>
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

          {/* Contact Log */}
          <div className="px-4 py-3 border-t border-[#1e1e1e]">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-3.5 h-3.5 text-[#555]" />
              <p className="text-xs font-semibold text-white">Contact Log</p>
              <span className="ml-auto text-[10px] text-[#555]">{contactLog.length} contact{contactLog.length !== 1 ? "s" : ""}</span>
            </div>
            {contactLogLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#555]" />
                <span className="text-xs text-[#555]">Loading...</span>
              </div>
            ) : contactLog.length === 0 ? (
              <p className="text-[11px] text-[#555] italic">No outbound contacts logged yet.</p>
            ) : (
              <div className="space-y-3">
                {contactLog.map(entry => {
                  const methodIcon = entry.method === "email"
                    ? <Mail className="w-3 h-3 text-blue-400" />
                    : entry.method === "sms"
                    ? <MessageSquare className="w-3 h-3 text-green-400" />
                    : entry.method === "phone"
                    ? <Phone className="w-3 h-3 text-amber-400" />
                    : <User className="w-3 h-3 text-purple-400" />;
                  const methodLabel = entry.method === "email" ? "Email" : entry.method === "sms" ? "SMS" : entry.method === "phone" ? "Phone Call" : "In Person";
                  const methodColor = entry.method === "email" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" : entry.method === "sms" ? "text-green-400 bg-green-400/10 border-green-400/20" : entry.method === "phone" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-purple-400 bg-purple-400/10 border-purple-400/20";
                  const [expanded, setExpanded] = useState(false);
                  return (
                    <div key={entry.id} className="rounded-lg border border-[#222] bg-[#141414] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${methodColor}`}>
                          {methodIcon}
                          {methodLabel}
                        </span>
                        {entry.subject && (
                          <span className="text-[11px] text-[#aaa] truncate flex-1">{entry.subject}</span>
                        )}
                        <span className="ml-auto text-[10px] text-[#555] shrink-0">{timeAgo(entry.sentAt)}</span>
                        {entry.body && (
                          <button
                            onClick={() => setExpanded(v => !v)}
                            className="shrink-0 text-[10px] text-[#555] hover:text-[#aaa] transition-colors"
                          >
                            {expanded ? "Hide" : "View"}
                          </button>
                        )}
                      </div>
                      {expanded && entry.body && (
                        <div className="px-3 pb-3">
                          <div className="bg-[#1a1a1a] rounded-md p-2.5 border border-[#2a2a2a]">
                            <p className="text-[11px] text-[#bbb] whitespace-pre-wrap leading-relaxed">{entry.body}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            onClick={() => setShowContactModal(true)}
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

    {/* Contact Detail Modal */}
    {showContactModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={() => setShowContactModal(false)}>
        <div className="bg-[#111] border border-[#222] rounded-xl w-full max-w-sm mx-4 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E07B2A]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[#E07B2A]" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{lead.name}</p>
                <p className="text-xs text-[#555]">{lead.stage.charAt(0).toUpperCase() + lead.stage.slice(1)} Lead</p>
              </div>
            </div>
            <button onClick={() => setShowContactModal(false)} className="p-1.5 rounded-md hover:bg-[#1e1e1e] transition-colors">
              <X className="w-4 h-4 text-[#666]" />
            </button>
          </div>
          {/* Contact Fields */}
          <div className="p-5 space-y-3">
            {lead.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <Phone className="w-3.5 h-3.5 text-[#E07B2A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#555] mb-0.5">Phone</p>
                  <a href={`tel:${lead.phone}`} className="text-sm text-white hover:text-[#E07B2A] transition-colors font-medium">{lead.phone}</a>
                </div>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-[#E07B2A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#555] mb-0.5">Email</p>
                  <a href={`mailto:${lead.email}`} className="text-sm text-white hover:text-[#E07B2A] transition-colors truncate block">{lead.email}</a>
                </div>
              </div>
            )}
            {lead.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E07B2A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#555] mb-0.5">Property Address</p>
                  <p className="text-sm text-white leading-snug">{lead.address}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <ClipboardList className="w-3.5 h-3.5 text-[#E07B2A]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#555] mb-0.5">Source</p>
                <p className="text-sm text-white capitalize">{lead.source}</p>
              </div>
            </div>
            {lead.jobType && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[#E07B2A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#555] mb-0.5">Job Type</p>
                  <p className="text-sm text-white">{lead.jobType}</p>
                </div>
              </div>
            )}
            {lead.estimatedValue && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                  <Star className="w-3.5 h-3.5 text-[#E07B2A]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[#555] mb-0.5">Estimated Value</p>
                  <p className="text-sm text-white">${Number(lead.estimatedValue).toLocaleString()}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-[#555]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#555] mb-0.5">Added</p>
                <p className="text-sm text-[#aaa]">{new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="px-5 pb-5 flex gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-[#E07B2A] hover:bg-[#c96a20] text-white text-xs font-medium px-3 py-2.5 rounded-lg transition-colors">
                <Phone className="w-3.5 h-3.5" />Call
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#aaa] text-xs font-medium px-3 py-2.5 rounded-lg transition-colors">
                <Mail className="w-3.5 h-3.5" />Email
              </a>
            )}
            {lead.phone && (
              <button
                onClick={() => setShowSmsModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#aaa] text-xs font-medium px-3 py-2.5 rounded-lg transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />Text
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* SMS Compose Modal */}
    {showSmsModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-sm shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-white font-semibold text-sm">Send Text to {lead.name}</h3>
              <p className="text-[#888] text-xs mt-0.5">{lead.phone}</p>
            </div>
            <button onClick={() => { setShowSmsModal(false); setSmsBody(""); setShowTemplates(false); }} className="text-[#555] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Template picker */}
          {smsTemplates.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] text-amber-400/80 hover:text-amber-400 transition-colors mb-1.5"
              >
                <FileText className="w-3 h-3" />
                {showTemplates ? "Hide templates" : `Use a template (${smsTemplates.length})`}
              </button>
              {showTemplates && (
                <div className="space-y-1 max-h-36 overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#111] p-1.5">
                  {smsTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setSmsBody(t.body ?? ""); setShowTemplates(false); }}
                      className="w-full text-left px-2.5 py-2 rounded-md hover:bg-white/5 transition-colors"
                    >
                      <span className="block text-[10px] text-amber-400/60 uppercase tracking-wider mb-0.5">{t.category.replace(/_/g, " ")}</span>
                      <span className="text-xs text-white/70 line-clamp-2">{t.body}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <textarea
            value={smsBody}
            onChange={(e) => setSmsBody(e.target.value)}
            placeholder="Type your message..."
            rows={4}
            maxLength={1600}
            className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 resize-none placeholder:text-[#555] focus:outline-none focus:border-green-600/60"
          />
          <div className="flex items-center justify-between mt-1 mb-3">
            <span className="text-[10px] text-[#555]">{smsBody.length}/1600</span>
            <span className="text-[10px] text-[#555]">Sends from (888) 329-8553 via CRM</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 text-[#888] hover:text-white"
              onClick={() => { setShowSmsModal(false); setSmsBody(""); }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-500 text-white gap-1.5"
              disabled={!smsBody.trim() || sendInitialSms.isPending}
              onClick={() => sendInitialSms.mutate({ leadId: lead.id, body: smsBody.trim() })}
            >
              {sendInitialSms.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sendInitialSms.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </div>
    )}
        {/* Site Visit Request Modal */}
    {showSiteVisitModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 w-full max-w-md shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                Site Visit Request
              </h3>
              <p className="text-[#888] text-xs mt-0.5">{lead.name}{lead.phone ? ` · ${lead.phone}` : ""}</p>
            </div>
            <button onClick={() => setShowSiteVisitModal(false)} className="text-[#555] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tone selector */}
          <div className="mb-3">
            <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1.5">Tone</p>
            <div className="flex gap-1.5">
              {(["professional", "casual", "urgent"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setSiteVisitTone(t);
                    setSiteVisitMessage("");
                    generateSiteVisitRequest.mutate({ leadId: lead.id, tone: t, customInstructions: siteVisitCustom || undefined });
                  }}
                  className={cn(
                    "flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-colors capitalize",
                    siteVisitTone === t
                      ? "bg-teal-600/20 border-teal-500/50 text-teal-300"
                      : "bg-[#111] border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#3a3a3a]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instructions */}
          <div className="mb-3">
            <p className="text-[10px] text-[#666] uppercase tracking-wider mb-1.5">Custom instructions (optional)</p>
            <input
              type="text"
              value={siteVisitCustom}
              onChange={e => setSiteVisitCustom(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && siteVisitCustom.trim()) {
                  setSiteVisitMessage("");
                  generateSiteVisitRequest.mutate({ leadId: lead.id, tone: siteVisitTone, customInstructions: siteVisitCustom.trim() });
                }
              }}
              placeholder='e.g. "mention we have availability this week"'
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-3 py-2 placeholder:text-[#555] focus:outline-none focus:border-teal-600/60"
            />
          </div>

          {/* Generated message */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-[#666] uppercase tracking-wider">Generated message</p>
              {siteVisitMessage && (
                <button
                  onClick={() => {
                    setSiteVisitMessage("");
                    generateSiteVisitRequest.mutate({ leadId: lead.id, tone: siteVisitTone, customInstructions: siteVisitCustom || undefined });
                  }}
                  disabled={generateSiteVisitRequest.isPending}
                  className="flex items-center gap-1 text-[10px] text-teal-400/70 hover:text-teal-400 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className="w-3 h-3" />Regenerate
                </button>
              )}
            </div>
            {generateSiteVisitRequest.isPending ? (
              <div className="space-y-2 p-3 bg-[#111] rounded-lg border border-[#2a2a2a]">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  <span className="text-[11px] text-[#666]">Writing message...</span>
                </div>
                <div className="h-2.5 bg-[#222] rounded animate-pulse w-full" />
                <div className="h-2.5 bg-[#222] rounded animate-pulse w-5/6" />
                <div className="h-2.5 bg-[#222] rounded animate-pulse w-4/5" />
                <div className="h-2.5 bg-[#222] rounded animate-pulse w-3/4" />
              </div>
            ) : siteVisitMessage ? (
              <textarea
                value={siteVisitMessage}
                onChange={e => setSiteVisitMessage(e.target.value)}
                rows={5}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2.5 resize-none placeholder:text-[#555] focus:outline-none focus:border-teal-600/60"
              />
            ) : (
              <div className="p-3 bg-[#111] rounded-lg border border-[#2a2a2a] text-[#555] text-xs text-center">
                Select a tone above to generate a message
              </div>
            )}
          </div>

          {/* Log as contacted checkbox */}
          {siteVisitMessage && (
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={siteVisitLogContact}
                onChange={e => setSiteVisitLogContact(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-teal-500"
              />
              <span className="text-[11px] text-[#888]">Log as Contacted + append note to lead</span>
            </label>
          )}

          {/* Footer actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 text-[#888] hover:text-white"
              onClick={() => setShowSiteVisitModal(false)}
            >
              Close
            </Button>
            {siteVisitMessage && (
              <>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 border-[#2a2a2a] text-[#aaa] hover:text-white"
                  onClick={() => {
                    navigator.clipboard.writeText(siteVisitMessage);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />Copy
                </Button>
                {lead.phone && (
                  <Button
                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-white gap-1.5"
                    disabled={sendInitialSms.isPending}
                    onClick={() => {
                      sendInitialSms.mutate(
                        { leadId: lead.id, body: siteVisitMessage },
                        {
                          onSuccess: () => {
                            if (siteVisitLogContact) {
                              onStageChange(lead.id, "contacted");
                              appendLeadNote.mutate({ leadId: lead.id, note: "Site visit request sent via SMS" });
                            }
                            toast.success("Site visit request sent via SMS");
                            setShowSiteVisitModal(false);
                          },
                        }
                      );
                    }}
                  >
                    {sendInitialSms.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send SMS
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
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
              {["Land Management", "Forestry Mulching", "Brush Removal", "Stump Grinding", "Wildfire Mitigation", "Trail Cutting"].map(t => (
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

// ─── Prospecting Tab ─────────────────────────────────────────────────────────

function ProspectingTabTrigger() {
  const { data: newCountData } = trpc.ops.prospecting.newCount.useQuery(undefined, { refetchInterval: 30_000 });
  const newCount = newCountData?.count ?? 0;
  return (
    <TabsTrigger
      value="prospecting"
      className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-white text-white/50 px-4 pb-2 pt-0 text-sm font-medium bg-transparent hover:text-white/80 transition-colors"
    >
      Prospecting
      {newCount > 0 && (
        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">
          {newCount > 9 ? "9+" : newCount}
        </span>
      )}
    </TabsTrigger>
  );
}

const PROSPECT_SOURCE_LABELS: Record<string, string> = {
  craigslist: "Craigslist",
  facebook: "Facebook",
  facebook_marketplace: "FB Marketplace",
  nextdoor: "Nextdoor",
  google_reviews: "Google Reviews",
  permits: "Permit Filings",
  other: "Other",
};

const PROSPECT_SOURCE_COLORS: Record<string, string> = {
  craigslist: "bg-purple-900/40 text-purple-300 border-purple-700",
  facebook: "bg-blue-900/40 text-blue-300 border-blue-700",
  facebook_marketplace: "bg-blue-900/40 text-blue-300 border-blue-700",
  nextdoor: "bg-green-900/40 text-green-300 border-green-700",
  google_reviews: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  permits: "bg-orange-900/40 text-orange-300 border-orange-700",
  other: "bg-zinc-800 text-zinc-300 border-zinc-600",
};

type ProspectStatus = "new" | "contacted" | "dismissed";

interface Prospect {
  id: number;
  source: string;
  url: string;
  contactName: string | null;
  contactInfo: string | null;
  location: string | null;
  summary: string;
  reachOutDraft: string | null;
  status: string;
  postSnippet: string | null;
  profileUrl?: string | null;
  marginTier?: string | null;
  estimatedAcres?: string | null;
  createdAt: Date;
}

function ProspectingTab() {
  const [filter, setFilter] = useState<"all" | ProspectStatus>("all");
  const [marginFilter, setMarginFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [reachOutTarget, setReachOutTarget] = useState<Prospect | null>(null);
  const [reachOutText, setReachOutText] = useState("");
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  // Quick-edit modal
  const [editTarget, setEditTarget] = useState<Prospect | null>(null);
  const [editAcres, setEditAcres] = useState("");
  const [editMarginTier, setEditMarginTier] = useState<"high" | "medium" | "low" | "">("")
  const [editNotes, setEditNotes] = useState("");
  // AI draft result modal — includes prospectId for Regenerate
  const [draftModal, setDraftModal] = useState<{ leadId: number | null; prospectId: number | null; draft: string } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: prospects = [], isLoading, refetch } = trpc.ops.prospecting.list.useQuery(
    { status: filter === "all" ? undefined : filter },
    { refetchInterval: 60_000 }
  );

  const utils = trpc.useUtils();

  const updateStatus = trpc.ops.prospecting.updateStatus.useMutation({
    onSuccess: () => {
      utils.ops.prospecting.list.invalidate();
      utils.ops.prospecting.newCount.invalidate();
    },
  });

  const deleteLead = trpc.ops.prospecting.delete.useMutation({
    onSuccess: () => {
      utils.ops.prospecting.list.invalidate();
      utils.ops.prospecting.newCount.invalidate();
      toast.success("Prospect removed.");
    },
  });

  const runScan = trpc.ops.prospecting.runScan.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Scan started. Results will appear here when the task finishes. View progress at manus.im`,
        { duration: 8000 }
      );
      // Open the Manus task in a new tab so Jon can watch it run
      if (data.taskUrl) window.open(data.taskUrl, "_blank");
    },
    onError: (err) => toast.error(`Scan failed to start: ${err.message}`),
  });

  const convertToLead = trpc.ops.prospecting.convertToLead.useMutation({
    onSuccess: (data) => {
      utils.ops.prospecting.list.invalidate();
      utils.ops.prospecting.newCount.invalidate();
      utils.ops.leads.list.invalidate();
      if (data.aiDraft) {
        setDraftModal({ leadId: data.leadId ?? null, prospectId: null, draft: data.aiDraft });
      } else {
        toast.success("Prospect added to your lead pipeline.");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to convert prospect."),
  });

  const updateProspect = trpc.ops.prospecting.updateProspect.useMutation({
    onSuccess: () => {
      utils.ops.prospecting.list.invalidate();
      setEditTarget(null);
      toast.success("Prospect updated.");
    },
    onError: (err) => toast.error(err.message || "Update failed."),
  });

  const regenerateDraftMutation = trpc.ops.prospecting.regenerateDraft.useMutation({
    onSuccess: (data) => {
      setDraftModal((prev) => prev ? { ...prev, draft: data.draft } : null);
      setIsRegenerating(false);
    },
    onError: (err) => {
      toast.error(err.message || "Regenerate failed.");
      setIsRegenerating(false);
    },
  });

  const sendSms = trpc.ops.leads.sendDirectSms.useMutation({
    onSuccess: () => {
      toast.success("Message sent.");
      setReachOutTarget(null);
      if (reachOutTarget) {
        updateStatus.mutate({ id: reachOutTarget.id, status: "contacted" });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  function openReachOut(p: Prospect) {
    setReachOutTarget(p);
    setReachOutText(p.reachOutDraft ?? "");
  }

  function handleFacebookReachOut() {
    if (!reachOutTarget || !reachOutText.trim()) return;
    // Copy the message to clipboard
    navigator.clipboard.writeText(reachOutText.trim()).then(() => {
      toast.success("Message copied. Opening Facebook post — paste it as a comment.", { duration: 5000 });
    }).catch(() => {
      toast.info("Opening Facebook post. Copy your message manually.");
    });
    // Open the original post in a new tab
    window.open(reachOutTarget.url, "_blank", "noopener,noreferrer");
    // Mark as contacted
    updateStatus.mutate({ id: reachOutTarget.id, status: "contacted" });
    setReachOutTarget(null);
  }

  function handleMessengerReachOut() {
    if (!reachOutTarget?.profileUrl) return;
    // Derive m.me link from profile URL
    // Handles: https://www.facebook.com/username, https://www.facebook.com/profile.php?id=12345
    let messengerUrl: string;
    try {
      const parsed = new URL(reachOutTarget.profileUrl);
      const idParam = parsed.searchParams.get("id");
      if (idParam) {
        messengerUrl = `https://m.me/${idParam}`;
      } else {
        // Extract last path segment as username
        const segments = parsed.pathname.replace(/\/+$/, "").split("/");
        const username = segments[segments.length - 1];
        messengerUrl = username ? `https://m.me/${username}` : reachOutTarget.profileUrl;
      }
    } catch {
      messengerUrl = reachOutTarget.profileUrl;
    }
    window.open(messengerUrl, "_blank", "noopener,noreferrer");
    updateStatus.mutate({ id: reachOutTarget.id, status: "contacted" });
    setReachOutTarget(null);
  }

  function handleSend() {
    if (!reachOutTarget || !reachOutText.trim()) return;
    const phone = reachOutTarget.contactInfo?.match(/\+?[\d\s\-().]{10,}/)?.[0];
    if (!phone) {
      toast.error("No phone number found for this prospect. Copy the message and reach out manually.");
      return;
    }
    sendSms.mutate({ phone, message: reachOutText.trim(), contactName: reachOutTarget.contactName ?? undefined });
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
    }
  }

  // Bulk carousel state — queue of {prospectId, draft} items to review sequentially
  const [bulkQueue, setBulkQueue] = useState<{ prospectId: number; name: string; draft: string }[]>([]);
  const [bulkQueueIdx, setBulkQueueIdx] = useState(0);
  const [bulkQueueTotal, setBulkQueueTotal] = useState(0);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  async function bulkPromote() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setIsBulkGenerating(true);
    setBulkMode(false);
    const queue: { prospectId: number; name: string; draft: string }[] = [];
    for (const id of ids) {
      try {
        const data = await convertToLead.mutateAsync({ id });
        if (data.aiDraft) {
          const p = prospects.find((x) => x.id === id);
          queue.push({ prospectId: id, name: p?.contactName ?? `Prospect #${id}`, draft: data.aiDraft });
        }
      } catch { /* skip failed */ }
    }
    setSelectedIds(new Set());
    setIsBulkGenerating(false);
    if (queue.length > 0) {
      setBulkQueue(queue);
      setBulkQueueIdx(0);
      setBulkQueueTotal(queue.length);
      // Open the draft modal with the first item
      setDraftModal({ leadId: null, prospectId: queue[0].prospectId, draft: queue[0].draft });
    } else {
      toast.success(`${ids.length} prospect${ids.length > 1 ? "s" : ""} added to leads.`);
    }
  }

  function advanceBulkQueue(updatedDraft: string) {
    // Save the current draft edit back to the queue
    const updatedQueue = bulkQueue.map((item, i) =>
      i === bulkQueueIdx ? { ...item, draft: updatedDraft } : item
    );
    setBulkQueue(updatedQueue);
    const nextIdx = bulkQueueIdx + 1;
    if (nextIdx < updatedQueue.length) {
      setBulkQueueIdx(nextIdx);
      setDraftModal({ leadId: null, prospectId: updatedQueue[nextIdx].prospectId, draft: updatedQueue[nextIdx].draft });
    } else {
      // Done with all
      setBulkQueue([]);
      setBulkQueueIdx(0);
      setBulkQueueTotal(0);
      setDraftModal(null);
      toast.success(`${updatedQueue.length} lead${updatedQueue.length > 1 ? "s" : ""} added. Drafts ready to send.`);
    }
  }

  async function bulkDismiss() {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await updateStatus.mutateAsync({ id, status: "dismissed" }).catch(() => {});
    }
    setSelectedIds(new Set());
    setBulkMode(false);
    toast.success(`${ids.length} prospect${ids.length > 1 ? "s" : ""} dismissed.`);
  }

  function openQuickEdit(p: Prospect) {
    setEditTarget(p);
    setEditAcres(p.estimatedAcres ?? "");
    setEditMarginTier((p.marginTier as "high" | "medium" | "low" | "") ?? "");
  }

  const newCount = prospects.filter((p) => p.status === "new").length;
  const contactedCount = prospects.filter((p) => p.status === "contacted").length;
  const dismissedCount = prospects.filter((p) => p.status === "dismissed").length;
  const highMarginCount = prospects.filter((p) => p.marginTier === "high" && p.status !== "dismissed").length;
  const filteredProspects = marginFilter === "all"
    ? prospects
    : prospects.filter((p) => p.marginTier === marginFilter);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="h-6 w-6 text-orange-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Prospecting</h2>
            <p className="text-sm text-zinc-400">AI-discovered leads from Craigslist, Facebook, Nextdoor, and more</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runScan.mutate()}
            disabled={runScan.isPending}
            className="border-orange-700 text-orange-300 hover:text-orange-100 hover:border-orange-500"
          >
            {runScan.isPending ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Starting...</>
            ) : (
              <><Radar className="h-4 w-4 mr-2" />Run Scan</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
            className={cn(
              "border-zinc-700 text-zinc-300 hover:text-white",
              bulkMode && "border-blue-600 text-blue-300 bg-blue-900/20"
            )}
          >
            {bulkMode ? "Cancel Select" : "Select"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-zinc-700 text-zinc-300 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-300">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-orange-400" />
        <span>
          The AI scans public sources daily for people in Tennessee asking about land management, forestry mulching, brush removal, or overgrown property.
          New prospects appear here automatically. Review each one, fire a reach-out message, or dismiss it.
          The cron runs every morning — or hit <strong>Run Scan</strong> to kick one off right now. Results appear here when the task finishes (typically 5-15 minutes).
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{newCount}</div>
          <div className="text-xs text-zinc-400 mt-1">New</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{contactedCount}</div>
          <div className="text-xs text-zinc-400 mt-1">Contacted</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-4 text-center">
          <div className="text-2xl font-bold text-zinc-400">{dismissedCount}</div>
          <div className="text-xs text-zinc-400 mt-1">Dismissed</div>
        </div>
        <div
          className={cn(
            "rounded-lg border p-4 text-center cursor-pointer transition-colors",
            highMarginCount > 0
              ? "border-green-700/60 bg-green-900/20 hover:bg-green-900/30"
              : "border-zinc-700 bg-zinc-800/60"
          )}
          onClick={() => setMarginFilter(marginFilter === "high" ? "all" : "high")}
          title="Click to filter high-margin prospects"
        >
          <div className={cn("text-2xl font-bold", highMarginCount > 0 ? "text-green-400" : "text-zinc-500")}>{highMarginCount}</div>
          <div className="text-xs text-zinc-400 mt-1">High Margin</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5">
          {(["all", "new", "contacted", "dismissed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-zinc-700 mx-1" />
        <div className="flex gap-1.5">
          {(["all", "high", "medium", "low"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarginFilter(m)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                marginFilter === m
                  ? m === "high" ? "bg-green-600 text-white"
                    : m === "medium" ? "bg-amber-600 text-white"
                    : m === "low" ? "bg-zinc-600 text-white"
                    : "bg-orange-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              )}
            >
              {m === "all" ? "All Margins" : m.charAt(0).toUpperCase() + m.slice(1) + " Margin"}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk generating overlay */}
      {isBulkGenerating && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-700/40 bg-blue-900/20 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          <span className="text-sm text-blue-300">Generating AI drafts and adding leads…</span>
        </div>
      )}

      {/* Bulk action bar */}
      {bulkMode && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-700/40 bg-blue-900/10 px-4 py-3">
          <input
            type="checkbox"
            checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
            onChange={toggleSelectAll}
            className="w-4 h-4 accent-blue-500 cursor-pointer"
          />
          <span className="text-sm text-blue-300">
            {selectedIds.size === 0 ? "Select prospects below" : `${selectedIds.size} selected`}
          </span>
          {selectedIds.size > 0 && (
            <>
              <Button
                size="sm"
                onClick={bulkPromote}
                disabled={convertToLead.isPending || isBulkGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
              >
                {convertToLead.isPending || isBulkGenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                Add to Leads
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={bulkDismiss}
                disabled={updateStatus.isPending}
                className="border-zinc-600 text-zinc-300 hover:text-white h-7 text-xs"
              >
                Dismiss
              </Button>
            </>
          )}
        </div>
      )}

      {/* Prospect list */}
      {isLoading ? (
        <div className="text-zinc-400 text-sm py-8 text-center">Loading prospects...</div>
      ) : prospects.length === 0 ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-10 text-center">
          <Radar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            {filter === "all"
              ? "No prospects yet. The AI cron runs daily — check back tomorrow morning."
              : `No ${filter} prospects.`}
          </p>
        </div>
      ) : filteredProspects.length === 0 ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-10 text-center">
          <Radar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No prospects match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(filteredProspects as Prospect[]).map((p) => (
            <Card
              key={p.id}
              className={cn(
                "border bg-zinc-800/60",
                p.marginTier === "high"
                  ? "border-green-600/60 shadow-[0_0_0_1px_rgba(22,163,74,0.25)]"
                  : p.marginTier === "medium"
                  ? "border-amber-600/40"
                  : "border-zinc-700"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  {bulkMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="mt-1 w-4 h-4 accent-blue-500 cursor-pointer shrink-0"
                    />
                  )}
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded border",
                        PROSPECT_SOURCE_COLORS[p.source] ?? PROSPECT_SOURCE_COLORS.other
                      )}
                    >
                      {PROSPECT_SOURCE_LABELS[p.source] ?? p.source}
                    </span>
                    {p.status === "new" && (
                      <Badge className="bg-orange-500/20 text-orange-300 border-orange-700 text-xs">New</Badge>
                    )}
                    {p.status === "contacted" && (
                      <Badge className="bg-green-500/20 text-green-300 border-green-700 text-xs">Contacted</Badge>
                    )}
                    {p.status === "dismissed" && (
                      <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600 text-xs">Dismissed</Badge>
                    )}
                    {/* Margin tier badge */}
                    {p.marginTier === "high" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-green-900/40 text-green-300 border-green-700">
                        HIGH MARGIN
                      </span>
                    )}
                    {p.marginTier === "medium" && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-amber-900/30 text-amber-300 border-amber-700">
                        MED MARGIN
                      </span>
                    )}
                    {p.marginTier === "low" && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded border bg-zinc-800 text-zinc-400 border-zinc-600">
                        LOW MARGIN
                      </span>
                    )}
                    {p.estimatedAcres && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        ~{p.estimatedAcres} ac
                      </span>
                    )}
                    {p.location && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3" />
                        {p.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openQuickEdit(p)}
                      title="Quick-edit acreage and margin tier"
                      className="p-1 rounded text-zinc-500 hover:text-blue-400 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-zinc-400 hover:text-orange-400 transition-colors"
                      title="View original post"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                {p.contactName && (
                  <CardTitle className="text-base text-white mt-1">{p.contactName}</CardTitle>
                )}
                {p.contactInfo && (
                  <p className="text-xs text-zinc-400">{p.contactInfo}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-zinc-200">{p.summary}</p>
                {p.postSnippet && (
                  <blockquote className="border-l-2 border-zinc-600 pl-3 text-xs text-zinc-400 italic">
                    "{p.postSnippet.length > 200 ? p.postSnippet.slice(0, 200) + "\u2026" : p.postSnippet}"
                  </blockquote>
                )}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {p.status !== "contacted" && (
                    <Button
                      size="sm"
                      onClick={() => openReachOut(p)}
                      className="bg-orange-600 hover:bg-orange-700 text-white h-8 text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Reach Out
                    </Button>
                  )}
                  {p.status === "new" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: p.id, status: "contacted" })}
                      className="border-zinc-600 text-zinc-300 hover:text-white h-8 text-xs"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Mark Contacted
                    </Button>
                  )}
                  {p.status !== "dismissed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: p.id, status: "dismissed" })}
                      className="border-zinc-600 text-zinc-400 hover:text-zinc-200 h-8 text-xs"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Dismiss
                    </Button>
                  )}
                  {p.status === "dismissed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: p.id, status: "new" })}
                      className="border-zinc-600 text-zinc-400 hover:text-zinc-200 h-8 text-xs"
                    >
                      Restore
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => convertToLead.mutate({ id: p.id })}
                    disabled={convertToLead.isPending}
                    className="border-blue-700/60 text-blue-300 hover:text-blue-100 hover:border-blue-500 h-8 text-xs"
                    title="Add this prospect to your lead pipeline"
                  >
                    {convertToLead.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                    Add to Leads
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteLead.mutate({ id: p.id })}
                    className="text-zinc-500 hover:text-red-400 h-8 text-xs ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reach Out modal */}
      <Dialog open={!!reachOutTarget} onOpenChange={(open) => !open && setReachOutTarget(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Reach Out — {reachOutTarget?.contactName ?? "Prospect"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {reachOutTarget?.contactInfo && (
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-300 font-medium">Contact:</span> {reachOutTarget.contactInfo}
              </p>
            )}
            {reachOutTarget && (reachOutTarget.source === "facebook" || reachOutTarget.source === "facebook_marketplace") && (
              <div className="flex items-start gap-2 rounded-md border border-blue-800/50 bg-blue-900/20 px-3 py-2 text-xs text-blue-300">
                <Facebook className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Facebook prospect — use <strong>Post on Facebook</strong> to open the original post and paste your message as a comment.</span>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Edit the AI-drafted message below before sending. If a phone number is detected in the contact info, it will be sent via SMS from your (888) number.
            </p>
            <Textarea
              value={reachOutText}
              onChange={(e) => setReachOutText(e.target.value)}
              rows={6}
              className="bg-zinc-800 border-zinc-600 text-white text-sm resize-none"
              placeholder="Type your message..."
            />
            <p className="text-xs text-zinc-500 text-right">{reachOutText.length} / 160 chars</p>
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setReachOutTarget(null)}
              className="border-zinc-600 text-zinc-300"
            >
              Cancel
            </Button>
            {reachOutTarget && (reachOutTarget.source === "facebook" || reachOutTarget.source === "facebook_marketplace") && (
              <Button
                onClick={handleFacebookReachOut}
                disabled={!reachOutText.trim()}
                className="bg-blue-700 hover:bg-blue-600 text-white"
              >
                <Facebook className="h-4 w-4 mr-2" />
                Post on Facebook
              </Button>
            )}
            {reachOutTarget && (reachOutTarget.source === "facebook" || reachOutTarget.source === "facebook_marketplace") && (
              reachOutTarget.profileUrl ? (
                <Button
                  onClick={handleMessengerReachOut}
                  className="bg-indigo-700 hover:bg-indigo-600 text-white"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send via Messenger
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          disabled
                          className="bg-indigo-900/50 text-indigo-400/50 cursor-not-allowed"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send via Messenger
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                      Profile URL not available — run a new scan to capture it
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            )}
            <Button
              onClick={handleSend}
              disabled={!reachOutText.trim() || sendSms.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {sendSms.isPending ? "Sending..." : "Send via SMS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Prospect Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Estimated Acreage</label>
              <input
                type="text"
                value={editAcres}
                onChange={(e) => setEditAcres(e.target.value)}
                placeholder="e.g. 3.5"
                className="w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Margin Tier</label>
              <div className="flex gap-2">
                {(["high", "medium", "low"] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setEditMarginTier(tier)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
                      editMarginTier === tier
                        ? tier === "high" ? "border-green-600 bg-green-900/40 text-green-300"
                          : tier === "medium" ? "border-amber-600 bg-amber-900/30 text-amber-300"
                          : "border-zinc-500 bg-zinc-700 text-zinc-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-500 hover:border-zinc-500"
                    )}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 font-medium">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Extra context, follow-up details, or anything relevant before promoting…"
                rows={3}
                className="bg-zinc-800 border-zinc-600 text-white text-sm resize-none placeholder:text-zinc-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)} className="border-zinc-600 text-zinc-300">Cancel</Button>
            <Button
              onClick={() => {
                if (!editTarget) return;
                updateProspect.mutate({
                  id: editTarget.id,
                  estimatedAcres: editAcres || undefined,
                  marginTier: editMarginTier || undefined,
                  notes: editNotes || undefined,
                });
              }}
              disabled={updateProspect.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {updateProspect.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Draft Outreach modal — with Regenerate, queue progress, and Next/Done navigation */}
      <Dialog open={!!draftModal} onOpenChange={(open) => { if (!open) { setDraftModal(null); setBulkQueue([]); setBulkQueueIdx(0); setBulkQueueTotal(0); } }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">
                {bulkQueueTotal > 1
                  ? `Draft Outreach — ${bulkQueueIdx + 1} of ${bulkQueueTotal}`
                  : "Prospect Added — AI Draft Outreach"}
              </DialogTitle>
              {bulkQueueTotal > 1 && (
                <span className="text-xs text-zinc-500">{bulkQueue[bulkQueueIdx]?.name}</span>
              )}
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-zinc-400">
              {bulkQueueTotal > 1
                ? `Review and edit each draft before confirming. ${bulkQueueTotal - bulkQueueIdx - 1} remaining after this one.`
                : "Lead created. Here is an AI-drafted first-contact message based on what this prospect posted. Edit it before sending."}
            </p>
            {/* Queue progress bar */}
            {bulkQueueTotal > 1 && (
              <div className="w-full bg-zinc-700 rounded-full h-1">
                <div
                  className="bg-orange-500 h-1 rounded-full transition-all"
                  style={{ width: `${((bulkQueueIdx + 1) / bulkQueueTotal) * 100}%` }}
                />
              </div>
            )}
            <Textarea
              value={draftModal?.draft ?? ""}
              onChange={(e) => setDraftModal((prev) => prev ? { ...prev, draft: e.target.value } : null)}
              rows={7}
              className="bg-zinc-800 border-zinc-600 text-white text-sm resize-none"
              disabled={isRegenerating}
            />
            {isRegenerating && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating a new variation…
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-wrap gap-2">
            {/* Regenerate button */}
            {draftModal?.prospectId != null && (
              <Button
                variant="outline"
                size="sm"
                disabled={isRegenerating}
                onClick={() => {
                  if (!draftModal?.prospectId) return;
                  setIsRegenerating(true);
                  regenerateDraftMutation.mutate({ id: draftModal.prospectId });
                }}
                className="border-zinc-600 text-zinc-300 mr-auto"
              >
                {isRegenerating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Regenerate
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (draftModal?.draft) navigator.clipboard.writeText(draftModal.draft);
                toast.success("Message copied to clipboard.");
              }}
              className="border-zinc-600 text-zinc-300"
              disabled={isRegenerating}
            >
              Copy
            </Button>
            {/* Next or Done depending on queue position */}
            {bulkQueueTotal > 1 ? (
              <Button
                onClick={() => advanceBulkQueue(draftModal?.draft ?? "")}
                disabled={isRegenerating}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {bulkQueueIdx + 1 < bulkQueueTotal ? "Next" : "Done"}
              </Button>
            ) : (
              <Button onClick={() => setDraftModal(null)} disabled={isRegenerating} className="bg-orange-600 hover:bg-orange-700 text-white">Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Conversations Tab ─────────────────────────────────────────────────────────

function formatConvTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date as string | Date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
function formatMsgTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date as string | Date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ConversationsTab() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [smartReplies, setSmartReplies] = useState<{ tone: string; text: string }[]>([]);
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [smartReplyTone, setSmartReplyTone] = useState<"balanced" | "friendly" | "professional" | "direct" | "apologetic">("balanced");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: convList = [], isLoading: convLoading } = trpc.ops.conversations.list.useQuery();
  const selectedConv = convList.find((c) => c.id === selectedId) ?? null;
  const { data: threadMessages = [], isLoading: loadingMessages } = trpc.ops.conversations.getMessages.useQuery(
    { conversationId: selectedId! }, { enabled: selectedId !== null }
  );
  const sendMutation = trpc.ops.conversations.send.useMutation({
    onSuccess: () => { setMessageText(""); utils.ops.conversations.getMessages.invalidate({ conversationId: selectedId! }); utils.ops.conversations.list.invalidate(); },
    onError: (err) => toast.error("Send failed: " + err.message),
  });
  const createMutation = trpc.ops.conversations.create.useMutation({
    onSuccess: (data) => { setShowNewModal(false); setNewName(""); setNewPhone(""); utils.ops.conversations.list.invalidate(); setSelectedId(data.id); toast.success("Conversation started."); },
    onError: (err) => toast.error("Failed: " + err.message),
  });
  const markReadMutation = trpc.ops.conversations.markRead.useMutation({ onSuccess: () => utils.ops.conversations.list.invalidate() });
  const smartRepliesMutation = trpc.ops.conversations.smartReplies.useMutation({
    onSuccess: (data) => { setSmartReplies(data.replies ?? []); setShowSmartReplies(true); },
    onError: (err) => toast.error("Smart replies failed: " + err.message),
  });
  const draftReplyMutation = trpc.ops.conversations.draftReply.useMutation({
    onSuccess: (data) => { setMessageText(data.draft); toast.success("AI draft ready — review and send."); },
    onError: (err) => toast.error("Draft failed: " + err.message),
  });
  const deleteMutation = trpc.ops.conversations.delete.useMutation({
    onSuccess: () => { utils.ops.conversations.list.invalidate(); setSelectedId(null); toast.success("Conversation deleted."); },
    onError: (err) => toast.error("Delete failed: " + err.message),
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [threadMessages]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selectedId && selectedConv?.unread) markReadMutation.mutate({ id: selectedId }); }, [selectedId]);

  const filteredConvs = convList.filter(c =>
    c.contactName.toLowerCase().includes(convSearch.toLowerCase()) || c.contactPhone.includes(convSearch)
  );
  function handleSend() { if (!messageText.trim() || !selectedId) return; sendMutation.mutate({ conversationId: selectedId, body: messageText.trim() }); }
  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border border-white/10 bg-[#111]">
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold text-white">Messages</span>
          <button className="h-7 w-7 flex items-center justify-center text-amber-400 hover:bg-amber-400/10 rounded transition-colors" onClick={() => setShowNewModal(true)}><Plus className="h-4 w-4" /></button>
        </div>
        <div className="px-3 py-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-white/30" />
            <Input value={convSearch} onChange={(e) => setConvSearch(e.target.value)} placeholder="Search contacts..." className="pl-8 h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convLoading ? <div className="p-4 text-center text-white/40 text-sm">Loading...</div>
          : filteredConvs.length === 0 ? (
            <div className="p-6 text-center"><MessageSquare className="h-8 w-8 text-white/20 mx-auto mb-2" /><p className="text-white/40 text-sm">No conversations yet.</p><button className="mt-2 text-amber-400 text-xs hover:underline" onClick={() => setShowNewModal(true)}>Start one</button></div>
          ) : filteredConvs.map((conv) => (
            <button key={conv.id} onClick={() => setSelectedId(conv.id)}
              className={cn("w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors", selectedId === conv.id && "bg-amber-400/10 border-l-2 border-l-amber-400")}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {conv.unread && <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />}
                  <span className={cn("text-sm font-medium truncate", conv.unread ? "text-white" : "text-white/70")}>{conv.contactName}</span>
                </div>
                <span className="text-xs text-white/30 flex-shrink-0">{formatConvTime(conv.lastMessageAt)}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3 text-white/20 flex-shrink-0" /><span className="text-xs text-white/30 truncate">{conv.contactPhone}</span></div>
              {conv.lastMessage && <p className="text-xs text-white/40 truncate mt-1">{conv.lastMessage}</p>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center"><div className="text-center"><MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">Select a conversation to view messages</p></div></div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div><p className="text-sm font-semibold text-white">{selectedConv.contactName}</p><p className="text-xs text-white/40">{selectedConv.contactPhone}</p></div>
              <button className="text-white/30 hover:text-red-400 transition-colors" onClick={() => { if (confirm("Delete conversation with " + selectedConv.contactName + "?")) deleteMutation.mutate({ id: selectedConv.id }); }}><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages ? <div className="text-center text-white/30 text-sm">Loading messages...</div>
              : threadMessages.length === 0 ? <div className="text-center text-white/30 text-sm py-8">No messages yet. Send the first one below.</div>
              : threadMessages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-xs px-3 py-2 rounded-xl text-sm", msg.direction === "outbound" ? "bg-amber-500 text-black" : "bg-white/10 text-white")}>
                    <p>{msg.body}</p>
                    <p className={cn("text-xs mt-1", msg.direction === "outbound" ? "text-black/50" : "text-white/30")}>{formatMsgTime(msg.sentAt)}{msg.status && msg.status !== "sent" ? " · " + msg.status : ""}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex gap-2 mb-2">
                <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm" disabled={sendMutation.isPending} />
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10 gap-1.5 px-2"
                  onClick={() => draftReplyMutation.mutate({ conversationId: selectedId! })} disabled={draftReplyMutation.isPending || !selectedId}>
                  {draftReplyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {draftReplyMutation.isPending ? "Drafting..." : "Draft reply"}
                </Button>
                <div className="flex items-center gap-1">
                  <select value={smartReplyTone} onChange={(e) => setSmartReplyTone(e.target.value as typeof smartReplyTone)} disabled={smartRepliesMutation.isPending || !selectedId}
                    className="h-7 text-[10px] bg-white/5 border border-white/10 text-white/60 rounded-md px-1.5 cursor-pointer focus:outline-none focus:border-blue-500/50 disabled:opacity-40">
                    <option value="balanced">Balanced</option><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="direct">Direct</option><option value="apologetic">Apologetic</option>
                  </select>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/10 gap-1.5 px-2"
                    onClick={() => smartRepliesMutation.mutate({ conversationId: selectedId!, preferredTone: smartReplyTone })} disabled={smartRepliesMutation.isPending || !selectedId}>
                    {smartRepliesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {smartRepliesMutation.isPending ? "Thinking..." : "3 Smart Replies"}
                  </Button>
                </div>
              </div>
              {showSmartReplies && smartReplies.length > 0 && (
                <div className="mt-2 space-y-1.5 border border-blue-500/20 rounded-lg p-2 bg-blue-500/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Smart Replies</span>
                    <button onClick={() => setShowSmartReplies(false)} className="text-[10px] text-white/30 hover:text-white/60">&#10005;</button>
                  </div>
                  {smartReplies.map((r, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <button onClick={() => { setMessageText(r.text); setShowSmartReplies(false); }}
                        className="flex-1 text-left text-xs text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-2.5 py-1.5 transition-colors">
                        <span className="block text-[9px] text-blue-400/70 uppercase tracking-wider mb-0.5">{r.tone.replace(/_/g, " ")}</span>{r.text}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-4">New Conversation</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-white/50 mb-1 block">Contact Name</label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Smith" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
              <div><label className="text-xs text-white/50 mb-1 block">Phone Number</label><Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 615 555 0100" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="ghost" className="flex-1 text-white/60" onClick={() => { setShowNewModal(false); setNewName(""); setNewPhone(""); }}>Cancel</Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-400 text-black" disabled={!newName.trim() || !newPhone.trim() || createMutation.isPending} onClick={() => createMutation.mutate({ contactName: newName.trim(), contactPhone: newPhone.trim() })}>Start</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [govFilter, setGovFilter] = useState<boolean>(false);
  const [closedExpanded, setClosedExpanded] = useState(false);

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
    if (govFilter && l.clientType !== "government") return false;
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
      <Tabs defaultValue="leads" className="flex flex-col h-full bg-[#0a0a0a]">
        {/* Tab header */}
        <div className="flex items-center gap-4 px-4 pt-3 border-b border-[#1e1e1e] shrink-0">
          <TabsList className="bg-transparent border-0 p-0 h-auto gap-0">
            <TabsTrigger value="leads" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-white text-white/50 px-4 pb-2 pt-0 text-sm font-medium bg-transparent hover:text-white/80 transition-colors">Leads</TabsTrigger>
            <TabsTrigger value="conversations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-400 data-[state=active]:text-white text-white/50 px-4 pb-2 pt-0 text-sm font-medium bg-transparent hover:text-white/80 transition-colors">Conversations</TabsTrigger>
            <ProspectingTabTrigger />
          </TabsList>
        </div>

        <TabsContent value="leads" className="flex-1 overflow-hidden mt-0">
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
          {/* GOV filter pill */}
          {(() => {
            const govCount = (leads as Lead[]).filter(l => l.clientType === "government").length;
            if (govCount === 0) return null;
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-blue-400/60 shrink-0">GOV</span>
                <button
                  onClick={() => setGovFilter(v => !v)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    govFilter
                      ? "bg-blue-500/30 text-blue-300 border-blue-500/50"
                      : "bg-blue-500/10 text-blue-400/70 border-blue-500/20 hover:border-blue-500/40"
                  )}
                >
                  Gov / Municipal
                  <span className={cn(
                    "text-[10px] font-bold px-1 py-0.5 rounded-full",
                    govFilter ? "bg-white/15" : "bg-white/5"
                  )}>{govCount}</span>
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
            {/* Collapsed header row — always visible, click to expand */}
            <button
              onClick={() => setClosedExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-[#111] transition-colors group"
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#444] group-hover:text-[#666] transition-colors">CLOSED</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[11px] text-green-400">
                    <Star className="w-3 h-3" />{byStage("won").length} won
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-red-400">
                    <XCircle className="w-3 h-3" />{byStage("lost").length} lost
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-blue-400">
                    <Snowflake className="w-3 h-3" />{byStage("on_hold").length} on hold
                  </span>
                </div>
                <span className="text-[#444] group-hover:text-[#666] transition-colors text-xs">
                  {closedExpanded ? "▲ hide" : "▼ show"}
                </span>
              </div>
            </button>

            {/* Expanded panel — three columns of lead cards */}
            {closedExpanded && (
              <div className="border-t border-[#1e1e1e] bg-[#0a0a0a]">
                <div className="flex gap-0" style={{ maxHeight: 320, overflow: "hidden" }}>
                  {/* Won column */}
                  <div className="flex-1 flex flex-col border-r border-[#1e1e1e] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#1e1e1e] flex items-center gap-2 shrink-0">
                      <Star className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs font-semibold text-green-400">Won</span>
                      <span className="text-xs text-green-500/50 font-mono">{byStage("won").length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {byStage("won").length === 0
                        ? <p className="text-[11px] text-[#333] px-1">No won leads</p>
                        : byStage("won").map(lead => (
                            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} onDragStart={handleDragStart} />
                          ))
                      }
                    </div>
                  </div>
                  {/* Lost column */}
                  <div className="flex-1 flex flex-col border-r border-[#1e1e1e] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#1e1e1e] flex items-center gap-2 shrink-0">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-xs font-semibold text-red-400">Lost</span>
                      <span className="text-xs text-red-500/50 font-mono">{byStage("lost").length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {byStage("lost").length === 0
                        ? <p className="text-[11px] text-[#333] px-1">No lost leads</p>
                        : byStage("lost").map(lead => (
                            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} onDragStart={handleDragStart} />
                          ))
                      }
                    </div>
                  </div>
                  {/* On Hold column */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#1e1e1e] flex items-center gap-2 shrink-0">
                      <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-semibold text-blue-400">On Hold</span>
                      <span className="text-xs text-blue-500/50 font-mono">{byStage("on_hold").length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                      {byStage("on_hold").length === 0
                        ? <p className="text-[11px] text-[#333] px-1">No leads on hold</p>
                        : byStage("on_hold").map(lead => (
                            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} onDragStart={handleDragStart} />
                          ))
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
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
        </TabsContent>

        <TabsContent value="conversations" className="flex-1 overflow-hidden mt-0 p-4">
          <ConversationsTab />
        </TabsContent>

        <TabsContent value="prospecting" className="flex-1 overflow-y-auto mt-0">
          <ProspectingTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
