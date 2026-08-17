/**
 * FieldQuotesSection — displays quotes submitted from the Noland Field
 * companion app. Shown on /ops/quotes below the Website Requests section.
 *
 * Features:
 *   - Sort by date, acreage, or AI score
 *   - AI score filter pills
 *   - Detail dialog with Convert to Quote, Email/SMS outreach, and Delete
 */
import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Smartphone,
  Search,
  RefreshCw,
  Trash2,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  User,
  Image,
  Loader2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  X,
  FileText,
  ArrowUpDown,
  Briefcase,
  Send,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { useIncomingRequestAlert } from "@/hooks/useIncomingRequestAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldQuote {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  serviceType: string | null;
  acreage: string | null;
  terrainType: string | null;
  vegetationDensity: string | null;
  vegetationTypes: string | null;
  slopeCondition: string | null;
  accessCondition: string | null;
  obstacles: string | null;
  proximityToStructures: string | null;
  message: string | null;
  photoUrls: string[];
  source: string;
  mapSnapshotUrl: string | null;
  aiScore: "strong" | "marginal" | "weak" | null;
  aiSummary: string | null;
  aiFlags: string[];
  aiDraftResponse: string | null;
  createdAt: Date;
}

type SortKey = "date_desc" | "date_asc" | "acreage_desc" | "score";

const SCORE_ORDER: Record<string, number> = { strong: 0, marginal: 1, weak: 2 };

// ─── AI Score badge ───────────────────────────────────────────────────────────

function AiScoreBadge({ score }: { score: FieldQuote["aiScore"] }) {
  if (!score) return null;
  const cfg = {
    strong:   { cls: "bg-emerald-600 text-white", label: "Strong Lead" },
    marginal: { cls: "bg-yellow-600 text-black",  label: "Marginal" },
    weak:     { cls: "bg-zinc-600 text-zinc-200",  label: "Weak Lead" },
  }[score];
  return <Badge className={`${cfg.cls} text-[10px] font-semibold`}>{cfg.label}</Badge>;
}

// ─── Detail dialog ────────────────────────────────────────────────────────────

function FieldQuoteDetailDialog({
  quote,
  onClose,
  onDelete,
  isDeleting,
  onConverted,
}: {
  quote: FieldQuote;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onConverted: (newQuoteId: number) => void;
}) {
  const [photoIdx, setPhotoIdx] = useState<number | null>(null);
  const [outreachMsg, setOutreachMsg] = useState(quote.aiDraftResponse ?? "");
  const [showOutreach, setShowOutreach] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  const convertToQuote = trpc.fieldQuote.convertToQuote.useMutation({
    onSuccess: (data) => {
      toast.success("Quote created in draft. Opening now...");
      utils.nativeQuotes.list.invalidate();
      onConverted(data.id);
      onClose();
      navigate("/ops/quotes");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendOutreach = trpc.fieldQuote.sendOutreach.useMutation({
    onSuccess: (data) => {
      const ok = data.results.filter((r) => r.success).map((r) => r.channel).join(" & ");
      const fail = data.results.filter((r) => !r.success);
      if (ok) toast.success(`Sent via ${ok}.`);
      fail.forEach((f) => toast.error(`${f.channel} failed: ${f.error}`));
      setShowOutreach(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const rows: { label: string; value: string | null | undefined }[] = [
    { label: "Service",            value: quote.serviceType },
    { label: "Acreage",            value: quote.acreage ? `${quote.acreage} acres` : null },
    { label: "Terrain",            value: quote.terrainType },
    { label: "Vegetation Density", value: quote.vegetationDensity },
    { label: "Vegetation Types",   value: quote.vegetationTypes },
    { label: "Slope",              value: quote.slopeCondition },
    { label: "Site Access",        value: quote.accessCondition },
    { label: "Obstacles",          value: quote.obstacles },
    { label: "Near Structures",    value: quote.proximityToStructures },
  ].filter((r) => r.value);

  const handleSendEmail = () => {
    if (!quote.email) { toast.error("No email on file for this prospect."); return; }
    sendOutreach.mutate({ id: quote.id, message: outreachMsg, channels: ["email"] });
  };

  const handleSendSms = () => {
    if (!quote.phone) { toast.error("No phone number on file for this prospect."); return; }
    sendOutreach.mutate({ id: quote.id, message: outreachMsg, channels: ["sms"] });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-primary" />
            Field Quote — {quote.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-2">
          {/* ── Action buttons ── */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => convertToQuote.mutate({ id: quote.id })}
              disabled={convertToQuote.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {convertToQuote.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                : <FileText className="w-3.5 h-3.5 mr-1.5" />}
              Convert to Quote
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOutreach((v) => !v)}
              className="border-zinc-600 text-foreground"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {showOutreach ? "Hide Outreach" : "Send Outreach"}
            </Button>
          </div>

          {/* ── Outreach panel ── */}
          {showOutreach && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4 space-y-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Send AI Draft Response
              </p>
              <Textarea
                value={outreachMsg}
                onChange={(e) => setOutreachMsg(e.target.value)}
                rows={6}
                className="bg-zinc-900 border-zinc-600 text-sm text-foreground resize-none"
                placeholder="Edit the message before sending..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={sendOutreach.isPending || !quote.email}
                  className="flex-1"
                  title={!quote.email ? "No email on file" : undefined}
                >
                  {sendOutreach.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    : <Mail className="w-3.5 h-3.5 mr-1.5" />}
                  Email{quote.email ? ` (${quote.email})` : " — no email"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendSms}
                  disabled={sendOutreach.isPending || !quote.phone}
                  className="flex-1 border-zinc-600"
                  title={!quote.phone ? "No phone on file" : undefined}
                >
                  {sendOutreach.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    : <MessageSquare className="w-3.5 h-3.5 mr-1.5" />}
                  Text{quote.phone ? ` (${quote.phone})` : " — no phone"}
                </Button>
              </div>
            </div>
          )}

          {/* ── AI Score + Summary ── */}
          {(quote.aiScore || quote.aiSummary) && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Assessment</span>
                <AiScoreBadge score={quote.aiScore} />
              </div>
              {quote.aiSummary && <p className="text-sm text-foreground leading-relaxed">{quote.aiSummary}</p>}
              {quote.aiFlags.length > 0 && (
                <div className="space-y-1 pt-1">
                  {quote.aiFlags.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-yellow-300">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Contact ── */}
          <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact</p>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium">{quote.name}</span>
            </div>
            {quote.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`tel:${quote.phone}`} className="text-primary hover:underline">{quote.phone}</a>
              </div>
            )}
            {quote.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`mailto:${quote.email}`} className="text-primary hover:underline">{quote.email}</a>
              </div>
            )}
            {quote.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(quote.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {quote.address}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* ── Site Map ── */}
          {quote.mapSnapshotUrl && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Site Map</p>
                {quote.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(quote.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    Open in Maps <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div
                className="rounded-lg overflow-hidden border border-zinc-700 cursor-pointer group relative"
                onClick={() => setMapModalOpen(true)}
                title="Click to view larger map"
              >
                <img
                  src={quote.mapSnapshotUrl!}
                  alt="Site location satellite view"
                  className="w-full object-cover transition-opacity group-hover:opacity-80"
                  style={{ maxHeight: 220 }}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> View larger map
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Job details ── */}
          {rows.length > 0 && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Job Details</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {rows.map((r) => (
                  <div key={r.label}>
                    <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    <p className="text-sm text-foreground">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Field notes ── */}
          {quote.message && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Field Notes</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{quote.message}</p>
            </div>
          )}

          {/* ── AI draft response ── */}
          {quote.aiDraftResponse && !showOutreach && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Draft Response</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{quote.aiDraftResponse}</p>
            </div>
          )}

          {/* ── Photos ── */}
          {quote.photoUrls.length > 0 && (
            <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Site Photos ({quote.photoUrls.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {quote.photoUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-zinc-700 hover:border-primary transition-colors"
                  >
                    <img src={url} alt={`Site photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Submitted ── */}
          <p className="text-xs text-muted-foreground text-right">
            Submitted {new Date(quote.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>

          {/* ── Delete ── */}
          <div className="pt-2 border-t border-zinc-800">
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="w-full"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Trash2 className="w-3.5 h-3.5 mr-2" />}
              Delete Field Quote
            </Button>
          </div>
        </div>

        {/* ── Map Modal ── */}
        {mapModalOpen && quote.mapSnapshotUrl && (
          <div
            className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4"
            onClick={() => setMapModalOpen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              onClick={() => setMapModalOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm">
                  {quote.address ?? "Site Location"}
                </p>
                {quote.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(quote.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="rounded-xl overflow-hidden border border-zinc-700">
                <img
                  src={quote.mapSnapshotUrl.replace(/size=\d+x\d+/, "size=800x500")}
                  alt="Site location satellite view"
                  className="w-full object-cover"
                  style={{ maxHeight: 500 }}
                />
              </div>
              <p className="text-zinc-500 text-xs mt-2 text-center">Click anywhere outside to close</p>
            </div>
          </div>
        )}

        {/* ── Lightbox ── */}
        {photoIdx !== null && (
          <div
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPhotoIdx(null)}
          >
            <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setPhotoIdx(null)}>
              <X className="w-6 h-6" />
            </button>
            <img
              src={quote.photoUrls[photoIdx]}
              alt={`Photo ${photoIdx + 1}`}
              className="max-w-full max-h-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {quote.photoUrls.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {quote.photoUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                    className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function FieldQuotesSection({
  soundAlertsEnabled,
  onNewRequests,
}: {
  soundAlertsEnabled: boolean;
  onNewRequests: (count: number, label: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "strong" | "marginal" | "weak">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.fieldQuote.list.useQuery(
    { limit: 100 },
    {
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 30_000, // auto-refresh every 30 s so field app submissions appear without a manual reload
    }
  );
  const quotes = data ?? [];
  useIncomingRequestAlert({
    items: quotes as FieldQuote[],
    isReady: data !== undefined,
    enabled: soundAlertsEnabled,
    label: "field request",
    onNewRequests,
  });

  const deleteMutation = trpc.fieldQuote.delete.useMutation({
    onSuccess: () => {
      toast.success("Field quote deleted.");
      setDeleteConfirmId(null);
      setSelectedId(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    let list = quotes as FieldQuote[];
    if (scoreFilter !== "all") list = list.filter((q) => q.aiScore === scoreFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q) ||
          r.serviceType?.toLowerCase().includes(q) ||
          r.phone?.includes(q) ||
          r.email?.toLowerCase().includes(q)
      );
    }
    // Sort
    list = [...list].sort((a, b) => {
      if (sortKey === "date_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === "date_asc")  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "acreage_desc") {
        const aA = parseFloat(a.acreage ?? "0");
        const bA = parseFloat(b.acreage ?? "0");
        return bA - aA;
      }
      if (sortKey === "score") {
        return (SCORE_ORDER[a.aiScore ?? "weak"] ?? 2) - (SCORE_ORDER[b.aiScore ?? "weak"] ?? 2);
      }
      return 0;
    });
    return list;
  }, [quotes, search, scoreFilter, sortKey]);

  const selectedQuote = selectedId != null ? (quotes as FieldQuote[]).find((q) => q.id === selectedId) ?? null : null;

  const counts = {
    all:      (quotes as FieldQuote[]).length,
    strong:   (quotes as FieldQuote[]).filter((q) => q.aiScore === "strong").length,
    marginal: (quotes as FieldQuote[]).filter((q) => q.aiScore === "marginal").length,
    weak:     (quotes as FieldQuote[]).filter((q) => q.aiScore === "weak").length,
  };

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            Field Quotes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted from the Noland Field companion app
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: counts.all,      color: "text-foreground" },
          { label: "Strong",   value: counts.strong,   color: "text-emerald-400" },
          { label: "Marginal", value: counts.marginal, color: "text-yellow-400" },
          { label: "Weak",     value: counts.weak,     color: "text-zinc-400" },
        ].map((c) => (
          <div key={c.label} className="ops-card p-4 text-center">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{c.label}</div>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters + Sort ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, address, service..."
            className="pl-9 bg-zinc-900 border-zinc-700 text-sm h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Score filter pills */}
          {(["all", "strong", "marginal", "weak"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScoreFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                scoreFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="ml-1 text-[10px] opacity-70">{counts[s]}</span>
            </button>
          ))}
          {/* Sort select */}
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-40 bg-zinc-900 border-zinc-700 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="date_desc" className="text-xs">Newest First</SelectItem>
              <SelectItem value="date_asc"  className="text-xs">Oldest First</SelectItem>
              <SelectItem value="acreage_desc" className="text-xs">Largest Acreage</SelectItem>
              <SelectItem value="score"     className="text-xs">AI Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            {counts.all === 0 ? "No field quotes yet. Submit one from the Noland Field app." : "No quotes match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((quote) => (
            <button
              key={quote.id}
              onClick={() => setSelectedId(quote.id)}
              className="w-full text-left ops-card p-4 hover:border-primary/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">{quote.name}</span>
                    <AiScoreBadge score={quote.aiScore} />
                    {quote.photoUrls.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Image className="w-3 h-3" />
                        {quote.photoUrls.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    {quote.serviceType && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {quote.serviceType}
                      </span>
                    )}
                    {quote.acreage && <span>{quote.acreage} acres</span>}
                    {quote.address && (
                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {quote.address}
                      </span>
                    )}
                    {quote.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {quote.phone}
                      </span>
                    )}
                  </div>
                  {quote.aiSummary && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{quote.aiSummary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(quote.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Detail dialog ── */}
      {selectedQuote && (
        <FieldQuoteDetailDialog
          quote={selectedQuote}
          onClose={() => setSelectedId(null)}
          onDelete={() => setDeleteConfirmId(selectedQuote.id)}
          isDeleting={deleteMutation.isPending}
          onConverted={(id) => {
            // Optionally navigate to the new quote — handled inside dialog
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Delete Field Quote</h3>
            <p className="text-xs text-muted-foreground">
              This will permanently delete the field quote from the database. This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-muted-foreground bg-secondary/50 hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: deleteConfirmId })}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
