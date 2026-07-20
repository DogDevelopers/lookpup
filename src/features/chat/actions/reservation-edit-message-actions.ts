"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { touchRoomPreview } from "@/lib/chat-rooms";
import { RESERVATION_EDIT_PREFIX, RESERVATION_EDIT_RESPONSE_PREFIX } from "@/lib/chat-message-prefixes";
import { isRecipientActive, type ActionResult } from "./shared";

export async function sendReservationEditMessage(
  roomId: string,
  payload: {
    reservationId: string;
    original: { start_datetime: string; end_datetime: string; memo?: string | null };
    proposed: { start_datetime: string; end_datetime: string; memo?: string | null };
  },
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, owner_left, sitter_left, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  if (room.owner_id !== user.id && sitter.user_id !== user.id) {
    return { ok: false, error: "채팅방 참여자만 메시지를 보낼 수 있습니다." };
  }

  const content = `${RESERVATION_EDIT_PREFIX}${JSON.stringify(payload)}`;
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (msgError) return { ok: false, error: msgError.message };

  await touchRoomPreview(supabase, roomId, "예약 수정 요청");

  const recipientId = user.id === room.owner_id ? sitter.user_id : room.owner_id;
  if (isRecipientActive(room, recipientId)) {
    await createNotification(supabase, {
      userId: recipientId,
      type: "message",
      title: "예약 수정 요청이 도착했어요",
      content: "예약 일정 수정을 요청했습니다. 확인해주세요.",
      linkUrl: `/chat?roomId=${roomId}`,
    });
  }

  return { ok: true, data: message };
}

export async function sendReservationEditResponseMessage(
  roomId: string,
  payload: { originalMessageId: string; accepted: boolean },
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, owner_left, sitter_left, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  if (room.owner_id !== user.id && sitter.user_id !== user.id) {
    return { ok: false, error: "채팅방 참여자만 메시지를 보낼 수 있습니다." };
  }

  const content = `${RESERVATION_EDIT_RESPONSE_PREFIX}${JSON.stringify(payload)}`;
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (msgError) return { ok: false, error: msgError.message };

  const lastMsg = payload.accepted ? "예약 수정 승인" : "예약 수정 거절";
  await touchRoomPreview(supabase, roomId, lastMsg);

  const recipientId = user.id === room.owner_id ? sitter.user_id : room.owner_id;
  if (isRecipientActive(room, recipientId)) {
    await createNotification(supabase, {
      userId: recipientId,
      type: "message",
      title: payload.accepted ? "예약 수정이 승인되었어요" : "예약 수정 요청이 거절되었어요",
      content: payload.accepted ? "예약 수정 요청이 승인되었습니다." : "예약 수정 요청이 거절되었습니다.",
      linkUrl: `/chat?roomId=${roomId}`,
    });
  }

  return { ok: true, data: message };
}
