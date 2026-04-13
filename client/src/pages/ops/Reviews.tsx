/**
 * Reviews — customer review management
 * 4 KPI cards + table of review entries with source/rating/date/response status
 * Wired to tRPC ops.reviews procedures
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  google: "Google",
  facebook: "Facebook",
  yelp: "Yelp",
  other: "Other",
};

const SOURCE_COLORS: Record<string, string> = {
  google: "bg-blue-500/20 text-blue-300",
  facebook: "bg-indigo-500/20 text-indigo-300",
  yelp: "bg-red-500/20 text-red-300",
  other: "bg-white/10 text-white/50",
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

function KpiCard({ icon: Icon, label, value, sub, color }: {
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

export default function Reviews() {
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

  const { data: reviewList = [], isLoading } = trpc.ops.reviews.list.useQuery();

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
  const total = reviewList.length;
  const avgRating = total > 0 ? (reviewList.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "—";
  const fiveStars = reviewList.filter((r) => r.rating === 5).length;
  const responded = reviewList.filter((r) => r.response).length;
  const responseRate = total > 0 ? `${Math.round((responded / total) * 100)}%` : "—";

  return (
    <OpsDashboardLayout title="Reviews" subtitle="Customer feedback and reputation management">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Star} label="Avg Rating" value={avgRating} sub={`${total} total reviews`} color="bg-amber-400/10 text-amber-400" />
        <KpiCard icon={ThumbsUp} label="5-Star Reviews" value={fiveStars} sub={`${total > 0 ? Math.round((fiveStars / total) * 100) : 0}% of total`} color="bg-green-500/10 text-green-400" />
        <KpiCard icon={MessageSquare} label="Response Rate" value={responseRate} sub={`${responded} of ${total} responded`} color="bg-blue-500/10 text-blue-400" />
        <KpiCard icon={TrendingUp} label="Total Reviews" value={total} sub="All sources" color="bg-purple-500/10 text-purple-400" />
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/70">All Reviews</h2>
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-400 text-black text-xs"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Review
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-white/30 text-sm">Loading reviews...</div>
        ) : reviewList.length === 0 ? (
          <div className="p-10 text-center">
            <Star className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No reviews recorded yet.</p>
            <button className="mt-2 text-amber-400 text-xs hover:underline" onClick={() => setShowAddModal(true)}>
              Add the first one
            </button>
          </div>
        ) : (
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
              {reviewList.map((review) => (
                <tr key={review.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{review.reviewerName}</td>
                  <td className="px-4 py-3">
                    <StarRating rating={review.rating} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SOURCE_COLORS[review.source])}>
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
        )}
      </div>

      {/* Add Review Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Add Review</h3>
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
                <label className="text-xs text-white/50 mb-1 block">Review Text (optional)</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Great work, very professional..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="ghost" className="flex-1 text-white/60" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
                disabled={!form.reviewerName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, body: form.body || undefined })}
              >
                Save
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
              <h3 className="text-white font-semibold">Respond to Review</h3>
              <button onClick={() => setShowRespondModal(null)} className="text-white/30 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Thank you for your feedback..."
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" className="flex-1 text-white/60" onClick={() => setShowRespondModal(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
                disabled={!responseText.trim() || respondMutation.isPending}
                onClick={() => respondMutation.mutate({ id: showRespondModal, response: responseText.trim() })}
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
            <h3 className="text-white font-semibold mb-2">Delete Review</h3>
            <p className="text-white/60 text-sm mb-5">This review record will be permanently removed. This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-white/60" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
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
