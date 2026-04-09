import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const data: ServicePageProps = {
  slug: "property-maintenance",
  title: "Property Maintenance",
  tagline: "Keep your land looking its best year-round with reliable, professional property maintenance from a veteran-owned team you can trust.",
  heroImage: HERO,
  overviewTitle: "Year-Round Land Stewardship",
  overviewBody: [
    "Your property is an investment — and like any investment, it requires consistent care to maintain its value and functionality. Noland Earthworks provides comprehensive property maintenance services that keep your land clean, accessible, and well-managed throughout the year.",
    "From seasonal brush clearing and storm debris cleanup to driveway maintenance and fence line clearing, our team handles the tasks that keep your property safe, attractive, and functional. We work with residential landowners, farmers, ranchers, and commercial property managers.",
    "We build long-term relationships with our clients, learning the unique characteristics of each property and providing consistent, reliable service you can count on season after season.",
  ],
  benefits: [
    "Year-round maintenance programs available",
    "Storm debris cleanup and emergency response",
    "Driveway and access road clearing",
    "Fence line maintenance and brush control",
    "Seasonal pasture and field cleanup",
    "Consistent crews who know your property",
    "Flexible scheduling to fit your needs",
  ],
  relatedServices: [
    { title: "Land Clearing", slug: "land-clearing", description: "Full site clearing of trees, stumps, brush, and debris.", heroImage: LAND_HERO },
    { title: "Forestry Mulching", slug: "forestry-mulching", description: "Mulch trees, brush, and stumps in a single pass — no hauling required.", heroImage: FORESTRY_HERO },
    { title: "Vegetation Management", slug: "vegetation-management", description: "Control invasive species, overgrowth, and unwanted vegetation.", heroImage: VEGETATION_HERO },
  ],
  faqs: [
    {
      question: "What's included in a property maintenance visit?",
      answer: "It depends on your specific program, but a typical visit includes brush clearing, debris removal, fence line maintenance, driveway clearing, and any seasonal tasks (like storm cleanup or pasture prep). We customize each program to your property's needs.",
    },
    {
      question: "How do I set up a recurring maintenance program?",
      answer: "Start with a free site visit. We'll walk your property, discuss your goals and priorities, and propose a maintenance schedule and pricing. Most programs are set up on a seasonal or annual basis with visits scheduled in advance.",
    },
    {
      question: "Do you handle storm damage cleanup?",
      answer: "Yes. Storm debris cleanup is one of our most common emergency services. We can typically respond within 1–3 business days for urgent situations. Annual program clients receive priority emergency response.",
    },
    {
      question: "Can you maintain my property while I'm away?",
      answer: "Absolutely. Many of our clients are absentee landowners or seasonal residents. We'll maintain your property on a scheduled basis and can provide photo documentation after each visit so you always know the condition of your land.",
    },
    {
      question: "Do you maintain commercial properties?",
      answer: "Yes. We work with commercial property managers, HOAs, and businesses that need reliable land maintenance. We can accommodate larger properties and more frequent service schedules for commercial clients.",
    },
    {
      question: "What areas do you serve for property maintenance?",
      answer: "We serve 35 counties across Middle and West Tennessee, including Davidson, Williamson, Rutherford, Maury, Dickson, Cheatham, Robertson, Wilson, Sumner, and many more. Contact us to confirm availability in your specific area.",
    },
  ],
};

export default function PropertyMaintenancePage() {
  usePageTitle(
    "Property Maintenance Services — Middle & West Tennessee | Noland Earthworks",
    "Year-round property maintenance services across Middle & West Tennessee. Brush clearing, fence line clearing, right-of-way maintenance, and more. Free estimates."
  );
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <Footer />
    </>
  );
}
