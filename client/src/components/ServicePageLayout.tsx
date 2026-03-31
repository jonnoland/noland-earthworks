/*
 * DESIGN: Heavy Equipment Grit — shared layout for all service detail pages
 * Hero banner → overview → photo gallery → FAQ accordion → CTA
 */
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, ArrowRight, Check } from "lucide-react";
// Using plain <a> tags to avoid nested anchor issues (wouter Link renders as <a>)

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServicePageProps {
  slug: string;
  title: string;
  tagline: string;
  heroImage: string;
  overviewTitle: string;
  overviewBody: string[];
  benefits: string[];
  faqs: FaqItem[];
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

function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const { ref, visible } = useVisible(0.1);
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {faqs.map((faq, i) => (
        <div
          key={i}
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "0",
          }}
        >
          <button
            className="w-full text-left flex items-center justify-between py-5 gap-4"
            onClick={() => setOpen(open === i ? null : i)}
            style={{ background: "none", border: "none" }}
          >
            <span
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                fontSize: "1rem",
                letterSpacing: "0.03em",
                color: open === i ? "#E07B2A" : "#F0EDE6",
                transition: "color 0.2s ease",
              }}
            >
              {faq.question}
            </span>
            <span style={{ color: "#E07B2A", flexShrink: 0 }}>
              {open === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>
          {open === i && (
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.72)",
                paddingBottom: "1.25rem",
                paddingRight: "2rem",
              }}
            >
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ServicePageLayout(props: ServicePageProps) {
  const {
    title, tagline, heroImage, overviewTitle, overviewBody,
    benefits, faqs,
  } = props;


  const headerVis = useVisible(0.1);
  const faqVis = useVisible(0.1);

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>

      {/* ── HERO BANNER ── */}
      <section
        className="relative flex items-end"
        style={{
          minHeight: "52vh",
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.5) 60%, rgba(10,10,10,0.2) 100%)",
          }}
        />
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: "#E07B2A" }}
        />
        <div className="container relative z-10 pb-12 pt-28">
          <a
            href="/"
            className="inline-flex items-center gap-2 mb-6 transition-colors duration-200"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.55)",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E07B2A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,237,230,0.55)")}
          >
            <ArrowLeft size={14} /> Back to Home
          </a>
          <div className="section-label mb-3">Our Services</div>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.0,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "#F0EDE6",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              color: "rgba(240,237,230,0.75)",
              marginTop: "0.75rem",
              maxWidth: "540px",
            }}
          >
            {tagline}
          </p>
        </div>
      </section>

      {/* ── OVERVIEW ── */}
      <section style={{ paddingTop: "5rem", paddingBottom: "5rem" }}>
        <div className="container">
          <div
            ref={headerVis.ref}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
            style={{
              opacity: headerVis.visible ? 1 : 0,
              transform: headerVis.visible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <div>
              <div className="section-label mb-4">Overview</div>
              <h2
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#F0EDE6",
                  marginBottom: "1.5rem",
                }}
              >
                {overviewTitle}
              </h2>
              {overviewBody.map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.9375rem",
                    lineHeight: 1.75,
                    color: "rgba(240,237,230,0.72)",
                    marginBottom: "1rem",
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#E07B2A",
                  marginBottom: "1.25rem",
                }}
              >
                Key Benefits
              </div>
              <div className="flex flex-col gap-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center w-5 h-5 flex-shrink-0 mt-0.5"
                      style={{
                        backgroundColor: "rgba(224,123,42,0.15)",
                        border: "1px solid rgba(224,123,42,0.35)",
                        color: "#E07B2A",
                      }}
                    >
                      <Check size={12} />
                    </div>
                    <span
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.9rem",
                        color: "rgba(240,237,230,0.8)",
                        lineHeight: 1.5,
                      }}
                    >
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        style={{
          backgroundColor: "#0F1A0F",
          paddingTop: "5rem",
          paddingBottom: "5rem",
          borderTop: "1px solid rgba(224,123,42,0.15)",
        }}
      >
        <div className="container">
          <div
            ref={faqVis.ref}
            style={{
              opacity: faqVis.visible ? 1 : 0,
              transform: faqVis.visible ? "translateY(0)" : "translateY(24px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <div className="section-label mb-4">Common Questions</div>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "2.5rem",
              }}
            >
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl">
              <FaqAccordion faqs={faqs} />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section
        style={{
          backgroundColor: "#E07B2A",
          paddingTop: "3.5rem",
          paddingBottom: "3.5rem",
        }}
      >
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "1.75rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#0a0a0a",
              }}
            >
              Ready to Get Started?
            </h3>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 400,
                fontSize: "0.9375rem",
                color: "rgba(10,10,10,0.7)",
              }}
            >
              Contact us today for a free, no-obligation quote on {title.toLowerCase()}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="tel:6154064819"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0a0a0a",
                backgroundColor: "rgba(10,10,10,0.12)",
                border: "2px solid rgba(10,10,10,0.3)",
                padding: "0.75rem 1.75rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Call 615-406-4819
            </a>
            <a
              href="/quote"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                backgroundColor: "#0a0a0a",
                border: "2px solid #0a0a0a",
                padding: "0.75rem 1.75rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Request a Quote
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
