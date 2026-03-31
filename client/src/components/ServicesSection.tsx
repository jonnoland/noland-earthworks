/*
 * DESIGN: Heavy Equipment Grit — 2x2 card grid with image backgrounds, hover reveal
 * Dark cards with amber accent borders on hover
 */
import { ArrowRight } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const LAND_CLEARING = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_MULCHING = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_MGMT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const PROPERTY_MAINT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const services = [
  {
    title: "Land Clearing",
    href: "/services/land-clearing",
    description:
      "Professional land clearing services for residential and commercial properties. We safely remove trees, brush, stumps, and debris to prepare your land for development, agriculture, or landscaping.",
    image: LAND_CLEARING,
  },
  {
    title: "Forestry Mulching",
    href: "/services/forestry-mulching",
    description:
      "Efficient forestry mulching that grinds trees and vegetation into mulch on-site. Perfect for land management, fire prevention, and creating usable space without the mess of traditional clearing.",
    image: FORESTRY_MULCHING,
  },
  {
    title: "Vegetation Management",
    href: "/services/vegetation-management",
    description:
      "Strategic vegetation management to maintain property aesthetics, prevent overgrowth, and manage invasive species. Tailored solutions for your specific land management needs.",
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

function ServiceCard({ title, description, image, href, index }: {
  title: string; description: string; image: string; href: string; index: number;
}) {
  const [hovered, setHovered] = useState(false);
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
        border: hovered ? "1px solid rgba(224,123,42,0.6)" : "1px solid rgba(255,255,255,0.06)",
        cursor: "default",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Clickable overlay */}
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
            ? "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 60%, rgba(10,10,10,0.2) 100%)"
            : "linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.45) 60%, rgba(10,10,10,0.15) 100%)",
        }}
      />

      {/* Amber top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 transition-opacity duration-300"
        style={{
          backgroundColor: "#E07B2A",
          opacity: hovered ? 1 : 0,
        }}
      />

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
        <div
          className="flex items-center gap-2 transition-opacity duration-300"
          style={{
            opacity: hovered ? 1 : 0,
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
              Our Services
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
              Whether you need land clearing, forestry mulching, or vegetation
              management, Noland Earthworks has the expertise and equipment to
              handle your project efficiently and professionally.
            </p>
          </div>
        </div>

        {/* 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <ServiceCard key={s.title} {...s} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
