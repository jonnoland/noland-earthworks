import AdminLayout from "@/components/AdminLayout";
import { Star } from "lucide-react";

export default function AdminReviews() {
  return (
    <AdminLayout title="Reviews">
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#F0EDE6" }}>Reviews</h2>
        <p style={{ color: "rgba(240,237,230,0.45)", fontSize: "13px" }}>
          Customer reviews — Jobber does not expose reviews via API. Manage directly in Jobber.
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
        <Star size={40} color="rgba(240,237,230,0.15)" style={{ margin: "0 auto 1rem" }} />
        <div style={{ color: "rgba(240,237,230,0.5)", fontSize: "15px", marginBottom: "0.5rem" }}>
          Reviews are managed in Jobber
        </div>
        <div style={{ color: "rgba(240,237,230,0.3)", fontSize: "13px", marginBottom: "1.5rem" }}>
          The Jobber API does not currently expose customer reviews. View and respond to reviews directly in your Jobber account.
        </div>
        <a
          href="https://go.getjobber.com/reviews"
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
          Open Reviews in Jobber →
        </a>
      </div>
    </AdminLayout>
  );
}
