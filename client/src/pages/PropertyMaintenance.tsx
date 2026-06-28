import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const data: ServicePageProps = {
  slug: "property-maintenance",
  title: "Property Maintenance — Land Management & Upkeep in Tennessee",
  tagline: "Keep your land looking its best year-round with reliable, professional property maintenance from a veteran-owned team you can trust.",
  heroImage: HERO,
  overviewTitle: "Year-Round Land Stewardship",
  overviewBody: [
    "Your property is an investment — and like any investment, it requires consistent care to maintain its value and functionality. Noland Earthworks provides property maintenance services across Middle and West Tennessee that keep your land clean, accessible, and well-managed throughout the year. Whether you own a few acres of residential land or hundreds of acres of rural property, the standard is the same: show up when committed, do the work as scoped, and leave it right.",
    "From seasonal brush clearing and storm debris cleanup to driveway maintenance and fence line clearing, we handle the recurring tasks that keep your property safe, functional, and looking the way land should look. Our primary tool is a tracked forestry mulcher — the same machine used for full land management jobs — which means we can handle significant brush and woody growth that a standard mower or bush hog can't touch. No hauling, no burn piles, no bare soil left behind.",
    "We work with residential landowners, farmers, ranchers, absentee property owners, and commercial property managers throughout Tennessee. Many clients start with a one-time land management job and then move to a recurring maintenance program to keep the property in shape year after year. We learn the characteristics of each property over time and provide consistent service you can count on season after season.",
    "Veteran-owned and operated, Noland Earthworks runs the business the same way it was run in the military: reliability, accountability, and no shortcuts. If we say we'll be there, we'll be there. If something comes up on the job that changes the scope, we'll tell you before we proceed. That's the standard we hold ourselves to on every maintenance visit.",
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
    { title: "Land Management", slug: "land-management", description: "Full site clearing of trees, stumps, brush, and debris.", heroImage: LAND_HERO },
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
    "Property Maintenance in Tennessee | Noland Earthworks",
    "Year-round property maintenance for Tennessee landowners. Brush clearing, fence line clearing, overgrowth control, and right-of-way maintenance. Veteran-owned. Free estimates.",
    "/services/property-maintenance"
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
