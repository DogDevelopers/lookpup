import Header from "@/components/layout/Header";

// TODO: wire Header's user/notifications props to real auth state
// (features/auth) and features/notifications once those are ported.
// Footer is intentionally NOT rendered here — some routes (e.g. petsitters
// search) are full-height app-like views without a footer. Pages that want
// a footer render <Footer /> themselves at the end of their content.
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col">{children}</main>
    </>
  );
}
