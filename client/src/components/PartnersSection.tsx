/**
 * PartnersSection — "Partners & Affiliations" homepage section
 * Displays logos/badges for local directories, veteran organizations,
 * and industry affiliations. Text-based fallback badges for orgs without
 * uploaded logos, so the section is always populated and accurate.
 *
 * Design: Heavy Equipment Grit — dark background, amber accents, uppercase labels.
 */

const PARTNERS = [
  {
    key: "vob",
    name: "Veteran-Owned Business",
    category: "Recognition",
    description: "U.S. Army Veteran — Owner & Operator",
    badge: "VOB",
    color: "#1B3A6B",
    accent: "#C8A84B",
  },
  {
    key: "google",
    name: "Google Business Profile",
    category: "Directory",
    description: "Verified local business listing",
    badge: "G",
    color: "#4285F4",
    accent: "#fff",
    href: "https://www.google.com/maps/search/Noland+Earthworks",
  },
  {
    key: "bbb",
    name: "Better Business Bureau",
    category: "Accreditation",
    description: "Committed to ethical business practices",
    badge: "BBB",
    color: "#003087",
    accent: "#fff",
  },
  {
    key: "angi",
    name: "Angi (Angie's List)",
    category: "Directory",
    description: "Listed on Angi for homeowner reviews",
    badge: "Angi",
    color: "#FF6153",
    accent: "#fff",
  },
  {
    key: "houzz",
    name: "Houzz",
    category: "Directory",
    description: "Outdoor & landscaping professional listing",
    badge: "houzz",
    color: "#73BA25",
    accent: "#fff",
  },
  {
    key: "thumbtack",
    name: "Thumbtack",
    category: "Directory",
    description: "Local pro listing for land clearing",
    badge: "TT",
    color: "#009FD4",
    accent: "#fff",
  },
  {
    key: "yelp",
    name: "Yelp",
    category: "Directory",
    description: "Customer reviews on Yelp",
    badge: "Yelp",
    color: "#D32323",
    accent: "#fff",
  },
  {
    key: "tn-chamber",
    name: "Tennessee Chamber",
    category: "Association",
    description: "Tennessee business community member",
    badge: "TN",
    color: "#003087",
    accent: "#C8A84B",
  },
];

export default function PartnersSection() {
  return (
    <section
      style={{
        backgroundColor: "#0a0a0a",
        paddingTop: "4rem",
        paddingBottom: "4rem",
        borderTop: "1px solid rgba(224,123,42,0.12)",
      }}
    >
      <div className="container">
        {/* Header */}
        <div className="text-center mb-10">
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "0.75rem",
            }}
          >
            Partners & Affiliations
          </div>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.5rem",
            }}
          >
            Recognized. Listed. Verified.
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9rem",
              color: "rgba(240,237,230,0.5)",
              maxWidth: "480px",
              margin: "0 auto",
            }}
          >
            Find Noland Earthworks across the directories and organizations that matter to Tennessee landowners.
          </p>
        </div>

        {/* Partner badges grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          style={{ maxWidth: "860px", margin: "0 auto" }}
        >
          {PARTNERS.map((p) => {
            const inner = (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "1.25rem 0.75rem",
                  backgroundColor: "rgba(240,237,230,0.03)",
                  border: "1px solid rgba(240,237,230,0.08)",
                  transition: "border-color 0.2s, background-color 0.2s",
                  cursor: p.href ? "pointer" : "default",
                  height: "100%",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(224,123,42,0.35)";
                  el.style.backgroundColor = "rgba(224,123,42,0.04)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(240,237,230,0.08)";
                  el.style.backgroundColor = "rgba(240,237,230,0.03)";
                }}
              >
                {/* Badge circle */}
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: p.badge.length > 3 ? "0.65rem" : p.badge.length > 2 ? "0.75rem" : "1rem",
                    letterSpacing: "0.04em",
                    color: p.accent,
                    flexShrink: 0,
                  }}
                >
                  {p.badge}
                </div>

                {/* Name */}
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#F0EDE6",
                    textAlign: "center",
                    lineHeight: 1.25,
                  }}
                >
                  {p.name}
                </div>

                {/* Category pill */}
                <div
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(224,123,42,0.8)",
                    backgroundColor: "rgba(224,123,42,0.08)",
                    border: "1px solid rgba(224,123,42,0.15)",
                    padding: "0.15rem 0.5rem",
                  }}
                >
                  {p.category}
                </div>
              </div>
            );

            return p.href ? (
              <a
                key={p.key}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", display: "block" }}
                aria-label={`Visit ${p.name}`}
              >
                {inner}
              </a>
            ) : (
              <div key={p.key}>{inner}</div>
            );
          })}
        </div>

        {/* Note */}
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "0.75rem",
            color: "rgba(240,237,230,0.3)",
            textAlign: "center",
            marginTop: "2rem",
          }}
        >
          Active listings and memberships are updated as new affiliations are established.
        </p>
      </div>
    </section>
  );
}
