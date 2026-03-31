import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "vegetation-management",
  title: "Vegetation Management",
  tagline: "Strategic, ongoing control of unwanted vegetation — protecting your property, infrastructure, and land value.",
  heroImage: HERO,
  overviewTitle: "Proactive Vegetation Control",
  overviewBody: [
    "Vegetation management is the ongoing practice of controlling unwanted plant growth to protect property, infrastructure, and land value. Unlike one-time clearing, it's a strategic, recurring service that keeps overgrowth from reclaiming your land.",
    "Noland Earthworks provides vegetation management for a wide range of applications: fence lines, rights-of-way, utility corridors, pond banks, pastures, and commercial properties. We use mechanical methods — mulching, mowing, and cutting — to provide effective, environmentally responsible control.",
    "Whether you're dealing with invasive species, encroaching brush, or simply maintaining cleared areas, our team develops a management plan tailored to your property's specific needs and your long-term goals.",
  ],
  benefits: [
    "Prevents re-establishment of brush and invasive species",
    "Protects fence lines, roads, and infrastructure from overgrowth",
    "Maintains pasture productivity and grazing capacity",
    "Reduces fire risk by managing fuel loads",
    "Improves property aesthetics and curb appeal",
    "Mechanical methods — no herbicides required",
    "Flexible scheduling: one-time or recurring maintenance",
  ],
  relatedServices: [
    { title: "Land Clearing", slug: "land-clearing", description: "Full site clearing of trees, stumps, brush, and debris.", heroImage: LAND_HERO },
    { title: "Forestry Mulching", slug: "forestry-mulching", description: "Mulch trees, brush, and stumps in a single pass — no hauling required.", heroImage: FORESTRY_HERO },
    { title: "Property Maintenance", slug: "property-maintenance", description: "Keep your land clean, safe, and well-maintained year-round.", heroImage: MAINTENANCE_HERO },
  ],
  faqs: [
    {
      question: "How often should vegetation management be done?",
      answer: "It depends on the vegetation type and your goals. For active pasture maintenance, 2–3 times per year is common. For fence lines and rights-of-way, once or twice a year is often sufficient. We'll recommend a schedule based on your property during the site visit.",
    },
    {
      question: "Can you control kudzu and other invasive species?",
      answer: "Mechanical management (mulching and cutting) significantly reduces invasive species like kudzu, privet, and multiflora rose. However, most invasives will re-sprout from roots and require repeat treatments. A recurring management program is the most effective long-term approach.",
    },
    {
      question: "Do you use herbicides?",
      answer: "Our primary methods are mechanical — mulching, cutting, and mowing. We do not apply herbicides. If chemical treatment is needed for stubborn invasives, we can recommend licensed applicators to work alongside our mechanical services.",
    },
    {
      question: "What's the difference between vegetation management and land clearing?",
      answer: "Land clearing is a one-time, comprehensive removal of all vegetation from a site. Vegetation management is an ongoing service focused on controlling regrowth and maintaining cleared areas. Many clients start with land clearing and then transition to a vegetation management program.",
    },
    {
      question: "Can you manage vegetation around my pond or creek?",
      answer: "Yes. We're experienced working near water features. Mechanical clearing near waterways is often preferred over chemical methods. Work within certain setbacks of streams may require permits, which we'll identify during the site visit.",
    },
    {
      question: "Do you offer contracts for recurring service?",
      answer: "Yes. We offer seasonal and annual service agreements that provide priority scheduling, consistent crews, and discounted per-visit rates compared to one-time service calls. Contact us to discuss a program for your property.",
    },
  ],
};

export default function VegetationManagementPage() {
  usePageTitle("Vegetation Management Services — Middle Tennessee");
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <Footer />
    </>
  );
}
