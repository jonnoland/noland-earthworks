/**
 * Reviews — live review feed from Google Places API and Facebook Graph API.
 * Also displays the local manual review log.
 * KPI cards | Source tabs (All / Google / Facebook / Manual) | Review cards
 */
import { useState } from "react";
import OpsDashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Star,
  Plus,
  MessageSquare,
  ThumbsUp,
  TrendingUp,
  Clock,
  Trash2,
  Reply,
  X,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  yelp: "Yelp",
  other: "Other",
};

const SOURCE_COLORS: Record<string, string> = {
  google: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  facebook: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  yelp: "bg-red-500/20 text-red-300 border-red-500/30",
  other: "bg-white/10 text-white/50 border-white/10",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-3.5 w-3.5", n <= rating ? "fill-amber-400 text-amber-400" : "text-white/20")}
        />
      ))}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[#161616] border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}

function ConfigNotice({ source }: { source: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-xs text-amber-300">
      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        {source} credentials not configured. Add <code className="font-mono bg-white/10 px-1 rounded">
          {source === "Google" ? "GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID" : "FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN"}
        </code> in Settings &gt; Secrets to enable live {source} reviews.
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SourceFilter = "all" | "google" | "facebook" | "manual";

export default function Reviews() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    source: "google" as "google" | "facebook" | "yelp" | "other",
    reviewerName: "",
    rating: 5,
    body: "",
  });

  const utils = trpc.useUtils();

  // Live reviews from Google Places + Facebook
  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = trpc.reviewsLive.getLive.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  // Manual reviews from local DB
  const { data: manualList = [], isLoading: manualLoading } = trpc.ops.reviews.list.useQuery();

  const syncMutation = trpc.reviewsLive.syncToLocal.useMutation({
    onSuccess: (res) => {
      toast.success(`Synced ${res.synced} new review${res.synced !== 1 ? "s" : ""} to local log.`);
      utils.ops.reviews.list.invalidate();
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  const createMutation = trpc.ops.reviews.create.useMutation({
    onSuccess: () => {
      setShowAddModal(false);
      setForm({ source: "google", reviewerName: "", rating: 5, body: "" });
      utils.ops.reviews.list.invalidate();
      toast.success("Review added.");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const respondMutation = trpc.ops.reviews.respond.useMutation({
    onSuccess: () => {
      setShowRespondModal(null);
      setResponseText("");
      utils.ops.reviews.list.invalidate();
      toast.success("Response saved.");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const deleteMutation = trpc.ops.reviews.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      utils.ops.reviews.list.invalidate();
      toast.success("Review deleted.");
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  });

  // KPI calculations
  const liveReviews = liveData?.reviews ?? [];
  const allForKpi = [...liveReviews, ...manualList.map((r) => ({ ...r, source: r.source as string, body: r.body ?? "", reviewedAt: r.reviewedAt.toISOString?.() ?? String(r.reviewedAt) }))];
  const totalKpi = allForKpi.length;
  const avgRating = totalKpi > 0 ? (allForKpi.reduce((s, r) => s + r.rating, 0) / totalKpi).toFixed(1) : "—";
  const fiveStars = allForKpi.filter((r) => r.rating === 5).length;
  const responded = manualList.filter((r) => r.response).length;
  const responseRate = manualList.length > 0 ? `${Math.round((responded / manualList.length) * 100)}%` : "—";

  // Filtered live reviews
  const filteredLive = liveReviews.filter((r) =>
    sourceFilter === "all" ? true : sourceFilter === "manual" ? false : r.source === sourceFilter
  );
  const showManual = sourceFilter === "all" || sourceFilter === "manual";

  const isLoading = liveLoading || manualLoading;

  return (
    <OpsDashboardLayout title="Reviews" subtitle="Live reputation feed and response management">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Star}
          label="Avg Rating"
          value={liveData?.googleRating ? `${liveData.googleRating}` : avgRating}
          sub={liveData?.googleReviewCount ? `${liveData.googleReviewCount} Google reviews` : `${totalKpi} total reviews`}
          color="bg-amber-400/10 text-amber-400"
        />
        <KpiCard
          icon={ThumbsUp}
          label="5-Star Reviews"
          value={fiveStars}
          sub={`${totalKpi > 0 ? Math.round((fiveStars / totalKpi) * 100) : 0}% of total`}
          color="bg-green-500/10 text-green-400"
        />
        <KpiCard
          icon={MessageSquare}
          label="Response Rate"
          value={responseRate}
          sub={`${responded} of ${manualList.length} responded`}
          color="bg-blue-500/10 text-blue-400"
        />
        <KpiCard
          icon={TrendingUp}
          label="Facebook Rating"
          value={liveData?.facebookRating ? `${liveData.facebookRating}` : "—"}
          sub={liveData?.facebookReviewCount ? `${liveData.facebookReviewCount} ratings` : "Not configured"}
          color="bg-indigo-500/10 text-indigo-400"
        />
      </div>

      {/* Config notices */}
      <div className="space-y-2 mb-4">
        {liveData && !liveData.googleConfigured && <ConfigNotice source="Google" />}
        {liveData && !liveData.facebookConfigured && <ConfigNotice source="Facebook" />}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Source tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {(["all", "google", "facebook", "manual"] as SourceFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setSourceFilter(tab)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                sourceFilter === tab
                  ? "bg-amber-500 text-black"
                  : "text-white/50 hover:text-white"
              )}
            >
              {tab === "all" ? "All" : tab === "manual" ? "Manual Log" : SOURCE_LABELS[tab]}
              {tab === "google" && liveData?.googleReviewCount ? ` (${liveData.googleReviewCount})` : ""}
              {tab === "facebook" && liveData?.facebookReviewCount ? ` (${liveData.facebookReviewCount})` : ""}
              {tab === "manual" ? ` (${manualList.length})` : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-white/10 text-white/60 hover:text-white"
            onClick={() => { refetchLive(); toast.info("Refreshing live reviews..."); }}
            disabled={liveLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", liveLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-white/10 text-white/60 hover:text-white"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !liveData?.googleConfigured}
            title="Sync Google reviews to local log"
          >
            Sync to Log
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Live Review Cards */}
      {(sourceFilter === "all" || sourceFilter === "google" || sourceFilter === "facebook") && (
        <div className="space-y-3 mb-6">
          {isLoading ? (
            <div className="p-8 text-center text-white/30 text-sm">Loading live reviews...</div>
          ) : filteredLive.length === 0 ? (
            <div className="p-6 text-center text-white/30 text-sm bg-[#111] border border-white/10 rounded-xl">
              {liveData?.googleConfigured || liveData?.facebookConfigured
                ? "No reviews found."
                : "Configure API credentials above to see live reviews."}
            </div>
          ) : (
            filteredLive.map((review) => (
              <div key={review.id} className="bg-[#111] border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {review.reviewerPhotoUrl ? (
                      <img
                        src={review.reviewerPhotoUrl}
                        alt={review.reviewerName}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white/40 text-sm font-bold">
                        {review.reviewerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{review.reviewerName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={review.rating} />
                        <span className="text-[10px] text-white/30">
                          {new Date(review.reviewedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", SOURCE_COLORS[review.source])}>
                      {SOURCE_LABELS[review.source]}
                    </span>
                    {review.replyUrl && (
                      <a
                        href={review.replyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-amber-400 transition-colors p-1"
                        title="Reply on Google"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                {review.body && (
                  <p className="text-xs text-white/60 mt-3 leading-relaxed">{review.body}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Manual Review Table */}
      {showManual && manualList.length > 0 && (
        <>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Manual Review Log</h2>
          <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Reviewer</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Rating</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden md:table-cell">Review</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {manualList.map((review) => (
                  <tr key={review.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-white font-medium">{review.reviewerName}</td>
                    <td className="px-4 py-3">
                      <StarRating rating={review.rating} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", SOURCE_COLORS[review.source])}>
                        {SOURCE_LABELS[review.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-white/50 max-w-xs truncate">{review.body || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {review.response ? (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <Reply className="h-3 w-3" /> Responded
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-white/30">
                      {new Date(review.reviewedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          className="text-white/30 hover:text-amber-400 transition-colors p-1"
                          title="Respond"
                          onClick={() => { setShowRespondModal(review.id); setResponseText(review.response ?? ""); }}
                        >
                          <Reply className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="text-white/30 hover:text-red-400 transition-colors p-1"
                          title="Delete"
                          onClick={() => setDeleteId(review.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Review Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Add Manual Review</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/30 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Reviewer Name</label>
                <Input
                  value={form.reviewerName}
                  onChange={(e) => setForm({ ...form, reviewerName: e.target.value })}
                  placeholder="John Smith"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as typeof form.source })}
                    className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                  >
                    <option value="google">Google</option>
                    <option value="facebook">Facebook</option>
                    <option value="yelp">Yelp</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Rating</label>
                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Review Text</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="What did the customer say?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" className="border-white/10 text-white/60" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black"
                disabled={!form.reviewerName || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                Add Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {showRespondModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Add Response</h3>
              <button onClick={() => setShowRespondModal(null)} className="text-white/30 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Write your response..."
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" className="border-white/10 text-white/60" onClick={() => setShowRespondModal(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black"
                disabled={!responseText || respondMutation.isPending}
                onClick={() => respondMutation.mutate({ id: showRespondModal, response: responseText })}
              >
                Save Response
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Review?</h3>
            <p className="text-sm text-white/50 mb-5">This will permanently remove the review from your local log.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="border-white/10 text-white/60" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-400 text-white"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: deleteId })}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </OpsDashboardLayout>
  );
}
