import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { DollarSign, Briefcase, FileText, Clock, TrendingUp, Users, ArrowRight, Target } from "lucide-react";

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

/** Simple horizontal bar for funnel steps */
function FunnelBar({ label, count, total, value, color }: { label: string; count: number; total: number; value?: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", color: "#F0EDE6", fontWeight: 500 }}>{label}</span>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {value !== undefined && value > 0 && (
            <span style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>${value.toLocaleString()}</span>
          )}
          <span style={{ fontSize: "13px", color, fontWeight: 600 }}>{count}</span>
          <span style={{ fontSize: "12px", color: "rgba(240,237,230,0.35)", width: "36px", textAlign: "right" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: "4px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

/** Monthly conversion trend table */
function MonthlyTrend({ quotes, jobs }: { quotes: any[]; jobs: any[] }) {
  // Build last 6 months
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    months.push({ key, label });
  }

  const rows = months.map(({ key, label }) => {
    const monthQuotes = quotes.filter((q: any) => {
      if (!q.createdAt) return false;
      const d = new Date(q.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === key;
    });
    const sentQuotes = monthQuotes.length;
    const wonQuotes = monthQuotes.filter((q: any) =>
      ["approved", "converted"].includes(q.quoteStatus?.toLowerCase() ?? "")
    ).length;

    // Jobs created this month (as a proxy for converted)
    const monthJobs = jobs.filter((j: any) => {
      if (!j.createdAt) return false;
      const d = new Date(j.createdAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === key;
    });
    const jobsCreated = monthJobs.length;
    const revenue = monthJobs.reduce((sum: number, j: any) => sum + (j.total ?? 0), 0);
    const rate = sentQuotes > 0 ? Math.round((wonQuotes / sentQuotes) * 100) : null;

    return { label, sentQuotes, wonQuotes, jobsCreated, revenue, rate };
  });

  return (
    <div
      style={{
        background: "#1a2035",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", margin: 0 }}>Monthly Conversion Trend</h3>
        <p style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)", margin: "4px 0 0" }}>Last 6 months</p>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["Month", "Quotes Sent", "Won", "Jobs Created", "Revenue", "Conv. Rate"].map(h => (
              <th
                key={h}
                style={{
                  padding: "0.65rem 1rem",
                  textAlign: "left",
                  fontSize: "11px",
                  color: "rgba(240,237,230,0.4)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              style={{ borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "#F0EDE6", fontWeight: 500 }}>{row.label}</td>
              <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.7)" }}>{row.sentQuotes}</td>
              <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "#22c55e" }}>{row.wonQuotes}</td>
              <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "#60a5fa" }}>{row.jobsCreated}</td>
              <td style={{ padding: "0.65rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.6)" }}>
                {row.revenue > 0 ? `$${row.revenue.toLocaleString()}` : "—"}
              </td>
              <td style={{ padding: "0.65rem 1rem" }}>
                {row.rate !== null ? (
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "2px 8px",
                      borderRadius: "20px",
                      background: row.rate >= 50 ? "rgba(34,197,94,0.12)" : row.rate >= 25 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)",
                      color: row.rate >= 50 ? "#22c55e" : row.rate >= 25 ? "#f59e0b" : "#ef4444",
                      fontWeight: 600,
                    }}
                  >
                    {row.rate}%
                  </span>
                ) : (
                  <span style={{ fontSize: "12px", color: "rgba(240,237,230,0.25)" }}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminScoreboard() {
  const { data: jobsData, isLoading: jL } = trpc.jobber.jobs.useQuery({ first: 200 });
  const { data: quotesData, isLoading: qL } = trpc.jobber.quotes.useQuery({ first: 200 });
  const { data: invoicesData, isLoading: iL } = trpc.jobber.invoices.useQuery({ first: 200 });
  const { data: timesheetsData, isLoading: tL } = trpc.jobber.timesheets.useQuery({ first: 500 });
  const { data: clientsData, isLoading: cL } = trpc.jobber.clients.useQuery({ first: 200 });
  const { data: requestsData, isLoading: rL } = trpc.jobber.requests.useQuery({ first: 200 });

  const isLoading = jL || qL || iL || tL || cL || rL;

  const jobs = jobsData?.nodes ?? [];
  const quotes = quotesData?.nodes ?? [];
  const invoices = invoicesData?.nodes ?? [];
  const timesheets = timesheetsData?.nodes ?? [];
  const clients = clientsData?.nodes ?? [];
  const requests = requestsData?.nodes ?? [];

  // ── Core KPIs ────────────────────────────────────────────────────────────────
  const completedJobs = jobs.filter((j: any) => j.jobStatus === "completed");
  const activeJobs = jobs.filter((j: any) => j.jobStatus === "active" || j.jobStatus === "in_progress");
  const wonQuotes = quotes.filter((q: any) => ["approved", "converted"].includes(q.quoteStatus?.toLowerCase() ?? ""));
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

  // ── Conversion Funnel ────────────────────────────────────────────────────────
  // Stage 1: Leads (requests)
  const totalLeads = requests.length;
  // Stage 2: Quotes sent (from leads that became quotes)
  const totalSent = quotes.length;
  // Stage 3: Quotes approved/converted
  const totalWon = wonQuotes.length;
  // Stage 4: Jobs completed
  const totalCompleted = completedJobs.length;

  // Conversion rates between stages
  const leadsToQuoteRate = totalLeads > 0 ? Math.round((totalSent / totalLeads) * 100) : null;
  const quoteToJobRate = totalSent > 0 ? Math.round((totalWon / totalSent) * 100) : null;
  const jobCompletionRate = jobs.length > 0 ? Math.round((totalCompleted / jobs.length) * 100) : null;
  const overallRate = totalLeads > 0 ? Math.round((totalCompleted / totalLeads) * 100) : null;

  // Value of won quotes
  const wonValue = wonQuotes.reduce((sum: number, q: any) => sum + (q.amounts?.total ?? 0), 0);
  const lostValue = quotes
    .filter((q: any) => ["archived"].includes(q.quoteStatus?.toLowerCase() ?? ""))
    .reduce((sum: number, q: any) => sum + (q.amounts?.total ?? 0), 0);

  // Pipeline value (open quotes)
  const openQuoteValue = quotes
    .filter((q: any) => ["draft", "awaiting_response", "changes_requested"].includes(q.quoteStatus?.toLowerCase() ?? ""))
    .reduce((sum: number, q: any) => sum + (q.amounts?.total ?? 0), 0);

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
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            <KPICard label="Revenue Collected" value={`$${paidRevenue.toLocaleString()}`} sub="All paid invoices" icon={DollarSign} color="#22c55e" />
            <KPICard label="Outstanding" value={`$${outstandingRevenue.toLocaleString()}`} sub="Unpaid invoices" icon={DollarSign} color="#f59e0b" />
            <KPICard label="Completed Jobs" value={completedJobs.length} sub={`${activeJobs.length} active`} icon={Briefcase} color="#E07B2A" />
            <KPICard label="Quote Win Rate" value={`${winRate}%`} sub={`${wonQuotes.length} of ${totalQuotes} quotes`} icon={TrendingUp} color="#60a5fa" />
            <KPICard label="Avg Job Value" value={`$${avgJobValue.toLocaleString()}`} sub="Completed jobs" icon={FileText} color="#a78bfa" />
            <KPICard label="Total Hours Logged" value={formatDuration(totalHours)} sub={`${timesheets.length} entries`} icon={Clock} color="#34d399" />
            <KPICard label="Active Clients" value={activeClients} sub={`${clients.length} total`} icon={Users} color="#f472b6" />
          </div>

          {/* ── Conversion Rate Section ─────────────────────────────────────────── */}
          <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Target size={16} color="#E07B2A" />
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#F0EDE6", margin: 0 }}>Conversion Rate Tracker</h3>
          </div>
          <p style={{ fontSize: "13px", color: "rgba(240,237,230,0.4)", marginBottom: "1.5rem" }}>
            Quote-to-job pipeline — from first lead to completed job
          </p>

          {/* Conversion Rate KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {[
              { label: "Lead → Quote Rate", value: leadsToQuoteRate !== null ? `${leadsToQuoteRate}%` : "—", sub: `${totalSent} quotes from ${totalLeads} leads`, color: "#60a5fa" },
              { label: "Quote → Job Rate", value: quoteToJobRate !== null ? `${quoteToJobRate}%` : "—", sub: `${totalWon} won of ${totalSent} sent`, color: "#22c55e" },
              { label: "Job Completion Rate", value: jobCompletionRate !== null ? `${jobCompletionRate}%` : "—", sub: `${totalCompleted} of ${jobs.length} jobs`, color: "#a78bfa" },
              { label: "Overall Conv. Rate", value: overallRate !== null ? `${overallRate}%` : "—", sub: `Lead to completed job`, color: "#E07B2A" },
              { label: "Won Quote Value", value: wonValue > 0 ? `$${wonValue.toLocaleString()}` : "—", sub: "Approved + converted", color: "#22c55e" },
              { label: "Open Pipeline", value: openQuoteValue > 0 ? `$${openQuoteValue.toLocaleString()}` : "—", sub: "Quotes awaiting decision", color: "#f59e0b" },
            ].map(({ label, value, sub, color }) => (
              <div
                key={label}
                style={{
                  background: "#1a2035",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  padding: "1rem 1.25rem",
                }}
              >
                <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.45)", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "26px", fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: "11px", color: "rgba(240,237,230,0.35)", marginTop: "4px" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Conversion Funnel Visualization */}
          <div
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "0.25rem" }}>
              Conversion Funnel
            </h3>
            <p style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)", marginBottom: "1.25rem" }}>
              Each bar shows count as a % of total leads
            </p>
            <FunnelBar label="Leads Received" count={totalLeads} total={totalLeads} color="#60a5fa" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "-0.25rem 0 0.5rem 0.5rem" }}>
              <ArrowRight size={12} color="rgba(240,237,230,0.2)" />
              {leadsToQuoteRate !== null && (
                <span style={{ fontSize: "11px", color: "rgba(240,237,230,0.3)" }}>{leadsToQuoteRate}% became quotes</span>
              )}
            </div>
            <FunnelBar label="Quotes Sent" count={totalSent} total={totalLeads || totalSent} color="#a78bfa" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "-0.25rem 0 0.5rem 0.5rem" }}>
              <ArrowRight size={12} color="rgba(240,237,230,0.2)" />
              {quoteToJobRate !== null && (
                <span style={{ fontSize: "11px", color: "rgba(240,237,230,0.3)" }}>{quoteToJobRate}% approved/converted</span>
              )}
            </div>
            <FunnelBar label="Quotes Won" count={totalWon} total={totalLeads || totalSent} value={wonValue} color="#22c55e" />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "-0.25rem 0 0.5rem 0.5rem" }}>
              <ArrowRight size={12} color="rgba(240,237,230,0.2)" />
              {jobCompletionRate !== null && (
                <span style={{ fontSize: "11px", color: "rgba(240,237,230,0.3)" }}>{jobCompletionRate}% jobs completed</span>
              )}
            </div>
            <FunnelBar label="Jobs Completed" count={totalCompleted} total={totalLeads || totalCompleted} color="#E07B2A" />

            {lostValue > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.65rem 1rem",
                  background: "rgba(239,68,68,0.06)",
                  borderRadius: "8px",
                  border: "1px solid rgba(239,68,68,0.12)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "13px", color: "rgba(240,237,230,0.6)" }}>Archived / Lost Quote Value</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#ef4444" }}>${lostValue.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <MonthlyTrend quotes={quotes} jobs={jobs} />

          {/* Quote Pipeline Breakdown */}
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
