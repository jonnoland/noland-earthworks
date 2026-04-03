import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { DollarSign, Briefcase, FileText, Clock, TrendingUp, Users } from "lucide-react";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color = "#E07B2A",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number }>;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "#1a2035",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        padding: "1.25rem 1.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "13px", color: "rgba(240,237,230,0.5)" }}>{label}</span>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: `${color}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          <Icon size={17} />
        </div>
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: "#F0EDE6" }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

export default function AdminScoreboard() {
  const { data: jobsData, isLoading: jL } = trpc.jobber.jobs.useQuery({ first: 200 });
  const { data: quotesData, isLoading: qL } = trpc.jobber.quotes.useQuery({ first: 200 });
  const { data: invoicesData, isLoading: iL } = trpc.jobber.invoices.useQuery({ first: 200 });
  const { data: timesheetsData, isLoading: tL } = trpc.jobber.timesheets.useQuery({ first: 500 });
  const { data: clientsData, isLoading: cL } = trpc.jobber.clients.useQuery({ first: 200 });

  const isLoading = jL || qL || iL || tL || cL;

  const jobs = jobsData?.nodes ?? [];
  const quotes = quotesData?.nodes ?? [];
  const invoices = invoicesData?.nodes ?? [];
  const timesheets = timesheetsData?.nodes ?? [];
  const clients = clientsData?.nodes ?? [];

  const completedJobs = jobs.filter((j: any) => j.jobStatus === "completed");
  const activeJobs = jobs.filter((j: any) => j.jobStatus === "active" || j.jobStatus === "in_progress");
  const wonQuotes = quotes.filter((q: any) => q.quoteStatus === "approved" || q.quoteStatus === "converted");
  const totalQuotes = quotes.length;
  const winRate = totalQuotes > 0 ? Math.round((wonQuotes.length / totalQuotes) * 100) : 0;

  const paidRevenue = invoices
    .filter((i: any) => i.invoiceStatus === "paid")
    .reduce((sum: number, i: any) => sum + (i.amounts?.total ?? 0), 0);

  const outstandingRevenue = invoices
    .filter((i: any) => i.invoiceStatus !== "paid" && i.invoiceStatus !== "voided")
    .reduce((sum: number, i: any) => sum + (i.amounts?.outstanding ?? 0), 0);

  const avgJobValue =
    completedJobs.length > 0
      ? Math.round(completedJobs.reduce((sum: number, j: any) => sum + (j.total ?? 0), 0) / completedJobs.length)
      : 0;

  const totalHours = timesheets.reduce((sum: number, e: any) => sum + (e.durationInSeconds ?? 0), 0);

  const activeClients = clients.filter((c: any) => !c.isLead).length;

  return (
    <AdminLayout title="Scoreboard">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Scoreboard</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          Key performance metrics from your Jobber account
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "110px", opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <KPICard label="Revenue Collected" value={`$${paidRevenue.toLocaleString()}`} sub="All paid invoices" icon={DollarSign} color="#22c55e" />
            <KPICard label="Outstanding" value={`$${outstandingRevenue.toLocaleString()}`} sub="Unpaid invoices" icon={DollarSign} color="#f59e0b" />
            <KPICard label="Completed Jobs" value={completedJobs.length} sub={`${activeJobs.length} active`} icon={Briefcase} color="#E07B2A" />
            <KPICard label="Quote Win Rate" value={`${winRate}%`} sub={`${wonQuotes.length} of ${totalQuotes} quotes`} icon={TrendingUp} color="#60a5fa" />
            <KPICard label="Avg Job Value" value={`$${avgJobValue.toLocaleString()}`} sub="Completed jobs" icon={FileText} color="#a78bfa" />
            <KPICard label="Total Hours Logged" value={formatDuration(totalHours)} sub={`${timesheets.length} entries`} icon={Clock} color="#34d399" />
            <KPICard label="Active Clients" value={activeClients} sub={`${clients.length} total`} icon={Users} color="#f472b6" />
          </div>

          {/* Quote Pipeline */}
          <div
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1rem" }}>Quote Pipeline</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {[
                { label: "Draft", status: "draft", color: "rgba(240,237,230,0.4)" },
                { label: "Awaiting Response", status: "awaiting_response", color: "#f59e0b" },
                { label: "Changes Requested", status: "changes_requested", color: "#f97316" },
                { label: "Approved", status: "approved", color: "#22c55e" },
                { label: "Converted", status: "converted", color: "#60a5fa" },
                { label: "Archived", status: "archived", color: "rgba(240,237,230,0.2)" },
              ].map(({ label, status, color }) => {
                const count = quotes.filter((q: any) => q.quoteStatus?.toLowerCase() === status).length;
                const value = quotes
                  .filter((q: any) => q.quoteStatus?.toLowerCase() === status)
                  .reduce((sum: number, q: any) => sum + (q.amounts?.total ?? 0), 0);
                return (
                  <div
                    key={status}
                    style={{
                      flex: "1 1 140px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.45)", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color }}>{count}</div>
                    {value > 0 && (
                      <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>
                        ${value.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Job Status Breakdown */}
          <div
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1rem" }}>Job Status Breakdown</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {[
                { label: "Active", status: "active", color: "#22c55e" },
                { label: "In Progress", status: "in_progress", color: "#22c55e" },
                { label: "Completed", status: "completed", color: "#60a5fa" },
                { label: "Requires Invoicing", status: "requires_invoicing", color: "#f59e0b" },
                { label: "Late", status: "late", color: "#ef4444" },
                { label: "Archived", status: "archived", color: "rgba(240,237,230,0.2)" },
              ].map(({ label, status, color }) => {
                const count = jobs.filter((j: any) => j.jobStatus?.toLowerCase() === status).length;
                if (count === 0) return null;
                return (
                  <div
                    key={status}
                    style={{
                      flex: "1 1 140px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "8px",
                      padding: "0.75rem 1rem",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.45)", marginBottom: "4px" }}>{label}</div>
                    <div style={{ fontSize: "20px", fontWeight: 700, color }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
