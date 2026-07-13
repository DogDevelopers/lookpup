import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyPetsClient, { type MyPet } from "@/features/pet-register/components/MyPetsClient";

export default async function MyPetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data } = await supabase
    .from("pets")
    .select("id, name, animal_type, breed, age, gender, weight, neutered, caution")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const pets: MyPet[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    animalType: row.animal_type,
    breed: row.breed,
    age: row.age,
    gender: row.gender === "female" ? "female" : "male",
    weight: row.weight != null ? Number(row.weight) : null,
    neutered: row.neutered,
    caution: row.caution,
  }));

  return <MyPetsClient pets={pets} />;
}
