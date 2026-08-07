import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // 로그인이 필요한 화면은 크롤링 자체가 낭비다.
      // 시터 상세(/petsitters/*)는 여기서 막지 않는다 — 크롤을 막으면
      // 페이지의 noindex를 읽지 못해 외부 링크만으로 URL이 색인될 수 있다.
      disallow: ["/admin", "/auth", "/myprofile", "/chat", "/notifications", "/suspended"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
