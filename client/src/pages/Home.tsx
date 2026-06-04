/*
 * DESIGN: Heavy Equipment Grit — full single-page layout
 * Sections: Navbar → Hero → Stats → Services → WhyUs → Testimonials → ServiceAreas → Footer
 */
import Navbar from "@/components/Navbar";
import PromoBanner from "@/components/PromoBanner";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ProblemSolutionSection from "@/components/ProblemSolutionSection";
import ServicesSection from "@/components/ServicesSection";
import AddOnGuideSection from "@/components/AddOnGuideSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUsSection from "@/components/WhyUsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import BeforeAfterSection from "@/components/BeforeAfterSection";
import FAQSection from "@/components/FAQSection";
import ServiceAreasSection from "@/components/ServiceAreasSection";
import CountiesSection from "@/components/CountiesSection";
import BlogPreviewSection from "@/components/BlogPreviewSection";
import MobileCTABar from "@/components/MobileCTABar";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Home() {
  usePageTitle(
    "Forestry Mulching & Land Clearing TN",
    "Veteran-owned forestry mulching and land clearing in Middle & West Tennessee. Free on-site estimates. Call 615-406-4819.",
    "/"
  );
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#121212", color: "#F0EDE6" }}
    >
      <PromoBanner />
      <Navbar />
      <HeroSection />
      <StatsBar />
      <ProblemSolutionSection />
      <ServicesSection />
      <AddOnGuideSection />
      <HowItWorksSection />
      <WhyUsSection />
      <TestimonialsSection />
      <BeforeAfterSection />
      <FAQSection />
      <ServiceAreasSection />
      <CountiesSection />
      <BlogPreviewSection />
      <MobileCTABar />
      <Footer />
    </div>
  );
}
