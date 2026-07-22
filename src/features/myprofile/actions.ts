"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { fuzzCoordinate, syncLocationAcrossProfiles } from "@/lib/geo";
import { ownerLocationSchema, type OwnerLocationInput } from "@/features/myprofile/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateOwnerLocation(input: OwnerLocationInput): Promise<ActionResult> {
  const parsed = ownerLocationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { error } = await supabase
    .from("users")
    .update({
      address: parsed.data.address,
      display_area: parsed.data.dong,
      latitude: fuzzCoordinate(parsed.data.lat),
      longitude: fuzzCoordinate(parsed.data.lng),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "위치 정보를 저장하지 못했습니다." };
  }

  await syncLocationAcrossProfiles(
    supabase,
    user.id,
    {
      address: parsed.data.address,
      displayArea: parsed.data.dong,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    },
    "users",
  );

  revalidatePath("/myprofile");
  revalidatePath("/myprofile/sitter-profile");
  return { ok: true };
}
