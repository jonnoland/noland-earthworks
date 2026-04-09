/*
 * Sticky bottom CTA bar — visible only on mobile/tablet (hidden lg:hidden)
 * Shows "Call" and "Get Quote" buttons fixed to the bottom of the screen
 */
import { Phone } from "lucide-react";

export default function MobileCTABar() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        backgroundColor: "rgba(18, 18, 18, 0.97)",
        borderTop: "1px solid rgba(224,123,42,0.35)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch h-14">
        {/* Call button */}
        <a
          href="tel:6154064819"
          className="flex-1 flex items-center justify-center gap-2 transition-colors"
          style={{
            color: "#F0EDE6",
            textDecoration: "none",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            borderRight: "1px solid rgba(224,123,42,0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(224,123,42,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <Phone size={16} style={{ color: "#E07B2A" }} />
          Call Now
        </a>

        {/* Get Quote button */}
        <a
          href="/quote"
          className="flex-1 flex items-center justify-center gap-2 transition-colors"
          style={{
            backgroundColor: "#E07B2A",
            color: "#121212",
            textDecoration: "none",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#c96a1f";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#E07B2A";
          }}
        >
          Get a Free Quote
        </a>
      </div>
    </div>
  );
}
