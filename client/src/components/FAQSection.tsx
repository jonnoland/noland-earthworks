/*
 * DESIGN: FAQ accordion — dark background, amber accents, clean expand/collapse
 * 5 common questions covering cost, timeline, equipment damage, regrowth, tree size
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "wouter";

const faqs = [
  {
    question: "What is the difference between forestry mulching and bush hogging?",
    answer:
      "They are not the same thing. Bush hogging knocks vegetation down and leaves the debris on the ground — stalks, stems, and cut material that dries out and becomes a fire hazard or an eyesore. Forestry mulching grinds everything — brush, saplings, small trees — into a fine mulch layer that stays on the ground as natural ground cover. No piles to burn, no debris to haul, no bare dirt. The result is cleaner, the ground is protected, and the job is done in one pass.",
  },
  {
    question: "Do you haul debris or do grading after clearing?",
    answer:
      "No. Forestry mulching leaves the mulched material on-site as ground cover — that is part of what makes it efficient and cost-effective. I do not haul debris, and I do not do grading, leveling, or excavation. If you need grading after clearing, I can point you toward someone who does that work. If you need a clean site for construction, let me know upfront and we can talk through the right approach.",
  },
  {
    question: "Do you give quotes over the phone?",
    answer:
      "Not for anything beyond a straightforward small lot. Acreage, terrain, slope, vegetation density, access, and site conditions all affect the price — and those things cannot be assessed from a description. I do free on-site estimates. Fill out the form, give me a general idea of what you are working with, and I will come out and take a look. Most site visits take 20–30 minutes.",
  },
  {
    question: "How long does a typical job take?",
    answer:
      "Most residential jobs in the 2–5 acre range are completed in a single day. Larger properties or heavier vegetation may run two to three days. I will give you a realistic timeline when I do the site visit — not an optimistic one.",
  },
  {
    question: "What counties do you serve?",
    answer:
      "I serve 35 counties across Middle and West Tennessee, with the core service area covering the counties surrounding greater Nashville and Columbia — Williamson, Maury, Rutherford, Hickman, Lewis, Lawrence, and surrounding areas. If you are unsure whether I cover your location, fill out the quote form and include your county. I will let you know.",
  },
  {
    question: "When is the best time of year to clear land?",
    answer:
      "October through March is the best window. Vegetation is dormant, the ground is firmer, and visibility is better — which means faster, cleaner work. That said, I work year-round. Spring and summer jobs are doable; the main variable is ground saturation after heavy rain. If the ground is too soft to run the machine safely, we reschedule. I will be straight with you about conditions when we talk.",
  },
  {
    question: "Are you licensed and insured?",
    answer:
      "Yes. Fully licensed and insured. I carry general liability coverage on every job. If you need proof of insurance for a project, just ask.",
  },
  {
    question: "What happens after I submit the quote form?",
    answer:
      "You will hear from me within one business day — usually the same day. We will talk briefly about the property, and if it makes sense, I will schedule a free on-site visit. After the visit, I will have a written proposal to you within one to two days. No pressure, no obligation.",
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
