import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Briefcase, FileText, DollarSign, Users, AlertCircle, ExternalLink } from "lucide-react";

function StatCard({
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
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", color: "rgba(240,237,230,0.55)" }}>{label}</span>
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
      <div style={{ fontSize: "26px", fontWeight: 700, color: "#F0EDE6" }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>{sub}</div>}
    </div>
  );
}

function statusColor(status: string) {
  const s = status?.toLowerCase();
  if (s === "active" || s === "in_progress") return "#22c55e";
  if (s === "completed" || s === "won") return "#60a5fa";
  if (s === "requires_invoicing") return "#f59e0b";
  if (s === "late" || s === "overdue") return "#ef4444";
  return "rgba(240,237,230,0.5)";
}

export default function AdminHome() {
  const { data: jobsData, isLoading: jobsLoading } = trpc.jobber.jobs.useQuery({ first: 20 });
  const { data: quotesData, isLoading: quotesLoading } = trpc.jobber.quotes.useQuery({ first: 20 });
  const { data: invoicesData, isLoading: invoicesLoading } = trpc.jobber.invoices.useQuery({ first: 50 });
  const { data: requestsData } = trpc.jobber.requests.useQuery({ first: 20 });
  const { data: connStatus } = trpc.jobber.connectionStatus.useQuery();

  const jobs = jobsData?.nodes ?? [];
  const quotes = quotesData?.nodes ?? [];
  const invoices = invoicesData?.nodes ?? [];
  const requests = requestsData?.nodes ?? [];

  // This week's jobs
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const thisWeekJobs = jobs.filter((j: any) => {
    const start = j.startAt ? new Date(j.startAt) : null;
    return start && start >= weekStart && start < weekEnd;
  });

  // Revenue (paid invoices)
  const paidRevenue = invoices
    .filter((i: any) => i.invoiceStatus === "paid")
    .reduce((sum: number, i: any) => sum + (i.amounts?.total ?? 0), 0);

  const outstandingRevenue = invoices
    .filter((i: any) => i.invoiceStatus !== "paid")
    .reduce((sum: number, i: any) => sum + (i.amounts?.outstanding ?? 0), 0);

  const activeJobs = jobs.filter((j: any) => j.jobStatus === "active" || j.jobStatus === "in_progress");
  const openQuotes = quotes.filter((q: any) => q.quoteStatus === "draft" || q.quoteStatus === "awaiting_response");

  const isLoading = jobsLoading || quotesLoading || invoicesLoading;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <AdminLayout title="Home">
      {/* Greeting */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#F0EDE6", marginBottom: "4px" }}>
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Jon
        </h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "14px" }}>{today}</p>
      </div>

      {/* Jobber not connected warning */}
      {connStatus && !connStatus.connected && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "8px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <AlertCircle size={18} color="#ef4444" />
          <div>
            <div style={{ color: "#ef4444", fontWeight: 600, fontSize: "14px" }}>Jobber Not Connected</div>
            <div style={{ color: "rgba(240,237,230,0.6)", fontSize: "13px" }}>
              Go to{" "}
              <a href="/admin/settings" style={{ color: "#E07B2A" }}>
                Settings
              </a>{" "}
              to connect your Jobber account and start pulling live data.
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          label="Active Jobs"
          value={isLoading ? "—" : activeJobs.length}
          sub="Currently in progress"
          icon={Briefcase}
          color="#E07B2A"
        />
        <StatCard
          label="Open Quotes"
          value={isLoading ? "—" : openQuotes.length}
          sub="Awaiting response"
          icon={FileText}
          color="#60a5fa"
        />
        <StatCard
          label="Revenue Collected"
          value={isLoading ? "—" : `$${paidRevenue.toLocaleString()}`}
          sub="Paid invoices"
          icon={DollarSign}
          color="#22c55e"
        />
        <StatCard
          label="Outstanding"
          value={isLoading ? "—" : `$${outstandingRevenue.toLocaleString()}`}
          sub="Unpaid invoices"
          icon={DollarSign}
          color="#f59e0b"
        />
        <StatCard
          label="New Requests"
          value={isLoading ? "—" : requests.length}
          sub="Pending review"
          icon={Users}
          color="#a78bfa"
        />
      </div>

      {/* This Week */}
      <div
        style={{
          background: "#1a2035",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6" }}>
            This Week{" "}
            <span style={{ color: "rgba(240,237,230,0.4)", fontWeight: 400, fontSize: "13px" }}>
              {thisWeekJobs.length} job{thisWeekJobs.length !== 1 ? "s" : ""}
            </span>
          </h3>
          <a href="/admin/schedule" style={{ color: "#E07B2A", fontSize: "13px", textDecoration: "none" }}>
            View Schedule →
          </a>
        </div>

        {isLoading ? (
          <div style={{ color: "rgba(240,237,230,0.4)", fontSize: "14px" }}>Loading…</div>
        ) : thisWeekJobs.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "rgba(240,237,230,0.35)",
              fontSize: "14px",
            }}
          >
            No jobs scheduled this week.{" "}
            <a href="/admin/schedule" style={{ color: "#E07B2A" }}>
              Open Schedule
            </a>{" "}
            |{" "}
            <a href="/admin/quotes" style={{ color: "#E07B2A" }}>
              View Quotes
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {thisWeekJobs.map((job: any) => (
              <div
                key={job.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.65rem 0.75rem",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "6px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: statusColor(job.jobStatus),
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "14px", color: "#F0EDE6", fontWeight: 500 }}>
                    #{job.jobNumber} — {job.title || job.client?.name || "Untitled"}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.45)" }}>
                    {job.client?.name}
                    {job.startAt
                      ? ` · ${new Date(job.startAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
                      : ""}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#E07B2A", fontWeight: 600 }}>
                  ${(job.total ?? 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Do This Next */}
      <div
        style={{
          background: "#1a2035",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.25rem 1.5rem",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1rem" }}>
          Do This Next
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {openQuotes.length > 0 && (
            <ActionItem
              label={`Follow up on ${openQuotes.length} open quote${openQuotes.length > 1 ? "s" : ""}`}
              href="/admin/quotes"
            />
          )}
          {requests.length > 0 && (
            <ActionItem
              label={`Review ${requests.length} new request${requests.length > 1 ? "s" : ""}`}
              href="/admin/leads"
            />
          )}
          {outstandingRevenue > 0 && (
            <ActionItem
              label={`Collect $${outstandingRevenue.toLocaleString()} in outstanding invoices`}
              href="/admin/invoices"
            />
          )}
          {openQuotes.length === 0 && requests.length === 0 && outstandingRevenue === 0 && (
            <div style={{ color: "rgba(240,237,230,0.4)", fontSize: "14px", textAlign: "center", padding: "1.5rem" }}>
              ✓ All caught up!
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function ActionItem({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.65rem 0.75rem",
        background: "rgba(224,123,42,0.06)",
        border: "1px solid rgba(224,123,42,0.15)",
        borderRadius: "6px",
        textDecoration: "none",
        color: "#F0EDE6",
        fontSize: "14px",
      }}
    >
      <span>{label}</span>
      <ExternalLink size={14} color="#E07B2A" />
    </a>
  );
}
