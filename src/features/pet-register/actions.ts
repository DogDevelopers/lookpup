"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { uploadImage } from "@/lib/upload-image";
import { petRegisterSchema, petUpdateSchema, type PetUpdateInput } from "@/features/pet-register/schema";
import type { PetRegisterFormValues } from "@/features/pet-register/types";

type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_PETS_PER_OWNER = 10;

export async function createPet(input: PetRegisterFormValues): Promise<ActionResult> {
  const parsed = petRegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { count } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  if ((count ?? 0) >= MAX_PETS_PER_OWNER) {
    return { ok: false, error: `반려동물은 최대 ${MAX_PETS_PER_OWNER}마리까지 등록할 수 있습니다.` };
  }

  const { petType, name, breed, age, weight, gender, neutered, notes, photoFile } = parsed.data;
  if (!petType || !gender) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  let imageUrl: string | null = null;
  if (photoFile) {
    const formData = new FormData();
    formData.append("file", photoFile);
    const uploadResult = await uploadImage(formData);
    if (!uploadResult.ok) return { ok: false, error: uploadResult.error };
    imageUrl = uploadResult.url;
  }

  const { error } = await supabase.from("pets").insert({
    owner_id: user.id,
    name,
    animal_type: petType,
    breed: breed || null,
    age: age ? Number(age) : null,
    gender,
    weight: weight ? Number(weight) : null,
    neutered,
    caution: notes || null,
    image_url: imageUrl,
  });

  if (error) {
    return { ok: false, error: "반려동물 등록에 실패했습니다." };
  }

  revalidatePath("/myprofile/mypets");
  return { ok: true };
}

export async function updatePet(id: string, input: PetUpdateInput): Promise<ActionResult> {
  const parsed = petUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: pet } = await supabase
    .from("pets")
    .select("owner_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!pet || pet.owner_id !== user.id) {
    return { ok: false, error: "반려동물 정보를 찾을 수 없습니다." };
  }

  const { name, breed, age, weight, gender, neutered, caution } = parsed.data;

  const { error } = await supabase
    .from("pets")
    .update({
      name,
      breed: breed || null,
      age: age ? Number(age) : null,
      weight: weight ? Number(weight) : null,
      gender,
      neutered,
      caution: caution || null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "반려동물 정보를 수정하지 못했습니다." };
  }

  revalidatePath("/myprofile/mypets");
  return { ok: true };
}

export async function deletePet(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: pet } = await supabase
    .from("pets")
    .select("owner_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!pet || pet.owner_id !== user.id) {
    return { ok: false, error: "반려동물 정보를 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("pets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "반려동물 삭제에 실패했습니다." };
  }

  revalidatePath("/myprofile/mypets");
  return { ok: true };
}
