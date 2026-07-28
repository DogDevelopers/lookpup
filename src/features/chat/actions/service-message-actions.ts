"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";
import { touchRoomPreview } from "@/lib/chat-rooms";
import { SERVICE_COMPLETE_PREFIX, SERVICE_START_PREFIX } from "@/lib/chat-message-prefixes";
import { isRecipientActive, SERVICE_TYPE_LABEL, type ActionResult } from "./shared";

export async function sendServiceCompleteMessage(
  roomId: string,
  reservationId: string,
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

  const sitter = room.sitters as unknown as { user_id: string };
  if (sitter.user_id !== user.id) return { ok: false, error: "펫시터만 서비스 완료를 요청할 수 있습니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("start_datetime, end_datetime, total_price, services(title, service_type), reservation_items(pets(name))")
    .eq("id", reservationId)
    .single();

  type ServiceRow = { title: string; service_type: string };
  type PetRow = { name: string } | null;
  type ItemRow = { pets: PetRow };
  const rawServices = reservation?.services;
  const service = (Array.isArray(rawServices) ? rawServices[0] : rawServices) as unknown as ServiceRow | null;
  const items = (reservation?.reservation_items as unknown as ItemRow[]) ?? [];
  const serviceTitle =
    service?.title ||
    (service?.service_type ? (SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type) : null) ||
    "반려동물 이름";
  const petName = items[0]?.pets?.name ?? undefined;
  const startDatetime = reservation?.start_datetime ?? undefined;
  const endDatetime = reservation?.end_datetime ?? undefined;
  const totalPrice = reservation?.total_price ?? undefined;

  const content = `${SERVICE_COMPLETE_PREFIX}${JSON.stringify({ reservationId, serviceTitle, petName, startDatetime, endDatetime, totalPrice })}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "서비스 완료");

  if (isRecipientActive(room, room.owner_id)) {
    await createNotification(supabase, {
      userId: room.owner_id,
      type: "message",
      title: "서비스가 완료되었어요",
      content: "펫시터가 서비스를 완료했습니다. 확인해주세요.",
      linkUrl: `/chat?roomId=${roomId}`,
    });
  }

  return { ok: true, data: message };
}

export async function sendServiceStartMessage(
  roomId: string,
  reservationId: string,
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

  const sitter = room.sitters as unknown as { user_id: string };
  if (sitter.user_id !== user.id) return { ok: false, error: "펫시터만 서비스 시작을 알릴 수 있습니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("start_datetime, end_datetime, total_price, services(title, service_type), reservation_items(pets(name))")
    .eq("id", reservationId)
    .single();

  type ServiceRow = { title: string; service_type: string };
  type PetRow = { name: string } | null;
  type ItemRow = { pets: PetRow };
  const rawServices = reservation?.services;
  const service = (Array.isArray(rawServices) ? rawServices[0] : rawServices) as unknown as ServiceRow | null;
  const items = (reservation?.reservation_items as unknown as ItemRow[]) ?? [];
  const serviceTitle =
    service?.title ||
    (service?.service_type ? (SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type) : null) ||
    "펫시팅 서비스";
  const petName = items[0]?.pets?.name ?? undefined;
  const startDatetime = reservation?.start_datetime ?? undefined;
  const endDatetime = reservation?.end_datetime ?? undefined;
  const totalPrice = reservation?.total_price ?? undefined;

  const content = `${SERVICE_START_PREFIX}${JSON.stringify({ reservationId, serviceTitle, petName, startDatetime, endDatetime, totalPrice })}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "서비스 시작");

  if (isRecipientActive(room, room.owner_id)) {
    await createNotification(supabase, {
      userId: room.owner_id,
      type: "message",
      title: "서비스가 시작되었어요",
      content: "펫시터가 서비스를 시작했습니다.",
      linkUrl: `/chat?roomId=${roomId}`,
    });
  }

  return { ok: true, data: message };
}
