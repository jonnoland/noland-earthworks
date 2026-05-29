/**
 * Ads Page — Noland Earthworks
 * AI-generated Facebook/Instagram ad copy + image with one-click posting.
 * Features: photo upload, scheduling, live FB/IG preview.
 */

import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Send, Facebook, Instagram, Trash2, ExternalLink,
  ImageIcon, RefreshCw, CheckCircle2, Upload, Clock, Calendar,
  ChevronDown, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

type Platform = "facebook" | "instagram" | "both";
type Tone = "casual" | "professional";
type PreviewPlatform = "facebook" | "instagram";

interface GeneratedAd {
  draft: string;
  headline: string;
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
      {/* Tab switcher */}
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

      {/* Preview card */}
      {tab === "facebook" ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-sm">
          {/* FB Page header */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white text-[10px] font-bold shrink-0">NE</div>
            <div>
              <p className="text-xs font-semibold text-gray-900 leading-tight">Noland Earthworks</p>
              <p className="text-[10px] text-gray-500 leading-tight">Just now · <span className="text-gray-400">&#127760;</span></p>
            </div>
          </div>
          {/* Copy */}
          <div className="px-3 pb-2">
            {headline && <p className="text-xs font-bold text-gray-900 mb-1">{headline}</p>}
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 whitespace-pre-line">{draft || "Your post copy will appear here."}</p>
          </div>
          {/* Image */}
          {imageUrl ? (
            <img src={imageUrl} alt="Ad" className="w-full aspect-video object-cover" />
          ) : (
            <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-300" />
            </div>
          )}
          {/* Reactions bar */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">&#128077; Like · &#128172; Comment · &#8594; Share</span>
          </div>
        </div>
      ) : (
        /* Instagram preview */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm max-w-xs">
          {/* IG header */}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] p-0.5">
              <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center text-white text-[8px] font-bold">NE</div>
            </div>
            <p className="text-xs font-semibold text-gray-900">nolandearthworks</p>
          </div>
          {/* Image — square crop */}
          {imageUrl ? (
            <img src={imageUrl} alt="Ad" className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-300" />
            </div>
          )}
          {/* Caption */}
          <div className="px-3 py-2">
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-3 whitespace-pre-line">
              <span className="font-semibold text-gray-900">nolandearthworks </span>
              {draft || "Your caption will appear here."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Ads() {
  // Generator state
  const [jobDescription, setJobDescription] = useState("");
  const [platform, setPlatform] = useState<Platform>("both");
  const [tone, setTone] = useState<Tone>("casual");
  const [withImage, setWithImage] = useState(true);
  const [generated, setGenerated] = useState<GeneratedAd | null>(null);
  const [savedPostId, setSavedPostId] = useState<number | null>(null);
  const [editedDraft, setEditedDraft] = useState("");
  const [editedHeadline, setEditedHeadline] = useState("");

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
  const activeImageUrl = uploadedImageUrl ?? generated?.imageUrl ?? null;

  // ─── Mutations ───────────────────────────────────────────────────────────────
  const generateMutation = trpc.ops.socialPosts.generate.useMutation({
    onSuccess: (data) => {
      setGenerated(data);
      setEditedDraft(data.draft);
      setEditedHeadline(data.headline ?? "");
      setSavedPostId(null);
      // Clear uploaded photo when regenerating
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
    if (!jobDescription.trim()) { toast.error("Describe the job first."); return; }
    generateMutation.mutate({ jobDescription: jobDescription.trim(), platform, tone, generateImage: withImage });
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
        await uploadPhotoMutation.mutateAsync({
          base64,
          mimeType: file.type,
          filename: file.name,
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
    }
  }

  async function ensureSaved(): Promise<number | null> {
    if (savedPostId) return savedPostId;
    if (!generated) return null;
    const saved = await saveMutation.mutateAsync({
      jobDescription,
      draft: editedDraft,
      headline: editedHeadline,
      platform,
      imageUrl: activeImageUrl ?? undefined,
      imageKey: uploadedImageKey ?? undefined,
      status: "draft",
    });
    setSavedPostId(saved.id);
    return saved.id;
  }

  async function handlePost(target: "facebook" | "instagram" | "both") {
    const postId = await ensureSaved();
    if (!postId) { toast.error("Could not save post. Try again."); return; }
    if (target === "facebook" || target === "both") {
      fbMutation.mutate({ postId, message: editedDraft, imageUrl: activeImageUrl ?? undefined });
    }
    if (target === "instagram" || target === "both") {
      if (!activeImageUrl) { toast.error("Instagram requires an image."); return; }
      igMutation.mutate({ postId, caption: editedDraft, imageUrl: activeImageUrl });
    }
  }

  async function handleSchedule() {
    if (!scheduledDate) { toast.error("Pick a date first."); return; }
    const postId = await ensureSaved();
    if (!postId) { toast.error("Could not save post. Try again."); return; }
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    const platforms: ("facebook" | "instagram")[] = platform === "both"
      ? ["facebook", "instagram"]
      : [platform as "facebook" | "instagram"];
    schedulePostMutation.mutate({ id: postId, scheduledAt, platforms });
  }

  const isPosting = fbMutation.isPending || igMutation.isPending || saveMutation.isPending;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate AI ad copy and images, then post directly to Facebook or Instagram.
          </p>
        </div>

        {/* Generator card */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Generate Ad</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job description</label>
            <Textarea
              placeholder="Describe the job — what was cleared, where, what it looked like before and after. The more specific, the better the ad."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
              className="resize-none bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Platform */}
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-sm font-medium text-foreground">Platform</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                {(["both", "facebook", "instagram"] as Platform[]).map((p) => (
                  <button key={p} onClick={() => setPlatform(p)}
                    className={cn("flex-1 px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                      platform === p ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
                    )}>
                    {p === "both" ? "Both" : p === "facebook" ? "FB" : "IG"}
                  </button>
                ))}
              </div>
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
              <label className="text-sm font-medium text-foreground">AI image</label>
              <button onClick={() => setWithImage(!withImage)}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  withImage ? "bg-primary/10 border-primary/30 text-primary" : "bg-background border-border text-muted-foreground"
                )}>
                <ImageIcon size={13} />{withImage ? "On" : "Off"}
              </button>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={generateMutation.isPending || !jobDescription.trim()} className="gap-2">
            {generateMutation.isPending
              ? <><RefreshCw size={14} className="animate-spin" /> Generating...</>
              : <><Sparkles size={14} /> Generate Ad</>}
          </Button>
        </div>

        {/* Preview & Post card */}
        {generated && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Preview &amp; Post</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}
                  className={cn("gap-1.5 text-xs", showPreview ? "text-primary" : "text-muted-foreground")}>
                  <Eye size={12} />{showPreview ? "Hide preview" : "Live preview"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generateMutation.isPending}
                  className="gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw size={12} className={generateMutation.isPending ? "animate-spin" : ""} />Regenerate
                </Button>
              </div>
            </div>

            <div className={cn("grid gap-6", showPreview ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2")}>
              {/* Copy editor */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Headline</label>
                  <input value={editedHeadline} onChange={(e) => setEditedHeadline(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Post copy</label>
                  <Textarea value={editedDraft} onChange={(e) => setEditedDraft(e.target.value)} rows={8}
                    className="resize-none bg-background border-border text-foreground text-sm" />
                  <p className="text-xs text-muted-foreground text-right">{editedDraft.length} chars</p>
                </div>
              </div>

              {/* Image panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Image</label>
                  <button onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors">
                    {isUploading ? <><RefreshCw size={11} className="animate-spin" /> Uploading...</> : <><Upload size={11} /> Upload photo</>}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>

                {activeImageUrl ? (
                  <div className="relative group">
                    <img src={activeImageUrl} alt="Ad image"
                      className="w-full aspect-square object-cover rounded-xl border border-border" />
                    {uploadedImageUrl && (
                      <div className="absolute top-2 left-2">
                        <Badge className="text-[10px] bg-green-400/10 text-green-400 border-green-400/20">Your photo</Badge>
                      </div>
                    )}
                    <button onClick={() => { setUploadedImageUrl(null); setUploadedImageKey(null); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-1"
                      title={uploadedImageUrl ? "Remove uploaded photo" : "Remove image"}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square bg-secondary rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors">
                    <Upload size={28} className="opacity-30" />
                    <p className="text-xs">Upload a job photo</p>
                    <p className="text-xs opacity-60">or enable AI image above</p>
                  </button>
                )}
              </div>

              {/* Live preview panel */}
              {showPreview && (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Live preview</label>
                  <SocialPreview
                    platform={platform === "instagram" ? "instagram" : "facebook"}
                    headline={editedHeadline}
                    draft={editedDraft}
                    imageUrl={activeImageUrl}
                  />
                </div>
              )}
            </div>

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
              {platform === "both" && (
                <Button onClick={() => handlePost("both")} disabled={isPosting} variant="outline" className="gap-2">
                  <Send size={14} />{isPosting ? "Posting..." : "Post to Both"}
                </Button>
              )}

              {/* Schedule button */}
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
                  <Button onClick={handleSchedule} disabled={schedulePostMutation.isPending || !scheduledDate}
                    size="sm" className="gap-1.5">
                    <Clock size={12} />{schedulePostMutation.isPending ? "Scheduling..." : "Confirm schedule"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The post will be queued and published automatically at the scheduled time.
                </p>
              </div>
            )}

            {/* Post result feedback */}
            {(fbMutation.isSuccess || igMutation.isSuccess) && (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/5 border border-green-400/20 rounded-lg px-4 py-2.5">
                <CheckCircle2 size={14} />
                Posted successfully.
                {fbMutation.data?.url && (
                  <a href={fbMutation.data.url} target="_blank" rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-xs underline">
                    View on Facebook <ExternalLink size={11} />
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
    : post.platform === "facebook" ? "Facebook"
    : post.platform === "instagram" ? "Instagram"
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
      {expanded && (post.fbPostId || post.igPostId) && (
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
        </div>
      )}
    </div>
  );
}
