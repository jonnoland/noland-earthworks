import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "vegetation-management",
  title: "Vegetation Management in Tennessee",
  tagline: "Strategic, ongoing control of unwanted vegetation — protecting your property, infrastructure, and land value.",
  heroImage: HERO,
  overviewTitle: "Proactive Vegetation Control",
  overviewBody: [
    "Vegetation management is the ongoing practice of controlling unwanted plant growth to protect property, infrastructure, and land value. Unlike one-time land clearing, it's a strategic, recurring service that keeps overgrowth from reclaiming your land. In Tennessee, where cedar, privet, kudzu, and multiflora rose spread aggressively, a consistent management program is often the difference between a usable property and one that's lost to the brush.",
    "Noland Earthworks provides vegetation management for a wide range of applications across Middle and West Tennessee: fence lines, rights-of-way, utility corridors, pond banks, pastures, and commercial properties. We use mechanical methods — forestry mulching, mowing, and cutting — to provide effective, environmentally responsible control without herbicides. The tracked mulcher handles terrain that wheeled equipment can't access, including slopes, wet ground, and areas with significant woody growth.",
    "Whether you're dealing with invasive species encroaching on pasture, brush reclaiming a cleared right-of-way, or simply maintaining land that was cleared last season, we develop a management plan tailored to your property's specific conditions and your long-term goals. Many landowners start with a full land clearing job and then transition to a recurring vegetation management program to keep the property in shape year after year.",
    "We work with rural landowners, farmers, ranchers, developers, and government entities throughout Tennessee. Veteran-owned and operated, Noland Earthworks brings the same standard to every visit: show up when committed, do the work as scoped, and leave the property better than we found it.",
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
    { title: "Land Management", slug: "land-management", description: "Full site clearing of trees, stumps, brush, and debris.", heroImage: LAND_HERO },
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
      question: "What's the difference between vegetation management and land management?",
      answer: "Land clearing is a one-time, comprehensive removal of all vegetation from a site. Vegetation management is an ongoing service focused on controlling regrowth and maintaining cleared areas. Many clients start with land management and then transition to a vegetation management program.",
    },
    {
      question: "Can you manage vegetation around my pond or creek?",
      answer: "Yes. We're experienced working near water features. Mechanical clearing near waterways is often preferred over chemical methods. Work within certain setbacks of streams may require permits, which we'll identify during the site visit.",
    },
    {
      question: "Do you offer contracts for recurring service?",
      answer: "Yes. We offer seasonal and annual service agreements that provide priority scheduling, consistent crews, and discounted per-visit rates compared to one-time service calls. Contact us to discuss a program for your property.",
    },
    {
      question: "What areas of Tennessee do you serve?",
      answer: "We operate throughout Middle and West Tennessee, serving landowners in Maury, Williamson, Davidson, Cheatham, Dickson, Lawrence, Giles, Marshall, Bedford, Rutherford, Wilson, Sumner, Robertson, Montgomery, Stewart, Houston, Humphreys, Perry, Wayne, Lewis, and surrounding counties. If you're unsure whether we cover your area, reach out and we'll give you a straight answer.",
    },
    {
      question: "How does forestry mulching help with long-term vegetation management?",
      answer: "Forestry mulching is one of the most effective tools for vegetation management because it grinds everything — brush, saplings, vines, and small trees — into a mulch layer that suppresses future regrowth. The mulch shades the soil, reducing the germination rate of invasive seeds. Combined with follow-up visits to address re-sprouting, it's a durable and cost-effective approach to keeping land under control.",
    },
  ],
};

export default function VegetationManagementPage() {
  usePageTitle(
    "Vegetation Management in Tennessee | Noland Earthworks",
    "Professional vegetation management, brush control, and invasive species removal across Middle & West Tennessee. Recurring maintenance or one-time clearing. Veteran-owned. Free estimates.",
    "/services/vegetation-management"
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
