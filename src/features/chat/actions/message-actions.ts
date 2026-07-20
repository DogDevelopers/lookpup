"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { touchRoomPreview } from "@/lib/chat-rooms";
import {
  SYSTEM_MSG_PREFIX,
  IMAGE_MSG_PREFIX,
  RESERVATION_CANCELED_PREFIX,
  CHAT_MESSAGE_MAX_LENGTH,
  truncatePreview,
} from "@/lib/chat-message-prefixes";
import { isRecipientActive, getAuthorizedChatRoom, type ActionResult } from "./shared";

export async function sendMessage(
  roomId: string,
  content: string,
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!content || content.trim().length === 0) return { ok: false, error: "메시지 내용을 입력해주세요." };
  const trimmed = content.trim();
  if (trimmed.length > CHAT_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `메시지는 ${CHAT_MESSAGE_MAX_LENGTH}자 이내로 입력해주세요.` };
  }

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

  const recipientId = user.id === room.owner_id ? sitter.user_id : room.owner_id;
  if (!isRecipientActive(room, recipientId)) {
    return { ok: false, error: "상대방이 채팅을 종료하여 메시지를 보낼 수 없습니다." };
  }

  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: trimmed })
    .select()
    .single();
  if (msgError) return { ok: false, error: msgError.message };

  await touchRoomPreview(supabase, roomId, truncatePreview(trimmed));

  const chatLink = `/chat?roomId=${roomId}`;
  const { data: sender } = await supabase.from("users").select("full_name").eq("id", user.id).single();
  const senderName = sender?.full_name ?? "상대방";
  const notificationContent = `${senderName}: ${trimmed.slice(0, 50)}`;

  const { data: existingNotifications } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", recipientId)
    .eq("type", "message")
    .eq("link_url", chatLink)
    .eq("is_read", false)
    .limit(1);

  const existingNotification = existingNotifications?.[0] ?? null;
  if (existingNotification) {
    await supabase.from("notifications").update({ content: notificationContent }).eq("id", existingNotification.id);
  } else {
    await createNotification(supabase, {
      userId: recipientId,
      type: "message",
      title: "새로운 메시지가 왔어요",
      content: notificationContent,
      linkUrl: chatLink,
    });
  }

  return { ok: true, data: message };
}

export async function sendImageMessage(
  roomId: string,
  imageUrl: string,
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

  const recipientId = user.id === room.owner_id ? sitter.user_id : room.owner_id;
  if (!isRecipientActive(room, recipientId)) {
    return { ok: false, error: "상대방이 채팅을 종료하여 더 이상 메시지를 보낼 수 없습니다." };
  }

  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: `${IMAGE_MSG_PREFIX}${imageUrl}` })
    .select()
    .single();
  if (msgError) return { ok: false, error: msgError.message };

  await touchRoomPreview(supabase, roomId, "사진");

  const chatLink = `/chat?roomId=${roomId}`;
  const { data: sender } = await supabase.from("users").select("full_name").eq("id", user.id).single();
  const senderName = sender?.full_name ?? "상대방";
  const notificationContent = `${senderName}: 사진을 보냈습니다.`;

  const { data: existingNotifications } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", recipientId)
    .eq("type", "message")
    .eq("link_url", chatLink)
    .eq("is_read", false)
    .limit(1);

  const existingNotification = existingNotifications?.[0] ?? null;
  if (existingNotification) {
    await supabase.from("notifications").update({ content: notificationContent }).eq("id", existingNotification.id);
  } else {
    await createNotification(supabase, {
      userId: recipientId,
      type: "message",
      title: "새로운 메시지가 왔어요",
      content: notificationContent,
      linkUrl: chatLink,
    });
  }

  return { ok: true, data: message };
}

export async function sendSystemMessage(
  roomId: string,
  content: string,
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const authResult = await getAuthorizedChatRoom(supabase, roomId, user.id);
  if (!authResult.ok) return authResult;

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: `${SYSTEM_MSG_PREFIX}${content}` })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, content);

  return { ok: true, data: message };
}

export async function sendReservationCanceledMessage(
  roomId: string,
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const authResult = await getAuthorizedChatRoom(supabase, roomId, user.id);
  if (!authResult.ok) return authResult;

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: RESERVATION_CANCELED_PREFIX })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "예약 취소");

  return { ok: true, data: message };
}
