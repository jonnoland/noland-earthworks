import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkles,
  Copy,
  Trash2,
  Loader2,
  Share2,
  CheckCircle2,
  Facebook,
  Instagram,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Platform = "facebook" | "instagram" | "both";
type Tone = "casual" | "professional";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function platformLabel(p: string) {
  if (p === "facebook") return "Facebook";
  if (p === "instagram") return "Instagram";
  return "Facebook & Instagram";
}

function platformColor(p: string) {
  if (p === "facebook") return "bg-blue-600/20 text-blue-400 border-blue-600/30";
  if (p === "instagram") return "bg-pink-600/20 text-pink-400 border-pink-600/30";
  return "bg-violet-600/20 text-violet-400 border-violet-600/30";
}

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SocialPosts() {
  const [jobDescription, setJobDescription] = useState("");
  const [platform, setPlatform] = useState<Platform>("both");
  const [tone, setTone] = useState<Tone>("casual");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();

  const generateMutation = trpc.ops.socialPosts.generate.useMutation({
    onSuccess: (data) => {
      setDraft(data.draft);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate post. Try again.");
    },
  });

  const saveMutation = trpc.ops.socialPosts.savePost.useMutation({
    onSuccess: () => {
      toast.success("Post saved to history.");
      utils.ops.socialPosts.list.invalidate();
    },
    onError: () => toast.error("Failed to save post."),
  });

  const deleteMutation = trpc.ops.socialPosts.delete.useMutation({
    onSuccess: () => {
      toast.success("Post deleted.");
      utils.ops.socialPosts.list.invalidate();
    },
    onError: () => toast.error("Failed to delete post."),
  });

  const { data: savedPosts, isLoading: postsLoading } = trpc.ops.socialPosts.list.useQuery();

  function handleGenerate() {
    if (!jobDescription.trim()) {
      toast.error("Describe the job first.");
      return;
    }
    setDraft("");
    generateMutation.mutate({ jobDescription: jobDescription.trim(), platform, tone });
  }

  function handleCopy() {
    if (!draft) return;
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSave() {
    if (!draft) return;
    saveMutation.mutate({ jobDescription, draft, platform, published: false });
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Social Posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe a completed job and generate a ready-to-post Facebook or Instagram caption in your voice.
          </p>
        </div>

        {/* Generator Card */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Share2 className="w-4 h-4 text-orange-400" />
              Generate Post
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Job description input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Job Description</label>
              <Textarea
                placeholder="e.g. Cleared 4 acres of thick cedar and overgrown brush off a fence line in Maury County. Customer wanted to reclaim pasture that had been overtaken for years. Left it clean with the mulcher — no piles, no hauling."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={4}
                className="resize-none text-sm"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{jobDescription.length}/1000</p>
            </div>

            {/* Platform selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Platform</label>
              <div className="flex gap-2 flex-wrap">
                {(["both", "facebook", "instagram"] as Platform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      platform === p
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                        : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                    )}
                  >
                    {p === "both" ? "Facebook & Instagram" : p === "facebook" ? "Facebook only" : "Instagram only"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tone</label>
              <div className="flex gap-2">
                {(["casual", "professional"] as Tone[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors capitalize",
                      tone === t
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                        : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !jobDescription.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate Post</>
              )}
            </Button>

            {/* Draft output */}
            {draft && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated Draft</span>
                  <Badge variant="outline" className={cn("text-xs", platformColor(platform))}>
                    {platformLabel(platform)}
                  </Badge>
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={6}
                  className="resize-none text-sm font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-1"
                  >
                    {copied ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1.5 text-green-400" />Copied</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1.5" />Copy</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                  >
                    {saveMutation.isPending ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1.5" />Saving...</>
                    ) : (
                      "Save to History"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post History */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saved Posts</h2>
          {postsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading history...
            </div>
          ) : !savedPosts || savedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No saved posts yet. Generate a post and click "Save to History" to keep it here.
            </p>
          ) : (
            <div className="space-y-3">
              {savedPosts.map((post) => (
                <Card key={post.id} className="border-border bg-card">
                  <CardContent className="pt-4 pb-4 space-y-3">
                    {/* Meta row */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs", platformColor(post.platform))}>
                          {post.platform === "facebook" ? (
                            <Facebook className="w-3 h-3 mr-1" />
                          ) : post.platform === "instagram" ? (
                            <Instagram className="w-3 h-3 mr-1" />
                          ) : null}
                          {platformLabel(post.platform)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                        onClick={() => deleteMutation.mutate({ id: post.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Job description */}
                    <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-3 leading-relaxed">
                      {post.jobDescription}
                    </p>

                    {/* Draft */}
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.draft}</p>

                    {/* Copy button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        navigator.clipboard.writeText(post.draft);
                        toast.success("Copied to clipboard.");
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1.5" />
                      Copy Post
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
