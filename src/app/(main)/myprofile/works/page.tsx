import { redirect } from "next/navigation";
import { getMySitterReservations } from "@/features/reservations/actions";
import WorksHistoryClient from "@/features/petsitters/components/WorksHistoryClient";
import { privatePage } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = privatePage("작업 관리");

export default async function WorksPage() {
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

  const works = await getMySitterReservations();
  return <WorksHistoryClient works={works} />;
}
