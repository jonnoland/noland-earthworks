import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";

const data: ServicePageProps = {
  slug: "land-management",
  title: "Land Management",
  tagline: "Professional land management for residential, commercial, and agricultural properties across Middle & West Tennessee.",
  heroImage: HERO,
  overviewTitle: "Land Management That Gets Results",
  overviewBody: [
    "Land management is about more than just cutting things down. It's about understanding what the land needs to be useful — and executing the work in a way that holds up over time. Whether you're reclaiming pasture that's been overtaken by cedar and brush, preparing a lot for construction, or clearing a property that's been neglected for years, the approach matters as much as the equipment.",
    "Noland Earthworks uses a tracked forestry mulcher as the primary tool for most land management work. It handles heavy brush, saplings, and small timber in a single pass — grinding everything into a mulch layer that stays on the ground as natural cover. No burn piles, no hauling, no bare dirt left behind. For jobs that require full removal, we'll discuss the right method during the site visit and quote accordingly.",
    "Every job starts with a walk of the property. We look at terrain, vegetation density, access points, and anything that could affect the work — slopes, wet areas, proximity to structures or fencing. That's how we quote accurately and avoid surprises on the job. We're veteran-owned and operated, and we run the business the same way: show up when we say we will, do the work as quoted, and don't leave until it's right.",
  ],
  benefits: [
    "Tracked forestry mulcher handles heavy brush, saplings, and timber in a single pass",
    "Works on slopes, wet ground, and difficult terrain wheeled machines can't access",
    "Mulch stays on-site as ground cover — no hauling, no burn piles, no bare soil",
    "Residential lots, agricultural land, pasture reclamation, and site prep",
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

export default function LandClearingPage() {
  usePageTitle(
    "Land Management Services — Middle & West Tennessee | Noland Earthworks",
    "Expert land management services across Middle & West Tennessee. We remove trees, stumps, brush, and debris to prepare your property for building, farming, or recreation. Free estimates.",
    "/services/land-management"
  );
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <MobileCTABar />
      <Footer />
    </>
  );
}
