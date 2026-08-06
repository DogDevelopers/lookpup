import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SitterRegisterClient from "@/features/sitter-register/components/SitterRegisterClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("펫시터 등록");

export default async function PetsitterRegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/sitter-register");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_verified) {
    redirect("/auth/verification?next=/sitter-register");
  }

  const { data: existingSitter } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSitter) {
    redirect("/myprofile/sitter-profile");
  }

  return <SitterRegisterClient />;
}
