import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  new: "#22c55e",
  pending: "#f59e0b",
  converted: "#60a5fa",
  archived: "rgba(240,237,230,0.3)",
};

function statusLabel(s: string) {
  return s?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? s;
}

export default function AdminLeads() {
  const { data, isLoading, error } = trpc.jobber.requests.useQuery({ first: 100 });
  const requests = data?.nodes ?? [];

  return (
    <AdminLayout title="Leads">
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Leads</h2>
          <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
            {data?.totalCount ?? 0} total requests from Jobber
          </p>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && requests.length === 0 && (
        <EmptyState message="No leads found in Jobber." />
      )}

      {!isLoading && !error && requests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {requests.map((req: any) => (
            <div
              key={req.id}
              style={{
                background: "#1a2035",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "1.1rem 1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6" }}>
                      {req.title || req.contactName || req.client?.name || "Untitled Request"}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        background: `${STATUS_COLORS[req.requestStatus?.toLowerCase()] ?? "rgba(240,237,230,0.1)"}22`,
                        color: STATUS_COLORS[req.requestStatus?.toLowerCase()] ?? "rgba(240,237,230,0.5)",
                        border: `1px solid ${STATUS_COLORS[req.requestStatus?.toLowerCase()] ?? "rgba(240,237,230,0.15)"}44`,
                        fontWeight: 500,
                      }}
                    >
                      {statusLabel(req.requestStatus)}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "13px", color: "rgba(240,237,230,0.55)" }}>
                    {req.phone && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Phone size={12} /> {req.phone}
                      </span>
                    )}
                    {req.email && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Mail size={12} /> {req.email}
                      </span>
                    )}
                    {req.property?.address && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} />
                        {[req.property.address.street1, req.property.address.city, req.property.address.province]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                    {req.source && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        Source: {req.source}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "rgba(240,237,230,0.35)" }}>
                    <Clock size={11} />
                    {new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function LoadingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "80px", opacity: 0.5 }} />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "1rem", color: "#ef4444", fontSize: "14px" }}>
      Error: {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "rgba(240,237,230,0.35)", fontSize: "14px" }}>
      {message}
    </div>
  );
}
