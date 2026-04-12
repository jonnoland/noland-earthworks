/**
 * Dashboard Page — Noland Earthworks
 * Main overview with KPI metrics, revenue chart, job pipeline, and activity feed
 */

import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/OpsDashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, DollarSign, Briefcase,
  Users, Clock, ArrowUpRight, MapPin, CheckCircle2, AlertCircle, Plus, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
          <ArrowUpRight className="w-3 h-3" />
          {change}
        </div>
      </div>
      <div className="ops-metric-value text-2xl font-semibold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{changeLabel}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data: jobs = [] } = trpc.ops.jobs.list.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30 seconds
  });
  const { data: leads = [], dataUpdatedAt } = trpc.ops.leads.list.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30 seconds
  });

  // Track lead count across refetches and fire a toast when a new lead arrives
  const prevLeadCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevLeadCount.current === null) {
      prevLeadCount.current = leads.length;
      return;
    }
    if (leads.length > prevLeadCount.current) {
      const diff = leads.length - prevLeadCount.current;
      toast.success(`${diff} new lead${diff > 1 ? "s" : ""} just came in!`, {
        description: "Check the Lead Pipeline for details.",
        duration: 6000,
      });
    }
    prevLeadCount.current = leads.length;
  }, [dataUpdatedAt]); // fire only when data is refreshed, not on every render

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

  // Build crew-day bar chart from real schedule data
  const recentJobsLive = useMemo(() => {
    return jobs
      .filter(j => ["in_progress", "scheduled", "completed", "invoiced"].includes(j.status))
      .slice(0, 5);
  }, [jobs]);

  const recentLeadsLive = useMemo(() => {
    return leads
      .filter(l => !["won", "lost"].includes(l.stage))
      .slice(0, 4);
  }, [leads]);

  const statusConfig: Record<string, { label: string; color: string }> = {
    in_progress: { label: "Active", color: "text-primary bg-primary/10 border-primary/20" },
    completed: { label: "Complete", color: "text-green-400 bg-green-400/10 border-green-400/20" },
    scheduled: { label: "Scheduled", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    invoiced: { label: "Invoiced", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
    estimate: { label: "Estimate", color: "text-muted-foreground bg-secondary/50 border-border" },
    paid: { label: "Paid", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  };

  const stageConfig: Record<string, string> = {
    new: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    contacted: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    quoted: "text-primary bg-primary/10 border-primary/20",
    won: "text-green-400 bg-green-400/10 border-green-400/20",
    lost: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  // Weekly scoreboard from live data
  const thisWeekStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weeklyStats = useMemo(() => {
    const completedThisWeek = jobs.filter(j =>
      j.status === "completed" && j.updatedAt && new Date(j.updatedAt) >= thisWeekStart
    );
    const newLeadsThisWeek = leads.filter(l =>
      l.createdAt && new Date(l.createdAt) >= thisWeekStart
    );
    const invoicedThisWeek = jobs.filter(j =>
      j.status === "invoiced" && j.updatedAt && new Date(j.updatedAt) >= thisWeekStart
    );
    const revenueThisWeek = completedThisWeek.reduce((s, j) => s + Number(j.totalPrice ?? 0), 0);
    return {
      completedJobs: completedThisWeek.length,
      newLeads: newLeadsThisWeek.length,
      invoicesSent: invoicedThisWeek.length,
      revenue: revenueThisWeek,
    };
  }, [jobs, leads, thisWeekStart]);

  return (
    <DashboardLayout
      title="Operations Dashboard"
      subtitle="Noland Earthworks, LLC — Middle & West Tennessee"
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
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Operations Overview</p>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                You have <span className="text-primary">{liveKPIs.activeJobs} active job{liveKPIs.activeJobs !== 1 ? "s" : ""}</span> and <span className="text-primary">{liveKPIs.openLeads} open lead{liveKPIs.openLeads !== 1 ? "s" : ""}</span> today
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Middle &amp; West Tennessee operations</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors"
                onClick={() => window.location.href = "/ops/jobs"}
              >
                <Plus className="w-4 h-4" />
                New Job
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value={liveKPIs.totalRevenue > 0 ? `$${liveKPIs.totalRevenue.toLocaleString()}` : "—"}
            change="Live"
            changeLabel="from all jobs"
            icon={DollarSign}
            positive={true}
            delay={0}
          />
          <KPICard
            title="Active Jobs"
            value={liveKPIs.activeJobs > 0 ? liveKPIs.activeJobs.toString() : "—"}
            change="Live"
            changeLabel="in progress"
            icon={Briefcase}
            positive={true}
            delay={80}
          />
          <KPICard
            title="Open Leads"
            value={liveKPIs.openLeads > 0 ? liveKPIs.openLeads.toString() : "—"}
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

        {/* Recent Jobs + Lead Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Jobs */}
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
                onClick={() => window.location.href = "/ops/jobs"}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {recentJobsLive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Briefcase className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No jobs yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Jobs you create will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentJobsLive.map((job) => {
                  const status = statusConfig[job.status] ?? { label: job.status, color: "text-muted-foreground bg-secondary/50 border-border" };
                  return (
                    <div
                      key={job.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = "/ops/jobs"}
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">#{job.id}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{job.title}</span>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", status.color)}>
                            {status.label}
                          </span>
                        </div>
                        {job.address && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                            <span className="text-[11px] text-muted-foreground truncate">{job.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-foreground ops-metric-value">
                          {job.totalPrice ? `$${Number(job.totalPrice).toLocaleString()}` : "—"}
                        </div>
                        {job.acres && <div className="text-[10px] text-muted-foreground">{job.acres} ac</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lead Pipeline */}
          <div className="ops-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Lead Pipeline
                </h3>
                <p className="text-xs text-muted-foreground">Active opportunities</p>
              </div>
              <button
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                onClick={() => window.location.href = "/ops/leads"}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {recentLeadsLive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No open leads</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Quote submissions will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeadsLive.map((lead, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = "/ops/leads"}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate block">{lead.name}</span>
                      {lead.address && <span className="text-[11px] text-muted-foreground truncate block">{lead.address}</span>}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full border ml-2 shrink-0",
                      stageConfig[lead.stage] ?? "text-muted-foreground bg-secondary/50 border-border"
                    )}>
                      {lead.stage}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Job Sites + Weekly Scoreboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Active Job Sites */}
          <div className="ops-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Active Job Sites
                </h3>
                <p className="text-xs text-muted-foreground">Middle and West Tennessee</p>
              </div>
              <button
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                onClick={() => window.location.href = "/ops/schedule"}
              >
                Schedule <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {liveKPIs.activeJobs === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-center px-6">
                <MapPin className="w-8 h-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No active job sites</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Jobs marked "In Progress" will appear here</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {jobs.filter(j => j.status === "in_progress").map(job => (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-md bg-secondary/30">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate block">{job.title}</span>
                      {job.address && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] text-muted-foreground truncate">{job.address}</span>
                        </div>
                      )}
                    </div>
                    {job.acres && <span className="text-[11px] text-muted-foreground shrink-0">{job.acres} ac</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Scoreboard */}
          <div className="ops-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Weekly Scoreboard
              </h3>
              <p className="text-xs text-muted-foreground">This week's activity</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Revenue Collected", value: weeklyStats.revenue > 0 ? `$${weeklyStats.revenue.toLocaleString()}` : "—" },
                { label: "Jobs Completed", value: weeklyStats.completedJobs > 0 ? weeklyStats.completedJobs.toString() : "—" },
                { label: "New Leads", value: weeklyStats.newLeads > 0 ? weeklyStats.newLeads.toString() : "—" },
                { label: "Invoices Sent", value: weeklyStats.invoicesSent > 0 ? weeklyStats.invoicesSent.toString() : "—" },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                  </div>
                  <span className="text-xs font-bold ops-metric-value text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
            {weeklyStats.completedJobs === 0 && weeklyStats.newLeads === 0 && (
              <p className="text-[11px] text-muted-foreground/60 mt-3 text-center">Activity will populate as you add jobs and leads</p>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
