/*
 * DESIGN: Heavy Equipment Grit — standalone quote page
 * Hero banner → two-column layout: contact info left, full form right
 */
import { useState } from "react";
import { Phone, Mail, MapPin, Send, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";

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
  textTransform: "uppercase" as const,
  color: "rgba(240,237,230,0.55)",
  display: "block",
  marginBottom: "0.375rem",
};

export default function QuotePage() {
  usePageTitle("Request a Free Quote — Land Clearing & Forestry Mulching");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", service: "",
    county: "", acreage: "",
    street: "", city: "", state: "TN", zip: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitQuote = trpc.quote.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setSubmitError(null);
    },
    onError: (err) => {
      setSubmitError(
        err.message || "Something went wrong. Please try again or call us directly at 615-406-4819."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    submitQuote.mutate({
      name: form.name,
      phone: form.phone,
      email: form.email || "(not provided)",
      service: form.service,
      county: form.county || "(not specified)",
      acreage: form.acreage,
      street: form.street,
      city: form.city,
      state: form.state || "TN",
      zip: form.zip,
      message: form.message,
    });
  };

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* ── HERO BANNER ── */}
      <section
        className="relative flex items-end"
        style={{
          minHeight: "38vh",
          background: "linear-gradient(135deg, #0d1a0d 0%, #1a1a0a 50%, #1a0d00 100%)",
          overflow: "hidden",
        }}
      >
        {/* Amber left accent bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: "#E07B2A" }}
        />
        {/* Decorative diagonal stripe */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(224,123,42,0.03) 40px, rgba(224,123,42,0.03) 41px)",
          }}
        />
        <div className="container relative z-10 pb-12 pt-32">
          <a
            href="/"
            className="inline-flex items-center gap-2 mb-6"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.5)",
              textDecoration: "none",
              transition: "color 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#E07B2A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(240,237,230,0.5)")}
          >
            <ArrowLeft size={14} /> Back to Home
          </a>
          <div
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#E07B2A",
              marginBottom: "0.75rem",
            }}
          >
            Free Estimate — No Obligation
          </div>
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: 1.0,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: "#F0EDE6",
            }}
          >
            Get Your <span style={{ color: "#E07B2A" }}>Free Quote</span>
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              color: "rgba(240,237,230,0.7)",
              marginTop: "0.75rem",
              maxWidth: "540px",
            }}
          >
            Tell us about your project and we'll respond within 24 hours with a
            detailed, no-obligation estimate.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section style={{ paddingTop: "5rem", paddingBottom: "6rem" }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* ── LEFT: Contact info ── */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Contact cards */}
              <div className="flex flex-col gap-4">
                {[
                  {
                    icon: <Phone size={20} />,
                    label: "Call or Text",
                    value: "615-406-4819",
                    sub: "Mon–Sat, 7am–6pm",
                    href: "tel:6154064819",
                  },
                  {
                    icon: <Mail size={20} />,
                    label: "Email Us",
                    value: "quotes@nolandearthworks.com",
                    sub: "We respond within 24 hours",
                    href: "mailto:quotes@nolandearthworks.com",
                  },
                  {
                    icon: <MapPin size={20} />,
                    label: "Service Area",
                    value: "Middle Tennessee",
                    sub: "17 counties — free on-site estimates",
                    href: "/#service-areas",
                  },
                ].map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    className="flex items-start gap-4 p-4"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      textDecoration: "none",
                      transition: "border-color 0.2s ease, background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "rgba(224,123,42,0.4)";
                      e.currentTarget.style.backgroundColor = "rgba(224,123,42,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 flex-shrink-0"
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
                          fontSize: "0.65rem",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "rgba(240,237,230,0.4)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {c.label}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 500,
                          fontSize: "0.9375rem",
                          color: "#F0EDE6",
                          marginBottom: "0.15rem",
                        }}
                      >
                        {c.value}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 300,
                          fontSize: "0.8rem",
                          color: "rgba(240,237,230,0.45)",
                        }}
                      >
                        {c.sub}
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* What to expect */}
              <div
                style={{
                  backgroundColor: "rgba(224,123,42,0.06)",
                  border: "1px solid rgba(224,123,42,0.2)",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    marginBottom: "1rem",
                  }}
                >
                  What Happens Next
                </div>
                {[
                  "We review your request within 24 hours",
                  "We schedule a free on-site visit",
                  "You receive a detailed written estimate",
                  "No pressure, no obligation — ever",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 mb-3">
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "#E07B2A",
                        flexShrink: 0,
                        width: "1.25rem",
                      }}
                    >
                      {i + 1}.
                    </div>
                    <span
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 300,
                        fontSize: "0.875rem",
                        color: "rgba(240,237,230,0.75)",
                        lineHeight: 1.5,
                      }}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              {/* Veteran badge */}
              <div
                className="flex items-center gap-3 p-4"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "2.5rem",
                    color: "#E07B2A",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ★
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      letterSpacing: "0.06em",
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
                      color: "rgba(240,237,230,0.5)",
                    }}
                  >
                    10% discount for active duty &amp; veterans — mention it in your request
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Form ── */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div
                  className="flex flex-col items-center justify-center text-center p-12"
                  style={{
                    backgroundColor: "rgba(224,123,42,0.06)",
                    border: "1px solid rgba(224,123,42,0.3)",
                    minHeight: "480px",
                  }}
                >
                  <CheckCircle size={56} style={{ color: "#E07B2A", marginBottom: "1.5rem" }} />
                  <h2
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.75rem",
                      letterSpacing: "0.02em",
                      textTransform: "none",
                      color: "#F0EDE6",
                      marginBottom: "1rem",
                    }}
                  >
                    Quote Request Received
                  </h2>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "1rem",
                      color: "rgba(240,237,230,0.65)",
                      maxWidth: "440px",
                      lineHeight: 1.7,
                      marginBottom: "1.5rem",
                    }}
                  >
                    Thank you, {form.name.split(" ")[0]}! We'll review your request and reach out within 24 hours
                    to schedule a free on-site estimate.
                  </p>

                  {/* Submitted details summary */}
                  {(() => {
                    const serviceLabels: Record<string, string> = {
                      "land-clearing": "Land Clearing",
                      "forestry-mulching": "Forestry Mulching",
                      "vegetation-management": "Vegetation Management",
                      "property-maintenance": "Property Maintenance",
                      "multiple": "Multiple Services",
                    };
                    const acreageLabels: Record<string, string> = {
                      "half-to-one": "½ – 1 acre",
                      "one-to-two": "1 – 2 acres",
                      "two-to-five": "2 – 5 acres",
                      "five-to-ten": "5 – 10 acres",
                      "ten-plus": "10+ acres",
                      "unsure": "Not sure",
                    };
                    const countyDisplay = form.county
                      ? form.county.charAt(0).toUpperCase() + form.county.slice(1) + " County"
                      : "";
                    const serviceDisplay = serviceLabels[form.service] || form.service;
                    const acreageDisplay = acreageLabels[form.acreage] || form.acreage;
                    const streetDisplay = form.street
                      ? form.street.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
                      : "";
                    const cityDisplay = form.city
                      ? form.city.charAt(0).toUpperCase() + form.city.slice(1)
                      : "";
                    const addressLine = [streetDisplay, [cityDisplay, form.state?.toUpperCase(), form.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

                    const rowStyle: React.CSSProperties = {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "0.55rem 0",
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      gap: "1rem",
                    };
                    const labelStyle2: React.CSSProperties = { color: "rgba(240,237,230,0.45)", minWidth: "90px", flexShrink: 0 };
                    const valueStyle: React.CSSProperties = { color: "rgba(240,237,230,0.9)", textAlign: "right" };

                    return (
                      <div
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          padding: "1rem 1.25rem",
                          textAlign: "left",
                          width: "100%",
                          maxWidth: "440px",
                          marginBottom: "2rem",
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                        }}
                      >
                        <div style={{ color: "rgba(240,237,230,0.5)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.75rem", fontWeight: 600 }}>Request Summary</div>
                        <div style={rowStyle}>
                          <span style={labelStyle2}>Name</span>
                          <span style={valueStyle}>{form.name}</span>
                        </div>
                        <div style={rowStyle}>
                          <span style={labelStyle2}>Service</span>
                          <span style={valueStyle}>{serviceDisplay}</span>
                        </div>
                        <div style={rowStyle}>
                          <span style={labelStyle2}>County</span>
                          <span style={valueStyle}>{countyDisplay}</span>
                        </div>
                        {acreageDisplay && (
                          <div style={rowStyle}>
                            <span style={labelStyle2}>Acreage</span>
                            <span style={valueStyle}>{acreageDisplay}</span>
                          </div>
                        )}
                        {addressLine && (
                          <div style={{ ...rowStyle, borderBottom: "none" }}>
                            <span style={labelStyle2}>Address</span>
                            <span style={{ ...valueStyle, maxWidth: "260px", wordBreak: "break-word" }}>{addressLine}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <a
                    href="/"
                    className="btn-amber"
                    style={{ textDecoration: "none" }}
                  >
                    Back to Home
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        name="name" type="text" required
                        placeholder="John Smith"
                        value={form.name} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone Number *</label>
                      <input
                        name="phone" type="tel" required
                        placeholder="(615) 555-0123"
                        value={form.phone} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input
                      name="email" type="email"
                      placeholder="john@example.com"
                      value={form.email} onChange={handleChange}
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                  </div>

                  {/* Service + County */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Service Needed *</label>
                      <select
                        name="service" required
                        value={form.service} onChange={handleChange}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      >
                        <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select a service...</option>
                        <option value="land-clearing" style={{ backgroundColor: "#1a1a1a" }}>Land Clearing</option>
                        <option value="forestry-mulching" style={{ backgroundColor: "#1a1a1a" }}>Forestry Mulching</option>
                        <option value="vegetation-management" style={{ backgroundColor: "#1a1a1a" }}>Vegetation Management</option>
                        <option value="property-maintenance" style={{ backgroundColor: "#1a1a1a" }}>Property Maintenance</option>
                        <option value="multiple" style={{ backgroundColor: "#1a1a1a" }}>Multiple Services</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>County</label>
                      <select
                        name="county"
                        value={form.county} onChange={handleChange}
                        style={{ ...inputStyle, cursor: "pointer" }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      >
                        <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select county...</option>
                        {["Cheatham","Davidson","Dickson","Giles","Hickman","Houston","Humphreys",
                          "Lawrence","Lewis","Maury","Montgomery","Robertson","Rutherford",
                          "Sumner","Wayne","Williamson","Wilson"].map((c) => (
                          <option key={c} value={c.toLowerCase()} style={{ backgroundColor: "#1a1a1a" }}>{c}</option>
                        ))}
                        <option value="other" style={{ backgroundColor: "#1a1a1a" }}>Other / Not Listed</option>
                      </select>
                    </div>
                  </div>

                  {/* Acreage */}
                  <div>
                    <label style={labelStyle}>Approximate Acreage</label>
                    <select
                      name="acreage"
                      value={form.acreage} onChange={handleChange}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    >
                      <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select acreage...</option>
                      <option value="under-quarter" style={{ backgroundColor: "#1a1a1a" }}>Under ¼ acre</option>
                      <option value="quarter-to-half" style={{ backgroundColor: "#1a1a1a" }}>¼ – ½ acre</option>
                      <option value="half-to-one" style={{ backgroundColor: "#1a1a1a" }}>½ – 1 acre</option>
                      <option value="one-to-two" style={{ backgroundColor: "#1a1a1a" }}>1 – 2 acres</option>
                      <option value="two-to-five" style={{ backgroundColor: "#1a1a1a" }}>2 – 5 acres</option>
                      <option value="five-to-ten" style={{ backgroundColor: "#1a1a1a" }}>5 – 10 acres</option>
                      <option value="ten-plus" style={{ backgroundColor: "#1a1a1a" }}>10+ acres</option>
                      <option value="unsure" style={{ backgroundColor: "#1a1a1a" }}>Not sure</option>
                    </select>
                  </div>

                  {/* Property Address */}
                  <div>
                    <label style={labelStyle}>Property / Service Address <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(Optional)</span></label>
                    <input
                      name="street" type="text"
                      placeholder="Street address"
                      value={form.street} onChange={handleChange}
                      style={{ ...inputStyle, marginBottom: "0.5rem" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        name="city" type="text"
                        placeholder="City"
                        value={form.city} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                      <input
                        name="state" type="text"
                        placeholder="State"
                        value={form.state} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                      <input
                        name="zip" type="text"
                        placeholder="ZIP"
                        value={form.zip} onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Project Details</label>
                    <textarea
                      name="message" rows={5}
                      placeholder="Describe your property and what you need done — type of vegetation, terrain, access, timeline, etc."
                      value={form.message} onChange={handleChange}
                      style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(224,123,42,0.6)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                    />
                  </div>

                  {submitError && (
                    <div
                      style={{
                        backgroundColor: "rgba(220,38,38,0.12)",
                        border: "1px solid rgba(220,38,38,0.3)",
                        color: "#fca5a5",
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.875rem",
                        padding: "0.75rem 1rem",
                      }}
                    >
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitQuote.isPending}
                    className="btn-amber w-full justify-center"
                    style={{ fontSize: "1rem", padding: "0.875rem 2rem", opacity: submitQuote.isPending ? 0.7 : 1 }}
                  >
                    {submitQuote.isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={16} /> Send Quote Request</>
                    )}
                  </button>

                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.8rem",
                      color: "rgba(240,237,230,0.35)",
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

      <Footer />
    </div>
  );
}
