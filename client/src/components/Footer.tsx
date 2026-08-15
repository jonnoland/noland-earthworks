/*
 * DESIGN: Heavy Equipment Grit — dark footer with amber accents
 * Company info, contact, social links, legal
 */
import { Phone, Mail, Facebook, Instagram, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const COOKIE_CONSENT_KEY = "noland_cookie_consent_v1";
type CookieChoice = "essential" | "analytics";

function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(!window.localStorage.getItem(COOKIE_CONSENT_KEY));
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (choice: CookieChoice) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    } catch {
      // The banner can still be dismissed when a browser blocks local storage.
    }
    window.dispatchEvent(new CustomEvent("noland:cookie-consent", { detail: choice }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label="Cookie preferences"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-3xl border border-[#E07B2A]/45 bg-[#111111] p-4 shadow-2xl sm:bottom-5 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-['Lato'] text-sm leading-6 text-white/75">
          We use essential browser storage to remember this choice. With your permission, we also use analytics to understand site performance and improve service requests. Read our{" "}
          <a href="/privacy-policy" className="font-semibold text-[#E07B2A] underline underline-offset-2">Privacy Policy</a>.
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => choose("essential")} className="min-h-10 border border-white/20 px-4 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.1em] text-white/85 transition hover:border-white/45">
            Essential only
          </button>
          <button type="button" onClick={() => choose("analytics")} className="min-h-10 bg-[#E07B2A] px-4 font-['Oswald'] text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#f28c35]">
            Accept analytics
          </button>
        </div>
      </div>
    </aside>
  );
}

function EmailCaptureStrip() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");
  const subscribe = trpc.emailSubscribe.subscribe.useMutation({
    onSuccess: (data) => {
      if (data.message === "already_subscribed") {
        setStatus("duplicate");
      } else if (data.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    },
    onError: () => setStatus("error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    subscribe.mutate({ email: email.trim(), source: "footer" });
  };

  return (
    <div
      style={{
        borderTop: "1px solid rgba(224,123,42,0.15)",
        borderBottom: "1px solid rgba(224,123,42,0.15)",
        backgroundColor: "#0d0d0d",
        padding: "2rem 0",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: "1rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#F0EDE6",
            margin: 0,
          }}
        >
          Seasonal Clearing Tips &amp; Updates
        </p>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.82rem",
            color: "rgba(240,237,230,0.5)",
            margin: 0,
            maxWidth: "420px",
          }}
        >
          Get occasional notes on the best times to clear, what to expect on your first job, and when we have open schedule slots.
        </p>
        {status === "success" ? (
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.85rem",
              color: "#E07B2A",
              fontWeight: 600,
            }}
          >
            You're on the list. We'll be in touch.
          </p>
        ) : status === "duplicate" ? (
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.85rem",
              color: "rgba(240,237,230,0.5)",
            }}
          >
            That email is already on the list.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "2px",
                padding: "0.55rem 1rem",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.85rem",
                color: "#F0EDE6",
                outline: "none",
                width: "240px",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                backgroundColor: "#E07B2A",
                color: "#121212",
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "0.55rem 1.25rem",
                border: "none",
                borderRadius: "2px",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
              }}
            >
              {status === "loading" ? "..." : "Subscribe"}
            </button>
            {status === "error" && (
              <p
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.78rem",
                  color: "rgba(240,100,100,0.8)",
                  margin: "0.25rem 0 0",
                }}
              >
                Something went wrong. Try again.
              </p>
            )}
          </form>
        )}
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.72rem",
            lineHeight: 1.5,
            color: "rgba(240,237,230,0.42)",
            margin: "0.25rem 0 0",
            maxWidth: "460px",
          }}
        >
          By subscribing, you agree to receive occasional clearing tips and schedule updates by email. Unsubscribe at any time. We use your email to maintain this subscriber record; see our <a href="/privacy-policy" style={{ color: "#E07B2A" }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function Footer() {
  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
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
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/noland-logo-transparent_783e5c7b.png"
                alt="Noland Earthworks"
                style={{ height: "90px", width: "auto", objectFit: "contain" }}
              />
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
              Veteran-owned and operated land management and forestry mulching
              services for Middle &amp; West Tennessee. Licensed &amp; Insured.
            </p>
            {/* Social links */}
            <div className="flex gap-3">
              {[
                { icon: <Facebook size={16} />, href: "https://www.facebook.com/profile.php?id=61582515285816", label: "Facebook" },
                { icon: <Instagram size={16} />, href: "https://www.instagram.com/nolandearthworks/", label: "Instagram" },
                { icon: <Youtube size={16} />, href: "https://www.youtube.com/@NolandEarthworks", label: "YouTube" },
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
                { label: "Our Work", href: "/#our-work" },
                { label: "Service Areas", href: "/#service-areas" },
                { label: "About Us", href: "/about" },
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
                href="mailto:info@nolandearthworks.com"
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
                info@nolandearthworks.com
              </a>
            </div>

            {/* NAP block — plain text for search engine crawlers */}
            <address
              style={{
                fontFamily: "'Lato', sans-serif",
                fontStyle: "normal",
                fontSize: "0.8125rem",
                lineHeight: 1.7,
                color: "rgba(240,237,230,0.45)",
                marginTop: "1.25rem",
              }}
            >
              <strong style={{ color: "rgba(240,237,230,0.6)", display: "block", marginBottom: "0.2rem" }}>Noland Earthworks, LLC</strong>
              93 Halliburton Road<br />
              Vanleer, TN 37181<br />
              <a
                href="tel:6154064819"
                style={{ color: "rgba(240,237,230,0.45)", textDecoration: "none" }}
              >
                Phone: 615-406-4819
              </a>
            </address>

            <a
              href="/quote"
              className="btn-amber mt-6"
              style={{ fontSize: "0.875rem", padding: "0.625rem 1.5rem", textDecoration: "none" }}
            >
              Get a Free Quote
            </a>

            <a
              href="https://g.page/r/CcglMAMbtQInEBM/review"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-4"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 400,
                fontSize: "0.8rem",
                color: "rgba(240,237,230,0.45)",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#E07B2A";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "rgba(240,237,230,0.45)";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#E07B2A", flexShrink: 0 }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Leave us a Google Review
            </a>
          </div>
        </div>
      </div>

      {/* Email capture strip */}
      <EmailCaptureStrip />

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
          <div className="flex gap-4 items-center">
            {[
              { label: "Terms of Service", href: "/terms-of-service" },
              { label: "Privacy Policy", href: "/privacy-policy" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  fontSize: "0.75rem",
                  color: "rgba(240,237,230,0.35)",
                  textDecoration: "none",
                  letterSpacing: "0.04em",
                }}
              >
                {l.label}
              </a>
            ))}

          </div>
        </div>
      </div>
      </footer>
      <CookieConsentBanner />
    </>
  );
}
