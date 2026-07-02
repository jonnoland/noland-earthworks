/**
 * Dashboard Page — Noland Earthworks
 * Full Jobber sync: Jobs, Invoices, Quotes, and Requests all pulled from Jobber.
 * Local jobs table is a secondary fallback when Jobber is not connected.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  DollarSign, Briefcase,
  Users, Clock, ArrowUpRight, MapPin, Plus, ChevronRight, Inbox,
  CalendarDays, CalendarCheck, TrendingUp, Gauge, Activity, ExternalLink, Flag,
  FileText, Receipt, AlertCircle, CheckCircle2, PhoneCall, Star, MessageSquare,
  Sparkles, Loader2, RefreshCw, Zap, Target, Phone, Mail, Share2, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// ─── Jobber status → local status mapping ────────────────────────────────────
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

const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Draft",     color: "text-muted-foreground bg-secondary border-border" },
  SENT:      { label: "Sent",      color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  VIEWED:    { label: "Viewed",    color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  PAID:      { label: "Paid",      color: "text-green-400 bg-green-400/10 border-green-400/20" },
  OVERDUE:   { label: "Overdue",   color: "text-red-400 bg-red-400/10 border-red-400/20" },
  BAD_DEBT:  { label: "Bad Debt",  color: "text-red-500 bg-red-500/10 border-red-500/20" },
};

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Draft",     color: "text-muted-foreground bg-secondary border-border" },
  SENT:      { label: "Sent",      color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  VIEWED:    { label: "Viewed",    color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  APPROVED:  { label: "Approved",  color: "text-green-400 bg-green-400/10 border-green-400/20" },
  CHANGES_REQUESTED: { label: "Changes Req.", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  ARCHIVED:  { label: "Archived",  color: "text-muted-foreground bg-secondary border-border" },
  CONVERTED_TO_JOB: { label: "Converted", color: "text-primary bg-primary/10 border-primary/20" },
};

const requestStatusConfig: Record<string, { label: string; color: string }> = {
  NEW:         { label: "New",         color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  ASSESSMENT_SCHEDULED: { label: "Assessment", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  ASSESSMENT_COMPLETE:  { label: "Assessed",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20" },
  QUOTE_SENT:  { label: "Quote Sent",  color: "text-primary bg-primary/10 border-primary/20" },
  CONVERTED:   { label: "Converted",   color: "text-green-400 bg-green-400/10 border-green-400/20" },
  ARCHIVED:    { label: "Archived",    color: "text-muted-foreground bg-secondary border-border" },
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

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function KPICard({ title, value, sub, icon: Icon, delay = 0, accent, href }: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  delay?: number;
  accent?: "green" | "red" | "amber" | "default";
  href?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const accentColor = accent === "green" ? "text-green-400 bg-green-400/10"
    : accent === "red" ? "text-red-400 bg-red-400/10"
    : accent === "amber" ? "text-amber-400 bg-amber-400/10"
    : "text-primary bg-primary/10";

  const inner = (
    <div
      className={cn(
        "ops-card p-5 transition-all duration-500",
        href ? "cursor-pointer hover:border-primary/40 hover:bg-card/80" : "",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2 rounded-md", accentColor.split(" ")[1])}>
          <Icon className={cn("w-4 h-4", accentColor.split(" ")[0])} />
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
  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
}

function SectionHeader({ title, badge, sub, href, external }: {
  title: string;
  badge?: string;
  sub: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {href && (
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer">
            View in Jobber <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <Link href={href}>
            <span className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer">
              View all <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )
      )}
    </div>
  );
}

function EmptyState({ message, linkLabel, linkHref, external }: {
  message: string;
  linkLabel?: string;
  linkHref?: string;
  external?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      <Inbox className="w-8 h-8 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {linkLabel && linkHref && (
        external ? (
          <a href={linkHref} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:text-primary/80 transition-colors">
            {linkLabel} →
          </a>
        ) : (
          <Link href={linkHref}>
            <span className="text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer">{linkLabel} →</span>
          </Link>
        )
      )}
    </div>
  );
}

// ─── Normalized job shape ─────────────────────────────────────────────────────
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

  // ─── Priority 3: AI Morning Brief ────────────────────────────────────────
  const [morningBrief, setMorningBrief] = useState<string | null>(null);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const generateBriefMutation = trpc.ops.getMorningBrief.useMutation({
    onSuccess: (data: any) => { setMorningBrief(data.content); setBriefDismissed(false); },
    onError: (err: any) => toast.error(err.message || "Failed to generate morning brief."),
  });

  // ─── Get More Leads panel ─────────────────────────────────────────────────
  const [leadPlanVisible, setLeadPlanVisible] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { data: leadActionPlan, isFetching: leadPlanLoading, refetch: refetchLeadPlan } =
    trpc.ops.leads.generateLeadActionPlan.useQuery(undefined, { enabled: false, retry: false });

  // ─── Jobber data — primary source of truth ───────────────────────────────
  const { data: jobberJobsRaw, isError: jobberJobsError } = trpc.jobber.jobs.useQuery(
    { first: 100 }, { retry: false, refetchInterval: 60000 }
  );
  const { data: jobberInvoicesRaw, isError: jobberInvoicesError } = trpc.jobber.invoices.useQuery(
    { first: 50 }, { retry: false, refetchInterval: 60000 }
  );
  const { data: jobberQuotesRaw, isError: jobberQuotesError } = trpc.jobber.quotes.useQuery(
    { first: 50 }, { retry: false, refetchInterval: 60000 }
  );
  const { data: jobberRequestsRaw, isError: jobberRequestsError } = trpc.jobber.requests.useQuery(
    { first: 50 }, { retry: false, refetchInterval: 60000 }
  );

  // ─── Local jobs (fallback) ────────────────────────────────────────────────
  const { data: localJobs = [] } = trpc.ops.jobs.list.useQuery(undefined, { refetchInterval: 30000 });

  // ─── Local leads (for pipeline section) ────────────────────────────────────────────
  const { data: leads = [] } = trpc.ops.leads.list.useQuery(undefined, { refetchInterval: 15000 });

  // ─── Google Business Profile reviews (latest 5 for dashboard widget) ────────────
  const { data: googleReviewsData } = trpc.ops.google.fetchReviews.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const { data: googleStatus } = trpc.ops.google.connectionStatus.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const dashboardReviews = (googleReviewsData?.reviews ?? []).slice(0, 5);
  useEffect(() => {
    if (prevLeadCount.current !== null && leads.length > prevLeadCount.current) {
      const diff = leads.length - prevLeadCount.current;
      toast.success(`${diff} new lead${diff > 1 ? "s" : ""} just came in — check the Lead Pipeline.`);
    }
    prevLeadCount.current = leads.length;
  }, [leads.length]);

  const jobberConnected = !jobberJobsError && jobberJobsRaw !== undefined;

  // ── Jobber token status (for expiry alert banner) ─────────────────────────
  const { data: integrationStatus } = trpc.ops.settings.getIntegrationStatus.useQuery(undefined, {
    staleTime: 2 * 60 * 1000,   // re-check every 2 minutes
    refetchInterval: 2 * 60 * 1000,
    retry: false,
  });
  const jobberTokenStatus = integrationStatus?.jobber.tokenStatus ?? null;
  const jobberExpiresAt   = integrationStatus?.jobber.expiresAt   ?? null;
  const { data: jobberAuthUrl } = trpc.jobber.getAuthUrl.useQuery(undefined, { staleTime: 60_000 });

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

  const allJobs = useMemo<NormalizedJob[]>(() => {
    if (jobberJobs.length > 0) return jobberJobs;
    return normalizedLocalJobs;
  }, [jobberJobs, normalizedLocalJobs]);

  // ─── Jobber invoices ──────────────────────────────────────────────────────
  const invoices = useMemo(() => {
    return (jobberInvoicesRaw?.nodes ?? []) as any[];
  }, [jobberInvoicesRaw]);

  const openInvoices = useMemo(() =>
    invoices.filter((inv: any) => !["PAID", "BAD_DEBT", "DRAFT"].includes(inv.invoiceStatus)),
    [invoices]
  );

  const overdueInvoices = useMemo(() =>
    invoices.filter((inv: any) => inv.invoiceStatus === "OVERDUE"),
    [invoices]
  );

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return invoices.filter((inv: any) =>
      inv.invoiceStatus === "PAID" &&
      inv.issuedDate && new Date(inv.issuedDate) >= monthStart
    );
  }, [invoices]);

  const outstandingBalance = useMemo(() =>
    openInvoices.reduce((s: number, inv: any) => s + Number(inv.amounts?.invoiceBalance ?? 0), 0),
    [openInvoices]
  );

  const paidThisMonthTotal = useMemo(() =>
    paidThisMonth.reduce((s: number, inv: any) => s + Number(inv.amounts?.total ?? 0), 0),
    [paidThisMonth]
  );

  // ─── Jobber quotes ────────────────────────────────────────────────────────
  const quotes = useMemo(() => {
    return (jobberQuotesRaw?.nodes ?? []) as any[];
  }, [jobberQuotesRaw]);

  const openQuotes = useMemo(() =>
    quotes.filter((q: any) => !["ARCHIVED", "CONVERTED_TO_JOB", "DRAFT"].includes(q.quoteStatus)),
    [quotes]
  );

  // ─── Jobber requests ──────────────────────────────────────────────────────
  const requests = useMemo(() => {
    return (jobberRequestsRaw?.nodes ?? []) as any[];
  }, [jobberRequestsRaw]);

  const openRequests = useMemo(() =>
    requests.filter((r: any) => !["CONVERTED", "ARCHIVED"].includes(r.requestStatus)),
    [requests]
  );

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRevenue = allJobs.reduce((s, j) => s + (j.totalPrice ?? 0), 0);
    const activeJobs = allJobs.filter(j => j.status === "in_progress").length;
    const scheduledCount = allJobs.filter(j =>
      j.status === "scheduled" || (j.scheduledDate && j.status !== "completed" && j.status !== "paid" && j.status !== "cancelled")
    ).length;

    // Leads: Jobber requests if connected, otherwise local leads
    const openLeads = jobberConnected
      ? openRequests.length
      : leads.filter(l => !["won", "lost", "converted"].includes(l.stage)).length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const jobsThisMonth = allJobs.filter(j => {
      const d = j.scheduledDate;
      return d && d >= monthStart && d <= now;
    });
    const revenueThisMonth = jobberConnected
      ? paidThisMonthTotal
      : jobsThisMonth.reduce((s, j) => s + (j.totalPrice ?? 0), 0);

    // Revenue per acre — local jobs only
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
      outstandingBalance,
      openQuotes: openQuotes.length,
    };
  }, [allJobs, normalizedLocalJobs, leads, openRequests, paidThisMonthTotal, outstandingBalance, openQuotes, jobberConnected]);

  // ─── Status filter for scheduled jobs section ─────────────────────────────
  const [schedFilter, setSchedFilter] = useState<"all" | "scheduled" | "in_progress" | "invoiced">("all");

  // ─── Scheduled jobs — next 30 days ───────────────────────────────────────
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

  // ─── Recent jobs ──────────────────────────────────────────────────────────
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
                {kpis.outstandingBalance > 0 && (
                  <>, <span className="text-yellow-400">${kpis.outstandingBalance.toLocaleString()} outstanding</span></>
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
              <a
                href="https://nolandjobber-c3cs6zr4.manus.space"
                target="_blank"
                rel="noopener noreferrer"
                title="Jobber Service Update"
                onClick={() => { const w = window.open('https://nolandjobber-c3cs6zr4.manus.space', '_blank'); if (w) { w.document.title = 'Jobber Service Update'; } }}
              >
                <button className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors border border-border">
                  <ExternalLink className="w-4 h-4" />
                  Jobber Services Update
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Priority 3: AI Morning Brief */}
        {!briefDismissed && (
          <div className="ops-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Morning Brief</h3>
                {morningBrief && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20 font-semibold">Ready</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => generateBriefMutation.mutate({ forceRegenerate: !!morningBrief })}
                  disabled={generateBriefMutation.isPending}
                >
                  {generateBriefMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />Generating...</>
                  ) : morningBrief ? (
                    <><RefreshCw className="w-3 h-3" />Refresh</>
                  ) : (
                    <><Sparkles className="w-3 h-3 text-orange-400" />Generate Brief</>
                  )}
                </Button>
                {morningBrief && (
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setBriefDismissed(true)}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
            {morningBrief ? (
              <p className="text-xs text-foreground leading-relaxed">{morningBrief}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">Click Generate Brief for a plain-English summary of today's schedule, stale leads, and open pipeline.</p>
            )}
          </div>
        )}

        {/* Jobber token expiry alert banner */}
        {(jobberTokenStatus === "expired" || jobberTokenStatus === "expiring_soon") && (
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
            jobberTokenStatus === "expired"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
              jobberTokenStatus === "expired" ? "text-red-400" : "text-amber-400"
            }`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${
                jobberTokenStatus === "expired" ? "text-red-300" : "text-amber-300"
              }`}>
                {jobberTokenStatus === "expired"
                  ? "Jobber integration disconnected — reconnection required"
                  : "Jobber token expiring soon"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {jobberTokenStatus === "expired"
                  ? "The Jobber access token has expired. Quote submissions are no longer forwarded to Jobber until you reconnect."
                  : `The Jobber access token expires shortly${
                      jobberExpiresAt
                        ? ` (${new Date(jobberExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
                        : ""
                    }. The system will attempt an automatic refresh — if it fails, reconnect manually.`}
              </p>
            </div>
            {jobberAuthUrl?.url && (
              <a
                href={jobberAuthUrl.url}
                className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  jobberTokenStatus === "expired"
                    ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                    : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                }`}
              >
                Reconnect
              </a>
            )}
          </div>
        )}

        {/* KPI Cards — row 1: jobs + money */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Active Jobs"
            value={kpis.activeJobs.toString()}
            sub={jobberConnected ? "from Jobber" : "in progress"}
            icon={Briefcase}
            delay={0}
            href="/ops/jobs"
          />
          <KPICard
            title="Scheduled Jobs"
            value={kpis.scheduledJobs.toString()}
            sub="upcoming on calendar"
            icon={CalendarCheck}
            delay={80}
            href="/ops/schedule"
          />
          <KPICard
            title="Outstanding Balance"
            value={kpis.outstandingBalance > 0 ? `$${kpis.outstandingBalance.toLocaleString()}` : "—"}
            sub={jobberConnected ? `${openInvoices.length} open invoice${openInvoices.length !== 1 ? "s" : ""}` : "from invoices"}
            icon={Receipt}
            delay={160}
            accent={overdueInvoices.length > 0 ? "red" : "default"}
            href="/ops/invoices"
          />
          <KPICard
            title="Open Leads / Requests"
            value={kpis.openLeads.toString()}
            sub={jobberConnected ? "from Jobber requests" : "in pipeline"}
            icon={Users}
            delay={240}
            href="/ops/leads"
          />
        </div>

        {/* KPI Cards — row 2: revenue + quotes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Paid This Month"
            value={paidThisMonthTotal > 0 ? `$${paidThisMonthTotal.toLocaleString()}` : "—"}
            sub={jobberConnected ? `${paidThisMonth.length} invoice${paidThisMonth.length !== 1 ? "s" : ""} paid` : "from completed jobs"}
            icon={DollarSign}
            delay={0}
            accent="green"
            href="/ops/invoices"
          />
          <KPICard
            title="Open Quotes"
            value={kpis.openQuotes.toString()}
            sub={jobberConnected ? "awaiting approval" : "pending"}
            icon={FileText}
            delay={80}
            href="/ops/quotes"
          />
          <KPICard
            title="Revenue / Acre"
            value={kpis.revenuePerAcre > 0 ? `$${Math.round(kpis.revenuePerAcre).toLocaleString()}` : "—"}
            sub={`avg across ${normalizedLocalJobs.filter(j => j.totalPrice && j.acres).length} local jobs`}
            icon={TrendingUp}
            delay={160}
            href="/ops/jobs"
          />
          <KPICard
            title="Win Rate"
            value={kpis.winRate > 0 ? `${Math.round(kpis.winRate)}%` : "—"}
            sub="of closed leads converted"
            icon={Gauge}
            delay={240}
            href="/ops/leads"
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
            jobberJobsError ? (
              <EmptyState
                message="Jobber is not connected. Jobs will appear here once Jobber credentials are configured."
                linkLabel="Go to Jobs"
                linkHref="/ops/jobs"
              />
            ) : (
              <EmptyState
                message="No jobs scheduled in the next 30 days."
                linkLabel="Open Jobber"
                linkHref="https://secure.getjobber.com/home"
                external
              />
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredScheduledJobs.map((job) => {
                const status = statusConfig[job.status] ?? { label: job.status, color: "text-muted-foreground bg-secondary border-border" };
                const dateLabel = formatScheduledDate(job.scheduledDate);
                const isToday = dateLabel === "Today";
                const isTomorrow = dateLabel === "Tomorrow";
                const cardHref = "/ops/jobs";
                const isExternal = false;

                const CardContent = (
                  <div className={cn(
                    "flex flex-col gap-2 p-4 rounded-lg border transition-colors cursor-pointer",
                    isToday
                      ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                      : isTomorrow
                      ? "border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10"
                      : "border-border bg-secondary/20 hover:bg-secondary/40"
                  )}>
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
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-snug">{job.client}</p>
                      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                        {job.title !== job.client ? job.title : (job.jobType?.replace(/_/g, " ") ?? "Land clearing")}
                        {job.jobberJobNumber ? ` · #${job.jobberJobNumber}` : ""}
                        {job.acres ? ` · ${job.acres} ac` : ""}
                      </p>
                    </div>
                    {job.address && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-[11px] text-muted-foreground truncate">{job.address}</span>
                      </div>
                    )}
                    {job.totalPrice != null && job.totalPrice > 0 && (
                      <div className="text-xs font-semibold text-foreground ops-metric-value">
                        ${Number(job.totalPrice).toLocaleString()}
                      </div>
                    )}
                  </div>
                );

                return isExternal ? (
                  <a key={job.id} href={cardHref} target="_blank" rel="noopener noreferrer">
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

        {/* Invoices + Quotes row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Open Invoices */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Open Invoices"
              badge={jobberConnected ? "Jobber" : undefined}
              sub={overdueInvoices.length > 0
                ? `${overdueInvoices.length} overdue · $${outstandingBalance.toLocaleString()} outstanding`
                : `$${outstandingBalance.toLocaleString()} outstanding`}
              href="https://secure.getjobber.com/invoices"
              external
            />
            {jobberInvoicesError ? (
              <EmptyState message="Jobber not connected — invoices unavailable." />
            ) : openInvoices.length === 0 ? (
              <EmptyState
                message="No open invoices. All caught up."
                linkLabel="View in Jobber"
                linkHref="https://secure.getjobber.com/invoices"
                external
              />
            ) : (
              <div className="space-y-2">
                {openInvoices.slice(0, 6).map((inv: any) => {
                  const cfg = invoiceStatusConfig[inv.invoiceStatus] ?? { label: inv.invoiceStatus, color: "text-muted-foreground bg-secondary border-border" };
                  const isOverdue = inv.invoiceStatus === "OVERDUE";
                  return (
                    <a key={inv.id} href="https://secure.getjobber.com/invoices" target="_blank" rel="noopener noreferrer">
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-md transition-colors cursor-pointer",
                        isOverdue ? "bg-red-500/5 hover:bg-red-500/10 border border-red-500/20" : "bg-secondary/30 hover:bg-secondary/50"
                      )}>
                        <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", isOverdue ? "bg-red-500/10" : "bg-primary/10")}>
                          {isOverdue
                            ? <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            : <Receipt className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {inv.client?.name ?? "Unknown"}
                            </span>
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", cfg.color)}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            #{inv.invoiceNumber}
                            {inv.dueDate && ` · Due ${formatDate(inv.dueDate)}`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn("text-xs font-semibold ops-metric-value", isOverdue ? "text-red-400" : "text-foreground")}>
                            ${Number(inv.amounts?.invoiceBalance ?? inv.amounts?.total ?? 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
                {openInvoices.length > 6 && (
                  <a href="https://secure.getjobber.com/invoices" target="_blank" rel="noopener noreferrer"
                    className="block text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors">
                    +{openInvoices.length - 6} more invoices in Jobber
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Open Quotes */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Open Quotes"
              badge={jobberConnected ? "Jobber" : undefined}
              sub={`${openQuotes.length} quote${openQuotes.length !== 1 ? "s" : ""} awaiting approval`}
              href="/ops/quotes"
            />
            {jobberQuotesError ? (
              <EmptyState message="Jobber not connected — quotes unavailable." />
            ) : openQuotes.length === 0 ? (
              <EmptyState
                message="No open quotes."
                linkLabel="View all quotes"
                linkHref="/ops/quotes"
              />
            ) : (
              <div className="space-y-2">
                {openQuotes.slice(0, 6).map((q: any) => {
                  const cfg = quoteStatusConfig[q.quoteStatus] ?? { label: q.quoteStatus, color: "text-muted-foreground bg-secondary border-border" };
                  return (
                    <Link key={q.id} href={`/ops/quotes?quote=${q.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {q.client?.name ?? q.title ?? "Unknown"}
                            </span>
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", cfg.color)}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            #{q.quoteNumber}
                            {q.createdAt && ` · ${formatDate(q.createdAt)}`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-semibold text-foreground ops-metric-value">
                            {q.amounts?.total != null ? `$${Number(q.amounts.total).toLocaleString()}` : "—"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {openQuotes.length > 6 && (
                  <Link href="/ops/quotes">
                    <span className="block text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors cursor-pointer">
                      +{openQuotes.length - 6} more quotes
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Requests + Recent Jobs row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Jobber Requests (Leads) */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Requests"
              badge={jobberConnected ? "Jobber" : undefined}
              sub={`${openRequests.length} open request${openRequests.length !== 1 ? "s" : ""}`}
              href="https://secure.getjobber.com/requests"
              external
            />
            {jobberRequestsError ? (
              <EmptyState message="Jobber not connected — requests unavailable." />
            ) : openRequests.length === 0 ? (
              <EmptyState
                message="No open requests."
                linkLabel="View in Jobber"
                linkHref="https://secure.getjobber.com/requests"
                external
              />
            ) : (
              <div className="space-y-2">
                {openRequests.slice(0, 6).map((r: any) => {
                  const cfg = requestStatusConfig[r.requestStatus] ?? { label: r.requestStatus, color: "text-muted-foreground bg-secondary border-border" };
                  return (
                    <a key={r.id} href="https://secure.getjobber.com/requests" target="_blank" rel="noopener noreferrer">
                      <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <PhoneCall className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {r.client?.name ?? r.contactName ?? "Unknown"}
                            </span>
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0", cfg.color)}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {r.title ?? "Service request"}
                            {r.createdAt && ` · ${formatDate(r.createdAt)}`}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
                {openRequests.length > 6 && (
                  <a href="https://secure.getjobber.com/requests" target="_blank" rel="noopener noreferrer"
                    className="block text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors">
                    +{openRequests.length - 6} more in Jobber
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="lg:col-span-2 ops-card p-5">
            <SectionHeader
              title="Recent Jobs"
              badge={jobberConnected ? "Jobber" : undefined}
              sub="Latest job activity"
              href={jobberConnected ? "https://secure.getjobber.com/home" : "/ops/jobs"}
              external={jobberConnected}
            />
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
                  const isExternal = false;
                  const href = "/ops/jobs";

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
        </div>

        {/* Monthly Revenue Trend */}
        {jobberConnected && (() => {
          const now = new Date();
          const months: { month: string; revenue: number }[] = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
            const start = new Date(d.getFullYear(), d.getMonth(), 1);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            const revenue = invoices
              .filter((inv: any) =>
                inv.invoiceStatus === "PAID" &&
                inv.issuedDate &&
                new Date(inv.issuedDate) >= start &&
                new Date(inv.issuedDate) <= end
              )
              .reduce((s: number, inv: any) => s + Number(inv.amounts?.total ?? 0), 0);
            months.push({ month: label, revenue });
          }
          const hasData = months.some(m => m.revenue > 0);
          if (!hasData) return null;
          return (
            <div className="ops-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Monthly Revenue
                  </h3>
                  <p className="text-xs text-muted-foreground">Paid invoices — last 6 months</p>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">Jobber</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={months} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.18 55)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="oklch(0.65 0.18 55)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 255 / 30%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 255)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.01 255)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.15 0.01 255)", border: "1px solid oklch(0.25 0.01 255)", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="oklch(0.65 0.18 55)" strokeWidth={2} fill="url(#revenueGrad)" dot={{ r: 3, fill: "oklch(0.65 0.18 55)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })()}

        {/* Lead Pipeline (local) + Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Lead Pipeline */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Lead Pipeline"
              sub="Active local opportunities"
              href="/ops/leads"
            />
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

          {/* Performance Metrics */}
          <div className="lg:col-span-2 ops-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Performance Metrics
                </h3>
                <p className="text-xs text-muted-foreground">
                  {jobberConnected
                    ? "Revenue from Jobber invoices · Crew days and win rate from local records"
                    : "Calculated from your job and lead records"}
                </p>
              </div>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Paid This Month</span>
                </div>
                <div className="text-xl font-bold text-foreground ops-metric-value">
                  {paidThisMonthTotal > 0 ? `$${paidThisMonthTotal.toLocaleString()}` : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{paidThisMonth.length} invoice{paidThisMonth.length !== 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
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

        {/* ─── Google Business Profile Reviews Widget ─────────────────────────────── */}
        <div className="mt-6 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-foreground">Google Business Profile Reviews</h3>
              {googleReviewsData?.averageRating && (
                <span className="text-xs text-amber-400 font-bold ml-1">{googleReviewsData.averageRating.toFixed(1)} avg</span>
              )}
              {googleReviewsData?.totalReviewCount && (
                <span className="text-xs text-muted-foreground">({googleReviewsData.totalReviewCount} total)</span>
              )}
            </div>
            <Link href="/ops/reviews">
              <span className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer">
                View All <ArrowUpRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          {!googleStatus?.connected ? (
            <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted-foreground">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Google Business Profile not connected. Go to{" "}
              <Link href="/ops/settings">
                <span className="text-primary hover:underline cursor-pointer">Settings → Integrations</span>
              </Link>{" "}
              to connect.
            </div>
          ) : dashboardReviews.length === 0 ? (
            <div className="px-5 py-4 text-xs text-muted-foreground">No reviews found.</div>
          ) : (
            <div className="divide-y divide-border">
              {dashboardReviews.map((review) => (
                <div key={review.reviewId} className="flex items-start gap-3 px-5 py-3">
                  {review.reviewerPhotoUrl ? (
                    <img src={review.reviewerPhotoUrl} alt={review.reviewerName} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground text-xs font-bold">
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{review.reviewerName}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(review.createTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[1,2,3,4,5].map((n) => (
                        <Star key={n} className={cn("h-3 w-3", n <= review.starRating ? "fill-amber-400 text-amber-400" : "text-border")} />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{review.comment}</p>
                    )}
                    {review.reviewReply && (
                      <div className="mt-1.5 pl-3 border-l-2 border-amber-500/30">
                        <p className="text-[10px] text-amber-400 font-medium mb-0.5">Your Response</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{review.reviewReply.comment}</p>
                      </div>
                    )}
                  </div>
                  {!review.reviewReply && (
                    <Link href="/ops/reviews">
                      <span className="text-[10px] text-primary hover:underline cursor-pointer shrink-0 mt-1 flex items-center gap-0.5">
                        <MessageSquare className="w-3 h-3" /> Reply
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      {/* ─── Get More Leads Panel ──────────────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/20 transition-colors"
          onClick={() => setLeadPlanVisible(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Get More Leads
              </h3>
              <p className="text-xs text-muted-foreground">
                {leadActionPlan
                  ? `${completedSteps.size} of ${leadActionPlan.steps.length} actions completed this week`
                  : "AI-generated action plan based on your current pipeline and season"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {leadActionPlan && completedSteps.size > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
                {completedSteps.size}/{leadActionPlan.steps.length} done
              </span>
            )}
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", leadPlanVisible && "rotate-90")} />
          </div>
        </div>

        {leadPlanVisible && (
          <div className="border-t border-border">
            {/* Season context bar */}
            {leadActionPlan?.seasonNote && (
              <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/10 flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/80">{leadActionPlan.seasonNote}</p>
              </div>
            )}

            {/* Generate / Refresh button */}
            {!leadActionPlan && (
              <div className="px-5 py-6 flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Click below to generate a personalized 5-step lead generation plan for this week, based on your current pipeline and the time of year.
                </p>
                <Button
                  size="sm"
                  onClick={() => refetchLeadPlan()}
                  disabled={leadPlanLoading}
                  className="gap-2"
                >
                  {leadPlanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {leadPlanLoading ? "Generating plan..." : "Generate This Week's Plan"}
                </Button>
              </div>
            )}

            {/* Step list */}
            {leadActionPlan && leadActionPlan.steps.length > 0 && (
              <div className="divide-y divide-border">
                {leadActionPlan.steps.map((step: any, i: number) => {
                  const done = completedSteps.has(i);
                  const channelIcon = step.channel === "google" ? <MapPin className="w-3 h-3" />
                    : step.channel === "facebook" || step.channel === "instagram" ? <Share2 className="w-3 h-3" />
                    : step.channel === "phone" ? <Phone className="w-3 h-3" />
                    : step.channel === "email" ? <Mail className="w-3 h-3" />
                    : step.channel === "referral" ? <Users className="w-3 h-3" />
                    : <Zap className="w-3 h-3" />;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 px-5 py-4 transition-colors",
                        done ? "bg-green-500/5" : "hover:bg-secondary/20"
                      )}
                    >
                      <button
                        onClick={() => setCompletedSteps(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        })}
                        className={cn(
                          "mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          done
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-border hover:border-primary/60"
                        )}
                      >
                        {done && <CheckSquare className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-sm font-medium", done ? "line-through text-muted-foreground" : "text-foreground")}>
                            {step.title}
                          </span>
                          <span className={cn(
                            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border",
                            step.effort === "quick"
                              ? "text-green-400 bg-green-400/10 border-green-400/20"
                              : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                          )}>
                            {channelIcon}
                            {step.channel}
                          </span>
                          {step.effort === "quick" && (
                            <span className="text-[10px] text-muted-foreground">&lt; 30 min</span>
                          )}
                        </div>
                        <p className={cn("text-xs", done ? "text-muted-foreground/60 line-through" : "text-muted-foreground")}>
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Refresh button when plan already loaded */}
            {leadActionPlan && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">Plan generated based on your current pipeline</p>
                <button
                  onClick={() => { setCompletedSteps(new Set()); refetchLeadPlan(); }}
                  disabled={leadPlanLoading}
                  className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {leadPlanLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
