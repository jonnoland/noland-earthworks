/**
 * /ops/seo — SEO Hub
 * Four tabs modeled on SEOptimer + SORO:
 *   1. Audit       — overall grade, category rings, check items, history chart
 *   2. Keywords    — AI keyword research, save/star, filter by intent/difficulty
 *   3. Write       — AI article generator in Jon's brand voice
 *   4. Content     — library of saved drafts with slide-out detail/edit panel
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
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
  Search,
  Star,
  Trash2,
  FileText,
  PenLine,
  BookOpen,
  X,
  Copy,
  CheckCheck,
  Loader2,
  Sparkles,
  Wrench,
  Bot,
  Send,
} from "lucide-react";
import { AIChatBox, type Message as ChatMessage } from "@/components/AIChatBox";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────
type CheckStatus = "pass" | "warn" | "fail";
type Priority = "high" | "medium" | "low";
type Category = "onpage" | "links" | "usability" | "performance" | "social";
type ArticleStatus = "draft" | "ready" | "published";
type FixStatus = "pending" | "in_progress" | "resolved" | "skipped";

interface SeoFixRow {
  id: number;
  auditId: number;
  checkId: string;
  category: string;
  label: string;
  checkStatus: string;
  priority: string;
  /** AI-generated research context: why this issue matters for SEO */
  researchContext: string | null;
  aiInstructions: string;
  status: FixStatus;
  note: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SeoCheck {
  id: string;
  category: Category;
  label: string;
  status: CheckStatus;
  value?: string;
  detail: string;
  recommendation?: string;
  /** Ready-to-paste code snippet or step-by-step instructions showing exactly how to fix this check. */
  fixExample?: string;
  priority: Priority;
}

interface KeywordRow {
  id: number;
  keyword: string;
  intent: string;
  difficulty: string;
  volumeRange: string | null;
  rationale: string | null;
  contentType: string | null;
  saved: boolean;
  targeted: boolean;
  createdAt: Date;
}

interface ArticleRow {
  id: number;
  targetKeyword: string;
  title: string;
  metaDescription: string | null;
  bodyMarkdown: string;
  wordCount: number | null;
  status: ArticleStatus;
  notes: string | null;
  keywordId: number | null;
  createdAt: Date;
  updatedAt: Date;
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

function difficultyBadge(difficulty: string) {
  const map: Record<string, string> = {
    easy: "bg-green-500/15 text-green-400 border-green-500/30",
    medium: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    hard: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  const cls = map[difficulty.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls} capitalize`}>
      {difficulty}
    </span>
  );
}

function intentBadge(intent: string) {
  const map: Record<string, string> = {
    transactional: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    local: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    informational: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  };
  const cls = map[intent.toLowerCase()] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls} capitalize`}>
      {intent}
    </span>
  );
}

function statusBadge(status: ArticleStatus) {
  const map: Record<ArticleStatus, string> = {
    draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    ready: "bg-green-500/15 text-green-400 border-green-500/30",
    published: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${map[status]} capitalize`}>
      {status}
    </span>
  );
}

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

// ── Fix Status Badge ──────────────────────────────────────────────────────────
function fixStatusBadge(status: FixStatus) {
  const map: Record<FixStatus, string> = {
    pending: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    resolved: "bg-green-500/15 text-green-400 border-green-500/30",
    skipped: "bg-zinc-600/15 text-zinc-500 border-zinc-600/30",
  };
  const labels: Record<FixStatus, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    resolved: "Resolved",
    skipped: "Skipped",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Fix Issues Panel ──────────────────────────────────────────────────────────
type ApplyAllResult = {
  fixId: number;
  label: string;
  category: string;
  priority: string;
  status: "applied" | "failed";
  snippet: string;
  error?: string;
};

function FixIssuesPanel({
  fixes,
  auditId,
  isGenerating,
  onGenerate,
  onUpdateStatus,
  onRefetch,
}: {
  fixes: SeoFixRow[];
  auditId: number;
  isGenerating: boolean;
  onGenerate: () => void;
  onUpdateStatus: (id: number, status: FixStatus) => void;
  onRefetch: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | FixStatus>("all");
  const [applyingFixId, setApplyingFixId] = useState<number | null>(null);
  const [snippets, setSnippets] = useState<{ [key: number]: string }>({});
  const [applyAllResults, setApplyAllResults] = useState<ApplyAllResult[] | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);

  const applyAll = trpc.ops.applyAllSeoFixes.useMutation({
    onSuccess: (data) => {
      setApplyAllResults(data.results);
      onRefetch();
      const applied = data.results.filter((r) => r.status === "applied").length;
      const failed = data.results.filter((r) => r.status === "failed").length;
      if (failed === 0) {
        toast.success(`All ${applied} fixes applied and marked resolved.`);
      } else {
        toast.warning(`${applied} applied, ${failed} failed. See results below.`);
      }
    },
    onError: (err) => toast.error(err.message || "Apply All failed."),
  });

  const applyFix = trpc.ops.applySeoFix.useMutation({
    onSuccess: (data, variables) => {
      setSnippets((prev) => ({ ...prev, [variables.fixId]: String(data.snippet) }));
      setApplyingFixId(null);
    },
    onError: (err) => {
      setApplyingFixId(null);
      toast.error(err.message || "Failed to generate fix snippet.");
    },
  });

  const handleApplyFix = (fixId: number) => {
    setApplyingFixId(fixId);
    applyFix.mutate({ fixId, auditId });
  };

  const filtered = fixes.filter((f) => filter === "all" || f.status === filter);
  const resolved = fixes.filter((f) => f.status === "resolved").length;
  const total = fixes.length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            Fix Issues
            {total > 0 && (
              <span className="text-xs text-zinc-500 font-normal">
                {resolved}/{total} resolved
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating || applyAll.isPending}
              className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating fixes...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> {total > 0 ? "Regenerate Fixes" : "Generate AI Fixes"}</>
              )}
            </Button>
            {total > resolved && total > 0 && (
              <Button
                size="sm"
                onClick={() => applyAll.mutate({ auditId })}
                disabled={applyAll.isPending || isGenerating}
                className="bg-green-700 hover:bg-green-600 text-white gap-2"
              >
                {applyAll.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying all...</>
                ) : (
                  <><CheckCheck className="w-3.5 h-3.5" /> Apply All Fixes</>
                )}
              </Button>
            )}
          </div>
        </div>
        {total > 0 && (
          <div className="mt-3">
            {/* Progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (resolved / total) * 100 : 0}%` }}
              />
            </div>
            {/* Filter tabs */}
            <div className="flex gap-1 flex-wrap">
              {(["all", "pending", "in_progress", "resolved", "skipped"] as Array<"all" | FixStatus>).map((f) => {
                const count = f === "all" ? total : fixes.filter((x) => x.status === f).length;
                if (f !== "all" && count === 0) return null;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                      filter === f
                        ? "bg-orange-600/20 border-orange-500/40 text-orange-300"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    }`}
                  >
                    {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
                    {count > 0 && <span className="ml-1 text-zinc-500">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {total === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Sparkles className="w-8 h-8 text-zinc-600" />
            <p className="text-sm text-zinc-400 max-w-sm">
              Click <strong className="text-zinc-200">Generate AI Fixes</strong> to get step-by-step instructions for every failed and warned check in this audit.
            </p>
          </div>
        )}
        {isGenerating && (
          <div className="space-y-3">
            {/* Status label */}
            <div className="flex items-center gap-2 px-1 pb-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
              <span className="text-xs text-zinc-400">Researching issues and generating fix instructions…</span>
            </div>
            {/* Skeleton cards — one per simulated fix row */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-lg overflow-hidden animate-pulse">
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-4 h-4 rounded-full bg-zinc-700 shrink-0" />
                  <div className="flex-1 h-3.5 bg-zinc-700 rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                  <div className="w-14 h-3 bg-zinc-800 rounded" />
                  <div className="w-10 h-4 bg-zinc-800 rounded-full" />
                </div>
                {/* Expanded preview for first two cards */}
                {i < 2 && (
                  <div className="px-4 pb-4 pt-2 bg-zinc-900/40 border-t border-zinc-800 space-y-3">
                    {/* Why This Matters skeleton */}
                    <div className="rounded-md border border-blue-900/30 bg-blue-950/10 p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 rounded bg-blue-800/50" />
                        <div className="w-28 h-2.5 bg-blue-800/50 rounded" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2.5 bg-zinc-700/60 rounded w-full" />
                        <div className="h-2.5 bg-zinc-700/60 rounded w-5/6" />
                        <div className="h-2.5 bg-zinc-700/60 rounded w-4/6" />
                      </div>
                    </div>
                    {/* Fix instructions skeleton */}
                    <div className="space-y-1.5">
                      <div className="h-2.5 bg-zinc-700/50 rounded w-full" />
                      <div className="h-2.5 bg-zinc-700/50 rounded w-11/12" />
                      <div className="h-2.5 bg-zinc-700/50 rounded w-3/4" />
                      <div className="h-2.5 bg-zinc-700/50 rounded w-5/6" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {!isGenerating && filtered.map((fix) => {
          const isExpanded = expandedId === fix.id;
          return (
            <div
              key={fix.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                fix.status === "resolved"
                  ? "border-green-800/40 bg-green-900/5"
                  : fix.status === "skipped"
                  ? "border-zinc-800/50 opacity-60"
                  : "border-zinc-800"
              }`}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : fix.id)}
              >
                {fix.status === "resolved" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : fix.checkStatus === "fail" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className={`flex-1 text-sm ${
                  fix.status === "resolved" ? "text-zinc-500 line-through" : "text-zinc-200"
                }`}>
                  {fix.label}
                </span>
                <span className="text-[10px] text-zinc-500 capitalize mr-1">{CATEGORY_META[fix.category as Category]?.label ?? fix.category}</span>
                {priorityBadge(fix.priority as Priority)}
                {fixStatusBadge(fix.status)}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500 ml-1 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500 ml-1 shrink-0" />
                )}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 bg-zinc-900/60 border-t border-zinc-800 space-y-4">
                  {/* Research context — why this issue matters */}
                  {fix.researchContext && (
                    <div className="rounded-md border border-blue-800/40 bg-blue-950/20 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Search className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-medium text-blue-300 uppercase tracking-wide">Why This Matters</span>
                      </div>
                      <p className="text-sm text-blue-100/80 leading-relaxed">{fix.researchContext}</p>
                    </div>
                  )}
                  {/* AI instructions */}
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>{fix.aiInstructions}</Streamdown>
                  </div>
                  {/* Apply Fix snippet */}
                  {snippets[fix.id] && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-orange-400 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5" /> Ready-to-Apply Fix
                        </p>
                        <button
                          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(snippets[fix.id]);
                            toast.success("Copied to clipboard.");
                          }}
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-700 rounded-md p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-64">
                        {snippets[fix.id]}
                      </div>
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {fix.status !== "resolved" && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-orange-700/20 hover:bg-orange-700/40 text-orange-400 border border-orange-700/40"
                          variant="outline"
                          disabled={applyingFixId === fix.id}
                          onClick={() => handleApplyFix(fix.id)}
                        >
                          {applyingFixId === fix.id ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                          ) : (
                            <><Wrench className="w-3.5 h-3.5" /> {snippets[fix.id] ? "Regenerate Fix" : "Apply Fix"}</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-400 border border-green-700/40"
                          variant="outline"
                          onClick={() => onUpdateStatus(fix.id, "resolved")}
                        >
                          <CheckCheck className="w-3.5 h-3.5" /> Mark Resolved
                        </Button>
                      </>
                    )}
                    {fix.status === "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                        onClick={() => onUpdateStatus(fix.id, "pending")}
                      >
                        Reopen
                      </Button>
                    )}
                    {fix.status !== "in_progress" && fix.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-blue-700/40 text-blue-400 hover:bg-blue-900/20"
                        onClick={() => onUpdateStatus(fix.id, "in_progress")}
                      >
                        Mark In Progress
                      </Button>
                    )}
                    {fix.status !== "skipped" && fix.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-zinc-700 text-zinc-400 hover:bg-zinc-800 ml-auto"
                        onClick={() => onUpdateStatus(fix.id, "skipped")}
                      >
                        Skip
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      {/* Apply All Results Panel */}
      {applyAllResults && applyAllResults.length > 0 && (
        <div className="mt-4 border border-zinc-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/60 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-zinc-200">Apply All — Results</span>
              <span className="text-xs text-zinc-500">
                {applyAllResults.filter((r) => r.status === "applied").length} applied
                {applyAllResults.filter((r) => r.status === "failed").length > 0 && (
                  <>, {applyAllResults.filter((r) => r.status === "failed").length} failed</>
                )}
              </span>
            </div>
            <button
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              onClick={() => setApplyAllResults(null)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-zinc-800">
            {applyAllResults.map((result) => (
              <div key={result.fixId} className="bg-zinc-900">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
                  onClick={() => setExpandedResultId(expandedResultId === result.fixId ? null : result.fixId)}
                >
                  {result.status === "applied" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="flex-1 text-sm text-zinc-200">{result.label}</span>
                  <span className="text-[10px] text-zinc-500 capitalize mr-2">
                    {CATEGORY_META[result.category as Category]?.label ?? result.category}
                  </span>
                  {priorityBadge(result.priority as Priority)}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ml-1 ${
                    result.status === "applied"
                      ? "bg-green-900/40 text-green-400"
                      : "bg-red-900/40 text-red-400"
                  }`}>
                    {result.status === "applied" ? "Applied" : "Failed"}
                  </span>
                  {expandedResultId === result.fixId ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500 ml-1 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 ml-1 shrink-0" />
                  )}
                </button>
                {expandedResultId === result.fixId && (
                  <div className="px-4 pb-4 pt-2 bg-zinc-900/60 border-t border-zinc-800 space-y-3">
                    {result.status === "failed" && result.error && (
                      <div className="rounded-md border border-red-800/40 bg-red-950/20 p-3">
                        <p className="text-xs text-red-300">{result.error}</p>
                      </div>
                    )}
                    {result.snippet && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-orange-400 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" /> Applied Fix
                          </p>
                          <button
                            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                            onClick={() => {
                              navigator.clipboard.writeText(result.snippet);
                              toast.success("Copied to clipboard.");
                            }}
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-700 rounded-md p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap overflow-x-auto max-h-64">
                          {result.snippet}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
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

const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode }> = {
  onpage: { label: "On-Page SEO", icon: <Globe className="w-4 h-4" /> },
  links: { label: "Links", icon: <Link2 className="w-4 h-4" /> },
  usability: { label: "Usability", icon: <Smartphone className="w-4 h-4" /> },
  performance: { label: "Performance", icon: <Zap className="w-4 h-4" /> },
  social: { label: "Social", icon: <Share2 className="w-4 h-4" /> },
};

function CheckRow({ check }: { check: SeoCheck }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!check.fixExample) return;
    navigator.clipboard.writeText(check.fixExample).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {statusIcon(check.status)}
        <span className="flex-1 text-sm text-zinc-200">{check.label}</span>
        {check.value && <span className="text-xs text-zinc-400 mr-2">{check.value}</span>}
        {priorityBadge(check.priority)}
        {open ? (
          <ChevronUp className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 bg-zinc-900/60 border-t border-zinc-800 space-y-3">
          {/* Detail text */}
          <p className="text-sm text-zinc-400">{check.detail}</p>

          {/* Recommendation banner */}
          {check.recommendation && (
            <div className="flex gap-2 items-start bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">{check.recommendation}</p>
            </div>
          )}

          {/* Fix example block */}
          {check.fixExample && (
            <div className="rounded-md border border-zinc-700 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/80 border-b border-zinc-700">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-orange-300 uppercase tracking-wide">How to fix</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded hover:bg-zinc-700"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <><CheckCheck className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>
                  )}
                </button>
              </div>
              {/* Code / instructions body */}
              <pre className="text-xs text-zinc-300 leading-relaxed p-3 overflow-x-auto whitespace-pre-wrap break-words bg-zinc-950/60 font-mono">{check.fixExample}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Article Detail Drawer ──────────────────────────────────────────────────────
function ArticleDrawer({
  article,
  onClose,
  onStatusChange,
  onDelete,
}: {
  article: ArticleRow;
  onClose: () => void;
  onStatusChange: (id: number, status: ArticleStatus) => void;
  onDelete: (id: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(article.notes ?? "");
  const utils = trpc.useUtils();

  const updateArticle = trpc.ops.updateSeoArticle.useMutation({
    onSuccess: () => {
      utils.ops.listSeoArticles.invalidate();
      setEditingNotes(false);
      toast.success("Saved.");
    },
    onError: (err) => toast.error(err.message || "Failed to save."),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(article.bodyMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const wordCount = article.wordCount ?? article.bodyMarkdown.split(/\s+/).length;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-sm font-semibold text-zinc-100 truncate">{article.title}</span>
            {statusBadge(article.status)}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors ml-3 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Meta row */}
        <div className="px-5 py-3 border-b border-zinc-800 shrink-0 flex flex-wrap gap-3 items-center text-xs text-zinc-500">
          <span>Keyword: <span className="text-zinc-300">{article.targetKeyword}</span></span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>Created {new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>

        {/* Meta description */}
        {article.metaDescription && (
          <div className="px-5 py-3 border-b border-zinc-800 shrink-0 bg-zinc-900/40">
            <p className="text-xs text-zinc-500 mb-1">Meta description</p>
            <p className="text-sm text-zinc-300">{article.metaDescription}</p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <Streamdown>{article.bodyMarkdown}</Streamdown>
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 py-3 border-t border-zinc-800 shrink-0 bg-zinc-900/40">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500">Notes</p>
            {!editingNotes && (
              <button
                className="text-xs text-orange-400 hover:text-orange-300"
                onClick={() => setEditingNotes(true)}
              >
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="flex gap-2">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm h-8"
              />
              <Button
                size="sm"
                className="h-8 bg-orange-600 hover:bg-orange-500 text-white"
                onClick={() => updateArticle.mutate({ id: article.id, notes })}
                disabled={updateArticle.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-zinc-400"
                onClick={() => { setEditingNotes(false); setNotes(article.notes ?? ""); }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{notes || "No notes."}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-zinc-800 shrink-0 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={handleCopy}
          >
            {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy Markdown"}
          </Button>
          {article.status !== "ready" && (
            <Button
              size="sm"
              className="gap-1.5 bg-green-700 hover:bg-green-600 text-white"
              onClick={() => onStatusChange(article.id, "ready")}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Ready
            </Button>
          )}
          {article.status !== "published" && (
            <Button
              size="sm"
              className="gap-1.5 bg-blue-700 hover:bg-blue-600 text-white"
              onClick={() => onStatusChange(article.id, "published")}
            >
              <Globe className="w-4 h-4" />
              Mark Published
            </Button>
          )}
          {article.status !== "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              onClick={() => onStatusChange(article.id, "draft")}
            >
              Revert to Draft
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-800/50 text-red-400 hover:bg-red-900/20 ml-auto"
            onClick={() => onDelete(article.id)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Seo() {
  const utils = trpc.useUtils();

  // ── Audit ──
  const { data: historyData, isLoading: historyLoading } = trpc.ops.getSeoAuditHistory.useQuery({ limit: 30 });
  const runAudit = trpc.ops.runSeoAudit.useMutation({
    onSuccess: () => {
      utils.ops.getSeoAuditHistory.invalidate();
      toast.success("Audit complete — results saved.");
    },
    onError: (err) => toast.error(err.message || "Audit failed."),
  });

  const clearLastAudit = trpc.ops.clearLastSeoAudit.useMutation({
    onSuccess: (data) => {
      utils.ops.getSeoAuditHistory.invalidate();
      if (data.deleted) {
        toast.success("Last audit cleared.");
      }
    },
    onError: (err) => toast.error(err.message || "Failed to clear audit."),
  });

  const latest = historyData?.latest ?? null;
  const history = historyData?.history ?? [];

  // ── Fix Issues ──
  const { data: fixesData = [], refetch: refetchFixes } = trpc.ops.getSeoFixes.useQuery(
    { auditId: latest?.id ?? 0 },
    { enabled: !!latest?.id }
  );
  const fixes = fixesData as SeoFixRow[];

  const generateFixes = trpc.ops.generateSeoFixes.useMutation({
    onSuccess: (data) => {
      refetchFixes();
      toast.success(`${data.generated} fix instruction${data.generated !== 1 ? "s" : ""} generated.`);
    },
    onError: (err) => toast.error(err.message || "Failed to generate fixes."),
  });

  const updateFixStatus = trpc.ops.updateSeoFix.useMutation({
    onSuccess: () => refetchFixes(),
    onError: (err) => toast.error(err.message || "Failed to update fix."),
  });

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

  // Build a set of checkIds that have been resolved or skipped
  const resolvedCheckIds = new Set(
    fixes
      .filter((f) => f.status === "resolved" || f.status === "skipped")
      .map((f) => f.checkId)
  );

  // Filter recommendations: hide any whose matching check has been resolved/skipped
  const allRecommendations = latest?.recommendations ?? [];
  const recommendations = allRecommendations.filter((rec) => {
    const matchingCheck = checks.find((c) => c.recommendation === rec.text);
    if (!matchingCheck) return true; // no matching check found — keep it
    return !resolvedCheckIds.has(matchingCheck.id);
  });

  const chartData = [...history].reverse().map((h) => ({
    date: new Date(h.auditedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    Overall: h.overallScore,
    "On-Page": h.onPageScore,
    Links: h.linksScore,
    Usability: h.usabilityScore,
    Performance: h.performanceScore,
    Social: h.socialScore,
  }));

  // ── Keywords ──
  const [kwTopic, setKwTopic] = useState("land clearing and forestry mulching");
  const [kwCounty, setKwCounty] = useState("Middle Tennessee");
  const [kwCount, setKwCount] = useState(15);
  const [kwFilter, setKwFilter] = useState<"all" | "saved">("all");
  const [kwIntentFilter, setKwIntentFilter] = useState("all");
  const [kwDiffFilter, setKwDiffFilter] = useState("all");
  const [generatedKeywords, setGeneratedKeywords] = useState<Array<{
    keyword: string; intent: string; difficulty: string; volumeRange: string; rationale: string; contentType: string;
  }>>([]);
  const [selectedKws, setSelectedKws] = useState<Set<number>>(new Set());

  const { data: savedKeywords = [], isLoading: kwLoading } = trpc.ops.listSeoKeywords.useQuery({ savedOnly: false });

  const generateKeywords = trpc.ops.generateSeoKeywords.useMutation({
    onSuccess: (data) => {
      setGeneratedKeywords(data);
      toast.success(`${data.length} keyword ideas generated.`);
    },
    onError: (err) => toast.error(err.message || "Keyword generation failed."),
  });

  const saveKeywords = trpc.ops.saveSeoKeywords.useMutation({
    onSuccess: (data) => {
      utils.ops.listSeoKeywords.invalidate();
      setGeneratedKeywords([]);
      setSelectedKws(new Set());
      toast.success(`${data.saved} keywords saved.`);
    },
    onError: (err) => toast.error(err.message || "Failed to save keywords."),
  });

  const toggleKwSaved = trpc.ops.toggleSeoKeywordSaved.useMutation({
    onSuccess: () => utils.ops.listSeoKeywords.invalidate(),
  });

  const deleteKw = trpc.ops.deleteSeoKeyword.useMutation({
    onSuccess: () => {
      utils.ops.listSeoKeywords.invalidate();
      toast.success("Keyword removed.");
    },
    onError: (err) => toast.error(err.message || "Failed to delete."),
  });

  const filteredSavedKws = useMemo(() => {
    return (savedKeywords as KeywordRow[]).filter((k) => {
      if (kwFilter === "saved" && !k.saved) return false;
      if (kwIntentFilter !== "all" && k.intent.toLowerCase() !== kwIntentFilter) return false;
      if (kwDiffFilter !== "all" && k.difficulty.toLowerCase() !== kwDiffFilter) return false;
      return true;
    });
  }, [savedKeywords, kwFilter, kwIntentFilter, kwDiffFilter]);

  const handleSaveSelected = () => {
    const toSave = generatedKeywords.filter((_, i) => selectedKws.has(i));
    if (toSave.length === 0) { toast.error("Select at least one keyword to save."); return; }
    saveKeywords.mutate(toSave);
  };

  // ── Write ──
  const [writeKeyword, setWriteKeyword] = useState("");
  const [writeWordCount, setWriteWordCount] = useState(900);
  const [writeArticleType, setWriteArticleType] = useState<"blog post" | "service page" | "location page" | "FAQ page">("blog post");
  const [writeContext, setWriteContext] = useState("");
  const [writeKeywordId, setWriteKeywordId] = useState<number | undefined>(undefined);

  const generateArticle = trpc.ops.generateSeoArticle.useMutation({
    onSuccess: () => {
      utils.ops.listSeoArticles.invalidate();
      toast.success("Article generated and saved to Content Library.");
      setWriteKeyword("");
      setWriteContext("");
      setWriteKeywordId(undefined);
    },
    onError: (err) => toast.error(err.message || "Article generation failed."),
  });

  // ── Content Library ──
  const [libStatusFilter, setLibStatusFilter] = useState<"all" | ArticleStatus>("all");
  const [libSearch, setLibSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<ArticleRow | null>(null);

  const { data: articles = [], isLoading: articlesLoading } = trpc.ops.listSeoArticles.useQuery({});

  const updateArticle = trpc.ops.updateSeoArticle.useMutation({
    onSuccess: () => {
      utils.ops.listSeoArticles.invalidate();
      if (selectedArticle) {
        setSelectedArticle((prev) => prev ? { ...prev } : null);
      }
    },
    onError: (err) => toast.error(err.message || "Failed to update article."),
  });

  const deleteArticle = trpc.ops.deleteSeoArticle.useMutation({
    onSuccess: () => {
      utils.ops.listSeoArticles.invalidate();
      setSelectedArticle(null);
      toast.success("Article deleted.");
    },
    onError: (err) => toast.error(err.message || "Failed to delete article."),
  });

  const filteredArticles = useMemo(() => {
    return (articles as ArticleRow[]).filter((a) => {
      if (libStatusFilter !== "all" && a.status !== libStatusFilter) return false;
      if (libSearch && !a.title.toLowerCase().includes(libSearch.toLowerCase()) && !a.targetKeyword.toLowerCase().includes(libSearch.toLowerCase())) return false;
      return true;
    });
  }, [articles, libStatusFilter, libSearch]);

  const handleStatusChange = (id: number, status: ArticleStatus) => {
    updateArticle.mutate({ id, status });
    if (selectedArticle?.id === id) {
      setSelectedArticle((prev) => prev ? { ...prev, status } : null);
    }
    toast.success(`Article marked as ${status}.`);
  };

  const handleDeleteArticle = (id: number) => {
    deleteArticle.mutate({ id });
  };

  // ── SEO Agent ──
  const [agentMessages, setAgentMessages] = useState<ChatMessage[]>([]);

  const seoAgent = trpc.ops.seoAgent.useMutation({
    onSuccess: (data) => {
      setAgentMessages((prev) => [
        ...prev,
        { role: "assistant" as const, content: String(data.reply) },
      ]);
    },
    onError: (err) => {
      toast.error(err.message || "Agent failed to respond.");
    },
  });

  const handleAgentMessage = (content: string) => {
    const newMessages: ChatMessage[] = [
      ...agentMessages,
      { role: "user" as const, content },
    ];
    setAgentMessages(newMessages);
    seoAgent.mutate({
      messages: newMessages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content),
      })),
      auditId: latest?.id,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">SEO</h1>
            <p className="text-sm text-zinc-400 mt-1">nolandearthworks.com</p>
          </div>
        </div>

        {/* Top-level tabs */}
        <Tabs defaultValue="audit">
          <TabsList className="bg-zinc-900 border border-zinc-800 mb-2">
            <TabsTrigger value="audit" className="gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" /> Audit
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" /> Keywords
            </TabsTrigger>
            <TabsTrigger value="write" className="gap-1.5 text-xs">
              <PenLine className="w-3.5 h-3.5" /> Write
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Content
              {(articles as ArticleRow[]).filter((a) => a.status === "draft").length > 0 && (
                <span className="bg-orange-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                  {(articles as ArticleRow[]).filter((a) => a.status === "draft").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="agent" className="gap-1.5 text-xs">
              <Bot className="w-3.5 h-3.5" /> Agent
            </TabsTrigger>
          </TabsList>

          {/* ── AUDIT TAB ── */}
          <TabsContent value="audit" className="space-y-6 mt-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                {latest
                  ? `Last audited ${new Date(latest.auditedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                  : "No audit run yet"}
              </p>
              <div className="flex items-center gap-2">
                {latest && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Clear the last audit? This cannot be undone.")) {
                        clearLastAudit.mutate();
                      }
                    }}
                    disabled={clearLastAudit.isPending}
                    className="border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-700 gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {clearLastAudit.isPending ? "Clearing..." : "Clear Last Audit"}
                  </Button>
                )}
                <Button
                  onClick={() => runAudit.mutate({ url: "https://nolandearthworks.com" })}
                  disabled={runAudit.isPending}
                  className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${runAudit.isPending ? "animate-spin" : ""}`} />
                  {runAudit.isPending ? "Auditing..." : "Run Audit"}
                </Button>
              </div>
            </div>

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
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* ── LEFT COLUMN: Scores + History ── */}
                <div className="space-y-4">
                  {/* Overall score + category rings */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-zinc-400">Overall Score</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4 pt-2 pb-5">
                      <ScoreDonut score={latest.overallScore} grade={latest.overallGrade} size={148} />
                      <p className="text-sm text-zinc-400">
                        {recommendations.length > 0
                          ? `${recommendations.length} recommendation${recommendations.length !== 1 ? "s" : ""} to improve`
                          : "No critical issues found"}
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
                  <Card className="bg-zinc-900 border-zinc-800">
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

                  {/* Score history chart */}
                  {chartData.length >= 1 && (
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-orange-400" />
                            SEO Score Trend
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded" /> Overall</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block rounded" /> On-Page</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> Perf</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-purple-500 inline-block rounded" /> UX</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block rounded" /> Links</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pink-500 inline-block rounded" /> Social</span>
                          </div>
                        </div>
                        {chartData.length === 1 && (
                          <p className="text-xs text-zinc-500 mt-1">Run more audits over time to see your score trend.</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: "#71717a", fontSize: 9 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: "#71717a", fontSize: 10 }}
                              tickCount={6}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 11 }}
                              labelStyle={{ color: "#a1a1aa", marginBottom: 4 }}
                              itemStyle={{ color: "#e4e4e7" }}
                              formatter={(value: number, name: string) => [`${value}/100`, name]}
                            />
                            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4}
                              label={{ value: "Target", position: "insideTopRight", fill: "#22c55e", fontSize: 9, opacity: 0.6 }}
                            />
                            <ReferenceLine y={90} stroke="#3f3f46" strokeDasharray="2 4" strokeOpacity={0.5} />
                            <ReferenceLine y={70} stroke="#3f3f46" strokeDasharray="2 4" strokeOpacity={0.5} />
                            <Line type="monotone" dataKey="Overall" stroke="#f97316" strokeWidth={2.5}
                              dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: "#f97316" }}
                            />
                            <Line type="monotone" dataKey="On-Page" stroke="#22c55e" strokeWidth={1.5}
                              dot={{ r: 2, fill: "#22c55e", strokeWidth: 0 }} activeDot={{ r: 4 }}
                            />
                            <Line type="monotone" dataKey="Performance" stroke="#3b82f6" strokeWidth={1.5}
                              dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 4 }}
                            />
                            <Line type="monotone" dataKey="Usability" stroke="#a855f7" strokeWidth={1.5}
                              dot={{ r: 2, fill: "#a855f7", strokeWidth: 0 }} activeDot={{ r: 4 }}
                            />
                            <Line type="monotone" dataKey="Links" stroke="#eab308" strokeWidth={1.5}
                              dot={{ r: 2, fill: "#eab308", strokeWidth: 0 }} activeDot={{ r: 4 }}
                            />
                            <Line type="monotone" dataKey="Social" stroke="#ec4899" strokeWidth={1.5}
                              dot={{ r: 2, fill: "#ec4899", strokeWidth: 0 }} activeDot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* ── RIGHT COLUMN: Recommendations + Checks + Fix Issues ── */}
                <div className="space-y-4">
                  {/* Recommendations */}
                  {(recommendations.length > 0 || (allRecommendations.length > 0 && recommendations.length === 0)) && (
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-400" />
                          Recommendations
                          {recommendations.length > 0 && (
                            <span className="text-zinc-500 font-normal">({recommendations.length})</span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {recommendations.length === 0 ? (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                            <p className="text-sm text-green-300">All recommendations resolved. Run a new audit to get an updated score.</p>
                          </div>
                        ) : (
                          recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                              <div className="mt-0.5">{priorityBadge(rec.priority as Priority)}</div>
                              <div className="flex-1">
                                <p className="text-sm text-zinc-200">{rec.text}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 capitalize">{CATEGORY_META[rec.category as Category]?.label ?? rec.category}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Detailed checks */}
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

                  {/* Fix Issues panel — sticky at top when scrolling */}
                  <div className="xl:sticky xl:top-4">
                    <FixIssuesPanel
                      fixes={fixes}
                      auditId={latest.id}
                      isGenerating={generateFixes.isPending}
                      onGenerate={() => generateFixes.mutate({ auditId: latest.id })}
                      onUpdateStatus={(id, status) => updateFixStatus.mutate({ id, status })}
                      onRefetch={refetchFixes}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── KEYWORDS TAB ── */}
          <TabsContent value="keywords" className="space-y-6 mt-0">
            {/* Generator card */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  AI Keyword Research
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs text-zinc-400">Topic</Label>
                    <Input
                      value={kwTopic}
                      onChange={(e) => setKwTopic(e.target.value)}
                      placeholder="e.g. land clearing and forestry mulching"
                      className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Target Area</Label>
                    <Input
                      value={kwCounty}
                      onChange={(e) => setKwCounty(e.target.value)}
                      placeholder="e.g. Middle Tennessee"
                      className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Count</Label>
                    <Select value={String(kwCount)} onValueChange={(v) => setKwCount(Number(v))}>
                      <SelectTrigger className="w-24 bg-zinc-800 border-zinc-700 text-zinc-200 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {[10, 15, 20, 25, 30].map((n) => (
                          <SelectItem key={n} value={String(n)} className="text-zinc-200">{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1" />
                  <Button
                    onClick={() => generateKeywords.mutate({ topic: kwTopic, county: kwCounty, count: kwCount })}
                    disabled={generateKeywords.isPending || !kwTopic.trim()}
                    className="bg-orange-600 hover:bg-orange-500 text-white gap-2 self-end"
                  >
                    {generateKeywords.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generate Keywords</>
                    )}
                  </Button>
                </div>

                {/* Generated results */}
                {generatedKeywords.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">{generatedKeywords.length} keyword ideas — select to save</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                          onClick={() => setSelectedKws(new Set(generatedKeywords.map((_, i) => i)))}
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-orange-600 hover:bg-orange-500 text-white"
                          onClick={handleSaveSelected}
                          disabled={saveKeywords.isPending || selectedKws.size === 0}
                        >
                          {saveKeywords.isPending ? "Saving..." : `Save ${selectedKws.size > 0 ? selectedKws.size : ""} Selected`}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {generatedKeywords.map((kw, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedKws.has(i)
                              ? "bg-orange-500/10 border-orange-500/30"
                              : "bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/70"
                          }`}
                          onClick={() => {
                            setSelectedKws((prev) => {
                              const next = new Set(prev);
                              if (next.has(i)) next.delete(i); else next.add(i);
                              return next;
                            });
                          }}
                        >
                          <div className="w-4 h-4 rounded border mt-0.5 shrink-0 flex items-center justify-center border-zinc-600">
                            {selectedKws.has(i) && <CheckCheck className="w-3 h-3 text-orange-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="text-sm font-medium text-zinc-200">{kw.keyword}</span>
                              {intentBadge(kw.intent)}
                              {difficultyBadge(kw.difficulty)}
                              {kw.volumeRange && (
                                <span className="text-[10px] text-zinc-500">{kw.volumeRange}/mo</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400">{kw.rationale}</p>
                            {kw.contentType && (
                              <p className="text-[10px] text-zinc-500 mt-0.5">Suggested: {kw.contentType}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved keywords */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                    <Star className="w-4 h-4 text-orange-400" />
                    Saved Keywords ({(savedKeywords as KeywordRow[]).length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Select value={kwIntentFilter} onValueChange={setKwIntentFilter}>
                      <SelectTrigger className="w-32 h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
                        <SelectValue placeholder="Intent" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="all" className="text-zinc-200 text-xs">All intents</SelectItem>
                        <SelectItem value="transactional" className="text-zinc-200 text-xs">Transactional</SelectItem>
                        <SelectItem value="local" className="text-zinc-200 text-xs">Local</SelectItem>
                        <SelectItem value="informational" className="text-zinc-200 text-xs">Informational</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={kwDiffFilter} onValueChange={setKwDiffFilter}>
                      <SelectTrigger className="w-28 h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="all" className="text-zinc-200 text-xs">All difficulty</SelectItem>
                        <SelectItem value="easy" className="text-zinc-200 text-xs">Easy</SelectItem>
                        <SelectItem value="medium" className="text-zinc-200 text-xs">Medium</SelectItem>
                        <SelectItem value="hard" className="text-zinc-200 text-xs">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs border-zinc-700 ${kwFilter === "saved" ? "bg-orange-500/20 text-orange-400 border-orange-500/40" : "text-zinc-400 hover:bg-zinc-800"}`}
                      onClick={() => setKwFilter((v) => v === "saved" ? "all" : "saved")}
                    >
                      <Star className="w-3 h-3 mr-1" /> Starred
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {kwLoading && (
                  <div className="flex items-center justify-center py-10 text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
                  </div>
                )}
                {!kwLoading && filteredSavedKws.length === 0 && (
                  <p className="text-zinc-500 text-sm py-8 text-center">
                    {(savedKeywords as KeywordRow[]).length === 0
                      ? "No keywords saved yet. Generate some above and save them."
                      : "No keywords match the current filters."}
                  </p>
                )}
                <div className="space-y-2">
                  {filteredSavedKws.map((kw) => (
                    <div key={kw.id} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/40 border border-zinc-700/50">
                      <button
                        className="mt-0.5 shrink-0"
                        onClick={() => toggleKwSaved.mutate({ id: kw.id, saved: !kw.saved })}
                        title={kw.saved ? "Unstar" : "Star"}
                      >
                        <Star className={`w-4 h-4 ${kw.saved ? "text-orange-400 fill-orange-400" : "text-zinc-600"}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-sm font-medium text-zinc-200">{kw.keyword}</span>
                          {intentBadge(kw.intent)}
                          {difficultyBadge(kw.difficulty)}
                          {kw.volumeRange && <span className="text-[10px] text-zinc-500">{kw.volumeRange}/mo</span>}
                          {kw.targeted && (
                            <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">article written</span>
                          )}
                        </div>
                        {kw.rationale && <p className="text-xs text-zinc-400">{kw.rationale}</p>}
                        {kw.contentType && <p className="text-[10px] text-zinc-500 mt-0.5">Suggested: {kw.contentType}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-zinc-700 text-zinc-400 hover:bg-zinc-800 gap-1"
                          onClick={() => {
                            setWriteKeyword(kw.keyword);
                            setWriteKeywordId(kw.id);
                            // Switch to write tab
                            document.querySelector<HTMLButtonElement>('[data-value="write"]')?.click();
                          }}
                        >
                          <PenLine className="w-3 h-3" /> Write
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-zinc-600 hover:text-red-400 hover:bg-red-900/20"
                          onClick={() => deleteKw.mutate({ id: kw.id })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── WRITE TAB ── */}
          <TabsContent value="write" className="space-y-6 mt-0">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-orange-400" />
                  AI Article Generator
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-1">
                  Written in Jon's brand voice — direct, plain, no corporate filler. Every article targets a specific keyword and includes a CTA pointing to nolandearthworks.com.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Target Keyword <span className="text-red-400">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      value={writeKeyword}
                      onChange={(e) => { setWriteKeyword(e.target.value); setWriteKeywordId(undefined); }}
                      placeholder="e.g. forestry mulching Middle Tennessee"
                      className="bg-zinc-800 border-zinc-700 text-zinc-200"
                    />
                    {(savedKeywords as KeywordRow[]).length > 0 && (
                      <Select
                        value={writeKeywordId ? String(writeKeywordId) : ""}
                        onValueChange={(v) => {
                          const kw = (savedKeywords as KeywordRow[]).find((k) => k.id === Number(v));
                          if (kw) { setWriteKeyword(kw.keyword); setWriteKeywordId(kw.id); }
                        }}
                      >
                        <SelectTrigger className="w-44 bg-zinc-800 border-zinc-700 text-zinc-300 text-xs h-10">
                          <SelectValue placeholder="From saved..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-700 max-h-60">
                          {(savedKeywords as KeywordRow[]).map((kw) => (
                            <SelectItem key={kw.id} value={String(kw.id)} className="text-zinc-200 text-xs">
                              {kw.keyword}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Article Type</Label>
                    <Select value={writeArticleType} onValueChange={(v) => setWriteArticleType(v as typeof writeArticleType)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="blog post" className="text-zinc-200">Blog Post</SelectItem>
                        <SelectItem value="service page" className="text-zinc-200">Service Page</SelectItem>
                        <SelectItem value="location page" className="text-zinc-200">Location Page</SelectItem>
                        <SelectItem value="FAQ page" className="text-zinc-200">FAQ Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Target Word Count</Label>
                    <Select value={String(writeWordCount)} onValueChange={(v) => setWriteWordCount(Number(v))}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="500" className="text-zinc-200">~500 words (short)</SelectItem>
                        <SelectItem value="750" className="text-zinc-200">~750 words</SelectItem>
                        <SelectItem value="900" className="text-zinc-200">~900 words (recommended)</SelectItem>
                        <SelectItem value="1200" className="text-zinc-200">~1,200 words</SelectItem>
                        <SelectItem value="1500" className="text-zinc-200">~1,500 words (long-form)</SelectItem>
                        <SelectItem value="2000" className="text-zinc-200">~2,000 words</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Additional Context (optional)</Label>
                  <Input
                    value={writeContext}
                    onChange={(e) => setWriteContext(e.target.value)}
                    placeholder="e.g. focus on Williamson County, mention cedar clearing, target homeowners with 5+ acres"
                    className="bg-zinc-800 border-zinc-700 text-zinc-200"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500">
                    Articles are saved automatically to the Content Library as drafts.
                  </p>
                  <Button
                    onClick={() =>
                      generateArticle.mutate({
                        keyword: writeKeyword,
                        keywordId: writeKeywordId,
                        wordCount: writeWordCount,
                        articleType: writeArticleType,
                        additionalContext: writeContext || undefined,
                      })
                    }
                    disabled={generateArticle.isPending || !writeKeyword.trim()}
                    className="bg-orange-600 hover:bg-orange-500 text-white gap-2"
                  >
                    {generateArticle.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Writing article...</>
                    ) : (
                      <><PenLine className="w-4 h-4" /> Generate Article</>
                    )}
                  </Button>
                </div>

                {generateArticle.isPending && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-400 shrink-0" />
                    <div>
                      <p className="text-sm text-orange-300 font-medium">Writing your article...</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Generating a {writeWordCount}-word {writeArticleType} targeting "{writeKeyword}". This takes 15-30 seconds.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick tips */}
            <Card className="bg-zinc-900/50 border-zinc-800/50">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-zinc-400 mb-2">Tips for better results</p>
                <ul className="space-y-1.5 text-xs text-zinc-500">
                  <li>Use county-level keywords like "land clearing Williamson County TN" for local SEO impact.</li>
                  <li>Location pages (one per county) are the highest-ROI content type for local service businesses.</li>
                  <li>Blog posts targeting informational keywords ("how does forestry mulching work") build topical authority over time.</li>
                  <li>After generating, review in the Content Library, copy the Markdown, and paste into Squarespace's Markdown block.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CONTENT LIBRARY TAB ── */}
          <TabsContent value="content" className="space-y-4 mt-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200"
                />
              </div>
              <Select value={libStatusFilter} onValueChange={(v) => setLibStatusFilter(v as typeof libStatusFilter)}>
                <SelectTrigger className="w-36 bg-zinc-900 border-zinc-800 text-zinc-300 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all" className="text-zinc-200">All statuses</SelectItem>
                  <SelectItem value="draft" className="text-zinc-200">Draft</SelectItem>
                  <SelectItem value="ready" className="text-zinc-200">Ready</SelectItem>
                  <SelectItem value="published" className="text-zinc-200">Published</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">{filteredArticles.length} article{filteredArticles.length !== 1 ? "s" : ""}</p>
            </div>

            {articlesLoading && (
              <div className="flex items-center justify-center py-16 text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading content library...
              </div>
            )}

            {!articlesLoading && filteredArticles.length === 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <BookOpen className="w-10 h-10 text-zinc-600" />
                  <p className="text-zinc-400 text-center max-w-sm text-sm">
                    {(articles as ArticleRow[]).length === 0
                      ? "No articles yet. Go to the Write tab to generate your first SEO article."
                      : "No articles match the current filters."}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                  onClick={() => setSelectedArticle(article)}
                >
                  <FileText className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-zinc-200 truncate">{article.title}</span>
                      {statusBadge(article.status)}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span>Keyword: <span className="text-zinc-400">{article.targetKeyword}</span></span>
                      {article.wordCount && <span>{article.wordCount.toLocaleString()} words</span>}
                      <span>{new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    {article.metaDescription && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">{article.metaDescription}</p>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0 mt-1 -rotate-90" />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── AGENT TAB ── */}
          <TabsContent value="agent" className="mt-0">
            <div className="space-y-4">
              {/* Context banner */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <Bot className="w-4 h-4 text-orange-400 shrink-0" />
                    <span className="font-medium text-zinc-200">SEO Agent</span>
                    <span className="text-zinc-600">|</span>
                    <span>Knows your site, brand voice, and current audit results.</span>
                    {latest && (
                      <span className="ml-auto text-zinc-500">
                        Audit context loaded: {latest.overallScore}/100 ({latest.overallGrade})
                      </span>
                    )}
                    {!latest && (
                      <span className="ml-auto text-zinc-500">
                        Run an audit first to give the agent full context.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chat interface */}
              <AIChatBox
                messages={agentMessages}
                onSendMessage={handleAgentMessage}
                isLoading={seoAgent.isPending}
                height={560}
                placeholder="Ask the SEO Agent anything — run an audit, fix a specific issue, write a meta description, plan a content strategy..."
                emptyStateMessage="Your SEO Agent is ready. Ask it to audit your site, explain a check, write optimized copy, generate schema markup, or build a 100/100 improvement plan."
                suggestedPrompts={[
                  "What are the highest-priority fixes to improve my score?",
                  "Write an optimized meta title and description for my homepage.",
                  "Generate LocalBusiness JSON-LD schema for nolandearthworks.com.",
                  "Build a 90-day content plan targeting Middle Tennessee land clearing keywords.",
                  "What does my site need to rank #1 for 'land clearing Middle Tennessee'?",
                  "Explain Core Web Vitals and how to improve them on Squarespace.",
                ]}
              />

              {/* Clear conversation */}
              {agentMessages.length > 0 && (
                <div className="flex justify-end">
                  <button
                    className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                    onClick={() => setAgentMessages([])}
                  >
                    Clear conversation
                  </button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Article detail drawer */}
      {selectedArticle && (
        <ArticleDrawer
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteArticle}
        />
      )}
    </DashboardLayout>
  );
}
