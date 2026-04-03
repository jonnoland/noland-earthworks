import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Phone, Mail, MapPin } from "lucide-react";

export default function AdminClients() {
  const { data, isLoading, error } = trpc.jobber.clients.useQuery({ first: 200 });
  const clients = data?.nodes ?? [];

  return (
    <AdminLayout title="Clients">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Clients</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          {data?.totalCount ?? 0} total clients from Jobber
        </p>
      </div>

      {isLoading && <LoadingRows />}
      {error && <ErrorBox message={error.message} />}
      {!isLoading && !error && clients.length === 0 && <EmptyBox message="No clients found in Jobber." />}

      {!isLoading && !error && clients.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {clients.map((c: any) => (
            <div
              key={c.id}
              style={{
                background: "#1a2035",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "#E07B2A33",
                  color: "#E07B2A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "15px",
                  flexShrink: 0,
                }}
              >
                {(c.name ?? "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6" }}>
                  {c.name}
                  {c.companyName && c.companyName !== c.name && (
                    <span style={{ fontSize: "13px", color: "rgba(240,237,230,0.45)", marginLeft: "0.5rem" }}>
                      ({c.companyName})
                    </span>
                  )}
                  {c.isLead && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        background: "#f59e0b22",
                        color: "#f59e0b",
                        border: "1px solid #f59e0b44",
                      }}
                    >
                      Lead
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "13px", color: "rgba(240,237,230,0.5)", marginTop: "4px" }}>
                  {c.phones?.[0]?.number && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Phone size={11} /> {c.phones[0].number}
                    </span>
                  )}
                  {c.emails?.[0]?.address && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Mail size={11} /> {c.emails[0].address}
                    </span>
                  )}
                  {c.billingAddress?.city && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={11} />
                      {[c.billingAddress.city, c.billingAddress.province].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
              {c.balance != null && c.balance !== 0 && (
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: c.balance > 0 ? "#ef4444" : "#22c55e",
                    flexShrink: 0,
                  }}
                >
                  {c.balance > 0 ? `Owes $${c.balance.toLocaleString()}` : `Credit $${Math.abs(c.balance).toLocaleString()}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function LoadingRows() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "70px", opacity: 0.5 }} />
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
