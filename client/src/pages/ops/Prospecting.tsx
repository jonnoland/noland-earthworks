/**
 * Prospecting — AI-discovered leads from public sources
 * Populated daily by the AGENT cron job (Craigslist, Facebook groups, Nextdoor, Google reviews, permit filings)
 * Jon reviews each prospect, dismisses irrelevant ones, and fires a one-click reach-out draft.
 */
import { useState } from "react";
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
  createdAt: Date;
}

export default function Prospecting() {
  const [filter, setFilter] = useState<"all" | ProspectStatus>("all");
  const [reachOutTarget, setReachOutTarget] = useState<Prospect | null>(null);
  const [reachOutText, setReachOutText] = useState("");

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
      toast.error("No phone number found for this prospect. Copy the message and reach out manually.");
      return;
    }
    sendSms.mutate({ phone, message: reachOutText.trim(), contactName: reachOutTarget.contactName ?? undefined });
  }

  const newCount = prospects.filter((p) => p.status === "new").length;
  const contactedCount = prospects.filter((p) => p.status === "contacted").length;
  const dismissedCount = prospects.filter((p) => p.status === "dismissed").length;

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
          The AI scans public sources daily for people in Tennessee asking about land clearing, brush removal, or overgrown property.
          New prospects appear here automatically. Review each one, fire a reach-out message, or dismiss it.
          The cron runs every morning — check back daily.
        </span>
      </div>

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

      {/* Filter tabs */}
      <div className="flex gap-2">
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
      ) : (
        <div className="space-y-3">
          {(prospects as Prospect[]).map((p) => (
            <Card key={p.id} className="border-zinc-700 bg-zinc-800/60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded border",
                        SOURCE_COLORS[p.source] ?? SOURCE_COLORS.other
                      )}
                    >
                      {SOURCE_LABELS[p.source] ?? p.source}
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
                    {p.location && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <MapPin className="h-3 w-3" />
                        {p.location}
                      </span>
                    )}
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
                {/* AI summary */}
                <p className="text-sm text-zinc-200">{p.summary}</p>

                {/* Original post snippet */}
                {p.postSnippet && (
                  <blockquote className="border-l-2 border-zinc-600 pl-3 text-xs text-zinc-400 italic">
                    "{p.postSnippet.length > 200 ? p.postSnippet.slice(0, 200) + "…" : p.postSnippet}"
                  </blockquote>
                )}

                {/* Action row */}
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
