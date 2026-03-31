/*
 * DESIGN: Heavy Equipment Grit — full single-page layout
 * Sections: Navbar → Hero → Stats → Services → WhyUs → Testimonials → ServiceAreas → Contact → Footer
 */
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ServicesSection from "@/components/ServicesSection";
import WhyUsSection from "@/components/WhyUsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ServiceAreasSection from "@/components/ServiceAreasSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#121212", color: "#F0EDE6" }}
    >
      <Navbar />
      <HeroSection />
      <StatsBar />
      <ServicesSection />
      <WhyUsSection />
      <TestimonialsSection />
      <ServiceAreasSection />
      <Footer />
    </div>
  );
}
