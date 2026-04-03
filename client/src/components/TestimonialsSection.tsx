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
      </div>
    </section>
  );
}
