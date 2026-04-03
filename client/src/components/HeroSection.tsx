/*
 * DESIGN: Heavy Equipment Grit — full-bleed hero with background image
 * Dark overlay, left-aligned headline in Oswald, amber CTA, badge row
 */
import { ArrowRight, ChevronDown, FileText, MapPin, Star } from "lucide-react";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/hero-forestry-golden_b098141c.webp";

export default function HeroSection() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(105deg, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.65) 50%, rgba(10,10,10,0.3) 100%)",
        }}
      />
      {/* Bottom fade for transition */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, #121212)",
        }}
      />

      {/* Amber left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: "#E07B2A" }}
      />

      <div className="container relative z-10 pt-24 pb-16">
        <div className="max-w-3xl">
          {/* Main headline */}
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.75rem, 7vw, 5.5rem)",
              lineHeight: 1.0,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "1.5rem",
            }}
          >
            Professional
            <br />
            <span style={{ color: "#E07B2A" }}>Land Services</span>
            <br />
            For Middle & West Tennessee.
          </h1>

          {/* Body copy */}
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              lineHeight: 1.7,
              color: "rgba(240,237,230,0.8)",
              maxWidth: "540px",
              marginBottom: "2.5rem",
            }}
          >
            Noland Earthworks is a veteran-owned and operated company specializing
            in land clearing, forestry mulching, and vegetation management. We
            deliver professional, reliable service with the work ethic and
            integrity you deserve.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 mb-12">
            <a
              href="/quote"
              className="btn-amber"
              style={{ textDecoration: "none" }}
            >
              Schedule a Free Quote
              <ArrowRight size={16} />
            </a>
            <button
              onClick={() => scrollTo("#services")}
              className="btn-ghost"
            >
              Our Services
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-6">
            {[
              { icon: <Star size={16} />, label: "Veteran-Owned" },
              { icon: <FileText size={16} />, label: "Free Estimates" },
              { icon: <MapPin size={16} />, label: "Serving Middle TN" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-2"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "rgba(240,237,230,0.85)",
                  letterSpacing: "0.04em",
                }}
              >
                <span style={{ color: "#E07B2A" }}>{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => scrollTo("#stats")}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: "#F0EDE6" }}
        aria-label="Scroll down"
      >
        <ChevronDown size={24} className="animate-bounce" />
      </button>
    </section>
  );
}
