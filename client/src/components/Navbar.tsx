/*
 * DESIGN: Heavy Equipment Grit — sticky dark nav with amber CTA, Oswald font
 * Behavior: transparent on hero, solid on scroll; mobile hamburger menu
 */
import { useState, useEffect } from "react";
import { Menu, X, Phone } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Services", href: "#services" },
    { label: "Why Us", href: "#why-us" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Service Areas", href: "#service-areas" },
  ];

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(18, 18, 18, 0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(224,123,42,0.2)" : "none",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="flex flex-col leading-none"
          >
            <span
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
            </span>
            <span
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
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="nav-link"
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:6154064819"
              className="flex items-center gap-2 text-sm"
              style={{
                fontFamily: "'Lato', sans-serif",
                color: "rgba(240,237,230,0.75)",
                letterSpacing: "0.04em",
              }}
            >
              <Phone size={14} style={{ color: "#E07B2A" }} />
              615-406-4819
            </a>
            <button
              onClick={() => scrollTo("#contact")}
              className="btn-amber text-sm"
              style={{ padding: "0.5rem 1.25rem" }}
            >
              Get a Quote
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: "#F0EDE6" }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          style={{
            backgroundColor: "rgba(18,18,18,0.98)",
            borderTop: "1px solid rgba(224,123,42,0.2)",
          }}
        >
          <div className="container py-4 flex flex-col gap-1">
            {links.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className="text-left py-3 px-2 nav-link border-b"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {l.label}
              </button>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <a
                href="tel:6154064819"
                className="flex items-center gap-2"
                style={{ color: "rgba(240,237,230,0.75)", fontFamily: "'Lato', sans-serif" }}
              >
                <Phone size={14} style={{ color: "#E07B2A" }} />
                615-406-4819
              </a>
              <button
                onClick={() => scrollTo("#contact")}
                className="btn-amber w-full justify-center"
              >
                Get a Free Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
