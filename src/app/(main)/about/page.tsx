import { publicPage } from "@/lib/metadata";
import AboutHeroSection from "@/features/about/components/AboutHeroSection";
import FeaturesSection from "@/features/about/components/FeaturesSection";
import HowItWorksSection from "@/features/about/components/HowItWorksSection";
import FaqSection from "@/features/about/components/FaqSection";
import CtaSection from "@/features/about/components/CtaSection";

export const metadata = publicPage({
  title: "서비스 소개",
  description:
    "봐주개가 어떻게 보호자와 펫시터를 연결하는지, 예약부터 결제·후기까지의 흐름을 소개합니다.",
  path: "/about",
});

export default function AboutPage() {
  const isLoggedIn = false;

  return (
    <>
      <AboutHeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FaqSection />
      <CtaSection isLoggedIn={isLoggedIn} />
    </>
  );
}
