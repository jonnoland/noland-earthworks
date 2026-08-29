import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

function date(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const normalized = value ?? "unknown";
  const colors: Record<string, string> = {
    paid: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    approved: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
    scheduled: "bg-sky-500/15 text-sky-200 border-sky-400/30",
    in_progress: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    sent: "bg-sky-500/15 text-sky-200 border-sky-400/30",
    viewed: "bg-sky-500/15 text-sky-200 border-sky-400/30",
    draft: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    unpaid: "bg-amber-500/15 text-amber-200 border-amber-400/30",
    declined: "bg-rose-500/15 text-rose-200 border-rose-400/30",
    cancelled: "bg-rose-500/15 text-rose-200 border-rose-400/30",
    void: "bg-rose-500/15 text-rose-200 border-rose-400/30",
  };
  return <Badge className={`border font-medium capitalize ${colors[normalized] ?? "bg-white/10 text-zinc-200 border-white/15"}`}>{normalized.replace(/_/g, " ")}</Badge>;
}

function AccessMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center px-6">
      <section className="max-w-md text-center rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <ShieldCheck className="mx-auto mb-4 h-8 w-8 text-amber-400" aria-hidden="true" />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{children}</p>
      </section>
    </main>
  );
}

export default function OpsViewer() {
  const key = new URLSearchParams(window.location.search).get("key") ?? "";
  const { data, error, isLoading, dataUpdatedAt } = trpc.opsViewer.getBriefing.useQuery(
    { key },
    { enabled: Boolean(key), retry: false, refetchInterval: 60_000, refetchOnWindowFocus: true },
  );

  useEffect(() => {
    document.title = "Read-Only Ops Briefing | Noland Earthworks";
    const tag = document.createElement("meta");
    tag.name = "robots";
    tag.content = "noindex, nofollow, noarchive";
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);

  if (!key) return <AccessMessage title="Read-only briefing">A valid access link is required to view this briefing.</AccessMessage>;
  if (isLoading) return <AccessMessage title="Loading briefing">Retrieving the current read-only Operations summary.</AccessMessage>;
  if (error || !data) return <AccessMessage title="Briefing unavailable">This access link is invalid, expired, or no longer available.</AccessMessage>;

  const refreshedAt = dataUpdatedAt ? new Date(dataUpdatedAt) : new Date(data.generatedAt);
  const cards = [
    ["Open quote value", money(data.kpis.openQuoteValueCents)],
    ["Paid revenue", money(data.kpis.paidRevenueCents)],
    ["Active jobs", data.kpis.activeJobs.toLocaleString()],
    ["Recent website requests", data.kpis.recentWebsiteRequests.toLocaleString()],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/90 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300"><ShieldCheck className="h-4 w-4" aria-hidden="true" /><span className="text-xs font-semibold uppercase tracking-[0.16em]">Authorized read-only view</span></div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Noland Earthworks Operations Briefing</h1>
            <p className="mt-1 text-sm text-zinc-400">Refreshes while open. Last refreshed {refreshedAt.toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" })} CT.</p>
          </div>
          <Badge className="border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-amber-100">Read only</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operations summary">
          {cards.map(([label, value]) => (
            <Card key={label} className="border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none">
              <CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <BriefingTable title={`Recent website requests (${data.websiteRequests.length})`} headers={["Name", "Service", "County", "AI fit", "Received"]}>
            {data.websiteRequests.map((request) => <tr key={request.id} className="border-t border-zinc-800/80"><td className="px-4 py-3 font-medium text-zinc-100">{request.name}</td><td className="px-4 py-3 text-zinc-300">{request.service}</td><td className="px-4 py-3 text-zinc-400">{request.county}</td><td className="px-4 py-3"><StatusBadge value={request.aiScore} /></td><td className="px-4 py-3 text-zinc-400">{date(request.createdAt)}</td></tr>)}
          </BriefingTable>
          <BriefingTable title={`Recent quotes (${data.quotes.length})`} headers={["Client", "Service", "Status", "Total", "Created"]}>
            {data.quotes.map((quote) => <tr key={quote.id} className="border-t border-zinc-800/80"><td className="px-4 py-3 font-medium text-zinc-100">{quote.clientName}</td><td className="px-4 py-3 text-zinc-300">{quote.serviceType ?? quote.title}</td><td className="px-4 py-3"><StatusBadge value={quote.status} /></td><td className="px-4 py-3 font-medium text-zinc-100">{money(quote.totalCents)}</td><td className="px-4 py-3 text-zinc-400">{date(quote.createdAt)}</td></tr>)}
          </BriefingTable>
          <BriefingTable title={`Recent jobs (${data.jobs.length})`} headers={["Client", "Service", "Status", "Value", "Scheduled"]}>
            {data.jobs.map((job) => <tr key={job.id} className="border-t border-zinc-800/80"><td className="px-4 py-3 font-medium text-zinc-100">{job.clientName}</td><td className="px-4 py-3 text-zinc-300">{job.serviceType ?? "—"}</td><td className="px-4 py-3"><StatusBadge value={job.status} /></td><td className="px-4 py-3 font-medium text-zinc-100">{money(job.totalCents)}</td><td className="px-4 py-3 text-zinc-400">{date(job.scheduledDate)}</td></tr>)}
          </BriefingTable>
          <BriefingTable title={`Recent invoices (${data.invoices.length})`} headers={["Client", "Service", "Status", "Total", "Paid"]}>
            {data.invoices.map((invoice) => <tr key={invoice.id} className="border-t border-zinc-800/80"><td className="px-4 py-3 font-medium text-zinc-100">{invoice.clientName}</td><td className="px-4 py-3 text-zinc-300">{invoice.serviceType ?? "—"}</td><td className="px-4 py-3"><StatusBadge value={invoice.status} /></td><td className="px-4 py-3 font-medium text-zinc-100">{money(invoice.totalCents)}</td><td className="px-4 py-3 text-zinc-400">{date(invoice.paidAt)}</td></tr>)}
          </BriefingTable>
        </section>
      </div>
    </main>
  );
}

function BriefingTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none">
      <CardHeader className="border-b border-zinc-800 px-5 py-4"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-zinc-950/40 text-xs uppercase tracking-wide text-zinc-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></CardContent>
    </Card>
  );
}
