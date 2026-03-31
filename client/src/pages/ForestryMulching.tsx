import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";

const PHOTOS = [
  { src: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80", caption: "Dense woodland before forestry mulching" },
  { src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80", caption: "Mulching head processing brush and small trees" },
  { src: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&q=80", caption: "Clean mulch layer left on-site as ground cover" },
  { src: "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=800&q=80", caption: "Open pasture reclaimed from overgrowth" },
  { src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", caption: "Selective mulching to preserve mature trees" },
  { src: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80", caption: "Fire break creation through dense forest" },
];

const data: ServicePageProps = {
  slug: "forestry-mulching",
  title: "Forestry Mulching",
  tagline: "The most efficient way to clear land — one pass, no hauling, no burning. Just clean, mulched ground ready for use.",
  heroImage: HERO,
  overviewTitle: "What Is Forestry Mulching?",
  overviewBody: [
    "Forestry mulching is a single-step land clearing process that uses a specialized machine with a rotating drum of carbide teeth to grind trees, brush, stumps, and vegetation directly into mulch — all in one pass.",
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
  photos: PHOTOS,
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
      answer: "We typically have a minimum job size of around ¼ acre to make mobilization worthwhile. However, we're happy to discuss smaller projects — especially if combined with other services like vegetation management or land clearing.",
    },
  ],
};

export default function ForestryMulchingPage() {
  return (
    <>
      <Navbar />
      <ServicePageLayout {...data} />
      <Footer />
    </>
  );
}
