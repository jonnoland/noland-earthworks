/*
 * DESIGN: Heavy Equipment Grit — add-on services visual guide
 * Four cards, each showing the add-on name, when to add it, and the key benefit.
 * Sits below ServicesSection on the homepage.
 */
import { useRef, useEffect, useState } from "react";
import { ArrowRight, Sprout, Fence, Layers, TreePine } from "lucide-react";

const addOns = [
  {
    icon: Sprout,
    title: "Post-Clear Seeding",
    subtitle: "Erosion Control & Ground Cover",
    when: "After any land clearing or forestry mulching job",
    benefit:
      "Bare ground erodes. Seeding immediately after clearing locks the soil in place, prevents runoff, and starts the land on the right path — whether that's pasture, wildlife habitat, or a clean buffer zone.",
    cta: "Add to your quote",
    href: "/quote?service=land-clearing",
    accentColor: "#4a7c59",
    accentLight: "rgba(74,124,89,0.12)",
    accentBorder: "rgba(74,124,89,0.3)",
  },
  {
    icon: Fence,
    title: "Fence Line Clearing",
    subtitle: "Boundary Reclamation",
    when: "Alongside any land clearing or pasture reclamation job",
    benefit:
      "Same machine, same mobilization, same day. Fence lines that haven't seen daylight in years get cleared while we're already on-site. Priced per linear foot — no second trip charge.",
    cta: "Add to your quote",
    href: "/quote?service=land-clearing",
    accentColor: "#8B6914",
    accentLight: "rgba(139,105,20,0.12)",
    accentBorder: "rgba(139,105,20,0.3)",
  },
  {
    icon: Layers,
    title: "Mulch Redistribution",
    subtitle: "Finished Ground Cover",
    when: "After forestry mulching, when a clean uniform finish matters",
    benefit:
      "Forestry mulching leaves a natural mulch layer on the ground. Redistribution concentrates it where it does the most work — drainage channels, tree buffers, bare spots — and leaves the property looking intentional, not just cleared.",
    cta: "Add to your quote",
    href: "/quote?service=forestry-mulching",
    accentColor: "#7B4F2E",
    accentLight: "rgba(123,79,46,0.12)",
    accentBorder: "rgba(123,79,46,0.3)",
  },
  {
    icon: TreePine,
    title: "Selective Clearing",
    subtitle: "Tree Preservation Consultation",
    when: "Before any job where specific trees or boundaries need protection",
    benefit:
      "Walk the property before work starts, flag the keepers, mark the clearing boundary. Protects valuable hardwoods, prevents scope disputes, and ensures the finished property matches your vision. Consultation fee credited toward the job.",
    cta: "Add to your quote",
    href: "/quote?service=land-clearing",
    accentColor: "#2E5E4E",
    accentLight: "rgba(46,94,78,0.12)",
    accentBorder: "rgba(46,94,78,0.3)",
  },
];

function AddOnCard({
  icon: Icon,
  title,
  subtitle,
  when,
  benefit,
  cta,
  href,
  accentColor,
  accentLight,
  accentBorder,
  index,
}: (typeof addOns)[0] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
        backgroundColor: hovered ? accentLight : "rgba(255,255,255,0.02)",
        border: hovered ? `1px solid ${accentBorder}` : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "6px",
        padding: "1.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",

      }}
    >
      {/* Icon + title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "6px",
            backgroundColor: accentLight,
            border: `1px solid ${accentBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "1.05rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              color: accentColor,
              marginTop: "0.2rem",
              letterSpacing: "0.04em",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      {/* When to add it */}
      <div>
        <div
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: "0.6rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "rgba(240,237,230,0.35)",
            marginBottom: "0.3rem",
          }}
        >
          When to add it
        </div>
        <div
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8rem",
            color: "rgba(240,237,230,0.6)",
            lineHeight: 1.5,
          }}
        >
          {when}
        </div>
      </div>

      {/* Benefit */}
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.875rem",
          lineHeight: 1.65,
          color: "rgba(240,237,230,0.75)",
          margin: 0,
          flex: 1,
        }}
      >
        {benefit}
      </p>

      {/* CTA */}
      <a
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 500,
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: accentColor,
          textDecoration: "none",
          marginTop: "auto",
        }}
      >
        {cta} <ArrowRight size={13} />
      </a>
    </div>
  );
}

export default function AddOnGuideSection() {
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHeaderVisible(true); },
      { threshold: 0.1 }
    );
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      style={{
        backgroundColor: "#0e0e0e",
        paddingTop: "5rem",
        paddingBottom: "5.5rem",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="container">
        {/* Header */}
        <div
          ref={headerRef}
          style={{
            opacity: headerVisible ? 1 : 0,
            transform: headerVisible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            marginBottom: "3rem",
          }}
        >
          <div className="section-label mb-4">Add-On Services</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
            className="lg:flex-row lg:items-end lg:justify-between"
          >
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                maxWidth: "520px",
              }}
            >
              Get More From Every Job
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.6)",
                maxWidth: "440px",
              }}
            >
              These services are most cost-effective when added to an existing
              job — same mobilization, no second trip. Each one is designed to
              complete the work, not extend it.
            </p>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {addOns.map((addon, i) => (
            <AddOnCard key={addon.title} {...addon} index={i} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: "2.5rem",
            textAlign: "center",
          }}
        >
          <a
            href="/quote"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.8rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.5)",
              textDecoration: "none",
            }}
          >
            Include any of these on your quote request <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
