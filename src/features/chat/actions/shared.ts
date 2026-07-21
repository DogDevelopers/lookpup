import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

export const SERVICE_TYPE_LABEL: Record<string, string> = {
  walk: "산책",
  care: "방문 돌봄",
  hotel: "위탁 돌봄",
  pickup: "픽업",
};

export function isRecipientActive(
  room: { owner_id: string | null; owner_left?: boolean | null; sitter_left?: boolean | null },
  recipientId: string | null | undefined,
): recipientId is string {
  if (!recipientId) return false;
  const left = recipientId === room.owner_id ? room.owner_left : room.sitter_left;
  return !left;
}

/**
 * roomId에 해당하는 채팅방을 조회하고, userId가 그 방의 참여자(보호자 또는 시터)인지 확인한다.
 * 메시지 삽입 등 방 참여자만 수행할 수 있는 Server Action은 실행 전 반드시 이 검증을 거쳐야 한다.
 */
export async function getAuthorizedChatRoom(
  supabase: SupabaseClient<Database>,
  roomId: string,
  userId: string,
): Promise<
  | { ok: true; room: { owner_id: string; sitter: { user_id: string } } }
  | { ok: false; error: string }
> {
  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  if (room.owner_id !== userId && sitter.user_id !== userId) {
    return { ok: false, error: "채팅방 참여자만 이 작업을 할 수 있습니다." };
  }

  return { ok: true, room: { owner_id: room.owner_id, sitter } };
}
