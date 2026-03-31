import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";

const data: ServicePageProps = {
  slug: "land-clearing",
  title: "Land Clearing",
  tagline: "Professional land clearing for residential, commercial, and agricultural properties across Middle Tennessee.",
  heroImage: HERO,
  overviewTitle: "Complete Land Clearing Solutions",
  overviewBody: [
    "Noland Earthworks provides comprehensive land clearing services designed to prepare your property for its next chapter — whether that's a new home, commercial development, agricultural use, or simply reclaiming overgrown land.",
    "Our experienced operators use modern, well-maintained equipment to safely and efficiently remove trees, stumps, brush, rocks, and debris. We work with you to understand your goals and deliver a clean, usable site that meets your specifications.",
    "As a veteran-owned company, we bring the discipline, precision, and work ethic of military service to every job. We show up on time, communicate clearly, and don't leave until the work is done right.",
  ],
  benefits: [
    "Full site clearing including trees, stumps, brush, and debris",
    "Residential, commercial, and agricultural projects",
    "Proper disposal or on-site mulching of cleared material",
    "Grading and leveling available as an add-on",
    "Licensed and fully insured for your protection",
    "Free on-site estimate before any work begins",
    "10% discount for active military and veterans",
  ],
  relatedServices: [
    { title: "Forestry Mulching", slug: "forestry-mulching", description: "Mulch trees, brush, and stumps in a single pass — no hauling required.", heroImage: FORESTRY_HERO },
    { title: "Vegetation Management", slug: "vegetation-management", description: "Control invasive species, overgrowth, and unwanted vegetation.", heroImage: VEGETATION_HERO },
    { title: "Property Maintenance", slug: "property-maintenance", description: "Keep your land clean, safe, and well-maintained year-round.", heroImage: MAINTENANCE_HERO },
  ],
  faqs: [
    {
      question: "How long does land clearing take?",
      answer: "Most residential lots (under 1 acre) can be cleared in a single day. Larger properties or those with dense tree cover may take 2–3 days. We'll give you a realistic timeline during the free estimate.",
    },
    {
      question: "What happens to the trees and debris?",
      answer: "We offer two options: we can haul everything off-site for disposal, or we can use our forestry mulcher to grind vegetation into mulch that stays on your property as ground cover. Mulching is often faster and more cost-effective.",
    },
    {
      question: "Do you handle stump removal?",
      answer: "Yes. Stump grinding is available as an add-on to any land clearing project. We can grind stumps below grade so the area can be graded, seeded, or built upon.",
    },
    {
      question: "Do I need a permit for land clearing in Tennessee?",
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
  usePageTitle("Land Clearing Services — Middle Tennessee");
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <Footer />
    </>
  );
}
