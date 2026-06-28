import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Eye,
  Lightbulb,
  Wrench,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromptResult {
  prompt: string;
  category: string;
  platform: string;
  response: string;
  mentioned: boolean;
  prominence: string;
  sentiment: string;
  cited: boolean;
  score: number;
}

type AeoFixType =
  | "generate_blog_posts"
  | "fix_brand_schema"
  | "generate_faq_content"
  | "llms_txt_exists"
  | "build_backlinks"
  | "improve_sentiment"
  | "submit_directories"
  | "maintain_momentum";

interface TaggedRecommendation {
  text: string;
  fixType: AeoFixType;
  fixLabel: string;
  autoFixable: boolean;
}

interface AuditResult {
  auditId: number;
  overallScore: number;
  platformScores: Record<string, number | null>;
  mentionStats: {
    mentions: number;
    total: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    citedCount: number;
  };
  promptResults: PromptResult[];
  recommendations: TaggedRecommendation[];
  shareOfVoice: number;
}

interface FixResult {
  fixType: string;
  autoApplied: boolean;
  title: string;
  content: string;
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Weak";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#1f2937" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>{label} Visibility</span>
    </div>
  );
}

// ─── Prompt Row ───────────────────────────────────────────────────────────────

function PromptRow({ result, index }: { result: PromptResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const categoryLabels: Record<string, string> = {
    local_service: "Local Search",
    branded: "Branded",
    competitor: "Competitor",
    use_case: "Use Case",
    general: "General",
  };

  const sentimentColor = result.sentiment === "positive"
    ? "text-green-400"
    : result.sentiment === "negative"
    ? "text-red-400"
    : "text-gray-400";

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-500 text-xs w-5 shrink-0">{index + 1}</span>
        <span className="flex-1 text-sm text-gray-200 truncate">{result.prompt}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
            {categoryLabels[result.category] ?? result.category}
          </Badge>
          {result.mentioned ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-xs font-medium w-8 text-right ${result.score > 0 ? "text-green-400" : "text-gray-500"}`}>
            {result.score}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-gray-400">
              Mention: <span className={result.mentioned ? "text-green-400" : "text-red-400"}>
                {result.mentioned ? "Yes" : "No"}
              </span>
            </span>
            {result.mentioned && (
              <>
                <span className="text-gray-400">
                  Prominence: <span className="text-gray-200 capitalize">{result.prominence}</span>
                </span>
                <span className="text-gray-400">
                  Sentiment: <span className={`capitalize ${sentimentColor}`}>{result.sentiment}</span>
                </span>
                <span className="text-gray-400">
                  Domain cited: <span className={result.cited ? "text-green-400" : "text-gray-500"}>
                    {result.cited ? "Yes" : "No"}
                  </span>
                </span>
              </>
            )}
          </div>
          {result.response && result.response !== "[Query failed]" && (
            <div className="bg-gray-900 rounded p-3 text-xs text-gray-300 max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {result.response}
            </div>
          )}
          {result.response === "[Query failed]" && (
            <div className="text-xs text-red-400">Query failed — AI did not return a response.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recommendation Row ───────────────────────────────────────────────────────

function RecommendationRow({
  rec,
  index,
  onFix,
  fixResult,
  isFixPending,
}: {
  rec: TaggedRecommendation;
  index: number;
  onFix: (fixType: AeoFixType) => void;
  fixResult: FixResult | null;
  isFixPending: boolean;
}) {
  const [resultExpanded, setResultExpanded] = useState(false);

  // Auto-expand when result arrives
  const handleFix = () => {
    onFix(rec.fixType);
    setResultExpanded(true);
  };

  const buttonClass = rec.autoFixable
    ? "bg-green-700 hover:bg-green-600 text-white text-xs h-7 px-3"
    : "bg-blue-700 hover:bg-blue-600 text-white text-xs h-7 px-3";

  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden">
      {/* Rec text + button row */}
      <div className="flex gap-3 p-3 items-start">
        <span className="text-amber-400 font-bold text-sm shrink-0 mt-0.5">{index + 1}.</span>
        <p className="text-sm text-gray-300 leading-relaxed flex-1">{rec.text}</p>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <Button
            className={buttonClass}
            onClick={handleFix}
            disabled={isFixPending}
          >
            {isFixPending ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Working...
              </>
            ) : (
              <>
                <Wrench className="w-3 h-3 mr-1" />
                {rec.fixLabel}
              </>
            )}
          </Button>
          {rec.autoFixable && (
            <span className="text-xs text-green-500/70">Auto-applies</span>
          )}
        </div>
      </div>

      {/* Fix result panel */}
      {fixResult && (
        <div className="border-t border-gray-700">
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/40 transition-colors"
            onClick={() => setResultExpanded(!resultExpanded)}
          >
            <div className="flex items-center gap-2">
              {fixResult.autoApplied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span className="font-medium text-gray-200">{fixResult.title}</span>
              {fixResult.autoApplied && (
                <Badge className="bg-green-900/60 text-green-300 border-green-700 text-xs px-1.5 py-0">
                  Applied
                </Badge>
              )}
            </div>
            {resultExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {resultExpanded && (
            <div className="px-4 pb-4 pt-2 bg-gray-900/60">
              <div className="prose prose-sm prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                <Streamdown>{fixResult.content}</Streamdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AiVisibility() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [fixResults, setFixResults] = useState<Record<string, FixResult>>({});
  const [pendingFixType, setPendingFixType] = useState<string | null>(null);
  const [runningAllFixes, setRunningAllFixes] = useState(false);
  const [allFixesProgress, setAllFixesProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: latestAudit, isLoading: loadingLatest } = trpc.aiVisibility.getLatest.useQuery();
  const { data: history } = trpc.aiVisibility.getHistory.useQuery();

  const runAudit = trpc.aiVisibility.runAudit.useMutation({
    onSuccess: (data) => {
      // Normalize recommendations: handle both string[] (legacy) and TaggedRecommendation[]
      const raw = data as any;
      const recs: TaggedRecommendation[] = Array.isArray(raw.recommendations)
        ? raw.recommendations.map((r: any) =>
            typeof r === "string"
              ? { text: r, fixType: "maintain_momentum" as AeoFixType, fixLabel: "View Tips", autoFixable: false }
              : r
          )
        : [];
      setAuditResult({ ...raw, recommendations: recs } as AuditResult);
      toast.success(`Audit complete — Score: ${data.overallScore}/100`);
    },
    onError: (err) => {
      toast.error(err.message || "Audit failed.");
    },
  });

  const applyFix = trpc.aiVisibility.applyAeoFix.useMutation({
    onSuccess: (data) => {
      setFixResults(prev => ({ ...prev, [data.fixType]: data as FixResult }));
      setPendingFixType(null);
      if (data.autoApplied) {
        toast.success(data.title);
        if (data.fixType === "generate_blog_posts") {
          toast.info("Blog drafts saved — view them in the SEO tab.", { duration: 6000 });
        }
      } else {
        toast.info(data.title);
      }
    },
    onError: (err) => {
      setPendingFixType(null);
      toast.error(err.message || "Fix failed.");
    },
  });

  const handleFix = (fixType: AeoFixType) => {
    setPendingFixType(fixType);
    applyFix.mutate({ fixType });
  };

  const handleRunAllAutoFixes = async () => {
    if (!displayData) return;
    const autoFixable = displayData.recommendations.filter(r => r.autoFixable);
    if (autoFixable.length === 0) {
      toast.info("No auto-fixable recommendations in this audit.");
      return;
    }
    setRunningAllFixes(true);
    setAllFixesProgress({ done: 0, total: autoFixable.length });
    let done = 0;
    for (const rec of autoFixable) {
      try {
        const result = await applyFix.mutateAsync({ fixType: rec.fixType });
        setFixResults(prev => ({ ...prev, [result.fixType]: result as FixResult }));
      } catch (_) {
        // individual errors are toasted by the mutation's onError
      }
      done++;
      setAllFixesProgress({ done, total: autoFixable.length });
    }
    setRunningAllFixes(false);
    setAllFixesProgress(null);
    toast.success(`All ${autoFixable.length} auto-fixes applied.`);
    if (autoFixable.some(r => r.fixType === "generate_blog_posts")) {
      toast.info("Blog drafts saved — view them in the SEO tab.", { duration: 6000 });
    }
  };

  // Normalize latestAudit recommendations from DB (stored as JSON, may be string[])
  const normalizeAudit = (raw: any): AuditResult | null => {
    if (!raw) return null;
    const recs: TaggedRecommendation[] = Array.isArray(raw.recommendations)
      ? raw.recommendations.map((r: any) =>
          typeof r === "string"
            ? { text: r, fixType: "maintain_momentum" as AeoFixType, fixLabel: "View Tips", autoFixable: false }
            : r
        )
      : [];
    return { ...raw, recommendations: recs } as AuditResult;
  };

  const displayData: AuditResult | null = auditResult ?? normalizeAudit(latestAudit);

  const historyChartData = (history ?? []).map((h: any) => ({
    date: new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: h.overallScore,
    mentions: h.mentionStats?.mentions ?? 0,
  }));

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-amber-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">AI Visibility Score</h2>
            <p className="text-sm text-gray-400">
              How often Noland Earthworks appears when AI assistants answer land management questions
            </p>
          </div>
        </div>
        <Button
          onClick={() => runAudit.mutate()}
          disabled={runAudit.isPending}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {runAudit.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Running audit...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Audit
            </>
          )}
        </Button>
      </div>

      {runAudit.isPending && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4 text-sm text-amber-300">
          Querying AI with 10 Noland Earthworks-specific prompts. This takes 30–60 seconds...
        </div>
      )}

      {!displayData && !loadingLatest && !runAudit.isPending && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-10 text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No audit results yet.</p>
          <p className="text-gray-500 text-xs mt-1">Click "Run Audit" to check how visible Noland Earthworks is to AI assistants.</p>
        </div>
      )}

      {displayData && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800 md:col-span-1 flex items-center justify-center py-6">
              <ScoreGauge score={displayData.overallScore} />
            </Card>

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Mentions</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {displayData.mentionStats.mentions}
                    <span className="text-sm text-gray-500 font-normal">/{displayData.mentionStats.total}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">prompts</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400">Share of Voice</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{displayData.shareOfVoice}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">vs competitors</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400">Positive</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{displayData.mentionStats.positiveCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">mentions</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-gray-400">Domain Cited</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-400">{displayData.mentionStats.citedCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5">times</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* History Chart */}
          {historyChartData.length > 1 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Score History</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={historyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "6px" }}
                      labelStyle={{ color: "#9ca3af" }}
                      itemStyle={{ color: "#f59e0b" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ fill: "#f59e0b", r: 3 }}
                      name="Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Prompt Results */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">
                Prompt Results
                <span className="ml-2 text-xs text-gray-500 font-normal">Click any row to see the AI response</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {displayData.promptResults.map((r, i) => (
                <PromptRow key={i} result={r} index={i} />
              ))}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-sm font-medium text-gray-300">AEO Recommendations</CardTitle>
                <span className="text-xs text-gray-500 font-normal ml-1">
                  — Green buttons auto-apply; blue buttons provide step-by-step instructions
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Run All Auto Fixes button */}
              {displayData.recommendations.some(r => r.autoFixable) && (
                <div className="flex items-center justify-between pb-1 border-b border-gray-800 mb-1">
                  <span className="text-xs text-gray-500">
                    {displayData.recommendations.filter(r => r.autoFixable).length} auto-fixable recommendation{displayData.recommendations.filter(r => r.autoFixable).length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    className="bg-green-700 hover:bg-green-600 text-white text-xs h-8 px-4 gap-1.5"
                    onClick={handleRunAllAutoFixes}
                    disabled={runningAllFixes || applyFix.isPending}
                  >
                    {runningAllFixes ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {allFixesProgress
                          ? `Applying ${allFixesProgress.done + 1} of ${allFixesProgress.total}...`
                          : "Working..."}
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Run All Auto Fixes
                      </>
                    )}
                  </Button>
                </div>
              )}

              {displayData.recommendations.map((rec, i) => (
                <RecommendationRow
                  key={rec.fixType + i}
                  rec={rec}
                  index={i}
                  onFix={handleFix}
                  fixResult={fixResults[rec.fixType] ?? null}
                  isFixPending={pendingFixType === rec.fixType}
                />
              ))}
            </CardContent>
          </Card>

          {/* Audit timestamp */}
          {latestAudit && !auditResult && (
            <p className="text-xs text-gray-600 text-right">
              Last audit: {new Date((latestAudit as any).createdAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
