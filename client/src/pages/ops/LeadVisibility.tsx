/**
 * /ops/lead-visibility — Lead & Quote Visibility Dashboard
 *
 * Shows:
 * - 12-month lead + quote volume trend (bar chart)
 * - AI score breakdown per month (stacked)
 * - Lead source breakdown (horizontal bar)
 * - Service type breakdown from quote submissions
 * - Current pipeline stage breakdown
 * - Seasonal context panel (what to expect each month in TN)
 * - Actionable recommendations based on current month + volume
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2,
  Loader2, Info, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

// ─── Seasonal context for Tennessee land management ───────────────────────────
const SEASONAL_CONTEXT: Record<number, { label: string; demand: "peak" | "high" | "moderate" | "slow"; note: string; tip: string }> = {
  1:  { label: "January",   demand: "peak",     note: "Dormant vegetation, firm ground, best cutting conditions. Historically highest inquiry volume.", tip: "Follow up on any December leads that went quiet. Conditions are ideal — mention it." },
  2:  { label: "February",  demand: "peak",     note: "Still peak season. Landowners planning spring projects start calling now.", tip: "Run Google Ads if you have budget. This is your best ROI window." },
  3:  { label: "March",     demand: "high",     note: "Inquiry volume stays high. Ground starts softening in wet years.", tip: "Set clear expectations on wet-ground delays. Book jobs now for April/May execution." },
  4:  { label: "April",     demand: "high",     note: "Spring growth begins. Customers see how bad their land looks and call.", tip: "Post before/after photos from winter jobs. Spring growth makes the contrast dramatic." },
  5:  { label: "May",       demand: "moderate", note: "Heat and growth slow progress. Inquiries continue but scheduling gets harder.", tip: "Focus on shaded or north-facing properties. Mention early-morning start times." },
  6:  { label: "June",      demand: "slow",     note: "Slowest month. Heat, humidity, and full vegetation canopy reduce demand.", tip: "Use slow periods to post content, update FAQs, and request reviews from spring jobs." },
  7:  { label: "July",      demand: "slow",     note: "Typically the quietest month. Heat is the primary barrier.", tip: "Content creation month. Write blog posts, update county pages, post equipment photos." },
  8:  { label: "August",    demand: "slow",     note: "Still slow but inquiries start picking up toward end of month.", tip: "Start running ads in late August to capture early fall demand. Leads take 2-4 weeks to convert." },
  9:  { label: "September", demand: "moderate", note: "Demand recovers. Cooler mornings make work more productive.", tip: "Reach out to spring leads that did not convert. Many will be ready now." },
  10: { label: "October",   demand: "peak",     note: "Peak season begins. Leaves drop, vegetation goes dormant, ground firms up.", tip: "Book out 4-6 weeks. Mention the seasonal window in all communications." },
  11: { label: "November",  demand: "peak",     note: "Best conditions of the year. Dormant vegetation, firm ground, no heat.", tip: "This is your best month to close jobs. Response time matters — same-day replies convert best." },
  12: { label: "December",  demand: "high",     note: "Strong demand continues. Some slowdown around holidays.", tip: "Follow up on any November leads. Many customers want work done before year-end." },
};

const DEMAND_COLORS = {
  peak:     { bg: "bg-green-500/10",  border: "border-green-500/30",  text: "text-green-400",  label: "Peak Season" },
  high:     { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   label: "High Demand" },
  moderate: { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  label: "Moderate" },
  slow:     { bg: "bg-zinc-500/10",   border: "border-zinc-500/30",   text: "text-zinc-400",   label: "Slow Season" },
};

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Search",
  facebook: "Facebook",
  referral: "Referral",
  website: "Website Direct",
  direct: "Direct / Phone",
  field_app: "Field App",
  other: "Other",
};

const SERVICE_LABELS: Record<string, string> = {
  "forestry-mulching": "Forestry Mulching",
  "land-management": "Land Management",
  "vegetation-management": "Vegetation Management",
  "right-of-way-clearing": "Right-of-Way Clearing",
  "trail-cutting": "Trail Cutting",
  "brush-hogging": "Brush Hogging",
  "site-preparation": "Site Preparation",
  other: "Other",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  estimate_sent: "Estimate Sent",
  negotiating: "Quote Sent",
  on_hold: "On Hold",
  won: "Won",
  lost: "Lost",
  converted: "Converted",
};

const STAGE_COLORS: Record<string, string> = {
  new: "#f59e0b",
  contacted: "#3b82f6",
  estimate_sent: "#8b5cf6",
  negotiating: "#ec4899",
  on_hold: "#6b7280",
  won: "#22c55e",
  lost: "#ef4444",
  converted: "#14b8a6",
};

function KpiCard({ label, value, sub, trend, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string; trend?: number | null; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">{label}</div>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      {trend !== undefined && trend !== null && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-muted-foreground")}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : "Flat"} vs last month
        </div>
      )}
    </div>
  );
}

export default function LeadVisibility() {
  const { data, isLoading } = trpc.ops.getLeadVisibilityData.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const currentMonth = new Date().getMonth() + 1;
  const seasonal = SEASONAL_CONTEXT[currentMonth];
  const demandStyle = DEMAND_COLORS[seasonal.demand];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading visibility data...
        </div>
      </DashboardLayout>
    );
  }

  const monthly = data?.monthly ?? [];
  const sourceBreakdown = data?.sourceBreakdown ?? [];
  const serviceBreakdown = data?.serviceBreakdown ?? [];
  const stageBreakdown = data?.stageBreakdown ?? [];
  const maxSource = Math.max(...sourceBreakdown.map(s => s.count), 1);

  // Determine if this is a slow period vs expected
  const isSlowSeason = seasonal.demand === "slow";
  const isPeakSeason = seasonal.demand === "peak" || seasonal.demand === "high";
  const thisMonthLeads = data?.thisMonthLeads ?? 0;
  const hasLowVolume = thisMonthLeads < 2;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Visibility</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quote request volume, lead sources, and pipeline health over the last 12 months.
          </p>
        </div>

        {/* Seasonal Context Banner */}
        <div className={cn("rounded-xl border p-4", demandStyle.bg, demandStyle.border)}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Info className={cn("w-4 h-4 mt-0.5 shrink-0", demandStyle.text)} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", demandStyle.text)}>
                    {seasonal.label} — {demandStyle.label}
                  </span>
                </div>
                <p className="text-sm text-foreground">{seasonal.note}</p>
                <p className={cn("text-xs mt-1.5 font-medium", demandStyle.text)}>
                  What to do: {seasonal.tip}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Low volume explanation if applicable */}
        {hasLowVolume && isSlowSeason && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-300 font-medium">Low volume is expected this time of year</p>
              <p className="text-sm text-muted-foreground mt-1">
                {seasonal.label} is historically one of the slower months for Land Management inquiries in Tennessee. Heat, humidity, and full vegetation canopy reduce customer urgency. This is not a sign of a visibility problem — it is a seasonal pattern. Volume typically recovers in September and peaks again in October through December.
              </p>
            </div>
          </div>
        )}

        {hasLowVolume && isPeakSeason && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-300 font-medium">Low volume during a high-demand period — worth investigating</p>
              <p className="text-sm text-muted-foreground mt-1">
                {seasonal.label} is typically a strong month for inquiries, but you have received fewer than 2 leads so far. This could indicate a visibility gap — check that your Google Business Profile is active, your sitemap has been submitted to Search Console, and your Google Ads are running. Also confirm the quote form is working correctly.
              </p>
              <Link href="/ops/ai-visibility">
                <span className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-2 cursor-pointer">
                  Check AI Visibility Score <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Leads This Month"
            value={data?.thisMonthLeads ?? 0}
            sub="from all sources"
            trend={data?.momChange}
            color={thisMonthLeads === 0 ? "text-muted-foreground" : "text-foreground"}
          />
          <KpiCard
            label="Quotes This Month"
            value={data?.thisMonthQuotes ?? 0}
            sub="website form submissions"
          />
          <KpiCard
            label="Last 12 Months"
            value={data?.totalLeads ?? 0}
            sub="total leads"
          />
          <KpiCard
            label="Peak Month"
            value={data?.peakMonth ?? "—"}
            sub={data?.peakMonthCount ? `${data.peakMonthCount} leads` : "no data yet"}
            color="text-amber-400"
          />
        </div>

        {/* Monthly Volume Chart */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Monthly Lead & Quote Volume (Last 12 Months)</h2>
          {monthly.every(m => m.leads === 0 && m.quotes === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No lead data yet for the last 12 months.</p>
              <p className="text-xs text-muted-foreground mt-1">Leads will appear here as quote requests come in through the website.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                <Bar dataKey="leads" name="Leads" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="quotes" name="Quote Forms" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="strong" name="Strong Leads" stroke="#22c55e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Lead Quality Breakdown */}
        {monthly.some(m => m.strong + m.marginal + m.weak > 0) && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Lead Quality by Month (AI Score)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
                <Bar dataKey="strong"   name="Strong"   stackId="a" fill="#22c55e" />
                <Bar dataKey="marginal" name="Marginal"  stackId="a" fill="#f59e0b" />
                <Bar dataKey="weak"     name="Weak"      stackId="a" fill="#ef4444" />
                <Bar dataKey="unscored" name="Unscored"  stackId="a" fill="#6b7280" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Two-column: Source + Service */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Lead Source Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Lead Sources (Last 12 Months)</h2>
            {sourceBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No source data yet.</p>
            ) : (
              <div className="space-y-3">
                {sourceBreakdown.map(({ source, count }) => (
                  <div key={source}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{SOURCE_LABELS[source] ?? source}</span>
                      <span className="text-muted-foreground font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${Math.round((count / maxSource) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sourceBreakdown.length > 0 && sourceBreakdown[0]?.source === "other" && (
              <p className="text-[10px] text-muted-foreground mt-3">
                Most leads are tagged "Other" — this usually means they came in before source tracking was added. New leads will be tagged automatically.
              </p>
            )}
          </div>

          {/* Service Type Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Quote Requests by Service</h2>
            {serviceBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">No quote submission data yet.</p>
            ) : (
              <div className="space-y-3">
                {serviceBreakdown.map(({ service, count }) => {
                  const maxSvc = Math.max(...serviceBreakdown.map(s => s.count), 1);
                  return (
                    <div key={service}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground">{SERVICE_LABELS[service] ?? service}</span>
                        <span className="text-muted-foreground font-medium">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.round((count / maxSvc) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Stage Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Current Pipeline by Stage</h2>
          {stageBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No leads in the pipeline yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {stageBreakdown.map(({ stage, count }) => (
                <div
                  key={stage}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: STAGE_COLORS[stage] ?? "#6b7280" }}
                  />
                  <span className="text-xs text-foreground">{STAGE_LABELS[stage] ?? stage}</span>
                  <span className="text-xs font-bold text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Link href="/ops/leads">
              <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                Manage leads <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">What to Do Right Now</h2>
          <div className="space-y-3">
            {[
              {
                show: isPeakSeason && hasLowVolume,
                icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
                text: "It is peak season and volume is low. Check that your Google Business Profile is verified and active, and that the quote form on the website is working correctly.",
                link: null,
              },
              {
                show: true,
                icon: <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />,
                text: `${seasonal.tip}`,
                link: null,
              },
              {
                show: (data?.totalLeads ?? 0) === 0,
                icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
                text: "No leads have been recorded yet. Make sure the quote form is live and that the website has been published with the latest changes.",
                link: null,
              },
              {
                show: stageBreakdown.some(s => s.stage === "new" && s.count > 2),
                icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
                text: "You have multiple leads still in New status. Same-day response is the single biggest factor in conversion rate for local service businesses.",
                link: "/ops/leads",
              },
              {
                show: true,
                icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
                text: "Request indexing in Google Search Console for your homepage and top service pages after publishing any site updates.",
                link: null,
              },
            ]
              .filter(r => r.show)
              .map((rec, i) => (
                <div key={i} className="flex items-start gap-3">
                  {rec.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{rec.text}</p>
                    {rec.link && (
                      <Link href={rec.link}>
                        <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer mt-1">
                          Take action <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
