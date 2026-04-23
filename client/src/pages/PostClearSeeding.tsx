import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import ServicePageLayout, { ServicePageProps } from "@/components/ServicePageLayout";
import { usePageTitle } from "@/hooks/usePageTitle";

const HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/forestry-mulching-HhrtysAJXn8CTRW2xzcGCC.webp";
const FENCE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/land-clearing-iPC6VzRdyjJa4bVNXaWy5n.webp";
const MULCH_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/vegetation-management-hnEnCRefahdbJy4xpn6UnC.webp";
const SELECTIVE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663484957999/PymCzDCnSJzPjdkfwA7Jn6/property-maintenance-3gu7BTR6P2RKi4ZuYCNLoN.webp";

const data: ServicePageProps = {
  slug: "add-ons/post-clear-seeding",
  title: "Post-Clear Seeding",
  tagline: "Protect your cleared land immediately — seed it right after clearing to establish ground cover, prevent erosion, and get your property working for you faster.",
  heroImage: HERO,
  overviewTitle: "Why Seed After Clearing?",
  overviewBody: [
    "Once land is cleared, bare soil is vulnerable. Without ground cover, rain washes away topsoil, erosion sets in along slopes and creek banks, and weeds move in before desirable vegetation can establish. Post-clear seeding addresses all of that in one step.",
    "We apply a seed mix appropriate for your intended land use — whether that's pasture grass, erosion-control cover, or a wildflower mix for pollinator habitat. The mulch layer left behind by forestry mulching acts as a natural seedbed, holding moisture and protecting seed until germination.",
    "This add-on is particularly valuable on properties with slopes, disturbed creek banks, or anywhere the landowner wants to establish a specific ground cover quickly rather than letting nature take its course.",
  ],
  benefits: [
    "Establishes ground cover quickly to prevent erosion on bare soil",
    "Seed mix tailored to your land use — pasture, erosion control, or native cover",
    "Mulch layer from clearing acts as a natural seedbed for better germination",
    "Reduces weed pressure by establishing desirable vegetation first",
    "Protects slopes, creek banks, and disturbed areas from washout",
    "Saves time and cost compared to scheduling a separate seeding visit",
    "Ideal follow-up to forestry mulching or land clearing jobs",
  ],
  relatedServices: [
    { title: "Fence Line Clearing", slug: "add-ons/fence-line-clearing", description: "Clear overgrown fence lines and reclaim your property boundaries.", heroImage: FENCE_HERO },
    { title: "Mulch Redistribution", slug: "add-ons/mulch-redistribution", description: "Spread and level the mulch layer left after clearing for a cleaner finish.", heroImage: MULCH_HERO },
    { title: "Selective Clearing", slug: "add-ons/selective-clearing", description: "Remove specific trees or brush while preserving what you want to keep.", heroImage: SELECTIVE_HERO },
  ],
  faqs: [
    {
      question: "What kind of seed do you use?",
      answer: "The seed mix depends on your goals. Common options include fescue or bermuda for pasture, annual ryegrass for quick erosion control, or a native wildflower/grass blend for habitat. We'll discuss your intended land use during the estimate and recommend accordingly.",
    },
    {
      question: "When is the best time to seed after clearing?",
      answer: "Fall is generally the best time for cool-season grasses like fescue — soil temperatures are right and fall rains help germination. Spring works for warm-season grasses. We'll time the seeding to match your clearing schedule and the season.",
    },
    {
      question: "Does the mulch from clearing help the seed?",
      answer: "Yes. The shredded mulch layer left by forestry mulching retains moisture, moderates soil temperature, and provides a loose seedbed that improves germination rates compared to bare compacted ground.",
    },
    {
      question: "Can I seed on slopes?",
      answer: "Absolutely — slopes are actually where seeding is most important. Without ground cover, slopes erode quickly after clearing. We can apply seed and, if needed, recommend erosion control matting for steeper grades.",
    },
    {
      question: "How long until I see results?",
      answer: "Germination typically begins within 7–21 days depending on species, soil temperature, and rainfall. A full stand of grass usually establishes within 4–8 weeks under good conditions.",
    },
  ],
};

export default function PostClearSeedingPage() {
  usePageTitle(
    "Post-Clear Seeding — Tennessee Land Clearing Add-On | Noland Earthworks",
    "Protect cleared land with post-clear seeding across Middle & West Tennessee. Establish ground cover, prevent erosion, and get your property working faster. Free estimates.",
    "/services/add-ons/post-clear-seeding"
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
