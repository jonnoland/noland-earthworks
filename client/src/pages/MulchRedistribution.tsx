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
  title: "Mulch Redistribution — Forestry Mulching Add-On in Tennessee",
  tagline: "Forestry mulching leaves a natural mulch layer — but sometimes it piles up unevenly. We spread and level it so your property looks finished and drains properly.",
  heroImage: HERO,
  overviewTitle: "What Is Mulch Redistribution?",
  overviewBody: [
    "Forestry mulching grinds vegetation into a mulch layer that stays on-site. In most cases, this is exactly what you want — the mulch protects soil from erosion, suppresses weed regrowth, and decomposes into organic matter over time. But in areas with dense vegetation, large-diameter trees, or heavy brush, the mulch can accumulate in thick, uneven piles that look rough, impede drainage, and make the cleared area difficult to use.",
    "Mulch redistribution is an add-on service that uses the forestry mulcher to spread and level those heavy accumulations, creating a more uniform layer across the cleared area. The result is a cleaner, more finished appearance and a surface that's easier to walk, drive, seed, or build on. It's the difference between a property that looks like it was just worked and one that looks like it's ready to use.",
    "This service is most commonly added to land clearing and forestry mulching jobs on Tennessee properties where the cleared land will be put to immediate use — for pasture establishment, trail creation, building site prep, or simply for a property that the owner wants to present well. It's done in the same mobilization as the clearing job, so there's no additional trip charge or scheduling delay.",
    "Noland Earthworks serves landowners throughout Middle and West Tennessee. If you're planning a land clearing project and want to discuss whether mulch redistribution makes sense for your property, we'll give you a straight assessment during the free on-site estimate.",
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
    {
      question: "Can I add mulch redistribution after the clearing job is done?",
      answer: "Yes, though it's most efficient to do it in the same mobilization as the clearing. If you decide afterward that you want the mulch leveled, we can schedule a follow-up visit. There will be a separate mobilization cost, so it's worth deciding upfront if you think you'll want it.",
    },
    {
      question: "Is mulch redistribution the same as grading?",
      answer: "No. Mulch redistribution spreads and levels the organic mulch layer left by forestry mulching. It does not move soil, level terrain, or prepare a site for construction in the way that grading does. If you need grading or earthwork, that's a separate scope that requires a different contractor. We'll be upfront about what this service covers and what it doesn't.",
    },
  ],
};

export default function MulchRedistributionPage() {
  usePageTitle(
    "Mulch Redistribution in Tennessee | Noland Earthworks",
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
