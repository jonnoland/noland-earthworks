import { useNavigate } from "react-router-dom";
import { PlusCircle, FileText, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatRelative } from "@/lib/utils";

export default function Home() {
  const navigate = useNavigate();

  const { data: recentQuotes, isLoading } = trpc.fieldQuote.mobileList.useQuery(
    { limit: 5 },
    { retry: false }
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="scroll-area" style={{ height: "100%", paddingBottom: 80 }}>
      {/* Header */}
      <div
        className="safe-top"
        style={{
          background: "linear-gradient(135deg, oklch(0.16 0 0) 0%, oklch(0.18 0.03 50) 100%)",
          padding: "20px 20px 24px",
          borderBottom: "1px solid oklch(0.25 0 0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 13, margin: 0 }}>
              {greeting()}, Jon
            </p>
            <h1 style={{ color: "oklch(0.94 0.01 80)", fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>
              Noland Field
            </h1>
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "oklch(0.65 0.18 50)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#000", fontWeight: 700, fontSize: 16 }}>N</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          <button
            onClick={() => navigate("/new-quote")}
            style={{
              background: "oklch(0.65 0.18 50)",
              border: "none",
              borderRadius: 14,
              padding: "20px 16px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <PlusCircle size={24} color="#000" />
            <span style={{ color: "#000", fontWeight: 700, fontSize: 15 }}>New Quote</span>
            <span style={{ color: "rgba(0,0,0,0.6)", fontSize: 12 }}>Capture site details</span>
          </button>

          <button
            onClick={() => navigate("/quotes")}
            style={{
              background: "oklch(0.20 0 0)",
              border: "1px solid oklch(0.25 0 0)",
              borderRadius: 14,
              padding: "20px 16px",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <FileText size={24} color="oklch(0.65 0.18 50)" />
            <span style={{ color: "oklch(0.94 0.01 80)", fontWeight: 700, fontSize: 15 }}>My Quotes</span>
            <span style={{ color: "oklch(0.60 0.01 80)", fontSize: 12 }}>View submissions</span>
          </button>
        </div>

        {/* Recent quotes */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ color: "oklch(0.94 0.01 80)", fontSize: 16, fontWeight: 600, margin: 0 }}>
              Recent Quotes
            </h2>
            <button
              onClick={() => navigate("/quotes")}
              style={{ color: "oklch(0.65 0.18 50)", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}
            >
              See all
            </button>
          </div>

          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 72,
                    borderRadius: 12,
                    backgroundColor: "oklch(0.18 0 0)",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              ))}
            </div>
          )}

          {!isLoading && (!recentQuotes || recentQuotes.length === 0) && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "oklch(0.60 0.01 80)",
                fontSize: 14,
              }}
            >
              <TrendingUp size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ margin: 0 }}>No quotes yet. Tap "New Quote" to get started.</p>
            </div>
          )}

          {!isLoading && recentQuotes && recentQuotes.map((q) => (
            <button
              key={q.id}
              onClick={() => navigate(`/quotes/${q.id}`)}
              style={{
                width: "100%",
                background: "oklch(0.18 0 0)",
                border: "1px solid oklch(0.25 0 0)",
                borderRadius: 12,
                padding: "14px 16px",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ color: "oklch(0.94 0.01 80)", fontWeight: 600, fontSize: 14, margin: "0 0 3px" }}>
                  {q.name}
                </p>
                <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 12, margin: 0 }}>
                  {q.serviceType} · {q.acreage ? `${q.acreage} acres` : "Acreage TBD"}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 11, margin: 0 }}>
                  {formatRelative(q.createdAt)}
                </p>
                {q.aiScore && (
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor:
                        q.aiScore === "strong" ? "oklch(0.70 0.18 145 / 0.2)" :
                        q.aiScore === "marginal" ? "oklch(0.80 0.18 75 / 0.2)" :
                        "oklch(0.65 0.20 25 / 0.2)",
                      color:
                        q.aiScore === "strong" ? "oklch(0.70 0.18 145)" :
                        q.aiScore === "marginal" ? "oklch(0.80 0.18 75)" :
                        "oklch(0.65 0.20 25)",
                    }}
                  >
                    {q.aiScore.charAt(0).toUpperCase() + q.aiScore.slice(1)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
