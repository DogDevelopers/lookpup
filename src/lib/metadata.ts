import type { Metadata } from "next";

export const SITE_NAME = "봐주개";
export const SITE_TITLE = `${SITE_NAME} - 믿을 수 있는 반려동물 돌봄 플랫폼`;
export const SITE_DESCRIPTION =
  "지역 기반 검색으로 가까운 펫시터를 찾고, 안전한 예약과 결제까지 한 번에";

/** 미설정 시 Next가 VERCEL_URL로 대체하므로 optional로 둔다. */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

/** sitemap·robots는 절대 URL이 필수라 대체값이 필요하다. */
export function resolveSiteUrl(): string {
  if (siteUrl) return siteUrl;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
}

type PublicPageInput = {
  title: string;
  description: string;
  path: string;
};

/**
 * 공개 화면. searchParams 조합이 중복 색인되지 않도록 canonical을 고정한다.
 * openGraph는 얕은 병합이라 루트 값이 상속되지 않으므로 공통 필드를 다시 채운다.
 */
export function publicPage({ title, description, path }: PublicPageInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      url: path,
      title: `${title} | ${SITE_NAME}`,
      description,
      images: ["/lookpup_logo.png"],
    },
  };
}

/** 로그인이 필요하거나 개인정보가 걸린 화면. 제목만 붙이고 색인을 막는다. */
export function privatePage(title: string): Metadata {
  return { title, robots: { index: false } };
}
