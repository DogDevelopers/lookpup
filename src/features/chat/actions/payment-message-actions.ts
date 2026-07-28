"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";
import { touchRoomPreview } from "@/lib/chat-rooms";
import { EXTRA_CHARGE_STATUS } from "@/lib/constants";
import { PAYMENT_REQUEST_PREFIX, PAYMENT_COMPLETE_PREFIX } from "@/lib/chat-message-prefixes";
import { isRecipientActive, getAuthorizedChatRoom, type ActionResult } from "./shared";

export async function sendPaymentRequestMessage(
  roomId: string,
  data: {
    amount: number;
    reason: string;
    deadline: string;
    isExtra?: boolean;
    costItems?: { id: string; name: string; amount: string; description: string }[];
  },
  reservationId?: string,
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  if (!data.amount || data.amount <= 0) return { ok: false, error: "요청 금액은 0원보다 커야 합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, owner_left, sitter_left, sitters!inner(id, user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitter = room.sitters as unknown as { id: string; user_id: string };
  if (room.owner_id !== user.id && sitter.user_id !== user.id) {
    return { ok: false, error: "채팅방 참여자만 메시지를 보낼 수 있습니다." };
  }

  if (data.isExtra && !reservationId) return { ok: false, error: "추가금을 요청할 예약을 찾을 수 없습니다." };
  if (data.isExtra && (data.amount < 1000 || data.amount > 500000)) {
    return { ok: false, error: "추가금은 1,000원 이상 500,000원 이하여야 합니다." };
  }

  let extraChargeId: string | undefined;
  if (data.isExtra && reservationId) {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("id, owner_id, sitter_id")
      .eq("id", reservationId)
      .maybeSingle();

    if (!reservation || reservation.owner_id !== room.owner_id || reservation.sitter_id !== sitter.id) {
      return { ok: false, error: "이 채팅방과 관련 없는 예약입니다." };
    }

    const { data: extraCharge, error: extraChargeError } = await supabase
      .from("extra_charges")
      .insert({
        reservation_id: reservationId,
        sitter_id: sitter.id,
        owner_id: room.owner_id,
        amount: data.amount,
        reason: data.reason,
        status: EXTRA_CHARGE_STATUS.PENDING,
      })
      .select("id")
      .single();

    if (extraChargeError || !extraCharge) {
      return { ok: false, error: extraChargeError?.message ?? "추가금 요청 생성에 실패했습니다." };
    }
    extraChargeId = extraCharge.id;
  }

  const content = `${PAYMENT_REQUEST_PREFIX}${JSON.stringify({ ...data, extraChargeId })}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();

  if (error) {
    if (extraChargeId) await supabase.from("extra_charges").delete().eq("id", extraChargeId);
    return { ok: false, error: error.message };
  }

  await touchRoomPreview(supabase, roomId, "결제 요청");

  const recipientId = user.id === room.owner_id ? sitter.user_id : room.owner_id;
  if (isRecipientActive(room, recipientId)) {
    await createNotification(supabase, {
      userId: recipientId,
      type: "message",
      title: "결제 요청이 도착했어요",
      content: `${data.amount.toLocaleString("ko-KR")}원 결제 요청이 왔어요.`,
      linkUrl: `/chat?roomId=${roomId}`,
    });
  }

  return { ok: true, data: message };
}

export async function sendPaymentCompleteMessage(
  roomId: string,
  data: { amount: number; paymentRequestMessageId?: string },
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const authResult = await getAuthorizedChatRoom(supabase, roomId, user.id);
  if (!authResult.ok) return authResult;

  const content = `${PAYMENT_COMPLETE_PREFIX}${JSON.stringify(data)}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "결제 완료");

  return { ok: true, data: message };
}

export async function sendAutoPaymentRequestMessage(
  roomId: string,
  data: {
    amount: number;
    reason: string;
    deadline: string;
    postId?: string;
    costItems?: { id: string; name: string; amount: string; description: string }[];
  },
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, owner_left, sitter_left, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  if (room.owner_id !== user.id) return { ok: false, error: "보호자만 이 작업을 할 수 있습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  const content = `${PAYMENT_REQUEST_PREFIX}${JSON.stringify(data)}`;

  // 의도적으로 sitter를 발신자로 지정 — 보호자 화면에 "받은 요청"으로 렌더링되도록 함
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: sitter.user_id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "결제 요청");

  if (isRecipientActive(room, user.id)) {
    await createNotification(supabase, {
      userId: user.id,
      type: "message",
      title: "결제 요청이 도착했어요",
      content: `${data.amount.toLocaleString("ko-KR")}원 결제 요청이 왔어요.`,
      linkUrl: `/chat?roomId=${roomId}`,
    });
  }

  return { ok: true, data: message };
}
