import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PetRegisterClient from "@/features/pet-register/components/PetRegisterClient";

export default async function PetRegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/pet-register");
  }

  return <PetRegisterClient />;
}
