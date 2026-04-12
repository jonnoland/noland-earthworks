/**
 * Dashboard Page — Noland Earthworks
 * Main overview with KPI metrics, revenue chart, job pipeline, and activity feed
 */

import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Briefcase,
  Users, Clock, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  MapPin, CheckCircle2, AlertCircle, Timer, Plus, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const revenueData = [
  { month: "Oct", revenue: 42000, target: 50000 },
  { month: "Nov", revenue: 38000, target: 50000 },
  { month: "Dec", revenue: 55000, target: 55000 },
  { month: "Jan", revenue: 61000, target: 60000 },
  { month: "Feb", revenue: 58000, target: 65000 },
  { month: "Mar", revenue: 74000, target: 70000 },
  { month: "Apr", revenue: 68000, target: 75000 },
];

const jobTypeData = [
  { name: "Land Clearing", value: 45, color: "#f97316" },
  { name: "Forestry Mulching", value: 30, color: "#fb923c" },
  { name: "Brush Removal", value: 15, color: "#fdba74" },
  { name: "Stump Grinding", value: 10, color: "#fed7aa" },
];

const crewDayData = [
  { day: "Mon", days: 3 },
  { day: "Tue", days: 4 },
  { day: "Wed", days: 3 },
  { day: "Thu", days: 5 },
  { day: "Fri", days: 4 },
  { day: "Sat", days: 2 },
];

const recentJobs = [
  { id: "1042", client: "Smith Farm", location: "Williamson County, TN", acres: 14.5, value: 8700, status: "active", crew: "Crew A" },
  { id: "1041", client: "Henderson Property", location: "Maury County, TN", acres: 8.2, value: 4920, status: "complete", crew: "Crew B" },
  { id: "1040", client: "Lone Oak Ranch", location: "Rutherford County, TN", acres: 22.0, value: 13200, status: "scheduled", crew: "Crew A" },
  { id: "1039", client: "Davis Homestead", location: "Wilson County, TN", acres: 5.5, value: 3300, status: "complete", crew: "Crew C" },
  { id: "1038", client: "Pinecrest Development", location: "Davidson County, TN", acres: 35.0, value: 21000, status: "invoiced", crew: "Crew B" },
];

const recentLeads = [
  { name: "Tom Barker", source: "Google", acres: "~18 ac", value: 10800, stage: "Estimate Sent" },
  { name: "River Ridge LLC", source: "Referral", acres: "~45 ac", value: 27000, stage: "Job Walk" },
  { name: "Carla Mendez", source: "Facebook", acres: "~6 ac", value: 3600, stage: "New Lead" },
  { name: "Apex Land Group", source: "Google", acres: "~90 ac", value: 54000, stage: "Negotiating" },
];

const statusConfig = {
  active: { label: "Active", color: "text-primary bg-primary/10 border-primary/20" },
  complete: { label: "Complete", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  scheduled: { label: "Scheduled", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  invoiced: { label: "Invoiced", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
};

function KPICard({ title, value, change, changeLabel, icon: Icon, positive, delay = 0 }: {
  title: string;
  value: string;
  change: string;
  changeLabel: string;
  icon: React.ElementType;
  positive: boolean;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={cn(
        "ops-card p-5 transition-all duration-500",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
          positive ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div className="ops-metric-value text-2xl font-semibold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{changeLabel}</div>
    </div>
  );
}

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

export default function Dashboard() {
  const prevLeadCount = useRef<number | null>(null);
  const { data: jobs = [] } = trpc.ops.jobs.list.useQuery(undefined, { refetchInterval: 15000 });
  const { data: leads = [] } = trpc.ops.leads.list.useQuery(undefined, { refetchInterval: 15000 });

  useEffect(() => {
    if (prevLeadCount.current !== null && leads.length > prevLeadCount.current) {
      const diff = leads.length - prevLeadCount.current;
      toast.success(`${diff} new lead${diff > 1 ? 's' : ''} just came in! — Check the Lead Pipeline for details.`);
    }
    prevLeadCount.current = leads.length;
  }, [leads.length]);

  const liveKPIs = useMemo(() => {
    const totalRevenue = jobs.reduce((s, j) => s + Number(j.totalPrice ?? 0), 0);
    const activeJobs = jobs.filter(j => j.status === "in_progress").length;
    const openLeads = leads.filter(l => !["won", "lost"].includes(l.stage)).length;
    const crewDayJobs = jobs.filter(j => j.crewDays && j.totalPrice);
    const avgRate = crewDayJobs.length > 0
      ? crewDayJobs.reduce((s, j) => s + Number(j.totalPrice ?? 0) / Number(j.crewDays ?? 1), 0) / crewDayJobs.length
      : 0;
    return { totalRevenue, activeJobs, openLeads, avgRate };
  }, [jobs, leads]);

  return (
    <DashboardLayout
      title="Operations Dashboard"
      subtitle="Noland Earthworks, LLC — April 2026"
    >
      <div className="p-6 space-y-6">

        {/* Welcome banner */}
        <div
          className="relative rounded-xl overflow-hidden border border-primary/20"
          style={{
            backgroundImage: `linear-gradient(to right, oklch(0.125 0.01 255 / 97%) 40%, oklch(0.125 0.01 255 / 75%)), url(https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/ownrops-hero-bg-Y3GEAyiyFpJgvDi4PiYWMa.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
          }}
        >
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Good morning, Jon</p>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                You have <span className="text-primary">{liveKPIs.activeJobs} active jobs</span> and <span className="text-primary">{liveKPIs.openLeads} open leads</span> today
              </h2>
              <p className="text-sm text-muted-foreground mt-1">April target: $75,000 — Middle &amp; West Tennessee operations</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                onClick={() => toast.info("New job form — coming soon")}
              >
                <Plus className="w-4 h-4" />
                New Job
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Monthly Revenue Progress</span>
              <span className="text-[11px] font-semibold text-primary">$68,400 / $75,000</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "91%" }} />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value={`$${liveKPIs.totalRevenue.toLocaleString()}`}
            change="Live"
            changeLabel="from all jobs"
            icon={DollarSign}
            positive={true}
            delay={0}
          />
          <KPICard
            title="Active Jobs"
            value={liveKPIs.activeJobs.toString()}
            change="Live"
            changeLabel="in progress"
            icon={Briefcase}
            positive={true}
            delay={80}
          />
          <KPICard
            title="Open Leads"
            value={liveKPIs.openLeads.toString()}
            change="Live"
            changeLabel="in pipeline"
            icon={Users}
            positive={true}
            delay={160}
          />
          <KPICard
            title="Avg Crew-Day Rate"
            value={liveKPIs.avgRate > 0 ? `$${Math.round(liveKPIs.avgRate).toLocaleString()}` : "—"}
            change="Live"
            changeLabel="from job data"
            icon={Clock}
            positive={true}
            delay={240}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="lg:col-span-2 ops-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Revenue vs. Target
                </h3>
                <p className="text-xs text-muted-foreground">Last 7 months</p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
                  Target
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="target" name="Target" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fill="url(#targetGrad)" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Job type pie */}
          <div className="ops-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Job Types
              </h3>
              <p className="text-xs text-muted-foreground">This month's mix</p>
            </div>
            <div className="flex justify-center mb-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={jobTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {jobTypeData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {jobTypeData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground ops-metric-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Crew days + jobs row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Crew day chart */}
          <div className="ops-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Crew Days This Week
              </h3>
              <p className="text-xs text-muted-foreground">Target: 4 crew-days/day</p>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={crewDayData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-xl">
                      <p className="text-xs text-foreground">{label}: <span className="text-primary font-semibold">{payload[0].value} days</span></p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="days" fill="#f97316" radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Weekly total</span>
              <span className="text-sm font-bold text-primary ops-metric-value">21 crew-days</span>
            </div>
          </div>

          {/* Recent jobs */}
          <div className="lg:col-span-2 ops-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Recent Jobs
                </h3>
                <p className="text-xs text-muted-foreground">Latest job activity</p>
              </div>
              <button
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                onClick={() => toast.info("View all jobs — coming soon")}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {recentJobs.map((job) => {
                const status = statusConfig[job.status as keyof typeof statusConfig];
                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => toast.info(`Job #${job.id} — coming soon`)}
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">#{job.id}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">{job.client}</span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{job.location}</span>
                        <span className="text-[11px] text-muted-foreground">· {job.acres} ac</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-foreground ops-metric-value">${job.value.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">{job.crew}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leads pipeline */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Lead Pipeline
              </h3>
              <p className="text-xs text-muted-foreground">Active opportunities</p>
            </div>
            <button
              className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 rounded-md transition-colors"
              onClick={() => toast.info("Add lead — coming soon")}
            >
              <Plus className="w-3 h-3" />
              Add Lead
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Contact</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Source</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Est. Size</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2 pr-4">Est. Value</th>
                  <th className="text-left text-[11px] font-semibold text-muted-foreground pb-2">Stage</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => toast.info(`Lead: ${lead.name} — coming soon`)}
                  >
                    <td className="py-3 pr-4">
                      <span className="text-xs font-semibold text-foreground">{lead.name}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-muted-foreground">{lead.source}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-muted-foreground ops-metric-value">{lead.acres}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-semibold text-foreground ops-metric-value">${lead.value.toLocaleString()}</span>
                    </td>
                    <td className="py-3">
                      <span className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        lead.stage === "New Lead" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
                        lead.stage === "Job Walk" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
                        lead.stage === "Estimate Sent" ? "text-primary bg-primary/10 border-primary/20" :
                        "text-green-400 bg-green-400/10 border-green-400/20"
                      )}>
                        {lead.stage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Map preview + Scoreboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Map */}
          <div className="ops-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Active Job Sites
                </h3>
                <p className="text-xs text-muted-foreground">Middle &amp; West Tennessee operations</p>
              </div>
              <button
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                onClick={() => toast.info("Full map view — coming soon")}
              >
                Expand <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="relative h-52 overflow-hidden">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/ownrops-map-preview-2sVCjsLKjQ3PGDrf2Xtvf6.webp"
                alt="Job sites map"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border rounded-md px-2.5 py-1.5 text-[11px] text-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  3 active sites
                </span>
              </div>
            </div>
          </div>

          {/* Weekly scoreboard */}
          <div className="ops-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Weekly Scoreboard
              </h3>
              <p className="text-xs text-muted-foreground">Apr 1–7, 2026</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Revenue Collected", value: "$18,200", target: "$17,500", ok: true },
                { label: "Jobs Completed", value: "4", target: "4", ok: true },
                { label: "New Leads", value: "7", target: "5", ok: true },
                { label: "Avg Job Margin", value: "38%", target: "40%", ok: false },
                { label: "Crew Utilization", value: "87%", target: "90%", ok: false },
                { label: "Invoices Sent", value: "6", target: "6", ok: true },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {row.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      : <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    }
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground/60">target: {row.target}</span>
                    <span className={cn(
                      "text-xs font-bold ops-metric-value",
                      row.ok ? "text-foreground" : "text-yellow-400"
                    )}>
                      {row.value}
                    </span>
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
