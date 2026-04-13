/**
 * /ops/distance-quotes/analytics — Quote Analytics Dashboard
 * Visualizes key metrics from saved distance quotes:
 *   - KPI summary cards
 *   - Acceptance rate by job type (bar chart)
 *   - Status breakdown (pie chart)
 *   - Monthly trends — quotes created vs accepted + revenue (composed chart)
 *   - Distance distribution (bar chart)
 *   - Revenue pipeline (stacked bar)
 *   - Avg distance by job type (horizontal bar)
 */

import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp, CheckCircle, DollarSign, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line, Area,
} from "recharts";

// ─── Color palette ────────────────────────────────────────────────────────────
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const RED = "#ef4444";
const MUTED = "#6b7280";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  sent: "#3b82f6",
  accepted: "#22c55e",
  declined: "#ef4444",
  expired: "#f59e0b",
};

const JOB_TYPE_COLORS = [AMBER, GREEN, BLUE, "#a855f7", "#ec4899", "#14b8a6"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function KpiCard({
  label, value, sub, color = "text-foreground", icon,
}: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="ops-card p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl px-3 py-2 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("revenue")
            ? `$${p.value.toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function QuoteAnalytics() {
  const { data, isLoading } = trpc.ops.distanceQuotes.analytics.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Loading analytics...
        </div>
      </DashboardLayout>
    );
  }

  if (!data || data.total === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center space-y-4">
          <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto" />
          <h2 className="text-base font-semibold text-foreground">No quote data yet</h2>
          <p className="text-sm text-muted-foreground">
            Save quotes from the Distance Pricing tool to start seeing analytics here.
          </p>
          <Link href="/ops/pricing">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-md transition-all">
              Go to Pricing Tool
            </button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const pipelineData = [
    { name: "Draft", value: Math.round(data.pipeline.draftCents / 100), fill: STATUS_COLORS.draft },
    { name: "Sent", value: Math.round(data.pipeline.sentCents / 100), fill: STATUS_COLORS.sent },
    { name: "Accepted", value: Math.round(data.pipeline.acceptedCents / 100), fill: STATUS_COLORS.accepted },
    { name: "Declined", value: Math.round(data.pipeline.declinedCents / 100), fill: STATUS_COLORS.declined },
  ].filter(d => d.value > 0);

  const totalPipelineCents = data.pipeline.draftCents + data.pipeline.sentCents + data.pipeline.acceptedCents + data.pipeline.declinedCents;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/ops/distance-quotes">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Distance Quotes
            </button>
          </Link>
          <span className="text-muted-foreground text-xs">/</span>
          <h1 className="text-base font-bold text-foreground">Quote Analytics</h1>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Total Quotes"
            value={data.total}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <KpiCard
            label="Overall Acceptance"
            value={`${data.overallAcceptanceRate}%`}
            sub={`${data.statusBreakdown.find(s => s.status === "accepted")?.count ?? 0} accepted`}
            color="text-green-400"
            icon={<CheckCircle className="w-4 h-4" />}
          />
          <KpiCard
            label="Accepted Revenue"
            value={fmt(data.pipeline.acceptedCents)}
            sub="from accepted quotes"
            color="text-primary"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <KpiCard
            label="Total Pipeline"
            value={fmt(totalPipelineCents)}
            sub="all statuses"
            icon={<MapPin className="w-4 h-4" />}
          />
        </div>

        {/* Row 1: Acceptance by job type + Status pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Acceptance rate by job type */}
          <div className="ops-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-4">Acceptance Rate by Job Type</h3>
            {data.acceptanceByJobType.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.acceptanceByJobType} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="jobType" tick={{ fontSize: 10, fill: MUTED }} />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} unit="%" domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="acceptanceRate" name="Acceptance Rate %" radius={[3, 3, 0, 0]}>
                    {data.acceptanceByJobType.map((_, i) => (
                      <Cell key={i} fill={JOB_TYPE_COLORS[i % JOB_TYPE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status breakdown pie */}
          <div className="ops-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-4">Quote Status Breakdown</h3>
            {data.statusBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? MUTED} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number, name: string) => [val, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 2: Monthly trends */}
        <div className="ops-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-4">Monthly Trends — Quotes Created vs Accepted + Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data.monthlyTrends} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: MUTED }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: MUTED }} tickFormatter={v => `$${v.toLocaleString()}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar yAxisId="left" dataKey="created" name="Created" fill="#374151" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="accepted" name="Accepted" fill={GREEN} radius={[2, 2, 0, 0]} />
              <Area yAxisId="right" type="monotone" dataKey="revenueDollars" name="Revenue $" fill={`${AMBER}20`} stroke={AMBER} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3: Distance distribution + Revenue pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Distance distribution */}
          <div className="ops-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-4">Distance Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.distanceDistribution} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Quotes" fill={BLUE} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue pipeline */}
          <div className="ops-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-4">Revenue Pipeline by Status</h3>
            {pipelineData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No revenue data</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={pipelineData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: MUTED }} width={55} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                      {pipelineData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Pipeline totals */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {pipelineData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                      <span className="text-muted-foreground">{d.name}:</span>
                      <span className="font-semibold text-foreground">${d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 4: Acceptance rate table */}
        <div className="ops-card p-4">
          <h3 className="text-xs font-semibold text-foreground mb-4">Job Type Performance Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Job Type</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Quotes</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Accepted</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Rate</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total Value</th>
                  <th className="text-right py-2 pl-3 font-medium text-muted-foreground">Accepted Value</th>
                </tr>
              </thead>
              <tbody>
                {data.acceptanceByJobType
                  .sort((a, b) => b.acceptanceRate - a.acceptanceRate)
                  .map((row, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{row.jobType}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{row.total}</td>
                      <td className="py-2.5 px-3 text-right text-green-400">{row.accepted}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={cn(
                          "font-semibold",
                          row.acceptanceRate >= 60 ? "text-green-400" :
                          row.acceptanceRate >= 30 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {row.acceptanceRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{fmt(row.totalRevenueCents)}</td>
                      <td className="py-2.5 pl-3 text-right font-semibold text-primary">{fmt(row.acceptedRevenueCents)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Avg distance by job type */}
        {data.avgDistanceByJobType.length > 0 && (
          <div className="ops-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-4">Average Drive Distance by Job Type</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.avgDistanceByJobType} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: MUTED }} unit=" mi" />
                <YAxis type="category" dataKey="jobType" tick={{ fontSize: 10, fill: MUTED }} width={110} />
                <Tooltip formatter={(v: number) => [`${v} mi`, "Avg Distance"]} />
                <Bar dataKey="avgMiles" name="Avg Miles" fill={AMBER} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Avg quote value per job type — last 6 months */}
        {data.jobTypesList.length > 0 && (
          <div className="ops-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-1">Avg Quote Value per Job Type — Last 6 Months</h3>
            <p className="text-[10px] text-muted-foreground mb-4">
              Average adjusted job total per quote, grouped by service type. Months with no quotes for a type are omitted.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.avgValueByJobTypeByMonth}
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis
                  tick={{ fontSize: 10, fill: MUTED }}
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v != null ? `$${v.toLocaleString()}` : "—",
                    name,
                  ]}
                  contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 6, fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {data.jobTypesList.map((jt, i) => (
                  <Bar
                    key={jt}
                    dataKey={jt}
                    name={jt}
                    fill={JOB_TYPE_COLORS[i % JOB_TYPE_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
