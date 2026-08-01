import { Suspense } from "react";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import type { HeaderUser } from "@/components/layout/types";
async function HeaderWithUser() {
  const user = await getAuthUser();

  let headerUser: HeaderUser | null = null;

  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("users")
      .select(
        "full_name, email, profile_image, role, is_verified, suspended_until",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      profile?.suspended_until &&
      new Date(profile.suspended_until) > new Date()
    ) {
      redirect(
        `/suspended?until=${encodeURIComponent(profile.suspended_until)}`,
      );
    }

    if (profile) {
      const role: HeaderUser["role"] =
        profile.role === "admin" || profile.role === "both"
          ? profile.role
          : "owner";

      headerUser = {
        fullName: profile.full_name,
        email: profile.email,
        profileImage: profile.profile_image,
        role,
        isVerified: profile.is_verified ?? false,
      };
    }
  }

  return <Header user={headerUser} onLogout={signOut} />;
}

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
      <Suspense fallback={<Header isLoading />}>
        <HeaderWithUser />
      </Suspense>
      <main className="flex-1">{children}</main>
    </>
  );
}
