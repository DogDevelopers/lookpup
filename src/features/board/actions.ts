"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { REQUEST_STATUS, APPLICATION_STATUS } from "@/lib/constants";
import { requestSchema, applicationSchema } from "./schema";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, suspended_until")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  if (profile.suspended_until && new Date(profile.suspended_until) > new Date()) {
    return null;
  }
  return { supabase, userId: profile.id };
}

export async function createRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthedUser();
  if (!auth) return { ok: false, error: "로그인이 필요합니다." };

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { data, error } = await auth.supabase
    .from("requests")
    .insert({ ...parsed.data, owner_id: auth.userId })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "게시글 등록에 실패했습니다." };

  revalidatePath("/board");
  return { ok: true, data: { id: data.id } };
}

export async function updateRequest(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const auth = await getAuthedUser();
  if (!auth) return { ok: false, error: "로그인이 필요합니다." };

  const { data: existing } = await auth.supabase
    .from("requests")
    .select("owner_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.owner_id !== auth.userId) {
    return { ok: false, error: "수정 권한이 없습니다." };
  }
  if (existing.status === REQUEST_STATUS.MATCHED) {
    return { ok: false, error: "매칭 완료된 게시글은 수정할 수 없습니다." };
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { error } = await auth.supabase
    .from("requests")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: "게시글 수정에 실패했습니다." };

  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
  return { ok: true, data: undefined };
}

export async function closeRequest(id: string): Promise<ActionResult> {
  const auth = await getAuthedUser();
  if (!auth) return { ok: false, error: "로그인이 필요합니다." };

  const { data: existing } = await auth.supabase
    .from("requests")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.owner_id !== auth.userId) {
    return { ok: false, error: "권한이 없습니다." };
  }

  const { error } = await auth.supabase
    .from("requests")
    .update({ status: REQUEST_STATUS.MATCHED })
    .eq("id", id);

  if (error) return { ok: false, error: "모집 마감에 실패했습니다." };

  revalidatePath(`/board/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteRequest(id: string): Promise<ActionResult> {
  const auth = await getAuthedUser();
  if (!auth) return { ok: false, error: "로그인이 필요합니다." };

  const { data: existing } = await auth.supabase
    .from("requests")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.owner_id !== auth.userId) {
    return { ok: false, error: "삭제 권한이 없습니다." };
  }

  const { error } = await auth.supabase.from("requests").delete().eq("id", id);
  if (error) return { ok: false, error: "게시글 삭제에 실패했습니다." };

  revalidatePath("/board");
  return { ok: true, data: undefined };
}

export async function createApplication(input: unknown): Promise<ActionResult<{ id: string }>> {
  const auth = await getAuthedUser();
  if (!auth) return { ok: false, error: "로그인이 필요합니다." };

  const { data: sitter } = await auth.supabase
    .from("sitters")
    .select("id, status")
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!sitter) return { ok: false, error: "펫시터 등록이 필요합니다." };
  if (sitter.status !== "approved") {
    return { ok: false, error: "승인된 펫시터만 지원할 수 있습니다." };
  }

  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { data: request } = await auth.supabase
    .from("requests")
    .select("status")
    .eq("id", parsed.data.request_id)
    .maybeSingle();
  if (!request || request.status !== REQUEST_STATUS.OPEN) {
    return { ok: false, error: "지원할 수 없는 게시글입니다." };
  }

  const { data, error } = await auth.supabase
    .from("applications")
    .insert({
      request_id: parsed.data.request_id,
      sitter_id: sitter.id,
      message: parsed.data.message,
      proposed_price: parsed.data.proposed_price,
      status: APPLICATION_STATUS.PENDING,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "지원에 실패했습니다." };

  revalidatePath(`/board/${parsed.data.request_id}`);
  return { ok: true, data: { id: data.id } };
}
