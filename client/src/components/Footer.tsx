/*
 * DESIGN: Heavy Equipment Grit — dark footer with amber accents
 * Company info, contact, social links, legal
 */
import { Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react";

export default function Footer() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer
      style={{
        backgroundColor: "#0a0a0a",
        borderTop: "1px solid rgba(224,123,42,0.25)",
      }}
    >
      {/* Main footer content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand column */}
          <div>
            <div className="mb-4">
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#F0EDE6",
                }}
              >
                Noland Earthworks
              </div>
              <div
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#E07B2A",
                }}
              >
                Forestry Mulching &amp; Site Services
              </div>
            </div>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.875rem",
                lineHeight: 1.65,
                color: "rgba(240,237,230,0.5)",
                marginBottom: "1.5rem",
              }}
            >
              Veteran-owned and operated land clearing and forestry mulching
              services for Middle Tennessee. Licensed &amp; Insured.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {[
                { icon: <Facebook size={16} />, href: "https://facebook.com", label: "Facebook" },
                { icon: <Instagram size={16} />, href: "https://instagram.com", label: "Instagram" },
                { icon: <Youtube size={16} />, href: "https://youtube.com", label: "YouTube" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow us on ${s.label}`}
                  className="flex items-center justify-center w-9 h-9 transition-all duration-200"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(240,237,230,0.6)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(224,123,42,0.15)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.4)";
                    (e.currentTarget as HTMLElement).style.color = "#E07B2A";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.6)";
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
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
              Quick Links
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Services", href: "/#services" },
                { label: "Why Choose Us", href: "/#why-us" },
                { label: "Testimonials", href: "/#testimonials" },
                { label: "Service Areas", href: "/#service-areas" },
                { label: "Get a Quote", href: "/quote" },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-left transition-colors duration-200"
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 400,
                    fontSize: "0.875rem",
                    color: "rgba(240,237,230,0.55)",
                    textDecoration: "none",
                    display: "block",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#E07B2A";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.55)";
                  }}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact info */}
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
              Contact
            </div>
            <div className="flex flex-col gap-4">
              <a
                href="tel:6154064819"
                className="flex items-center gap-3"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.9375rem",
                  color: "rgba(240,237,230,0.75)",
                  textDecoration: "none",
                }}
              >
                <Phone size={15} style={{ color: "#E07B2A", flexShrink: 0 }} />
                615-406-4819
              </a>
              <a
                href="mailto:quotes@nolandearthworks.com"
                className="flex items-center gap-3"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.875rem",
                  color: "rgba(240,237,230,0.75)",
                  textDecoration: "none",
                  wordBreak: "break-all",
                }}
              >
                <Mail size={15} style={{ color: "#E07B2A", flexShrink: 0 }} />
                quotes@nolandearthworks.com
              </a>
            </div>

            <a
              href="/quote"
              className="btn-amber mt-6"
              style={{ fontSize: "0.875rem", padding: "0.625rem 1.5rem", textDecoration: "none" }}
            >
              Get a Free Quote
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "1.25rem 0",
        }}
      >
        <div
          className="container flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.75rem",
              color: "rgba(240,237,230,0.35)",
              letterSpacing: "0.04em",
            }}
          >
            © 2026 Noland Earthworks, LLC. All rights reserved. Licensed &amp; Insured.
          </p>
          <div className="flex gap-4">
            {["Terms of Service", "Privacy Policy"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.75rem",
                  color: "rgba(240,237,230,0.35)",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
