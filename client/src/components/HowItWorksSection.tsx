/*
 * DESIGN: 3-step process section — dark background, numbered steps, amber accents
 * Reduces buyer anxiety by making the process feel simple and transparent.
 */
import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Request a Free Quote",
    description:
      "Fill out our quick form or give us a call. We'll review your property details — acreage, brush density, terrain — and get back to you with a clear, upfront quote. No surprises.",
  },
  {
    number: "02",
    title: "We Show Up & Get to Work",
    description:
      "Our crew arrives on time with the right equipment for your job. Forestry mulchers grind brush, saplings, and overgrowth into mulch that stays on-site to decompose naturally — no burning, no hauling.",
  },
  {
    number: "03",
    title: "Enjoy Your Reclaimed Land",
    description:
      "Most residential jobs are completed in a single day. You walk away with usable, cleared property and the peace of mind that comes from working with a veteran-owned crew that takes pride in every acre.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      style={{
        backgroundColor: "#121212",
        borderTop: "1px solid rgba(224,123,42,0.15)",
      }}
      className="py-20"
    >
      <div className="container">
        {/* Section label */}
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#E07B2A",
            marginBottom: "0.75rem",
          }}
        >
          The Process
        </p>

        {/* Headline */}
        <h2
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            textTransform: "uppercase",
            color: "#F0EDE6",
            marginBottom: "3.5rem",
            lineHeight: 1.1,
          }}
        >
          From Overgrown to Usable
          <br />
          <span style={{ color: "#E07B2A" }}>in 3 Simple Steps.</span>
        </h2>

        {/* Steps */}
        <div className="grid gap-0 md:grid-cols-3 relative">
          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col md:flex-row">
              {/* Step card */}
              <div
                style={{
                  padding: "2rem",
                  borderTop: "3px solid #E07B2A",
                  backgroundColor: "#1a1a1a",
                  flex: 1,
                }}
                className="flex flex-col"
              >
                {/* Step number */}
                <span
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700,
                    fontSize: "3.5rem",
                    lineHeight: 1,
                    color: "rgba(224,123,42,0.18)",
                    marginBottom: "0.5rem",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {step.number}
                </span>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "1.25rem",
                    textTransform: "uppercase",
                    color: "#F0EDE6",
                    letterSpacing: "0.04em",
                    marginBottom: "0.875rem",
                  }}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.9375rem",
                    lineHeight: 1.7,
                    color: "rgba(240,237,230,0.65)",
                  }}
                >
                  {step.description}
                </p>
              </div>

              {/* Arrow connector between steps (desktop only) */}
              {i < steps.length - 1 && (
                <div
                  className="hidden md:flex items-center justify-center"
                  style={{
                    width: "2.5rem",
                    flexShrink: 0,
                    color: "#E07B2A",
                    opacity: 0.5,
                  }}
                >
                  <ArrowRight size={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="/quote"
            className="btn-amber"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            Start Step 1 — Get a Free Quote
          </a>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.875rem",
              color: "rgba(240,237,230,0.45)",
            }}
          >
            Most projects scheduled within 1–2 weeks.
          </span>
        </div>
      </div>
    </section>
  );
}
