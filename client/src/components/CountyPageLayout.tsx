/*
 * DESIGN: Heavy Equipment Grit — shared layout for county/city landing pages
 * Hero → intro → services list → why choose us → service area map CTA → FAQ → CTA
 */
import { ArrowRight, MapPin, Phone, Star, FileText, Shield } from "lucide-react";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
const CountyMap = lazy(() => import("@/components/CountyMap"));

export interface CountyPageProps {
  county: string;           // e.g. "Davidson County"
  state: string;            // e.g. "Tennessee"
  slug: string;             // e.g. "davidson-county"
  heroImage: string;
  intro: string[];          // 2-3 paragraphs
  nearbyAreas: string[];    // cities/towns in the county
  faqs: { question: string; answer: string }[];
  nearbyCounties?: { name: string; slug: string }[]; // adjacent counties for internal linking
}

function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const SERVICES = [
  {
    title: "Forestry Mulching",
    slug: "forestry-mulching",
    desc: "Single-pass land management that grinds trees, brush, and stumps into mulch — no hauling, no burning.",
  },
  {
    title: "Land Management",
    slug: "land-management",
    desc: "Full site clearing of trees, stumps, brush, and debris for residential and commercial properties.",
  },
  {
    title: "Vegetation Management",
    slug: "vegetation-management",
    desc: "Control invasive species, overgrowth, and unwanted vegetation along fences, roadsides, and waterways.",
  },
  {
    title: "Site Preparation",
    slug: "property-maintenance",
    desc: "Grading and site prep to ready your land for construction, pasture, or development.",
  },
];

function FaqAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const { ref, visible } = useVisible(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      {faqs.map((faq, i) => (
        <div
          key={i}
          style={{
            borderBottom: "1px solid rgba(240,237,230,0.1)",
            marginBottom: "0",
          }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left flex justify-between items-center gap-4 py-5"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <span
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                fontSize: "1.05rem",
                color: "#F0EDE6",
                letterSpacing: "0.02em",
              }}
            >
              {faq.question}
            </span>
            <span style={{ color: "#E07B2A", flexShrink: 0 }}>
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && (
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.975rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.75)",
                paddingBottom: "1.25rem",
                margin: 0,
              }}
            >
              {faq.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function buildQuoteUrl(county: string, nearbyAreas: string[], state: string): string {
  const countyParam = county.replace(/ County$/, "").toLowerCase();
  const cityParam = encodeURIComponent(nearbyAreas[0] || "");
  const stateParam = state === "Tennessee" ? "TN" : state;
  return `/quote?county=${countyParam}&city=${cityParam}&state=${stateParam}`;
}

export default function CountyPageLayout({
  county,
  state,
  slug,
  heroImage,
  intro,
  nearbyAreas,
  faqs,
  nearbyCounties,
}: CountyPageProps) {
  const quoteUrl = buildQuoteUrl(county, nearbyAreas, state);
  const servicesRef = useVisible();

  // Inject FAQ JSON-LD schema for Google rich results
  useEffect(() => {
    const id = `faq-schema-${slug}`;
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
    return () => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    };
  }, [slug, faqs]);
  const introRef = useVisible();
  const areasRef = useVisible();

  return (
    <main style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      {/* Hero */}
      <section
        className="relative flex flex-col justify-center overflow-hidden"
        style={{ minHeight: "55vh", backgroundColor: "#0a0a0a" }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,0.4) 100%)",
          }}
        />
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: "#E07B2A" }}
        />
        <div className="container relative z-10 pt-32 pb-16">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={16} style={{ color: "#E07B2A" }} />
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: "#E07B2A",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {state}
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 6vw, 4.5rem)",
              lineHeight: 1.05,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1rem",
            }}
          >
            Land Management &amp;
            <br />
            <span style={{ color: "#E07B2A" }}>Forestry Mulching</span>
            <br />
            in {county}
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.1rem",
              color: "rgba(240,237,230,0.8)",
              maxWidth: "520px",
              marginBottom: "2rem",
            }}
          >
            Veteran-owned land services serving {county}, {state}. Free estimates on all projects.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={quoteUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "#E07B2A",
                color: "#fff",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.85rem 1.75rem",
                textDecoration: "none",
              }}
            >
              Get a Free Quote <ArrowRight size={16} />
            </a>
            <a
              href="tel:+16154064819"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "1px solid rgba(240,237,230,0.35)",
                color: "#F0EDE6",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.85rem 1.75rem",
                textDecoration: "none",
              }}
            >
              <Phone size={15} /> 615-406-4819
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div
        style={{
          backgroundColor: "#1a1a1a",
          borderTop: "1px solid rgba(224,123,42,0.3)",
          borderBottom: "1px solid rgba(224,123,42,0.3)",
        }}
      >
        <div className="container py-4">
          <div className="flex flex-wrap gap-6 justify-center md:justify-start">
            {[
              { icon: <Star size={15} />, label: "Veteran-Owned & Operated" },
              { icon: <FileText size={15} />, label: "Free Estimates" },
              { icon: <Shield size={15} />, label: "Fully Insured" },
              { icon: <MapPin size={15} />, label: `Serving ${county}` },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-2"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "rgba(240,237,230,0.8)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: "#E07B2A" }}>{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intro */}
      <section className="container py-16 md:py-20">
        <div
          ref={introRef.ref}
          className={`max-w-3xl transition-all duration-700 ${introRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1.5rem",
              letterSpacing: "0.03em",
            }}
          >
            Professional Land Services in{" "}
            <span style={{ color: "#E07B2A" }}>{county}</span>
          </h2>
          {intro.map((p, i) => (
            <p
              key={i}
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1rem",
                lineHeight: 1.8,
                color: "rgba(240,237,230,0.8)",
                marginBottom: "1rem",
              }}
            >
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* Services */}
      <section style={{ backgroundColor: "#1a1a1a" }} className="py-16 md:py-20">
        <div className="container">
          <div
            ref={servicesRef.ref}
            className={`transition-all duration-700 ${servicesRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "0.5rem",
                letterSpacing: "0.03em",
              }}
            >
              Our Services in{" "}
              <span style={{ color: "#E07B2A" }}>{county}</span>
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                color: "rgba(240,237,230,0.6)",
                marginBottom: "2.5rem",
              }}
            >
              We provide the full range of land services to property owners throughout {county}.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SERVICES.map((s) => (
                <a
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  style={{
                    display: "block",
                    backgroundColor: "#242424",
                    border: "1px solid rgba(240,237,230,0.08)",
                    padding: "1.5rem",
                    textDecoration: "none",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.5)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "rgba(240,237,230,0.08)")
                  }
                >
                  <h3
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      color: "#E07B2A",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.9rem",
                      lineHeight: 1.6,
                      color: "rgba(240,237,230,0.7)",
                      marginBottom: "1rem",
                    }}
                  >
                    {s.desc}
                  </p>
                  <span
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#E07B2A",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    Learn More <ArrowRight size={13} />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service Area Map */}
      <section style={{ backgroundColor: "#121212" }} className="py-16 md:py-20">
        <div className="container">
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.5rem",
              letterSpacing: "0.03em",
            }}
          >
            Our Service Area in{" "}
            <span style={{ color: "#E07B2A" }}>{county}</span>
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              color: "rgba(240,237,230,0.6)",
              marginBottom: "1.5rem",
            }}
          >
            We serve all of {county}, {state} and the surrounding region.
          </p>
          <Suspense fallback={
            <div
              style={{
                height: "420px",
                backgroundColor: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(240,237,230,0.4)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9rem",
              }}
            >
              Loading map...
            </div>
          }>
            <CountyMap slug={slug} county={county} state={state} primaryCity={nearbyAreas[0]} />
          </Suspense>
        </div>
      </section>

      {/* Areas served */}
      <section className="container py-16 md:py-20">
        <div
          ref={areasRef.ref}
          className={`transition-all duration-700 ${areasRef.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1.5rem",
              letterSpacing: "0.03em",
            }}
          >
            Cities &amp; Towns We Serve in{" "}
            <span style={{ color: "#E07B2A" }}>{county}</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {nearbyAreas.map((area) => (
              <span
                key={area}
                style={{
                  backgroundColor: "#1e1e1e",
                  border: "1px solid rgba(224,123,42,0.25)",
                  color: "rgba(240,237,230,0.8)",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 400,
                  padding: "0.4rem 1rem",
                }}
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ backgroundColor: "#1a1a1a" }} className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "2rem",
              letterSpacing: "0.03em",
            }}
          >
            Frequently Asked Questions
          </h2>
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      {/* Nearby Service Areas — internal linking for SEO */}
      {nearbyCounties && nearbyCounties.length > 0 && (
        <section className="container py-10 md:py-12">
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.45)",
              marginBottom: "0.75rem",
            }}
          >
            Nearby Service Areas
          </p>
          <div className="flex flex-wrap gap-3">
            {nearbyCounties.map((c) => (
              <a
                key={c.slug}
                href={`/service-areas/${c.slug}`}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(224,123,42,0.25)",
                  color: "rgba(240,237,230,0.7)",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 400,
                  padding: "0.35rem 0.9rem",
                  textDecoration: "none",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "#E07B2A";
                  (e.currentTarget as HTMLAnchorElement).style.color = "#E07B2A";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(224,123,42,0.25)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "rgba(240,237,230,0.7)";
                }}
              >
                {c.name}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section
        className="py-16 md:py-20"
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          borderTop: "1px solid rgba(224,123,42,0.2)",
        }}
      >
        <div className="container text-center">
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1rem",
              letterSpacing: "0.03em",
            }}
          >
            Ready to Clear Your Land in{" "}
            <span style={{ color: "#E07B2A" }}>{county}?</span>
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.05rem",
              color: "rgba(240,237,230,0.7)",
              maxWidth: "500px",
              margin: "0 auto 2rem",
              lineHeight: 1.7,
            }}
          >
            Contact Noland Earthworks today for a free, no-obligation estimate on your project.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href={quoteUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "#E07B2A",
                color: "#fff",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.9rem 2rem",
                textDecoration: "none",
              }}
            >
              Schedule a Free Quote <ArrowRight size={16} />
            </a>
            <a
              href="tel:+16154064819"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                border: "1px solid rgba(240,237,230,0.35)",
                color: "#F0EDE6",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "0.9rem 2rem",
                textDecoration: "none",
              }}
            >
              <Phone size={15} /> Call 615-406-4819
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
