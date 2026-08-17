import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";
const SEEDING_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const FENCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const MULCH_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const data: ServicePageProps = {
  slug: "add-ons/selective-mulching",
  title: "Selective Land Management in Tennessee",
  tagline: "Not everything needs to go. We remove the trees, brush, and problem vegetation you specify while leaving the mature timber, hardwoods, or landscape trees you want to keep.",
  heroImage: HERO,
  overviewTitle: "What Is Selective Mulching?",
  overviewBody: [
    "Selective mulching removes the brush, saplings, and problem vegetation you identify while preserving the mature timber, hardwoods, or landscape trees you want to keep. It is a precise forestry-mulching approach that starts with a clear walkthrough of what stays and what goes.",
    "Common applications include thinning a wooded lot to open views while keeping mature oaks or hardwoods, targeting invasive cedar, privet, or kudzu while preserving native vegetation, mulching underbrush while leaving a timber stand intact, or opening usable space around structures without removing established shade trees.",
    "Selective mulching takes more time per acre than broad forestry mulching because the operator must work carefully around designated trees. That additional care is reflected in the pricing, but the result is a property that retains its character and becomes more usable.",
  ],
  benefits: [
    "Preserves mature timber, hardwoods, and landscape trees you want to keep",
    "Targets invasive species and problem vegetation without removing desired trees",
    "Opens views, access, and usable space while maintaining property character",
    "Reduces wildfire risk by removing understory without clearing the canopy",
    "Ideal for wooded lots, hunting properties, and timber stands",
    "Protects property value by retaining established trees",
    "Can be combined with broader forestry mulching on different sections of the same property",
  ],
  relatedServices: [
    { title: "Fence Line Clearing", slug: "add-ons/fence-line-clearing", description: "Clear overgrown fence lines and reclaim your property boundaries.", heroImage: FENCE_HERO },
    { title: "Mulch Redistribution", slug: "add-ons/mulch-redistribution", description: "Spread and level the mulch layer left after clearing for a cleaner finish.", heroImage: MULCH_HERO },
  ],
  faqs: [
    {
      question: "How do you know which trees to keep?",
      answer: "We walk the property with you before the job starts. You identify what stays — whether that's specific trees, a timber stand, or a general type (all hardwoods, all trees over a certain diameter). We mark or flag as needed and confirm the plan before the machine starts.",
    },
    {
      question: "Is selective mulching more expensive than broader forestry mulching?",
      answer: "Yes, typically. It takes more time per acre because the operator must work carefully around designated trees rather than mulching every area in a pass. The exact premium depends on how densely the keep-trees are distributed through the work area. We'll give you an accurate estimate after the site visit.",
    },
    {
      question: "Can you selectively mulch invasive species like cedar or privet?",
      answer: "Yes. Targeting specific species is one of the most common selective mulching requests. Cedar encroachment on pasture and privet in wooded areas are both situations we handle regularly. We'll mulch the invasives and leave the native vegetation intact.",
    },
    {
      question: "What happens to the trees that are removed?",
      answer: "Same as any forestry mulching job — the removed vegetation is ground into mulch on-site. There's no hauling or burning. The mulch layer stays on the ground and decomposes naturally.",
    },
    {
      question: "Can you work around structures, fencing, and utilities?",
      answer: "Yes. We regularly work in close proximity to structures, fence lines, and utility corridors. We'll identify any sensitive areas during the site visit and plan the work accordingly. We do not work within the utility right-of-way without appropriate clearance.",
    },
    {
      question: "What if I change my mind about a tree during the job?",
      answer: "Once a tree is mulched, it's gone. That's why the pre-job walkthrough is critical. If you're uncertain about a specific tree, flag it as a keep and we'll leave it. It's always easier to remove a tree later than to undo it.",
    },
  ],
};

export default function SelectiveMulchingPage() {
  usePageTitle(
    "Selective Mulching in Tennessee | Noland Earthworks",
    "Target specific brush and small trees while preserving what you want to keep in Middle and West Tennessee. Request a site visit for a written scope.",
    "/services/add-ons/selective-mulching"
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
