"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { getServerEnv } from "@/lib/env";
import { WITHDRAW_REASON_VALUES } from "@/lib/constants";
import {
  providerSchema,
  portOneIdentityVerificationSchema,
  type Provider,
} from "@/features/auth/schema";

type SignInWithOAuthResult = { ok: false; error: string };

export async function signInWithOAuth(
  provider: Provider,
  next: string,
): Promise<SignInWithOAuthResult> {
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) {
    return { ok: false, error: "지원하지 않는 로그인 방식입니다." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return { ok: false, error: "로그인에 실패했습니다. 다시 시도해주세요." };
  }

  redirect(data.url);
}

type ConfirmIdentityVerificationResult = { ok: true } | { ok: false; error: string };

export async function confirmIdentityVerification(
  identityVerificationId: string,
): Promise<ConfirmIdentityVerificationResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: existing } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.is_verified) {
    return { ok: true };
  }

  const res = await fetch(
    `https://api.portone.io/identity-verifications/${identityVerificationId}`,
    {
      headers: { Authorization: `PortOne ${getServerEnv().PORTONE_API_SECRET}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    return { ok: false, error: "본인인증 결과 조회에 실패했습니다." };
  }

  const parsed = portOneIdentityVerificationSchema.safeParse(await res.json());
  if (!parsed.success || parsed.data.status !== "VERIFIED" || !parsed.data.verifiedCustomer) {
    return { ok: false, error: "본인인증이 완료되지 않았습니다." };
  }

  const { name, birthDate, gender, phoneNumber } = parsed.data.verifiedCustomer;

  const { error: updateError } = await supabase
    .from("users")
    .update({
      full_name: name,
      birthdate: birthDate ?? null,
      phone_number: phoneNumber ?? null,
      gender: gender ?? null,
      is_verified: true,
    })
    .eq("id", user.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { ok: false, error: "이미 가입된 전화번호입니다." };
    }
    return { ok: false, error: "인증 정보를 저장하지 못했습니다." };
  }

  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

type RestoreUserResult = { ok: true } | { ok: false; error: string };

export async function restoreUser(): Promise<RestoreUserResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: profile } = await supabase
    .from("users")
    .select("deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.deleted_at) {
    return { ok: false, error: "탈퇴된 계정이 아닙니다." };
  }

  const { error } = await supabase
    .from("users")
    .update({ deleted_at: null, delete_reason: null, is_verified: false })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "계정 복구에 실패했습니다." };
  }

  return { ok: true };
}

type DeleteUserResult = { ok: true } | { ok: false; error: string };

const withdrawReasonSchema = z.enum(WITHDRAW_REASON_VALUES);

export async function deleteUser(reason: string, detail?: string): Promise<DeleteUserResult> {
  const parsedReason = withdrawReasonSchema.safeParse(reason);
  if (!parsedReason.success) {
    return { ok: false, error: "탈퇴 사유를 선택해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { error } = await supabase
    .from("users")
    .update({
      deleted_at: new Date().toISOString(),
      delete_reason: detail ? `${parsedReason.data}: ${detail}` : parsedReason.data,
      phone_number: null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "회원 탈퇴에 실패했습니다." };
  }

  return { ok: true };
}
