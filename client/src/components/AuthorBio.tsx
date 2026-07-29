/*
 * AuthorBio — visual author card displayed at the bottom of every blog post.
 * Links to the /about page to reinforce the Jon Noland entity for E-E-A-T.
 */
import { ExternalLink } from "lucide-react";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png";

export default function AuthorBio() {
  return (
    <section
      style={{
        borderTop: "1px solid rgba(240,237,230,0.1)",
        borderBottom: "1px solid rgba(240,237,230,0.1)",
        padding: "2rem 0",
        marginBottom: "2.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* Avatar — logo mark on dark amber background */}
        <div
          style={{
            width: "72px",
            height: "72px",
            flexShrink: 0,
            backgroundColor: "#1a1208",
            border: "2px solid rgba(224,123,42,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={LOGO_URL}
            alt="Noland Earthworks"
            style={{ width: "52px", height: "auto", opacity: 0.9 }}
          />
        </div>

        {/* Bio text */}
        <div style={{ flex: 1, minWidth: "220px" }}>
          {/* Label */}
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "0.3rem",
            }}
          >
            About the Author
          </p>

          {/* Name */}
          <p
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "1.1rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.2rem",
            }}
          >
            Jon Noland
          </p>

          {/* Title */}
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.78rem",
              color: "rgba(240,237,230,0.5)",
              marginBottom: "0.75rem",
              letterSpacing: "0.03em",
            }}
          >
            Owner &amp; Operator — U.S. Army Veteran · Noland Earthworks, LLC
          </p>

          {/* Bio paragraph */}
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              lineHeight: 1.7,
              color: "rgba(240,237,230,0.75)",
              marginBottom: "1rem",
            }}
          >
            Jon Noland is a U.S. Army veteran and the owner-operator of Noland Earthworks, LLC.
            He personally operates the tracked forestry mulcher on every job across Middle and West
            Tennessee — no subcontractors, no crews. Every article on this site is written from
            direct field experience clearing land in Tennessee's terrain.
          </p>

          {/* Link to About */}
          <a
            href="/about"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#E07B2A",
              textDecoration: "none",
              borderBottom: "1px solid rgba(224,123,42,0.35)",
              paddingBottom: "1px",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "#f59340";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(245,147,64,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = "#E07B2A";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(224,123,42,0.35)";
            }}
          >
            Read Jon's full bio <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </section>
  );
}
