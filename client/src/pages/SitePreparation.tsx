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
  title: "Vegetation Work Before Your Next Project in Tennessee",
  tagline:
    "Forestry mulching and land management for suitable vegetation work before a separately scoped next phase across Middle & West Tennessee.",
  heroImage: HERO,
  overviewTitle: "Vegetation Work Before the Next Phase",
  overviewBody: [
    "Some properties need vegetation work before a separately scoped contractor begins the next phase. Noland Earthworks evaluates brush, saplings, small trees, access, terrain, and the written scope through a Site Visit before recommending Forestry Mulching or Land Management.",
    "A tracked forestry mulcher processes suitable brush, saplings, and small trees into mulch that typically remains on site. The tracked platform is built for dense growth, slopes, and challenging ground conditions common across Middle Tennessee.",
    "This work is not grading, excavation, earthmoving, hauling, road construction, or final building-pad preparation. Those are separate trades and must be arranged with the appropriate contractor.",
    "Every project starts with a Site Visit so the written proposal can identify the vegetation work included, property conditions, access needs, and exclusions before scheduling.",
  ],
  benefits: [
    "Tracked forestry mulcher clears trees, brush, and stumps in a single pass",
    "Mulch stays on-site as ground cover — no hauling, no burn piles, no bare soil",
    "Works on slopes, wet ground, and difficult terrain wheeled machines can't access",
    "Residential lots, development sites, agricultural land, and commercial parcels",
    "Stump grinding available as an add-on — priced separately based on count and size",
    "Fence line and boundary clearing available as an add-on to any job",
    "Site Visit and written proposal before scheduling",
    "10% discount for active military and veterans",
  ],
  faqs: [
    {
      question: "Does this vegetation work include grading or excavation?",
      answer:
        "No. Noland Earthworks handles suitable vegetation work through Forestry Mulching and Land Management. Grading, excavation, and earthmoving are separate trades. The Site Visit and written proposal identify the work included before scheduling.",
    },
    {
      question: "What size properties fit this vegetation work?",
      answer:
        "We work on lots from about 1 acre up to 50+ acres. Smaller residential lots in the 1–5 acre range are common for new home construction. Larger parcels for subdivision development, agricultural use, or commercial projects are handled the same way — we walk the site, assess what's there, and quote based on actual conditions.",
    },
    {
      question: "Do you remove stumps during Forestry Mulching?",
      answer:
        "The forestry mulcher processes suitable stumps near grade as part of the vegetation work. This is different from full stump or root extraction, which is outside our standard scope. The Site Visit identifies what is practical for the property and written proposal.",
    },
    {
      question: "How long does the vegetation work take?",
      answer:
        "Timing depends on vegetation density, terrain, access, weather, and the agreed written scope. Complex sites require a Site Visit before we can provide a realistic timeline and proposal.",
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
      question: "What counties do you serve for this work?",
      answer:
        "We serve 35 counties across Middle and West Tennessee. Request a Site Visit and we will confirm whether your property is in the approved service area.",
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
    "Vegetation Work Before Your Next Project — Tennessee | Noland Earthworks",
    "Forestry mulching and land management for suitable vegetation work across Middle and West Tennessee. A Site Visit confirms scope and exclusions.",
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
