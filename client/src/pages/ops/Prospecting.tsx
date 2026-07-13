/**
 * Prospecting — AI-discovered leads from public sources
 * v1.0.47: Full rewrite with 12 improvements across 3 tiers:
 *   Tier 1: Margin tier badge, acreage, FB Messenger link, inline notes, lead age, urgency flag
 *   Tier 2: Follow-up reminders, Convert to Lead button
 *   Tier 3: Sort, source stats, bulk dismiss, archived tab, auto-archive display
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radar,
  ExternalLink,
  MessageSquare,
  Trash2,
  CheckCircle,
  Clock,
  MapPin,
  RefreshCw,
  Info,
  Flame,
  ArrowUpDown,
  Archive,
  ArchiveRestore,
  UserPlus,
  Pencil,
  X,
  Check,
  AlertTriangle,
  Facebook,
  Sparkles,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  craigslist: "Craigslist",
  facebook: "Facebook",
  nextdoor: "Nextdoor",
  google_reviews: "Google Reviews",
  permits: "Permit Filings",
  other: "Other",
};

const SOURCE_COLORS: Record<string, string> = {
  craigslist: "bg-purple-900/40 text-purple-300 border-purple-700",
  facebook: "bg-blue-900/40 text-blue-300 border-blue-700",
  nextdoor: "bg-green-900/40 text-green-300 border-green-700",
  google_reviews: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  permits: "bg-orange-900/40 text-orange-300 border-orange-700",
  other: "bg-zinc-800 text-zinc-300 border-zinc-600",
};

const MARGIN_COLORS: Record<string, string> = {
  high: "bg-green-900/40 text-green-300 border-green-700",
  medium: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  low: "bg-red-900/40 text-red-300 border-red-700",
};

type ProspectStatus = "new" | "contacted" | "dismissed";
type SortKey = "age" | "margin" | "source" | "location";
type TabView = "active" | "archived";

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
  profileUrl: string | null;
  marginTier: string | null;
  estimatedAcres: string | null;
  notes: string | null;
  urgencyFlag: boolean;
  archivedAt: Date | null;
  lastContactedAt: Date | null;
  createdAt: Date;
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function hoursSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
}

function buildMessengerLink(profileUrl: string): string {
  const match = profileUrl.match(/facebook\.com\/(?:profile\.php\?id=(\d+)|([^/?#]+))/i);
  if (match) {
    const id = match[1] ?? match[2];
    if (id) return `https://m.me/${id}`;
  }
  return profileUrl;
}

export default function Prospecting() {
  const [filter, setFilter] = useState<"all" | ProspectStatus>("all");
  const [tabView, setTabView] = useState<TabView>("active");
  const [sortKey, setSortKey] = useState<SortKey>("age");
  const [reachOutTarget, setReachOutTarget] = useState<Prospect | null>(null);
  const [reachOutText, setReachOutText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesEditValue, setNotesEditValue] = useState("");
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [fbOutreachTarget, setFbOutreachTarget] = useState<Prospect | null>(null);
  const [fbOutreachVariations, setFbOutreachVariations] = useState<string[]>([]);
  const [fbOutreachSelectedIdx, setFbOutreachSelectedIdx] = useState(0);
  const [fbOutreachText, setFbOutreachText] = useState("");
  const [fbOutreachGeneratingId, setFbOutreachGeneratingId] = useState<number | null>(null);
  const [fbOutreachTone, setFbOutreachTone] = useState<"casual" | "professional" | "urgent">("casual");
  const [fbCustomInstructions, setFbCustomInstructions] = useState("");
  const [fbSaveTemplateName, setFbSaveTemplateName] = useState("");
  const [fbShowSaveTemplate, setFbShowSaveTemplate] = useState(false);
  const [fbShowTemplateMenu, setFbShowTemplateMenu] = useState(false);

  const { data: prospects = [], isLoading, refetch } = trpc.ops.prospecting.list.useQuery(
    { status: filter === "all" ? undefined : filter },
    { refetchInterval: 60_000 }
  );

  const { data: sourceStats = [] } = trpc.ops.prospecting.getSourceStats.useQuery(undefined, {
    refetchInterval: 120_000,
  });

  const utils = trpc.useUtils();

  function invalidateAll() {
    utils.ops.prospecting.list.invalidate();
    utils.ops.prospecting.newCount.invalidate();
    utils.ops.prospecting.getSourceStats.invalidate();
  }

  const updateStatus = trpc.ops.prospecting.updateStatus.useMutation({
    onSuccess: invalidateAll,
  });

  const deleteLead = trpc.ops.prospecting.delete.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Prospect removed.");
    },
  });

  const archiveLead = trpc.ops.prospecting.archiveLead.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Prospect archived.");
    },
  });

  const restoreArchivedLead = trpc.ops.prospecting.restoreArchivedLead.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Prospect restored.");
    },
  });

  const bulkDismiss = trpc.ops.prospecting.bulkDismiss.useMutation({
    onSuccess: (res) => {
      invalidateAll();
      setSelectedIds(new Set());
      toast.success(`${res.count} prospect${res.count === 1 ? "" : "s"} dismissed.`);
    },
  });

  const updateProspect = trpc.ops.prospecting.updateProspect.useMutation({
    onSuccess: () => {
      invalidateAll();
      setEditingNotesId(null);
    },
  });

  const convertToLead = trpc.ops.prospecting.convertToLead.useMutation({
    onSuccess: (res) => {
      invalidateAll();
      setConvertingId(null);
      toast.success("Prospect converted to lead. Check the Leads tab.");
      if (res.aiDraft) {
        toast.info("AI outreach draft attached to the new lead.");
      }
    },
    onError: (err) => {
      setConvertingId(null);
      toast.error(err.message);
    },
  });

  const generateFbOutreach = trpc.ops.prospecting.generateFbOutreach.useMutation({
    onSuccess: (res) => {
      const vars = res.variations ?? [];
      setFbOutreachVariations(vars);
      setFbOutreachSelectedIdx(0);
      setFbOutreachText(vars[0] ?? "");
      setFbOutreachGeneratingId(null);
    },
    onError: (err) => {
      setFbOutreachGeneratingId(null);
      toast.error(err.message);
    },
  });
  const { data: outreachTemplates = [] } = trpc.ops.prospecting.listOutreachTemplates.useQuery();
  const saveOutreachTemplate = trpc.ops.prospecting.saveOutreachTemplate.useMutation({
    onSuccess: () => {
      utils.ops.prospecting.listOutreachTemplates.invalidate();
      setFbSaveTemplateName("");
      setFbShowSaveTemplate(false);
      toast.success("Template saved.");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteOutreachTemplate = trpc.ops.prospecting.deleteOutreachTemplate.useMutation({
    onSuccess: () => utils.ops.prospecting.listOutreachTemplates.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const appendToNotes = trpc.ops.prospecting.appendToNotes.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Message saved to notes.");
    },
    onError: (err) => toast.error(err.message),
  });

  function openFbOutreach(p: Prospect) {
    setFbOutreachTarget(p);
    setFbOutreachText("");
    setFbOutreachVariations([]);
    setFbOutreachSelectedIdx(0);
    setFbOutreachGeneratingId(p.id);
    generateFbOutreach.mutate({ id: p.id, tone: fbOutreachTone, customInstructions: fbCustomInstructions.trim() || undefined });
  }

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

  function handleSend() {
    if (!reachOutTarget || !reachOutText.trim()) return;
    const phone = reachOutTarget.contactInfo?.match(/\+?[\d\s\-().]{10,}/)?.[0];
    if (!phone) {
      toast.error("No phone number found. Copy the message and reach out manually.");
      return;
    }
    sendSms.mutate({ phone, message: reachOutText.trim(), contactName: reachOutTarget.contactName ?? undefined });
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditNotes(p: Prospect) {
    setEditingNotesId(p.id);
    setNotesEditValue(p.notes ?? "");
  }

  function saveNotes(id: number) {
    updateProspect.mutate({ id, notes: notesEditValue });
  }

  const allProspects = prospects as Prospect[];
  const activeProspects = allProspects.filter(p => !p.archivedAt);
  const archivedProspects = allProspects.filter(p => !!p.archivedAt);

  const followUpReminders = useMemo(() =>
    activeProspects.filter(p =>
      p.status === "contacted" &&
      p.lastContactedAt &&
      hoursSince(p.lastContactedAt) >= 72
    ),
    [activeProspects]
  );

  const sortedActive = useMemo(() => {
    const list = [...activeProspects];
    const marginOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    switch (sortKey) {
      case "margin":
        return list.sort((a, b) => (marginOrder[a.marginTier ?? ""] ?? 3) - (marginOrder[b.marginTier ?? ""] ?? 3));
      case "source":
        return list.sort((a, b) => a.source.localeCompare(b.source));
      case "location":
        return list.sort((a, b) => (a.location ?? "").localeCompare(b.location ?? ""));
      case "age":
      default:
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [activeProspects, sortKey]);

  const displayList = tabView === "archived" ? archivedProspects : sortedActive;

  const newCount = activeProspects.filter(p => p.status === "new").length;
  const contactedCount = activeProspects.filter(p => p.status === "contacted").length;
  const dismissedCount = activeProspects.filter(p => p.status === "dismissed").length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="h-6 w-6 text-orange-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Prospecting</h1>
            <p className="text-sm text-zinc-400">AI-discovered leads from Craigslist, Facebook, Nextdoor, and more</p>
          </div>
        </div>
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

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-sm text-zinc-300">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-orange-400" />
        <span>
          The AI scans public sources daily for people in Tennessee asking about land management, forestry mulching, brush removal, or overgrown property.
          New prospects appear here automatically. Review each one, fire a reach-out message, or dismiss it.
          The cron runs every morning — check back daily.
        </span>
      </div>

      {/* Follow-up reminders */}
      {followUpReminders.length > 0 && (
        <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Follow-up needed ({followUpReminders.length})
          </div>
          {followUpReminders.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-amber-200">
                {p.contactName ?? "Unknown"} &mdash; {p.location ?? p.source} &mdash; contacted {hoursSince(p.lastContactedAt!)}h ago
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openReachOut(p)}
                className="border-amber-700 text-amber-300 hover:text-white h-7 text-xs"
              >
                Follow Up
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
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
      </div>

      {/* Source performance mini-stats */}
      {sourceStats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sourceStats.map(s => (
            <span
              key={s.source}
              className={cn(
                "text-xs font-medium px-2 py-1 rounded border",
                SOURCE_COLORS[s.source] ?? SOURCE_COLORS.other
              )}
            >
              {SOURCE_LABELS[s.source] ?? s.source}: {s.count}
            </span>
          ))}
        </div>
      )}

      {/* Tab view: Active / Archived */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setTabView("active")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              tabView === "active"
                ? "bg-orange-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            )}
          >
            Active ({activeProspects.length})
          </button>
          <button
            onClick={() => setTabView("archived")}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              tabView === "archived"
                ? "bg-zinc-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            )}
          >
            Archived ({archivedProspects.length})
          </button>
        </div>

        {tabView === "active" && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {(["all", "new", "contacted", "dismissed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-orange-500/80 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1">
              <ArrowUpDown className="h-3 w-3 text-zinc-400" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="bg-transparent text-xs text-zinc-300 outline-none cursor-pointer"
              >
                <option value="age">Newest</option>
                <option value="margin">Margin</option>
                <option value="source">Source</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk dismiss bar */}
      {selectedIds.size > 0 && tabView === "active" && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-2">
          <span className="text-sm text-zinc-300">{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds(new Set())}
              className="border-zinc-600 text-zinc-400 h-7 text-xs"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => bulkDismiss.mutate({ ids: Array.from(selectedIds) })}
              disabled={bulkDismiss.isPending}
              className="bg-zinc-700 hover:bg-zinc-600 text-white h-7 text-xs"
            >
              Dismiss Selected
            </Button>
          </div>
        </div>
      )}

      {/* Prospect list */}
      {isLoading ? (
        <div className="text-zinc-400 text-sm py-8 text-center">Loading prospects...</div>
      ) : displayList.length === 0 ? (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-10 text-center">
          <Radar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">
            {tabView === "archived"
              ? "No archived prospects."
              : filter === "all"
              ? "No prospects yet. The AI cron runs daily — check back tomorrow morning."
              : `No ${filter} prospects.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((p) => {
            const ageDays = daysSince(p.createdAt);
            const isStale = ageDays >= 14;
            const isSelected = selectedIds.has(p.id);
            const messengerUrl = p.profileUrl ? buildMessengerLink(p.profileUrl) : null;

            return (
              <Card
                key={p.id}
                className={cn(
                  "border-zinc-700 bg-zinc-800/60 transition-colors",
                  isSelected && "border-orange-600/60 bg-zinc-800/80",
                  p.urgencyFlag && "border-l-2 border-l-red-500"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {tabView === "active" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-zinc-600 bg-zinc-700 text-orange-500 cursor-pointer"
                        />
                      )}

                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded border",
                          SOURCE_COLORS[p.source] ?? SOURCE_COLORS.other
                        )}
                      >
                        {SOURCE_LABELS[p.source] ?? p.source}
                      </span>

                      {p.marginTier && (
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded border",
                            MARGIN_COLORS[p.marginTier] ?? "bg-zinc-800 text-zinc-400 border-zinc-600"
                          )}
                        >
                          {p.marginTier.toUpperCase()}
                        </span>
                      )}

                      {p.urgencyFlag && (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/30 border border-red-700 px-2 py-0.5 rounded">
                          <Flame className="h-3 w-3" />
                          Urgent
                        </span>
                      )}

                      {p.status === "new" && (
                        <Badge className="bg-orange-500/20 text-orange-300 border-orange-700 text-xs">New</Badge>
                      )}
                      {p.status === "contacted" && (
                        <Badge className="bg-green-500/20 text-green-300 border-green-700 text-xs">Contacted</Badge>
                      )}
                      {p.status === "dismissed" && (
                        <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600 text-xs">Dismissed</Badge>
                      )}

                      {(p.location || p.estimatedAcres) && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <MapPin className="h-3 w-3" />
                          {[p.location, p.estimatedAcres ? `~${p.estimatedAcres} ac` : null].filter(Boolean).join(" \u00b7 ")}
                        </span>
                      )}

                      <span className={cn("text-xs", isStale ? "text-amber-400 font-medium" : "text-zinc-500")}>
                        {ageDays === 0 ? "Today" : `${ageDays}d ago`}
                        {isStale && " (stale)"}
                      </span>
                    </div>

                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-orange-400 transition-colors shrink-0"
                      title="View original post"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
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
                      &ldquo;{p.postSnippet.length > 200 ? p.postSnippet.slice(0, 200) + "\u2026" : p.postSnippet}&rdquo;
                    </blockquote>
                  )}

                  {/* Inline notes */}
                  <div className="space-y-1">
                    {editingNotesId === p.id ? (
                      <div className="flex gap-2 items-start">
                        <Input
                          value={notesEditValue}
                          onChange={e => setNotesEditValue(e.target.value)}
                          placeholder="Add notes..."
                          className="bg-zinc-700 border-zinc-600 text-white text-xs h-8 flex-1"
                          onKeyDown={e => {
                            if (e.key === "Enter") saveNotes(p.id);
                            if (e.key === "Escape") setEditingNotesId(null);
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => saveNotes(p.id)}
                          disabled={updateProspect.isPending}
                          className="bg-green-700 hover:bg-green-600 text-white h-8 w-8 p-0"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingNotesId(null)}
                          className="text-zinc-400 h-8 w-8 p-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditNotes(p)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                        {p.notes ? (
                          <span className="text-zinc-300">{p.notes}</span>
                        ) : (
                          <span>Add notes</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {tabView === "archived" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreArchivedLead.mutate({ id: p.id })}
                          disabled={restoreArchivedLead.isPending}
                          className="border-zinc-600 text-zinc-300 hover:text-white h-8 text-xs"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLead.mutate({ id: p.id })}
                          className="text-zinc-500 hover:text-red-400 h-8 text-xs ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
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

                        {messengerUrl && (
                          <a href={messengerUrl} target="_blank" rel="noopener noreferrer">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-700 text-blue-300 hover:text-white h-8 text-xs"
                            >
                              <Facebook className="h-3.5 w-3.5 mr-1.5" />
                              Message on FB
                            </Button>
                          </a>
                        )}
                        {/* AI Generate FB Message */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFbOutreach(p)}
                          disabled={fbOutreachGeneratingId === p.id && generateFbOutreach.isPending}
                          className="border-purple-700 text-purple-300 hover:text-white h-8 text-xs"
                          title="Generate a personalized Facebook message with AI"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          {fbOutreachGeneratingId === p.id && generateFbOutreach.isPending ? "Generating..." : "AI Message"}
                        </Button>

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
                          onClick={() => {
                            setConvertingId(p.id);
                            convertToLead.mutate({ id: p.id });
                          }}
                          disabled={convertingId === p.id && convertToLead.isPending}
                          className="border-green-700 text-green-300 hover:text-white h-8 text-xs"
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          {convertingId === p.id && convertToLead.isPending ? "Converting..." : "Convert to Lead"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => archiveLead.mutate({ id: p.id })}
                          className="text-zinc-500 hover:text-zinc-300 h-8 text-xs"
                          title="Archive prospect"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteLead.mutate({ id: p.id })}
                          className="text-zinc-500 hover:text-red-400 h-8 text-xs ml-auto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI FB Outreach modal */}
      <Dialog open={!!fbOutreachTarget} onOpenChange={(open) => { if (!open) { setFbOutreachTarget(null); setFbOutreachText(""); setFbOutreachVariations([]); setFbOutreachSelectedIdx(0); setFbShowSaveTemplate(false); setFbShowTemplateMenu(false); } }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Facebook Message &mdash; {fbOutreachTarget?.contactName ?? "Prospect"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Tone selector */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-400 shrink-0">Tone</label>
              <div className="flex gap-1.5">
                {(["casual", "professional", "urgent"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFbOutreachTone(t)}
                    className={cn(
                      "px-3 py-1 rounded text-xs font-medium transition-colors border",
                      fbOutreachTone === t
                        ? t === "casual" ? "bg-blue-700 border-blue-600 text-white"
                          : t === "professional" ? "bg-zinc-600 border-zinc-500 text-white"
                          : "bg-red-800 border-red-700 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    )}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional custom instructions with template picker */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-400">Custom instructions <span className="text-zinc-600">(optional)</span></label>
                <div className="flex items-center gap-1">
                  {/* Template picker */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setFbShowTemplateMenu(!fbShowTemplateMenu); setFbShowSaveTemplate(false); }}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
                    >
                      Load template
                    </button>
                    {fbShowTemplateMenu && (
                      <div className="absolute right-0 top-6 z-50 bg-zinc-800 border border-zinc-600 rounded-md shadow-lg min-w-[200px] max-h-48 overflow-y-auto">
                        {outreachTemplates.length === 0 ? (
                          <p className="text-xs text-zinc-500 px-3 py-2">No saved templates yet.</p>
                        ) : (
                          outreachTemplates.map((t) => (
                            <div key={t.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-zinc-700 group">
                              <button
                                type="button"
                                className="text-xs text-zinc-300 text-left flex-1 truncate"
                                onClick={() => { setFbCustomInstructions(t.instructions); setFbShowTemplateMenu(false); }}
                              >
                                {t.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteOutreachTemplate.mutate({ id: t.id })}
                                className="text-zinc-600 hover:text-red-400 ml-2 opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {/* Save as template */}
                  <button
                    type="button"
                    onClick={() => { setFbShowSaveTemplate(!fbShowSaveTemplate); setFbShowTemplateMenu(false); }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
                  >
                    Save as template
                  </button>
                </div>
              </div>
              <Input
                value={fbCustomInstructions}
                onChange={(e) => setFbCustomInstructions(e.target.value)}
                placeholder="e.g. mention we have availability next week, keep it under 3 sentences"
                maxLength={500}
                className="bg-zinc-800 border-zinc-600 text-white text-xs h-8 placeholder:text-zinc-600"
              />
              {fbShowSaveTemplate && (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={fbSaveTemplateName}
                    onChange={(e) => setFbSaveTemplateName(e.target.value)}
                    placeholder="Template name (e.g. Mention availability)"
                    maxLength={120}
                    className="bg-zinc-800 border-zinc-600 text-white text-xs h-7 placeholder:text-zinc-600 flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={!fbSaveTemplateName.trim() || !fbCustomInstructions.trim() || saveOutreachTemplate.isPending}
                    onClick={() => saveOutreachTemplate.mutate({ name: fbSaveTemplateName.trim(), instructions: fbCustomInstructions.trim() })}
                    className="h-7 text-xs bg-zinc-700 hover:bg-zinc-600 text-white"
                  >
                    {saveOutreachTemplate.isPending ? "Saving..." : "Save"}
                  </Button>
                  <button type="button" onClick={() => setFbShowSaveTemplate(false)} className="text-zinc-500 hover:text-zinc-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              AI-generated based on the prospect&apos;s post, summary, location, acreage, and notes.
              Your phone number is filled in automatically.
            </p>

            {generateFbOutreach.isPending ? (
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-2 mb-3 text-zinc-500 text-xs">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-400" />
                  Writing 3 variations...
                </div>
                <Skeleton className="h-4 w-full bg-zinc-700/60" />
                <Skeleton className="h-4 w-5/6 bg-zinc-700/60" />
                <Skeleton className="h-4 w-4/6 bg-zinc-700/60" />
                <Skeleton className="h-4 w-full bg-zinc-700/60 mt-2" />
                <Skeleton className="h-4 w-3/4 bg-zinc-700/60" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* Variation selector tabs */}
                {fbOutreachVariations.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    {fbOutreachVariations.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => { setFbOutreachSelectedIdx(idx); setFbOutreachText(fbOutreachVariations[idx]); }}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded border transition-colors",
                          fbOutreachSelectedIdx === idx
                            ? "bg-purple-700 border-purple-600 text-white"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        )}
                      >
                        Option {idx + 1}
                      </button>
                    ))}
                    <span className="text-xs text-zinc-600 ml-1">Select a variation to edit</span>
                  </div>
                )}
                <Textarea
                  value={fbOutreachText}
                  onChange={(e) => setFbOutreachText(e.target.value)}
                  rows={7}
                  className="bg-zinc-800 border-zinc-600 text-white text-sm resize-none"
                  placeholder="AI message will appear here..."
                />
              </div>
            )}
            {fbOutreachText && !generateFbOutreach.isPending && (
              <p className="text-xs text-zinc-500 text-right">{fbOutreachText.length} chars</p>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => { setFbOutreachTarget(null); setFbOutreachText(""); }}
              className="border-zinc-600 text-zinc-300"
            >
              Close
            </Button>
            {!generateFbOutreach.isPending && fbOutreachText && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (fbOutreachTarget) {
                      setFbOutreachText("");
                      setFbOutreachGeneratingId(fbOutreachTarget.id);
                      generateFbOutreach.mutate({ id: fbOutreachTarget.id, tone: fbOutreachTone, customInstructions: fbCustomInstructions.trim() || undefined });
                    }
                  }}
                  className="border-purple-700 text-purple-300 hover:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (fbOutreachTarget) {
                      appendToNotes.mutate({ id: fbOutreachTarget.id, text: fbOutreachText });
                    }
                  }}
                  disabled={appendToNotes.isPending}
                  className="border-zinc-600 text-zinc-300 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  {appendToNotes.isPending ? "Saving..." : "Save to Notes"}
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(fbOutreachText);
                    toast.success("Message copied to clipboard.");
                  }}
                  className="bg-purple-700 hover:bg-purple-600 text-white"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Message
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reach Out modal */}
      <Dialog open={!!reachOutTarget} onOpenChange={(open) => !open && setReachOutTarget(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              Reach Out &mdash; {reachOutTarget?.contactName ?? "Prospect"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {reachOutTarget?.contactInfo && (
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-300 font-medium">Contact:</span> {reachOutTarget.contactInfo}
              </p>
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
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReachOutTarget(null)}
              className="border-zinc-600 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!reachOutText.trim() || sendSms.isPending}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {sendSms.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
