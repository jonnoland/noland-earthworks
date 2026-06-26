/*
 * DESIGN: Heavy Equipment Grit — standalone quote page
 * Hero banner → two-column layout: contact info left, full form right
 */
import { useState } from "react";
import { Phone, Mail, MapPin, Send, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
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

// Map calculator's numeric acres to quote form's bucketed acreage option values
function acresBucket(acres: number): string {
  if (acres <= 0.5) return "half-to-one";
  if (acres <= 1)   return "half-to-one";
  if (acres <= 2)   return "one-to-two";
  if (acres <= 5)   return "two-to-five";
  if (acres <= 10)  return "five-to-ten";
  return "ten-plus";
}

// Build a pre-fill note from density/terrain/access params
function buildPrefillNote(density: string, terrain: string, access: string): string {
  const densityMap: Record<string, string> = {
    light: "light brush / saplings",
    moderate: "moderate brush and mixed trees",
    heavy: "heavy timber / dense cedar / mature hardwoods",
  };
  const terrainMap: Record<string, string> = {
    flat: "flat / gently rolling terrain",
    rolling: "moderate slope (10–25°)",
    steep: "steep / wet / rocky terrain (25°+)",
  };
  const accessMap: Record<string, string> = {
    easy: "easy access (wide gate, gravel drive)",
    moderate: "moderate access",
    difficult: "difficult access (narrow gate, soft ground)",
  };
  const parts: string[] = [];
  if (densityMap[density]) parts.push(`Vegetation: ${densityMap[density]}`);
  if (terrainMap[terrain]) parts.push(`Terrain: ${terrainMap[terrain]}`);
  if (accessMap[access])   parts.push(`Site access: ${accessMap[access]}`);
  return parts.length ? `From pricing calculator:\n${parts.join("\n")}` : "";
}

// Maps each core service to the add-ons most relevant to it
const ADDON_SUGGESTIONS: Record<string, string[]> = {
  "land-clearing": ["Post-Clear Seeding & Erosion Control", "Fence Line Clearing", "Selective Clearing & Tree Preservation"],
  "forestry-mulching": ["Mulch Redistribution", "Post-Clear Seeding & Erosion Control", "Fence Line Clearing"],
  "vegetation-management": ["Fence Line Clearing", "Post-Clear Seeding & Erosion Control"],
  "right-of-way-clearing": ["Fence Line Clearing", "Mulch Redistribution"],
  "property-maintenance": ["Post-Clear Seeding & Erosion Control", "Fence Line Clearing"],
  "multiple": ["Post-Clear Seeding & Erosion Control", "Fence Line Clearing", "Mulch Redistribution", "Selective Clearing & Tree Preservation"],
};

export default function QuotePage() {
  usePageTitle(
    "Free Forestry Mulching & Land Management Quote — Tennessee",
    "Request a free on-site estimate for forestry mulching, lot clearing, brush clearing, or land management anywhere in Middle & West Tennessee. Veteran-owned. Fast response.",
    "/quote"
  );
  const [submitted, setSubmitted] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const toggleAddOn = (label: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(label) ? prev.filter((a) => a !== label) : [...prev, label]
    );
  };

  // Read calculator pre-fill params from URL on first render
  const initialForm = (() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get("service") || "";
    const acres   = parseFloat(params.get("acres") || "0");
    const density = params.get("density") || "";
    const terrain = params.get("terrain") || "";
    const access  = params.get("access")  || "";
    const county   = params.get("county")  || "";
    const city     = params.get("city")    || "";
    const state    = params.get("state")   || "TN";
    const acreage = acres > 0 ? acresBucket(acres) : "";
    const message = (density || terrain || access) ? buildPrefillNote(density, terrain, access) : "";
    return {
      name: "", phone: "", email: "",
      service, county, acreage,
      street: "", city, state, zip: "",
      message,
    };
  })();

  const [form, setForm] = useState(initialForm);

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
      addOns: selectedAddOns,
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
                    value: "Middle & West Tennessee",
                    sub: "35 counties — free on-site estimates",
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
            <div className="lg:col-span-3" style={{ position: "relative" }}>
              {/* Loading overlay — shown while submission is in flight */}
              {submitQuote.isPending && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 20,
                    backgroundColor: "rgba(18,18,18,0.88)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1.25rem",
                    borderRadius: "4px",
                  }}
                >
                  {/* Pulsing ring + spinner */}
                  <div style={{ position: "relative", width: 72, height: 72 }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "2px solid rgba(224,123,42,0.25)",
                        animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 8,
                        borderRadius: "50%",
                        border: "2px solid rgba(224,123,42,0.15)",
                        animation: "ping 1.4s cubic-bezier(0,0,0.2,1) infinite 0.3s",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Loader2 size={32} style={{ color: "#E07B2A", animation: "spin 1s linear infinite" }} />
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#F0EDE6",
                    }}
                  >
                    Sending Your Request
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.85rem",
                      color: "rgba(240,237,230,0.5)",
                    }}
                  >
                    Just a moment...
                  </div>
                </div>
              )}

              {submitted ? (
                <div
                  className="flex flex-col items-center justify-center text-center p-12"
                  style={{
                    backgroundColor: "rgba(224,123,42,0.06)",
                    border: "1px solid rgba(224,123,42,0.3)",
                    minHeight: "480px",
                    animation: "fadeSlideUp 0.5s ease both",
                  }}
                >
                  {/* Animated success icon with pulse ring */}
                  <div style={{ position: "relative", marginBottom: "1.75rem" }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: -12,
                        borderRadius: "50%",
                        backgroundColor: "rgba(224,123,42,0.12)",
                        animation: "successPulse 2s ease-in-out infinite",
                      }}
                    />
                    <CheckCircle size={64} style={{ color: "#E07B2A", position: "relative", zIndex: 1 }} />
                  </div>
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
                    Got It, {form.name.split(" ")[0]}
                  </h2>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "1rem",
                      color: "rgba(240,237,230,0.65)",
                      maxWidth: "440px",
                      lineHeight: 1.7,
                      marginBottom: "0.75rem",
                    }}
                  >
                    I'll reach out within one business day — usually the same day. We'll talk briefly about the property, and if it makes sense, I'll schedule a free on-site visit.
                  </p>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.9375rem",
                      color: "rgba(240,237,230,0.5)",
                      maxWidth: "440px",
                      lineHeight: 1.7,
                      marginBottom: "1.5rem",
                    }}
                  >
                    After the site visit, you'll have a written proposal within one to two days. No pressure, no obligation.
                  </p>

                  {/* Submitted details summary */}
                  {(() => {
                    const serviceLabels: Record<string, string> = {
                      "land-clearing": "Land Management",
                      "forestry-mulching": "Forestry Mulching",
                      "vegetation-management": "Vegetation Management",
                      "right-of-way-clearing": "Right-of-Way Clearing",
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
                        {selectedAddOns.length > 0 && (
                          <div style={rowStyle}>
                            <span style={labelStyle2}>Add-Ons</span>
                            <span style={{ ...valueStyle, maxWidth: "260px", wordBreak: "break-word" }}>{selectedAddOns.join(", ")}</span>
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

                  {/* Google Review CTA */}
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1.25rem 1.75rem",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      maxWidth: "440px",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.875rem",
                        color: "rgba(240,237,230,0.6)",
                        marginBottom: "0.85rem",
                      }}
                    >
                      Been a customer before? A quick Google review helps others find us.
                    </p>
                    <a
                      href="https://g.page/r/CcglMAMbtQInEBM/review"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        backgroundColor: "transparent",
                        color: "#E07B2A",
                        border: "1px solid rgba(224,123,42,0.5)",
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "0.6rem 1.25rem",
                        textDecoration: "none",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Leave a Google Review
                    </a>
                  </div>

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
                      name="email" type="email" required
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
                        <option value="land-clearing" style={{ backgroundColor: "#1a1a1a" }}>Land Management</option>
                        <option value="forestry-mulching" style={{ backgroundColor: "#1a1a1a" }}>Forestry Mulching</option>
                        <option value="vegetation-management" style={{ backgroundColor: "#1a1a1a" }}>Vegetation Management</option>
                        <option value="right-of-way-clearing" style={{ backgroundColor: "#1a1a1a" }}>Right-of-Way Clearing</option>
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
                        {[
                          "Bedford","Benton","Cannon","Carroll","Cheatham","Chester",
                          "Davidson","Decatur","Dickson","Gibson","Giles",
                          "Hardin","Henderson","Henry","Hickman","Houston","Humphreys",
                          "Lawrence","Lewis","Lincoln","Madison","Marshall",
                          "Maury","Montgomery","Moore","Perry","Robertson","Rutherford",
                          "Stewart","Sumner","Trousdale","Wayne","Weakley","Williamson","Wilson"
                        ].map((c) => (
                          <option key={c} value={c.toLowerCase()} style={{ backgroundColor: "#1a1a1a" }}>{c}</option>
                        ))}
                        <option value="other" style={{ backgroundColor: "#1a1a1a" }}>Other / Not Listed</option>
                      </select>
                    </div>
                  </div>

                  {/* Acreage */}
                  <div>
                    <label style={labelStyle}>Approximate Acreage <span style={{ fontWeight: 400, opacity: 0.65, fontSize: "0.85em", textTransform: "none", letterSpacing: 0 }}>(minimum charge is 1 acre)</span></label>
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

                  {/* Add-On Services */}
                  <div>
                    <label style={labelStyle}>Add-On Services <span style={{ color: "rgba(240,237,230,0.4)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>(Optional)</span></label>
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: "rgba(240,237,230,0.45)", marginBottom: "0.75rem", marginTop: "0.25rem" }}>
                      {form.service
                        ? "Based on your selected service, these add-ons are commonly included."
                        : "Select any add-on services you'd like included with your quote."}
                    </p>
                    {/* Sort: suggested add-ons first, rest after */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {((): { key: string; label: string }[] => {
                        const all = [
                          { key: "post-clear-seeding", label: "Post-Clear Seeding & Erosion Control" },
                          { key: "fence-line-clearing", label: "Fence Line Clearing" },
                          { key: "mulch-redistribution", label: "Mulch Redistribution" },
                          { key: "selective-clearing", label: "Selective Clearing & Tree Preservation" },
                        ];
                        const suggested = ADDON_SUGGESTIONS[form.service] ?? [];
                        return [
                          ...all.filter((a) => suggested.includes(a.label)),
                          ...all.filter((a) => !suggested.includes(a.label)),
                        ];
                      })().map((addon) => {
                        const suggested = (ADDON_SUGGESTIONS[form.service] ?? []).includes(addon.label);
                        return (
                          <label
                            key={addon.key}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.65rem",
                              cursor: "pointer",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "4px",
                              border: selectedAddOns.includes(addon.label)
                                ? "1px solid rgba(224,123,42,0.5)"
                                : suggested
                                ? "1px solid rgba(224,123,42,0.25)"
                                : "1px solid rgba(255,255,255,0.08)",
                              backgroundColor: selectedAddOns.includes(addon.label)
                                ? "rgba(224,123,42,0.08)"
                                : suggested
                                ? "rgba(224,123,42,0.03)"
                                : "rgba(255,255,255,0.02)",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => toggleAddOn(addon.label)}
                          >
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "3px",
                                border: selectedAddOns.includes(addon.label)
                                  ? "2px solid #E07B2A"
                                  : "2px solid rgba(255,255,255,0.25)",
                                backgroundColor: selectedAddOns.includes(addon.label)
                                  ? "#E07B2A"
                                  : "transparent",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {selectedAddOns.includes(addon.label) && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "rgba(240,237,230,0.85)" }}>
                                {addon.label}
                              </span>
                              {suggested && form.service && (
                                <span style={{
                                  fontFamily: "'Oswald', sans-serif",
                                  fontSize: "0.6rem",
                                  fontWeight: 600,
                                  letterSpacing: "0.12em",
                                  textTransform: "uppercase",
                                  color: "#E07B2A",
                                  backgroundColor: "rgba(224,123,42,0.12)",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "2px",
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}>
                                  Recommended
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
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

      <MobileCTABar />
      <Footer />
    </div>
  );
}
