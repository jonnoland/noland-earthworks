/*
 * DESIGN: Heavy Equipment Grit — About Us page
 * Hero banner → Meet the Man (bio + stats) → pull quote → core values → contact form
 */
import { useState, useRef } from "react";
import { ArrowLeft, Shield, Star, Wrench, Clock, Send, CheckCircle, Users, MapPin, Loader2, Quote, Volume2, VolumeX } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { trpc } from "@/lib/trpc";
import { usePageTitle } from "@/hooks/usePageTitle";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png";

function EquipmentVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        src="/manus-storage/mulcher-action_eceea83b.mp4"
        poster="/manus-storage/equipment-hero_b34c99e2.png"
        autoPlay
        loop
        muted
        playsInline
        style={{ width: "100%", display: "block", objectFit: "cover" }}
        aria-label="CAT 299D3 XE with Fecon BH74SS drum mulcher actively clearing dense Tennessee woodland"
      />
      <button
        onClick={toggleMute}
        title={muted ? "Unmute" : "Mute"}
        style={{
          position: "absolute",
          bottom: "0.75rem",
          right: "0.75rem",
          background: "rgba(0,0,0,0.55)",
          border: "1px solid rgba(224,123,42,0.4)",
          borderRadius: "4px",
          color: "#F0EDE6",
          cursor: "pointer",
          padding: "0.4rem 0.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.75rem",
          fontFamily: "'Lato', sans-serif",
          letterSpacing: "0.06em",
        }}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        {muted ? "SOUND OFF" : "SOUND ON"}
      </button>
    </div>
  );
}

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
    desc: "Military service instilled a commitment to showing up, working hard, and holding ourselves accountable — on every job, every day.",
  },
  {
    icon: <Wrench size={26} />,
    title: "Craftsmanship",
    desc: "We take pride in the work. The equipment is maintained, the operator is experienced, and the results speak for themselves.",
  },
  {
    icon: <Clock size={26} />,
    title: "Reliability",
    desc: "We respect your time and your property. We arrive when scheduled, communicate clearly, and leave the site better than we found it.",
  },
  {
    icon: <Users size={26} />,
    title: "Community Roots",
    desc: "Middle & West Tennessee locals. We know this land, these communities, and the people who live here — and we're proud to serve them.",
  },
  {
    icon: <MapPin size={26} />,
    title: "Local Expertise",
    desc: "From the rolling hills of Williamson County to the river bottoms of Humphreys County, we understand the terrain and vegetation of this region.",
  },
];

const STATS = [
  { number: "9", label: "Years U.S. Army Service", sub: "Active duty, honorably discharged" },
  { number: "AFG", label: "Afghanistan Veteran", sub: "Deployed as 25B Information Systems Analyst" },
  { number: "30+", label: "Years Professional Experience", sub: "IT career — problem-solving under pressure" },
  { number: "35", label: "Counties Served", sub: "Across Middle & West Tennessee" },
];

export default function AboutPage() {
  usePageTitle(
    "About Us — Veteran-Owned Land Management Company | Noland Earthworks",
    "Learn about Jon M. Noland — Army veteran, IT professional, and founder of Noland Earthworks. Veteran-owned land management and forestry mulching serving 35 counties across Middle & West Tennessee.",
    "/about"
  );
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitContact = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setSubmitError(null);
    },
    onError: (err) => {
      setSubmitError(
        err.message || "Something went wrong. Please try again or email us directly at info@nolandearthworks.com."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    submitContact.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      subject: form.subject,
      message: form.message,
    });
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
            Veteran-Owned &amp; Operated — Middle &amp; West Tennessee
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
            Built on American strength, driven by service, and rooted in Middle &amp; West Tennessee.
          </p>
        </div>
      </section>

      {/* ── MEET THE MAN ── */}
      <section style={{ paddingTop: "5rem", paddingBottom: "5rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="container">

          {/* Section label + headline */}
          <div style={{ marginBottom: "3.5rem" }}>
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
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "#F0EDE6",
                lineHeight: 1.05,
                marginBottom: "0.5rem",
              }}
            >
              Meet the Man<br />
              <span style={{ color: "#E07B2A" }}>Behind the Machine</span>
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 400,
                fontSize: "1rem",
                color: "rgba(240,237,230,0.5)",
                letterSpacing: "0.02em",
              }}
            >
              Jon M. Noland — Founder, Owner &amp; Operator
            </p>
          </div>

          {/* Bio + Stats grid */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-10 lg:gap-14 items-start">

            {/* Photo — 2 cols */}
            <div className="lg:col-span-2 flex flex-col items-center lg:items-start">
              <div
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  aspectRatio: "3/4",
                  overflow: "hidden",
                  border: "2px solid rgba(224,123,42,0.25)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
                }}
              >
                <img
                  src="/manus-storage/meet-style-c-v2_d02bd304.png"
                  alt="Jon Noland — Founder of Noland Earthworks, leaning on his CAT 299D3 XE with Fecon drum mulcher"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
                />
              </div>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.72rem",
                  color: "rgba(240,237,230,0.35)",
                  marginTop: "0.75rem",
                  textAlign: "center",
                  maxWidth: "320px",
                  letterSpacing: "0.04em",
                }}
              >
                CAT 299D3 XE &bull; Fecon BH74SS Drum Mulcher
              </p>
            </div>

            {/* Bio copy — 3 cols */}
            <div className="lg:col-span-3">
              {[
                "Before Noland Earthworks, Jon M. Noland spent nine years serving in the United States Army, including a deployment to Afghanistan as a 25B Information Systems Analyst. After leaving the military, he spent more than 30 years building a career in IT — solving complex problems, staying disciplined under pressure, and delivering results that people could count on.",
                "Then something shifted.",
                "Jon moved to the country. And what started as a change of scenery became something he did not expect — a genuine love for working the land. The early mornings, the physical work, the satisfaction of turning an overgrown, unusable piece of property into something a family could actually use. He bought a skid steer, added the right attachments, and in 2025, Noland Earthworks was born.",
                "He is not a lifelong farmer or a third-generation land clearer. He is someone who found a real passion, brought the same discipline and work ethic that carried him through the Army and a 30-year career, and decided to build something of his own. Every job he takes, he shows up on time, does the work right, and leaves the property better than he found it.",
                "That is what veteran-owned actually means here. Not just a badge — a way of operating.",
              ].map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: i === 1 ? 600 : 300,
                    fontSize: i === 1 ? "1.125rem" : "1rem",
                    lineHeight: 1.85,
                    color: i === 1 ? "rgba(240,237,230,0.9)" : "rgba(240,237,230,0.72)",
                    marginBottom: i === 1 ? "1.5rem" : "1.125rem",
                    fontStyle: i === 1 ? "italic" : "normal",
                    paddingLeft: i === 1 ? "1rem" : "0",
                    borderLeft: i === 1 ? "3px solid #E07B2A" : "none",
                  }}
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Stat block — 2 cols */}
            <div className="lg:col-span-2 flex flex-col gap-4" style={{ marginTop: 0 }}>
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="p-5 flex items-start gap-4"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    transition: "border-color 0.2s ease, background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(224,123,42,0.3)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(224,123,42,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.03)";
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      fontWeight: 700,
                      fontSize: s.number.length > 2 ? "1.75rem" : "2.25rem",
                      color: "#E07B2A",
                      lineHeight: 1,
                      minWidth: "3.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {s.number}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#F0EDE6",
                        marginBottom: "0.2rem",
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
                        lineHeight: 1.5,
                      }}
                    >
                      {s.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── THE EQUIPMENT ── */}
      <section
        style={{
          paddingTop: "5rem",
          paddingBottom: "5rem",
          backgroundColor: "#0a0a0a",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="container">
          {/* Section header */}
          <div style={{ marginBottom: "3rem" }}>
            <p
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 400,
                fontSize: "0.75rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#E07B2A",
                marginBottom: "0.75rem",
              }}
            >
              The Equipment
            </p>
            <h2
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(2rem, 4vw, 3rem)",
                lineHeight: 1.1,
                color: "#F0EDE6",
                marginBottom: "0.5rem",
              }}
            >
              Built for the Work.<br />
              <span style={{ color: "#E07B2A" }}>Not Just the Easy Jobs.</span>
            </h2>
          </div>

          {/* Image + copy layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Video */}
            <div
              style={{
                overflow: "hidden",
                border: "1px solid rgba(224,123,42,0.2)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                position: "relative",
              }}
            >
              <EquipmentVideo />
            </div>

            {/* Copy */}
            <div>
              {/* Machine 1 */}
              <div style={{ marginBottom: "2.5rem" }}>
                <h3
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.35rem",
                    letterSpacing: "0.04em",
                    color: "#F0EDE6",
                    marginBottom: "0.25rem",
                  }}
                >
                  CAT 299D3 XE
                </h3>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 400,
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    marginBottom: "0.85rem",
                  }}
                >
                  Tracked Compact Track Loader
                </p>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "1rem",
                    lineHeight: 1.85,
                    color: "rgba(240,237,230,0.72)",
                  }}
                >
                  The CAT 299D3 XE runs on rubber tracks, not wheels. That matters on Tennessee terrain — soft ground after rain, steep slopes, and tight access points that would stop a wheeled machine cold. The tracked platform distributes weight across a wider footprint, which means less ground disturbance and the ability to work in conditions that would otherwise shut a job down.
                </p>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: "3rem",
                  height: "2px",
                  backgroundColor: "rgba(224,123,42,0.4)",
                  marginBottom: "2.5rem",
                }}
              />

              {/* Machine 2 */}
              <div style={{ marginBottom: "2.5rem" }}>
                <h3
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "1.35rem",
                    letterSpacing: "0.04em",
                    color: "#F0EDE6",
                    marginBottom: "0.25rem",
                  }}
                >
                  Fecon BH74SS
                </h3>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 400,
                    fontSize: "0.72rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#E07B2A",
                    marginBottom: "0.85rem",
                  }}
                >
                  Drum Mulcher Attachment
                </p>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 300,
                    fontSize: "1rem",
                    lineHeight: 1.85,
                    color: "rgba(240,237,230,0.72)",
                  }}
                >
                  The Fecon BH74SS drum mulcher is what separates forestry mulching from every other clearing method. It grinds brush, saplings, and small trees directly into mulch that stays on the ground as natural cover. No debris piles to burn, no hauling, no cleanup crew. What comes out of the drum goes right back into the soil — protecting against erosion and leaving the property looking finished, not stripped.
                </p>
              </div>

              {/* Capability callouts */}
              <div
                className="grid grid-cols-2 gap-3"
                style={{ marginTop: "0.5rem" }}
              >
                {[
                  { label: "Steep Slopes", desc: "Tracked platform handles grades that wheeled machines cannot" },
                  { label: "Wet Ground", desc: "Low ground pressure keeps the machine moving after rain" },
                  { label: "Dense Brush", desc: "Grinds cedar, privet, and mixed hardwood up to 6\" diameter" },
                  { label: "No Debris", desc: "Everything mulched in place — no hauling, no burning" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Oswald', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#E07B2A",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontWeight: 300,
                        fontSize: "0.78rem",
                        color: "rgba(240,237,230,0.5)",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ── */}
      <section
        style={{
          paddingTop: "4.5rem",
          paddingBottom: "4.5rem",
          backgroundColor: "#0d1a0d",
          borderBottom: "1px solid rgba(224,123,42,0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Large decorative quote mark */}
        <div
          style={{
            position: "absolute",
            top: "-1rem",
            left: "2rem",
            fontFamily: "'Oswald', sans-serif",
            fontSize: "18rem",
            lineHeight: 1,
            color: "rgba(224,123,42,0.05)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          "
        </div>
        <div className="container relative z-10">
          <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
            <Quote
              size={32}
              style={{ color: "#E07B2A", margin: "0 auto 1.5rem", opacity: 0.7 }}
            />
            <blockquote
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "clamp(1.1rem, 2.2vw, 1.4rem)",
                lineHeight: 1.75,
                color: "rgba(240,237,230,0.85)",
                fontStyle: "italic",
                marginBottom: "1.75rem",
              }}
            >
              "I spent 30 years solving problems in IT and nine years serving my country. When I moved to the country and started working the land, I finally found the thing that brought it all together. Noland Earthworks is everything I have learned, built into one machine."
            </blockquote>
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.85rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#E07B2A",
              }}
            >
              — Jon M. Noland, Founder
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
                  { label: "Email", value: "info@nolandearthworks.com", href: "mailto:info@nolandearthworks.com" },
                  { label: "Service Area", value: "Middle & West Tennessee — 35 Counties", href: "/services/land-management" },
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

              {/* NAP block */}
              <address
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontStyle: "normal",
                  fontSize: "0.875rem",
                  lineHeight: 1.8,
                  color: "rgba(240,237,230,0.55)",
                  marginBottom: "2rem",
                  paddingTop: "1.5rem",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <strong style={{ color: "rgba(240,237,230,0.8)", display: "block", marginBottom: "0.25rem", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.05em", textTransform: "uppercase", fontSize: "0.8rem" }}>Noland Earthworks, LLC</strong>
                93 Halliburton Road<br />
                Vanleer, TN 37181<br />
                <a href="tel:6154064819" style={{ color: "rgba(240,237,230,0.55)", textDecoration: "none" }}>Phone: 615-406-4819</a>
                <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.8rem", color: "rgba(240,237,230,0.4)" }}>
                  Serving 35 counties across Middle and West Tennessee
                </span>
              </address>

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
                  For land management, forestry mulching, or other services, use our dedicated quote form for the fastest response.
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
                    disabled={submitContact.isPending}
                    className="btn-amber w-full justify-center"
                    style={{ fontSize: "1rem", padding: "0.875rem 2rem", opacity: submitContact.isPending ? 0.7 : 1 }}
                  >
                    {submitContact.isPending ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending...</>
                    ) : (
                      <><Send size={16} /> Send Message</>
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
                    We respond within one business day.
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
