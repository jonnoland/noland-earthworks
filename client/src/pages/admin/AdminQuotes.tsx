import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Phone, MapPin, Clock, DollarSign } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "rgba(240,237,230,0.4)",
  awaiting_response: "#f59e0b",
  changes_requested: "#f97316",
  approved: "#22c55e",
  converted: "#60a5fa",
  archived: "rgba(240,237,230,0.2)",
};

function statusLabel(s: string) {
  return s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? s;
}

export default function AdminQuotes() {
  const { data, isLoading, error } = trpc.jobber.quotes.useQuery({ first: 100 });
  const quotes = data?.nodes ?? [];

  return (
    <AdminLayout title="Quotes">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Quotes</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          {data?.totalCount ?? 0} total quotes from Jobber
        </p>
      </div>

      {isLoading && <LoadingRows />}
      {error && <ErrorBox message={error.message} />}
      {!isLoading && !error && quotes.length === 0 && (
        <EmptyBox message="No quotes found in Jobber." />
      )}

      {!isLoading && !error && quotes.length > 0 && (
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
                {["#", "Client", "Title", "Status", "Total", "Date"].map(h => (
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
              {quotes.map((q: any, i: number) => (
                <tr
                  key={q.id}
                  style={{
                    borderBottom: i < quotes.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem", fontSize: "13px", color: "rgba(240,237,230,0.5)" }}>
                    #{q.quoteNumber}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontSize: "14px", color: "#F0EDE6", fontWeight: 500 }}>
                      {q.client?.name ?? "—"}
                    </div>
                    {q.client?.phones?.[0]?.number && (
                      <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Phone size={11} /> {q.client.phones[0].number}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ fontSize: "13px", color: "rgba(240,237,230,0.8)" }}>{q.title || "—"}</div>
                    {q.property?.address?.city && (
                      <div style={{ fontSize: "12px", color: "rgba(240,237,230,0.4)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={11} />
                        {[q.property.address.city, q.property.address.province].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: `${STATUS_COLORS[q.quoteStatus?.toLowerCase()] ?? "rgba(240,237,230,0.1)"}22`,
                        color: STATUS_COLORS[q.quoteStatus?.toLowerCase()] ?? "rgba(240,237,230,0.5)",
                        border: `1px solid ${STATUS_COLORS[q.quoteStatus?.toLowerCase()] ?? "rgba(240,237,230,0.15)"}44`,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel(q.quoteStatus)}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: "#E07B2A", fontWeight: 600 }}>
                      <DollarSign size={13} />
                      {(q.amounts?.total ?? 0).toLocaleString()}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "rgba(240,237,230,0.4)" }}>
                      <Clock size={11} />
                      {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
