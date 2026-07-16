"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fuzzCoordinate, syncLocationAcrossProfiles } from "@/lib/geo";
import {
  bankAccountSchema,
  ownerLocationSchema,
  type BankAccountInput,
  type OwnerLocationInput,
} from "@/features/myprofile/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function upsertBankAccount(input: BankAccountInput): Promise<ActionResult> {
  const parsed = bankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("bank_accounts").upsert(
    {
      user_id: user.id,
      bank_name: parsed.data.bankName,
      account_number: parsed.data.accountNumber,
      account_holder: parsed.data.accountHolder,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: "계좌 정보를 저장하지 못했습니다." };
  }

  revalidatePath("/myprofile/settings");
  return { ok: true };
}

export async function updateOwnerLocation(input: OwnerLocationInput): Promise<ActionResult> {
  const parsed = ownerLocationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

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

export async function deleteBankAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("bank_accounts").delete().eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "계좌 정보를 삭제하지 못했습니다." };
  }

  revalidatePath("/myprofile/settings");
  return { ok: true };
}
