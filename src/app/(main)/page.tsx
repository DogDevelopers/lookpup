import HeroSection from "@/features/home/components/HeroSection";
import ServicesSection from "@/features/home/components/ServicesSection";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";
import TrustSection from "@/features/home/components/TrustSection";
import Footer from "@/components/layout/Footer";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <HowItWorksSection />
      <TrustSection />
      <Footer />
    </>
  );
}
