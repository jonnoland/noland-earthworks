import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Mail, Shield } from "lucide-react";

export default function AdminCrews() {
  const { data, isLoading, error } = trpc.jobber.users.useQuery();
  const users = data?.nodes ?? [];

  return (
    <AdminLayout title="Crews">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Crews</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          {users.length} team member{users.length !== 1 ? "s" : ""} in Jobber
        </p>
      </div>

      {isLoading && <LoadingRows />}
      {error && <ErrorBox message={error.message} />}
      {!isLoading && !error && users.length === 0 && <EmptyBox message="No team members found in Jobber." />}

      {!isLoading && !error && users.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {users.map((u: any) => (
            <div
              key={u.id}
              style={{
                background: "#1a2035",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "1.25rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: u.isAccountOwner ? "#E07B2A33" : "rgba(255,255,255,0.07)",
                    color: u.isAccountOwner ? "#E07B2A" : "rgba(240,237,230,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                >
                  {(u.name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6" }}>{u.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
                    {u.isAccountOwner && (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: "#E07B2A22",
                          color: "#E07B2A",
                          border: "1px solid #E07B2A44",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Shield size={10} /> Owner
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        background: u.status === "active" ? "#22c55e22" : "rgba(240,237,230,0.07)",
                        color: u.status === "active" ? "#22c55e" : "rgba(240,237,230,0.4)",
                        border: `1px solid ${u.status === "active" ? "#22c55e44" : "rgba(240,237,230,0.1)"}`,
                      }}
                    >
                      {u.status?.charAt(0).toUpperCase() + u.status?.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              {u.email?.raw && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(240,237,230,0.5)" }}>
                  <Mail size={12} />
                  {u.email.raw}
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
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "#1a2035", borderRadius: "10px", height: "110px", opacity: 0.5 }} />
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
