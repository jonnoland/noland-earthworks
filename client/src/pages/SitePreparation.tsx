import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";

const data: ServicePageProps = {
  slug: "site-preparation",
  title: "Site Preparation in Tennessee",
  tagline:
    "Clear the land, remove the vegetation, and get your site ready for the next phase — construction, development, or agricultural use — across Middle & West Tennessee.",
  heroImage: HERO,
  overviewTitle: "Site Preparation That Sets the Stage for What Comes Next",
  overviewBody: [
    "Site preparation is the first step in any construction or development project, and it has to be done right before anything else can move forward. That means removing trees, brush, stumps, and ground-level vegetation so the site is clean, accessible, and ready for the contractor, surveyor, or builder who comes in after us.",
    "Noland Earthworks uses a tracked forestry mulcher as the primary tool for site prep work. The machine grinds trees, brush, and stumps into a fine mulch layer in a single pass — no burn piles, no hauling, no bare soil left exposed to erosion. The tracked platform handles slopes, wet ground, and dense timber that wheeled equipment can't safely navigate, which matters on Middle Tennessee terrain where hillsides, creek bottoms, and clay-heavy soil are the norm.",
    "Site prep is not grading. We clear and grind the vegetation. Grading, excavation, and earthmoving are separate trades — we'll be clear about what we do and don't do so there are no surprises on your project timeline. If you need grading after clearing, we can point you toward the right contractors in the area.",
    "Every site prep job starts with a walk of the property. We assess what's there, what needs to come out, and what the finished site needs to look like for the next phase of work. That's how we quote accurately and avoid surprises on the job.",
  ],
  benefits: [
    "Tracked forestry mulcher clears trees, brush, and stumps in a single pass",
    "Mulch stays on-site as ground cover — no hauling, no burn piles, no bare soil",
    "Works on slopes, wet ground, and difficult terrain wheeled machines can't access",
    "Residential lots, development sites, agricultural land, and commercial parcels",
    "Stump grinding available as an add-on — priced separately based on count and size",
    "Fence line and boundary clearing available as an add-on to any job",
    "Free on-site estimate — we walk the property before quoting",
    "10% discount for active military and veterans",
  ],
  faqs: [
    {
      question: "Does site preparation include grading or excavation?",
      answer:
        "No. Site preparation through Noland Earthworks covers vegetation clearing — trees, brush, stumps, and ground-level growth. Grading, excavation, and earthmoving are separate trades. We'll be upfront about this from the first conversation so your project timeline isn't disrupted.",
    },
    {
      question: "What size lots do you handle for site prep?",
      answer:
        "We work on lots from about 1 acre up to 50+ acres. Smaller residential lots in the 1–5 acre range are common for new home construction. Larger parcels for subdivision development, agricultural use, or commercial projects are handled the same way — we walk the site, assess what's there, and quote based on actual conditions.",
    },
    {
      question: "Do you remove stumps during site prep?",
      answer:
        "The forestry mulcher grinds stumps down to ground level as part of the clearing pass. This is different from full stump extraction, which pulls the root ball out of the ground. For most site prep applications — construction pads, driveways, agricultural use — grinding to grade is sufficient. If you need complete root removal, that's a separate service we can discuss during the site visit.",
    },
    {
      question: "How long does site preparation take?",
      answer:
        "A 1–3 acre residential lot typically takes one day. Larger commercial or development parcels are quoted with a realistic timeline based on vegetation density, terrain, and access. We don't give phone estimates on complex sites — the site visit is how we give you an accurate number.",
    },
    {
      question: "Can you work near structures, utilities, or property lines?",
      answer:
        "Yes, with care. We work close to structures, fencing, and property lines regularly. During the site walk, we identify any areas that require extra attention — proximity to foundations, buried utilities, septic systems, or neighboring property. We flag those before we start and work accordingly.",
    },
    {
      question: "Do you haul away the cleared material?",
      answer:
        "No. The forestry mulcher grinds everything into a mulch layer that stays on the ground. This is one of the primary advantages of the method — no debris piles, no haul-away cost, and the mulch layer protects the soil from erosion while the next phase of work is being planned. If you need the site completely clear of organic material, that's a different scope and we'll discuss it during the estimate.",
    },
    {
      question: "What counties do you serve for site preparation?",
      answer:
        "We serve 35 counties across Middle and West Tennessee, including Davidson, Williamson, Rutherford, Maury, Dickson, Montgomery, Cheatham, Robertson, Sumner, Wilson, and all surrounding counties. Call 615-406-4819 or submit a quote request and we'll confirm your location is in our service area.",
    },
  ],
  relatedServices: [
    {
      title: "Forestry Mulching",
      slug: "forestry-mulching",
      description: "Mulch trees, brush, and stumps in a single pass — no hauling required.",
      heroImage: FORESTRY_HERO,
    },
    {
      title: "Land Management",
      slug: "land-management",
      description: "Reclaim pasture, clear fence lines, and restore usable acreage.",
      heroImage: LAND_HERO,
    },
    {
      title: "Vegetation Management",
      slug: "vegetation-management",
      description: "Control invasive species, overgrowth, and unwanted vegetation.",
      heroImage: VEGETATION_HERO,
    },
  ],
};

export default function SitePreparationPage() {
  usePageTitle(
    "Site Preparation Services — Tennessee | Noland Earthworks",
    "Professional site preparation for residential, commercial, and agricultural properties across Middle & West Tennessee. Veteran-owned. Free on-site estimates.",
    "/services/site-preparation"
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ backgroundColor: "#121212", color: "#F0EDE6", minHeight: "100vh" }}>
      <Navbar />
      <ServicePageLayout {...data} />
      <Footer />
      <MobileCTABar />
    </div>
  );
}
