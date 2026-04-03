import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { DollarSign, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "rgba(240,237,230,0.4)",
  sent: "#60a5fa",
  viewed: "#a78bfa",
  paid: "#22c55e",
  overdue: "#ef4444",
  bad_debt: "#ef4444",
  voided: "rgba(240,237,230,0.2)",
};

function statusLabel(s: string) {
  return s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? s;
}

export default function AdminInvoices() {
  const { data, isLoading, error } = trpc.jobber.invoices.useQuery({ first: 100 });
  const invoices = data?.nodes ?? [];

  const totalOutstanding = invoices
    .filter((i: any) => i.invoiceStatus !== "paid" && i.invoiceStatus !== "voided")
    .reduce((sum: number, i: any) => sum + (i.amounts?.outstanding ?? 0), 0);

  const totalPaid = invoices
    .filter((i: any) => i.invoiceStatus === "paid")
    .reduce((sum: number, i: any) => sum + (i.amounts?.total ?? 0), 0);

  return (
    <AdminLayout title="Invoices">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Invoices</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          {data?.totalCount ?? 0} total invoices from Jobber
        </p>
      </div>

      {/* Summary Cards */}
      {!isLoading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <SummaryCard label="Total Paid" value={`$${totalPaid.toLocaleString()}`} color="#22c55e" />
          <SummaryCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} color="#f59e0b" />
        </div>
      )}

      {isLoading && <LoadingRows />}
      {error && <ErrorBox message={error.message} />}
      {!isLoading && !error && invoices.length === 0 && <EmptyBox message="No invoices found in Jobber." />}

      {!isLoading && !error && invoices.length > 0 && (
        <div
          style={{
            background: "#1a2035",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["#", "Client", "Subject", "Status", "Total", "Outstanding", "Due Date"].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      fontSize: "12px",
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
              {invoices.map((inv: any, i: number) => (
                <tr
                  key={inv.id}
                  style={{
                    borderBottom: i < invoices.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.5)" }}>
                    #{inv.invoiceNumber}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "14px", color: "#F0EDE6", fontWeight: 500 }}>
                    {inv.client?.name ?? "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.7)" }}>
                    {inv.subject || "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: `${STATUS_COLORS[inv.invoiceStatus?.toLowerCase()] ?? "rgba(240,237,230,0.1)"}22`,
                        color: STATUS_COLORS[inv.invoiceStatus?.toLowerCase()] ?? "rgba(240,237,230,0.5)",
                        border: `1px solid ${STATUS_COLORS[inv.invoiceStatus?.toLowerCase()] ?? "rgba(240,237,230,0.15)"}44`,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel(inv.invoiceStatus)}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: "#E07B2A", fontWeight: 600 }}>
                      <DollarSign size={13} />
                      {(inv.amounts?.total ?? 0).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: (inv.amounts?.outstanding ?? 0) > 0 ? "#f59e0b" : "rgba(240,237,230,0.3)",
                      }}
                    >
                      {(inv.amounts?.outstanding ?? 0) > 0 ? `$${(inv.amounts.outstanding).toLocaleString()}` : "—"}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>
                      <Clock size={11} />
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: "#1a2035",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
      }}
    >
      <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.45)", marginBottom: "0.35rem" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "8px", height: "56px", opacity: 0.5 }} />
      ))}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "1rem", color: "#ef4444", fontSize: "14px" }}>
      Error: {message}
    </div>
  );
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "rgba(240,237,230,0.35)", fontSize: "14px" }}>
      {message}
    </div>
  );
}
