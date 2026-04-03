/*
 * DESIGN: Heavy Equipment Grit — full single-page layout
 * Sections: Navbar → Hero → Stats → Services → WhyUs → Testimonials → ServiceAreas → Footer
 */
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ProblemSolutionSection from "@/components/ProblemSolutionSection";
import ServicesSection from "@/components/ServicesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhyUsSection from "@/components/WhyUsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import ServiceAreasSection from "@/components/ServiceAreasSection";
import CountiesSection from "@/components/CountiesSection";
import Footer from "@/components/Footer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Home() {
  usePageTitle("Veteran-Owned Land Clearing & Forestry Mulching — Middle & West Tennessee");
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#121212", color: "#F0EDE6" }}
    >
      <Navbar />
      <HeroSection />
      <StatsBar />
      <ProblemSolutionSection />
      <ServicesSection />
      <HowItWorksSection />
      <WhyUsSection />
      <TestimonialsSection />
      <FAQSection />
      <ServiceAreasSection />
      <CountiesSection />
      <Footer />
    </div>
  );
}
