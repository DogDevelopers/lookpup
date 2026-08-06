import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 하위 페이지는 전부 개인 데이터다. 여기서 한 번 막으면 새 페이지도 기본 noindex가 된다.
export const metadata: Metadata = { robots: { index: false } };

export default async function MyProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/myprofile");
  }

  return <>{children}</>;
}
