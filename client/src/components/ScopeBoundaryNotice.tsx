import { ClipboardCheck } from "lucide-react";

/**
 * Shared public boundary for vegetation work. Keep this factual statement in one
 * place so service, county, education, and conversion pages do not imply work
 * that is only available through another contractor or a specific written scope.
 */
export default function ScopeBoundaryNotice({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-labelledby="scope-boundary-title"
      style={{
        backgroundColor: compact ? "rgba(224,123,42,0.07)" : "#151515",
        borderTop: "1px solid rgba(224,123,42,0.24)",
        borderBottom: "1px solid rgba(224,123,42,0.24)",
        padding: compact ? "1.25rem" : "3rem 0",
      }}
    >
      <div className={compact ? "" : "container"} style={{ maxWidth: compact ? undefined : "940px" }}>
        <div className="flex items-start gap-3">
          <ClipboardCheck size={compact ? 18 : 22} style={{ color: "#E07B2A", flexShrink: 0, marginTop: "0.15rem" }} aria-hidden="true" />
          <div>
            <h2
              id="scope-boundary-title"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: compact ? "1rem" : "1.35rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "0.55rem",
              }}
            >
              What a site visit and written proposal determine
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: compact ? "0.84rem" : "0.95rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.76)",
                margin: 0,
              }}
            >
              Noland Earthworks clears vegetation and typically leaves mulch on site. Grading, excavation, hauling, stump or root extraction, road construction, and final building-pad preparation are not included unless a written proposal specifically says otherwise. A site visit confirms vegetation, access, terrain, utilities, boundaries, and the exact work included.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
