import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const SEEDING_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const FENCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const SELECTIVE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "add-ons/mulch-redistribution",
  title: "Mulch Redistribution",
  tagline: "Forestry mulching leaves a natural mulch layer — but sometimes it piles up unevenly. We spread and level it so your property looks finished and drains properly.",
  heroImage: HERO,
  overviewTitle: "What Is Mulch Redistribution?",
  overviewBody: [
    "Forestry mulching grinds vegetation into a mulch layer that stays on-site. In most cases, this is exactly what you want — the mulch protects soil, suppresses weeds, and decomposes into organic matter. But in areas with dense vegetation or large-diameter material, the mulch can accumulate in thick piles that look rough and may impede drainage or future use.",
    "Mulch redistribution uses the machine to spread and level those heavy accumulations, creating a more uniform layer across the cleared area. The result is a cleaner, more finished appearance and a surface that's easier to walk, drive, or plant on.",
    "This add-on is most commonly requested on properties where the cleared land will be used immediately — for pasture, trails, building sites, or simply for a property that the owner wants to look well-maintained rather than freshly worked.",
  ],
  benefits: [
    "Levels uneven mulch accumulations for a cleaner, more finished appearance",
    "Improves drainage by eliminating thick piles that hold standing water",
    "Creates a more uniform surface for future seeding, planting, or construction",
    "Makes cleared areas easier to walk, mow, or drive across",
    "Reduces the visual impact of heavy mulch piles near structures or roads",
    "Done in the same mobilization as the clearing job — no extra trip required",
    "Preserves the erosion-control and soil-health benefits of the mulch layer",
  ],
  relatedServices: [
    { title: "Post-Clear Seeding", slug: "add-ons/post-clear-seeding", description: "Establish ground cover immediately after clearing to prevent erosion.", heroImage: SEEDING_HERO },
    { title: "Fence Line Clearing", slug: "add-ons/fence-line-clearing", description: "Clear overgrown fence lines and reclaim your property boundaries.", heroImage: FENCE_HERO },
    { title: "Selective Clearing", slug: "add-ons/selective-clearing", description: "Remove specific trees or brush while preserving what you want to keep.", heroImage: SELECTIVE_HERO },
  ],
  faqs: [
    {
      question: "How thick will the mulch layer be after redistribution?",
      answer: "After redistribution, the mulch layer is typically 2–4 inches deep across the cleared area. This is enough to suppress weeds and protect soil without creating drainage problems or making the surface difficult to use.",
    },
    {
      question: "Does redistributing the mulch affect its soil benefits?",
      answer: "No. Spreading the mulch more evenly actually improves coverage — more of the soil surface gets the erosion protection and moisture retention benefits rather than having some areas bare and others piled deep.",
    },
    {
      question: "Is mulch redistribution always necessary?",
      answer: "Not always. On many jobs, the mulch distributes fairly evenly on its own. It's most useful in areas with very dense vegetation, large trees, or anywhere the finished appearance matters — near a house, along a driveway, or on a property being prepared for immediate use.",
    },
    {
      question: "Can you remove the mulch entirely instead of redistributing it?",
      answer: "Mulch removal (hauling off-site) is outside our scope. If you need the mulch removed, that requires a separate hauling contractor. In most cases, redistribution gives you a clean result without the cost and logistics of hauling.",
    },
    {
      question: "How long does mulch redistribution add to a job?",
      answer: "It depends on the acreage and how uneven the accumulation is. On a typical job, redistribution adds 10–25% to the total time. We'll factor it into the estimate so there are no surprises.",
    },
  ],
};

export default function MulchRedistributionPage() {
  usePageTitle(
    "Mulch Redistribution — Tennessee Land Clearing Add-On | Noland Earthworks",
    "Level and spread mulch after forestry mulching across Middle & West Tennessee. Get a cleaner, more finished result on cleared land. Free estimates.",
    "/services/add-ons/mulch-redistribution"
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
