/*
 * DESIGN: Heavy Equipment Grit — 2x2 card grid with image backgrounds, hover reveal
 * Dark cards with amber accent borders on hover
 * Forestry Mulching: Primary Service badge (pulse), CTA button, benefits tooltip
 */
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const LAND_CLEARING = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_MULCHING = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_MGMT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const PROPERTY_MAINT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const PRIMARY_BENEFITS = [
  "No debris piles, no hauling, no burning",
  "Single machine — one operator, one pass",
  "Mulch stays on-site as natural ground cover",
  "Works on slopes and wet ground",
  "Faster and cleaner than traditional clearing",
];

const services = [
  {
    title: "Forestry Mulching",
    href: "/services/forestry-mulching",
    description:
      "Our primary service. A single tracked machine grinds trees, brush, and vegetation into mulch on-site — no debris piles, no hauling, no burning. Faster, cleaner, and better for the land than traditional clearing.",
    image: FORESTRY_MULCHING,
  },
  {
    title: "Land Management",
    href: "/services/land-management",
    description:
      "Professional land management services for residential and commercial properties. We clear brush, trees, and overgrowth to prepare your land for development, agriculture, or recreational use.",
    image: LAND_CLEARING,
  },
  {
    title: "Vegetation Management",
    href: "/services/vegetation-management",
    description:
      "Strategic vegetation management to maintain property aesthetics, prevent overgrowth, and manage invasive species along fence lines, rights-of-way, and property boundaries.",
    image: VEGETATION_MGMT,
  },
  {
    title: "Property Maintenance",
    href: "/services/property-maintenance",
    description:
      "Ongoing property maintenance and land management services to keep your property looking its best year-round. Veteran-owned expertise you can trust.",
    image: PROPERTY_MAINT,
  },
];

function ServiceCard({ title, description, image, href, index, isPrimary }: {
  title: string; description: string; image: string; href: string; index: number; isPrimary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden"
      style={{
        aspectRatio: "4/3",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
        border: isPrimary
          ? hovered ? "1px solid rgba(224,123,42,0.9)" : "1px solid rgba(224,123,42,0.45)"
          : hovered ? "1px solid rgba(224,123,42,0.6)" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: isPrimary
          ? hovered
            ? "0 0 32px rgba(224,123,42,0.25), inset 0 0 0 1px rgba(224,123,42,0.15)"
            : "0 0 18px rgba(224,123,42,0.12), inset 0 0 0 1px rgba(224,123,42,0.08)"
          : undefined,
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowBenefits(false); }}
    >
      {/* Clickable overlay — sits below interactive elements */}
      <a
        href={href}
        className="absolute inset-0 z-10"
        aria-label={`Learn more about ${title}`}
        style={{ display: "block" }}
      />

      {/* Background image */}
      <div
        className="absolute inset-0 transition-transform duration-500"
        style={{
          backgroundImage: `url(${image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: hovered ? "scale(1.05)" : "scale(1)",
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: hovered
            ? "linear-gradient(to top, rgba(10,10,10,0.97) 0%, rgba(10,10,10,0.65) 55%, rgba(10,10,10,0.2) 100%)"
            : "linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.45) 60%, rgba(10,10,10,0.15) 100%)",
        }}
      />

      {/* Amber top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 transition-all duration-300"
        style={{
          backgroundColor: "#E07B2A",
          height: isPrimary ? "3px" : "2px",
          opacity: isPrimary ? 1 : hovered ? 1 : 0,
        }}
      />

      {/* Primary Service badge with pulse animation */}
      {isPrimary && (
        <>
          <style>{`
            @keyframes badgePulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(224,123,42,0.55); }
              50% { box-shadow: 0 0 0 6px rgba(224,123,42,0); }
            }
            .primary-badge {
              animation: badgePulse 2.4s ease-in-out infinite;
            }
            .primary-badge:hover {
              animation: none;
              background-color: rgba(224,123,42,1) !important;
              transform: scale(1.05);
            }
          `}</style>
          <div
            className="primary-badge absolute top-4 right-4 z-20"
            style={{
              backgroundColor: "rgba(224,123,42,0.92)",
              color: "#121212",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "0.6rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "0.3rem 0.65rem",
              borderRadius: "2px",
              lineHeight: 1,
              transition: "transform 0.15s ease, background-color 0.15s ease",
              cursor: "default",
            }}
          >
            Primary Service
          </div>
        </>
      )}

      {/* Benefits expandable panel — primary card only */}
      {isPrimary && (
        <div
          className="absolute z-20"
          style={{
            top: "3.5rem",
            right: "1rem",
          }}
        >
          {/* Why Primary? toggle button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBenefits(v => !v); }}
            style={{
              backgroundColor: showBenefits ? "rgba(224,123,42,0.18)" : "rgba(0,0,0,0.45)",
              border: "1px solid rgba(224,123,42,0.4)",
              color: "#E07B2A",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 500,
              fontSize: "0.58rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "0.25rem 0.55rem",
              borderRadius: "2px",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              lineHeight: 1,
            }}
          >
            Why Primary?
          </button>

          {/* Benefits dropdown */}
          {showBenefits && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "220px",
                backgroundColor: "rgba(10,10,10,0.96)",
                border: "1px solid rgba(224,123,42,0.35)",
                borderRadius: "3px",
                padding: "0.85rem 1rem",
              }}
            >
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.65rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#E07B2A",
                marginBottom: "0.6rem",
              }}>
                Why Forestry Mulching
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {PRIMARY_BENEFITS.map((b) => (
                  <li
                    key={b}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.45rem",
                      marginBottom: "0.45rem",
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.75rem",
                      lineHeight: 1.45,
                      color: "rgba(240,237,230,0.82)",
                    }}
                  >
                    <CheckCircle2
                      size={11}
                      style={{ color: "#E07B2A", flexShrink: 0, marginTop: "2px" }}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: "1.5rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#F0EDE6",
            marginBottom: "0.75rem",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "rgba(240,237,230,0.75)",
            maxHeight: hovered ? "8rem" : "0",
            overflow: "hidden",
            transition: "max-height 0.3s ease",
            marginBottom: hovered ? "1rem" : "0",
          }}
        >
          {description}
        </p>

        {/* CTA row — primary card gets a solid button, others get text link */}
        <div
          className="flex items-center gap-3 transition-opacity duration-300"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {isPrimary ? (
            <a
              href="/quote"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                zIndex: 20,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                backgroundColor: "#E07B2A",
                color: "#121212",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "0.55rem 1rem",
                borderRadius: "2px",
                textDecoration: "none",
                transition: "background-color 0.15s ease, transform 0.15s ease",
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#c96e24";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#E07B2A";
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              }}
            >
              Get a Free Estimate <ArrowRight size={12} />
            </a>
          ) : (
            <div
              className="flex items-center gap-2"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 500,
                fontSize: "0.8rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#E07B2A",
              }}
            >
              Learn More <ArrowRight size={14} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" style={{ backgroundColor: "#121212", paddingTop: "6rem", paddingBottom: "6rem" }}>
      <div className="container">
        {/* Header */}
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            marginBottom: "3rem",
          }}
        >
          <div className="section-label mb-4">What We Offer</div>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
              }}
            >
              Forestry Mulching &amp; Land Management in Tennessee
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.65)",
                maxWidth: "480px",
              }}
            >
              Whether you need land management, forestry mulching, or vegetation
              management, Noland Earthworks has the expertise and equipment to
              handle your project efficiently and professionally.
            </p>
          </div>
        </div>

        {/* 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <ServiceCard key={s.title} {...s} index={i} isPrimary={s.title === "Forestry Mulching"} />
          ))}
        </div>

        {/* Add-On Services */}
        <div style={{ marginTop: "3rem" }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif", fontWeight: 600,
            fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(240,237,230,0.4)", marginBottom: "1rem",
          }}>
            Add-On Services
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: "Fence Line Clearing", desc: "Reclaim overgrown boundaries — priced per linear foot, same mobilization.", href: "/services/fence-line-clearing" },
              { title: "Mulch Redistribution", desc: "Uniform mulch finish after forestry mulching — drainage channels, buffers, bare spots.", href: "/services/mulch-redistribution" },
              { title: "Selective Clearing", desc: "Pre-job walkthrough to flag trees for preservation and mark clearing boundaries.", href: "/services/selective-clearing" },
            ].map((addon) => (
              <a
                key={addon.title}
                href={addon.href}
                style={{
                  display: "block", padding: "1.1rem 1.25rem",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "4px", textDecoration: "none",
                  transition: "border-color 0.2s ease, background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(224,123,42,0.45)";
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(224,123,42,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.03)";
                }}
              >
                <div style={{
                  fontFamily: "'Oswald', sans-serif", fontWeight: 600,
                  fontSize: "0.95rem", letterSpacing: "0.04em", textTransform: "uppercase",
                  color: "#F0EDE6", marginBottom: "0.4rem",
                }}>
                  {addon.title}
                </div>
                <p style={{
                  fontFamily: "'Lato', sans-serif", fontSize: "0.8rem",
                  lineHeight: 1.55, color: "rgba(240,237,230,0.55)", margin: 0,
                }}>
                  {addon.desc}
                </p>
                <div style={{
                  marginTop: "0.65rem",
                  fontFamily: "'Oswald', sans-serif", fontWeight: 500,
                  fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase",
                  color: "#E07B2A",
                }}>
                  Learn More
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
