/**
 * Ads Page — Noland Earthworks
 * AI-generated ad copy for Facebook, Instagram, X, LinkedIn, and Google Ads with one-click posting.
 * Features: per-platform copy, photo upload, scheduling, live FB/IG preview, and direct posting.
 */
import { useState, useRef, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Send, Facebook, Instagram, Trash2, ExternalLink,
  ImageIcon, RefreshCw, CheckCircle2, Upload, Clock, Calendar,
  ChevronDown, Eye, Twitter, X as XIcon, CalendarClock,
  DollarSign, Plus, ChevronRight, Linkedin, Globe, TrendingUp,
  XCircle, CheckCheck, Copy, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

type Platform = "facebook" | "instagram" | "x" | "linkedin" | "google" | "both" | "all";
type Tone = "casual" | "professional";
type PreviewPlatform = "facebook" | "instagram";
type AdType = "before_after" | "problem_solution" | "education" | "seasonal_urgency" | "veteran_trust" | "reclaim_your_land" | "specific_use_case" | "general";

const AD_TYPE_OPTIONS: { value: AdType; label: string; description: string }[] = [
  { value: "general",          label: "AI picks",         description: "Let the AI choose the best angle" },
  { value: "before_after",     label: "Before / After",   description: "Highest-performing format — show the transformation" },
  { value: "problem_solution", label: "Problem / Solution", description: "Hook with the landowner's problem, present mulching as the fix" },
  { value: "education",        label: "Education",        description: "Explain forestry mulching vs. bush hogging or bulldozing" },
  { value: "seasonal_urgency", label: "Seasonal Urgency",  description: "Fall/winter is the best time — book before the calendar fills" },
  { value: "veteran_trust",    label: "Veteran-Owned",    description: "Lead with reliability, integrity, and showing up when committed" },
  { value: "reclaim_your_land",label: "Reclaim Your Land", description: "Emotional: you bought this land for a reason" },
  { value: "specific_use_case",label: "Specific Use Case", description: "Pasture reclamation, fence line, lot clearing, right-of-way" },
];

interface GeneratedAd {
  draft: string;
  headline: string;
  imagePrompt: string;
  imageUrl: string | null;
}

interface GeneratedVariant {
  angle: string;
  headline: string;
  draft: string;
  imagePrompt: string;
}

interface GeneratedAllAd {
  facebook: { draft: string; headline: string };
  instagram: { draft: string; headline: string };
  x: { draft: string; headline: string };
  linkedin: { draft: string; headline: string };
  google: { draft: string; headline: string; description: string };
  imagePrompt: string;
  imageUrl: string | null;
}

// ─── Copy helper ────────────────────────────────────────────────────────────
const DEFAULT_COPY_SETTINGS = {
  siteUrl: "nolandearthworks.com",
  fbHashtags: "#NolandEarthworks #LandClearing #ForestryMulching #Tennessee",
  igHashtags: "#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #LandManagement #VeteranOwned #MiddleTennessee",
  xHashtags: "#LandClearing #ForestryMulching #Tennessee",
  liHashtags: "#NolandEarthworks #LandClearing #ForestryMulching #Tennessee #VeteranOwned",
};

type CopySettingsData = typeof DEFAULT_COPY_SETTINGS;

/**
 * Builds the final clipboard text for a given platform.
 * Appends hashtags (if not already present in the draft) and the site URL.
 * Google Ads copy is passed through unchanged — no hashtags or URL appended.
 */
function buildCopyText(
  draft: string,
  platform: "facebook" | "instagram" | "x" | "linkedin" | "google",
  settings: CopySettingsData = DEFAULT_COPY_SETTINGS,
): string {
  if (platform === "google") return draft;
  const tagMap: Record<"facebook" | "instagram" | "x" | "linkedin", string> = {
    facebook: settings.fbHashtags,
    instagram: settings.igHashtags,
    x: settings.xHashtags,
    linkedin: settings.liHashtags,
  };
  const tags = tagMap[platform];
  const siteUrl = settings.siteUrl;
  // Detect if draft already has hashtags or the URL
  const firstHashtag = tags.trim().split(" ")[0];
  const hasHashtags = firstHashtag ? draft.includes(firstHashtag) : false;
  const tagLine = (tags && !hasHashtags) ? `\n\n${tags}` : "";
  const urlLine = (siteUrl && !draft.includes(siteUrl)) ? `\n${siteUrl}` : "";
  return `${draft}${tagLine}${urlLine}`.trim();
}

// ─── Copy Settings Modal ──────────────────────────────────────────────────────
function CopySettingsModal({
  open, onClose, initial, onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: CopySettingsData;
  onSave: (data: CopySettingsData) => void;
}) {
  const [form, setForm] = useState<CopySettingsData>(initial);
  // Sync when initial changes (e.g. after DB load)
  useEffect(() => { setForm(initial); }, [initial]);

  const saveMutation = trpc.ops.saveCopySettings.useMutation({
    onSuccess: () => {
      toast.success("Copy settings saved.");
      onSave(form);
      onClose();
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  const field = (label: string, key: keyof CopySettingsData, placeholder: string, hint?: string) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Input
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="font-mono text-xs"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            Copy Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {field("Default Website URL", "siteUrl", "nolandearthworks.com",
            "Appended to every copied post (leave blank to disable)")}
          <div className="border-t border-border pt-4 space-y-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Hashtags by platform</p>
            {field("Facebook", "fbHashtags", "#LandClearing #Tennessee")}
            {field("Instagram", "igHashtags", "#LandClearing #Tennessee #VeteranOwned")}
            {field("X (Twitter)", "xHashtags", "#LandClearing #Tennessee")}
            {field("LinkedIn", "liHashtags", "#LandClearing #Tennessee #VeteranOwned")}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Live social preview ──────────────────────────────────────────────────────
function SocialPreview({
  platform,
  headline,
  draft,
  imageUrl,
}: {
  platform: PreviewPlatform;
  headline: string;
  draft: string;
  imageUrl: string | null;
}) {
  const [tab, setTab] = useState<PreviewPlatform>(platform === "instagram" ? "instagram" : "facebook");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
        {(["facebook", "instagram"] as PreviewPlatform[]).map((p) => (
          <button
            key={p}
            onClick={() => setTab(p)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
              tab === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p === "facebook" ? <Facebook size={11} /> : <Instagram size={11} />}
            {p === "facebook" ? "Facebook" : "Instagram"}
          </button>
        ))}
      </div>
      {tab === "facebook" ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-sm">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">NE</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-gray-900 leading-tight">Noland Earthworks</p>
              <p className="text-[11px] text-gray-500">Sponsored</p>
            </div>
          </div>
          {imageUrl && <img src={imageUrl} alt="" className="w-full aspect-video object-cover" />}
          <div className="px-4 py-3">
            {headline && <p className="text-[13px] font-semibold text-gray-900 mb-1">{headline}</p>}
            <p className="text-[12px] text-gray-700 line-clamp-4 whitespace-pre-line">{draft}</p>
          </div>
          <div className="border-t border-gray-100 px-4 py-2 flex gap-4">
            {["Like", "Comment", "Share"].map(a => (
              <span key={a} className="text-[11px] text-gray-500 font-medium">{a}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-xs">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold">NE</span>
            </div>
            <p className="text-[12px] font-semibold text-gray-900">nolandearthworks</p>
          </div>
          {imageUrl
            ? <img src={imageUrl} alt="" className="w-full aspect-square object-cover" />
            : <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                <ImageIcon size={32} className="text-gray-300" />
              </div>
          }
          <div className="px-3 py-2.5">
            <p className="text-[12px] text-gray-700 line-clamp-3 whitespace-pre-line">
              <span className="font-semibold">nolandearthworks </span>{draft}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Platform status card ─────────────────────────────────────────────────────
function PlatformStatusCard({
  icon,
  label,
  loading,
  ok,
  handle,
  error,
  accentClass,
  spendCents,
  onSettings,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  ok: boolean | undefined;
  handle?: string;
  error?: string;
  accentClass: string;
  spendCents?: number;
  onSettings?: () => void;
}) {
  const spendLabel = spendCents && spendCents > 0
    ? "$" + (spendCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  const SettingsGear = onSettings ? (
    <button
      onClick={onSettings}
      className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
      title="LinkedIn settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  ) : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2.5 animate-pulse">
        <div className="w-3.5 h-3.5 rounded-full bg-muted shrink-0" />
        <div className="space-y-1 flex-1 min-w-0">
          <div className="h-2.5 w-16 bg-muted rounded" />
          <div className="h-2 w-20 bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (ok) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5", accentClass)}>
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold">{label}</span>
            <CheckCircle2 size={10} className="shrink-0" />
          </div>
          {handle && <p className="text-[10px] opacity-75 truncate">{handle}</p>}
          {spendLabel && <p className="text-[10px] font-medium opacity-90 mt-0.5">{spendLabel} spent</p>}
        </div>
        {SettingsGear}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-400/5 px-3 py-2.5 text-red-400">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[9px] font-medium bg-red-400/15 px-1 py-0.5 rounded uppercase tracking-wide">Error</span>
        </div>
        {error && <p className="text-[10px] opacity-75 truncate" title={error}>{error}</p>}
        {spendLabel && <p className="text-[10px] font-medium opacity-70 mt-0.5">{spendLabel} spent</p>}
      </div>
      {SettingsGear}
    </div>
  );
}

// ─── Spend-only platform card (no live connection check) ───────────────────────
function SpendOnlyCard({
  icon,
  label,
  accentClass,
  spendCents,
  handle,
  onLogSpend,
}: {
  icon: React.ReactNode;
  label: string;
  accentClass: string;
  spendCents?: number;
  handle?: string;
  onLogSpend?: () => void;
}) {
  const spendLabel = spendCents && spendCents > 0
    ? "$" + (spendCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5", accentClass)}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-semibold">{label}</span>
        {handle && !spendLabel && (
          <p className="text-[10px] opacity-60 truncate mt-0.5">{handle}</p>
        )}
        {spendLabel
          ? <p className="text-[10px] font-medium opacity-90 mt-0.5">{spendLabel} spent</p>
          : <p className="text-[10px] opacity-50 mt-0.5">No spend logged</p>
        }
      </div>
      {onLogSpend && (
        <button
          onClick={onLogSpend}
          className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
          title={`Log ${label} spend`}
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Per-platform copy panel ──────────────────────────────────────────────────
type PanelPostStatus = { status: "idle" | "posting" | "success" | "error"; message?: string };

function PlatformCopyPanel({
  icon,
  label,
  accentClass,
  draft,
  headline,
  onDraftChange,
  onHeadlineChange,
  charLimit,
  tone,
  postStatus,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  accentClass: string;
  draft: string;
  headline: string;
  onDraftChange: (v: string) => void;
  onHeadlineChange: (v: string) => void;
  charLimit?: number;
  tone?: string;
  postStatus?: PanelPostStatus;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", accentClass)}>
      <div className="flex items-center gap-2 flex-wrap">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
        {tone && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
            {tone}
          </span>
        )}
        {/* Post status indicator */}
        {postStatus && postStatus.status !== "idle" && (
          <span className={cn(
            "ml-auto flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            postStatus.status === "posting" && "bg-yellow-500/15 text-yellow-400",
            postStatus.status === "success" && "bg-green-500/15 text-green-400",
            postStatus.status === "error" && "bg-red-500/15 text-red-400",
          )}>
            {postStatus.status === "posting" && (
              <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Posting...</>
            )}
            {postStatus.status === "success" && (
              <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Posted</>
            )}
            {postStatus.status === "error" && (
              <><svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>{postStatus.message ?? "Error"}</>
            )}
          </span>
        )}
        {(!postStatus || postStatus.status === "idle") && charLimit && (
          <span className={cn("ml-auto text-xs font-mono", draft.length > charLimit ? "text-red-400" : "text-muted-foreground")}>
            {draft.length}/{charLimit}
          </span>
        )}
        {postStatus && postStatus.status !== "idle" && charLimit && (
          <span className={cn("text-xs font-mono", draft.length > charLimit ? "text-red-400" : "text-muted-foreground")}>
            {draft.length}/{charLimit}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <input
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="Headline"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          rows={5}
          className="resize-none bg-background border-border text-foreground"
          placeholder="Ad copy..."
        />
        {charLimit && draft.length > charLimit && (
          <p className="text-xs text-red-400">Over {charLimit}-character limit by {draft.length - charLimit} characters. Trim before posting.</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Ads() {
  // Generator state
  const [jobDescription, setJobDescription] = useState("");
  const [adTypes, setAdTypes] = useState<AdType[]>(["general"]);
  function toggleAdType(val: AdType) {
    setAdTypes(prev => {
      if (prev.includes(val)) {
        // Always keep at least one selected
        if (prev.length === 1) return prev;
        return prev.filter(v => v !== val);
      }
      if (prev.length >= 3) {
        toast.error("You can select up to 3 ad types.");
        return prev;
      }
      // If switching away from "general", remove it; if selecting "general", clear others
      if (val === "general") return ["general"];
      return prev.filter(v => v !== "general").concat(val);
    });
  }
  const [platform, setPlatform] = useState<Platform>("all");
  const [tone, setTone] = useState<Tone>("casual");
  const [withImage, setWithImage] = useState(true);

  // A/B variant mode
  const [abMode, setAbMode] = useState(false);
  const [abVariants, setAbVariants] = useState<GeneratedVariant[]>([]);
  const [abPreviewIdx, setAbPreviewIdx] = useState<number | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);

  // Single-platform generated ad
  const [generated, setGenerated] = useState<GeneratedAd | null>(null);
  const [savedPostId, setSavedPostId] = useState<number | null>(null);
  const [editedDraft, setEditedDraft] = useState("");
  const [editedHeadline, setEditedHeadline] = useState("");

  // All-platforms generated ad (separate drafts per platform)
  const [generatedAll, setGeneratedAll] = useState<GeneratedAllAd | null>(null);
  const [editedFbDraft, setEditedFbDraft] = useState("");
  const [editedFbHeadline, setEditedFbHeadline] = useState("");
  const [editedIgDraft, setEditedIgDraft] = useState("");
  const [editedIgHeadline, setEditedIgHeadline] = useState("");
  const [editedXDraft, setEditedXDraft] = useState("");
  const [editedXHeadline, setEditedXHeadline] = useState("");

  // Per-platform post status (All Four mode)
  const [fbPostStatus, setFbPostStatus] = useState<PanelPostStatus>({ status: "idle" });
  const [igPostStatus, setIgPostStatus] = useState<PanelPostStatus>({ status: "idle" });
  const [xPostStatus, setXPostStatus] = useState<PanelPostStatus>({ status: "idle" });
  const [liPostStatus, setLiPostStatus] = useState<PanelPostStatus>({ status: "idle" });

  // LinkedIn per-platform draft state
  const [editedLiDraft, setEditedLiDraft] = useState("");
  const [editedLiHeadline, setEditedLiHeadline] = useState("");
  // Google per-platform draft state
  const [editedGoogleDraft, setEditedGoogleDraft] = useState("");
  const [editedGoogleHeadline, setEditedGoogleHeadline] = useState("");
  const [editedGoogleDescription, setEditedGoogleDescription] = useState("");
  const [googlePostStatus, setGooglePostStatus] = useState<PanelPostStatus>({ status: "idle" });
  // Photo upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Photos auto-attached from a job via Send to Ads
  const [prefillPhotoUrls, setPrefillPhotoUrls] = useState<string[]>([]);

  // Scheduling state
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");

  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  const utils = trpc.useUtils();

  // Prefill from Jobs page "Send to Ads" action
  useEffect(() => {
    const raw = sessionStorage.getItem("ads_prefill");
    if (!raw) return;
    sessionStorage.removeItem("ads_prefill");
    try {
      const prefill = JSON.parse(raw) as { platform?: string; draft?: string; jobTitle?: string; jobClient?: string; photoUrls?: string[] };
      if (prefill.platform && ["facebook", "instagram", "x", "both", "google", "linkedin"].includes(prefill.platform)) {
        setPlatform(prefill.platform as Platform);
      }
      if (prefill.draft) {
        setGenerated({ draft: prefill.draft, headline: prefill.jobTitle ? `${prefill.jobTitle} — Noland Earthworks` : "Noland Earthworks", imagePrompt: "", imageUrl: null });
        setEditedDraft(prefill.draft);
        setEditedHeadline(prefill.jobTitle ? `${prefill.jobTitle} — Noland Earthworks` : "Noland Earthworks");
        if (prefill.jobTitle) setJobDescription(`Job: ${prefill.jobTitle}${prefill.jobClient ? ` | Client: ${prefill.jobClient}` : ""}`);
      }
      // Auto-attach job gallery photos
      if (prefill.photoUrls && prefill.photoUrls.length > 0) {
        setPrefillPhotoUrls(prefill.photoUrls);
        // Auto-select the first photo as the active image
        setUploadedImageUrl(prefill.photoUrls[0]);
        setUploadedImageKey(null); // no S3 key for pre-existing gallery photos
        toast.success(`Draft loaded with ${prefill.photoUrls.length} job photo${prefill.photoUrls.length !== 1 ? "s" : ""} attached.`);
      } else {
        toast.success("Draft loaded from job. Edit and post when ready.");
      }
    } catch { /* ignore malformed */ }
  }, []);

  // Active image: uploaded photo takes priority over AI-generated
  const activeImageUrl = uploadedImageUrl ?? (platform === "all" ? generatedAll?.imageUrl : generated?.imageUrl) ?? null;

  // Copy settings (persisted per-platform hashtags + site URL)
  const { data: copySettingsData } = trpc.ops.getCopySettings.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });
  const [copySettings, setCopySettings] = useState<CopySettingsData>(DEFAULT_COPY_SETTINGS);
  useEffect(() => {
    if (copySettingsData) {
      setCopySettings({
        siteUrl: copySettingsData.siteUrl,
        fbHashtags: copySettingsData.fbHashtags,
        igHashtags: copySettingsData.igHashtags,
        xHashtags: copySettingsData.xHashtags,
        liHashtags: copySettingsData.liHashtags,
      });
    }
  }, [copySettingsData]);
  const [copySettingsOpen, setCopySettingsOpen] = useState(false);

  // Live platform connection status
  const { data: platformStatus, isLoading: statusLoading, refetch: refetchStatus } =
    trpc.ops.platformConnectionStatus.useQuery(undefined, {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const generateMutation = trpc.ops.socialPosts.generate.useMutation({
    onSuccess: (data) => {
      setGenerated(data);
      setEditedDraft(data.draft);
      setEditedHeadline(data.headline ?? "");
      setSavedPostId(null);
      setUploadedImageUrl(null);
      setUploadedImageKey(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const regeneratePlatformMutation = trpc.ops.socialPosts.regeneratePlatform.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const generateAllMutation = trpc.ops.socialPosts.generateForAll.useMutation({
    onSuccess: (data) => {
      setGeneratedAll(data);
      setEditedFbDraft(data.facebook.draft);
      setEditedFbHeadline(data.facebook.headline);
      setEditedIgDraft(data.instagram.draft);
      setEditedIgHeadline(data.instagram.headline);
      setEditedXDraft(data.x.draft);
      setEditedXHeadline(data.x.headline);
      setEditedLiDraft(data.linkedin?.draft ?? "");
      setEditedLiHeadline(data.linkedin?.headline ?? "");
      setEditedGoogleDraft(data.google?.draft ?? "");
      setEditedGoogleHeadline(data.google?.headline ?? "");
      setEditedGoogleDescription(data.google?.description ?? "");
      setSavedPostId(null);
      setUploadedImageUrl(null);
      setUploadedImageKey(null);
      // Reset post statuses for fresh generation
      setFbPostStatus({ status: "idle" });
      setIgPostStatus({ status: "idle" });
      setXPostStatus({ status: "idle" });
      setLiPostStatus({ status: "idle" });
      setGooglePostStatus({ status: "idle" });
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadPhotoMutation = trpc.ops.socialPosts.uploadPhoto.useMutation({
    onSuccess: (data) => {
      setUploadedImageUrl(data.url);
      setUploadedImageKey(data.key);
      toast.success("Photo uploaded.");
    },
    onError: (err) => toast.error(`Upload failed: ${err.message}`),
  });

  const saveMutation = trpc.ops.socialPosts.savePost.useMutation({
    onSuccess: (data) => {
      setSavedPostId(data.id);
      utils.ops.socialPosts.list.invalidate();
      toast.success("Ad saved to history.");
    },
    onError: (err) => toast.error(err.message),
  });

  const schedulePostMutation = trpc.ops.socialPosts.schedulePost.useMutation({
    onSuccess: () => {
      utils.ops.socialPosts.list.invalidate();
      toast.success("Ad scheduled.");
      setShowScheduler(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const fbMutation = trpc.ops.socialPosts.publishToFacebook.useMutation({
    onMutate: () => setFbPostStatus({ status: "posting" }),
    onSuccess: (data) => {
      utils.ops.socialPosts.list.invalidate();
      setFbPostStatus({ status: "success" });
      toast.success("Posted to Facebook.");
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (err) => {
      setFbPostStatus({ status: "error", message: err.message });
      toast.error(`Facebook: ${err.message}`);
    },
  });
  const igMutation = trpc.ops.socialPosts.publishToInstagram.useMutation({
    onMutate: () => setIgPostStatus({ status: "posting" }),
    onSuccess: () => {
      utils.ops.socialPosts.list.invalidate();
      setIgPostStatus({ status: "success" });
      toast.success("Posted to Instagram.");
    },
    onError: (err) => {
      setIgPostStatus({ status: "error", message: err.message });
      toast.error(`Instagram: ${err.message}`);
    },
  });
  const xMutation = trpc.ops.socialPosts.publishToX.useMutation({
    onMutate: () => setXPostStatus({ status: "posting" }),
    onSuccess: (data) => {
      utils.ops.socialPosts.list.invalidate();
      setXPostStatus({ status: "success" });
      toast.success("Posted to X.");
      if (data.xPostId) window.open(`https://x.com/i/web/status/${data.xPostId}`, "_blank");
    },
    onError: (err) => {
      setXPostStatus({ status: "error", message: err.message });
      toast.error(`X: ${err.message}`);
    },
  });

  const liMutation = trpc.ops.socialPosts.publishToLinkedIn.useMutation({
    onMutate: () => setLiPostStatus({ status: "posting" }),
    onSuccess: () => {
      utils.ops.socialPosts.list.invalidate();
      setLiPostStatus({ status: "success" });
      toast.success("Posted to LinkedIn.");
    },
    onError: (err) => {
      setLiPostStatus({ status: "error", message: err.message });
      toast.error(`LinkedIn: ${err.message}`);
    },
  });

  const allMutation = trpc.ops.socialPosts.publishToAll.useMutation({
    onSuccess: (data) => {
      utils.ops.socialPosts.list.invalidate();
      const ok = [data.facebook?.success && "Facebook", data.instagram?.success && "Instagram", data.x?.success && "X"].filter(Boolean);
      const fail = [!data.facebook?.success && "Facebook", !data.instagram?.success && "Instagram", !data.x?.success && "X"].filter(Boolean);
      if (ok.length) toast.success(`Posted to ${ok.join(", ")}.`);
      if (fail.length) toast.error(`Failed on ${fail.join(", ")} — check each platform's connection.`);
    },
    onError: (err) => toast.error(`Post to all failed: ${err.message}`),
  });

  const deleteMutation = trpc.ops.socialPosts.delete.useMutation({
    onSuccess: () => {
      utils.ops.socialPosts.list.invalidate();
      toast.success("Deleted.");
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelScheduleMutation = trpc.ops.socialPosts.cancelSchedule.useMutation({
    onSuccess: () => {
      utils.ops.socialPosts.list.invalidate();
      toast.success("Schedule cancelled. Post moved back to draft.");
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: history = [] } = trpc.ops.socialPosts.list.useQuery();
  const scheduledPosts = history.filter((p) => p.status === "scheduled");

  // ─── LinkedIn Settings Modal state ──────────────────────────────────────────
  const [showLinkedInSettings, setShowLinkedInSettings] = useState(false);
  const [liTokenInput, setLiTokenInput] = useState("");
  const [liUrnInput, setLiUrnInput] = useState("");
  const [liDisplayNameInput, setLiDisplayNameInput] = useState("");

  const { data: liSettings, refetch: refetchLiSettings } = trpc.ops.getLinkedInSettings.useQuery(undefined, {
    staleTime: 60 * 1000,
    retry: 1,
  });

  const saveLiSettingsMutation = trpc.ops.saveLinkedInSettings.useMutation({
    onSuccess: () => {
      toast.success("LinkedIn credentials saved.");
      refetchLiSettings();
      refetchStatus();
      setShowLinkedInSettings(false);
      setLiTokenInput("");
      setLiUrnInput("");
      setLiDisplayNameInput("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteLiSettingsMutation = trpc.ops.deleteLinkedInSettings.useMutation({
    onSuccess: () => {
      toast.success("LinkedIn credentials removed.");
      refetchLiSettings();
      refetchStatus();
      setShowLinkedInSettings(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // ─── Ad Spend Tracker state ──────────────────────────────────────────────────
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [spendPlatform, setSpendPlatform] = useState<"facebook" | "instagram" | "x" | "linkedin" | "google" | "other">("facebook");
  const [spendComponent, setSpendComponent] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendNotes, setSpendNotes] = useState("");
  const [spendDate, setSpendDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expandedSpendPlatform, setExpandedSpendPlatform] = useState<string | null>(null);

  const { data: spendEntries = [], refetch: refetchSpend } = trpc.ops.adSpend.list.useQuery();

  const addSpendMutation = trpc.ops.adSpend.add.useMutation({
    onSuccess: () => {
      utils.ops.adSpend.list.invalidate();
      toast.success("Spend logged.");
      setShowSpendModal(false);
      setSpendComponent("");
      setSpendAmount("");
      setSpendNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSpendMutation = trpc.ops.adSpend.delete.useMutation({
    onSuccess: () => {
      utils.ops.adSpend.list.invalidate();
      toast.success("Entry removed.");
    },
    onError: (err) => toast.error(err.message),
  });

  // Aggregate spend by platform
  const PLATFORMS_ORDER = ["facebook", "instagram", "x", "linkedin", "google", "other"] as const;
  const PLATFORM_LABELS: Record<string, string> = {
    facebook: "Facebook", instagram: "Instagram", x: "X", linkedin: "LinkedIn", google: "Google", other: "Other",
  };
  const PLATFORM_COLORS: Record<string, string> = {
    facebook: "text-blue-400", instagram: "text-pink-400", x: "text-sky-400",
    linkedin: "text-[#0A66C2]", google: "text-yellow-400", other: "text-muted-foreground",
  };
  const PLATFORM_BG: Record<string, string> = {
    facebook: "bg-blue-400/8 border-blue-400/20", instagram: "bg-pink-400/8 border-pink-400/20",
    x: "bg-sky-400/8 border-sky-400/20", linkedin: "bg-[#0A66C2]/8 border-[#0A66C2]/20",
    google: "bg-yellow-400/8 border-yellow-400/20",
    other: "bg-secondary border-border",
  };

  const spendByPlatform = PLATFORMS_ORDER.reduce((acc, p) => {
    const entries = spendEntries.filter((e) => e.platform === p);
    const totalCents = entries.reduce((s, e) => s + e.amountCents, 0);
    const byComponent: Record<string, number> = {};
    entries.forEach((e) => {
      byComponent[e.component] = (byComponent[e.component] ?? 0) + e.amountCents;
    });
    acc[p] = { totalCents, byComponent, entries };
    return acc;
  }, {} as Record<string, { totalCents: number; byComponent: Record<string, number>; entries: typeof spendEntries }>);

  const grandTotalCents = spendEntries.reduce((s, e) => s + e.amountCents, 0);

  function fmtDollars(cents: number) {
    return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function handleLogSpend() {
    const cents = Math.round(parseFloat(spendAmount) * 100);
    if (!spendComponent.trim()) { toast.error("Enter a cost component."); return; }
    if (isNaN(cents) || cents < 1) { toast.error("Enter a valid amount."); return; }
    addSpendMutation.mutate({
      platform: spendPlatform,
      component: spendComponent.trim(),
      amountCents: cents,
      notes: spendNotes.trim() || undefined,
      spentAt: new Date(spendDate + "T12:00:00"),
    });
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const ALL_FIVE_STEPS = [
    {
      label: "Facebook",
      icon: "FB",
      statusMsg: "Writing post copy...",
      doneMsg: "Post copy ready",
      estSec: 3,
    },
    {
      label: "Instagram",
      icon: "IG",
      statusMsg: "Crafting caption...",
      doneMsg: "Caption ready",
      estSec: 3,
    },
    {
      label: "X",
      icon: "X",
      statusMsg: "Trimming to 280 chars...",
      doneMsg: "Tweet ready",
      estSec: 2,
    },
    {
      label: "LinkedIn",
      icon: "LI",
      statusMsg: "Writing professional copy...",
      doneMsg: "Post ready",
      estSec: 3,
    },
    {
      label: "Google Ads",
      icon: "G",
      statusMsg: "Writing headline + description...",
      doneMsg: "Ad copy ready",
      estSec: 3,
    },
    {
      label: "Image",
      icon: "IMG",
      statusMsg: "Generating image prompt...",
      doneMsg: "Prompt ready",
      estSec: 4,
    },
  ];

  // Elapsed seconds counter and step interval refs for the loading state
  const elapsedSecRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Post-generation summary flash state
  const [showSummary, setShowSummary] = useState(false);
  const summaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleCancel() {
    // Stop the step ticker and elapsed timer
    if (stepIntervalRef.current) { clearInterval(stepIntervalRef.current); stepIntervalRef.current = null; }
    if (elapsedSecRef.current) { clearInterval(elapsedSecRef.current); elapsedSecRef.current = null; }
    // Reset all loading state — the mutation itself cannot be cancelled server-side,
    // but we return the UI to the idle/previous-result state immediately.
    setGenerateStep("");
    setGenerateStepIndex(0);
    setElapsedSeconds(0);
    toast.info("Generation cancelled. Any result that arrives will be discarded.");
  }

  function handleGenerate() {
    if (platform === "all") {
      setGenerateStepIndex(0);
      setGenerateStep(ALL_FIVE_STEPS[0].label);
      setElapsedSeconds(0);
      setShowSummary(false);

      // Elapsed-time ticker
      if (elapsedSecRef.current) clearInterval(elapsedSecRef.current);
      elapsedSecRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

      // Step progress ticker — stored in ref so Cancel can clear it
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      let i = 0;
      stepIntervalRef.current = setInterval(() => {
        i++;
        if (i < ALL_FIVE_STEPS.length) {
          setGenerateStepIndex(i);
          setGenerateStep(ALL_FIVE_STEPS[i].label);
        } else {
          if (stepIntervalRef.current) { clearInterval(stepIntervalRef.current); stepIntervalRef.current = null; }
        }
      }, 2000);
      generateAllMutation.mutate({
        jobDescription: jobDescription.trim() || undefined,
        adTypes,
        tone,
        generateImage: withImage,
      }, {
        onSuccess: () => {
          // Brief summary flash before scrolling into results
          setShowSummary(true);
          if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current);
          summaryTimerRef.current = setTimeout(() => setShowSummary(false), 5000);
        },
        onSettled: () => {
          setGenerateStep("");
          setGenerateStepIndex(0);
          setElapsedSeconds(0);
          if (elapsedSecRef.current) { clearInterval(elapsedSecRef.current); elapsedSecRef.current = null; }
          if (stepIntervalRef.current) { clearInterval(stepIntervalRef.current); stepIntervalRef.current = null; }
        },
      });
    } else {
      setGenerateStep("");
      setGenerateStepIndex(0);
      generateMutation.mutate({
        jobDescription: jobDescription.trim() || undefined,
        adTypes,
        platform: platform as "facebook" | "instagram" | "both" | "x" | "google" | "linkedin",
        tone,
        generateImage: withImage,
      });
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large. Max 10 MB."); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadPhotoMutation.mutateAsync({ base64, mimeType: file.type, filename: file.name });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
    }
  }

  async function ensureSaved(draftOverride?: string, headlineOverride?: string): Promise<number | null> {
    if (savedPostId) return savedPostId;
    const draft = draftOverride ?? editedDraft;
    const headline = headlineOverride ?? editedHeadline;
    if (!draft && !generatedAll) return null;
    const isAllFive = platform === "all";
    const saved = await saveMutation.mutateAsync({
      jobDescription,
      draft: draft || editedFbDraft,
      headline: headline || editedFbHeadline,
      platform,
      imageUrl: activeImageUrl ?? undefined,
      imageKey: uploadedImageKey ?? undefined,
      status: "draft",
      // Persist per-platform drafts when in All Five mode
      ...(isAllFive ? {
        igDraft: editedIgDraft || undefined,
        xDraft: editedXDraft || undefined,
        liDraft: editedLiDraft || undefined,
        googleHeadline: editedGoogleHeadline || undefined,
        googleDescription: editedGoogleDescription || undefined,
        googleDraft: editedGoogleDraft || undefined,
      } : {}),
    });
    setSavedPostId(saved.id);
    return saved.id;
  }

  // Post a single platform
  async function handlePostSingle(target: "facebook" | "instagram" | "x") {
    const draft = target === "facebook" ? editedDraft
      : target === "instagram" ? editedDraft
      : editedDraft;
    const postId = await ensureSaved(draft);
    if (!postId) { toast.error("Could not save post. Try again."); return; }

    if (target === "facebook") {
      fbMutation.mutate({ postId, message: draft, imageUrl: activeImageUrl ?? undefined });
    } else if (target === "instagram") {
      if (!activeImageUrl) { toast.error("Instagram requires an image."); return; }
      igMutation.mutate({ postId, caption: draft, imageUrl: activeImageUrl });
    } else {
      xMutation.mutate({ postId, text: draft, imageUrl: activeImageUrl ?? undefined });
    }
  }

  // Post from the all-platforms mode — each platform uses its own draft
  async function handlePostAllPlatform(target: "facebook" | "instagram" | "x" | "linkedin" | "google" | "all") {
    // Save using FB draft as canonical
    const postId = await ensureSaved(editedFbDraft, editedFbHeadline);
    if (!postId) { toast.error("Could not save post. Try again."); return; }

    if (target === "all") {
      // Post each platform with its own copy
      fbMutation.mutate({ postId, message: editedFbDraft, imageUrl: activeImageUrl ?? undefined });
      if (activeImageUrl) {
        igMutation.mutate({ postId, caption: editedIgDraft, imageUrl: activeImageUrl });
      } else {
        toast.error("Instagram requires an image — skipped. Upload a photo to include Instagram.");
      }
      xMutation.mutate({ postId, text: editedXDraft, imageUrl: activeImageUrl ?? undefined });
      liMutation.mutate({ postId, text: editedLiDraft, imageUrl: activeImageUrl ?? undefined });
      // Auto-copy Google ad copy to clipboard
      const googleCopy = [editedGoogleHeadline, editedGoogleDescription, editedGoogleDraft].filter(Boolean).join("\n");
      if (googleCopy) {
        navigator.clipboard.writeText(googleCopy).then(() => {
          toast.success("Google Ads copy copied to clipboard — paste into your Google Ads account.");
        }).catch(() => {
          toast.info("Google Ads copy ready — copy it from the Google panel and paste into your Google Ads account.");
        });
      }
      return;
    }
    if (target === "facebook") {
      fbMutation.mutate({ postId, message: editedFbDraft, imageUrl: activeImageUrl ?? undefined });
    } else if (target === "instagram") {
      if (!activeImageUrl) { toast.error("Instagram requires an image."); return; }
      igMutation.mutate({ postId, caption: editedIgDraft, imageUrl: activeImageUrl });
    } else if (target === "linkedin") {
      liMutation.mutate({ postId, text: editedLiDraft, imageUrl: activeImageUrl ?? undefined });
    } else if (target === "google") {
      toast.info("Google Ads copy is ready. Copy the headline and description from the Google panel and paste into your Google Ads account.");
    } else {
      xMutation.mutate({ postId, text: editedXDraft, imageUrl: activeImageUrl ?? undefined });
    }
  }

  // Legacy single-platform post handler
  async function handlePost(target: "facebook" | "instagram" | "x" | "both" | "all") {
    const postId = await ensureSaved();
    if (!postId) { toast.error("Could not save post. Try again."); return; }
    if (target === "all") {
      allMutation.mutate({ postId, message: editedDraft, imageUrl: activeImageUrl ?? undefined });
      return;
    }
    if (target === "facebook" || target === "both") {
      fbMutation.mutate({ postId, message: editedDraft, imageUrl: activeImageUrl ?? undefined });
    }
    if (target === "instagram" || target === "both") {
      if (!activeImageUrl) { toast.error("Instagram requires an image."); return; }
      igMutation.mutate({ postId, caption: editedDraft, imageUrl: activeImageUrl });
    }
    if (target === "x") {
      xMutation.mutate({ postId, text: editedDraft, imageUrl: activeImageUrl ?? undefined });
    }
  }

  async function handleSchedule() {
    if (!scheduledDate) { toast.error("Pick a date first."); return; }
    const postId = await ensureSaved();
    if (!postId) { toast.error("Could not save post. Try again."); return; }
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    let platforms: ("facebook" | "instagram" | "x" | "linkedin" | "google")[];
    if (platform === "all") {
      platforms = ["facebook", "instagram", "x", "linkedin", "google"];
    } else if (platform === "both") {
      platforms = ["facebook", "instagram"];
    } else if (platform === "x") {
      platforms = ["x"];
    } else if (platform === "linkedin") {
      platforms = ["linkedin"];
    } else if (platform === "google") {
      platforms = ["google"];
    } else {
      platforms = [platform as "facebook" | "instagram"];
    }
    schedulePostMutation.mutate({ id: postId, scheduledAt, platforms });
  }

  const [generateStep, setGenerateStep] = useState("");
  const [generateStepIndex, setGenerateStepIndex] = useState(0);
  const variantsMutation = trpc.ops.adVariants.generate.useMutation({
    onSuccess: (data) => {
      setAbVariants(data.variants);
      setSelectedVariantIdx(null);
    },
    onError: (err) => toast.error(err.message || "Failed to generate variants."),
  });

  const isGenerating = generateMutation.isPending || generateAllMutation.isPending || variantsMutation.isPending;
  const isPosting = fbMutation.isPending || igMutation.isPending || xMutation.isPending || liMutation.isPending || allMutation.isPending || saveMutation.isPending;
  const hasAllGenerated = platform === "all" && generatedAll !== null;
  const hasSingleGenerated = platform !== "all" && generated !== null;

  function handleGenerateVariants() {
    setAbVariants([]);
    setSelectedVariantIdx(null);
    setGenerated(null);
    variantsMutation.mutate({
      jobDescription: jobDescription.trim() || undefined,
      platform: platform === "all" ? "both" : platform as "facebook" | "instagram" | "both" | "x" | "google" | "linkedin",
      tone,
      variantCount: 3,
    });
  }

  function selectVariant(idx: number) {
    const v = abVariants[idx];
    if (!v) return;
    setSelectedVariantIdx(idx);
    setGenerated({ draft: v.draft, headline: v.headline, imagePrompt: v.imagePrompt, imageUrl: null });
    setEditedDraft(v.draft);
    setEditedHeadline(v.headline);
    setSavedPostId(null);
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate AI ad copy and images, then post directly to Facebook, Instagram, X, LinkedIn, and Google Ads.
          </p>
        </div>

        {/* Platform connection status bar */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platform Connections</span>
            <button
              onClick={() => refetchStatus()}
              disabled={statusLoading}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={statusLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <PlatformStatusCard icon={<Facebook size={13} />} label="Facebook" loading={statusLoading}
              ok={platformStatus?.facebook.ok} handle={platformStatus?.facebook.handle ?? undefined}
              error={platformStatus?.facebook.error ?? undefined} accentClass="text-blue-400 bg-blue-400/8 border-blue-400/20"
              spendCents={spendByPlatform["facebook"]?.totalCents} />
            <PlatformStatusCard icon={<Instagram size={13} />} label="Instagram" loading={statusLoading}
              ok={platformStatus?.instagram.ok} handle={platformStatus?.instagram.handle ?? undefined}
              error={platformStatus?.instagram.error ?? undefined} accentClass="text-pink-400 bg-pink-400/8 border-pink-400/20"
              spendCents={spendByPlatform["instagram"]?.totalCents} />
            <PlatformStatusCard icon={<Twitter size={13} />} label="X" loading={statusLoading}
              ok={platformStatus?.x.ok} handle={platformStatus?.x.handle ?? undefined}
              error={platformStatus?.x.error ?? undefined} accentClass="text-sky-400 bg-sky-400/8 border-sky-400/20"
              spendCents={spendByPlatform["x"]?.totalCents} />
            <PlatformStatusCard icon={<Linkedin size={13} />} label="LinkedIn" loading={statusLoading}
              ok={platformStatus?.linkedin?.ok} handle={platformStatus?.linkedin?.handle ?? undefined}
              error={platformStatus?.linkedin?.error ?? undefined} accentClass="text-[#0A66C2] bg-[#0A66C2]/8 border-[#0A66C2]/20"
              spendCents={spendByPlatform["linkedin"]?.totalCents}
              onSettings={() => setShowLinkedInSettings(true)} />
            {/* Google Ads — manual spend tracking only; copy-paste workflow, no API posting */}
            <SpendOnlyCard
              icon={<Globe size={13} />}
              label="Google Ads"
              accentClass="text-yellow-400 bg-yellow-400/8 border-yellow-400/20"
              spendCents={spendByPlatform["google"]?.totalCents}
              handle="Copy-paste workflow"
              onLogSpend={() => {
                setSpendPlatform("google");
                setSpendComponent("");
                setSpendAmount("");
                setSpendNotes("");
                setSpendDate(new Date().toISOString().slice(0, 10));
                setShowSpendModal(true);
              }}
            />
            {/* Google Business Profile — separate OAuth connection for reviews/posts */}
            <PlatformStatusCard
              icon={<Globe size={13} className="text-green-400" />}
              label="Google Business"
              loading={statusLoading}
              ok={platformStatus?.google?.ok}
              handle={platformStatus?.google?.handle ?? undefined}
              error={platformStatus?.google?.error ?? undefined}
              accentClass="text-green-400 bg-green-400/8 border-green-400/20"
            />
          </div>
        </div>

        {/* Generator card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Generate Ad</h2>
            <button
              onClick={() => { setAbMode(!abMode); setAbVariants([]); setSelectedVariantIdx(null); }}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors",
                abMode
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              )}
              title="Generate 3 angle variations and pick the best one before posting"
            >
              <Sparkles size={11} />
              A/B Variants
            </button>
          </div>

          {/* Ad Type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ad type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AD_TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => toggleAdType(opt.value)} title={opt.description}
                  className={cn("px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors leading-tight relative",
                    adTypes.includes(opt.value)
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}>
                  {opt.label}
                  {adTypes.includes(opt.value) && adTypes.length > 1 && (
                    <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                      {adTypes.indexOf(opt.value) + 1}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              {adTypes.filter(t => t !== "general").map(t => (
                <p key={t} className="text-xs text-muted-foreground">{AD_TYPE_OPTIONS.find(o => o.value === t)?.description}</p>
              ))}
              {adTypes.length > 1 && (
                <p className="text-xs text-amber-400/80">Blending {adTypes.length} ad styles into one draft.</p>
              )}
            </div>
          </div>

          {/* Job description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Job description <span className="text-muted-foreground font-normal">(optional)</span></label>
            </div>
            <Textarea
              placeholder="Describe a specific job — what was cleared, where, what it looked like before and after. Leave blank and the AI will generate based on the ad type above."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={3}
              className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Platform */}
            <div className="space-y-1.5 w-full sm:w-auto">
              <label className="text-sm font-medium text-foreground">Platform</label>
              <div className="flex flex-wrap gap-1">
                {([
                  { value: "all",       label: "All Five" },
                  { value: "both",      label: "FB + IG" },
                  { value: "facebook",  label: "FB" },
                  { value: "instagram", label: "IG" },
                  { value: "x",         label: "X" },
                  { value: "linkedin",  label: "LI" },
                  { value: "google",    label: "GGL" },
                ] as { value: Platform; label: string }[]).map((p) => (
                  <button key={p.value} onClick={() => setPlatform(p.value)}
                    className={cn("px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex flex-col items-center justify-center gap-0.5 min-w-[52px]",
                      platform === p.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
                    )}>
                    <span>{p.label}</span>
                    {(() => {
                      const platformKey = p.value === "all" ? null : p.value === "both" ? null : p.value;
                      if (!platformKey || !spendByPlatform[platformKey]) return null;
                      const total = spendByPlatform[platformKey].totalCents;
                      if (total === 0) return null;
                      return <span className="text-[9px] opacity-70">{fmtDollars(total)}</span>;
                    })()}
                  </button>
                ))}
              </div>
              {platform === "all" && (
                <p className="text-xs text-muted-foreground">Generates separate, platform-optimized copy for Facebook, Instagram, X, LinkedIn, and Google Ads.</p>
              )}
            </div>

            {/* Tone */}
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-sm font-medium text-foreground">Tone</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["casual", "professional"] as Tone[]).map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      tone === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Image toggle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Image</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([true, false] as const).map((v) => (
                  <button key={String(v)} onClick={() => setWithImage(v)}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium transition-colors",
                      withImage === v ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                    )}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate + Cancel buttons */}
          <div className="flex items-center gap-2">
            {abMode ? (
              <Button onClick={handleGenerateVariants} disabled={isGenerating} className="gap-2 w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white">
                {variantsMutation.isPending
                  ? <><RefreshCw size={14} className="animate-spin" /> Generating 3 variants...</>
                  : <><Sparkles size={14} /> Generate 3 Variants</>
                }
              </Button>
            ) : (
              <>
                <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 w-full sm:w-auto">
                  {isGenerating
                    ? <><RefreshCw size={14} className="animate-spin" /> {platform === "all" ? "Generating..." : (generateStep || "Generating...")}</>
                    : <><Sparkles size={14} /> {platform === "all" ? "Generate for All Five Platforms" : "Generate Ad"}</>
                  }
                </Button>
                {isGenerating && platform === "all" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive transition-colors duration-200"
                  >
                    <XCircle size={13} />
                    Cancel
                  </Button>
                )}
                {!isGenerating && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCopySettingsOpen(true)}
                    className="gap-1.5 text-muted-foreground hover:text-foreground ml-auto"
                    title="Configure copy settings: hashtags and website URL"
                  >
                    <Settings size={13} />
                    Copy Settings
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Rich loading state for All Five generation */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              isGenerating && platform === "all" ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {(() => {
              const remainingSec = ALL_FIVE_STEPS
                .slice(generateStepIndex)
                .reduce((acc, s) => acc + s.estSec, 0);
              const remainingLabel = remainingSec <= 2 ? "Almost done..." : `~${remainingSec}s remaining`;
              const progressPct = Math.round((generateStepIndex / ALL_FIVE_STEPS.length) * 100);
              return (
                <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-muted-foreground" />
                      <p
                        key={generateStepIndex}
                        className="text-xs font-medium text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-300"
                      >
                        {ALL_FIVE_STEPS[generateStepIndex]?.statusMsg ?? "Finishing up..."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {elapsedSeconds}s elapsed
                      </span>
                      <span
                        key={`rem-${generateStepIndex}`}
                        className="text-[10px] font-medium text-primary tabular-nums animate-in fade-in duration-300"
                      >
                        {remainingLabel}
                      </span>
                    </div>
                  </div>

                  {/* Smooth progress bar via Radix Progress primitive */}
                  <Progress value={progressPct} className="h-1" />

                  {/* Per-platform step cards */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {ALL_FIVE_STEPS.map((step, idx) => {
                      const isDone = idx < generateStepIndex;
                      const isActive = idx === generateStepIndex;
                      return (
                        <div
                          key={step.label}
                          className={cn(
                            "flex flex-col gap-1 rounded-lg p-2.5 transition-all duration-500 ease-in-out",
                            isDone
                              ? "bg-green-500/10 border border-green-500/30 scale-[1.02]"
                              : isActive
                              ? "bg-primary/10 border border-primary/40 ring-1 ring-primary/20"
                              : "bg-muted/30 border border-border opacity-40"
                          )}
                        >
                          {/* Platform badge + status dot */}
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-[10px] font-bold leading-none transition-colors duration-300",
                              isDone ? "text-green-500" : isActive ? "text-primary" : "text-muted-foreground"
                            )}>
                              {step.icon}
                            </span>
                            {isDone && <div className="w-1.5 h-1.5 rounded-full bg-green-500 transition-all duration-300" />}
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                            {!isDone && !isActive && <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25" />}
                          </div>

                          {/* Platform name */}
                          <span className={cn(
                            "text-[9px] font-medium leading-none transition-colors duration-300",
                            isDone ? "text-green-500" : isActive ? "text-primary" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>

                          {/* Status message — fades when it changes */}
                          <span
                            key={`${step.label}-${isDone ? "done" : isActive ? "active" : "pending"}`}
                            className={cn(
                              "text-[8px] leading-tight transition-all duration-300 animate-in fade-in",
                              isDone ? "text-green-500/80" : isActive ? "text-primary/80" : "text-muted-foreground/50"
                            )}
                          >
                            {isDone ? step.doneMsg : isActive ? step.statusMsg : `~${step.estSec}s`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Post-generation summary flash */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-500 ease-in-out",
              showSummary ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            {generatedAll && (
              <div className="mt-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCheck size={15} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                        All five platforms ready
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        FB • IG • X • LinkedIn • Google Ads — scroll down to review and post each one.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {generatedAll.imageUrl && (
                      <img
                        src={generatedAll.imageUrl}
                        alt="Generated"
                        className="w-10 h-10 rounded-md object-cover border border-green-500/20"
                      />
                    )}
                    <button
                      onClick={() => setShowSummary(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Dismiss summary"
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                </div>
                {/* Mini copy previews */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {[
                    { label: "Facebook", text: generatedAll.facebook.draft },
                    { label: "Instagram", text: generatedAll.instagram.draft },
                    { label: "X", text: generatedAll.x.draft },
                    { label: "LinkedIn", text: generatedAll.linkedin.draft },
                  ].map(({ label, text }) => (
                    <div key={label} className="rounded-md bg-muted/40 px-2.5 py-1.5">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
                      <p className="text-[10px] text-foreground leading-snug mt-0.5 line-clamp-2">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Simple loading indicator for single-platform generation */}
          {isGenerating && platform !== "all" && (
            <div className="mt-2 flex items-center gap-2 animate-in fade-in duration-300">
              <RefreshCw size={12} className="animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Writing your ad copy — just a moment.</p>
            </div>
          )}
        </div>

        {/* ─── All-platforms result ─────────────────────────────────────────── */}
        {hasAllGenerated && generatedAll && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Generated Ads — All Platforms</h2>
            </div>

            {/* Shared image */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shared Image</label>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Upload size={12} />{isUploading ? "Uploading..." : "Upload photo"}
                  </button>
                  {uploadedImageUrl && (
                    <button onClick={() => { setUploadedImageUrl(null); setUploadedImageKey(null); setSavedPostId(null); }}
                      className="text-xs text-red-400 hover:underline">Remove</button>
                  )}
                </div>
              </div>
              {activeImageUrl && (
                <img src={activeImageUrl} alt="Ad image" className="rounded-xl max-h-48 object-cover border border-border" />
              )}
              {!activeImageUrl && (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
                  <ImageIcon size={24} className="mx-auto text-muted-foreground opacity-40 mb-2" />
                  <p className="text-xs text-muted-foreground">No image generated. Upload a photo or toggle Image on and regenerate.</p>
                </div>
              )}
            </div>

            {/* Three platform panels */}
            <div className="grid grid-cols-1 gap-4">
              {/* Facebook */}
              <PlatformCopyPanel
                icon={<Facebook size={14} className="text-blue-400" />}
                label="Facebook"
                accentClass="border-blue-400/20 bg-blue-400/5"
                draft={editedFbDraft}
                headline={editedFbHeadline}
                tone={tone}
                postStatus={fbPostStatus}
                onDraftChange={(v) => { setEditedFbDraft(v); setSavedPostId(null); }}
                onHeadlineChange={(v) => { setEditedFbHeadline(v); setSavedPostId(null); }}
              >
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handlePostAllPlatform("facebook")} disabled={isPosting}
                    className="gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0">
                    <Facebook size={14} />{fbMutation.isPending ? "Posting..." : "Post to Facebook"}
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(buildCopyText(editedFbDraft, "facebook", copySettings)); toast.success("Facebook copy copied to clipboard."); }
                      catch { toast.info("Select and copy the text above manually."); }
                    }}
                    className="gap-1.5 text-muted-foreground">
                    <Copy size={12} />Copy
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={regeneratePlatformMutation.isPending}
                    onClick={async () => {
                      const result = await regeneratePlatformMutation.mutateAsync({
                        platform: "facebook", adTypes, tone,
                        jobDescription: jobDescription.trim() || undefined,
                      });
                      setEditedFbDraft(result.draft);
                      setEditedFbHeadline(result.headline);
                      setSavedPostId(null);
                    }}
                    className="gap-1.5 text-muted-foreground">
                    <RefreshCw size={12} className={regeneratePlatformMutation.isPending ? "animate-spin" : ""} />
                    Regenerate
                  </Button>
                </div>
              </PlatformCopyPanel>

              {/* Instagram */}
              <PlatformCopyPanel
                icon={<Instagram size={14} className="text-pink-400" />}
                label="Instagram"
                accentClass="border-pink-400/20 bg-pink-400/5"
                draft={editedIgDraft}
                headline={editedIgHeadline}
                tone={tone}
                postStatus={igPostStatus}
                onDraftChange={(v) => { setEditedIgDraft(v); setSavedPostId(null); }}
                onHeadlineChange={(v) => { setEditedIgHeadline(v); setSavedPostId(null); }}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handlePostAllPlatform("instagram")} disabled={isPosting || !activeImageUrl}
                      className="gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white border-0"
                      title={!activeImageUrl ? "Instagram requires an image" : undefined}>
                      <Instagram size={14} />{igMutation.isPending ? "Posting..." : "Post to Instagram"}
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(buildCopyText(editedIgDraft, "instagram", copySettings)); toast.success("Instagram copy copied to clipboard."); }
                        catch { toast.info("Select and copy the text above manually."); }
                      }}
                      className="gap-1.5 text-muted-foreground">
                      <Copy size={12} />Copy
                    </Button>
                    <Button variant="outline" size="sm"
                      disabled={regeneratePlatformMutation.isPending}
                      onClick={async () => {
                        const result = await regeneratePlatformMutation.mutateAsync({
                          platform: "instagram", adTypes, tone,
                          jobDescription: jobDescription.trim() || undefined,
                        });
                        setEditedIgDraft(result.draft);
                        setEditedIgHeadline(result.headline);
                        setSavedPostId(null);
                      }}
                      className="gap-1.5 text-muted-foreground">
                      <RefreshCw size={12} className={regeneratePlatformMutation.isPending ? "animate-spin" : ""} />
                      Regenerate
                    </Button>
                  </div>
                  {!activeImageUrl && (
                    <p className="text-xs text-amber-400">Upload a photo to enable Instagram posting.</p>
                  )}
                </div>
              </PlatformCopyPanel>

              {/* X */}
              <PlatformCopyPanel
                icon={<Twitter size={14} className="text-sky-400" />}
                label="X"
                accentClass="border-sky-400/20 bg-sky-400/5"
                draft={editedXDraft}
                headline={editedXHeadline}
                tone={tone}
                postStatus={xPostStatus}
                onDraftChange={(v) => { setEditedXDraft(v); setSavedPostId(null); }}
                onHeadlineChange={(v) => { setEditedXHeadline(v); setSavedPostId(null); }}
                charLimit={280}
              >
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handlePostAllPlatform("x")} disabled={isPosting || editedXDraft.length > 280}
                    className="gap-2 bg-black hover:bg-gray-900 text-white border-0"
                    title={editedXDraft.length > 280 ? "Trim copy to under 280 characters before posting" : undefined}>
                    <Twitter size={14} />{xMutation.isPending ? "Posting..." : "Post to X"}
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(buildCopyText(editedXDraft, "x", copySettings)); toast.success("X copy copied to clipboard."); }
                      catch { toast.info("Select and copy the text above manually."); }
                    }}
                    className="gap-1.5 text-muted-foreground">
                    <Copy size={12} />Copy
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={regeneratePlatformMutation.isPending}
                    onClick={async () => {
                      const result = await regeneratePlatformMutation.mutateAsync({
                        platform: "x", adTypes, tone,
                        jobDescription: jobDescription.trim() || undefined,
                      });
                      setEditedXDraft(result.draft);
                      setEditedXHeadline(result.headline);
                      setSavedPostId(null);
                    }}
                    className="gap-1.5 text-muted-foreground">
                    <RefreshCw size={12} className={regeneratePlatformMutation.isPending ? "animate-spin" : ""} />
                    Regenerate
                  </Button>
                </div>
              </PlatformCopyPanel>

              {/* LinkedIn */}
              <PlatformCopyPanel
                icon={<Linkedin size={14} className="text-[#0A66C2]" />}
                label="LinkedIn"
                accentClass="border-[#0A66C2]/20 bg-[#0A66C2]/5"
                draft={editedLiDraft}
                headline={editedLiHeadline}
                tone={tone}
                postStatus={liPostStatus}
                onDraftChange={(v) => { setEditedLiDraft(v); setSavedPostId(null); }}
                onHeadlineChange={(v) => { setEditedLiHeadline(v); setSavedPostId(null); }}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => handlePostAllPlatform("linkedin")} disabled={isPosting}
                      className="gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white border-0">
                      <Linkedin size={14} />{liMutation.isPending ? "Posting..." : "Post to LinkedIn"}
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(buildCopyText(editedLiDraft, "linkedin", copySettings)); toast.success("LinkedIn copy copied to clipboard."); }
                        catch { toast.info("Select and copy the text above manually."); }
                      }}
                      className="gap-1.5 text-muted-foreground">
                      <Copy size={12} />Copy
                    </Button>
                    <Button variant="outline" size="sm"
                      disabled={regeneratePlatformMutation.isPending}
                      onClick={async () => {
                        const result = await regeneratePlatformMutation.mutateAsync({
                          platform: "linkedin", adTypes, tone,
                          jobDescription: jobDescription.trim() || undefined,
                        });
                        setEditedLiDraft(result.draft);
                        setEditedLiHeadline(result.headline);
                        setSavedPostId(null);
                      }}
                      className="gap-1.5 text-muted-foreground">
                      <RefreshCw size={12} className={regeneratePlatformMutation.isPending ? "animate-spin" : ""} />
                      Regenerate
                    </Button>
                  </div>
                  <p className="text-xs text-amber-400/80">To enable direct LinkedIn posting, configure your credentials via the gear icon on the LinkedIn card in Platform Connections above.</p>
                </div>
              </PlatformCopyPanel>
            </div>

            {/* Google Ads panel */}
            <PlatformCopyPanel
              icon={<span className="text-[11px] font-bold text-yellow-400">G</span>}
              label="Google Ads"
              accentClass="border-yellow-400/20 bg-yellow-400/5"
              draft={editedGoogleDraft}
              headline={editedGoogleHeadline}
              tone={tone}
              postStatus={googlePostStatus}
              onDraftChange={(v) => { setEditedGoogleDraft(v); setSavedPostId(null); }}
              onHeadlineChange={(v) => { setEditedGoogleHeadline(v); setSavedPostId(null); }}
            >
              <div className="space-y-2">
                {/* Description line field */}
                {editedGoogleDescription && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-medium">Description line (max 90 chars)</label>
                    <div className="flex items-center gap-2">
                      <input
                        value={editedGoogleDescription}
                        onChange={(e) => { setEditedGoogleDescription(e.target.value); setSavedPostId(null); }}
                        maxLength={90}
                        className="flex-1 text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
                      />
                      <span className={cn("text-[10px]", editedGoogleDescription.length > 90 ? "text-red-400" : "text-muted-foreground")}>
                        {editedGoogleDescription.length}/90
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={async () => {
                    const parts = [
                      editedGoogleHeadline && `Headline: ${editedGoogleHeadline}`,
                      editedGoogleDescription && `Description: ${editedGoogleDescription}`,
                      editedGoogleDraft && `Body: ${editedGoogleDraft}`,
                    ].filter(Boolean).join("\n");
                    try {
                      await navigator.clipboard.writeText(parts);
                      toast.success("Google Ads copy copied to clipboard.");
                    } catch {
                      toast.info("Copy the fields above and paste into your Google Ads account.");
                    }
                  }} disabled={isPosting}
                    className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black border-0">
                    <span className="text-[11px] font-bold">G</span>Copy to Clipboard
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={regeneratePlatformMutation.isPending}
                    onClick={async () => {
                      const result = await regeneratePlatformMutation.mutateAsync({
                        platform: "google", adTypes, tone,
                        jobDescription: jobDescription.trim() || undefined,
                      });
                      setEditedGoogleDraft(result.draft);
                      setEditedGoogleHeadline(result.headline);
                      setSavedPostId(null);
                    }}
                    className="gap-1.5 text-muted-foreground">
                    <RefreshCw size={12} className={regeneratePlatformMutation.isPending ? "animate-spin" : ""} />
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Paste the headline and description into your Google Ads account. The extended description can be used as display ad body copy.</p>
              </div>
            </PlatformCopyPanel>

            {/* Post to All Five */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <Button
                onClick={() => handlePostAllPlatform("all")}
                disabled={isPosting}
                className="gap-2 bg-gradient-to-r from-[#1877F2] via-[#833AB4] via-black via-[#0A66C2] to-yellow-500 text-white border-0 hover:opacity-90"
              >
                <Send size={14} />{isPosting ? "Posting..." : "Post to All Five"}
              </Button>
              <Button variant="outline" onClick={() => setShowScheduler(!showScheduler)}
                className={cn("gap-2", showScheduler && "border-primary/40 text-primary")}>
                <Clock size={14} />Schedule
              </Button>
              <Button variant="ghost" onClick={() => saveMutation.mutate({
                jobDescription, draft: editedFbDraft, headline: editedFbHeadline, platform: "all",
                imageUrl: activeImageUrl ?? undefined, imageKey: uploadedImageKey ?? undefined, status: "draft",
                igDraft: editedIgDraft || undefined,
                xDraft: editedXDraft || undefined,
                liDraft: editedLiDraft || undefined,
                googleHeadline: editedGoogleHeadline || undefined,
                googleDescription: editedGoogleDescription || undefined,
                googleDraft: editedGoogleDraft || undefined,
              })} disabled={saveMutation.isPending || !!savedPostId} className="gap-2 text-muted-foreground">
                {savedPostId ? <><CheckCircle2 size={14} className="text-green-400" /> Saved</> : "Save draft"}
              </Button>
            </div>

            {/* Scheduler panel */}
            {showScheduler && (
              <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">Schedule post</span>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Date</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Time (local)</label>
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <Button onClick={handleSchedule} disabled={schedulePostMutation.isPending || !scheduledDate} size="sm" className="gap-1.5">
                    <Clock size={12} />{schedulePostMutation.isPending ? "Scheduling..." : "Confirm schedule"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">The post will be queued and published automatically at the scheduled time.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── A/B Variant Picker ─────────────────────────────────────────── */}
        {abMode && abVariants.length > 0 && (
          <div className="bg-card border border-amber-500/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-400" />
              <h2 className="text-base font-semibold text-foreground">Pick a Variant</h2>
              <span className="text-xs text-muted-foreground ml-auto">Click a variant to load it into the editor below</span>
            </div>
            <div className="space-y-3">
              {abVariants.map((v, i) => (
                <div key={i} className={cn(
                  "rounded-lg border transition-colors",
                  selectedVariantIdx === i ? "border-amber-500/60" : "border-border"
                )}>
                  {/* Variant header row */}
                  <div
                    className={cn(
                      "w-full text-left p-4 space-y-1.5 cursor-pointer",
                      selectedVariantIdx === i ? "bg-amber-500/10" : "bg-background hover:bg-muted/30"
                    )}
                    onClick={() => selectVariant(i)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full border",
                        selectedVariantIdx === i ? "bg-amber-500/20 border-amber-500/40 text-amber-400" : "bg-muted border-border text-muted-foreground"
                      )}>
                        {v.angle}
                      </span>
                      {selectedVariantIdx === i && (
                        <span className="text-xs text-amber-400 flex items-center gap-1"><CheckCircle2 size={11} /> Selected</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setAbPreviewIdx(abPreviewIdx === i ? null : i); }}
                        className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye size={11} />{abPreviewIdx === i ? "Hide preview" : "Preview"}
                      </button>
                    </div>
                    <p className="text-sm font-medium text-foreground">{v.headline}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{v.draft}</p>
                  </div>
                  {/* Inline Facebook/Instagram preview */}
                  {abPreviewIdx === i && (
                    <div className="border-t border-border p-4 bg-secondary/20">
                      <SocialPreview
                        platform={platform === "instagram" ? "instagram" : "facebook"}
                        headline={v.headline}
                        draft={v.draft}
                        imageUrl={activeImageUrl}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selectedVariantIdx !== null && (
              <p className="text-xs text-amber-400/80">Variant {selectedVariantIdx + 1} loaded into the editor below. Edit and post when ready.</p>
            )}
          </div>
        )}

        {/* ─── Single-platform result ───────────────────────────────────────── */}
        {hasSingleGenerated && generated && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Generated Ad</h2>
              <button onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Eye size={13} />{showPreview ? "Hide preview" : "Preview"}
              </button>
            </div>

            {/* Headline */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Headline</label>
              <input
                value={editedHeadline}
                onChange={(e) => { setEditedHeadline(e.target.value); setSavedPostId(null); }}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Ad copy */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad copy</label>
              <Textarea
                value={editedDraft}
                onChange={(e) => { setEditedDraft(e.target.value); setSavedPostId(null); }}
                rows={6}
                className="resize-none bg-background border-border text-foreground"
              />
              {platform === "x" && editedDraft.length > 280 && (
                <p className="text-xs text-amber-400">X posts are limited to 280 characters. Current: {editedDraft.length}. Trim before posting.</p>
              )}
            </div>

            {/* Image area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Image</label>
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Upload size={12} />{isUploading ? "Uploading..." : "Upload photo"}
                  </button>
                  {uploadedImageUrl && (
                    <button onClick={() => { setUploadedImageUrl(null); setUploadedImageKey(null); setSavedPostId(null); setPrefillPhotoUrls([]); }}
                      className="text-xs text-red-400 hover:underline">Remove</button>
                  )}
                </div>
              </div>
              {/* Job photo picker — shown when photos were auto-attached from Send to Ads */}
              {prefillPhotoUrls.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Job Photos ({prefillPhotoUrls.length}) — click to select</p>
                  <div className="flex gap-2 flex-wrap">
                    {prefillPhotoUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => { setUploadedImageUrl(url); setUploadedImageKey(null); }}
                        className={`rounded-lg overflow-hidden border-2 transition-colors ${
                          uploadedImageUrl === url ? "border-primary" : "border-transparent hover:border-primary/50"
                        }`}
                      >
                        <img src={url} alt={`Job photo ${i + 1}`} className="w-16 h-16 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {activeImageUrl && (
                <img src={activeImageUrl} alt="Ad image" className="rounded-xl max-h-64 object-cover border border-border" />
              )}
            </div>

            {/* Live preview */}
            {showPreview && (
              <div className="pt-2 border-t border-border">
                <SocialPreview
                  platform={platform === "instagram" ? "instagram" : "facebook"}
                  headline={editedHeadline}
                  draft={editedDraft}
                  imageUrl={activeImageUrl}
                />
              </div>
            )}

            {/* Post buttons */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              {(platform === "facebook" || platform === "both") && (
                <Button onClick={() => handlePost("facebook")} disabled={isPosting}
                  className="gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0">
                  <Facebook size={14} />{fbMutation.isPending ? "Posting..." : "Post to Facebook"}
                </Button>
              )}
              {(platform === "instagram" || platform === "both") && (
                <Button onClick={() => handlePost("instagram")} disabled={isPosting || !activeImageUrl}
                  className="gap-2 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white border-0"
                  title={!activeImageUrl ? "Instagram requires an image" : undefined}>
                  <Instagram size={14} />{igMutation.isPending ? "Posting..." : "Post to Instagram"}
                </Button>
              )}
              {platform === "x" && (
                <Button onClick={() => handlePost("x")} disabled={isPosting}
                  className="gap-2 bg-black hover:bg-gray-900 text-white border-0">
                  <Twitter size={14} />{xMutation.isPending ? "Posting..." : "Post to X"}
                </Button>
              )}
              {platform === "linkedin" && (
                <Button onClick={() => {
                  const postId = savedPostId;
                  if (!postId) { toast.error("Save the post first."); return; }
                  liMutation.mutate({ postId, text: editedDraft, imageUrl: activeImageUrl ?? undefined });
                }} disabled={isPosting}
                  className="gap-2 bg-[#0A66C2] hover:bg-[#0057a8] text-white border-0">
                  <Linkedin size={14} />{liMutation.isPending ? "Posting..." : "Post to LinkedIn"}
                </Button>
              )}
              {platform === "google" && (
                <Button onClick={async () => {
                  const text = `${editedHeadline}\n${editedDraft}`;
                  try {
                    await navigator.clipboard.writeText(text);
                    toast.success("Google Ads copy copied to clipboard. Paste it into your Google Ads account.");
                  } catch {
                    toast.info("Copy the headline and body above, then paste into your Google Ads account.");
                  }
                }} disabled={isPosting}
                  className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black border-0">
                  <span className="text-[11px] font-bold">G</span>Copy to Clipboard
                </Button>
              )}
              {/* Copy button for single-platform non-Google modes */}
              {platform !== "google" && platform !== "both" && (
                <Button variant="outline" size="sm"
                  onClick={async () => {
                    const p = platform as "facebook" | "instagram" | "x" | "linkedin";
                    try { await navigator.clipboard.writeText(buildCopyText(editedDraft, p, copySettings)); toast.success("Copy copied to clipboard."); }
                    catch { toast.info("Select and copy the text above manually."); }
                  }}
                  className="gap-1.5 text-muted-foreground">
                  <Copy size={12} />Copy
                </Button>
              )}
              {platform === "both" && (
                <Button onClick={() => handlePost("both")} disabled={isPosting} variant="outline" className="gap-2">
                  <Send size={14} />{isPosting ? "Posting..." : "Post to Both"}
                </Button>
              )}
              {(platform === "facebook" || platform === "instagram" || platform === "x" || platform === "both") && (
                <Button onClick={() => handlePost("all")} disabled={isPosting}
                  className="gap-2 bg-gradient-to-r from-[#1877F2] via-[#833AB4] to-black text-white border-0 hover:opacity-90">
                  <Send size={14} />{allMutation.isPending ? "Posting..." : "Post to FB + IG + X"}
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowScheduler(!showScheduler)}
                className={cn("gap-2", showScheduler && "border-primary/40 text-primary")}>
                <Clock size={14} />Schedule
              </Button>
              <Button variant="ghost" onClick={() => saveMutation.mutate({
                jobDescription, draft: editedDraft, headline: editedHeadline, platform,
                imageUrl: activeImageUrl ?? undefined, imageKey: uploadedImageKey ?? undefined, status: "draft",
              })} disabled={saveMutation.isPending || !!savedPostId} className="gap-2 text-muted-foreground">
                {savedPostId ? <><CheckCircle2 size={14} className="text-green-400" /> Saved</> : "Save draft"}
              </Button>
            </div>

            {/* Scheduler panel */}
            {showScheduler && (
              <div className="bg-secondary/50 rounded-xl p-4 space-y-3 border border-border">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">Schedule post</span>
                </div>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Date</label>
                    <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Time (local)</label>
                    <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <Button onClick={handleSchedule} disabled={schedulePostMutation.isPending || !scheduledDate} size="sm" className="gap-1.5">
                    <Clock size={12} />{schedulePostMutation.isPending ? "Scheduling..." : "Confirm schedule"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">The post will be queued and published automatically at the scheduled time.</p>
              </div>
            )}

            {/* Post result feedback */}
            {(fbMutation.isSuccess || igMutation.isSuccess || xMutation.isSuccess) && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/5 border border-green-400/20 rounded-lg px-4 py-2.5">
                <CheckCircle2 size={14} />
                Posted successfully.
                {fbMutation.data?.url && (
                  <a href={fbMutation.data.url} target="_blank" rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs underline">
                    View on Facebook <ExternalLink size={11} />
                  </a>
                )}
                {xMutation.data?.xPostId && (
                  <a href={`https://x.com/i/web/status/${xMutation.data.xPostId}`} target="_blank" rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs underline">
                    View on X <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Queue */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <CalendarClock size={16} className="text-amber-400" />
                Scheduled Queue
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Posts queued for automatic publishing. The scheduler runs every minute.
              </p>
            </div>
            {scheduledPosts.length > 0 && (
              <span className="text-xs font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2.5 py-1 rounded-full">
                {scheduledPosts.length} queued
              </span>
            )}
          </div>
          {scheduledPosts.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <CalendarClock size={28} className="text-muted-foreground opacity-30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No ads scheduled.</p>
              <p className="text-xs text-muted-foreground mt-1">Generate an ad and use the Schedule button to queue it for a future date and time.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {scheduledPosts.map((post) => {
                const platformLabel = post.platform === "both" ? "FB + IG"
                  : post.platform === "all" ? "FB + IG + X + LI + Google"
                  : post.platform === "facebook" ? "Facebook"
                  : post.platform === "instagram" ? "Instagram"
                  : post.platform === "x" ? "X"
                  : post.platform === "linkedin" ? "LinkedIn"
                  : post.platform === "google" ? "Google Ads"
                  : post.platform;
                return (
                  <div key={post.id} className="px-6 py-4 flex items-start gap-4">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                        <ImageIcon size={16} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.headline && (
                          <span className="text-sm font-semibold text-foreground truncate">{post.headline}</span>
                        )}
                        <Badge variant="outline" className="text-[10px] shrink-0">{platformLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.draft}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={11} className="text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-amber-400">
                          {post.scheduledAt
                            ? format(new Date(post.scheduledAt), "EEE, MMM d 'at' h:mm a")
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelScheduleMutation.mutate({ id: post.id })}
                      disabled={cancelScheduleMutation.isPending}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg border border-border hover:border-red-400/30 shrink-0"
                      title="Cancel scheduled post"
                    >
                      <XIcon size={11} />
                      Cancel
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ad Spend Tracker */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <DollarSign size={16} className="text-green-400" />
                Ad Spend Tracker
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track what you spend on each platform and cost component.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {grandTotalCents > 0 && (
                <span className="text-sm font-bold text-foreground">{fmtDollars(grandTotalCents)} total</span>
              )}
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSpendModal(true)}>
                <Plus size={12} /> Log Spend
              </Button>
            </div>
          </div>

          {/* Total Spend Summary Row — always visible */}
          <div className="px-6 py-4 border-b border-border bg-secondary/20">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {/* Grand total */}
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Spend</span>
                <span className={cn("text-xl font-bold", grandTotalCents > 0 ? "text-foreground" : "text-muted-foreground")}>
                  {grandTotalCents > 0 ? fmtDollars(grandTotalCents) : "$0.00"}
                </span>
              </div>
              {/* Divider */}
              {grandTotalCents > 0 && <div className="h-8 w-px bg-border hidden sm:block" />}
              {/* Per-platform mini totals */}
              {grandTotalCents > 0 && PLATFORMS_ORDER
                .filter((p) => spendByPlatform[p]?.totalCents > 0)
                .map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <div className={cn("w-6 h-6 rounded-md border flex items-center justify-center shrink-0", PLATFORM_BG[p])}>
                      {p === "facebook" && <Facebook size={11} className={PLATFORM_COLORS[p]} />}
                      {p === "instagram" && <Instagram size={11} className={PLATFORM_COLORS[p]} />}
                      {p === "x" && <Twitter size={11} className={PLATFORM_COLORS[p]} />}
                      {p === "linkedin" && <Linkedin size={11} className={PLATFORM_COLORS[p]} />}
                      {p === "google" && <span className={cn("text-[9px] font-bold", PLATFORM_COLORS[p])}>G</span>}

                      {p === "other" && <DollarSign size={11} className={PLATFORM_COLORS[p]} />}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className={cn("text-xs font-semibold", PLATFORM_COLORS[p])}>{PLATFORM_LABELS[p]}</span>
                      <span className="text-xs text-muted-foreground">{fmtDollars(spendByPlatform[p].totalCents)}</span>
                    </div>
                  </div>
                ))
              }
              {grandTotalCents === 0 && (
                <span className="text-xs text-muted-foreground">No spend logged yet. Click "Log Spend" to get started.</span>
              )}
            </div>
          </div>

          {spendEntries.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <DollarSign size={28} className="text-muted-foreground opacity-30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No spend logged yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Log Spend" to record ad costs by platform and component.</p>
            </div>
          ) : (
            <>
            {/* Spend Distribution Chart */}
            {(() => {
              const chartData = PLATFORMS_ORDER
                .filter((p) => spendByPlatform[p].totalCents > 0)
                .map((p) => ({
                  name: PLATFORM_LABELS[p],
                  value: spendByPlatform[p].totalCents,
                  platform: p,
                }));
              const CHART_COLORS: Record<string, string> = {
                facebook: "#60a5fa",
                instagram: "#f472b6",
                x: "#38bdf8",
                linkedin: "#0A66C2",
                google: "#facc15",
                other: "#94a3b8",
              };
              const CustomTooltip = ({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{fmtDollars(d.value)}</p>
                    <p className="text-xs text-muted-foreground">{((d.value / grandTotalCents) * 100).toFixed(1)}%</p>
                  </div>
                );
              };
              return (
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Spend Distribution</p>
                  <div className="flex items-center gap-6">
                    <div className="w-48 h-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={76}
                            paddingAngle={3}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {chartData.map((entry) => (
                              <Cell key={entry.platform} fill={CHART_COLORS[entry.platform]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend + per-platform totals */}
                    <div className="flex-1 space-y-2">
                      {chartData.map((entry) => {
                        const pct = ((entry.value / grandTotalCents) * 100).toFixed(1);
                        const barWidth = Math.max(4, (entry.value / grandTotalCents) * 100);
                        return (
                          <div key={entry.platform}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: CHART_COLORS[entry.platform] }}
                                />
                                <span className="text-xs font-medium text-foreground">{entry.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                                <span className="text-xs font-semibold text-foreground w-16 text-right">{fmtDollars(entry.value)}</span>
                              </div>
                            </div>
                            <div className="h-1 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${barWidth}%`, backgroundColor: CHART_COLORS[entry.platform] }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Spend Trend Chart */}
            {(() => {
              // Group spend by week (Mon–Sun) across all platforms
              const weekMap: Record<string, number> = {};
              spendEntries.forEach((e) => {
                const d = new Date(e.spentAt);
                // Normalize to Monday of that week
                const day = d.getDay(); // 0=Sun
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(d.setDate(diff));
                const key = monday.toISOString().slice(0, 10);
                weekMap[key] = (weekMap[key] || 0) + e.amountCents;
              });
              const trendData = Object.entries(weekMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([week, cents]) => ({
                  week: format(new Date(week), "MMM d"),
                  spend: cents / 100,
                }));
              if (trendData.length < 2) return null;
              const CustomTrendTooltip = ({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">${payload[0].value.toFixed(2)}</p>
                  </div>
                );
              };
              return (
                <div className="px-6 py-5 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Weekly Spend Trend</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip content={<CustomTrendTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke="#E07B2A"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "#E07B2A", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "#E07B2A" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
            <div className="divide-y divide-border">
              {PLATFORMS_ORDER.filter((p) => spendByPlatform[p].totalCents > 0).map((p) => {
                const { totalCents, byComponent, entries } = spendByPlatform[p];
                const isExpanded = expandedSpendPlatform === p;
                return (
                  <div key={p}>
                    {/* Platform summary row */}
                    <button
                      onClick={() => setExpandedSpendPlatform(isExpanded ? null : p)}
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center shrink-0", PLATFORM_BG[p])}>
                        {p === "facebook" && <Facebook size={13} className={PLATFORM_COLORS[p]} />}
                        {p === "instagram" && <Instagram size={13} className={PLATFORM_COLORS[p]} />}
                        {p === "x" && <Twitter size={13} className={PLATFORM_COLORS[p]} />}
                        {p === "linkedin" && <Linkedin size={13} className={PLATFORM_COLORS[p]} />}
                        {p === "google" && <span className={cn("text-[11px] font-bold", PLATFORM_COLORS[p])}>G</span>}

                        {p === "other" && <DollarSign size={13} className={PLATFORM_COLORS[p]} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-semibold", PLATFORM_COLORS[p])}>{PLATFORM_LABELS[p]}</span>
                          <span className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
                        </div>
                        {/* Component mini-breakdown */}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {Object.entries(byComponent).map(([comp, cents]) => (
                            <span key={comp} className="text-[11px] text-muted-foreground">
                              {comp}: <span className="text-foreground font-medium">{fmtDollars(cents)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-foreground">{fmtDollars(totalCents)}</span>
                        <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                      </div>
                    </button>

                    {/* Expanded entry list */}
                    {isExpanded && (
                      <div className="bg-secondary/20 border-t border-border divide-y divide-border/50">
                        {entries.map((entry) => (
                          <div key={entry.id} className="px-8 py-3 flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{entry.component}</span>
                                <span className="text-xs font-bold text-foreground">{fmtDollars(entry.amountCents)}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-muted-foreground">
                                  {format(new Date(entry.spentAt), "MMM d, yyyy")}
                                </span>
                                {entry.notes && (
                                  <span className="text-[11px] text-muted-foreground italic truncate max-w-xs">{entry.notes}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteSpendMutation.mutate({ id: entry.id })}
                              disabled={deleteSpendMutation.isPending}
                              className="text-muted-foreground hover:text-red-400 transition-colors p-1 shrink-0"
                              title="Remove entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>
          )}
        </div>

        {/* Log Spend Modal */}
        {showSpendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Log Ad Spend</h3>
                <button onClick={() => setShowSpendModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <XIcon size={16} />
                </button>
              </div>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS_ORDER.map((p) => (
                    <button key={p} onClick={() => setSpendPlatform(p)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-xs font-medium transition-colors",
                        spendPlatform === p
                          ? cn("border-primary/40 text-primary bg-primary/10")
                          : "border-border text-muted-foreground hover:text-foreground bg-background"
                      )}
                    >
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Component */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cost Component</label>
                <input
                  type="text"
                  placeholder="e.g. Boost Post, Monthly Budget, Ad Creation"
                  value={spendComponent}
                  onChange={(e) => setSpendComponent(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={spendAmount}
                    onChange={(e) => setSpendAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={spendDate}
                    onChange={(e) => setSpendDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
                <input
                  type="text"
                  placeholder="Campaign name, post reference, etc."
                  value={spendNotes}
                  onChange={(e) => setSpendNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowSpendModal(false)}>Cancel</Button>
                <Button size="sm" onClick={handleLogSpend} disabled={addSpendMutation.isPending} className="gap-1.5">
                  <Plus size={12} />{addSpendMutation.isPending ? "Saving..." : "Log Spend"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">Ad History</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Last 50 generated ads — saved drafts, scheduled posts, and published ads</p>
          </div>
          {history.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Sparkles size={28} className="text-muted-foreground opacity-30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No ads generated yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Every ad you generate is saved here automatically. Use the Generate Ad section above to create your first one.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map((post) => (
                <HistoryRow key={post.id} post={post} onDelete={() => deleteMutation.mutate({ id: post.id })} />
              ))}
            </div>
          )}
        </div>

        {/* ─── Monthly Campaign Planner ─────────────────────────────────────────── */}
        <CampaignPlanner />

      </div>

      {/* LinkedIn Settings Modal */}
      {showLinkedInSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Linkedin size={16} className="text-[#0A66C2]" />
                <h3 className="text-base font-semibold text-foreground">LinkedIn Settings</h3>
              </div>
              <button onClick={() => setShowLinkedInSettings(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <XIcon size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {liSettings && (
                <div className="rounded-lg border border-[#0A66C2]/30 bg-[#0A66C2]/5 px-4 py-3 text-sm">
                  <p className="font-medium text-[#0A66C2]">Credentials on file</p>
                  <p className="text-xs text-muted-foreground mt-1">Author URN: {liSettings.authorUrn}</p>
                  {liSettings.displayName && <p className="text-xs text-muted-foreground">Display name: {liSettings.displayName}</p>}
                  <p className="text-xs text-muted-foreground">Token: {liSettings.tokenPreview}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Access Token <span className="text-red-400">*</span></label>
                <input
                  type="password"
                  value={liTokenInput}
                  onChange={(e) => setLiTokenInput(e.target.value)}
                  placeholder={liSettings ? "Enter new token to replace existing" : "Paste your OAuth 2.0 access token"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#0A66C2]/60"
                />
                <p className="text-[11px] text-muted-foreground">Requires the w_member_social scope. Generate at developer.linkedin.com.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Author URN <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={liUrnInput}
                  onChange={(e) => setLiUrnInput(e.target.value)}
                  placeholder={liSettings ? liSettings.authorUrn : "urn:li:person:abc123 or urn:li:organization:123456"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#0A66C2]/60"
                />
                <p className="text-[11px] text-muted-foreground">Your LinkedIn member or organization URN. Found in the LinkedIn API or via /v2/userinfo.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Display Name <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={liDisplayNameInput}
                  onChange={(e) => setLiDisplayNameInput(e.target.value)}
                  placeholder={liSettings?.displayName ?? "Noland Earthworks"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#0A66C2]/60"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                {liSettings ? (
                  <button
                    onClick={() => { if (confirm("Remove LinkedIn credentials?")) deleteLiSettingsMutation.mutate(); }}
                    disabled={deleteLiSettingsMutation.isPending}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {deleteLiSettingsMutation.isPending ? "Removing..." : "Remove credentials"}
                  </button>
                ) : <span />}
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowLinkedInSettings(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!liTokenInput.trim() && !liSettings) { toast.error("Access token is required."); return; }
                      if (!liUrnInput.trim() && !liSettings) { toast.error("Author URN is required."); return; }
                      saveLiSettingsMutation.mutate({
                        accessToken: liTokenInput.trim() || (liSettings ? "__keep__" : ""),
                        authorUrn: liUrnInput.trim() || liSettings?.authorUrn || "",
                        displayName: liDisplayNameInput.trim() || undefined,
                      });
                    }}
                    disabled={saveLiSettingsMutation.isPending}
                    className="gap-1.5 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
                  >
                    {saveLiSettingsMutation.isPending ? "Saving..." : "Save credentials"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Settings Modal */}
      <CopySettingsModal
        open={copySettingsOpen}
        onClose={() => setCopySettingsOpen(false)}
        initial={copySettings}
        onSave={(data) => setCopySettings(data)}
      />

    </DashboardLayout>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────
function HistoryRow({ post, onDelete }: { post: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const platformLabel = post.platform === "both" ? "FB + IG"
    : post.platform === "all" ? "FB + IG + X + LI + Google"
    : post.platform === "facebook" ? "Facebook"
    : post.platform === "instagram" ? "Instagram"
    : post.platform === "x" ? "X"
    : post.platform === "linkedin" ? "LinkedIn"
    : post.platform === "google" ? "Google Ads"
    : post.platform;

  const statusBadge = post.status === "scheduled"
    ? <Badge className="text-[10px] bg-amber-400/10 text-amber-400 border-amber-400/20 shrink-0">Scheduled</Badge>
    : post.status === "published" || post.published
    ? <Badge className="text-[10px] bg-green-400/10 text-green-400 border-green-400/20 shrink-0">Posted</Badge>
    : <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">Draft</Badge>;

  return (
    <div className="px-6 py-4">
      <div className="flex items-start gap-4">
        {post.imageUrl ? (
          <img src={post.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-border flex-shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
            <ImageIcon size={18} className="text-muted-foreground opacity-40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {post.headline && <span className="text-sm font-semibold text-foreground truncate">{post.headline}</span>}
            <Badge variant="outline" className="text-[10px] shrink-0">{platformLabel}</Badge>
            {statusBadge}
          </div>
          <p className={cn("text-xs text-muted-foreground mt-1", !expanded && "line-clamp-2")}>{post.draft}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-muted-foreground">{format(new Date(post.createdAt), "MMM d, yyyy")}</span>
            {post.scheduledAt && post.status === "scheduled" && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <Clock size={9} /> {format(new Date(post.scheduledAt), "MMM d 'at' h:mm a")}
              </span>
            )}
            {post.postedAt && (
              <span className="text-[11px] text-green-400">Posted {format(new Date(post.postedAt), "MMM d")}</span>
            )}
            <button onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
              {expanded ? "Less" : "More"}
              <ChevronDown size={10} className={cn("transition-transform", expanded && "rotate-180")} />
            </button>
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-red-400 transition-colors p-1 shrink-0" title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className="mt-3 ml-[4.5rem] space-y-3">
          {/* Per-platform copy — shown when All Five drafts were saved */}
          {(post.igDraft || post.xDraft || post.liDraft || post.googleHeadline) && (
            <div className="space-y-2">
              {post.igDraft && (
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-purple-400 mb-1 flex items-center gap-1"><Instagram size={10} /> Instagram</p>
                  <p className="text-xs text-muted-foreground">{post.igDraft}</p>
                </div>
              )}
              {post.xDraft && (
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-sky-400 mb-1 flex items-center gap-1"><Twitter size={10} /> X</p>
                  <p className="text-xs text-muted-foreground">{post.xDraft}</p>
                </div>
              )}
              {post.liDraft && (
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-blue-400 mb-1 flex items-center gap-1"><Linkedin size={10} /> LinkedIn</p>
                  <p className="text-xs text-muted-foreground">{post.liDraft}</p>
                </div>
              )}
              {post.googleHeadline && (
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-yellow-400 mb-1 flex items-center gap-1"><Globe size={10} /> Google Ads</p>
                  {post.googleHeadline && <p className="text-xs font-medium text-foreground">{post.googleHeadline}</p>}
                  {post.googleDescription && <p className="text-xs text-muted-foreground mt-0.5">{post.googleDescription}</p>}
                  {post.googleDraft && <p className="text-xs text-muted-foreground mt-1">{post.googleDraft}</p>}
                </div>
              )}
            </div>
          )}
          {/* Post IDs / external links */}
          {(post.fbPostId || post.igPostId || post.xPostId || post.liPostId) && (
            <div className="flex flex-wrap gap-3">
              {post.fbPostId && (
                <a href={`https://www.facebook.com/${post.fbPostId}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-blue-400 hover:underline">
                  <Facebook size={11} /> View on Facebook <ExternalLink size={10} />
                </a>
              )}
              {post.igPostId && (
                <span className="flex items-center gap-1 text-[11px] text-purple-400">
                  <Instagram size={11} /> IG post ID: {post.igPostId}
                </span>
              )}
              {post.xPostId && (
                <a href={`https://x.com/i/web/status/${post.xPostId}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-sky-400 hover:underline">
                  <Twitter size={11} /> View on X <ExternalLink size={10} />
                </a>
              )}
              {post.liPostId && (
                <span className="flex items-center gap-1 text-[11px] text-blue-400">
                  <Linkedin size={11} /> LI post ID: {post.liPostId}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Monthly Campaign Planner ─────────────────────────────────────────────────
interface AdIdea {
  platform: string;
  headline: string;
  body: string;
  callToAction: string;
  imagePrompt: string;
}

const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  facebook: { label: "Facebook", color: "text-[#1877F2]", icon: <Facebook size={13} /> },
  instagram: { label: "Instagram", color: "text-purple-400", icon: <Instagram size={13} /> },
  google: { label: "Google Ads", color: "text-yellow-400", icon: <Globe size={13} /> },
  x: { label: "X", color: "text-sky-400", icon: <Twitter size={13} /> },
};

const SEASON_BADGE: Record<string, { label: string; cls: string }> = {
  peak: { label: "Peak Season", cls: "bg-green-400/10 text-green-400 border-green-400/20" },
  spring: { label: "Spring", cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" },
  summer: { label: "Summer", cls: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
  slow: { label: "Slow Season", cls: "bg-orange-400/10 text-orange-400 border-orange-400/20" },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-secondary text-muted-foreground" },
  active: { label: "Active", cls: "bg-green-400/10 text-green-400 border-green-400/20" },
  completed: { label: "Completed", cls: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
};

/** Generate the next N upcoming month values (YYYY-MM) starting from current month */
function getUpcomingMonths(count = 6): { month: string; label: string }[] {
  const result: { month: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    result.push({ month, label });
  }
  return result;
}

function CampaignPlanner() {
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [focusNotes, setFocusNotes] = useState("");
  const [showFocusInput, setShowFocusInput] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const { data: campaigns = [], isLoading } = trpc.ops.listCampaigns.useQuery();
  const { data: selected, isLoading: loadingSelected } = trpc.ops.getCampaign.useQuery(
    { id: selectedId! },
    { enabled: selectedId !== null }
  );

  const createMutation = trpc.ops.createCampaign.useMutation({
    onSuccess: (row) => {
      utils.ops.listCampaigns.invalidate();
      if (row) setSelectedId(row.id);
      toast.success("Campaign created.");
    },
    onError: (e) => toast.error(`Failed to create: ${e.message}`),
  });

  const generateMutation = trpc.ops.generateCampaign.useMutation({
    onSuccess: (row) => {
      utils.ops.listCampaigns.invalidate();
      utils.ops.getCampaign.invalidate({ id: selectedId! });
      toast.success("Campaign plan generated.");
      setShowFocusInput(false);
      setFocusNotes("");
    },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const updateMutation = trpc.ops.updateCampaign.useMutation({
    onSuccess: () => {
      utils.ops.listCampaigns.invalidate();
      utils.ops.getCampaign.invalidate({ id: selectedId! });
      setEditingNotes(false);
      toast.success("Saved.");
    },
    onError: (e) => toast.error(`Save failed: ${e.message}`),
  });

  const deleteMutation = trpc.ops.deleteCampaign.useMutation({
    onSuccess: () => {
      utils.ops.listCampaigns.invalidate();
      setSelectedId(null);
      toast.success("Campaign deleted.");
    },
    onError: (e) => toast.error(`Delete failed: ${e.message}`),
  });

  const upcomingMonths = getUpcomingMonths(6);
  const existingMonths = new Set(campaigns.map((c) => c.month));

  function handleAddMonth(month: string, label: string) {
    createMutation.mutate({ month, monthLabel: label });
  }

  function handleGenerate() {
    if (!selected) return;
    generateMutation.mutate({
      id: selected.id,
      month: selected.month,
      monthLabel: selected.monthLabel,
      focusNotes: focusNotes.trim() || undefined,
    });
  }

  const adIdeas: AdIdea[] = Array.isArray(selected?.adIdeas) ? (selected.adIdeas as AdIdea[]) : [];
  const suggestedDates: string[] = Array.isArray(selected?.suggestedDates) ? (selected.suggestedDates as string[]) : [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar size={15} className="text-primary" />
            Monthly Campaign Planner
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated ad campaign plans for upcoming months — theme, messaging angle, per-platform copy, and suggested posting dates.
          </p>
        </div>
      </div>

      <div className="flex min-h-[420px]">
        {/* Sidebar — month list */}
        <div className="w-52 shrink-0 border-r border-border flex flex-col">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Campaigns</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="px-4 py-6 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-8 bg-secondary rounded animate-pulse" />)}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-muted-foreground">No campaigns yet.</p>
                <p className="text-[11px] text-muted-foreground mt-1">Add a month below to get started.</p>
              </div>
            ) : (
              campaigns.map((c) => {
                const sb = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors hover:bg-secondary/60",
                      selectedId === c.id ? "bg-secondary" : ""
                    )}
                  >
                    <p className="text-xs font-semibold text-foreground leading-tight">{c.monthLabel}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium border", sb.cls)}>{sb.label}</span>
                      {c.theme && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{c.theme}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Add month quick-picks */}
          <div className="border-t border-border px-3 py-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Add Month</p>
            <div className="space-y-1">
              {upcomingMonths.filter(m => !existingMonths.has(m.month)).slice(0, 4).map(m => (
                <button
                  key={m.month}
                  onClick={() => handleAddMonth(m.month, m.label)}
                  disabled={createMutation.isPending}
                  className="w-full flex items-center gap-1.5 text-left px-2 py-1.5 rounded-md text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <Plus size={10} className="shrink-0" />
                  {m.label}
                </button>
              ))}
              {upcomingMonths.filter(m => !existingMonths.has(m.month)).length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">All upcoming months added.</p>
              )}
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-8">
              <Calendar size={36} className="text-muted-foreground opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a month from the list, or add one to get started.</p>
              <p className="text-xs text-muted-foreground mt-1">The AI will generate a full campaign plan — theme, messaging angle, and ad copy for each platform.</p>
            </div>
          ) : loadingSelected ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-secondary rounded animate-pulse" />)}
            </div>
          ) : selected ? (
            <div className="p-6 space-y-6">
              {/* Campaign header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-foreground">{selected.monthLabel}</h3>
                    {selected.season && SEASON_BADGE[selected.season] && (
                      <Badge className={cn("text-[10px] border", SEASON_BADGE[selected.season].cls)}>
                        {SEASON_BADGE[selected.season].label}
                      </Badge>
                    )}
                    <select
                      value={selected.status}
                      onChange={(e) => updateMutation.mutate({ id: selected.id, status: e.target.value as any })}
                      className="text-[11px] bg-secondary border border-border rounded px-2 py-0.5 text-foreground"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  {selected.theme && (
                    <p className="text-sm text-primary font-medium mt-1 italic">"{selected.theme}"</p>
                  )}
                  {selected.generatedAt && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Generated {format(new Date(selected.generatedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => setShowFocusInput(!showFocusInput)}
                  >
                    <Sparkles size={12} />
                    {selected.theme ? "Regenerate" : "Generate Plan"}
                  </Button>
                  <button
                    onClick={() => { if (confirm(`Delete the ${selected.monthLabel} campaign?`)) deleteMutation.mutate({ id: selected.id }); }}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    title="Delete campaign"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Focus notes input */}
              {showFocusInput && (
                <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-foreground">Optional: Tell the AI what to focus on</p>
                  <p className="text-[11px] text-muted-foreground">
                    Specific service, job type, upcoming event, seasonal angle, or anything else you want the campaign to emphasize.
                    Leave blank and the AI will choose the best angle for the month.
                  </p>
                  <Textarea
                    value={focusNotes}
                    onChange={(e) => setFocusNotes(e.target.value)}
                    placeholder="e.g. Focus on pasture reclamation for farmers. Emphasize fall booking window. Highlight the tracked machine on slopes."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generateMutation.isPending}
                      className="gap-1.5"
                    >
                      <Sparkles size={12} />
                      {generateMutation.isPending ? "Generating..." : "Generate Campaign Plan"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowFocusInput(false); setFocusNotes(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* No plan yet */}
              {!selected.theme && !showFocusInput && (
                <div className="bg-secondary/30 border border-dashed border-border rounded-xl px-6 py-10 text-center">
                  <Sparkles size={28} className="text-muted-foreground opacity-30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No campaign plan generated yet.</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Click Generate Plan to have the AI build a full campaign for {selected.monthLabel}.</p>
                  <Button size="sm" onClick={() => setShowFocusInput(true)} className="gap-1.5">
                    <Sparkles size={12} /> Generate Plan
                  </Button>
                </div>
              )}

              {/* Campaign overview */}
              {selected.goal && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-secondary/40 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Campaign Goal</p>
                      <p className="text-sm text-foreground">{selected.goal}</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Primary Message</p>
                      <p className="text-sm text-foreground">{selected.primaryMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ad ideas per platform */}
              {adIdeas.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ad Copy by Platform</p>
                  <div className="space-y-3">
                    {adIdeas.map((idea, i) => {
                      const meta = PLATFORM_META[idea.platform] ?? { label: idea.platform, color: "text-muted-foreground", icon: <Globe size={13} /> };
                      return (
                        <div key={i} className="bg-secondary/40 border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("flex items-center gap-1.5 text-xs font-semibold", meta.color)}>
                              {meta.icon} {meta.label}
                            </span>
                            <button
                              onClick={() => {
                                const text = `${idea.headline}\n\n${idea.body}\n\n${idea.callToAction}`;
                                navigator.clipboard.writeText(text);
                                toast.success(`${meta.label} copy copied.`);
                              }}
                              className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-0.5"
                              title="Copy to clipboard"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{idea.headline}</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{idea.body}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] font-medium text-primary border border-primary/30 rounded px-2 py-0.5">{idea.callToAction}</span>
                            {idea.imagePrompt && (
                              <span className="text-[10px] text-muted-foreground italic truncate max-w-[55%]" title={idea.imagePrompt}>
                                Photo: {idea.imagePrompt}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Suggested posting dates */}
              {suggestedDates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested Posting Dates</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedDates.map((d, i) => {
                      let label = d;
                      try { label = format(new Date(d + "T12:00:00"), "EEE, MMM d"); } catch {}
                      return (
                        <span key={i} className="flex items-center gap-1.5 text-xs bg-secondary border border-border rounded-lg px-3 py-1.5 text-foreground">
                          <CalendarClock size={11} className="text-primary" />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
                  {!editingNotes && (
                    <button
                      onClick={() => { setNotesValue(selected.notes ?? ""); setEditingNotes(true); }}
                      className="text-[11px] text-primary hover:underline"
                    >
                      {selected.notes ? "Edit" : "Add notes"}
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Notes, reminders, or changes for this campaign..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateMutation.mutate({ id: selected.id, notes: notesValue })}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? "Saving..." : "Save Notes"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : selected.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.notes}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No notes.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
