import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-orange-500/20 text-orange-300",
  sent: "bg-blue-500/20 text-blue-300",
  viewed: "bg-blue-500/20 text-blue-300",
  approved: "bg-green-500/20 text-green-300",
  invoiced: "bg-green-500/20 text-green-300",
  paid: "bg-green-500/20 text-green-300",
  declined: "bg-red-500/20 text-red-300",
  cancelled: "bg-red-500/20 text-red-300",
  scheduled: "bg-blue-500/20 text-blue-300",
  in_progress: "bg-amber-500/20 text-amber-300",
  completed: "bg-green-500/20 text-green-300",
  new: "bg-zinc-500/20 text-zinc-300",
  contacted: "bg-blue-500/20 text-blue-300",
  qualified: "bg-amber-500/20 text-amber-300",
  won: "bg-green-500/20 text-green-300",
  lost: "bg-red-500/20 text-red-300",
  strong: "bg-green-500/20 text-green-300",
  marginal: "bg-amber-500/20 text-amber-300",
  weak: "bg-red-500/20 text-red-300",
};

export default function OpsViewer() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const key = params.get("key") ?? "";

  const { data, isLoading, error } = trpc.opsViewer.getData.useQuery(
    { key },
    { enabled: !!key, retry: false }
  );

  if (!key) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Noland Earthworks — Ops Viewer</h1>
          <p className="text-zinc-400">Access requires a valid viewer key. Add <code className="text-orange-400">?key=YOUR_KEY</code> to the URL.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Loading business data…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-zinc-400">Invalid or expired viewer key.</p>
        </div>
      </div>
    );
  }

  const { kpis, leads, quotes, jobs, invoices, clients } = data;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Noland Earthworks — Read-Only Ops View</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Veteran-Owned Land Clearing &amp; Forestry Mulching · Middle &amp; West Tennessee · Generated {new Date(data.generatedAt).toLocaleString()}</p>
          </div>
          <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded font-medium">READ ONLY</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Leads", value: kpis.totalLeads },
            { label: "Total Clients", value: kpis.totalClients },
            { label: "Open Quotes Value", value: fmt(kpis.openQuotesValueCents) },
            { label: "Total Revenue", value: fmt(kpis.totalRevenueCents) },
            { label: "Total Quotes", value: kpis.totalQuotes },
            { label: "Total Jobs", value: kpis.totalJobs },
            { label: "Active Jobs", value: kpis.activeJobs },
            { label: "Total Invoices", value: kpis.totalInvoices },
          ].map(k => (
            <Card key={k.label} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{k.label}</p>
                <p className="text-2xl font-bold text-zinc-100">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Leads */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-100">Recent Leads ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Name</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Job Type</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Stage</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">AI Score</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Est. Value</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-200">{l.name}</td>
                      <td className="px-4 py-2 text-zinc-400">{l.jobType ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[l.stage ?? ""] ?? "bg-zinc-700 text-zinc-300"}`}>{l.stage ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2">
                        {l.aiScore ? <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[l.aiScore] ?? ""}`}>{l.aiScore}</span> : "—"}
                      </td>
                      <td className="px-4 py-2 text-zinc-300">{l.estimatedValue ? `$${Number(l.estimatedValue).toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-2 text-zinc-300">{l.estimatedValue ? `$${Math.round(Number(l.estimatedValue)).toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-2 text-zinc-500">{fmtDate(l.createdAt)}</td>
                    </tr>
                  ))}
                  {leads.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No leads yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-100">Recent Quotes ({quotes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Client</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Title</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Service</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Acreage</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Total</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Status</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map(q => (
                    <tr key={q.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-200">{q.clientName}</td>
                      <td className="px-4 py-2 text-zinc-400 max-w-[200px] truncate">{q.title}</td>
                      <td className="px-4 py-2 text-zinc-400">{q.serviceType ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-400">{q.acreage ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-300 font-medium">{fmt(q.totalCents ?? 0)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[q.status ?? ""] ?? "bg-zinc-700 text-zinc-300"}`}>{q.status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2 text-zinc-500">{fmtDate(q.createdAt)}</td>
                    </tr>
                  ))}
                  {quotes.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-zinc-500">No quotes yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Jobs */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-100">Jobs ({jobs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Client</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Service</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Status</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Scheduled</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Total</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-200">{j.clientName}</td>
                      <td className="px-4 py-2 text-zinc-400">{j.serviceType ?? "—"}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[j.status ?? ""] ?? "bg-zinc-700 text-zinc-300"}`}>{j.status}</span>
                      </td>
                      <td className="px-4 py-2 text-zinc-400">{fmtDate(j.scheduledDate)}</td>
                      <td className="px-4 py-2 text-zinc-300 font-medium">{fmt(j.totalCents ?? 0)}</td>
                      <td className="px-4 py-2 text-zinc-500">{fmtDate(j.createdAt)}</td>
                    </tr>
                  ))}
                  {jobs.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No jobs yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-100">Invoices ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Client</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Total</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Status</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Paid</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(i => (
                    <tr key={i.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-200">{i.clientName}</td>
                      <td className="px-4 py-2 text-zinc-300 font-medium">{fmt(i.totalCents ?? 0)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[i.status ?? ""] ?? "bg-zinc-700 text-zinc-300"}`}>{i.status ?? "—"}</span>
                      </td>
                      <td className="px-4 py-2 text-zinc-400">{fmtDate(i.paidAt)}</td>
                      <td className="px-4 py-2 text-zinc-500">{fmtDate(i.createdAt)}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No invoices yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-100">Clients ({clients.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Name</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Email</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Phone</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Jobs</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Total Spent</th>
                    <th className="text-left px-4 py-2 text-zinc-500 font-medium">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-200">{c.name}</td>
                      <td className="px-4 py-2 text-zinc-400">{c.email ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-400">{c.phone ?? "—"}</td>
                      <td className="px-4 py-2 text-zinc-400">{c.jobCount}</td>
                      <td className="px-4 py-2 text-zinc-300">{fmt(c.totalSpentCents ?? 0)}</td>
                      <td className="px-4 py-2 text-zinc-500">{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                  {clients.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-zinc-500">No clients yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-600 pb-4">Noland Earthworks, LLC · nolandearthworks.com · Read-only view · Data refreshes on page load</p>
      </div>
    </div>
  );
}
