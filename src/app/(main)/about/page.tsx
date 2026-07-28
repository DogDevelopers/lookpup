import AboutHeroSection from "@/features/about/components/AboutHeroSection";
import FeaturesSection from "@/features/about/components/FeaturesSection";
import HowItWorksSection from "@/features/about/components/HowItWorksSection";
import FaqSection from "@/features/about/components/FaqSection";
import CtaSection from "@/features/about/components/CtaSection";
import Footer from "@/components/layout/Footer";

// TODO: wire isLoggedIn to real auth state (features/auth) once ported.
export default function AboutPage() {
  const isLoggedIn = false;

  return (
    <>
      <AboutHeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection isLoggedIn={isLoggedIn} />
      <Footer />
    </>
  );
}
