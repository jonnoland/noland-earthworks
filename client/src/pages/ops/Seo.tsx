/**
 * /ops/seo — SEO Audit Dashboard
 * Modeled on SEOptimer: overall grade donut, category score rings, check items
 * with pass/warn/fail indicators, prioritized recommendations, and audit history chart.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Globe,
  Link2,
  Smartphone,
  Zap,
  Share2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
type CheckStatus = "pass" | "warn" | "fail";
type Priority = "high" | "medium" | "low";
type Category = "onpage" | "links" | "usability" | "performance" | "social";

interface SeoCheck {
  id: string;
  category: Category;
  label: string;
  status: CheckStatus;
  value?: string;
  detail: string;
  recommendation?: string;
  priority: Priority;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "#22c55e";
  if (grade.startsWith("B")) return "#f59e0b";
  if (grade.startsWith("C")) return "#f97316";
  return "#ef4444";
}

function scoreColor(score: number): string {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#f59e0b";
  if (score >= 50) return "#f97316";
  return "#ef4444";
}

function statusIcon(status: CheckStatus) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
}

function priorityBadge(priority: Priority) {
  const colors: Record<Priority, string> = {
    high: "bg-red-500/15 text-red-400 border-red-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    low: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors[priority]}`}>
      {priority}
    </span>
  );
}

// ── Donut Chart (SVG) ──────────────────────────────────────────────────────────
function ScoreDonut({ score, grade, size = 120 }: { score: number; grade: string; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = gradeColor(grade);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none" style={{ color }}>
          {grade}
        </span>
        <span className="text-xs text-zinc-400 mt-0.5">{score}/100</span>
      </div>
    </div>
  );
}

// ── Small ring for category cards ──────────────────────────────────────────────
function CategoryRing({ score, grade }: { score: number; grade: string }) {
  const size = 72;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={7} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-sm font-bold leading-none" style={{ color }}>
          {grade}
        </span>
      </div>
    </div>
  );
}

// ── Category icon map ──────────────────────────────────────────────────────────
const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode }> = {
  onpage: { label: "On-Page SEO", icon: <Globe className="w-4 h-4" /> },
  links: { label: "Links", icon: <Link2 className="w-4 h-4" /> },
  usability: { label: "Usability", icon: <Smartphone className="w-4 h-4" /> },
  performance: { label: "Performance", icon: <Zap className="w-4 h-4" /> },
  social: { label: "Social", icon: <Share2 className="w-4 h-4" /> },
};

// ── Check Item Row ─────────────────────────────────────────────────────────────
function CheckRow({ check }: { check: SeoCheck }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {statusIcon(check.status)}
        <span className="flex-1 text-sm text-zinc-200">{check.label}</span>
        {check.value && (
          <span className="text-xs text-zinc-400 mr-2">{check.value}</span>
        )}
        {priorityBadge(check.priority)}
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 bg-zinc-900/60 border-t border-zinc-800 space-y-2">
          <p className="text-sm text-zinc-400">{check.detail}</p>
          {check.recommendation && (
            <div className="flex gap-2 items-start bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">{check.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Seo() {
  const utils = trpc.useUtils();

  const { data: historyData, isLoading: historyLoading } = trpc.ops.getSeoAuditHistory.useQuery({ limit: 30 });
  const runAudit = trpc.ops.runSeoAudit.useMutation({
    onSuccess: () => {
      utils.ops.getSeoAuditHistory.invalidate();
      toast.success("Audit complete — results saved.");
    },
    onError: (err) => {
      toast.error(err.message || "Audit failed.");
    },
  });

  const latest = historyData?.latest ?? null;
  const history = historyData?.history ?? [];

  // Derive category scores and grades from latest
  function catGrade(score: number) {
    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 90) return "A-";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 80) return "B-";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 70) return "C-";
    if (score >= 60) return "D";
    return "F";
  }

  const categories: Array<{ key: Category; score: number }> = latest
    ? [
        { key: "onpage", score: latest.onPageScore },
        { key: "links", score: latest.linksScore },
        { key: "usability", score: latest.usabilityScore },
        { key: "performance", score: latest.performanceScore },
        { key: "social", score: latest.socialScore },
      ]
    : [];

  const checks: SeoCheck[] = latest?.checks ?? [];
  const recommendations = latest?.recommendations ?? [];

  const chartData = [...history].reverse().map((h) => ({
    date: new Date(h.auditedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Overall: h.overallScore,
    "On-Page": h.onPageScore,
    Performance: h.performanceScore,
    Usability: h.usabilityScore,
  }));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">SEO Audit</h1>
            <p className="text-sm text-zinc-400 mt-1">
              nolandearthworks.com &mdash;{" "}
              {latest
                ? `Last audited ${new Date(latest.auditedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                : "No audit run yet"}
            </p>
          </div>
          <Button
            onClick={() => runAudit.mutate({ url: "https://nolandearthworks.com" })}
            disabled={runAudit.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${runAudit.isPending ? "animate-spin" : ""}`} />
            {runAudit.isPending ? "Auditing..." : "Run Audit"}
          </Button>
        </div>

        {/* Loading / Empty state */}
        {historyLoading && (
          <div className="flex items-center justify-center py-24 text-zinc-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading audit history...
          </div>
        )}

        {!historyLoading && !latest && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
              <Globe className="w-12 h-12 text-zinc-600" />
              <p className="text-zinc-400 text-center max-w-sm">
                No audit data yet. Click <strong className="text-zinc-200">Run Audit</strong> to analyze nolandearthworks.com and get your SEO score.
              </p>
              <Button
                onClick={() => runAudit.mutate({ url: "https://nolandearthworks.com" })}
                disabled={runAudit.isPending}
                className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${runAudit.isPending ? "animate-spin" : ""}`} />
                {runAudit.isPending ? "Auditing..." : "Run First Audit"}
              </Button>
            </CardContent>
          </Card>
        )}

        {latest && (
          <>
            {/* Overall + Category Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Overall grade */}
              <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Overall Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3 pt-2 pb-6">
                  <ScoreDonut score={latest.overallScore} grade={latest.overallGrade} size={140} />
                  <p className="text-sm text-zinc-400">
                    {recommendations.length > 0
                      ? `${recommendations.length} recommendation${recommendations.length !== 1 ? "s" : ""} to improve`
                      : "Looking good — no critical issues"}
                  </p>
                  {latest.loadTimeMs && (
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>Load: {(latest.loadTimeMs / 1000).toFixed(1)}s</span>
                      {latest.mobileScore && <span>Mobile: {latest.mobileScore}/100</span>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category rings */}
              <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Category Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {categories.map(({ key, score }) => (
                      <div key={key} className="flex flex-col items-center gap-2">
                        <CategoryRing score={score} grade={catGrade(score)} />
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-zinc-400">{CATEGORY_META[key].icon}</span>
                          <span className="text-[11px] text-zinc-400 text-center leading-tight">
                            {CATEGORY_META[key].label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                    Recommendations ({recommendations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                    >
                      <div className="mt-0.5">{priorityBadge(rec.priority as Priority)}</div>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-200">{rec.text}</p>
                        <p className="text-xs text-zinc-500 mt-0.5 capitalize">{CATEGORY_META[rec.category as Category]?.label ?? rec.category}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Check Details by Category */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-200">Detailed Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="onpage">
                  <TabsList className="bg-zinc-800 mb-4 flex-wrap h-auto gap-1">
                    {(["onpage", "links", "usability", "performance", "social"] as Category[]).map((cat) => {
                      const catChecks = checks.filter((c) => c.category === cat);
                      const fails = catChecks.filter((c) => c.status === "fail").length;
                      const warns = catChecks.filter((c) => c.status === "warn").length;
                      return (
                        <TabsTrigger key={cat} value={cat} className="text-xs gap-1.5">
                          {CATEGORY_META[cat].icon}
                          {CATEGORY_META[cat].label}
                          {fails > 0 && (
                            <span className="bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                              {fails}
                            </span>
                          )}
                          {fails === 0 && warns > 0 && (
                            <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                              {warns}
                            </span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {(["onpage", "links", "usability", "performance", "social"] as Category[]).map((cat) => (
                    <TabsContent key={cat} value={cat} className="space-y-2 mt-0">
                      {checks
                        .filter((c) => c.category === cat)
                        .sort((a, b) => {
                          const statusOrder = { fail: 0, warn: 1, pass: 2 };
                          return statusOrder[a.status] - statusOrder[b.status];
                        })
                        .map((check) => (
                          <CheckRow key={check.id} check={check} />
                        ))}
                      {checks.filter((c) => c.category === cat).length === 0 && (
                        <p className="text-zinc-500 text-sm py-4 text-center">No checks in this category.</p>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* History Chart */}
            {chartData.length > 1 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                    Score History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#71717a", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                        labelStyle={{ color: "#a1a1aa" }}
                        itemStyle={{ color: "#e4e4e7" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />
                      <Line type="monotone" dataKey="Overall" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="On-Page" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="Performance" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="Usability" stroke="#a855f7" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
