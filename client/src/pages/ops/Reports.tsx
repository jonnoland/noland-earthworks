/**
 * Reports Page — Noland Earthworks
 * Financial scoreboard, revenue reports, and business metrics
 */

import DashboardLayout from "@/components/OpsDashboardLayout";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

const monthlyData = [
  { month: "Oct", revenue: 42000, expenses: 28000, profit: 14000 },
  { month: "Nov", revenue: 38000, expenses: 26000, profit: 12000 },
  { month: "Dec", revenue: 55000, expenses: 34000, profit: 21000 },
  { month: "Jan", revenue: 61000, expenses: 38000, profit: 23000 },
  { month: "Feb", revenue: 58000, expenses: 36000, profit: 22000 },
  { month: "Mar", revenue: 74000, expenses: 44000, profit: 30000 },
  { month: "Apr", revenue: 68400, expenses: 41000, profit: 27400 },
];

const leadSourceData = [
  { source: "Google", leads: 18, won: 8 },
  { source: "Facebook", leads: 12, won: 4 },
  { source: "Referral", leads: 9, won: 7 },
  { source: "Website", leads: 5, won: 2 },
  { source: "Direct", leads: 3, won: 2 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-2xl">
        <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name}: ${p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const totalRevenue = monthlyData.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = monthlyData.reduce((s, m) => s + m.profit, 0);
  const avgMargin = ((totalProfit / totalRevenue) * 100).toFixed(1);

  return (
    <DashboardLayout title="Reports" subtitle="Financial scoreboard and business analytics">
      <div className="p-6 space-y-5">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "YTD Revenue", value: `$${(totalRevenue/1000).toFixed(0)}k`, trend: "+22%", up: true },
            { label: "YTD Profit", value: `$${(totalProfit/1000).toFixed(0)}k`, trend: "+18%", up: true },
            { label: "Avg Margin", value: `${avgMargin}%`, trend: "+2.1%", up: true },
            { label: "Avg Job Value", value: "$8,200", trend: "-3%", up: false },
          ].map((stat, i) => (
            <div key={i} className="ops-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className={cn(
                  "text-[10px] font-semibold flex items-center gap-0.5",
                  stat.up ? "text-green-400" : "text-red-400"
                )}>
                  {stat.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stat.trend}
                </span>
              </div>
              <div className="text-xl font-bold text-foreground ops-metric-value">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Revenue, Expenses & Profit
              </h3>
              <p className="text-xs text-muted-foreground">Oct 2025 – Apr 2026</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[3, 3, 0, 0]} opacity={0.9} />
              <Bar dataKey="expenses" name="Expenses" fill="rgba(255,255,255,0.15)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[3, 3, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead source + scoreboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lead source performance */}
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
                <Tooltip
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-xl">
                      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
                      {payload.map((p: any, i: number) => (
                        <p key={i} className="text-xs" style={{ color: p.color }}>{p.name}: {p.value}</p>
                      ))}
                    </div>
                  ) : null}
                />
                <Bar dataKey="leads" name="Leads" fill="rgba(249,115,22,0.3)" radius={[0, 3, 3, 0]} />
                <Bar dataKey="won" name="Won" fill="#f97316" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly scoreboard */}
          <div className="ops-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                April Scoreboard
              </h3>
              <p className="text-xs text-muted-foreground">Week 1 of 4 complete</p>
            </div>
            <div className="space-y-2.5">
              {[
                { metric: "Revenue", actual: "$68,400", target: "$75,000", pct: 91, ok: true },
                { metric: "Jobs Completed", actual: "8", target: "12", pct: 67, ok: false },
                { metric: "New Leads", actual: "12", target: "10", pct: 120, ok: true },
                { metric: "Avg Margin", actual: "38%", target: "40%", pct: 95, ok: false },
                { metric: "Crew Utilization", actual: "87%", target: "90%", pct: 97, ok: false },
                { metric: "Invoices Collected", actual: "$52,000", target: "$60,000", pct: 87, ok: false },
              ].map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {row.ok
                        ? <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
                        : <AlertCircle className="w-3 h-3 text-yellow-400 shrink-0" />
                      }
                      <span className="text-xs text-muted-foreground">{row.metric}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground/60">/ {row.target}</span>
                      <span className={cn(
                        "text-xs font-bold ops-metric-value w-16 text-right",
                        row.ok ? "text-foreground" : "text-yellow-400"
                      )}>
                        {row.actual}
                      </span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", row.ok ? "bg-primary" : "bg-yellow-400/60")}
                      style={{ width: `${Math.min(row.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
