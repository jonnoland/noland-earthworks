import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useState, useEffect } from "react";

const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";

const data: ServicePageProps = {
  slug: "land-management",
  title: "Land Management & Management in Tennessee",
  tagline: "From overgrown pasture to construction-ready lots — full-service land management for residential, agricultural, and commercial properties across Middle & West Tennessee.",
  heroImage: HERO,
  overviewTitle: "Land Management Built Around What Your Property Needs",
  overviewBody: [
    "Land management covers a wide range of work — reclaiming pasture overtaken by cedar and brush, preparing lots for construction, clearing fence lines that haven't seen daylight in years, managing invasive vegetation, and maintaining properties so they stay clean and usable long after the initial clearing. The scope varies by property, but the standard doesn't.",
    "Noland Earthworks uses a tracked forestry mulcher as the primary tool for most land management work. It handles heavy brush, saplings, and small timber in a single pass — grinding everything into a mulch layer that stays on the ground as natural cover. The tracked platform handles slopes, wet ground, and rough terrain that wheeled equipment can't access. No burn piles, no hauling, no bare dirt left behind.",
    "Every job starts with a walk of the property. We assess terrain, vegetation density, access points, and anything that could affect the work — slopes, wet areas, proximity to structures, fencing, or utilities. That's how we quote accurately and avoid surprises on the job. We're veteran-owned and operated, and we run the business the same way: show up when we say we will, do the work as quoted, and don't leave until it's right.",
  ],
  benefits: [
    "Tracked forestry mulcher handles heavy brush, saplings, and timber in a single pass",
    "Works on slopes, wet ground, and difficult terrain wheeled machines can't access",
    "Mulch stays on-site as ground cover — no hauling, no burn piles, no bare soil",
    "Residential lots, agricultural land, pasture reclamation, and site prep",
    "Stump grinding available as an add-on — priced separately based on count and size",
    "Fence line and boundary clearing available as an add-on to any job",
    "Free on-site estimate — we walk the property before quoting",
    "10% discount for active military and veterans",
  ],
  relatedServices: [
    { title: "Forestry Mulching", slug: "forestry-mulching", description: "Mulch trees, brush, and stumps in a single pass — no hauling required.", heroImage: FORESTRY_HERO },
    { title: "Vegetation Management", slug: "vegetation-management", description: "Control invasive species, overgrowth, and unwanted vegetation.", heroImage: VEGETATION_HERO },
    { title: "Property Maintenance", slug: "property-maintenance", description: "Keep your land clean, safe, and well-maintained year-round.", heroImage: MAINTENANCE_HERO },
  ],
  faqs: [
    {
      question: "How long does land management take?",
      answer: "Most residential lots (under 1 acre) can be cleared in a single day. Larger properties or those with dense tree cover may take 2–3 days. We'll give you a realistic timeline during the free estimate.",
    },
    {
      question: "What happens to the trees and debris?",
      answer: "We offer two options: we can haul everything off-site for disposal, or we can use our forestry mulcher to grind vegetation into mulch that stays on your property as ground cover. Mulching is often faster and more cost-effective.",
    },
    {
      question: "Do you handle stump removal?",
      answer: "Yes. Stump grinding is available as an add-on to any land management project. We can grind stumps below grade so the area can be graded, seeded, or built upon.",
    },
    {
      question: "Do I need a permit for land management in Tennessee?",
      answer: "Permit requirements vary by county and project scope. Some areas require erosion control permits for disturbed acreage. We can advise you on what's typically required in your county, but recommend checking with your local planning office.",
    },
    {
      question: "Can you clear land near a pond, creek, or wetland?",
      answer: "Yes, but work near waterways may require additional permits (TDEC, Army Corps). We're experienced working in sensitive areas and will flag any regulatory considerations during the site visit.",
    },
    {
      question: "Do you offer a military discount?",
      answer: "Absolutely. We offer a 10% discount for active duty military, veterans, and military families. Just mention it when you call or submit your quote request.",
    },
  ],
};

const FORESTRY_MULCHING_FAQS = [
  {
    q: "What is forestry mulching?",
    a: "Forestry mulching is a land management method that uses a single machine — a tracked forestry mulcher — to cut, grind, and mulch trees, brush, and vegetation in one pass. The mulched material is spread back onto the ground as a natural cover layer. There are no burn piles, no debris hauling, and no bare soil left behind. It is one of the most efficient and environmentally sound methods for clearing land.",
  },
  {
    q: "How is forestry mulching different from bush hogging?",
    a: "Bush hogging knocks vegetation down and leaves debris on the ground. Forestry mulching grinds everything — including woody brush, saplings, and small trees — into fine mulch that decomposes naturally. The result is a clean, finished property rather than a field of flattened stalks and debris. Forestry mulching also handles much heavier vegetation than a bush hog can manage.",
  },
  {
    q: "What size trees can a forestry mulcher handle?",
    a: "Our tracked forestry mulcher handles trees up to approximately 6–8 inches in diameter with ease. Larger trees can be processed depending on species and condition. For timber-grade trees or large hardwoods, we assess on a case-by-case basis during the site visit. The machine is purpose-built for heavy brush, dense cedar thickets, and mixed woodland — not just light overgrowth.",
  },
  {
    q: "Does forestry mulching work on slopes and wet ground?",
    a: "Yes. The tracked platform is specifically designed for terrain that wheeled equipment cannot safely access. It handles steep slopes, soft ground, creek banks, and wet areas without rutting or getting stuck. This is one of the primary advantages of a tracked forestry mulcher over wheeled alternatives.",
  },
  {
    q: "Is forestry mulching good for pasture reclamation?",
    a: "It is one of the best tools available for reclaiming overgrown pasture. Cedar trees, briars, and invasive brush that have taken over a field can be cleared in a single pass, leaving the ground covered with mulch that breaks down over time. After clearing, the land can be overseeded or left to recover naturally. We work with farmers and landowners across Middle Tennessee on pasture reclamation regularly.",
  },
  {
    q: "What does forestry mulching cost in Tennessee?",
    a: "Pricing depends on acreage, vegetation density, terrain, and site conditions. We do not publish flat rates because every property is different. The only accurate way to quote a forestry mulching job is a walk of the property. We offer free on-site estimates throughout Middle and West Tennessee. Visit nolandearthworks.com to request one.",
  },
  {
    q: "How long does a forestry mulching job take?",
    a: "A typical residential lot under one acre can be completed in a single day. Larger properties — 5 to 20 acres — generally take 2 to 4 days depending on vegetation density. We give realistic timelines during the estimate and stick to them.",
  },
  {
    q: "Do you offer forestry mulching near Nashville, Franklin, or Columbia?",
    a: "Yes. Noland Earthworks serves the greater Nashville area and surrounding counties including Williamson, Maury, Marshall, Rutherford, Wilson, Cheatham, Dickson, Lawrence, Lincoln, Giles, and more. We are based in Middle Tennessee and operate throughout the region.",
  },
  {
    q: "Is Noland Earthworks a veteran-owned forestry mulching company?",
    a: "Yes. Noland Earthworks is veteran-owned and operated. Jon Noland is the owner, operator, and the one showing up on your property for every job. There is no subcontracted crew on the other end of a phone — you deal directly with the person doing the work.",
  },
  {
    q: "What is left on the ground after forestry mulching?",
    a: "A layer of wood chip mulch made from the cleared vegetation. It is not a pile — the material is spread evenly across the cleared area by the machine as it works. The mulch layer suppresses weed regrowth, reduces erosion, and breaks down naturally over time. Most customers find it leaves the property looking clean and finished rather than stripped bare.",
  },
];

function ForestryMulchingFaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  // Inject FAQPage JSON-LD for the forestry mulching section
  useEffect(() => {
    const id = "forestry-mulching-faq-schema";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": FORESTRY_MULCHING_FAQS.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })),
    };
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, []);

  return (
    <section
      style={{
        backgroundColor: "#0a1a0a",
        paddingTop: "5rem",
        paddingBottom: "5rem",
        borderTop: "1px solid rgba(224,123,42,0.2)",
      }}
    >
      <div className="container">
        <div className="section-label mb-4">Forestry Mulching</div>
        <h2
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#F0EDE6",
            marginBottom: "0.75rem",
          }}
        >
          Forestry Mulching — Questions &amp; Answers
        </h2>
        <p
          style={{
            color: "#9a9a8a",
            fontSize: "1rem",
            marginBottom: "2.5rem",
            maxWidth: "640px",
          }}
        >
          Everything landowners ask before booking a forestry mulching job in Middle Tennessee.
        </p>
        <div className="max-w-3xl" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {FORESTRY_MULCHING_FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                borderBottom: "1px solid rgba(240,237,230,0.1)",
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1.25rem 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "1rem",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontWeight: 600,
                    fontSize: "1.05rem",
                    letterSpacing: "0.02em",
                    color: open === i ? "#E07B2A" : "#F0EDE6",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                  }}
                >
                  {faq.q}
                </span>
                <span
                  style={{
                    color: "#E07B2A",
                    fontSize: "1.25rem",
                    lineHeight: 1,
                    flexShrink: 0,
                    transition: "transform 0.2s",
                    transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
              {open === i && (
                <p
                  style={{
                    color: "#c8c4b8",
                    fontSize: "0.975rem",
                    lineHeight: 1.75,
                    paddingBottom: "1.25rem",
                    margin: 0,
                  }}
                >
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandClearingPage() {
  usePageTitle(
    "Land Management in Tennessee | Noland Earthworks",
    "Veteran-owned land management serving Nashville, Franklin, Murfreesboro, Clarksville, and 35 counties in Middle & West Tennessee. Lot clearing, pasture reclamation, site prep, and fence line clearing. Free on-site estimates.",
    "/services/land-management"
  );
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <ForestryMulchingFaqSection />
      <MobileCTABar />
      <Footer />
    </>
  );
}
