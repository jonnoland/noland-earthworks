/*
 * DESIGN: FAQ accordion — dark background, amber accents, clean expand/collapse
 * 5 common questions covering cost, timeline, equipment damage, regrowth, tree size
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "wouter";

const faqs = [
  {
    question: "How much does forestry mulching or land management cost?",
    answer:
      "Pricing depends on acreage, brush density, terrain, and the service type. Most residential jobs range from a few hundred to a few thousand dollars. We provide free, no-obligation quotes — fill out our quote form or call us at 615-406-4819 and we'll give you a clear, upfront number before any work begins.",
  },
  {
    question: "How long does a typical job take?",
    answer:
      "Most residential land management and forestry mulching jobs are completed in a single day. Larger commercial or heavily overgrown properties may take 2–3 days. We'll give you a realistic timeline when we quote the job — no surprises.",
  },
  {
    question: "Will your equipment damage my existing trees or lawn?",
    answer:
      "Our operators are trained to work precisely around trees, fences, and structures you want to keep. Forestry mulchers grind brush and small trees into mulch that stays on-site — there's no heavy dragging or dozer work that tears up topsoil. We'll walk the property with you before starting to mark anything you want preserved.",
  },
  {
    question: "Will the brush and trees grow back after mulching?",
    answer:
      "Some regrowth is natural, especially from root systems of invasive species like honeysuckle or privet. For most jobs, the mulch layer left behind actually suppresses regrowth by blocking sunlight. For persistent invasives, we can discuss follow-up treatments or herbicide application as part of a maintenance plan.",
  },
  {
    question: "What size trees can you clear?",
    answer:
      "Our forestry mulchers handle trees up to 8–10 inches in diameter efficiently. For larger hardwoods, we can discuss a combined approach — felling the large trees first, then mulching the remaining brush and stumps. Every property is different, so we assess on-site before quoting.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section
      id="faq"
      style={{
        backgroundColor: "#0f0f0f",
        borderTop: "1px solid rgba(224,123,42,0.15)",
      }}
      className="py-20"
    >
      <div className="container">
        <div className="max-w-3xl mx-auto">
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
            Common Questions
          </p>

          {/* Headline */}
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "2.5rem",
              lineHeight: 1.1,
            }}
          >
            Answers Before You Call.
          </h2>

          {/* FAQ accordion */}
          <div className="flex flex-col gap-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: "#1a1a1a",
                  border: openIndex === i
                    ? "1px solid rgba(224,123,42,0.4)"
                    : "1px solid rgba(240,237,230,0.07)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  transition: "border-color 0.2s ease",
                }}
              >
                {/* Question button */}
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 text-left"
                  style={{
                    padding: "1.25rem 1.5rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: openIndex === i ? "#E07B2A" : "#F0EDE6",
                      lineHeight: 1.4,
                      transition: "color 0.2s ease",
                    }}
                  >
                    {faq.question}
                  </span>
                  <ChevronDown
                    size={20}
                    style={{
                      color: "#E07B2A",
                      flexShrink: 0,
                      transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s ease",
                    }}
                  />
                </button>

                {/* Answer */}
                <div
                  style={{
                    maxHeight: openIndex === i ? "400px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.3s ease",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.9375rem",
                      lineHeight: 1.75,
                      color: "rgba(240,237,230,0.7)",
                      padding: "0 1.5rem 1.25rem",
                    }}
                  >
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
            style={{
              padding: "1.5rem",
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(224,123,42,0.2)",
              borderRadius: "4px",
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                  color: "#F0EDE6",
                  marginBottom: "0.25rem",
                }}
              >
                Still have questions?
              </p>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.875rem",
                  color: "rgba(240,237,230,0.5)",
                }}
              >
                Call us at{" "}
                <a
                  href="tel:6154064819"
                  style={{ color: "#E07B2A", textDecoration: "none", fontWeight: 700 }}
                >
                  615-406-4819
                </a>{" "}
                or get a free quote online.
              </p>
            </div>
            <Link
              href="/quote"
              className="btn-amber"
              style={{ textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Get a Free Quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
