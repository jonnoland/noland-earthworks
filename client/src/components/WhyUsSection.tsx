/*
 * DESIGN: Heavy Equipment Grit — dark forest background, 3-column feature grid
 * Amber icon accents, staggered entrance animations
 */
import { Clock, Shield, Wrench, FileText, Star, Tag } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const features = [
  {
    icon: <Clock size={28} />,
    title: "On-Time Delivery",
    description:
      "We respect your schedule. Our crews show up when promised and complete projects on time.",
  },
  {
    icon: <Shield size={28} />,
    title: "Fully Licensed & Insured",
    description:
      "Complete peace of mind — Noland Earthworks carries full liability insurance and all required licenses.",
  },
  {
    icon: <Wrench size={28} />,
    title: "Experienced Operators",
    description:
      "Our operators bring years of hands-on experience with a wide range of earthmoving equipment.",
  },
  {
    icon: <FileText size={28} />,
    title: "Free, Detailed Quotes",
    description:
      "No surprises. We provide clear, itemized quotes so you know exactly what you're getting.",
  },
  {
    icon: <Star size={28} />,
    title: "10% Military Discount",
    description:
      "We honor those who serve. Active duty, veterans, and military families receive a 10% discount on all services.",
  },
  {
    icon: <Tag size={28} />,
    title: "5% Multi-Service Discount",
    description:
      "Bundle multiple services and save. Combine land clearing, forestry mulching, and vegetation management for 5% off.",
  },
];

function FeatureCard({ icon, title, description, index }: {
  icon: React.ReactNode; title: string; description: string; index: number;
}) {
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
      className="p-6"
      style={{
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
      }}
    >
      {/* Icon */}
      <div
        className="mb-4 inline-flex items-center justify-center w-12 h-12"
        style={{
          backgroundColor: "rgba(224,123,42,0.12)",
          color: "#E07B2A",
          border: "1px solid rgba(224,123,42,0.25)",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 600,
          fontSize: "1.125rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#F0EDE6",
          marginBottom: "0.625rem",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          fontSize: "0.9rem",
          lineHeight: 1.65,
          color: "rgba(240,237,230,0.65)",
        }}
      >
        {description}
      </p>
    </div>
  );
}

export default function WhyUsSection() {
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
    <section
      id="why-us"
      style={{
        backgroundColor: "#0F1A0F",
        paddingTop: "6rem",
        paddingBottom: "6rem",
        borderTop: "1px solid rgba(224,123,42,0.15)",
        borderBottom: "1px solid rgba(224,123,42,0.15)",
      }}
    >
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
          <div className="section-label mb-4">Our Commitment</div>
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
            Why Choose Noland Earthworks
          </h2>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
