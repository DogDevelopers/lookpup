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

  const [pets, { data: profile }] = await Promise.all([
    getUserPets(user.id),
    supabase.from("users").select("latitude, longitude").eq("id", user.id).maybeSingle(),
  ]);

  const userLocation =
    profile?.latitude != null && profile?.longitude != null
      ? { lat: Number(profile.latitude), lng: Number(profile.longitude) }
      : null;

  return <BoardWriteClient userId={user.id} pets={pets} userLocation={userLocation} />;
}
