import { redirect, notFound } from "next/navigation";
import BoardEditClient from "@/features/board/components/BoardEditClient";
import { getRequestForEdit, getUserPets } from "@/features/board/queries";
import { privatePage } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = privatePage("구인글 수정");

export default async function BoardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: request } = await supabase
    .from("requests")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();
  if (request.owner_id !== user.id) redirect(`/board/${id}`);

  const [initialData, pets] = await Promise.all([
    getRequestForEdit(id),
    getUserPets(user.id),
  ]);

  return <BoardEditClient id={id} initialData={initialData} initialPets={pets} />;
}
