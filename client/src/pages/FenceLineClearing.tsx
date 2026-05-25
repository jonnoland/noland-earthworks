import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const SEEDING_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const MULCH_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const SELECTIVE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "add-ons/fence-line-clearing",
  title: "Fence Line Clearing",
  tagline: "Reclaim your property boundaries. We clear the overgrowth that's taken over your fence lines — trees, brush, and vines — without damaging the fence.",
  heroImage: HERO,
  overviewTitle: "What Is Fence Line Clearing?",
  overviewBody: [
    "Fence lines are one of the most neglected areas on rural and agricultural properties. Within a few seasons, brush, saplings, and vines can completely consume a fence — making it invisible, inaccessible, and eventually structurally compromised as roots and stems push against posts and wire.",
    "Fence line clearing removes all vegetation growing along and through your fence, restoring visibility, access, and the integrity of the fence itself. We work carefully alongside the fence to clear the overgrowth without pulling posts or damaging wire.",
    "This service is commonly added to a larger clearing job — clearing the main property and cleaning up the fence lines in the same mobilization — but it can also be scheduled as a standalone service for properties where the fence lines are the primary concern.",
  ],
  benefits: [
    "Restores visibility and access along property boundaries",
    "Removes trees and brush that damage fence posts and wire over time",
    "Clears vines and invasive species that strangle and weaken fencing",
    "Protects livestock containment by keeping fence lines functional",
    "Efficiently done alongside a main clearing job in one mobilization",
    "Mulcher works close to the fence without the risk of chain-saw debris",
    "Improves property appearance and makes boundary maintenance easier going forward",
  ],
  relatedServices: [
    { title: "Post-Clear Seeding", slug: "add-ons/post-clear-seeding", description: "Establish ground cover immediately after clearing to prevent erosion.", heroImage: SEEDING_HERO },
    { title: "Mulch Redistribution", slug: "add-ons/mulch-redistribution", description: "Spread and level the mulch layer left after clearing for a cleaner finish.", heroImage: MULCH_HERO },
    { title: "Selective Clearing", slug: "add-ons/selective-clearing", description: "Remove specific trees or brush while preserving what you want to keep.", heroImage: SELECTIVE_HERO },
  ],
  faqs: [
    {
      question: "Will you damage my fence during clearing?",
      answer: "We work carefully alongside the fence line. The forestry mulcher can get close to posts and wire without the risk of thrown debris associated with chainsaws. We'll assess the fence condition before starting and flag any sections that need special attention.",
    },
    {
      question: "What if the fence is already buried in brush?",
      answer: "That's exactly the situation this service is designed for. We'll locate the fence line, clear the overgrowth, and restore access. If the fence itself is damaged or compromised, we'll let you know — fence repair is outside our scope but we can point you to the right people.",
    },
    {
      question: "How wide a strip do you clear along the fence?",
      answer: "Typically 10–15 feet on each side of the fence, depending on what's there and what you want. We'll discuss your goals during the estimate — some landowners want a narrow strip cleared, others want a full buffer zone.",
    },
    {
      question: "Can you clear fence lines with trees growing through the wire?",
      answer: "Yes. Trees growing through or against fence wire are common and we handle them regularly. We'll cut and mulch the trees as close to the fence as safely possible. In some cases where trees have grown completely through the wire, some fence repair may be needed afterward.",
    },
    {
      question: "Is this worth doing as a standalone job?",
      answer: "It depends on the total linear footage. Fence line clearing as a standalone job is most cost-effective when you have several hundred feet or more to clear. For smaller sections, it's often most efficient to combine it with another service. We'll give you an honest assessment during the estimate.",
    },
  ],
};

export default function FenceLineClearingPage() {
  usePageTitle(
    "Fence Line Clearing — Tennessee Land Management Add-On | Noland Earthworks",
    "Reclaim overgrown fence lines across Middle & West Tennessee. We clear brush, trees, and vines from property boundaries without damaging your fence. Free estimates.",
    "/services/add-ons/fence-line-clearing"
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
