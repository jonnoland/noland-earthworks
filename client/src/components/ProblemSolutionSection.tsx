/*
 * DESIGN: Problem/Solution framing — dark background, two-column layout
 * Left: Pain points customers recognize. Right: How Noland solves each.
 */
import { CheckCircle2, XCircle } from "lucide-react";

const problems = [
  {
    problem: "My property is disappearing into brush and briars.",
    solution: "Industrial forestry mulchers grind it all down in a single pass — no burning, no hauling.",
  },
  {
    problem: "My land is unusable and unsafe for livestock or family.",
    solution: "We restore usable acreage fast, often completing residential jobs in a single day.",
  },
  {
    problem: "I've gotten quotes but can't find anyone reliable.",
    solution: "Veteran-owned means we show up when we say we will, every time. No excuses.",
  },
  {
    problem: "The terrain is too steep or overgrown for standard equipment.",
    solution: "Our equipment handles dense brush, steep slopes, and hard-to-reach areas across all 35 counties.",
  },
];

export default function ProblemSolutionSection() {
  return (
    <section
      id="problem-solution"
      style={{ backgroundColor: "#0f0f0f", borderTop: "1px solid rgba(224,123,42,0.15)" }}
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
          Sound Familiar?
        </p>

        {/* Headline */}
        <h2
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
            textTransform: "uppercase",
            color: "#F0EDE6",
            marginBottom: "3rem",
            maxWidth: "560px",
            lineHeight: 1.1,
          }}
        >
          We've Heard It Before.
          <br />
          <span style={{ color: "#E07B2A" }}>Here's How We Fix It.</span>
        </h2>

        {/* Problem/Solution pairs */}
        <div className="grid gap-6 md:grid-cols-2">
          {problems.map(({ problem, solution }, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid rgba(240,237,230,0.08)",
                borderRadius: "4px",
                padding: "1.75rem",
              }}
            >
              {/* Problem */}
              <div className="flex gap-3 mb-4">
                <XCircle
                  size={20}
                  style={{ color: "#c0392b", flexShrink: 0, marginTop: "2px" }}
                />
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.9375rem",
                    color: "rgba(240,237,230,0.55)",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  "{problem}"
                </p>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: "1px",
                  backgroundColor: "rgba(224,123,42,0.2)",
                  marginBottom: "1rem",
                }}
              />

              {/* Solution */}
              <div className="flex gap-3">
                <CheckCircle2
                  size={20}
                  style={{ color: "#E07B2A", flexShrink: 0, marginTop: "2px" }}
                />
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.9375rem",
                    color: "rgba(240,237,230,0.85)",
                    lineHeight: 1.6,
                    fontWeight: 500,
                  }}
                >
                  {solution}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <a
            href="/quote"
            className="btn-amber"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            Get Your Free Quote Today
          </a>
        </div>
      </div>
    </section>
  );
}
