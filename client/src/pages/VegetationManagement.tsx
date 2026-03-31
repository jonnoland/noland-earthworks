import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const PHOTOS = [
  { src: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80", caption: "Overgrown fence line cleared and managed" },
  { src: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", caption: "Pasture reclaimed from invasive brush" },
  { src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", caption: "Right-of-way vegetation control" },
  { src: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80", caption: "Selective clearing to preserve native trees" },
  { src: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80", caption: "Utility corridor maintenance" },
  { src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80", caption: "Pond bank and waterway vegetation control" },
];

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
  pricingNote: "Vegetation management pricing depends on the type of vegetation, frequency of service, acreage, and terrain. Below are typical starting ranges for Middle Tennessee properties.",
  pricing: [
    {
      name: "One-Time Service",
      price: "$350",
      unit: "/ starting",
      description: "Single visit to clear overgrown areas or establish a clean baseline.",
      features: [
        "Single service visit",
        "Fence lines, pastures, ROW",
        "Mechanical clearing",
        "Debris mulched on-site",
      ],
    },
    {
      name: "Seasonal Program",
      price: "$250",
      unit: "/ visit",
      description: "2–4 visits per year to keep vegetation under control year-round.",
      features: [
        "2–4 scheduled visits/year",
        "Priority scheduling",
        "Consistent crew",
        "Progress documentation",
        "Discounted vs. one-time rate",
      ],
      highlight: true,
    },
    {
      name: "Commercial / ROW",
      price: "Custom",
      unit: "quote",
      description: "Utility corridors, large commercial properties, or municipal contracts.",
      features: [
        "Utility & pipeline ROW",
        "Large commercial sites",
        "Municipal contracts",
        "Compliance documentation",
        "Volume pricing",
      ],
    },
  ],
  photos: PHOTOS,
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
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <Footer />
    </>
  );
}
