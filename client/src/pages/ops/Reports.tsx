/**
 * Reports Page — Noland Earthworks
 * Financial scoreboard, revenue reports, and business metrics (live data)
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, BarChart2, Sparkles, Loader2, Copy, CheckCircle2, RefreshCw, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-2xl">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.name !== "Leads" && p.name !== "Won" ? `$${p.value.toLocaleString()}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const { data: jobs = [] } = trpc.ops.jobs.list.useQuery();
  const { data: leads = [] } = trpc.ops.leads.list.useQuery();

  const [weeklyInsight, setWeeklyInsight] = useState("");
  const [insightCopied, setInsightCopied] = useState(false);
  const generateInsightMutation = trpc.ops.generateWeeklyInsight.useMutation({
    onSuccess: (data) => setWeeklyInsight(data.insight as string),
    onError: (err) => toast.error(err.message || "Failed to generate insight."),
  });

  // AI #9: Seasonal Forecast
  const [forecast, setForecast] = useState<{ summary: string; months: { month: string; demandLevel: string; recommendation: string }[]; actionPlan: string } | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const generateForecast = trpc.ops.ai.forecastDemand.useMutation({
    onSuccess: (data: any) => { setForecast(data); setShowForecast(true); },
    onError: (err: any) => toast.error(`Forecast failed: ${err.message}`),
  });

  // AI #14: Ad Performance Diagnosis
  const [adDiag, setAdDiag] = useState<{ summary: string; diagnosis: string; topIssue: string; recommendation: string; weeklyAction: string } | null>(null);
  const [showAdDiag, setShowAdDiag] = useState(false);
  const diagnoseAds = trpc.ops.ai.diagnoseAdPerformance.useMutation({
    onSuccess: (data: any) => { setAdDiag(data); setShowAdDiag(true); },
    onError: (err: any) => toast.error(`Ad diagnosis failed: ${err.message}`),
  });

  // AI #15: End-of-Day Field Summary
  const [eodSummary, setEodSummary] = useState<string | null>(null);
  const [showEod, setShowEod] = useState(false);
  const generateEod = trpc.ops.ai.generateDailySummary.useMutation({
    onSuccess: (data: any) => { setEodSummary(data.summary ?? data); setShowEod(true); },
    onError: (err: any) => toast.error(`Summary failed: ${err.message}`),
  });

  // Build monthly revenue from jobs
  const monthlyData = useMemo(() => {
    const months: Record<string, { revenue: number; count: number }> = {};
    jobs.forEach(j => {
      if (!j.totalPrice) return;
      const d = j.updatedAt ? new Date(j.updatedAt) : new Date();
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (!months[key]) months[key] = { revenue: 0, count: 0 };
      months[key].revenue += Number(j.totalPrice);
      months[key].count += 1;
    });
    return Object.entries(months)
      .slice(-7)
      .map(([month, v]) => ({ month, revenue: v.revenue, jobs: v.count }));
  }, [jobs]);

  // Lead source performance from real leads
  const leadSourceData = useMemo(() => {
    const sources: Record<string, { leads: number; won: number }> = {};
    leads.forEach(l => {
      const src = l.source ?? "other";
      if (!sources[src]) sources[src] = { leads: 0, won: 0 };
      sources[src].leads += 1;
      if (l.stage === "won") sources[src].won += 1;
    });
    return Object.entries(sources).map(([source, v]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      leads: v.leads,
      won: v.won,
    }));
  }, [leads]);

  const totalRevenue = jobs.reduce((s, j) => s + Number(j.totalPrice ?? 0), 0);
  const completedJobs = jobs.filter(j => j.status === "completed").length;
  const wonLeads = leads.filter(l => l.stage === "won").length;
  const openLeads = leads.filter(l => !["won", "lost"].includes(l.stage)).length;
  const avgJobValue = completedJobs > 0 ? totalRevenue / completedJobs : 0;

  const isEmpty = jobs.length === 0 && leads.length === 0;

  // Priority 8: Ad Performance Feedback Loop
  const [adPerformanceInsight, setAdPerformanceInsight] = useState<string | null>(null);
  const adPerformanceMutation = trpc.ops.getAdPerformanceInsight.useMutation({
    onSuccess: (data: any) => setAdPerformanceInsight(data.insight),
    onError: (err: any) => toast.error(err.message || "Analysis failed."),
  });

  // Priority 1: Jobber Revenue Sync
  const { data: jobberRevData, refetch: refetchJobberRev } = trpc.ops.getJobberRevenue.useQuery();
  const syncJobberRevMutation = trpc.ops.syncJobberRevenue.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced ${data.synced} invoice${data.synced !== 1 ? "s" : ""} from Jobber.`);
      refetchJobberRev();
    },
    onError: (err) => toast.error(err.message || "Sync failed."),
  });
  const jobberRows = jobberRevData?.rows ?? [];
  const jobberTotal = jobberRows.reduce((s, r) => s + Number(r.total ?? 0), 0);
  const jobberPaid = jobberRows.filter(r => r.invoiceStatus === "paid").reduce((s, r) => s + Number(r.total ?? 0), 0);
  const jobberOutstanding = jobberRows.filter(r => r.invoiceStatus !== "paid").reduce((s, r) => s + Number(r.balance ?? 0), 0);

  return (
    <DashboardLayout title="Reports" subtitle="Financial analytics — Middle & West Tennessee">
      <div className="p-6 space-y-5">

        {/* Priority 1: Jobber Revenue Sync */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Jobber Revenue</h3>
              <p className="text-xs text-muted-foreground">
                {jobberRevData?.lastSyncedAt
                  ? `Last synced ${new Date(jobberRevData.lastSyncedAt).toLocaleString()}`
                  : "Not yet synced — click Sync to pull Jobber invoices"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => syncJobberRevMutation.mutate()}
              disabled={syncJobberRevMutation.isPending}
            >
              {syncJobberRevMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" />Syncing...</>
              ) : (
                <><RefreshCw className="w-3 h-3" />Sync Jobber</>)}
            </Button>
          </div>
          {jobberRows.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Total Invoiced", value: `$${jobberTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: <DollarSign className="w-3 h-3 text-primary" /> },
                  { label: "Collected", value: `$${jobberPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: <CheckCircle2 className="w-3 h-3 text-green-400" /> },
                  { label: "Outstanding", value: `$${jobberOutstanding.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: <AlertCircle className="w-3 h-3 text-amber-400" /> },
                ].map((stat, i) => (
                  <div key={i} className="rounded-md bg-secondary/30 p-3">
                    <div className="flex items-center justify-between mb-1">{stat.icon}<span className="text-[10px] text-muted-foreground">{stat.label}</span></div>
                    <div className="text-lg font-bold text-foreground ops-metric-value">{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {jobberRows.slice(0, 20).map((row) => (
                  <div key={row.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground truncate block">{row.clientName ?? "—"}</span>
                      <span className="text-muted-foreground truncate block">{row.subject ?? `Invoice #${row.invoiceNumber ?? row.id}`}</span>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <div className="font-semibold text-foreground">${Number(row.total).toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                      <div className={cn("text-[10px]",
                        row.invoiceStatus === "paid" ? "text-green-400" :
                        row.invoiceStatus === "awaiting_payment" ? "text-amber-400" :
                        "text-muted-foreground"
                      )}>{row.invoiceStatus ?? "—"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <DollarSign className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No Jobber invoices synced yet. Click Sync Jobber to pull your invoice data.</p>
            </div>
          )}
        </div>

        {/* Local data notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <span className="font-semibold">Note:</span>
          <span>Charts below reflect jobs and leads entered directly in this dashboard. Jobber revenue is shown above.</span>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Revenue", value: totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : "—" },
            { label: "Jobs Completed", value: completedJobs > 0 ? completedJobs.toString() : "—" },
            { label: "Leads Won", value: wonLeads > 0 ? wonLeads.toString() : "—" },
            { label: "Avg Job Value", value: avgJobValue > 0 ? `$${Math.round(avgJobValue).toLocaleString()}` : "—" },
          ].map((stat, i) => (
            <div key={i} className="ops-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <TrendingUp className="w-3 h-3 text-primary" />
              </div>
              <div className="text-xl font-bold text-foreground ops-metric-value">{stat.value}</div>
            </div>
          ))}
        </div>

        {isEmpty ? (
          <div className="ops-card p-16 text-center">
            <BarChart2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-semibold text-foreground mb-1">No data yet</p>
            <p className="text-xs text-muted-foreground">
              Revenue charts and lead source analytics will populate as you add jobs and leads.
            </p>
          </div>
        ) : (
          <>
            {/* Revenue chart */}
            {monthlyData.length > 0 && (
              <div className="ops-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Monthly Revenue
                    </h3>
                    <p className="text-xs text-muted-foreground">From completed & invoiced jobs</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[3, 3, 0, 0]} opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Lead source performance */}
            {leadSourceData.length > 0 && (
              <div className="ops-card p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Lead Source Performance
                  </h3>
                  <p className="text-xs text-muted-foreground">Leads vs. Won by source</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={leadSourceData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="source" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="leads" name="Leads" fill="rgba(249,115,22,0.3)" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="won" name="Won" fill="#f97316" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Weekly Insight */}
            <div className="ops-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  AI Business Insight
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => generateInsightMutation.mutate({
                    totalRevenue,
                    completedJobs,
                    wonLeads,
                    openLeads,
                    totalLeads: leads.length,
                    conversionRate: leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0,
                  })}
                  disabled={generateInsightMutation.isPending}
                >
                  {generateInsightMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="w-3 h-3 text-orange-400" />Generate Insight</>
                  )}
                </Button>
              </div>
              {weeklyInsight ? (
                <div className="space-y-2">
                  <p className="text-xs text-foreground leading-relaxed">{weeklyInsight}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(weeklyInsight);
                      setInsightCopied(true);
                      toast.success("Copied.");
                      setTimeout(() => setInsightCopied(false), 2000);
                    }}
                  >
                    {insightCopied ? (
                      <><CheckCircle2 className="w-3 h-3 text-green-400" />Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" />Copy</>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Click Generate Insight to get an AI-written summary of your business metrics.</p>
              )}
            </div>

            {/* Open pipeline summary */}
            <div className="ops-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Pipeline Summary
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Total Leads", value: leads.length },
                  { label: "Open", value: openLeads },
                  { label: "Won", value: wonLeads },
                ].map((item, i) => (
                  <div key={i} className={cn("p-3 rounded-md bg-secondary/30", i === 2 ? "border border-primary/20" : "")}>
                    <div className={cn("text-xl font-bold ops-metric-value", i === 2 ? "text-primary" : "text-foreground")}>
                      {item.value > 0 ? item.value : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* AI #9: Seasonal Demand Forecast */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Seasonal Demand Forecast</h3>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => generateForecast.mutate()} disabled={generateForecast.isPending}>
              {generateForecast.isPending ? <><Loader2 className="w-3 h-3 animate-spin" />Forecasting...</> : <><Sparkles className="w-3 h-3 text-orange-400" />Generate Forecast</>}
            </Button>
          </div>
          {showForecast && forecast ? (
            <div className="space-y-3">
              <p className="text-xs text-foreground leading-relaxed">{forecast.summary}</p>
              {forecast.months && forecast.months.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {forecast.months.map((m: any, i: number) => (
                    <div key={i} className="rounded-md border border-border bg-secondary/20 p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{m.month}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          m.demandLevel === "high" ? "bg-green-500/20 text-green-400" :
                          m.demandLevel === "low" ? "bg-red-500/20 text-red-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>{m.demandLevel}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
              {forecast.actionPlan && <p className="text-xs text-foreground/80 italic border-t border-border pt-2 mt-2">{forecast.actionPlan}</p>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Generate a 6-month demand forecast based on Tennessee seasonal patterns and your job history.</p>
          )}
        </div>

        {/* AI #14: Ad Performance Diagnosis */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Ad Performance Diagnosis</h3>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => diagnoseAds.mutate()} disabled={diagnoseAds.isPending}>
              {diagnoseAds.isPending ? <><Loader2 className="w-3 h-3 animate-spin" />Diagnosing...</> : <><Sparkles className="w-3 h-3 text-orange-400" />Diagnose Ads</>}
            </Button>
          </div>
          {showAdDiag && adDiag ? (
            <div className="space-y-2">
              <p className="text-xs text-foreground leading-relaxed">{adDiag.diagnosis}</p>
              {adDiag.topIssue && <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2"><p className="text-xs text-red-400 font-medium">Top issue: {adDiag.topIssue}</p></div>}
              {adDiag.recommendation && <p className="text-xs text-foreground/80">{adDiag.recommendation}</p>}
              {adDiag.weeklyAction && <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2"><p className="text-xs text-green-400">This week: {adDiag.weeklyAction}</p></div>}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">AI reads your ad spend, leads, and conversion data to diagnose what is working and what to change this week.</p>
          )}
        </div>

        {/* Priority 8: Ad Performance Feedback Loop */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Ad Performance Feedback</h3>
            </div>
            <Button
              variant="outline" size="sm" className="h-7 text-xs gap-1.5"
              onClick={() => adPerformanceMutation.mutate()}
              disabled={adPerformanceMutation.isPending}
            >
              {adPerformanceMutation.isPending
                ? <><Loader2 className="w-3 h-3 animate-spin" />Analyzing...</>
                : <><Sparkles className="w-3 h-3 text-orange-400" />Analyze Ads</>}
            </Button>
          </div>
          {adPerformanceInsight ? (
            <div className="space-y-2">
              <p className="text-xs text-foreground leading-relaxed">{adPerformanceInsight}</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => { navigator.clipboard.writeText(adPerformanceInsight); toast.success("Copied."); }}>
                <Copy className="w-3 h-3" /> Copy
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Reads your ad spend log and social post history to identify patterns and give one specific recommendation for this week.</p>
          )}
        </div>

        {/* AI #15: End-of-Day Field Summary */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>End-of-Day Summary</h3>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => generateEod.mutate()} disabled={generateEod.isPending}>
              {generateEod.isPending ? <><Loader2 className="w-3 h-3 animate-spin" />Generating...</> : <><Sparkles className="w-3 h-3 text-orange-400" />Generate Summary</>}
            </Button>
          </div>
          {showEod && eodSummary ? (
            <div className="space-y-2">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{eodSummary}</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(eodSummary); toast.success("Copied."); }}>
                <Copy className="w-3 h-3" /> Copy
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Pulls jobs completed, quotes sent, leads received, and open tasks into a 5-line field summary for today.</p>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
