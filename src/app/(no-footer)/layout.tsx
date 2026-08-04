import { Suspense } from "react";
import Header from "@/components/layout/Header";
import HeaderWithUser from "@/components/layout/HeaderWithUser";

export default function NoFooterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={<Header isLoading />}>
        <HeaderWithUser />
      </Suspense>
      <main className="flex-1">{children}</main>
    </>
  );
}
