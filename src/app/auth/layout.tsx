import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false } };

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-b from-orange-50 via-stone-50/50 to-white px-5 py-16">
      {children}
    </main>
  );
}
