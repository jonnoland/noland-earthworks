import { useEffect, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { CheckCircle, XCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react";

export default function AdminSettings() {
  const { data: statusData, isLoading, refetch } = trpc.jobber.connectionStatus.useQuery();
  const { data: authUrlData } = trpc.jobber.getAuthUrl.useQuery();
  const redirected = useRef(false);

  const isConnected = statusData?.connected;

  // Auto-connect: once we know Jobber is not connected and have the auth URL, redirect immediately
  useEffect(() => {
    if (redirected.current) return;
    if (isLoading) return;
    if (isConnected) return;
    if (!authUrlData?.url) return;
    redirected.current = true;
    window.location.href = authUrlData.url;
  }, [isLoading, isConnected, authUrlData?.url]);

  const handleConnect = () => {
    if (authUrlData?.url) window.location.href = authUrlData.url;
  };

  // Show redirecting state while auto-connect is in progress
  const isRedirecting = !isLoading && !isConnected && !!authUrlData?.url;

  return (
    <AdminLayout title="Settings">
      {isRedirecting && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "rgba(224,123,42,0.1)",
            border: "1px solid rgba(224,123,42,0.3)",
            borderRadius: "8px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            color: "#E07B2A",
            fontSize: "14px",
          }}
        >
          <Loader2 size={16} className="animate-spin" />
          Redirecting to Jobber to connect your account…
        </div>
      )}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Settings</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          Admin console configuration and integrations
        </p>
      </div>

      {/* Jobber Connection */}
      <div
        style={{
          background: "#1a2035",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "1rem" }}>
          Jobber Integration
        </h3>

        {isLoading ? (
          <div style={{ color: "rgba(240,237,230,0.4)", fontSize: "14px" }}>Checking connection status...</div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {isConnected ? (
                <CheckCircle size={22} color="#22c55e" />
              ) : (
                <XCircle size={22} color="#ef4444" />
              )}
              <div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6" }}>
                  {isConnected ? "Connected to Jobber" : "Not Connected"}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(240,237,230,0.45)" }}>
                  {isConnected
                    ? "Account: Noland Earthworks, LLC"
                    : "Connect your Jobber account to pull live data into the admin console."}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {isConnected ? (
                <>
                  <button
                    onClick={() => refetch()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0.5rem 1rem",
                      background: "rgba(255,255,255,0.07)",
                      color: "rgba(240,237,230,0.7)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>

                </>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={!authUrlData?.url}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0.6rem 1.25rem",
                    background: "#E07B2A",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} />
                  {"Connect Jobber"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Access */}
      <div
        style={{
          background: "#1a2035",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#F0EDE6", marginBottom: "0.75rem" }}>
          Admin Access
        </h3>
        <p style={{ fontSize: "14px", color: "rgba(240,237,230,0.5)", lineHeight: 1.6 }}>
          This admin console is gated to the site owner only. Access is controlled via your Manus account — only your logged-in session can view these pages. No additional configuration is needed.
        </p>
      </div>
    </AdminLayout>
  );
}
