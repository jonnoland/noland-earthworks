/*
 * DESIGN: Heavy Equipment Grit — dark section with amber star ratings
 * Horizontal scroll cards on mobile, 3-column on desktop
 */
import { useRef, useEffect, useState } from "react";

const testimonials = [
  {
    source: "Google",
    quote:
      "Noland Earthworks cleared our overgrown land in a single day. Professional, efficient, and they left the property spotless. Highly recommend their forestry mulching service.",
    name: "James M.",
    role: "Property Owner",
    initial: "J",
  },
  {
    source: "Facebook",
    quote:
      "Working with a veteran-owned company that takes pride in their work makes all the difference. They completed our land preparation in one day, perfectly and within budget.",
    name: "Sarah K.",
    role: "Real Estate Developer",
    initial: "S",
  },
  {
    source: "Google",
    quote:
      "Great service and fair pricing. They cleared my property and removed all the debris. The team was professional and courteous throughout the entire project.",
    name: "Tom R.",
    role: "Homeowner",
    initial: "T",
  },
  {
    source: "Facebook",
    quote:
      "Excellent work on our commercial property. The team completed the clearing in a single day, was punctual, professional, and delivered exactly what we needed. Will definitely hire again!",
    name: "Michael D.",
    role: "Commercial Property Manager",
    initial: "M",
  },
  {
    source: "Google",
    quote:
      "Outstanding service! The crew cleared our property, was respectful, and completed the work ahead of schedule. Highly satisfied with the results.",
    name: "Jennifer L.",
    role: "Homeowner",
    initial: "J",
  },
];

function SourceBadge({ source }: { source: string }) {
  const isGoogle = source === "Google";
  return (
    <span
      style={{
        fontFamily: "'Lato', sans-serif",
        fontWeight: 700,
        fontSize: "0.65rem",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: isGoogle ? "#4285F4" : "#1877F2",
        backgroundColor: isGoogle ? "rgba(66,133,244,0.1)" : "rgba(24,119,242,0.1)",
        border: `1px solid ${isGoogle ? "rgba(66,133,244,0.25)" : "rgba(24,119,242,0.25)"}`,
        padding: "2px 8px",
        display: "inline-block",
      }}
    >
      {source} Review
    </span>
  );
}

function TestimonialCard({ source, quote, name, role, initial, index }: {
  source: string; quote: string; name: string; role: string; initial: string; index: number;
}) {
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
    <div
      ref={ref}
      className="flex flex-col p-6"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`,
        minHeight: "280px",
      }}
    >
      {/* Source badge */}
      <div className="mb-4">
        <SourceBadge source={source} />
      </div>

      {/* Stars */}
      <div className="stars mb-4" style={{ fontSize: "1rem" }}>★★★★★</div>

      {/* Quote */}
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.9375rem",
          lineHeight: 1.7,
          color: "rgba(240,237,230,0.8)",
          fontStyle: "italic",
          flex: 1,
          marginBottom: "1.5rem",
        }}
      >
        "{quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 flex-shrink-0"
          style={{
            backgroundColor: "#E07B2A",
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: "#fff",
          }}
        >
          {initial}
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.04em",
              color: "#F0EDE6",
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 400,
              fontSize: "0.75rem",
              color: "rgba(240,237,230,0.5)",
              letterSpacing: "0.06em",
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
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
    <section id="testimonials" style={{ backgroundColor: "#121212", paddingTop: "6rem", paddingBottom: "6rem" }}>
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
          <div className="section-label mb-4">Client Reviews</div>
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
            What Our Clients Say
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <TestimonialCard key={t.name} {...t} index={i} />
          ))}
        </div>

        {/* Google Review CTA */}
        <div
          style={{
            marginTop: "3rem",
            padding: "2rem 2.5rem",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                marginBottom: "0.35rem",
              }}
            >
              Happy with our work?
            </div>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.9rem",
                color: "rgba(240,237,230,0.6)",
                margin: 0,
              }}
            >
              Your Google review helps other property owners find us and means the world to our team.
            </p>
          </div>
          <a
            href="https://g.page/r/CcglMAMbtQInEBM/review"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.6rem",
              backgroundColor: "#E07B2A",
              color: "#fff",
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.85rem 1.75rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Leave a Google Review
          </a>
        </div>
      </div>
    </section>
  );
}
