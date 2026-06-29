import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useEffect } from "react";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const MAINTENANCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "forestry-mulching",
  title: "Forestry Mulching in Tennessee",
  tagline: "The most efficient way to clear land — one pass, no hauling, no burning. Just clean, mulched ground ready for use.",
  heroImage: HERO,
  overviewTitle: "What Is Forestry Mulching?",
  overviewBody: [
    "Forestry mulching is a single-step land management process that uses a specialized machine with a rotating drum of carbide teeth to grind trees, brush, stumps, and vegetation directly into mulch — all in one pass.",
    "Unlike traditional clearing methods that require separate crews for felling, chipping, hauling, and burning, forestry mulching accomplishes everything simultaneously. The resulting mulch layer stays on-site, protecting the soil from erosion, retaining moisture, and naturally decomposing into organic matter.",
    "This method is ideal for properties where you want to clear vegetation without disturbing the soil structure — perfect for future pasture, trails, fire breaks, or simply opening up views and access on wooded land.",
  ],
  benefits: [
    "Single-pass operation — faster and more cost-effective than traditional clearing",
    "No hauling or burning required — mulch stays on-site",
    "Minimal soil disturbance — preserves topsoil and root systems",
    "Excellent for erosion control on slopes and creek banks",
    "Creates natural mulch layer that suppresses future weed growth",
    "Can selectively clear while preserving desired trees",
    "Ideal for fire break creation and wildfire risk reduction",
  ],
  relatedServices: [
    { title: "Land Management", slug: "land-management", description: "Full site clearing of trees, stumps, brush, and debris.", heroImage: LAND_HERO },
    { title: "Vegetation Management", slug: "vegetation-management", description: "Control invasive species, overgrowth, and unwanted vegetation.", heroImage: VEGETATION_HERO },
    { title: "Property Maintenance", slug: "property-maintenance", description: "Keep your land clean, safe, and well-maintained year-round.", heroImage: MAINTENANCE_HERO },
  ],
  faqs: [
    {
      question: "How large of trees can a forestry mulcher handle?",
      answer: "Our equipment can handle trees up to approximately 8–10 inches in diameter in a single pass. Larger trees can be processed with multiple passes or may require pre-felling. We'll assess your specific site during the free estimate.",
    },
    {
      question: "Will forestry mulching kill invasive species?",
      answer: "Mulching removes above-ground growth effectively, but many invasive species (like kudzu, privet, or multiflora rose) will re-sprout from root systems. For long-term control, follow-up treatments (herbicide or repeat mulching) are often recommended. We can advise on the best approach for your specific invasives.",
    },
    {
      question: "Is the mulch left on my property safe?",
      answer: "Yes. The mulch layer is a natural, organic material that decomposes over time, enriching the soil. It's not treated with any chemicals. The layer also helps suppress weed regrowth and prevents erosion — it's actually beneficial for most land uses.",
    },
    {
      question: "Can forestry mulching be done near water?",
      answer: "Yes, and it's often preferred near waterways because it minimizes soil disturbance compared to traditional clearing. However, work within certain distances of streams and wetlands may require permits. We'll identify any regulatory considerations during the site visit.",
    },
    {
      question: "How does forestry mulching compare to traditional clearing?",
      answer: "Traditional clearing requires multiple steps: felling, chipping or burning, hauling debris, and sometimes grading. Forestry mulching does it all in one pass, typically in less time and at lower cost. The trade-off is that the mulch stays on-site rather than being removed.",
    },
    {
      question: "What's the minimum acreage for a forestry mulching job?",
      answer: "Our sweet spot is jobs in the 2–20 acre range — large enough to justify mobilization and equipment transport, but manageable for a single crew in one to a few days. Lots under an acre are generally not cost-effective for the customer given mobilization costs. If you're unsure whether your property qualifies, reach out and we'll give you a straight answer.",
    },
  ],
};

export default function ForestryMulchingPage() {
  usePageTitle(
    "Forestry Mulching in Tennessee | Noland Earthworks",
    "Professional forestry mulching across 35 counties in Middle & West Tennessee. One pass clears trees, brush, and stumps — no hauling, no burning. Veteran-owned. Free on-site estimates.",
    "/services/forestry-mulching"
  );

  // Inject LocalBusiness schema referencing this page as the primary service
  useEffect(() => {
    const id = "forestry-mulching-lb-schema";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      "name": "Noland Earthworks, LLC",
      "url": "https://nolandearthworks.com",
      "telephone": "+16154064819",
      "email": "info@nolandearthworks.com",
      "description": "Veteran-owned forestry mulching company serving 35 counties across Middle and West Tennessee. Specializing in tracked forestry mulching — the primary service. One pass clears trees, brush, and stumps with no hauling, no burning, and no bare soil.",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Forestry Mulching Services",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Forestry Mulching",
              "description": "Tracked forestry mulching service that grinds trees, brush, and stumps into mulch in a single pass. No hauling, no burning, no bare soil. Handles slopes, wet ground, and difficult terrain.",
              "areaServed": "Middle and West Tennessee"
            }
          }
        ]
      },
      "address": {
        "@type": "PostalAddress",
        "addressRegion": "TN",
        "addressCountry": "US"
      },
      "areaServed": [
        "Davidson County, TN", "Williamson County, TN", "Maury County, TN",
        "Rutherford County, TN", "Wilson County, TN", "Dickson County, TN",
        "Cheatham County, TN", "Robertson County, TN", "Sumner County, TN",
        "Montgomery County, TN", "Bedford County, TN", "Marshall County, TN"
      ],
      "knowsAbout": [
        "forestry mulching", "land management", "pasture reclamation",
        "cedar clearing", "brush clearing", "right-of-way clearing",
        "vegetation management", "tracked forestry mulcher"
      ]
    });
    return () => { el?.remove(); };
  }, []);

  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <MobileCTABar />
      <Footer />
    </>
  );
}
