import { redirect } from "next/navigation";
import { getMyEarnings } from "@/features/earnings/actions";
import EarningsClient from "@/features/earnings/components/EarningsClient";
import { privatePage } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = privatePage("정산 관리");

export default async function EarningsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: sitter } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sitter) redirect("/myprofile");

  const earnings = await getMyEarnings();
  return <EarningsClient data={earnings} />;
}
