/*
 * DESIGN: Heavy Equipment Grit — dedicated counties section
 * Shows all 35 served counties grouped by region (Middle TN / West TN)
 * with amber accent chips linking to each county landing page.
 */
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const MIDDLE_TN = [
  { name: "Bedford County", slug: "bedford-county" },
  { name: "Cannon County", slug: "cannon-county" },
  { name: "Cheatham County", slug: "cheatham-county" },
  { name: "Davidson County", slug: "davidson-county" },
  { name: "Dickson County", slug: "dickson-county" },
  { name: "Giles County", slug: "giles-county" },
  { name: "Hickman County", slug: "hickman-county" },
  { name: "Houston County", slug: "houston-county" },
  { name: "Humphreys County", slug: "humphreys-county" },
  { name: "Lawrence County", slug: "lawrence-county" },
  { name: "Lewis County", slug: "lewis-county" },
  { name: "Lincoln County", slug: "lincoln-county" },
  { name: "Marshall County", slug: "marshall-county" },
  { name: "Maury County", slug: "maury-county" },
  { name: "Montgomery County", slug: "montgomery-county" },
  { name: "Moore County", slug: "moore-county" },
  { name: "Perry County", slug: "perry-county" },
  { name: "Robertson County", slug: "robertson-county" },
  { name: "Rutherford County", slug: "rutherford-county" },
  { name: "Stewart County", slug: "stewart-county" },
  { name: "Sumner County", slug: "sumner-county" },
  { name: "Trousdale County", slug: "trousdale-county" },
  { name: "Wayne County", slug: "wayne-county" },
  { name: "Williamson County", slug: "williamson-county" },
  { name: "Wilson County", slug: "wilson-county" },
];

const WEST_TN = [
  { name: "Benton County", slug: "benton-county" },
  { name: "Carroll County", slug: "carroll-county" },
  { name: "Chester County", slug: "chester-county" },
  { name: "Decatur County", slug: "decatur-county" },
  { name: "Gibson County", slug: "gibson-county" },
  { name: "Hardin County", slug: "hardin-county" },
  { name: "Henderson County", slug: "henderson-county" },
  { name: "Henry County", slug: "henry-county" },
  { name: "Madison County", slug: "madison-county" },
  { name: "Weakley County", slug: "weakley-county" },
];

function CountyChip({ name, slug }: { name: string; slug: string }) {
  return (
    <a
      href={`/service-areas/${slug}`}
      className="flex items-center gap-2 py-2 px-3"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        textDecoration: "none",
        transition: "border-color 0.2s, background-color 0.2s",
        fontFamily: "'Lato', sans-serif",
        fontWeight: 400,
        fontSize: "0.8125rem",
        color: "rgba(240,237,230,0.78)",
        letterSpacing: "0.02em",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.5)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(224,123,42,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          backgroundColor: "#E07B2A",
          flexShrink: 0,
          display: "block",
        }}
      />
      {name}
    </a>
  );
}

export default function CountiesSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="counties"
      style={{
        backgroundColor: "#0D0D0D",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "5rem 0",
      }}
    >
      <div className="container">
        {/* Header */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            marginBottom: "3rem",
          }}
        >
          <div
            className="section-label mb-4"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.75rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#E07B2A",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <MapPin size={14} />
            Service Coverage
          </div>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.75rem",
            }}
          >
            35 Counties. One Team.
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: "rgba(240,237,230,0.6)",
              maxWidth: "560px",
            }}
          >
            From the Nashville metro to the Jackson area and beyond — we bring the same
            veteran-grade work ethic to every county we serve. Click any county to learn more.
          </p>
        </div>

        {/* Two-column region layout */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s",
          }}
        >
          {/* Middle Tennessee */}
          <div>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.75rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#E07B2A",
                marginBottom: "1rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid rgba(224,123,42,0.25)",
              }}
            >
              Middle Tennessee — {MIDDLE_TN.length} Counties
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MIDDLE_TN.map((c) => (
                <CountyChip key={c.slug} name={c.name} slug={c.slug} />
              ))}
            </div>
          </div>

          {/* West Tennessee */}
          <div>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.75rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#E07B2A",
                marginBottom: "1rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid rgba(224,123,42,0.25)",
              }}
            >
              West Tennessee — {WEST_TN.length} Counties
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WEST_TN.map((c) => (
                <CountyChip key={c.slug} name={c.name} slug={c.slug} />
              ))}
            </div>
          </div>
        </div>

        {/* CTA row */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s",
            marginTop: "2.5rem",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            flexWrap: "wrap" as const,
          }}
        >
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9375rem",
              color: "rgba(240,237,230,0.55)",
              margin: 0,
            }}
          >
            Don't see your county? Give us a call — we may still be able to help.
          </p>
          <a
            href="/quote"
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#E07B2A",
              textDecoration: "none",
              border: "1px solid rgba(224,123,42,0.5)",
              padding: "0.625rem 1.25rem",
              transition: "background-color 0.2s, color 0.2s",
              whiteSpace: "nowrap" as const,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#E07B2A";
              (e.currentTarget as HTMLElement).style.color = "#121212";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#E07B2A";
            }}
          >
            Get a Free Quote →
          </a>
        </div>
      </div>
    </section>
  );
}
