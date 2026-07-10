import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link } from "wouter";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  category: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqCategory[] = [
  {
    category: "About Forestry Mulching",
    items: [
      {
        question: "What is forestry mulching?",
        answer:
          "Forestry mulching is a land management method that uses a purpose-built machine equipped with a high-speed drum mulcher to grind trees, brush, saplings, vines, and stumps directly into mulch on the ground. The mulch stays in place as natural ground cover — it does not need to be hauled away, burned, or piled. The result is clean, usable land with no erosion, no debris, and no secondary cleanup required.",
      },
      {
        question: "How is forestry mulching different from bush hogging?",
        answer:
          "Bush hogging cuts vegetation down and leaves the debris on the ground. Forestry mulching grinds everything — trees, brush, stumps, and vines — into fine mulch that stays as natural ground cover. The finish quality is dramatically different. Forestry mulching leaves land that is immediately walkable, drivable, and ready for its next use. Bush hogging leaves debris that still needs to be dealt with.",
      },
      {
        question: "What size trees can a forestry mulcher handle?",
        answer:
          "The tracked forestry mulcher Noland Earthworks operates handles trees up to 6–8 inches in diameter in a single pass. Larger trees can be processed with multiple passes. For most residential and agricultural clearing jobs in Middle Tennessee — cedar thickets, overgrown brush, saplings, and small hardwoods — the machine handles everything in one pass without stopping.",
      },
      {
        question: "Does forestry mulching work on slopes and wet ground?",
        answer:
          "Yes. Noland Earthworks operates a tracked machine, not a wheeled mulcher. The tracked platform handles steep slopes, creek bottoms, and wet clay ground that wheeled machines cannot safely navigate. This is a significant capability difference on Middle Tennessee terrain, which frequently includes hillsides, creek bottoms, and clay-heavy soil that stays wet after rain.",
      },
      {
        question: "What is left on the ground after forestry mulching?",
        answer:
          "A layer of fine wood chip mulch that covers the ground naturally. The mulch suppresses weed regrowth, prevents erosion, retains moisture, and decomposes over time to improve soil quality. There are no debris piles, no stumps sticking up, and no bare soil. The land is immediately accessible after the work is done.",
      },
      {
        question: "Does forestry mulching kill the stumps and roots?",
        answer:
          "The mulcher grinds stumps down to ground level or slightly below. It does not remove the root system. For most applications — pasture reclamation, lot clearing, residential land — this is sufficient. Some aggressive species like eastern red cedar and privet will not regrow from a ground-level stump. Others may require follow-up treatment if regrowth is a concern.",
      },
    ],
  },
  {
    category: "Common Use Cases",
    items: [
      {
        question: "Is forestry mulching good for pasture reclamation?",
        answer:
          "Yes — pasture reclamation is one of the most common requests. Farmers and landowners reclaiming fields overtaken by cedar trees, persimmon, locust, and brush use forestry mulching because it clears the vegetation without disturbing the soil. The mulch layer breaks down and improves the ground for grass to return. It is faster, cleaner, and less disruptive than traditional clearing methods.",
      },
      {
        question: "Can you clear cedar thickets with a forestry mulcher?",
        answer:
          "Yes. Eastern red cedar is one of the most common clearing requests in Middle Tennessee. Cedar spreads aggressively and can take over a pasture in a few years. The tracked forestry mulcher handles dense cedar stands efficiently, grinding trees in a single pass. Noland Earthworks has cleared cedar thickets across Middle and West Tennessee for pasture reclamation, fence line restoration, and property cleanup.",
      },
      {
        question: "Can you clear fence lines with a forestry mulcher?",
        answer:
          "Yes. Overgrown fence lines with brush, vines, and small trees encroaching on the wire are a common job. The tracked mulcher clears fence lines cleanly without damaging the fence. The operator works close to the wire and controls the machine precisely. After clearing, the fence line is clean and the wire is accessible for inspection and repair.",
      },
      {
        question: "Is forestry mulching good for lot clearing before construction?",
        answer:
          "Yes. Forestry mulching is an efficient method for residential and commercial lot clearing before construction. The machine clears trees, brush, and stumps in one pass, leaving the ground ready for grading without debris piles. Builders and developers use it for site prep because it is faster than traditional clearing and does not require debris hauling or burning.",
      },
      {
        question: "Can you clear a right-of-way or driveway with a forestry mulcher?",
        answer:
          "Yes. Right-of-way clearing, driveway clearing, and utility corridor maintenance are common applications. The tracked machine works in tight corridors and handles brush, saplings, and small trees along access roads and utility easements. The mulch stays in place, which is often preferred over bare soil on access roads.",
      },
    ],
  },
  {
    category: "Pricing and Estimates",
    items: [
      {
        question: "How much does forestry mulching cost in Tennessee?",
        answer:
          "Forestry mulching pricing in Tennessee depends on acreage, vegetation density, terrain, and site access. Noland Earthworks provides free on-site estimates — accurate quotes require a site visit. Visit nolandearthworks.com/pricing for general rate guidance, or request a quote at nolandearthworks.com/quote. We do not give phone quotes on complex terrain because the price you receive should reflect the actual job.",
      },
      {
        question: "Do you give phone quotes or ballpark estimates?",
        answer:
          "Not on complex terrain. Accurate pricing requires a site visit. Vegetation density, terrain type, slope, access, and proximity to structures all affect the price significantly. Two properties with the same acreage can have very different costs. We visit the site, assess the conditions, and give you a firm price before any work begins.",
      },
      {
        question: "What factors affect the cost of forestry mulching?",
        answer:
          "The main cost factors are: total acreage, vegetation density and type (light brush vs. dense cedar thicket), terrain and slope, site access (can the machine get in easily), proximity to structures, fencing, or utilities, and any site-specific conditions like standing water or rock. Noland Earthworks evaluates all of these on a site visit before quoting.",
      },
      {
        question: "Is there a minimum job size?",
        answer:
          "There is no published minimum, but very small suburban lots (under a quarter acre) typically do not justify the equipment and mobilization cost. The best-fit jobs are in the 2–20 acre range — large enough to be efficient, small enough to complete in a day or two. Contact us and we will be straightforward about whether your job is a good fit.",
      },
    ],
  },
  {
    category: "The Noland Earthworks Process",
    items: [
      {
        question: "How does the quote process work?",
        answer:
          "You contact us through the website or by phone. We respond the same day or next morning. If the job warrants it, we schedule a site visit — usually within a few days. After the visit, we deliver a written proposal within 1–2 days. Once you accept, we schedule the work. The typical cycle from first contact to job completion is 1–3 weeks, depending on the calendar and weather.",
      },
      {
        question: "Do you do the work yourself or use subcontractors?",
        answer:
          "Jon Noland operates the machine himself on every job. There is no crew variation, no quality inconsistency, and no communication gap between the person you talk to and the person doing the work. Trusted subcontractors are used on a per-project basis for specific tasks, but the forestry mulcher is always operated by Jon.",
      },
      {
        question: "What does the proposal include?",
        answer:
          "Every proposal includes a project description, scope of work in plain language, inclusions and exclusions, site-specific conditions and assumptions, estimated timeline, total price, and payment terms. Nothing is left vague.",
      },
      {
        question: "Does clearing include grading or leveling?",
        answer:
          "No. Forestry mulching and land management do not include grading, leveling, or excavation. These are separate scopes of work. If you need grading after clearing, we can refer you to a grading contractor. We are upfront about this so there are no surprises.",
      },
      {
        question: "Does clearing include debris hauling?",
        answer:
          "Forestry mulching does not produce debris to haul — the machine grinds everything into mulch that stays on the ground. For other clearing methods, debris removal is a separate scope and is not included in the base clearing price unless specifically quoted.",
      },
      {
        question: "What is the best time of year for forestry mulching in Tennessee?",
        answer:
          "October through March is peak season. Dormant vegetation is easier to clear, the ground is firmer, and visibility is better without full leaf cover. Spring and summer work is available but heat, ground saturation, and active growth can complicate scheduling. We work year-round — weather and ground conditions are the main scheduling variables.",
      },
    ],
  },
  {
    category: "About Noland Earthworks",
    items: [
      {
        question: "Is Noland Earthworks veteran-owned?",
        answer:
          "Yes. Noland Earthworks is owned and operated by Jon Noland, a U.S. Army veteran based in Vanleer, Tennessee. Veteran-owned and operated — not just veteran-founded. Jon does the work himself on every job.",
      },
      {
        question: "Is Noland Earthworks licensed and insured?",
        answer:
          "Yes. Noland Earthworks is fully licensed and insured. We carry the coverage required for commercial land management and forestry mulching work in Tennessee.",
      },
      {
        question: "What counties do you serve?",
        answer:
          "Noland Earthworks serves 35 counties across Middle and West Tennessee. Core counties include Davidson (Nashville), Williamson (Franklin, Brentwood), Rutherford (Murfreesboro), Wilson (Lebanon), Maury (Columbia, Spring Hill), Dickson, Cheatham, Robertson, Sumner, Montgomery (Clarksville), Bedford (Shelbyville), Marshall (Lewisburg), Hickman, Lewis, Perry, Wayne, Giles (Pulaski), Lincoln (Fayetteville), and Lawrence (Lawrenceburg), plus West Tennessee counties including Madison (Jackson), Carroll, Chester, Decatur, Gibson, Hardin, Henderson, Henry, Houston, Humphreys, Moore, Stewart, Trousdale, Cannon, and Weakley.",
      },
      {
        question: "Do you serve the Nashville area?",
        answer:
          "Yes. Noland Earthworks serves Davidson County (Nashville) and the surrounding metro counties including Williamson (Franklin, Brentwood), Rutherford (Murfreesboro), Wilson (Lebanon), Cheatham, Robertson, and Sumner counties.",
      },
      {
        question: "Do you serve the Columbia, TN area?",
        answer:
          "Yes. Maury County (Columbia, Spring Hill, Mt. Pleasant) is one of the core service areas. Noland Earthworks regularly works throughout Maury, Marshall, Hickman, Lewis, and surrounding counties.",
      },
      {
        question: "How do I request a quote?",
        answer:
          "Visit nolandearthworks.com/quote and fill out the request form. Include your location, acreage, and a brief description of what you need cleared. We respond the same day or next morning and schedule a site visit if the job warrants one.",
      },
    ],
  },
];

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        className="w-full text-left py-4 flex items-start justify-between gap-4 hover:text-amber-400 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-medium text-base leading-snug">{item.question}</span>
        {open ? (
          <ChevronUp className="shrink-0 mt-0.5 text-amber-400" size={18} />
        ) : (
          <ChevronDown className="shrink-0 mt-0.5 text-white/50" size={18} />
        )}
      </button>
      {open && (
        <div className="pb-5 text-white/75 text-sm leading-relaxed">
          {item.answer}
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  usePageTitle(
    "Forestry Mulching FAQ | Noland Earthworks Tennessee",
    "Answers to the most common questions about forestry mulching, land management, pricing, and the Noland Earthworks process in Middle and West Tennessee.",
    "/faq"
  );

  // Inject FAQPage JSON-LD schema for all Q&As
  useEffect(() => {
    const allItems = FAQ_DATA.flatMap((cat) => cat.items);
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: allItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-page-schema";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("faq-page-schema");
      if (existing) document.head.removeChild(existing);
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#121212", color: "#F0EDE6" }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">
            Frequently Asked Questions
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Forestry Mulching &amp; Land Management FAQ
          </h1>
          <p className="text-white/65 text-lg max-w-2xl mx-auto">
            Straight answers to the questions we hear most from landowners, farmers, and developers across Middle and West Tennessee.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {FAQ_DATA.map((cat) => (
            <div key={cat.category}>
              <h2 className="text-xl font-bold text-amber-400 mb-4 pb-2 border-b border-amber-400/30">
                {cat.category}
              </h2>
              <div>
                {cat.items.map((item) => (
                  <FaqAccordionItem key={item.question} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-4">
        <div className="max-w-2xl mx-auto text-center bg-white/5 border border-white/10 rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-white/65 mb-7">
            The best way to get a straight answer on your specific property is a site visit. It is free, and you will leave with a firm price — not a ballpark.
          </p>
          <Link
            href="/quote"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Request a Free Estimate
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
