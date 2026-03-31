/*
 * DESIGN: Heavy Equipment Grit — About Us page
 * Hero banner → story section → core values → contact form for general inquiries
 */
import { useState } from "react";
import { ArrowLeft, Shield, Star, Wrench, Clock, Send, CheckCircle, Users, MapPin } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png";

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

const values = [
  {
    icon: <Shield size={26} />,
    title: "Integrity First",
    desc: "We do what we say. Every quote is honest, every timeline is realistic, and every job is completed to the standard we'd want on our own land.",
  },
  {
    icon: <Star size={26} />,
    title: "Veteran Discipline",
    desc: "Military service instilled in us a commitment to showing up, working hard, and holding ourselves accountable — on every job, every day.",
  },
  {
    icon: <Wrench size={26} />,
    title: "Craftsmanship",
    desc: "We take pride in our work. Our operators are experienced, our equipment is maintained, and the results speak for themselves.",
  },
  {
    icon: <Clock size={26} />,
    title: "Reliability",
    desc: "We respect your time and your property. We arrive when scheduled, communicate clearly, and clean up before we leave.",
  },
  {
    icon: <Users size={26} />,
    title: "Community Roots",
    desc: "We're Middle Tennessee locals. We know this land, these communities, and the people who live here — and we're proud to serve them.",
  },
  {
    icon: <MapPin size={26} />,
    title: "Local Expertise",
    desc: "From the rolling hills of Williamson County to the river bottoms of Humphreys County, we understand the terrain and vegetation of Middle TN.",
  },
];

export default function AboutPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const focusAmber = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "rgba(224,123,42,0.6)";
  };
  const blurGray = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "rgba(255,255,255,0.12)";
  };

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />

      {/* ── HERO BANNER ── */}
      <section
        className="relative flex items-end"
        style={{
          minHeight: "42vh",
          background: "linear-gradient(135deg, #0a1a0a 0%, #1a1500 50%, #1a0d00 100%)",
          overflow: "hidden",
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: "#E07B2A" }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(224,123,42,0.025) 40px, rgba(224,123,42,0.025) 41px)",
          }}
        />
        {/* Faint logo watermark */}
        <div
          className="absolute right-0 top-0 bottom-0 flex items-center"
          style={{ opacity: 0.04, pointerEvents: "none", paddingRight: "4rem" }}
        >
          <img src={LOGO_URL} alt="" style={{ height: "340px", width: "auto" }} />
        </div>

        <div className="container relative z-10 pb-14 pt-32">
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
            Veteran-Owned &amp; Operated — Middle Tennessee
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
            About <span style={{ color: "#E07B2A" }}>Noland Earthworks</span>
          </h1>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              color: "rgba(240,237,230,0.65)",
              marginTop: "0.75rem",
              maxWidth: "560px",
            }}
          >
            Built on American strength, driven by service, and rooted in Middle Tennessee.
          </p>
        </div>
      </section>

      {/* ── OUR STORY ── */}
      <section style={{ paddingTop: "5rem", paddingBottom: "5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text */}
            <div>
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
                Our Story
              </div>
              <h2
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#F0EDE6",
                  marginBottom: "1.5rem",
                  lineHeight: 1.1,
                }}
              >
                Built on Service.<br />Built on Strength.
              </h2>
              {[
                "Noland Earthworks was founded by a U.S. military veteran who came home to Middle Tennessee with a simple mission: bring the same discipline, reliability, and work ethic from military service to the land clearing industry.",
                "We started with a single machine and a commitment to doing the job right. Today, we serve 17 counties across Middle Tennessee, helping landowners, developers, farmers, and homebuilders transform overgrown, unmanageable land into clean, usable property.",
                "As a veteran-owned and operated business, we hold ourselves to a higher standard. We show up on time, communicate honestly, and stand behind every project we complete. That's not a marketing line — it's how we were trained.",
              ].map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "1rem",
                    lineHeight: 1.8,
                    color: "rgba(240,237,230,0.72)",
                    marginBottom: "1.125rem",
                  }}
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Stats panel */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { number: "17", label: "Counties Served", sub: "Across Middle Tennessee" },
                { number: "100%", label: "Veteran-Owned", sub: "U.S. military veteran founded" },
                { number: "5★", label: "Customer Rating", sub: "Google & Facebook reviews" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-6 flex flex-col"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: "2.25rem",
                      color: "#E07B2A",
                      lineHeight: 1,
                      marginBottom: "0.4rem",
                    }}
                  >
                    {s.number}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#F0EDE6",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {s.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.78rem",
                      color: "rgba(240,237,230,0.45)",
                    }}
                  >
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE VALUES ── */}
      <section
        style={{
          paddingTop: "5rem",
          paddingBottom: "5rem",
          backgroundColor: "#0F1A0F",
          borderBottom: "1px solid rgba(224,123,42,0.12)",
        }}
      >
        <div className="container">
          <div className="mb-10">
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
              What We Stand For
            </div>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#F0EDE6",
              }}
            >
              Our Core Values
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div
                key={v.title}
                className="p-6"
                style={{
                  backgroundColor: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "border-color 0.2s ease, background-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.35)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(224,123,42,0.04)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.025)";
                }}
              >
                <div
                  className="flex items-center justify-center w-12 h-12 mb-4"
                  style={{
                    backgroundColor: "rgba(224,123,42,0.1)",
                    border: "1px solid rgba(224,123,42,0.25)",
                    color: "#E07B2A",
                  }}
                >
                  {v.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "1rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#F0EDE6",
                    marginBottom: "0.5rem",
                  }}
                >
                  {v.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.875rem",
                    lineHeight: 1.7,
                    color: "rgba(240,237,230,0.6)",
                  }}
                >
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ── */}
      <section
        id="contact"
        style={{
          paddingTop: "5rem",
          paddingBottom: "6rem",
          borderTop: "1px solid rgba(224,123,42,0.1)",
        }}
      >
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

            {/* Left: context */}
            <div className="lg:col-span-2">
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
                General Inquiries
              </div>
              <h2
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "#F0EDE6",
                  marginBottom: "1.25rem",
                  lineHeight: 1.1,
                }}
              >
                Get in Touch
              </h2>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 300,
                  fontSize: "0.9375rem",
                  lineHeight: 1.75,
                  color: "rgba(240,237,230,0.6)",
                  marginBottom: "2rem",
                }}
              >
                Have a question that isn't about a specific project? Want to learn more
                about our company, our equipment, or how we work? We'd love to hear from you.
              </p>

              {/* Info rows */}
              <div className="flex flex-col gap-4 mb-8">
                {[
                  { label: "Phone", value: "615-406-4819", href: "tel:6154064819" },
                  { label: "Email", value: "quotes@nolandearthworks.com", href: "mailto:quotes@nolandearthworks.com" },
                  { label: "Service Area", value: "Middle Tennessee — 17 Counties", href: "/services/land-clearing" },
                ].map((c) => (
                  <a
                    key={c.label}
                    href={c.href}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.65rem",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(240,237,230,0.35)",
                        marginBottom: "0.15rem",
                      }}
                    >
                      {c.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 400,
                        fontSize: "0.9rem",
                        color: "rgba(240,237,230,0.8)",
                        transition: "color 0.2s ease",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#E07B2A")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.8)")}
                    >
                      {c.value}
                    </div>
                  </a>
                ))}
              </div>

              {/* Need a quote CTA */}
              <div
                className="p-4"
                style={{
                  backgroundColor: "rgba(224,123,42,0.06)",
                  border: "1px solid rgba(224,123,42,0.2)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    marginBottom: "0.4rem",
                  }}
                >
                  Need a Project Quote?
                </div>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.825rem",
                    color: "rgba(240,237,230,0.55)",
                    marginBottom: "0.75rem",
                    lineHeight: 1.6,
                  }}
                >
                  For land clearing, forestry mulching, or other services, use our dedicated quote form for the fastest response.
                </p>
                <a
                  href="/quote"
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "opacity 0.2s ease",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.75")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  Go to Quote Form →
                </a>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-3">
              {submitted ? (
                <div
                  className="flex flex-col items-center justify-center text-center p-12"
                  style={{
                    backgroundColor: "rgba(224,123,42,0.06)",
                    border: "1px solid rgba(224,123,42,0.3)",
                    minHeight: "420px",
                  }}
                >
                  <CheckCircle size={52} style={{ color: "#E07B2A", marginBottom: "1.5rem" }} />
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
                    Message Received!
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "1rem",
                      color: "rgba(240,237,230,0.6)",
                      maxWidth: "380px",
                      lineHeight: 1.7,
                      marginBottom: "2rem",
                    }}
                  >
                    Thanks for reaching out. We'll get back to you within one business day.
                  </p>
                  <a
                    href="/"
                    className="btn-amber"
                    style={{ textDecoration: "none" }}
                  >
                    Back to Home
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        name="name" type="text" required
                        placeholder="John Smith"
                        value={form.name} onChange={handleChange}
                        style={inputStyle}
                        onFocus={focusAmber} onBlur={blurGray}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email Address *</label>
                      <input
                        name="email" type="email" required
                        placeholder="john@example.com"
                        value={form.email} onChange={handleChange}
                        style={inputStyle}
                        onFocus={focusAmber} onBlur={blurGray}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input
                      name="phone" type="tel"
                      placeholder="(615) 555-0123"
                      value={form.phone} onChange={handleChange}
                      style={inputStyle}
                      onFocus={focusAmber} onBlur={blurGray}
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label style={labelStyle}>Subject *</label>
                    <select
                      name="subject" required
                      value={form.subject} onChange={handleChange}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={focusAmber} onBlur={blurGray}
                    >
                      <option value="" style={{ backgroundColor: "#1a1a1a" }}>Select a topic...</option>
                      <option value="general" style={{ backgroundColor: "#1a1a1a" }}>General Question</option>
                      <option value="partnership" style={{ backgroundColor: "#1a1a1a" }}>Partnership / Referral</option>
                      <option value="employment" style={{ backgroundColor: "#1a1a1a" }}>Employment Inquiry</option>
                      <option value="media" style={{ backgroundColor: "#1a1a1a" }}>Media / Press</option>
                      <option value="feedback" style={{ backgroundColor: "#1a1a1a" }}>Feedback or Complaint</option>
                      <option value="other" style={{ backgroundColor: "#1a1a1a" }}>Other</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label style={labelStyle}>Message *</label>
                    <textarea
                      name="message" rows={6} required
                      placeholder="Tell us what's on your mind..."
                      value={form.message} onChange={handleChange}
                      style={{ ...inputStyle, resize: "vertical" }}
                      onFocus={focusAmber} onBlur={blurGray}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-amber w-full justify-center"
                    style={{ fontSize: "1rem", padding: "0.875rem 2rem" }}
                  >
                    <Send size={16} />
                    Send Message
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
                    We respond within one business day.
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
