import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminReports() {
  const { data: invoicesData, isLoading: iL } = trpc.jobber.invoices.useQuery({ first: 500 });
  const { data: jobsData, isLoading: jL } = trpc.jobber.jobs.useQuery({ first: 500 });

  const isLoading = iL || jL;

  const invoices = invoicesData?.nodes ?? [];
  const jobs = jobsData?.nodes ?? [];

  // Monthly revenue (last 12 months)
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months: { label: string; paid: number; outstanding: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear() !== now.getFullYear() ? d.getFullYear() : ""}`.trim();
      const monthInvoices = invoices.filter((inv: any) => {
        const date = inv.issuedDate ? new Date(inv.issuedDate) : inv.createdAt ? new Date(inv.createdAt) : null;
        return date && date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
      });
      const paid = monthInvoices
        .filter((inv: any) => inv.invoiceStatus === "paid")
        .reduce((sum: number, inv: any) => sum + (inv.amounts?.total ?? 0), 0);
      const outstanding = monthInvoices
        .filter((inv: any) => inv.invoiceStatus !== "paid" && inv.invoiceStatus !== "voided")
        .reduce((sum: number, inv: any) => sum + (inv.amounts?.outstanding ?? 0), 0);
      months.push({ label, paid, outstanding });
    }
    return months;
  }, [invoices]);

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.paid + m.outstanding), 1);

  // Monthly job count
  const monthlyJobs = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const label = `${MONTHS[d.getMonth()]}`.trim();
      const count = jobs.filter((j: any) => {
        const date = j.startAt ? new Date(j.startAt) : j.createdAt ? new Date(j.createdAt) : null;
        return date && date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
      }).length;
      return { label, count };
    });
  }, [jobs]);

  const maxJobs = Math.max(...monthlyJobs.map(m => m.count), 1);

  return (
    <AdminLayout title="Reports">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Reports</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>Revenue and job trends from your Jobber data</p>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {[1, 2].map(i => (
            <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "220px", opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* Revenue Chart */}
          <div
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1.5rem" }}>
              Monthly Revenue (Last 12 Months)
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "160px" }}>
              {monthlyRevenue.map((m, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      background: "#E07B2A",
                      borderRadius: "4px 4px 0 0",
                      height: `${Math.max(((m.paid) / maxRevenue) * 130, m.paid > 0 ? 4 : 0)}px`,
                      transition: "height 0.3s ease",
                      position: "relative",
                    }}
                    title={`Paid: $${m.paid.toLocaleString()}`}
                  />
                  {m.outstanding > 0 && (
                    <div
                      style={{
                        width: "100%",
                        background: "#f59e0b66",
                        borderRadius: "4px 4px 0 0",
                        height: `${Math.max(((m.outstanding) / maxRevenue) * 130, 4)}px`,
                        marginTop: "-4px",
                      }}
                      title={`Outstanding: $${m.outstanding.toLocaleString()}`}
                    />
                  )}
                  <div style={{ fontSize: "9px", color: "rgba(240,237,230,0.35)", textAlign: "center", whiteSpace: "nowrap" }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(240,237,230,0.5)" }}>
                <div style={{ width: "12px", height: "12px", background: "#E07B2A", borderRadius: "2px" }} />
                Paid
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "rgba(240,237,230,0.5)" }}>
                <div style={{ width: "12px", height: "12px", background: "#f59e0b66", borderRadius: "2px" }} />
                Outstanding
              </div>
            </div>
          </div>

          {/* Jobs Chart */}
          <div
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1.5rem" }}>
              Jobs per Month (Last 12 Months)
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "120px" }}>
              {monthlyJobs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      background: "#60a5fa",
                      borderRadius: "4px 4px 0 0",
                      height: `${Math.max((m.count / maxJobs) * 100, m.count > 0 ? 4 : 0)}px`,
                      transition: "height 0.3s ease",
                    }}
                    title={`${m.count} jobs`}
                  />
                  <div style={{ fontSize: "9px", color: "rgba(240,237,230,0.35)", textAlign: "center" }}>
                    {m.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Status Summary */}
          <div
            style={{
              background: "#1a2035",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1rem" }}>
              Invoice Summary
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                { label: "Paid", color: "#22c55e", filter: (i: any) => i.invoiceStatus === "paid" },
                { label: "Sent / Viewed", color: "#60a5fa", filter: (i: any) => i.invoiceStatus === "sent" || i.invoiceStatus === "viewed" },
                { label: "Overdue", color: "#ef4444", filter: (i: any) => i.invoiceStatus === "overdue" },
                { label: "Draft", color: "rgba(240,237,230,0.4)", filter: (i: any) => i.invoiceStatus === "draft" },
              ].map(({ label, color, filter }) => {
                const filtered = invoices.filter(filter);
                const total = filtered.reduce((sum: number, i: any) => sum + (i.amounts?.total ?? 0), 0);
                if (filtered.length === 0) return null;
                return (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "0.65rem 0.75rem",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "6px",
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    <div style={{ flex: 1, fontSize: "14px", color: "#F0EDE6" }}>{label}</div>
                    <div style={{ fontSize: "13px", color: "rgba(240,237,230,0.5)" }}>{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color }}>${total.toLocaleString()}</div>
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
