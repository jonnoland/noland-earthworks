/**
 * Field Command Center — the owner-operator dashboard.
 * The default view prioritizes today's work, the next seven days, cash to
 * collect, and pipeline movement. Reporting and growth tools remain available
 * inside the collapsible Business Pulse section.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight, Briefcase, CalendarCheck, CalendarDays, CheckCircle2, ChevronDown,
  ChevronRight, CircleDollarSign, ClipboardList, Clock3, DollarSign, Eye,
  FileText, Flag, Inbox, Loader2, MapPin, PhoneCall, Receipt, Route,
  Sparkles, Target, TrendingUp, Users,
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CommandAction = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "urgent" | "attention" | "followup" | "complete";
  category: "lead" | "visit" | "quote" | "cash" | "field" | "review";
};

type CommandJob = {
  id: string;
  clientName: string;
  serviceType: string;
  status: string;
  scheduledDate: Date | null;
  address: string | null;
  acreage: number | null;
  total: number | null;
  highPriority: boolean;
};

const statusStyles: Record<string, string> = {
  in_progress: "border-primary/30 bg-primary/10 text-primary",
  scheduled: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  invoiced: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  completed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  paid: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

function formatCurrency(value: number | null | undefined) {
  return value && value > 0 ? `$${Math.round(value).toLocaleString()}` : "—";
}

function formatShortDate(value: Date | string | null | undefined) {
  if (!value) return "Date pending";
  const date = new Date(value);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrow = new Date(start);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (target.getTime() === start.getTime()) return "Today";
  if (target.getTime() === tomorrow.getTime()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function cardTone(tone: CommandAction["tone"]) {
  if (tone === "urgent") return "border-red-500/25 bg-red-500/7 text-red-300";
  if (tone === "attention") return "border-amber-400/25 bg-amber-400/7 text-amber-300";
  if (tone === "complete") return "border-emerald-400/25 bg-emerald-400/7 text-emerald-300";
  return "border-blue-400/25 bg-blue-400/7 text-blue-300";
}

function ActionIcon({ category }: { category: CommandAction["category"] }) {
  const iconClass = "h-4 w-4";
  if (category === "lead") return <PhoneCall className={iconClass} />;
  if (category === "visit" || category === "field") return <CalendarCheck className={iconClass} />;
  if (category === "quote") return <FileText className={iconClass} />;
  if (category === "cash") return <CircleDollarSign className={iconClass} />;
  return <CheckCircle2 className={iconClass} />;
}

function EmptyState({ message, href, label }: { message: string; href: string; label: string }) {
  return (
    <div className="flex min-h-30 flex-col items-center justify-center gap-2 px-5 py-7 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href={href} className="text-xs font-medium text-primary hover:underline">{label} →</Link>
    </div>
  );
}

function CommandCard({
  title, subtitle, icon: Icon, action,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {action}
      </header>
    </section>
  );
}

function CompactMetric({ label, value, detail, icon: Icon, href, tone = "default" }: {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  href: string;
  tone?: "default" | "green" | "amber" | "red";
}) {
  const colors = tone === "green" ? "text-emerald-300 bg-emerald-400/10" : tone === "amber" ? "text-amber-300 bg-amber-400/10" : tone === "red" ? "text-red-300 bg-red-400/10" : "text-primary bg-primary/10";
  return (
    <Link href={href} className="group rounded-lg border border-border bg-secondary/15 p-4 transition-colors hover:border-primary/35 hover:bg-secondary/35">
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", colors.split(" ")[1])}><Icon className={cn("h-4 w-4", colors.split(" ")[0])} /></span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <p className="text-xl font-semibold text-foreground ops-metric-value">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-foreground/90">{label}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
    </Link>
  );
}

export default function Dashboard() {
  const [businessPulseOpen, setBusinessPulseOpen] = useState(false);
  const [morningBrief, setMorningBrief] = useState<string | null>(null);
  const [leadPlanVisible, setLeadPlanVisible] = useState(false);
  const [completedLeadSteps, setCompletedLeadSteps] = useState<Set<number>>(new Set());
  const previousLeadCount = useRef<number | null>(null);

  const { data: localJobs = [], isLoading: localJobsLoading } = trpc.ops.jobs.list.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: nativeJobs = [], isLoading: nativeJobsLoading } = trpc.nativeJobs.list.useQuery({}, { refetchInterval: 30_000 });
  const { data: invoices = [], isLoading: invoicesLoading } = trpc.nativeJobs.listInvoices.useQuery({}, { refetchInterval: 60_000 });
  const { data: quotesData, isLoading: quotesLoading } = trpc.nativeQuotes.list.useQuery({ limit: 100 }, { refetchInterval: 60_000 });
  const { data: leads = [], isLoading: leadsLoading } = trpc.ops.leads.list.useQuery(undefined, { refetchInterval: 15_000 });
  const { data: milestones } = trpc.ops.getLeadGenerationMilestones.useQuery(undefined, { staleTime: 60_000, refetchInterval: 300_000 });
  const { data: waitlistByCounty = [] } = trpc.emailSubscribe.getWaitlistByCounty.useQuery(undefined, { staleTime: 60_000, refetchInterval: 60_000 });
  const { data: reviewRequests = [] } = trpc.ops.getReviewRequests.useQuery(undefined, { staleTime: 300_000, retry: false });
  const { data: leadActionPlan, isFetching: leadPlanLoading, refetch: refetchLeadPlan } = trpc.ops.leads.generateLeadActionPlan.useQuery(undefined, { enabled: false, retry: false });
  const generateBrief = trpc.ops.getMorningBrief.useMutation({
    onSuccess: (data: any) => setMorningBrief(data.content),
    onError: (error: any) => toast.error(error.message || "Morning Brief could not be generated."),
  });

  const isLoading = localJobsLoading || nativeJobsLoading || invoicesLoading || quotesLoading || leadsLoading;
  const quotes = quotesData?.quotes ?? [];

  useEffect(() => {
    if (previousLeadCount.current !== null && leads.length > previousLeadCount.current) {
      const newLeads = leads.length - previousLeadCount.current;
      toast.success(`${newLeads} new website request${newLeads === 1 ? "" : "s"} received.`);
    }
    previousLeadCount.current = leads.length;
  }, [leads.length]);

  const jobs = useMemo<CommandJob[]>(() => {
    const source = nativeJobs.length > 0 ? nativeJobs : localJobs;
    return source.map((job: any) => ({
      id: String(job.id),
      clientName: job.clientName ?? job.client ?? job.customerName ?? "Unknown client",
      serviceType: job.serviceType ?? job.jobType?.replace(/_/g, " ") ?? job.title ?? "Land Management",
      status: job.status ?? "scheduled",
      scheduledDate: job.scheduledDate ? new Date(job.scheduledDate) : null,
      address: job.propertyAddress ?? job.address ?? null,
      acreage: job.acres != null ? Number(job.acres) : job.acreage != null ? Number(job.acreage) : null,
      total: job.totalCents != null ? Number(job.totalCents) / 100 : job.totalPrice != null ? Number(job.totalPrice) : null,
      highPriority: Boolean(job.isHighPriority),
    }));
  }, [localJobs, nativeJobs]);

  const openInvoices = useMemo(() => invoices.filter((invoice: any) => {
    const status = String(invoice.status ?? invoice.invoiceStatus ?? "").toLowerCase();
    return !["paid", "void", "cancelled"].includes(status);
  }), [invoices]);
  const paidInvoices = useMemo(() => invoices.filter((invoice: any) => String(invoice.status ?? invoice.invoiceStatus ?? "").toLowerCase() === "paid"), [invoices]);
  const outstandingBalance = useMemo(() => openInvoices.reduce((sum: number, invoice: any) => {
    const total = Number(invoice.totalCents ?? invoice.amounts?.total ?? 0);
    const paid = Number(invoice.depositCents ?? invoice.amounts?.paid ?? 0);
    return sum + Math.max(0, total - paid) / (invoice.totalCents != null ? 100 : 1);
  }, 0), [openInvoices]);
  const overdueInvoices = useMemo(() => openInvoices.filter((invoice: any) => {
    const status = String(invoice.status ?? invoice.invoiceStatus ?? "").toLowerCase();
    return status === "overdue" || (invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now());
  }), [openInvoices]);
  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return paidInvoices.filter((invoice: any) => invoice.paidAt && new Date(invoice.paidAt) >= start)
      .reduce((sum: number, invoice: any) => sum + Number(invoice.totalCents ?? invoice.amounts?.total ?? 0) / (invoice.totalCents != null ? 100 : 1), 0);
  }, [paidInvoices]);

  const openLeads = useMemo(() => leads.filter((lead: any) => !["won", "lost", "converted"].includes(lead.stage)), [leads]);
  const draftQuotes = useMemo(() => quotes.filter((quote: any) => quote.status === "draft" || quote.proposalStatus === "draft"), [quotes]);
  const sentQuotes = useMemo(() => quotes.filter((quote: any) => quote.portalSentAt && !quote.portalAcceptedAt), [quotes]);
  const pendingVisits = useMemo(() => quotes.filter((quote: any) => ["requested", "confirmed"].includes(quote.visitStatus)), [quotes]);

  const nextSevenDays = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 7);
    return jobs.filter((job) => job.scheduledDate && job.scheduledDate >= today && job.scheduledDate <= cutoff && !["completed", "paid", "cancelled"].includes(job.status))
      .sort((a, b) => a.scheduledDate!.getTime() - b.scheduledDate!.getTime());
  }, [jobs]);

  const todayActions = useMemo<CommandAction[]>(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const actions: CommandAction[] = [];
    openLeads.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 3).forEach((lead: any) => {
      const ageHours = Math.floor((now - new Date(lead.createdAt).getTime()) / (60 * 60 * 1000));
      actions.push({
        id: `lead-${lead.id}`,
        title: `Respond to ${lead.name}`,
        detail: ageHours >= 24 ? `${ageHours} hours old — response target missed` : `${Math.max(0, ageHours)} hours since inquiry`,
        href: "/ops/leads",
        tone: ageHours >= 24 ? "urgent" : "attention",
        category: "lead",
      });
    });
    pendingVisits.slice(0, 2).forEach((quote: any) => actions.push({
      id: `visit-${quote.id}`,
      title: `${quote.visitStatus === "confirmed" ? "Confirm" : "Schedule"} site visit for ${quote.clientName}`,
      detail: quote.serviceType ?? "Property review required",
      href: `/ops/quotes?quote=${quote.id}`,
      tone: "attention",
      category: "visit",
    }));
    draftQuotes.slice(0, 2).forEach((quote: any) => actions.push({
      id: `proposal-${quote.id}`,
      title: `Finish proposal for ${quote.clientName}`,
      detail: quote.serviceType ?? "Scope and price need review",
      href: `/ops/quotes?quote=${quote.id}`,
      tone: "attention",
      category: "quote",
    }));
    sentQuotes.filter((quote: any) => now - new Date(quote.portalSentAt).getTime() >= 2 * day).slice(0, 2).forEach((quote: any) => actions.push({
      id: `followup-${quote.id}`,
      title: `Follow up with ${quote.clientName}`,
      detail: "Quote was sent more than two days ago and has not been accepted.",
      href: `/ops/quotes?quote=${quote.id}`,
      tone: "followup",
      category: "quote",
    }));
    overdueInvoices.slice(0, 2).forEach((invoice: any) => actions.push({
      id: `invoice-${invoice.id}`,
      title: `Follow up on invoice for ${invoice.clientName ?? invoice.client?.name ?? "client"}`,
      detail: "Payment is past due or needs confirmation.",
      href: "/ops/invoices",
      tone: "urgent",
      category: "cash",
    }));
    jobs.filter((job) => job.scheduledDate && ["scheduled", "in_progress"].includes(job.status) && Math.abs(job.scheduledDate.getTime() - now) <= day).slice(0, 1).forEach((job) => actions.push({
      id: `field-${job.id}`,
      title: `Check weather and access for ${job.clientName}`,
      detail: `${formatShortDate(job.scheduledDate)} · confirm ground conditions before loading out.`,
      href: "/ops/schedule",
      tone: "followup",
      category: "field",
    }));
    return actions.slice(0, 8);
  }, [draftQuotes, jobs, openLeads, overdueInvoices, pendingVisits, sentQuotes]);

  const pipeline = useMemo(() => ({
    newLeads: openLeads.filter((lead: any) => lead.stage === "new").length,
    visits: pendingVisits.length,
    proposals: draftQuotes.length,
    approvals: sentQuotes.length,
  }), [draftQuotes.length, openLeads, pendingVisits.length, sentQuotes.length]);

  const revenueChart = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
      const revenue = paidInvoices.filter((invoice: any) => invoice.paidAt && new Date(invoice.paidAt) >= month && new Date(invoice.paidAt) < nextMonth)
        .reduce((sum: number, invoice: any) => sum + Number(invoice.totalCents ?? invoice.amounts?.total ?? 0) / (invoice.totalCents != null ? 100 : 1), 0);
      return { month: month.toLocaleDateString("en-US", { month: "short" }), revenue };
    });
  }, [paidInvoices]);

  const completedReviewRequests = reviewRequests.filter((request: any) => request.sentAt || request.status === "sent").length;
  const waitlistTotal = waitlistByCounty.reduce((sum, county) => sum + county.signups, 0);

  return (
    <DashboardLayout title="Field Command Center" subtitle="Noland Earthworks, LLC">
      <main className="space-y-6 p-4 sm:p-6">
        <section
          className="relative overflow-hidden rounded-xl border border-primary/20"
          style={{
            backgroundImage: "linear-gradient(100deg, oklch(0.125 0.01 255 / 98%) 40%, oklch(0.125 0.01 255 / 76%)), url(https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/S4PPJthPzHXph6Nqq4scSB/ownrops-hero-bg-Y3GEAyiyFpJgvDi4PiYWMa.webp)",
            backgroundPosition: "center right",
            backgroundSize: "cover",
          }}
        >
          <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Field Command Center</p>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>What needs your attention today?</h1>
              <p className="mt-1 text-sm text-muted-foreground">{todayActions.length} follow-through item{todayActions.length === 1 ? "" : "s"}, {nextSevenDays.length} job{nextSevenDays.length === 1 ? "" : "s"} in the next 7 days, and {formatCurrency(outstandingBalance)} to collect.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/ops/schedule"><Button variant="outline" size="sm" className="gap-2"><CalendarDays className="h-4 w-4" />Schedule</Button></Link>
              <Link href="/ops/route-planner"><Button variant="outline" size="sm" className="gap-2"><Route className="h-4 w-4" />Route Plan</Button></Link>
              <Link href="/ops/quotes"><Button size="sm" className="gap-2"><FileText className="h-4 w-4" />New Quote</Button></Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="h-4 w-4" /></div>
                <div><h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Today’s Work Queue</h2><p className="text-xs text-muted-foreground">15-minute routine: leads, visits, proposals, deposits, weather, invoices, and review decisions.</p></div>
              </div>
              <Link href="/ops/leads" className="text-xs font-medium text-primary hover:underline">Open pipeline</Link>
            </header>
            {isLoading ? <div className="space-y-2 p-5">{[1, 2, 3].map((id) => <Skeleton key={id} className="h-15 w-full" />)}</div> : todayActions.length === 0 ? (
              <div className="px-5 py-9 text-center"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-400" /><p className="text-sm font-medium text-foreground">No immediate follow-through is waiting.</p><p className="mt-1 text-xs text-muted-foreground">New leads, quotes, invoices, and field checks will appear here automatically.</p></div>
            ) : (
              <div className="divide-y divide-border">
                {todayActions.map((action) => <Link key={action.id} href={action.href} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/25"><span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", cardTone(action.tone))}><ActionIcon category={action.category} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{action.title}</span><span className="block truncate text-xs text-muted-foreground">{action.detail}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" /></Link>)}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary/10 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><CalendarDays className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Today &amp; Next 7 Days</h2><p className="text-xs text-muted-foreground">Field work, site visits, and load-out decisions.</p></div></div><Link href="/ops/schedule" className="text-xs font-medium text-primary hover:underline">Calendar</Link></header>
            {isLoading ? <div className="space-y-2 p-5">{[1, 2, 3].map((id) => <Skeleton key={id} className="h-16 w-full" />)}</div> : nextSevenDays.length === 0 ? <EmptyState message="No jobs are scheduled in the next 7 days." href="/ops/schedule" label="Open Schedule" /> : <div className="divide-y divide-border">{nextSevenDays.slice(0, 5).map((job) => <Link key={job.id} href="/ops/schedule" className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/25"><div className="w-15 shrink-0 text-center"><p className="text-xs font-semibold text-primary">{formatShortDate(job.scheduledDate)}</p></div><span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-sm font-medium text-foreground">{job.clientName}</span>{job.highPriority && <Flag className="h-3 w-3 shrink-0 text-red-400" />}</span><span className="block truncate text-xs text-muted-foreground">{job.serviceType}{job.acreage ? ` · ${job.acreage} ac` : ""}</span>{job.address && <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground/75"><MapPin className="h-3 w-3 shrink-0" />{job.address}</span>}</span><span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold capitalize", statusStyles[job.status] ?? "border-border bg-secondary text-muted-foreground")}>{job.status.replace(/_/g, " ")}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" /></Link>)}</div>}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary/10 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><CircleDollarSign className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cash to Collect</h2><p className="text-xs text-muted-foreground">Deposits and invoices that need attention.</p></div></div><Link href="/ops/invoices" className="text-xs font-medium text-primary hover:underline">All invoices</Link></header>
            <div className="grid grid-cols-2 border-b border-border"><Link href="/ops/invoices" className="border-r border-border px-5 py-4 transition-colors hover:bg-secondary/25"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p><p className="mt-1 text-xl font-semibold text-foreground ops-metric-value">{formatCurrency(outstandingBalance)}</p><p className="mt-1 text-[11px] text-muted-foreground">{openInvoices.length} open invoice{openInvoices.length === 1 ? "" : "s"}</p></Link><Link href="/ops/invoices" className="px-5 py-4 transition-colors hover:bg-secondary/25"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Needs follow-up</p><p className={cn("mt-1 text-xl font-semibold ops-metric-value", overdueInvoices.length > 0 ? "text-red-300" : "text-foreground")}>{overdueInvoices.length}</p><p className="mt-1 text-[11px] text-muted-foreground">past due or overdue</p></Link></div>
            {openInvoices.length === 0 ? <EmptyState message="No open invoices. All caught up." href="/ops/invoices" label="Open Invoices" /> : <div className="divide-y divide-border">{openInvoices.slice(0, 4).map((invoice: any) => { const amount = Number(invoice.totalCents ?? invoice.amounts?.invoiceBalance ?? invoice.amounts?.total ?? 0) / (invoice.totalCents != null ? 100 : 1); const overdue = overdueInvoices.some((item: any) => item.id === invoice.id); return <Link key={invoice.id} href="/ops/invoices" className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/25"><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", overdue ? "bg-red-400/10 text-red-300" : "bg-primary/10 text-primary")}><Receipt className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{invoice.clientName ?? invoice.client?.name ?? "Unknown client"}</span><span className="block text-xs text-muted-foreground">{invoice.dueDate ? `Due ${formatShortDate(invoice.dueDate)}` : "Payment status needs review"}</span></span><span className={cn("text-sm font-semibold ops-metric-value", overdue ? "text-red-300" : "text-foreground")}>{formatCurrency(amount)}</span><ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></Link>; })}</div>}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-border bg-secondary/10 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300"><TrendingUp className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Pipeline Snapshot</h2><p className="text-xs text-muted-foreground">Only the stages that require movement.</p></div></div><Link href="/ops/quotes" className="text-xs font-medium text-primary hover:underline">Quotes</Link></header>
            <div className="grid grid-cols-2 divide-x divide-y divide-border"><Link href="/ops/leads" className="p-4 transition-colors hover:bg-secondary/25"><p className="text-2xl font-semibold text-foreground ops-metric-value">{pipeline.newLeads}</p><p className="mt-1 text-xs font-medium text-foreground">New leads</p><p className="text-[11px] text-muted-foreground">Respond and qualify</p></Link><Link href="/ops/quotes" className="p-4 transition-colors hover:bg-secondary/25"><p className="text-2xl font-semibold text-foreground ops-metric-value">{pipeline.visits}</p><p className="mt-1 text-xs font-medium text-foreground">Visits pending</p><p className="text-[11px] text-muted-foreground">Schedule or confirm</p></Link><Link href="/ops/quotes" className="p-4 transition-colors hover:bg-secondary/25"><p className="text-2xl font-semibold text-foreground ops-metric-value">{pipeline.proposals}</p><p className="mt-1 text-xs font-medium text-foreground">Proposals to send</p><p className="text-[11px] text-muted-foreground">Finish scope and price</p></Link><Link href="/ops/quotes" className="p-4 transition-colors hover:bg-secondary/25"><p className="text-2xl font-semibold text-foreground ops-metric-value">{pipeline.approvals}</p><p className="mt-1 text-xs font-medium text-foreground">Awaiting approval</p><p className="text-[11px] text-muted-foreground">Follow up with client</p></Link></div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <button type="button" onClick={() => setBusinessPulseOpen((open) => !open)} aria-expanded={businessPulseOpen} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/20"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><TrendingUp className="h-4 w-4" /></div><div><h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Business Pulse</h2><p className="text-xs text-muted-foreground">Reporting, growth, reviews, and longer-horizon performance.</p></div></div><span className="flex items-center gap-1.5 text-xs font-medium text-primary">{businessPulseOpen ? "Hide" : "Open"}<ChevronDown className={cn("h-4 w-4 transition-transform", businessPulseOpen && "rotate-180")} /></span></button>
          {businessPulseOpen && <div className="space-y-6 border-t border-border p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><CompactMetric label="Paid This Month" value={formatCurrency(paidThisMonth)} detail={`${paidInvoices.length} paid invoice${paidInvoices.length === 1 ? "" : "s"}`} icon={DollarSign} href="/ops/invoices" tone="green" /><CompactMetric label="Open Quotes" value={String(quotes.filter((quote: any) => !["archived", "declined", "converted"].includes(quote.status)).length)} detail="Open in the quote workspace" icon={FileText} href="/ops/quotes" /><CompactMetric label="Open Leads" value={String(openLeads.length)} detail="Across active pipeline stages" icon={Users} href="/ops/leads" tone="amber" /><CompactMetric label="Review Requests" value={String(completedReviewRequests)} detail="Sent for completed work" icon={CheckCircle2} href="/ops/reviews" tone="green" /></div>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-lg border border-border bg-secondary/10 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-foreground">Monthly Revenue</h3><p className="text-xs text-muted-foreground">Paid invoices over the last six months.</p></div><Link href="/ops/invoices" className="text-xs text-primary hover:underline">Invoices</Link></div><ResponsiveContainer width="100%" height={180}><AreaChart data={revenueChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="fieldCommandRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="oklch(0.65 0.18 55)" stopOpacity={0.3} /><stop offset="95%" stopColor="oklch(0.65 0.18 55)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.01 255 / 30%)" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 255)" }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fontSize: 10, fill: "oklch(0.6 0.01 255)" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "oklch(0.15 0.01 255)", border: "1px solid oklch(0.25 0.01 255)", borderRadius: "8px", fontSize: "11px" }} formatter={(value: number) => [formatCurrency(value), "Paid"]} /><Area type="monotone" dataKey="revenue" stroke="oklch(0.65 0.18 55)" strokeWidth={2} fill="url(#fieldCommandRevenue)" dot={{ r: 3, fill: "oklch(0.65 0.18 55)" }} /></AreaChart></ResponsiveContainer></section>
              <section className="rounded-lg border border-border bg-secondary/10 p-4"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-foreground">Expansion Waitlist by County</h3><p className="text-xs text-muted-foreground">Growth and reputation signals without crowding field work.</p></div><Link href="/ops/lead-visibility" className="text-xs text-primary hover:underline">Details</Link></div><div className="space-y-3"><div className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2"><span className="text-xs text-muted-foreground">30-day milestones</span><span className="text-xs font-semibold text-foreground">{milestones?.milestones?.filter((milestone: any) => milestone.status === "on_track").length ?? 0}/{milestones?.milestones?.length ?? 0} on track</span></div><div className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2"><span className="text-xs text-muted-foreground">Expansion waitlist</span><span className="text-xs font-semibold text-foreground">{waitlistTotal} signup{waitlistTotal === 1 ? "" : "s"}</span></div>{waitlistByCounty.length > 0 && <div className="rounded-md border border-border bg-background/30 px-3 py-2"><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Highest interest</p><div className="space-y-1">{waitlistByCounty.slice(0, 3).map((county) => <div key={county.county} className="flex items-center justify-between text-xs"><span className="text-foreground">{county.county}</span><span className="font-semibold text-primary">{county.signups}</span></div>)}</div></div>}<div className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2"><span className="text-xs text-muted-foreground">Review workflow</span><span className="text-xs font-semibold text-foreground">{completedReviewRequests} request{completedReviewRequests === 1 ? "" : "s"} sent</span></div></div></section>
            </div>
            <section className="rounded-lg border border-border bg-secondary/10 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><div><h3 className="text-sm font-semibold text-foreground">Morning Brief &amp; Weekly Lead Plan</h3><p className="text-xs text-muted-foreground">Optional planning support after the field day is set.</p></div></div><div className="flex gap-2"><Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => generateBrief.mutate({ forceRegenerate: Boolean(morningBrief) })} disabled={generateBrief.isPending}>{generateBrief.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{morningBrief ? "Refresh brief" : "Generate brief"}</Button><Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setLeadPlanVisible((visible) => !visible); if (!leadActionPlan) refetchLeadPlan(); }} disabled={leadPlanLoading}>{leadPlanLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}{leadPlanVisible ? "Hide plan" : "Lead plan"}</Button></div></div>{morningBrief && <p className="rounded-md border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-foreground">{morningBrief}</p>}{leadPlanVisible && <div className="mt-3 divide-y divide-border rounded-md border border-border">{leadActionPlan?.steps?.map((step: any, index: number) => { const done = completedLeadSteps.has(index); return <button key={`${step.title}-${index}`} type="button" onClick={() => setCompletedLeadSteps((previous) => { const next = new Set(previous); if (next.has(index)) next.delete(index); else next.add(index); return next; })} className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/25"><span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border", done ? "border-emerald-400 bg-emerald-400 text-black" : "border-border text-transparent")}>{done && <CheckCircle2 className="h-3.5 w-3.5" />}</span><span><span className={cn("block text-sm font-medium", done ? "text-muted-foreground line-through" : "text-foreground")}>{step.title}</span><span className="block text-xs text-muted-foreground">{step.detail}</span></span></button>; }) ?? <p className="px-3 py-5 text-center text-xs text-muted-foreground">Generating your weekly lead plan…</p>}</div>}</section>
          </div>}
        </section>
      </main>
    </DashboardLayout>
  );
}
