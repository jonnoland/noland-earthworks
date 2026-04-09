/*
 * DESIGN: Heavy Equipment Grit — sticky dark nav with real logo, amber CTA
 * NOTE: Uses plain <a> tags (not wouter Link) to avoid nested anchor issues.
 * wouter Link renders as <a> itself, so wrapping another <a> inside causes errors.
 */
import { useState, useEffect } from "react";
import { Menu, X, Phone, ChevronDown } from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png";

const serviceLinks = [
  { label: "Land Clearing", href: "/services/land-clearing" },
  { label: "Forestry Mulching", href: "/services/forestry-mulching" },
  { label: "Vegetation Management", href: "/services/vegetation-management" },
  { label: "Right-of-Way Clearing", href: "/services/right-of-way-clearing" },
  { label: "Property Maintenance", href: "/services/property-maintenance" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHome = () => window.location.pathname === "/";

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    if (isHome()) {
      const el = document.querySelector(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = `/${id}`;
    }
  };

  const navLinks = [
    { label: "Why Us", id: "#why-us" },
    { label: "Testimonials", id: "#testimonials" },
    { label: "Service Areas", id: "#service-areas" },
  ];

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
        <div className="flex items-center justify-between h-24 lg:h-28">

          {/* Logo — plain <a> to avoid nested anchor */}
          <a
            href="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
          >
            <img
              src={LOGO_URL}
              alt="Noland Earthworks — Built on American Strength"
              style={{ height: "104px", width: "auto", objectFit: "contain", filter: "brightness(1.05)" }}
            />
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {/* Services dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button
                className="nav-link flex items-center gap-1"
                onClick={() => setServicesOpen(!servicesOpen)}
              >
                Services <ChevronDown size={13} style={{ opacity: 0.7 }} />
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-0 pt-2" style={{ minWidth: "220px", zIndex: 100 }}>
                  <div
                    style={{
                      backgroundColor: "rgba(18,18,18,0.98)",
                      border: "1px solid rgba(224,123,42,0.2)",
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    {serviceLinks.map((s) => (
                      <a
                        key={s.href}
                        href={s.href}
                        className="block px-4 py-3 transition-colors duration-150"
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontWeight: 400,
                          fontSize: "0.875rem",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(240,237,230,0.75)",
                          textDecoration: "none",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#E07B2A";
                          e.currentTarget.style.backgroundColor = "rgba(224,123,42,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgba(240,237,230,0.75)";
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {navLinks.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="nav-link">
                {l.label}
              </button>
            ))}
            <a
              href="/pricing"
              className="nav-link"
              style={{ textDecoration: "none" }}
            >
              Pricing
            </a>
            <a
              href="/about"
              className="nav-link"
              style={{ textDecoration: "none" }}
            >
              About Us
            </a>
            <a
              href="/gallery"
              className="nav-link"
              style={{ textDecoration: "none" }}
            >
              Gallery
            </a>
            <a
              href="/blog"
              className="nav-link"
              style={{ textDecoration: "none" }}
            >
              Resources
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:6154064819"
              style={{
                fontFamily: "'Lato', sans-serif",
                color: "rgba(240,237,230,0.75)",
                letterSpacing: "0.04em",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <Phone size={14} style={{ color: "#E07B2A" }} />
              615-406-4819
            </a>
            <a
              href="/quote"
              className="btn-amber"
              style={{ padding: "0.5rem 1.25rem", textDecoration: "none" }}
            >
              Get a Quote
            </a>
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
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.65rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#E07B2A",
                padding: "0.5rem 0.5rem 0.25rem",
              }}
            >
              Services
            </div>
            {serviceLinks.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="block py-2 px-4"
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.875rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(240,237,230,0.75)",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {s.label}
              </a>
            ))}

            {navLinks.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-left py-3 px-2 nav-link"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                {l.label}
              </button>
            ))}
            <a
              href="/pricing"
              className="text-left py-3 px-2 nav-link block"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}
            >
              Pricing
            </a>
            <a
              href="/about"
              className="text-left py-3 px-2 nav-link block"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}
            >
              About Us
            </a>
            <a
              href="/gallery"
              className="text-left py-3 px-2 nav-link block"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}
            >
              Gallery
            </a>
            <a
              href="/blog"
              className="text-left py-3 px-2 nav-link block"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}
            >
              Resources
            </a>

            <div className="pt-4 flex flex-col gap-3">
              <a
                href="tel:6154064819"
                style={{
                  color: "rgba(240,237,230,0.75)",
                  fontFamily: "'Lato', sans-serif",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Phone size={14} style={{ color: "#E07B2A" }} />
                615-406-4819
              </a>
              <a
                href="/quote"
                className="btn-amber w-full justify-center"
                style={{ textDecoration: "none" }}
              >
                Get a Free Quote
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
