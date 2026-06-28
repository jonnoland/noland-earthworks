/*
 * DESIGN: Heavy Equipment Grit — dark section with amber-accented quote form
 * Left: contact info + CTA. Right: form with dark inputs.
 */
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { useRef, useEffect, useState } from "react";

export default function ContactSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", service: "", message: "",
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#F0EDE6",
    fontFamily: "'Lato', sans-serif",
    fontWeight: 400,
    fontSize: "0.9375rem",
    padding: "0.75rem 1rem",
    outline: "none",
    transition: "border-color 0.2s ease",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Oswald', sans-serif",
    fontWeight: 400,
    fontSize: "0.75rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "rgba(240,237,230,0.55)",
    display: "block",
    marginBottom: "0.375rem",
  };

  return (
    <section
      id="contact"
      ref={ref}
      style={{
        backgroundColor: "#121212",
        paddingTop: "6rem",
        paddingBottom: "6rem",
        borderTop: "1px solid rgba(224,123,42,0.15)",
      }}
    >
      <div className="container">
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <div className="section-label mb-4">Get in Touch</div>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "3rem",
            }}
          >
            Schedule a Free Quote
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left: Contact info */}
          <div
            className="lg:col-span-2"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(-24px)",
              transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
            }}
          >
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "1rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.65)",
                marginBottom: "2.5rem",
              }}
            >
              Ready to transform your land? Contact us today for a free,
              no-obligation quote. We respond within 24 hours.
            </p>

            <div className="flex flex-col gap-5">
              {[
                { icon: <Phone size={18} />, label: "Phone", value: "615-406-4819", href: "tel:6154064819" },
                { icon: <Mail size={18} />, label: "Email", value: "info@nolandearthworks.com", href: "mailto:info@nolandearthworks.com" },
                { icon: <MapPin size={18} />, label: "Service Area", value: "Middle & West Tennessee (35 Counties)", href: "#service-areas" },
              ].map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  className="flex items-start gap-4 group"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: "rgba(224,123,42,0.12)",
                      border: "1px solid rgba(224,123,42,0.25)",
                      color: "#E07B2A",
                    }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.7rem",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "rgba(240,237,230,0.4)",
                        marginBottom: "0.125rem",
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.9375rem",
                        color: "rgba(240,237,230,0.85)",
                        transition: "color 0.2s ease",
                      }}
                    >
                      {c.value}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Veteran badge */}
            <div
              className="mt-8 p-4 flex items-center gap-3"
              style={{
                backgroundColor: "rgba(224,123,42,0.08)",
                border: "1px solid rgba(224,123,42,0.2)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: "2rem",
                  color: "#E07B2A",
                  lineHeight: 1,
                }}
              >
                ★
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#F0EDE6",
                  }}
                >
                  Veteran-Owned &amp; Operated
                </div>
                <div
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.8rem",
                    color: "rgba(240,237,230,0.55)",
                  }}
                >
                  10% discount for active duty &amp; veterans
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div
            className="lg:col-span-3"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(24px)",
              transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
            }}
          >
            {submitted ? (
              <div
                className="flex flex-col items-center justify-center text-center p-12"
                style={{
                  backgroundColor: "rgba(224,123,42,0.08)",
                  border: "1px solid rgba(224,123,42,0.3)",
                  minHeight: "400px",
                }}
              >
                <div
                  style={{
                    fontSize: "3rem",
                    color: "#E07B2A",
                    marginBottom: "1rem",
                  }}
                >
                  ✓
                </div>
                <h3
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.75rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#F0EDE6",
                    marginBottom: "0.75rem",
                  }}
                >
                  Quote Request Received!
                </h3>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "1rem",
                    color: "rgba(240,237,230,0.65)",
                    maxWidth: "360px",
                  }}
                >
                  We'll review your request and get back to you within 24 hours
                  with a detailed, no-obligation quote.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="John Smith"
                      value={form.name}
                      onChange={handleChange}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number *</label>
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="(615) 555-0123"
                      value={form.phone}
                      onChange={handleChange}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Service Needed *</label>
                  <select
                    name="service"
                    required
                    value={form.service}
                    onChange={handleChange}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select a service...</option>
                    <option value="land-management" style={{ backgroundColor: "#1a1a1a" }}>Land Management</option>
                    <option value="forestry-mulching" style={{ backgroundColor: "#1a1a1a" }}>Forestry Mulching</option>
                    <option value="vegetation-management" style={{ backgroundColor: "#1a1a1a" }}>Vegetation Management</option>
                    <option value="property-maintenance" style={{ backgroundColor: "#1a1a1a" }}>Property Maintenance</option>
                    <option value="multiple" style={{ backgroundColor: "#1a1a1a" }}>Multiple Services</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Project Details</label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Describe your property, acreage, and what you need done..."
                    value={form.message}
                    onChange={handleChange}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-amber w-full justify-center"
                  style={{ fontSize: "1rem" }}
                >
                  <Send size={16} />
                  Send Quote Request
                </button>

                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.8rem",
                    color: "rgba(240,237,230,0.4)",
                    textAlign: "center",
                  }}
                >
                  We respond within 24 hours. No obligation, no pressure.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
