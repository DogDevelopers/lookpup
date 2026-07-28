import { Suspense } from "react";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import type { HeaderUser } from "@/components/layout/types";

// 로그인/프로필 조회(Supabase 왕복)를 Header 서브트리에만 묶어서 Suspense로 스트리밍한다.
// children은 이 fetch를 기다리지 않고 즉시 렌더링되어 LCP가 앞당겨진다.
async function HeaderWithUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let headerUser: HeaderUser | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name, email, profile_image, role, is_verified, suspended_until")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profile?.suspended_until &&
      new Date(profile.suspended_until) > new Date()
    ) {
      redirect(`/suspended?until=${encodeURIComponent(profile.suspended_until)}`);
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
