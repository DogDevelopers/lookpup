import type { Metadata } from "next";
import HeroSection from "@/features/home/components/HeroSection";
import ServicesSection from "@/features/home/components/ServicesSection";
import HowItWorksSection from "@/features/home/components/HowItWorksSection";
import TrustSection from "@/features/home/components/TrustSection";

// title/description/openGraph는 루트 레이아웃 기본값을 그대로 쓴다.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <HowItWorksSection />
      <TrustSection />
    </>
  );
}
