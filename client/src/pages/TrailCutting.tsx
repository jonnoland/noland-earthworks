import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const FORESTRY_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const LAND_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-management-iPC6VzRdyjJa4bVNXaWy5n.webp";
const ROW_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";

const data: ServicePageProps = {
  slug: "trail-cutting",
  title: "Trail Cutting in Tennessee",
  tagline:
    "Hunting trails, ATV paths, hiking corridors, and property access routes cut clean through wooded land across Middle & West Tennessee. One machine, one pass, no debris left behind.",
  heroImage: HERO,
  overviewTitle: "What Is Trail Cutting?",
  overviewBody: [
    "Trail cutting is the process of clearing a defined path through wooded or brushy land — whether that's a hunting trail through a cedar thicket, an ATV corridor across your back acreage, a hiking path through hardwoods, or a utility access route through overgrown terrain.",
    "Noland Earthworks uses a tracked forestry mulcher to cut trails cleanly and efficiently. The machine grinds trees, brush, and stumps directly into mulch in a single pass — no felling crew, no hauling, no burning. The mulch stays on the ground as natural ground cover, and the surrounding land is left undisturbed.",
    "Trail width is fully customizable — from a narrow 6-foot foot path to a 16-foot equipment access corridor. We work on flat ground, hillsides, and wet or rocky terrain that wheeled equipment can't handle. If you can walk the line, we can cut it.",
  ],
  benefits: [
    "Hunting trails — open corridors through dense timber, cedar, and brush",
    "ATV and UTV paths — 6 to 16 feet wide, cut to your spec",
    "Hiking and recreational trails on private land",
    "Property access routes and internal roads through wooded acreage",
    "Fence line clearing alongside trail work",
    "Single-pass forestry mulching — no hauling, no burning, no debris piles",
    "Tracked machine handles slopes, wet ground, and rough terrain",
    "Minimal disturbance to surrounding trees and vegetation",
    "Veteran-owned and operated — reliable, straight-shooting service",
  ],
  relatedServices: [
    {
      title: "Right-of-Way Clearing",
      slug: "right-of-way-clearing",
      description: "Driveway cuts, utility easements, and access road clearing through wooded land.",
      heroImage: ROW_HERO,
    },
    {
      title: "Forestry Mulching",
      slug: "forestry-mulching",
      description: "Full-acreage clearing of trees, brush, and stumps — no hauling required.",
      heroImage: FORESTRY_HERO,
    },
    {
      title: "Land Management",
      slug: "land-management",
      description: "Pasture reclamation, lot clearing, and site prep across Middle Tennessee.",
      heroImage: LAND_HERO,
    },
  ],
  faqs: [
    {
      question: "How wide can you cut a trail?",
      answer:
        "We cut trails from 6 feet wide (a narrow foot path or ATV track) up to 16 feet wide (a full equipment access corridor). Standard hunting and recreational trails typically run 8–10 feet. We'll confirm the target width during the free estimate and can adjust based on your intended use.",
    },
    {
      question: "What happens to the trees and brush you cut?",
      answer:
        "Everything gets ground into mulch by the forestry mulching head and left on the ground as natural cover. There are no debris piles, no hauling, and no burning. The mulch layer decomposes over time and actually helps suppress regrowth along the trail edge.",
    },
    {
      question: "Can you cut a trail on a hillside or through wet ground?",
      answer:
        "Yes. The tracked forestry mulcher handles slopes, wet ground, and rough terrain that wheeled equipment can't safely access. Steep or wet conditions may affect production rate and price, but they don't prevent the work from getting done.",
    },
    {
      question: "How do you price trail cutting?",
      answer:
        "Trail cutting is priced by effective acreage — that's the length of the trail multiplied by the width, divided by 43,560 square feet per acre. Terrain type and vegetation density affect the final rate. We never give ballpark numbers over the phone on anything beyond a simple, straightforward lot — an accurate quote requires a site visit.",
    },
    {
      question: "Do you clear stumps along the trail?",
      answer:
        "Yes. The forestry mulching head grinds stumps down to ground level as part of the standard pass. You won't be left with stumps sticking up in the middle of your trail.",
    },
    {
      question: "How long does it take to cut a trail?",
      answer:
        "It depends on the length, width, and vegetation density. A typical 1,000–2,000 foot hunting trail through moderate brush can usually be completed in a single day. Longer corridors or heavy timber may take 2–3 days. We'll give you a realistic timeline during the free estimate.",
    },
    {
      question: "Can you cut multiple trails or a trail network in one visit?",
      answer:
        "Absolutely. If you have a trail system planned — multiple legs, loops, or connecting paths — we can work through the full network in one mobilization. Combining work into a single visit is the most cost-efficient approach and reduces mobilization cost per trail.",
    },
    {
      question: "Do I need to mark the trail before you arrive?",
      answer:
        "It helps. Flagging tape or stakes along the intended route makes the job faster and ensures the trail ends up exactly where you want it. We can also walk the property with you during the estimate to stake the line together if you're not sure of the exact route.",
    },
  ],
};

export default function TrailCuttingPage() {
  usePageTitle(
    "Trail Cutting in Tennessee | Noland Earthworks",
    "Hunting trails, ATV paths, and property access routes cut through wooded land in Middle & West Tennessee. Tracked forestry mulcher — one pass, no debris, no hauling. Free estimates.",
    "/services/trail-cutting"
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
