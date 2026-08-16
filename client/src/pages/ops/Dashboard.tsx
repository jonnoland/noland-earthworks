/**
 * Dashboard Page — Noland Earthworks
 * Dashboard — Noland Earthworks
 * Uses native jobs, invoices, quotes, and leads data.
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
  CalendarDays, CalendarCheck, TrendingUp, Gauge, Activity, Flag,
  FileText, Receipt, AlertCircle, CheckCircle2, PhoneCall, Star, MessageSquare,
  Sparkles, Loader2, RefreshCw, Zap, Target, Phone, Mail, Share2, CheckSquare,
  ListTodo, Send, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function KPICardSkeleton() {
  return (
    <div className="ops-card p-5">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-8 h-8 rounded-md" />
        <Skeleton className="w-12 h-5 rounded-full" />
      </div>
      <Skeleton className="w-20 h-7 mb-2" />
      <Skeleton className="w-28 h-3 mb-1" />
      <Skeleton className="w-20 h-2.5" />
    </div>
  );
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
            View all <ChevronRight className="w-3 h-3" />
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

  // ─── Native data sources (Jobber removed) ───────────────────────────────
  const jobberJobsError = false;
  const jobberJobsRaw: undefined = undefined;
  const jobberInvoicesRaw: undefined = undefined;
  const jobberQuotesRaw: undefined = undefined;
  const jobberRequestsRaw: undefined = undefined;
  const { data: localJobs = [], isLoading: jobsLoading } = trpc.ops.jobs.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: nativeJobsList = [], isLoading: nativeJobsLoading } = trpc.nativeJobs.list.useQuery({}, { refetchInterval: 30000 });
  const { data: nativeInvoicesList = [], isLoading: invoicesLoading } = trpc.nativeJobs.listInvoices.useQuery({}, { refetchInterval: 60000 });
  const { data: nativeQuotesData, isLoading: quotesLoading } = trpc.nativeQuotes.list.useQuery({ limit: 100 }, { refetchInterval: 60000 });
  const nativeQuotesList = nativeQuotesData?.quotes ?? [];

  // ─── Local leads (for pipeline section) ────────────────────────────────────────────
  const { data: leads = [], isLoading: leadsLoading } = trpc.ops.leads.list.useQuery(undefined, { refetchInterval: 15000 });
  const { data: ownerSmsAlerts = [] } = trpc.ops.smsAlerts.list.useQuery({ limit: 8 }, { refetchInterval: 30_000 });
  const dataLoading = jobsLoading || nativeJobsLoading || invoicesLoading || quotesLoading || leadsLoading;

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

  // ─── Review request tracking data ────────────────────────────────────────────────
  const { data: reviewRequestsData = [] } = trpc.ops.getReviewRequests.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  // Jobs for review request tracking (separate query to avoid conflict with allJobs NormalizedJob type)
  const { data: reviewTrackingJobs = [] } = trpc.ops.jobs.list.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const flaggedJobs = reviewTrackingJobs.filter(
    (j: any) => j.notes && [
      "complaint", "unhappy", "dissatisfied", "refund", "dispute", "problem",
      "issue", "wrong", "mistake", "damage", "damaged", "broken", "rework",
      "redo", "not happy", "not satisfied", "bad", "terrible", "awful",
    ].some(kw => j.notes.toLowerCase().includes(kw))
  );
  const sentReviewRequests = reviewTrackingJobs.filter((j: any) => j.reviewRequestSentAt);
  const [reviewTrackingOpen, setReviewTrackingOpen] = useState(false);

  // ─── 30-day lead generation milestone tracking ──────────────────────────────
  const { data: milestoneTracking } = trpc.ops.getLeadGenerationMilestones.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });
  const { data: waitlistByCounty = [], isLoading: waitlistLoading } = trpc.emailSubscribe.getWaitlistByCounty.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const [todayActionFilter, setTodayActionFilter] = useState<"all" | "urgent" | "leads" | "visits" | "proposals" | "money" | "weather" | "reviews">("all");
  const [todayActionSort, setTodayActionSort] = useState<"urgency" | "status">("urgency");

  const todaysNextActions = useMemo(() => {
    const actions: Array<{ id: string; title: string; detail: string; href: string; tone: "red" | "amber" | "blue" | "green"; category: "leads" | "visits" | "proposals" | "money" | "weather" | "reviews" }> = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    leads
      .filter((lead: any) => !["won", "lost", "converted", "estimate_sent"].includes(lead.stage) && !lead.nativeQuoteId)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 3)
      .forEach((lead: any) => {
      const ageHours = Math.max(0, Math.floor((now - new Date(lead.createdAt).getTime()) / (60 * 60 * 1000)));
      actions.push({ id: `lead-${lead.id}`, title: `Respond to ${lead.name}`, detail: ageHours >= 24 ? `${ageHours}h old — outside the 24-hour response target` : `${ageHours}h since inquiry`, href: "/ops/leads", tone: ageHours >= 24 ? "red" : "amber", category: "leads" });
      });

    nativeQuotesList.filter((quote: any) => quote.visitStatus === "requested" || quote.visitStatus === "confirmed").slice(0, 2).forEach((quote: any) => {
      actions.push({ id: `visit-${quote.id}`, title: `${quote.visitStatus === "confirmed" ? "Confirm" : "Schedule"} site visit for ${quote.clientName}`, detail: `${quote.serviceType ?? "Site visit request"} · ${quote.nextActionType ?? "confirm property details"}`, href: `/ops/quotes?quote=${quote.id}`, tone: "amber", category: "visits" });
    });

    nativeQuotesList.filter((quote: any) => quote.proposalStatus === "draft" || quote.status === "draft").slice(0, 2).forEach((quote: any) => {
      actions.push({ id: `proposal-${quote.id}`, title: `Finish proposal for ${quote.clientName}`, detail: `${quote.serviceType ?? "Quote"} · ${quote.nextActionType ?? "review scope and send"}`, href: `/ops/quotes?quote=${quote.id}`, tone: "amber", category: "proposals" });
    });

    nativeQuotesList.filter((quote: any) => quote.portalSentAt && !quote.portalViewedAt && now - new Date(quote.portalSentAt).getTime() >= 2 * dayMs).slice(0, 3).forEach((quote: any) => {
      const days = Math.floor((now - new Date(quote.portalSentAt).getTime()) / dayMs);
      actions.push({ id: `unviewed-${quote.id}`, title: `Follow up on Quote #${quote.id}`, detail: `${quote.clientName} · sent ${days} day${days === 1 ? "" : "s"} ago and not yet viewed`, href: `/ops/quotes?quote=${quote.id}`, tone: "blue", category: "proposals" });
    });

    nativeJobsList.filter((job: any) => job.status === "completed" && !job.invoicedAt).slice(0, 2).forEach((job: any) => {
      actions.push({ id: `invoice-${job.id}`, title: `Send final invoice for ${job.clientName}`, detail: `${job.serviceType ?? "Completed job"} · final balance is ready`, href: "/ops/jobs", tone: "green", category: "money" });
    });

    nativeQuotesList.filter((quote: any) => quote.depositStatus === "requested" && !quote.depositPaidAt).slice(0, 2).forEach((quote: any) => {
      actions.push({ id: `deposit-${quote.id}`, title: `Follow up on deposit for ${quote.clientName}`, detail: `${quote.serviceType ?? "Approved quote"} · payment decision is still open`, href: `/ops/quotes?quote=${quote.id}`, tone: "blue", category: "money" });
    });

    nativeJobsList.filter((job: any) => {
      if (!job.scheduledDate || !["scheduled", "in_progress"].includes(job.status)) return false;
      const daysAway = Math.floor((new Date(job.scheduledDate).getTime() - now) / dayMs);
      return daysAway <= 1 && daysAway >= -1;
    }).slice(0, 1).forEach((job: any) => {
      actions.push({ id: `weather-${job.id}`, title: `Check weather and ground conditions for ${job.clientName}`, detail: `${formatScheduledDate(job.scheduledDate)} · confirm safe access before loading out`, href: "/ops/schedule", tone: "blue", category: "weather" });
    });

    nativeInvoicesList.filter((invoice: any) => ["unpaid", "sent"].includes(invoice.status)).slice(0, 2).forEach((invoice: any) => {
      actions.push({ id: `payment-${invoice.id}`, title: `Follow up on invoice for ${invoice.clientName}`, detail: invoice.dueDate && new Date(invoice.dueDate).getTime() < now ? "Past due — confirm payment status" : "Payment is still outstanding", href: "/ops/invoices", tone: "red", category: "money" });
    });

    nativeJobsList.filter((job: any) => job.status === "completed" && !(job as any).reviewRequestSentAt).slice(0, 1).forEach((job: any) => {
      actions.push({ id: `review-${job.id}`, title: `Decide on a review request for ${job.clientName}`, detail: "Completed job · send only after confirming the customer is satisfied", href: "/ops/reviews", tone: "green", category: "reviews" });
    });

    return actions.slice(0, 10);
  }, [leads, nativeQuotesList, nativeJobsList, nativeInvoicesList]);

  const visibleTodayActions = useMemo(() => {
    const priority = { red: 0, amber: 1, blue: 2, green: 3 };
    const filtered = todaysNextActions.filter((action) => todayActionFilter === "all" || (todayActionFilter === "urgent" ? ["red", "amber"].includes(action.tone) : action.category === todayActionFilter));
    return [...filtered].sort((a, b) => todayActionSort === "urgency"
      ? priority[a.tone] - priority[b.tone] || a.category.localeCompare(b.category)
      : a.category.localeCompare(b.category) || priority[a.tone] - priority[b.tone]);
  }, [todaysNextActions, todayActionFilter, todayActionSort]);
  useEffect(() => {
    if (prevLeadCount.current !== null && leads.length > prevLeadCount.current) {
      const diff = leads.length - prevLeadCount.current;
      toast.success(`${diff} new lead${diff > 1 ? "s" : ""} just came in — check the Lead Pipeline.`);
    }
    prevLeadCount.current = leads.length;
  }, [leads.length]);

  const jobberConnected = false;
  const jobberTokenStatus: null = null;
  const jobberExpiresAt: null = null;
  const jobberAuthUrl: undefined = undefined;

  // ─── Normalize Jobber jobs ────────────────────────────────────────────────
  // Native jobs normalization
  const jobberJobs: NormalizedJob[] = [];
  const normalizedNativeJobs = useMemo<NormalizedJob[]>(() => {
    return nativeJobsList.map((j: any) => ({
      id: `native-${j.id}`,
      client: j.client ?? "Unknown",
      title: j.title ?? j.client ?? "Untitled Job",
      status: j.status ?? "scheduled",
      jobType: j.jobType ?? undefined,
      scheduledDate: j.scheduledDate ? new Date(j.scheduledDate) : null,
      address: j.address ?? undefined,
      totalPrice: j.totalPrice != null ? Number(j.totalPrice) : null,
      acres: j.acres != null ? Number(j.acres) : null,
      crewDays: null,
      source: "local" as const,
      isHighPriority: false,
      rescheduledAt: null,
    }));
  }, [nativeJobsList]);
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
    if (normalizedNativeJobs.length > 0) return normalizedNativeJobs;
    return normalizedLocalJobs;
  }, [normalizedNativeJobs, normalizedLocalJobs]);

  // ─── Jobber invoices ──────────────────────────────────────────────────────
  // Native invoices
  const openInvoices = useMemo(() =>
    nativeInvoicesList.filter((inv: any) => inv.status !== "paid" && inv.status !== "void"),
    [nativeInvoicesList]
  );
  const overdueInvoices: any[] = [];
  const outstandingBalance = useMemo(() =>
    openInvoices.reduce((s: number, inv: any) => s + Math.max(0, Number(inv.totalCents ?? 0) - Number(inv.depositCents ?? 0)) / 100, 0),
    [openInvoices]
  );
  const paidThisMonthTotal = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return nativeInvoicesList
      .filter((inv: any) => inv.status === "paid" && inv.paidAt && new Date(inv.paidAt) >= monthStart)
      .reduce((s: number, inv: any) => s + Number(inv.totalCents ?? 0) / 100, 0);
  }, [nativeInvoicesList]);

  // ─── Jobber quotes ────────────────────────────────────────────────────────
  // Native quotes
  const openQuotes = useMemo(() =>
    nativeQuotesList.filter((q: any) => !["archived", "converted", "declined"].includes(q.status ?? "")),
    [nativeQuotesList]
  );

  // ─── Jobber requests ──────────────────────────────────────────────────────
  // Open leads pipeline
  const openRequests = useMemo(() =>
    leads.filter(l => !["won", "lost", "converted"].includes(l.stage)),
    [leads]
  );

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRevenue = allJobs.reduce((s, j) => s + (j.totalPrice ?? 0), 0);
    const activeJobs = allJobs.filter(j => j.status === "in_progress").length;
    const scheduledCount = allJobs.filter(j =>
      j.status === "scheduled" || (j.scheduledDate && j.status !== "completed" && j.status !== "paid" && j.status !== "cancelled")
    ).length;

    // Leads: from native leads pipeline
    const openLeads = leads.filter(l => !["won", "lost", "converted"].includes(l.stage)).length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const jobsThisMonth = allJobs.filter(j => {
      const d = j.scheduledDate;
      return d && d >= monthStart && d <= now;
    });
    // Revenue is cash recorded as paid, never projected work from scheduled jobs.
    const revenueThisMonth = paidThisMonthTotal;

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
              <Link href="/ops/quotes">
                <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors">
                  <Plus className="w-4 h-4" />
                  New Quote
                </button>
              </Link>
              <Link href="/ops/quotes">
                <button className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-semibold px-4 py-2 rounded-md transition-colors border border-border">
                  <FileText className="w-4 h-4" />
                  All Quotes
                </button>
              </Link>
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

        <div className="ops-card p-4">
          <SectionHeader
            title="Owner SMS Alerts"
            badge={ownerSmsAlerts.filter((alert: any) => alert.status === "accepted").length ? "Active" : undefined}
            sub="Recent internal alerts sent to your phones"
          />
          {ownerSmsAlerts.length === 0 ? (
            <EmptyState message="No owner SMS alerts have been recorded yet." />
          ) : (
            <div className="divide-y divide-border/60">
              {ownerSmsAlerts.map((alert: any) => {
                const accepted = alert.status === "accepted";
                const amount = alert.estimatedValueCents != null
                  ? `$${Math.round(alert.estimatedValueCents / 100).toLocaleString()}`
                  : "Pending site visit";
                return (
                  <div key={alert.id} className="py-3 flex items-start gap-3">
                    <div className={cn("mt-0.5 p-1.5 rounded-md", accepted ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400")}>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-foreground truncate">{alert.leadName || alert.alertType.replaceAll("_", " ")}</p>
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0", accepted ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-red-400 bg-red-400/10 border-red-400/20")}>
                          {accepted ? "Accepted by Twilio" : "Failed"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{alert.service || "Internal alert"} · {amount} · {alert.recipient}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{new Date(alert.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KPI Cards — row 1: jobs + money */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dataLoading ? (
            <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
          ) : (
            <>
              <KPICard
                title="Active Jobs"
                value={kpis.activeJobs.toString()}
                sub={"in progress"}
                icon={Briefcase}
                delay={0}
                href="/ops/quotes"
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
                value={kpis.outstandingBalance > 0 ? `$${Math.round(kpis.outstandingBalance).toLocaleString()}` : "—"}
                sub={"from invoices"}
                icon={Receipt}
                delay={160}
                accent={overdueInvoices.length > 0 ? "red" : "default"}
                href="/ops/quotes"
              />
              <KPICard
                title="Open Leads / Requests"
                value={kpis.openLeads.toString()}
                sub={"in pipeline"}
                icon={Users}
                delay={240}
                href="/ops/leads"
              />
            </>
          )}
        </div>

        {/* KPI Cards — row 2: revenue + quotes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dataLoading ? (
            <><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></>
          ) : (
            <>
              <KPICard
                title="Paid This Month"
                value={paidThisMonthTotal > 0 ? `$${Math.round(paidThisMonthTotal).toLocaleString()}` : "—"}
                sub={`${nativeInvoicesList.filter((inv: any) => inv.status === "paid").length} invoice${nativeInvoicesList.filter((inv: any) => inv.status === "paid").length !== 1 ? "s" : ""} paid`}
                icon={DollarSign}
                delay={0}
                accent="green"
                href="/ops/quotes"
              />
              <KPICard
                title="Open Quotes"
                value={kpis.openQuotes.toString()}
                sub={"pending"}
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
                href="/ops/quotes"
              />
              <KPICard
                title="Win Rate"
                value={kpis.winRate > 0 ? `${Math.round(kpis.winRate)}%` : "—"}
                sub="of closed leads converted"
                icon={Gauge}
                delay={240}
                href="/ops/leads"
              />
            </>
          )}
        </div>

        {/* Scheduled Jobs — full width */}
        <div className="ops-card p-5">
          {dataLoading ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1.5"><Skeleton className="w-32 h-4" /><Skeleton className="w-48 h-3" /></div>
                <div className="flex gap-2"><Skeleton className="w-12 h-7 rounded" /><Skeleton className="w-16 h-7 rounded" /><Skeleton className="w-14 h-7 rounded" /></div>
              </div>
              {[0,1,2].map(i => <Skeleton key={i} className="w-full h-14 rounded-md" />)}
            </div>
          ) : null}
          {!dataLoading && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Scheduled Jobs
                    </h3>
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
                  <Link href="/ops/schedule">
                    <span className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors cursor-pointer ml-1">
                      Calendar <ChevronRight className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
              </div>
              {filteredScheduledJobs.length === 0 ? (
                <EmptyState
                  message="No jobs scheduled in the next 30 days."
                  linkLabel="View All Quotes"
                  linkHref="/ops/quotes"
                />
              ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredScheduledJobs.map((job) => {
                const status = statusConfig[job.status] ?? { label: job.status, color: "text-muted-foreground bg-secondary border-border" };
                const dateLabel = formatScheduledDate(job.scheduledDate);
                const isToday = dateLabel === "Today";
                const isTomorrow = dateLabel === "Tomorrow";
                const cardHref = "/ops/quotes";
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
            </>
          )}
        </div>

        {/* Invoices + Quotes row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Open Invoices */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Open Invoices"
              badge={undefined}
              sub={overdueInvoices.length > 0
                ? `${overdueInvoices.length} overdue · $${outstandingBalance.toLocaleString()} outstanding`
                : `$${outstandingBalance.toLocaleString()} outstanding`}
              href="/ops/quotes"
            />
            {openInvoices.length === 0 ? (
              <EmptyState
                message="No open invoices. All caught up."
                linkLabel="View all quotes"
                linkHref="/ops/quotes"
              />
            ) : (
              <div className="space-y-2">
                {openInvoices.slice(0, 6).map((inv: any) => {
                  const cfg = invoiceStatusConfig[inv.invoiceStatus] ?? { label: inv.invoiceStatus, color: "text-muted-foreground bg-secondary border-border" };
                  const isOverdue = inv.invoiceStatus === "OVERDUE";
                  return (
                    <Link key={inv.id} href="/ops/quotes">
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
                    </Link>
                  );
                })}
                {openInvoices.length > 6 && (
                  <Link href="/ops/quotes"
                    className="block text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors">
                    +{openInvoices.length - 6} more invoices
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Open Quotes */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Open Quotes"
              badge={undefined}
              sub={`${openQuotes.length} quote${openQuotes.length !== 1 ? "s" : ""} awaiting approval`}
              href="/ops/quotes"
            />
            {openQuotes.length === 0 ? (
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

          {/* Open Leads / Requests */}
          <div className="ops-card p-5">
            <SectionHeader
              title="Requests"
              badge={undefined}
              sub={`${openRequests.length} open request${openRequests.length !== 1 ? "s" : ""}`}
              href="/ops/leads"
            />
            {openRequests.length === 0 ? (
              <EmptyState
                message="No open requests."
                linkLabel="View all leads"
                linkHref="/ops/leads"
              />
            ) : (
              <div className="space-y-2">
                {openRequests.slice(0, 6).map((r: any) => {
                  const cfg = requestStatusConfig[r.requestStatus] ?? { label: r.requestStatus, color: "text-muted-foreground bg-secondary border-border" };
                  return (
                    <Link key={r.id} href="/ops/leads">
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
                    </Link>
                  );
                })}
                {openRequests.length > 6 && (
                  <Link href="/ops/leads"
                    className="block text-center text-xs text-primary hover:text-primary/80 py-2 transition-colors">
                    +{openRequests.length - 6} more leads
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="lg:col-span-2 ops-card p-5">
            <SectionHeader
              title="Recent Jobs"
              badge={undefined}
              sub="Latest job activity"
              href={"/ops/quotes"}
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
                  const href = "/ops/quotes";

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
            const revenue = nativeInvoicesList
              .filter((inv: any) =>
                inv.status === "paid" &&
                inv.paidAt &&
                new Date(inv.paidAt) >= start &&
                new Date(inv.paidAt) <= end
              )
              .reduce((s: number, inv: any) => s + Number(inv.totalCents ?? 0) / 100, 0);
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
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">Native</span>
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
                    ? "Revenue from invoices · Crew days and win rate from local records"
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
                <div className="text-[11px] text-muted-foreground mt-1">{nativeInvoicesList.filter((inv: any) => inv.status === "paid").length} invoice{nativeInvoicesList.filter((inv: any) => inv.status === "paid").length !== 1 ? "s" : ""}</div>
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

      {/* ─── Today’s Next Actions + 30-Day Milestones ─────────────────────────── */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><ListTodo className="h-4 w-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Today’s Next Actions</h3>
                <p className="text-xs text-muted-foreground">15-minute routine: leads, visits, proposals, deposits, weather, invoices, and review decisions.</p>
              </div>
            </div>
            <Link href="/ops/leads" className="text-xs text-primary hover:underline">Open pipeline</Link>
          </div>
          <div className="flex flex-col gap-2 border-b border-border bg-background/25 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-muted-foreground">{visibleTodayActions.length} of {todaysNextActions.length} actions shown</p>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="today-action-filter">Filter Today’s Next Actions</label>
              <select id="today-action-filter" value={todayActionFilter} onChange={(event) => setTodayActionFilter(event.target.value as typeof todayActionFilter)} className="h-8 rounded border border-border bg-card px-2 text-xs text-foreground">
                <option value="all">All statuses</option><option value="urgent">Urgent first</option><option value="leads">New leads</option><option value="visits">Visits</option><option value="proposals">Proposals</option><option value="money">Deposits & invoices</option><option value="weather">Weather</option><option value="reviews">Reviews</option>
              </select>
              <label className="sr-only" htmlFor="today-action-sort">Sort Today’s Next Actions</label>
              <select id="today-action-sort" value={todayActionSort} onChange={(event) => setTodayActionSort(event.target.value as typeof todayActionSort)} className="h-8 rounded border border-border bg-card px-2 text-xs text-foreground">
                <option value="urgency">Sort: urgency</option><option value="status">Sort: status</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-border">
            {visibleTodayActions.length > 0 ? visibleTodayActions.map((action) => {
              const tone = action.tone === "red" ? "bg-red-500/10 text-red-400" : action.tone === "amber" ? "bg-amber-500/10 text-amber-400" : action.tone === "blue" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400";
              const Icon = action.tone === "green" ? Receipt : action.tone === "blue" ? Eye : action.tone === "red" ? Clock : Send;
              return (
                <Link key={action.id} href={action.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors group">
                  <span className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${tone}`}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground truncate">{action.title}</span>
                    <span className="block text-xs text-muted-foreground truncate"><span className="mr-1 font-medium uppercase tracking-wide text-muted-foreground/80">{action.category}</span>{action.detail}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              );
            }) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">No urgent follow-through is waiting.</p>
                <p className="text-xs text-muted-foreground mt-1">New leads, quotes, and completed jobs will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center"><Target className="h-4 w-4" /></div>
              <div>
                <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>30-Day Lead Generation</h3>
                <p className="text-xs text-muted-foreground">Live funnel progress with a daily saved snapshot.</p>
              </div>
            </div>
            <Link href="/ops/lead-visibility" className="text-xs text-primary hover:underline">Details</Link>
          </div>
          <div className="p-5 space-y-3">
            {milestoneTracking ? milestoneTracking.milestones.map((milestone: any) => {
              const actualLabel = milestone.actual === null ? "—" : milestone.unit === "percent" ? `${milestone.actual}%` : milestone.actual;
              const targetLabel = milestone.unit === "percent" ? `${milestone.target}%` : milestone.target;
              const ratio = milestone.actual === null ? 0 : Math.min(100, Math.round((milestone.actual / milestone.target) * 100));
              const barClass = milestone.status === "on_track" ? "bg-emerald-500" : milestone.status === "pending_data" ? "bg-slate-500" : "bg-amber-500";
              return (
                <div key={milestone.key}>
                  <div className="flex items-baseline justify-between gap-3 text-xs mb-1.5">
                    <span className="text-foreground truncate">{milestone.label}</span>
                    <span className={milestone.status === "on_track" ? "text-emerald-400 shrink-0" : milestone.status === "needs_attention" ? "text-amber-400 shrink-0" : "text-muted-foreground shrink-0"}>{actualLabel} / {targetLabel}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${ratio}%` }} /></div>
                </div>
              );
            }) : (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            )}
            <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
              {milestoneTracking?.settings?.lastSnapshotAt
                ? `Daily snapshot last saved ${new Date(milestoneTracking.settings.lastSnapshotAt).toLocaleDateString()}.`
                : "Daily snapshot activates after the tracker’s first scheduled run."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><MapPin className="h-4 w-4" /></div>
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Expansion Waitlist by County</h3>
              <p className="text-xs text-muted-foreground">Out-of-service visitors who asked to be notified if coverage expands.</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{waitlistByCounty.reduce((total, county) => total + county.signups, 0)} signups</span>
        </div>
        <div className="divide-y divide-border">
          {waitlistLoading ? <div className="p-5"><Skeleton className="h-8 w-full" /></div> : waitlistByCounty.length > 0 ? waitlistByCounty.map((county) => (
            <div key={county.county} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="min-w-0"><span className="block text-sm font-medium text-foreground">{county.county}</span><span className="block text-xs text-muted-foreground">Latest: {county.latestSignupAt ? new Date(county.latestSignupAt).toLocaleDateString() : "—"}</span></span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{county.signups} {county.signups === 1 ? "signup" : "signups"}</span>
            </div>
          )) : <div className="px-5 py-8 text-center"><MapPin className="h-5 w-5 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium text-foreground">No expansion waitlist signups yet.</p><p className="text-xs text-muted-foreground mt-1">Out-of-area address checks will appear here after a visitor joins the waitlist.</p></div>}
        </div>
      </div>

      {/* ─── Review Request Tracking Widget ─────────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary/20 transition-colors"
          onClick={() => setReviewTrackingOpen(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Review Request Tracker</h3>
              <p className="text-xs text-muted-foreground">
                {sentReviewRequests.length} sent &bull; {flaggedJobs.length > 0 ? `${flaggedJobs.length} flagged job${flaggedJobs.length > 1 ? "s" : ""} need attention` : "No flagged jobs"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {flaggedJobs.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 border border-red-400/20">
                {flaggedJobs.length} flagged
              </span>
            )}
            {sentReviewRequests.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-400/10 text-green-400 border border-green-400/20">
                {sentReviewRequests.length} sent
              </span>
            )}
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", reviewTrackingOpen && "rotate-90")} />
          </div>
        </div>
        {reviewTrackingOpen && (
          <div className="border-t border-border">
            {flaggedJobs.length > 0 && (
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Flagged Jobs — Review Request Suppressed</span>
                </div>
                <div className="space-y-2">
                  {flaggedJobs.map((job: any) => (
                    <div key={job.id} className="flex items-start justify-between gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{job.client}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{job.notes?.slice(0, 120)}{(job.notes?.length ?? 0) > 120 ? "..." : ""}</p>
                        <p className="text-[10px] text-red-400/70 mt-1">
                          {job.paidDate ? `Paid ${new Date(job.paidDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : job.completedDate ? `Completed ${new Date(job.completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No date"}
                        </p>
                      </div>
                      <Link href="/ops/jobs">
                        <span className="text-[10px] text-primary hover:underline cursor-pointer shrink-0 mt-1">View job</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {flaggedJobs.length === 0 && (
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400">No flagged jobs — all clear</span>
              </div>
            )}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">Review Requests Sent</span>
              </div>
              {sentReviewRequests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No review requests sent yet. Requests fire automatically 48 hours after a job is marked paid.</p>
              ) : (
                <div className="space-y-2">
                  {sentReviewRequests.slice(0, 8).map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg bg-green-500/5 border border-green-500/10 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{job.client}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {job.jobType?.replace(/_/g, " ") ?? "Job"} &bull; Sent {new Date(job.reviewRequestSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    </div>
                  ))}
                  {sentReviewRequests.length > 8 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">+{sentReviewRequests.length - 8} more — <Link href="/ops/jobs"><span className="text-primary hover:underline cursor-pointer">view all jobs</span></Link></p>
                  )}
                </div>
              )}
            </div>
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
