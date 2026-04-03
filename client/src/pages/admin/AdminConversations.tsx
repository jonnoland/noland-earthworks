import AdminLayout from "@/components/AdminLayout";
import { MessageSquare } from "lucide-react";

export default function AdminConversations() {
  return (
    <AdminLayout title="Conversations">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Conversations</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          Client messages and notes — manage directly in Jobber.
        </p>
      </div>
      <div
        style={{
          background: "#1a2035",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "3rem",
          textAlign: "center",
        }}
      >
        <MessageSquare size={40} color="rgba(240,237,230,0.15)" style={{ margin: "0 auto 1rem" }} />
        <div style={{ color: "rgba(240,237,230,0.5)", fontSize: "15px", marginBottom: "0.5rem" }}>
          Conversations are managed in Jobber
        </div>
        <div style={{ color: "rgba(240,237,230,0.3)", fontSize: "13px", marginBottom: "1.5rem" }}>
          The Jobber API does not expose client messages via the public API. View and respond to client conversations directly in your Jobber account.
        </div>
        <a
          href="https://go.getjobber.com/conversations"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.25rem",
            background: "#E07B2A",
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Open Conversations in Jobber →
        </a>
      </div>
    </AdminLayout>
  );
}
