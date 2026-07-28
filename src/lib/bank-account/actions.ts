"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { bankAccountSchema, type BankAccountInput, type BankAccount } from "@/lib/bank-account/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function getMyBankAccount(): Promise<BankAccount | null> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return null;

  const { data } = await supabase
    .from("bank_accounts")
    .select("bank_name, account_number, account_holder")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!data) return null;
  return { bankName: data.bank_name, accountNumber: data.account_number, accountHolder: data.account_holder };
}

export async function upsertBankAccount(input: BankAccountInput): Promise<ActionResult> {
  const parsed = bankAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

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

  revalidatePath("/myprofile/sitter-edit");
  return { ok: true };
}

export async function deleteBankAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { error } = await supabase.from("bank_accounts").delete().eq("user_id", user.id);

  if (error) {
    return { ok: false, error: "계좌 정보를 삭제하지 못했습니다." };
  }

  revalidatePath("/myprofile/sitter-edit");
  return { ok: true };
}
