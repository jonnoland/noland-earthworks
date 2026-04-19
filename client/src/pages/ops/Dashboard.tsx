/*
 * Dashboard Page — Noland Earthworks
 * Main overview with KPI metrics, scheduled jobs, job pipeline, and lead pipeline.
 * Scheduled Jobs + KPIs are driven by Jobber data. Local jobs table is a secondary fallback.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, Briefcase,
  Users, Clock, ArrowUpRight, MapPin, Plus, ChevronRight, Inbox,
  CalendarDays, CalendarCheck, TrendingUp, Gauge, Activity, ExternalLink, Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "wouter";

// ─── Jobber status → local status mapping ────────────────────────────────────
// Jobber statuses: active, completed, requires_invoicing, late, archived
function mapJobberStatus(jobStatus: string): string {
  switch (jobStatus?.toLowerCase()) {
    case "active":                return "in_progress";
    case "requires_invoicing":    return "invoiced";
    case "completed":             return "completed";
    case "late":                  return "in_progress";
    case "archived":              return "cancelled";
    default:                      return "scheduled";
  }
}

const statusConfig: Record<string, { label: string; color: string }> = {
  estimate:    { label: "Estimate",   color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  scheduled:   { label: "Scheduled",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  in_progress: { label: "Active",     color: "text-primary bg-primary/10 border-primary/20" },
  completed:   { label: "Complete",   color: "text-green-400 bg-green-400/10 border-green-400/20" },
  invoiced:    { label: "Invoiced",   color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  paid:        { label: "Paid",       color: "text-green-400 bg-green-400/10 border-green-400/20" },
  cancelled:   { label: "Cancelled",  color: "text-muted-foreground bg-secondary border-border" },
};

const stageConfig: Record<string, { label: string; color: string }> = {
  new:           { label: "New Lead",      color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  contacted:     { label: "Contacted",     color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  site_visit:    { label: "Site Visit",    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  estimate_sent: { label: "Estimate Sent", color: "text-primary bg-primary/10 border-primary/20" },
  negotiating:   { label: "Negotiating",  color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  won:           { label: "Won",           color: "text-green-400 bg-green-400/10 border-green-400/20" },
  lost:          { label: "Lost",          color: "text-muted-foreground bg-secondary border-border" },
  converted:     { label: "Converted",     color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
};

function formatScheduledDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const jobDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (jobDay.getTime() === today.getTime()) return "Today";
  if (jobDay.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function KPICard({ title, value, sub, icon: Icon, delay = 0 }: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
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
        <div className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-green-400 bg-green-400/10">
          <ArrowUpRight className="w-3 h-3" />
          Live
        </div>
      </div>
      <div className="ops-metric-value text-2xl font-semibold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>
    </div>
  );
}

function EmptyState({ message, linkLabel, linkHref }: { message: string; linkLabel?: string; linkHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      <Inbox className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {linkLabel && linkHref && (
        <Link href={linkHref}>
          <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">{linkLabel} →</span>
        </Link>
      )}
    </div>
  );
}

// ─── Normalized job shape used by both Jobber and local jobs ─────────────────
interface NormalizedJob {
  id: string;
  client: string;
  title: string;
  status: string;
  jobType?: string;
  scheduledDate?: Date | null;
  address?: string;
  totalPrice?: number | null;
  acres?: number | null;
  crewDays?: number | null;
  source: "jobber" | "local";
  jobberJobNumber?: number;
  isHighPriority?: boolean;
  rescheduledAt?: Date | null;
}

export default function Dashboard() {
  const prevLeadCount = useRef<number | null>(null);

  // Local jobs (secondary — manual entries only)
  const { data: localJobs = [] } = trpc.ops.jobs.list.useQuery(undefined, { refetchInterval: 30000 });

  // Jobber jobs — primary source of truth
  const { data: jobberJobsRaw, isError: jobberError } = trpc.jobber.jobs.useQuery(
    { first: 100 },
    { retry: false, refetchInterval: 60000 }
  );

  // Leads
  const { data: leads = [] } = trpc.ops.leads.list.useQuery(undefined, { refetchInterval: 15000 });

  useEffect(() => {
    if (prevLeadCount.current !== null && leads.length > prevLeadCount.current) {
      const diff = leads.length - prevLeadCount.current;
      toast.success(`${diff} new lead${diff > 1 ? "s" : ""} just came in — check the Lead Pipeline.`);
    }
    prevLeadCount.current = leads.length;
  }, [leads.length]);

  // ─── Normalize Jobber jobs ────────────────────────────────────────────────
  const jobberJobs = useMemo<NormalizedJob[]>(() => {
    const nodes = jobberJobsRaw?.nodes ?? [];
    return nodes.map((j: any) => ({
      id: `jobber-${j.id}`,
      client: j.client?.name ?? "Unknown Client",
      title: j.title ?? `Job #${j.jobNumber}`,
      status: mapJobberStatus(j.jobStatus),
      jobType: j.jobType ?? undefined,
      scheduledDate: j.startAt ? new Date(j.startAt) : null,
      address: [j.property?.address?.street1, j.property?.address?.city]
        .filter(Boolean).join(", ") || undefined,
      totalPrice: j.total != null ? Number(j.total) : null,
      acres: null,
      crewDays: null,
      source: "jobber" as const,
      jobberJobNumber: j.jobNumber,
    }));
  }, [jobberJobsRaw]);

  // ─── Normalize local jobs ─────────────────────────────────────────────────
  const normalizedLocalJobs = useMemo<NormalizedJob[]>(() => {
    return localJobs.map((j) => ({
      id: `local-${j.id}`,
      client: j.client ?? "Unknown",
      title: j.title ?? j.client ?? "Untitled Job",
      status: j.status ?? "scheduled",
      jobType: j.jobType ?? undefined,
      scheduledDate: j.scheduledDate ? new Date(j.scheduledDate) : null,
      address: j.address ?? undefined,
      totalPrice: j.totalPrice != null ? Number(j.totalPrice) : null,
      acres: j.acres != null ? Number(j.acres) : null,
      crewDays: j.crewDays != null ? Number(j.crewDays) : null,
      source: "local" as const,
      isHighPriority: (j as any).isHighPriority ?? false,
      rescheduledAt: (j as any).rescheduledAt ? new Date((j as any).rescheduledAt) : null,
    }));
  }, [localJobs]);

  // ─── Merged jobs — Jobber is primary, local fills in anything not in Jobber ─
  const allJobs = useMemo<NormalizedJob[]>(() => {
    // If Jobber is connected and has jobs, use those as primary
    if (jobberJobs.length > 0) return jobberJobs;
    // Fallback to local jobs if Jobber not connected or empty
    return normalizedLocalJobs;
  }, [jobberJobs, normalizedLocalJobs]);

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRevenue = allJobs.reduce((s, j) => s + (j.totalPrice ?? 0), 0);
    const activeJobs = allJobs.filter(j => j.status === "in_progress").length;
    const scheduledCount = allJobs.filter(j =>
      j.status === "scheduled" || (j.scheduledDate && j.status !== "completed" && j.status !== "paid" && j.status !== "cancelled")
    ).length;
    const openLeads = leads.filter(l => !["won", "lost", "converted"].includes(l.stage)).length;

    // Performance KPIs
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const jobsThisMonth = allJobs.filter(j => {
      const d = j.scheduledDate;
      return d && d >= monthStart && d <= now;
    });
    const revenueThisMonth = jobsThisMonth.reduce((s, j) => s + (j.totalPrice ?? 0), 0);

    // Revenue per acre — local jobs only (Jobber doesn't expose acreage)
    const acreJobs = normalizedLocalJobs.filter(j => j.totalPrice && j.acres && j.acres > 0);
    const revenuePerAcre = acreJobs.length > 0
      ? acreJobs.reduce((s, j) => s + (j.totalPrice ?? 0) / (j.acres ?? 1), 0) / acreJobs.length
      : 0;

    // Avg crew days — local jobs only
    const completedWithDays = normalizedLocalJobs.filter(j =>
      (j.status === "completed" || j.status === "paid") && j.crewDays && j.crewDays > 0
    );
    const avgCompletionDays = completedWithDays.length > 0
      ? completedWithDays.reduce((s, j) => s + (j.crewDays ?? 1), 0) / completedWithDays.length
      : 0;

    // Win rate — from local leads
    const closedLeads = leads.filter(l => ["won", "lost", "converted"].includes(l.stage));
    const wonLeads = leads.filter(l => ["won", "converted"].includes(l.stage));
    const winRate = closedLeads.length > 0 ? (wonLeads.length / closedLeads.length) * 100 : 0;

    return {
      totalRevenue, activeJobs, scheduledJobs: scheduledCount, openLeads,
      revenueThisMonth, revenuePerAcre, avgCompletionDays, winRate,
      jobsThisMonth: jobsThisMonth.length,
    };
  }, [allJobs, normalizedLocalJobs, leads]);

  // ─── Status filter for scheduled jobs section ─────────────────────────────
  const [schedFilter, setSchedFilter] = useState<"all" | "scheduled" | "in_progress" | "invoiced">("all");

  // ─── Scheduled jobs — next 30 days, sorted by date ascending ─────────────
  const scheduledJobs = useMemo<NormalizedJob[]>(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + 30);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [...allJobs]
      .filter(j => {
        if (!j.scheduledDate) return false;
        if (j.status === "completed" || j.status === "paid" || j.status === "cancelled") return false;
        return j.scheduledDate >= today && j.scheduledDate <= cutoff;
      })
      .sort((a, b) => (a.scheduledDate!.getTime()) - (b.scheduledDate!.getTime()));
  }, [allJobs]);

  const filteredScheduledJobs = useMemo<NormalizedJob[]>(() => {
    if (schedFilter === "all") return scheduledJobs;
    return scheduledJobs.filter(j => j.status === schedFilter);
  }, [scheduledJobs, schedFilter]);

  // ─── Recent jobs — last 8 by scheduled date desc, or all jobs if few ──────
  const recentJobs = useMemo<NormalizedJob[]>(() => {
    return [...allJobs]
      .sort((a, b) => {
        const da = a.scheduledDate?.getTime() ?? 0;
        const db = b.scheduledDate?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 8);
  }, [allJobs]);

  // ─── Active pipeline leads ────────────────────────────────────────────────
  const pipelineLeads = useMemo(
    () => leads.filter(l => !["won", "lost", "converted"].includes(l.stage)).slice(0, 6),
    [leads]
  );

  const jobberConnected = !jobberError && (jobberJobsRaw !== undefined);

  return (
    <DashboardLayout
      title="Operations Dashboard"
      subtitle="Noland Earthworks, LLC"
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
                You have{" "}
                <span className="text-primary">{kpis.activeJobs} active {kpis.activeJobs === 1 ? "job" : "jobs"}</span>
                {kpis.scheduledJobs > 0 && (
                  <>, <span className="text-amber-400">{kpis.scheduledJobs} scheduled</span></>
                )}
                {" "}and{" "}
                <span className="text-primary">{kpis.openLeads} open {kpis.openLeads === 1 ? "lead" : "leads"}</span>{" "}
                today
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Middle &amp; West Tennessee operations</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/ops/schedule">
                <button className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors border border-border">
                  <CalendarDays className="w-4 h-4" />
                  Schedule
                </button>
              </Link>
              <Link href="/ops/jobs">
                <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors">
                  <Plus className="w-4 h-4" />
                  New Job
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Revenue"
            value={kpis.totalRevenue > 0 ? `$${kpis.totalRevenue.toLocaleString()}` : "—"}
            sub={jobberConnected ? "from Jobber jobs" : "from all jobs"}
            icon={DollarSign}
            delay={0}
          />
          <KPICard
            title="Active Jobs"
            value={kpis.activeJobs.toString()}
            sub="in progress"
            icon={Briefcase}
            delay={80}
          />
          <KPICard
            title="Scheduled Jobs"
            value={kpis.scheduledJobs.toString()}
            sub="upcoming on calendar"
            icon={CalendarCheck}
            delay={160}
          />
          <KPICard
            title="Open Leads"
            value={kpis.openLeads.toString()}
            sub="in pipeline"
            icon={Users}
            delay={240}
          />
        </div>

        {/* Scheduled Jobs — full width */}
        <div className="ops-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Scheduled Jobs
                </h3>
                {jobberConnected && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
                    Jobber
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Next 30 days — {filteredScheduledJobs.length} of {scheduledJobs.length} job{scheduledJobs.length !== 1 ? "s" : ""} shown
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "scheduled", "in_progress", "invoiced"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSchedFilter(f)}
                  className={cn(
                    "text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors",
                    schedFilter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary/70"
                  )}
                >
                  {f === "all" ? "All" : f === "in_progress" ? "Active" : f.charAt(0).toUpperCase() + f.slice(1)}
                  {" "}
                  <span className="opacity-70">
                    ({f === "all" ? scheduledJobs.length : scheduledJobs.filter(j => j.status === f).length})
                  </span>
                </button>
              ))}
              {jobberConnected ? (
                <a
                  href="https://secure.getjobber.com/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer ml-1"
                >
                  Jobber <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Link href="/ops/schedule">
                  <span className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer ml-1">
                    Calendar <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              )}
            </div>
          </div>

          {filteredScheduledJobs.length === 0 ? (
            jobberError ? (
              <EmptyState
                message="Jobber is not connected. Jobs will appear here once Jobber credentials are configured."
                linkLabel="Go to Jobs"
                linkHref="/ops/jobs"
              />
            ) : (
              <EmptyState
                message="No jobs scheduled in the next 30 days. Jobs with a start date in Jobber will appear here."
                linkLabel="Open Jobber"
                linkHref="https://secure.getjobber.com/home"
              />
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredScheduledJobs.map((job) => {
                const status = statusConfig[job.status] ?? { label: job.status, color: "text-muted-foreground bg-secondary border-border" };
                const dateLabel = formatScheduledDate(job.scheduledDate);
                const isToday = dateLabel === "Today";
                const isTomorrow = dateLabel === "Tomorrow";
                const cardHref = job.source === "jobber"
                  ? "https://secure.getjobber.com/home"
                  : "/ops/jobs";
                const isExternal = job.source === "jobber";

                const CardContent = (
                  <div className={cn(
                    "flex flex-col gap-2 p-4 rounded-lg border transition-colors cursor-pointer",
                    isToday
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : isTomorrow
                      ? "border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10"
                      : "border-border bg-secondary/20 hover:bg-secondary/40"
                  )}>
                    {/* Date badge + status + flags */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded",
                          isToday ? "text-primary bg-primary/15" : isTomorrow ? "text-amber-400 bg-amber-400/15" : "text-muted-foreground bg-secondary"
                        )}>
                          <CalendarDays className="w-3 h-3" />
                          {dateLabel}
                        </div>
                        {job.isHighPriority && (
                          <span title="High Priority" className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                            <Flag className="w-2.5 h-2.5" /> Priority
                          </span>
                        )}
                        {job.rescheduledAt && (
                          <span title="Rescheduled" className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            Rescheduled
                          </span>
                        )}
                      </div>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", status.color)}>
                        {status.label}
                      </span>
                    </div>
                    {/* Client + job info */}
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-snug">{job.client}</p>
                      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        {job.title !== job.client ? job.title : (job.jobType?.replace(/_/g, " ") ?? "Land clearing")}
                        {job.jobberJobNumber ? ` · #${job.jobberJobNumber}` : ""}
                        {job.acres ? ` · ${job.acres} ac` : ""}
                      </p>
                    </div>
                    {/* Address */}
                    {job.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{job.address}</span>
                      </div>
                    )}
                    {/* Price */}
                    {job.totalPrice != null && job.totalPrice > 0 && (
                      <div className="text-xs font-semibold text-foreground ops-metric-value">
                        ${Number(job.totalPrice).toLocaleString()}
                      </div>
                    )}
                  </div>
                );

                return isExternal ? (
                  <a
                    key={job.id}
                    href={cardHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {CardContent}
                  </a>
                ) : (
                  <Link href={cardHref} key={job.id}>
                    {CardContent}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Jobs + Lead Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recent Jobs */}
          <div className="lg:col-span-2 ops-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Recent Jobs
                  </h3>
                  {jobberConnected && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
                      Jobber
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Latest job activity</p>
              </div>
              {jobberConnected ? (
                <a
                  href="https://secure.getjobber.com/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  View in Jobber <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <Link href="/ops/jobs">
                  <span className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer">
                    View all <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              )}
            </div>
            {recentJobs.length === 0 ? (
              <EmptyState
                message="No jobs yet. Add your first job to get started."
                linkLabel="Go to Jobs"
                linkHref="/ops/jobs"
              />
            ) : (
              <div className="space-y-2">
                {recentJobs.map((job) => {
                  const status = statusConfig[job.status] ?? { label: job.status, color: "text-muted-foreground bg-secondary border-border" };
                  const isExternal = job.source === "jobber";
                  const href = isExternal ? "https://secure.getjobber.com/home" : "/ops/jobs";

                  const rowContent = (
                    <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Briefcase className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">{job.client}</span>
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {job.address && (
                            <>
                              <MapPin className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                              <span className="text-[11px] text-muted-foreground truncate">{job.address}</span>
                            </>
                          )}
                          {job.scheduledDate && (
                            <span className="text-[11px] text-amber-400 shrink-0">
                              {formatScheduledDate(job.scheduledDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-foreground ops-metric-value">
                          {job.totalPrice != null && job.totalPrice > 0 ? `$${Number(job.totalPrice).toLocaleString()}` : "—"}
                        </div>
                        {job.jobberJobNumber && (
                          <div className="text-[10px] text-muted-foreground">#{job.jobberJobNumber}</div>
                        )}
                      </div>
                    </div>
                  );

                  return isExternal ? (
                    <a key={job.id} href={href} target="_blank" rel="noopener noreferrer">
                      {rowContent}
                    </a>
                  ) : (
                    <Link href={href} key={job.id}>
                      {rowContent}
                    </Link>
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
              <Link href="/ops/leads">
                <span className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer">
                  View all <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            {pipelineLeads.length === 0 ? (
              <EmptyState
                message="No open leads. New quote form submissions will appear here."
                linkLabel="Go to Leads"
                linkHref="/ops/leads"
              />
            ) : (
              <div className="space-y-2">
                {pipelineLeads.map((lead) => {
                  const stage = stageConfig[lead.stage] ?? { label: lead.stage, color: "text-muted-foreground bg-secondary border-border" };
                  return (
                    <Link href="/ops/leads" key={lead.id}>
                      <div className="flex items-center justify-between p-2.5 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{lead.name}</p>
                          {lead.source && (
                            <p className="text-[11px] text-muted-foreground capitalize">{lead.source.replace(/_/g, " ")}</p>
                          )}
                        </div>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", stage.color)}>
                          {stage.label}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Performance KPIs */}
        <div className="ops-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Performance Metrics
              </h3>
              <p className="text-xs text-muted-foreground">
                {jobberConnected
                  ? "Revenue from Jobber · Crew days and win rate from local records"
                  : "Calculated from your job and lead records"}
              </p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Revenue / Acre</span>
              </div>
              <div className="text-xl font-bold text-foreground ops-metric-value">
                {kpis.revenuePerAcre > 0 ? `$${Math.round(kpis.revenuePerAcre).toLocaleString()}` : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">avg across {normalizedLocalJobs.filter(j => j.totalPrice && j.acres).length} jobs</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Avg Crew Days</span>
              </div>
              <div className="text-xl font-bold text-foreground ops-metric-value">
                {kpis.avgCompletionDays > 0 ? kpis.avgCompletionDays.toFixed(1) : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">days per completed job</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">This Month</span>
              </div>
              <div className="text-xl font-bold text-foreground ops-metric-value">
                {kpis.revenueThisMonth > 0 ? `$${kpis.revenueThisMonth.toLocaleString()}` : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{kpis.jobsThisMonth} job{kpis.jobsThisMonth !== 1 ? "s" : ""} scheduled</div>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Win Rate</span>
              </div>
              <div className="text-xl font-bold text-foreground ops-metric-value">
                {kpis.winRate > 0 ? `${Math.round(kpis.winRate)}%` : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">of closed leads converted</div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
