import { redirect } from "next/navigation";
import BoardWriteClient from "@/features/board/components/BoardWriteClient";
import { getUserPets } from "@/features/board/queries";
import { createClient } from "@/lib/supabase/server";

export default async function BoardWritePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const pets = await getUserPets(user.id);
  return <BoardWriteClient userId={user.id} pets={pets} />;
}
