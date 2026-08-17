import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const MULCHING_EQUIPMENT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const SEEDING_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const FENCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const MULCH_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const SELECTIVE_MULCHING_VISUALS = [
  {
    image: MULCHING_EQUIPMENT,
    title: "Mulching Head at Work",
    description: "The mulching head processes suitable brush and small trees into ground cover where the work is happening.",
  },
  {
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/gallery-forestry-after-1-irHqRa8sGttYKR7PSVZaM8.webp",
    title: "Mulch Left on Site",
    description: "Processed vegetation remains as a mulch layer instead of becoming a debris pile that requires hauling or burning.",
  },
];

const data: ServicePageProps = {
  slug: "add-ons/selective-mulching",
  title: "Selective Mulching in Tennessee",
  tagline: "Not everything needs to go. We remove the trees, brush, and problem vegetation you specify while leaving the mature timber, hardwoods, or landscape trees you want to keep.",
  heroImage: MULCHING_EQUIPMENT,
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
      question: "How does selective mulching differ from traditional clearing?",
      answer: "Selective mulching uses the forestry mulcher to process suitable brush, saplings, and small trees into mulch on the property while protecting the trees and boundaries you identify. Traditional clearing often leaves cut material to pile, haul, or burn and may involve grading or excavation. Noland Earthworks does not provide grading, excavation, or hauling; the written site-visit scope confirms what is appropriate for your property.",
    },
    {
      question: "What are the benefits of mulching instead of pushing vegetation into piles?",
      answer: "Mulching leaves processed vegetation as ground cover, avoids debris piles on suitable projects, and lets the operator work selectively around the trees you want to keep. It can improve access and reduce understory while retaining the property character that broader removal can take away.",
    },
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

function SelectiveMulchingEquipmentSection() {
  return (
    <section className="border-t border-[#E07B2A]/20 bg-[#111d16] py-20">
      <div className="container">
        <div className="max-w-3xl">
          <p className="section-label mb-4">The Mulching Method</p>
          <h2 className="font-['Oswald'] text-3xl font-bold uppercase tracking-[0.04em] text-[#F0EDE6] sm:text-4xl">Target the Vegetation, Keep the Character</h2>
          <p className="mt-4 font-['Lato'] leading-7 text-white/70">Selective Mulching uses the same tracked forestry-mulching equipment as broader vegetation work, but the site walk and written scope identify what stays, what goes, and where the machine should not travel.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {SELECTIVE_MULCHING_VISUALS.map((visual) => (
            <figure key={visual.title} className="overflow-hidden border border-white/10 bg-black/20">
              <img src={visual.image} alt={visual.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <figcaption className="p-5">
                <h3 className="font-['Oswald'] text-xl font-semibold uppercase tracking-[0.04em] text-[#F0EDE6]">{visual.title}</h3>
                <p className="mt-2 font-['Lato'] text-sm leading-6 text-white/65">{visual.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

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
      <SelectiveMulchingEquipmentSection />
      <MobileCTABar />
      <Footer />
    </>
  );
}
