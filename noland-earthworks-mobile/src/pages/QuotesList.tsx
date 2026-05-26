import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight, Image } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatRelative } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";

export default function QuotesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: quotes, isLoading } = trpc.fieldQuote.mobileList.useQuery(
    { limit: 50 },
    { retry: false }
  );

  const filtered = quotes?.filter((q) =>
    !search ||
    q.name.toLowerCase().includes(search.toLowerCase()) ||
    q.address?.toLowerCase().includes(search.toLowerCase()) ||
    q.serviceType?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title="My Quotes" />

      {/* Search bar */}
      <div style={{ padding: "12px 16px", backgroundColor: "oklch(0.16 0 0)", borderBottom: "1px solid oklch(0.25 0 0)" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "oklch(0.60 0.01 80)" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes..."
            style={{
              width: "100%",
              backgroundColor: "oklch(0.20 0 0)",
              border: "1px solid oklch(0.25 0 0)",
              borderRadius: 10,
              padding: "10px 12px 10px 36px",
              color: "oklch(0.94 0.01 80)",
              fontSize: 15,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div className="scroll-area" style={{ flex: 1, padding: "12px 16px", paddingBottom: 80 }}>
        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{ height: 80, borderRadius: 12, backgroundColor: "oklch(0.18 0 0)" }} />
            ))}
          </div>
        )}

        {!isLoading && (!filtered || filtered.length === 0) && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "oklch(0.60 0.01 80)" }}>
            <p style={{ margin: 0 }}>
              {search ? "No quotes match your search." : "No field quotes submitted yet."}
            </p>
          </div>
        )}

        {filtered?.map((q) => (
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
              gap: 12,
            }}
          >
            {/* Photo thumbnail or placeholder */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                backgroundColor: "oklch(0.22 0 0)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {q.photoUrls && q.photoUrls.length > 0 ? (
                <img
                  src={q.photoUrls[0]}
                  alt="Site photo"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Image size={20} color="oklch(0.40 0 0)" />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "oklch(0.94 0.01 80)", fontWeight: 600, fontSize: 14, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {q.name}
              </p>
              <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 12, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {q.address || "No address"}
              </p>
              <p style={{ color: "oklch(0.50 0.01 80)", fontSize: 11, margin: 0 }}>
                {q.serviceType} · {formatRelative(q.createdAt)}
                {q.photoUrls && q.photoUrls.length > 0 && (
                  <span style={{ marginLeft: 6, color: "oklch(0.65 0.18 50)" }}>
                    {q.photoUrls.length} photo{q.photoUrls.length !== 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {q.aiScore && (
                <span
                  style={{
                    padding: "3px 8px",
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
              <ChevronRight size={16} color="oklch(0.40 0 0)" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
