import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const VEGETATION_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const data: ServicePageProps = {
  slug: "right-of-way-clearing",
  title: "Right-of-Way Clearing in Tennessee",
  tagline: "Professional right-of-way clearing for driveways, utilities, fence lines, and access roads across Middle & West Tennessee. Fast, clean, and built to last.",
  heroImage: HERO,
  overviewTitle: "What Is Right-of-Way Clearing?",
  overviewBody: [
    "Right-of-way (ROW) clearing is the process of removing trees, brush, stumps, and vegetation from a defined corridor — whether that's a new driveway cut through wooded land, a utility easement, a fence line, or a rural access road. It's one of the most common jobs we handle across Middle and West Tennessee.",
    "Noland Earthworks uses forestry mulching equipment to clear ROW corridors cleanly and efficiently. Unlike traditional clearing that requires separate crews for felling, chipping, and hauling, our mulching head grinds everything in a single pass — leaving the corridor clean and the surrounding land undisturbed.",
    "Whether you're a homeowner cutting a new driveway to a back lot, a utility company maintaining an easement, or a landowner opening up a fence line that's been overtaken by brush, we have the equipment and experience to get it done right.",
  ],
  benefits: [
    "New driveway and access road clearing through wooded or brushy land",
    "Utility easement and power line corridor maintenance",
    "Fence line clearing — remove encroaching brush and small trees",
    "Pipeline and telecom ROW clearing and maintenance",
    "Rural road widening and shoulder brush control",
    "Single-pass forestry mulching — no hauling, no burning",
    "Minimal disturbance to surrounding trees and property",
    "Licensed and fully insured for commercial and residential ROW work",
  ],
  relatedServices: [
    { title: "Forestry Mulching", slug: "forestry-mulching", description: "One-pass clearing of trees, brush, and stumps — no hauling required.", heroImage: FORESTRY_HERO },
    { title: "Land Management", slug: "land-management", description: "Full site clearing for building, farming, or recreation.", heroImage: LAND_HERO },
    { title: "Vegetation Management", slug: "vegetation-management", description: "Ongoing control of invasive species and overgrowth.", heroImage: VEGETATION_HERO },
  ],
  faqs: [
    {
      question: "How wide of a corridor can you clear for a driveway or access road?",
      answer: "We typically clear 12–20 feet wide for a standard single-lane driveway, and up to 30 feet or more for a two-lane access road. The exact width depends on your needs and the terrain. We'll discuss the target width during the free estimate and can stake it out on-site.",
    },
    {
      question: "Do I need a permit to clear a right-of-way on my own property in Tennessee?",
      answer: "For clearing on private property — like a driveway or fence line — you generally don't need a permit. However, if the ROW is within a certain distance of a stream, wetland, or public road, local or state regulations may apply. We'll flag any potential permit requirements during the estimate. For utility or public ROW work, the property owner or utility company is responsible for any required permits.",
    },
    {
      question: "Can you clear a ROW near power lines or utility infrastructure?",
      answer: "Yes, we regularly work near utility corridors and have experience maintaining safe clearances around overhead lines and underground infrastructure. We follow all standard safety protocols and can coordinate with utility companies as needed. Always call 811 (Tennessee One-Call) before any ground-disturbing work near buried utilities.",
    },
    {
      question: "How long does it take to clear a driveway right-of-way?",
      answer: "A typical residential driveway cut (200–500 feet through wooded land) can usually be completed in a single day. Longer corridors or those with heavy timber may take 2–3 days. We'll give you a realistic timeline during the free estimate.",
    },
    {
      question: "What happens to the trees and brush you clear?",
      answer: "With forestry mulching, all cleared vegetation is ground into mulch and spread back on-site. This eliminates the need for hauling or burning, keeps the job clean, and the mulch layer naturally decomposes to enrich the soil. If you prefer the material removed entirely, we can discuss alternative clearing methods.",
    },
    {
      question: "Do you do ongoing ROW maintenance, not just one-time clearing?",
      answer: "Yes. Many of our clients — especially those with long fence lines, utility easements, or rural access roads — schedule annual or semi-annual maintenance visits to keep their ROW clear. We can set up a recurring maintenance program tailored to your property.",
    },
  ],
};

export default function RightOfWayClearingPage() {
  usePageTitle(
    "Right-of-Way Clearing in Tennessee | Noland Earthworks",
    "Professional right-of-way clearing for driveways, utility easements, pipeline corridors, and access roads across Middle & West Tennessee. Forestry mulching cuts a clean corridor in one pass. Free on-site estimates.",
    "/services/right-of-way-clearing"
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
