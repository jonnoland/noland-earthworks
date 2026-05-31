/**
 * Ads Page — Noland Earthworks
 * AI-generated Facebook/Instagram/X ad copy + image with one-click posting.
 * Features: per-platform copy, photo upload, scheduling, live FB/IG preview, X.com posting.
 */
import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Send, Facebook, Instagram, Trash2, ExternalLink,
  ImageIcon, RefreshCw, CheckCircle2, Upload, Clock, Calendar,
  ChevronDown, Eye, Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

type Platform = "facebook" | "instagram" | "x" | "both" | "all";
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

interface GeneratedAllAd {
  facebook: { draft: string; headline: string };
  instagram: { draft: string; headline: string };
  x: { draft: string; headline: string };
  imagePrompt: string;
  imageUrl: string | null;
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
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  ok: boolean | undefined;
  handle?: string;
  error?: string;
  accentClass: string;
}) {
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
      <div className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2.5", accentClass)}>
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold">{label}</span>
            <CheckCircle2 size={10} className="shrink-0" />
          </div>
          {handle && <p className="text-[10px] opacity-75 truncate">{handle}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-red-400/25 bg-red-400/5 px-3 py-2.5 text-red-400">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[9px] font-medium bg-red-400/15 px-1 py-0.5 rounded uppercase tracking-wide">Error</span>
        </div>
        {error && <p className="text-[10px] opacity-75 truncate" title={error}>{error}</p>}
      </div>
    </div>
  );
}

// ─── Per-platform copy panel ──────────────────────────────────────────────────
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
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border p-4 space-y-3", accentClass)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
        {tone && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
            {tone}
          </span>
        )}
        {charLimit && (
          <span className={cn("ml-auto text-xs font-mono", draft.length > charLimit ? "text-red-400" : "text-muted-foreground")}>
            {draft.length}/{charLimit}
          </span>
        )}
        {charLimit && !tone && <span className="flex-1" />}
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
  const [adType, setAdType] = useState<AdType>("general");
  const [platform, setPlatform] = useState<Platform>("all");
  const [tone, setTone] = useState<Tone>("casual");
  const [withImage, setWithImage] = useState(true);

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

  // Photo upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scheduling state
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");

  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  const utils = trpc.useUtils();

  // Active image: uploaded photo takes priority over AI-generated
  const activeImageUrl = uploadedImageUrl ?? (platform === "all" ? generatedAll?.imageUrl : generated?.imageUrl) ?? null;

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
      setSavedPostId(null);
      setUploadedImageUrl(null);
      setUploadedImageKey(null);
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
    onSuccess: (data) => {
      utils.ops.socialPosts.list.invalidate();
      toast.success("Posted to Facebook.");
      if (data.url) window.open(data.url, "_blank");
    },
    onError: (err) => toast.error(`Facebook: ${err.message}`),
  });

  const igMutation = trpc.ops.socialPosts.publishToInstagram.useMutation({
    onSuccess: () => {
      utils.ops.socialPosts.list.invalidate();
      toast.success("Posted to Instagram.");
    },
    onError: (err) => toast.error(`Instagram: ${err.message}`),
  });

  const xMutation = trpc.ops.socialPosts.publishToX.useMutation({
    onSuccess: (data) => {
      utils.ops.socialPosts.list.invalidate();
      toast.success("Posted to X.");
      if (data.xPostId) window.open(`https://x.com/i/web/status/${data.xPostId}`, "_blank");
    },
    onError: (err) => toast.error(`X: ${err.message}`),
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

  const { data: history = [] } = trpc.ops.socialPosts.list.useQuery();

  // ─── Handlers ────────────────────────────────────────────────────────────────
  function handleGenerate() {
    if (platform === "all") {
      generateAllMutation.mutate({
        jobDescription: jobDescription.trim() || undefined,
        adType,
        tone,
        generateImage: withImage,
      });
    } else {
      generateMutation.mutate({
        jobDescription: jobDescription.trim() || undefined,
        adType,
        platform: platform as "facebook" | "instagram" | "both" | "x",
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
    const saved = await saveMutation.mutateAsync({
      jobDescription,
      draft: draft || editedFbDraft,
      headline: headline || editedFbHeadline,
      platform,
      imageUrl: activeImageUrl ?? undefined,
      imageKey: uploadedImageKey ?? undefined,
      status: "draft",
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
  async function handlePostAllPlatform(target: "facebook" | "instagram" | "x" | "all") {
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
      return;
    }
    if (target === "facebook") {
      fbMutation.mutate({ postId, message: editedFbDraft, imageUrl: activeImageUrl ?? undefined });
    } else if (target === "instagram") {
      if (!activeImageUrl) { toast.error("Instagram requires an image."); return; }
      igMutation.mutate({ postId, caption: editedIgDraft, imageUrl: activeImageUrl });
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
    let platforms: ("facebook" | "instagram" | "x")[];
    if (platform === "all") {
      platforms = ["facebook", "instagram", "x"];
    } else if (platform === "both") {
      platforms = ["facebook", "instagram"];
    } else if (platform === "x") {
      platforms = ["x"];
    } else {
      platforms = [platform as "facebook" | "instagram"];
    }
    schedulePostMutation.mutate({ id: postId, scheduledAt, platforms });
  }

  const isGenerating = generateMutation.isPending || generateAllMutation.isPending;
  const isPosting = fbMutation.isPending || igMutation.isPending || xMutation.isPending || allMutation.isPending || saveMutation.isPending;
  const hasAllGenerated = platform === "all" && generatedAll !== null;
  const hasSingleGenerated = platform !== "all" && generated !== null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate AI ad copy and images, then post directly to Facebook, Instagram, or X.
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
          <div className="grid grid-cols-3 gap-3">
            <PlatformStatusCard icon={<Facebook size={13} />} label="Facebook" loading={statusLoading}
              ok={platformStatus?.facebook.ok} handle={platformStatus?.facebook.handle ?? undefined}
              error={platformStatus?.facebook.error ?? undefined} accentClass="text-blue-400 bg-blue-400/8 border-blue-400/20" />
            <PlatformStatusCard icon={<Instagram size={13} />} label="Instagram" loading={statusLoading}
              ok={platformStatus?.instagram.ok} handle={platformStatus?.instagram.handle ?? undefined}
              error={platformStatus?.instagram.error ?? undefined} accentClass="text-pink-400 bg-pink-400/8 border-pink-400/20" />
            <PlatformStatusCard icon={<Twitter size={13} />} label="X" loading={statusLoading}
              ok={platformStatus?.x.ok} handle={platformStatus?.x.handle ?? undefined}
              error={platformStatus?.x.error ?? undefined} accentClass="text-sky-400 bg-sky-400/8 border-sky-400/20" />
          </div>
        </div>

        {/* Generator card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Generate Ad</h2>

          {/* Ad Type selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ad type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AD_TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setAdType(opt.value)} title={opt.description}
                  className={cn("px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors leading-tight",
                    adType === opt.value
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
            {adType !== "general" && (
              <p className="text-xs text-muted-foreground">{AD_TYPE_OPTIONS.find(o => o.value === adType)?.description}</p>
            )}
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
            <div className="space-y-1.5 min-w-[240px]">
              <label className="text-sm font-medium text-foreground">Platform</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {([
                  { value: "all",       label: "All Three" },
                  { value: "both",      label: "FB + IG" },
                  { value: "facebook",  label: "FB" },
                  { value: "instagram", label: "IG" },
                  { value: "x",         label: "X" },
                ] as { value: Platform; label: string }[]).map((p) => (
                  <button key={p.value} onClick={() => setPlatform(p.value)}
                    className={cn("flex-1 px-2 py-1.5 text-xs font-medium transition-colors flex items-center justify-center gap-1",
                      platform === p.value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                    )}>
                    {p.label}
                  </button>
                ))}
              </div>
              {platform === "all" && (
                <p className="text-xs text-muted-foreground">Generates separate, platform-optimized copy for Facebook, Instagram, and X.</p>
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

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 w-full sm:w-auto">
            {isGenerating
              ? <><RefreshCw size={14} className="animate-spin" /> Generating...</>
              : <><Sparkles size={14} /> {platform === "all" ? "Generate for All Platforms" : "Generate Ad"}</>
            }
          </Button>
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
                onDraftChange={(v) => { setEditedFbDraft(v); setSavedPostId(null); }}
                onHeadlineChange={(v) => { setEditedFbHeadline(v); setSavedPostId(null); }}
              >
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handlePostAllPlatform("facebook")} disabled={isPosting}
                    className="gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0">
                    <Facebook size={14} />{fbMutation.isPending ? "Posting..." : "Post to Facebook"}
                  </Button>
                  <Button variant="outline" size="sm"
                    disabled={regeneratePlatformMutation.isPending}
                    onClick={async () => {
                      const result = await regeneratePlatformMutation.mutateAsync({
                        platform: "facebook", adType, tone,
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
                      disabled={regeneratePlatformMutation.isPending}
                      onClick={async () => {
                        const result = await regeneratePlatformMutation.mutateAsync({
                          platform: "instagram", adType, tone,
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
                    disabled={regeneratePlatformMutation.isPending}
                    onClick={async () => {
                      const result = await regeneratePlatformMutation.mutateAsync({
                        platform: "x", adType, tone,
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
            </div>

            {/* Post to All Three */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
              <Button
                onClick={() => handlePostAllPlatform("all")}
                disabled={isPosting}
                className="gap-2 bg-gradient-to-r from-[#1877F2] via-[#833AB4] to-black text-white border-0 hover:opacity-90"
              >
                <Send size={14} />{isPosting ? "Posting..." : "Post to All Three"}
              </Button>
              <Button variant="outline" onClick={() => setShowScheduler(!showScheduler)}
                className={cn("gap-2", showScheduler && "border-primary/40 text-primary")}>
                <Clock size={14} />Schedule
              </Button>
              <Button variant="ghost" onClick={() => saveMutation.mutate({
                jobDescription, draft: editedFbDraft, headline: editedFbHeadline, platform: "all",
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
                    <button onClick={() => { setUploadedImageUrl(null); setUploadedImageKey(null); setSavedPostId(null); }}
                      className="text-xs text-red-400 hover:underline">Remove</button>
                  )}
                </div>
              </div>
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
              {platform === "both" && (
                <Button onClick={() => handlePost("both")} disabled={isPosting} variant="outline" className="gap-2">
                  <Send size={14} />{isPosting ? "Posting..." : "Post to Both"}
                </Button>
              )}
              <Button onClick={() => handlePost("all")} disabled={isPosting}
                className="gap-2 bg-gradient-to-r from-[#1877F2] via-[#833AB4] to-black text-white border-0 hover:opacity-90">
                <Send size={14} />{allMutation.isPending ? "Posting to all..." : "Post to All Three"}
              </Button>
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

        {/* History */}
        {history.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Ad History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 50 generated ads</p>
            </div>
            <div className="divide-y divide-border">
              {history.map((post) => (
                <HistoryRow key={post.id} post={post} onDelete={() => deleteMutation.mutate({ id: post.id })} />
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────
function HistoryRow({ post, onDelete }: { post: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const platformLabel = post.platform === "both" ? "FB + IG"
    : post.platform === "all" ? "FB + IG + X"
    : post.platform === "facebook" ? "Facebook"
    : post.platform === "instagram" ? "Instagram"
    : post.platform === "x" ? "X"
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
      {expanded && (post.fbPostId || post.igPostId || post.xPostId) && (
        <div className="mt-3 ml-[4.5rem] flex flex-wrap gap-3">
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
        </div>
      )}
    </div>
  );
}
