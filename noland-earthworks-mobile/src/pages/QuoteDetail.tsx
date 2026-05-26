import { useParams } from "react-router-dom";
import { MapPin, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/PageHeader";

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 12, margin: "0 0 2px", fontWeight: 500 }}>{label}</p>
      <p style={{ color: "oklch(0.90 0.01 80)", fontSize: 14, margin: 0 }}>{value}</p>
    </div>
  );
}

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: quote, isLoading, error } = trpc.fieldQuote.mobileGet.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <PageHeader title="Quote Detail" showBack />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "oklch(0.60 0.01 80)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <PageHeader title="Quote Detail" showBack />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <AlertTriangle size={40} color="oklch(0.65 0.20 25)" style={{ marginBottom: 12 }} />
          <p style={{ color: "oklch(0.60 0.01 80)", textAlign: "center" }}>Quote not found.</p>
        </div>
      </div>
    );
  }

  const scoreColor = quote.aiScore === "strong"
    ? "oklch(0.70 0.18 145)"
    : quote.aiScore === "marginal"
    ? "oklch(0.80 0.18 75)"
    : "oklch(0.65 0.20 25)";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader title={quote.name} showBack />

      <div className="scroll-area" style={{ flex: 1, padding: "16px", paddingBottom: 80 }}>
        {/* AI Score */}
        {quote.aiScore && (
          <div
            style={{
              backgroundColor: `${scoreColor.replace(")", " / 0.12)")}`,
              border: `1px solid ${scoreColor.replace(")", " / 0.3)")}`,
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ color: "oklch(0.60 0.01 80)", fontSize: 12, margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Score</p>
              <span style={{ color: scoreColor, fontWeight: 700, fontSize: 14 }}>
                {quote.aiScore.charAt(0).toUpperCase() + quote.aiScore.slice(1)}
              </span>
            </div>
            {quote.aiSummary && (
              <p style={{ color: "oklch(0.80 0.01 80)", fontSize: 13, margin: 0 }}>{quote.aiSummary}</p>
            )}
            {quote.aiFlags && quote.aiFlags.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 16 }}>
                {quote.aiFlags.map((flag: string, i: number) => (
                  <li key={i} style={{ color: "oklch(0.80 0.18 75)", fontSize: 12, marginBottom: 2 }}>{flag}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Photos */}
        {quote.photoUrls && quote.photoUrls.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
              Site Photos ({quote.photoUrls.length})
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {quote.photoUrls.map((url: string, i: number) => (
                <div key={i} style={{ position: "relative", paddingBottom: "100%", borderRadius: 8, overflow: "hidden", backgroundColor: "oklch(0.20 0 0)" }}>
                  <img
                    src={url}
                    alt={`Site photo ${i + 1}`}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details */}
        <div style={{ backgroundColor: "oklch(0.18 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 14, padding: "16px", marginBottom: 16 }}>
          <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Job Details
          </p>
          <DetailRow label="Service Type" value={quote.serviceType} />
          <DetailRow label="Acreage" value={quote.acreage ? `${quote.acreage} acres` : null} />
          <DetailRow label="Terrain" value={quote.terrainType} />
          <DetailRow label="Vegetation Density" value={quote.vegetationDensity} />
          <DetailRow label="Vegetation Types" value={quote.vegetationTypes} />
          <DetailRow label="Slope" value={quote.slopeCondition} />
          <DetailRow label="Site Access" value={quote.accessCondition} />
          <DetailRow label="Obstacles" value={quote.obstacles} />
          <DetailRow label="Proximity to Structures" value={quote.proximityToStructures} />
        </div>

        {/* Contact */}
        <div style={{ backgroundColor: "oklch(0.18 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 14, padding: "16px", marginBottom: 16 }}>
          <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Contact
          </p>
          <DetailRow label="Name" value={quote.name} />
          <DetailRow label="Phone" value={quote.phone} />
          <DetailRow label="Email" value={quote.email} />
          <DetailRow label="Address" value={quote.address} />
          {quote.lat && quote.lng && (
            <div>
              <p style={{ color: "oklch(0.55 0.01 80)", fontSize: 12, margin: "0 0 2px", fontWeight: 500 }}>GPS Coordinates</p>
              <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 13, margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} />
                {Number(quote.lat).toFixed(5)}, {Number(quote.lng).toFixed(5)}
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {quote.message && (
          <div style={{ backgroundColor: "oklch(0.18 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: 14, padding: "16px" }}>
            <p style={{ color: "oklch(0.65 0.18 50)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
              Field Notes
            </p>
            <p style={{ color: "oklch(0.80 0.01 80)", fontSize: 14, margin: 0, lineHeight: 1.6 }}>{quote.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
