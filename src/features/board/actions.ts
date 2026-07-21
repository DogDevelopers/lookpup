"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { REQUEST_STATUS } from "@/lib/constants";
import { requestSchema } from "./schema";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const userId = auth.user.id;

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { data, error } = await supabase
    .from("requests")
    .insert({ ...parsed.data, owner_id: userId })
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
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const userId = auth.user.id;

  const { data: existing } = await supabase
    .from("requests")
    .select("owner_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.owner_id !== userId) {
    return { ok: false, error: "수정 권한이 없습니다." };
  }
  if (existing.status === REQUEST_STATUS.MATCHED) {
    return { ok: false, error: "매칭 완료된 게시글은 수정할 수 없습니다." };
  }

  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const { error } = await supabase
    .from("requests")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { ok: false, error: "게시글 수정에 실패했습니다." };

  revalidatePath("/board");
  revalidatePath(`/board/${id}`);
  return { ok: true, data: undefined };
}

export async function closeRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const userId = auth.user.id;

  const { data: existing } = await supabase
    .from("requests")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.owner_id !== userId) {
    return { ok: false, error: "권한이 없습니다." };
  }

  const { error } = await supabase
    .from("requests")
    .update({ status: REQUEST_STATUS.MATCHED })
    .eq("id", id);

  if (error) return { ok: false, error: "모집 마감에 실패했습니다." };

  revalidatePath(`/board/${id}`);
  return { ok: true, data: undefined };
}

export async function deleteRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const userId = auth.user.id;

  const { data: existing } = await supabase
    .from("requests")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.owner_id !== userId) {
    return { ok: false, error: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("requests").delete().eq("id", id);
  if (error) return { ok: false, error: "게시글 삭제에 실패했습니다." };

  revalidatePath("/board");
  return { ok: true, data: undefined };
}
