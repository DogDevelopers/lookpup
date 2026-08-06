import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from "@/lib/metadata";
import NotificationToaster from "@/features/notifications/components/NotificationToaster";

const pretendard = localFont({
  src: [
    { path: "./fonts/Pretendard-Regular.woff2", weight: "400" },
    { path: "./fonts/Pretendard-Medium.woff2", weight: "500" },
    { path: "./fonts/Pretendard-SemiBold.woff2", weight: "600" },
    { path: "./fonts/Pretendard-Bold.woff2", weight: "700" },
  ],
  variable: "--font-pretendard",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // 미설정 시 Next가 VERCEL_URL로 대체한다. 빌드를 막지 않도록 필수로 두지 않는다.
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/lookpup_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full flex flex-col">
        <Providers>{children}</Providers>
        <NotificationToaster />
        <Toaster />
      </body>
    </html>
  );
}
