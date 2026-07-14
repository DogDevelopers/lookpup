"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { EXTRA_CHARGE_STATUS, RESERVATION_STATUS } from "@/lib/constants";
import {
  SYSTEM_MSG_PREFIX,
  IMAGE_MSG_PREFIX,
  PAYMENT_REQUEST_PREFIX,
  PAYMENT_COMPLETE_PREFIX,
  APPLICATION_SELECTED_PREFIX,
  APPLICATION_REJECTED_PREFIX,
  RESERVATION_CANCELED_PREFIX,
  SERVICE_COMPLETE_PREFIX,
  SERVICE_START_PREFIX,
  RESERVATION_EDIT_PREFIX,
  RESERVATION_EDIT_RESPONSE_PREFIX,
  CHAT_MESSAGE_MAX_LENGTH,
  truncatePreview,
} from "@/lib/chat-message-prefixes";
import type { RoomApiItem, ChatMessagesPage, ReservationByRoomItem } from "@/features/chat/types";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

const SERVICE_TYPE_LABEL: Record<string, string> = {
  walk: "산책",
  care: "방문 돌봄",
  hotel: "위탁 돌봄",
  pickup: "픽업",
};

function isRecipientActive(
  room: { owner_id: string | null; owner_left?: boolean | null; sitter_left?: boolean | null },
  recipientId: string | null | undefined,
): recipientId is string {
  if (!recipientId) return false;
  const left = recipientId === room.owner_id ? room.owner_left : room.sitter_left;
  return !left;
}

export async function getChatRoomsData(): Promise<ActionResult<RoomApiItem[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const sitterId = sitterProfile?.id ?? null;

  let roomsQuery = supabase
    .from("chat_rooms")
    .select(
      `id, room_type, owner_id, sitter_id, reservation_id, request_id,
       last_message, last_message_at, owner_left, sitter_left,
       owner:users!owner_id(full_name, profile_image),
       sitter:sitters!sitter_id(
         user_id,
         rating,
         sitter_user:users(full_name, profile_image)
       ),
       request:requests!request_id(title, status, created_at)`,
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  roomsQuery = sitterId
    ? roomsQuery.or(
        `and(owner_id.eq.${user.id},owner_left.is.false),and(sitter_id.eq.${sitterId},sitter_left.is.false)`,
      )
    : roomsQuery.eq("owner_id", user.id).eq("owner_left", false);

  const { data: rooms, error } = await roomsQuery;
  if (error) return { ok: false, error: error.message };
  if (!rooms || rooms.length === 0) return { ok: true, data: [] };

  const requestRooms = rooms.filter((r) => r.room_type === "request");
  const applicationStatusMap = new Map<string, string>();
  if (requestRooms.length > 0) {
    const requestIds = requestRooms.map((r) => r.request_id).filter(Boolean) as string[];
    const sitterIds = requestRooms.map((r) => r.sitter_id).filter(Boolean) as string[];
    const { data: applications } = await supabase
      .from("applications")
      .select("request_id, sitter_id, status")
      .in("request_id", requestIds)
      .in("sitter_id", sitterIds);
    (applications ?? []).forEach((a) => {
      applicationStatusMap.set(`${a.request_id}-${a.sitter_id}`, a.status);
    });
  }

  const roomsWithReservation = rooms.filter(
    (r) => (r.room_type === "reservation_request" || r.room_type === "direct") && r.reservation_id,
  );
  const reservationStatusMap = new Map<string, string>();
  const reservationLabelMap = new Map<
    string,
    { serviceTitle: string | null; petNames: string[]; startDatetime: string | null }
  >();
  if (roomsWithReservation.length > 0) {
    const reservationIds = roomsWithReservation.map((r) => r.reservation_id).filter(Boolean) as string[];
    const { data: reservations } = await supabase
      .from("reservations")
      .select("id, status, start_datetime, services(title), reservation_items(pets(name))")
      .in("id", reservationIds);
    type ServiceRow = { title: string | null };
    type PetRow = { name: string } | null;
    type ItemRow = { pets: PetRow };
    (reservations ?? []).forEach((r) => {
      const rawService = r.services as unknown as ServiceRow | ServiceRow[] | null;
      const service = Array.isArray(rawService) ? rawService[0] : rawService;
      const items = (r.reservation_items as unknown as ItemRow[]) ?? [];
      reservationStatusMap.set(r.id, r.status);
      reservationLabelMap.set(r.id, {
        serviceTitle: service?.title ?? null,
        petNames: items.map((item) => item.pets?.name).filter((name): name is string => Boolean(name)),
        startDatetime: r.start_datetime ?? null,
      });
    });
  }

  const roomIds = rooms.map((r) => r.id);
  const { data: unreadData } = await supabase.rpc("get_unread_counts", {
    room_ids: roomIds,
    my_id: user.id,
  });

  const unreadCounts: Record<string, number> = {};
  (unreadData ?? []).forEach(({ room_id, count }) => {
    unreadCounts[room_id] = Number(count);
  });

  const result: RoomApiItem[] = rooms.map((room) => {
    const isOwner = room.owner_id === user.id;
    const owner = room.owner as unknown as { full_name: string | null; profile_image: string | null } | null;
    const sitter = room.sitter as unknown as {
      user_id: string;
      rating: number | null;
      sitter_user: { full_name: string | null; profile_image: string | null } | null;
    } | null;
    const request = room.request as unknown as {
      title: string | null;
      status: string | null;
      created_at: string | null;
    } | null;

    return {
      id: room.id,
      room_type: room.room_type as RoomApiItem["room_type"],
      owner_id: room.owner_id,
      sitter_id: room.sitter_id,
      other_user_full_name: isOwner
        ? (sitter?.sitter_user?.full_name ?? "")
        : (owner?.full_name ?? ""),
      other_user_profile_image: isOwner
        ? (sitter?.sitter_user?.profile_image ?? null)
        : (owner?.profile_image ?? null),
      sitter_rating: sitter?.rating ?? null,
      unread_count: unreadCounts[room.id] ?? 0,
      reservation_id: room.reservation_id,
      request_id: room.request_id ?? null,
      request_title: request?.title ?? null,
      request_status: request?.status ?? null,
      request_created_at: request?.created_at ?? null,
      application_status:
        room.room_type === "request" && room.request_id && room.sitter_id
          ? (applicationStatusMap.get(`${room.request_id}-${room.sitter_id}`) ?? null)
          : null,
      reservation_status:
        (room.room_type === "reservation_request" || room.room_type === "direct") && room.reservation_id
          ? (reservationStatusMap.get(room.reservation_id) ?? null)
          : null,
      reservation_service_title:
        (room.room_type === "direct" || room.room_type === "reservation_request") && room.reservation_id
          ? (reservationLabelMap.get(room.reservation_id)?.serviceTitle ?? null)
          : null,
      reservation_pet_names:
        (room.room_type === "direct" || room.room_type === "reservation_request") && room.reservation_id
          ? (reservationLabelMap.get(room.reservation_id)?.petNames ?? [])
          : [],
      reservation_start_datetime:
        (room.room_type === "direct" || room.room_type === "reservation_request") && room.reservation_id
          ? (reservationLabelMap.get(room.reservation_id)?.startDatetime ?? null)
          : null,
      last_message: room.last_message ?? null,
      last_message_at: room.last_message_at ?? null,
      recipient_left: isOwner ? !!room.sitter_left : !!room.owner_left,
    };
  });

  return { ok: true, data: result };
}

export async function getChatMessages(
  roomId: string,
  cursor?: string,
  limit = 50,
): Promise<ActionResult<ChatMessagesPage>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  if (room.owner_id !== user.id && sitter.user_id !== user.id) {
    return { ok: false, error: "채팅방 참여자만 조회할 수 있습니다." };
  }

  let cursorCreatedAt: string | null = null;
  if (cursor) {
    const { data: cursorItem } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", cursor)
      .eq("room_id", roomId)
      .single();
    cursorCreatedAt = cursorItem?.created_at ?? null;
  }

  let query = supabase
    .from("messages")
    .select("id, sender_id, content, is_read, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursorCreatedAt) query = query.lt("created_at", cursorCreatedAt);

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const items = data ?? [];
  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return {
    ok: true,
    data: {
      messages: page.map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
        is_read: m.is_read,
        created_at: m.created_at ?? "",
      })),
      next_cursor: nextCursor,
    },
  };
}

export async function findOrCreateRoom(input: {
  sitter_id: string;
  room_type: "request" | "direct" | "reservation_request";
  request_id?: string | null;
  reservation_id?: string | null;
}): Promise<ActionResult<{ room_id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  let existingRoom: { id: string } | null = null;

  if (input.room_type === "request" && input.request_id) {
    const { data } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("request_id", input.request_id)
      .eq("sitter_id", input.sitter_id)
      .maybeSingle();
    existingRoom = data;
  } else if (input.reservation_id) {
    const { data } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("owner_id", user.id)
      .eq("sitter_id", input.sitter_id)
      .eq("room_type", "direct")
      .order("created_at", { ascending: false })
      .limit(1);
    existingRoom = data?.[0] ?? null;
  } else {
    const [{ data: otherSitter }, { data: mySitter }] = await Promise.all([
      supabase.from("sitters").select("user_id").eq("id", input.sitter_id).maybeSingle(),
      supabase.from("sitters").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    const otherUserId = otherSitter?.user_id;
    const mySitterId = mySitter?.id;

    if (otherUserId && mySitterId) {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("room_type", "direct")
        .or(
          `and(owner_id.eq.${user.id},sitter_id.eq.${input.sitter_id}),` +
            `and(owner_id.eq.${otherUserId},sitter_id.eq.${mySitterId})`,
        )
        .maybeSingle();
      existingRoom = data;
    } else {
      const { data } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("owner_id", user.id)
        .eq("sitter_id", input.sitter_id)
        .eq("room_type", "direct")
        .maybeSingle();
      existingRoom = data;
    }
  }

  if (existingRoom) {
    if (input.reservation_id) {
      await supabase.from("chat_rooms").update({ reservation_id: input.reservation_id }).eq("id", existingRoom.id);
    }
    return { ok: true, data: { room_id: existingRoom.id } };
  }

  const { data: newRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      room_type: input.room_type,
      owner_id: user.id,
      sitter_id: input.sitter_id,
      request_id: input.request_id ?? null,
      reservation_id: input.reservation_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { room_id: newRoom.id } };
}

export async function findChatRoomAsSitter(
  ownerId: string,
  reservationId?: string,
): Promise<ActionResult<{ room_id: string } | null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (reservationId) {
    const { data: room } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("reservation_id", reservationId)
      .eq("room_type", "direct")
      .maybeSingle();
    if (room) return { ok: true, data: { room_id: room.id } };
  }

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sitterProfile) return { ok: false, error: "시터 정보를 찾을 수 없습니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("sitter_id", sitterProfile.id)
    .eq("room_type", "direct")
    .maybeSingle();

  return { ok: true, data: room ? { room_id: room.id } : null };
}

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

  const now = new Date().toISOString();
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: trimmed })
    .select()
    .single();
  if (msgError) return { ok: false, error: msgError.message };

  await supabase
    .from("chat_rooms")
    .update({ last_message: truncatePreview(trimmed), last_message_at: now })
    .eq("id", roomId);

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

  const now = new Date().toISOString();
  const { data: message, error: msgError } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: `${IMAGE_MSG_PREFIX}${imageUrl}` })
    .select()
    .single();
  if (msgError) return { ok: false, error: msgError.message };

  await supabase.from("chat_rooms").update({ last_message: "사진", last_message_at: now }).eq("id", roomId);

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

  const now = new Date().toISOString();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: `${SYSTEM_MSG_PREFIX}${content}` })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: content, last_message_at: now }).eq("id", roomId);

  return { ok: true, data: message };
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!data.amount || data.amount <= 0) return { ok: false, error: "요청 금액은 0원보다 커야 합니다." };

  const now = new Date().toISOString();
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

  await supabase.from("chat_rooms").update({ last_message: "결제 요청", last_message_at: now }).eq("id", roomId);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const now = new Date().toISOString();
  const content = `${PAYMENT_COMPLETE_PREFIX}${JSON.stringify(data)}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "결제 완료", last_message_at: now }).eq("id", roomId);

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

  if (room.owner_id !== user.id) return { ok: false, error: "보호자만 이 작업을 할 수 있습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  const now = new Date().toISOString();
  const content = `${PAYMENT_REQUEST_PREFIX}${JSON.stringify(data)}`;

  // 의도적으로 sitter를 발신자로 지정 — 보호자 화면에 "받은 요청"으로 렌더링되도록 함
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: sitter.user_id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "결제 요청", last_message_at: now }).eq("id", roomId);

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

export async function sendApplicationSelectedMessage(
  roomId: string,
  data: { postTitle: string; postId: string; sitterId: string },
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const now = new Date().toISOString();
  const content = `${APPLICATION_SELECTED_PREFIX}${JSON.stringify(data)}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "선택 확정", last_message_at: now }).eq("id", roomId);

  return { ok: true, data: message };
}

export async function sendApplicationRejectedMessage(
  roomId: string,
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const now = new Date().toISOString();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: APPLICATION_REJECTED_PREFIX })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "지원 거절", last_message_at: now }).eq("id", roomId);

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

  const now = new Date().toISOString();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: RESERVATION_CANCELED_PREFIX })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "예약 취소", last_message_at: now }).eq("id", roomId);

  return { ok: true, data: message };
}

export async function sendServiceCompleteMessage(
  roomId: string,
  reservationId: string,
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

  const now = new Date().toISOString();
  const content = `${SERVICE_COMPLETE_PREFIX}${JSON.stringify({ reservationId, serviceTitle, petName, startDatetime, endDatetime, totalPrice })}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "서비스 완료", last_message_at: now }).eq("id", roomId);

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

  const now = new Date().toISOString();
  const content = `${SERVICE_START_PREFIX}${JSON.stringify({ reservationId, serviceTitle, petName, startDatetime, endDatetime, totalPrice })}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await supabase.from("chat_rooms").update({ last_message: "서비스 시작", last_message_at: now }).eq("id", roomId);

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

export async function leaveRoom(roomId: string): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, sitter_id")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const isOwner = room.owner_id === user.id;
  let isSitter = false;
  if (!isOwner && room.sitter_id) {
    const { data: sitter } = await supabase
      .from("sitters")
      .select("id")
      .eq("id", room.sitter_id)
      .eq("user_id", user.id)
      .maybeSingle();
    isSitter = !!sitter;
  }
  if (!isOwner && !isSitter) return { ok: false, error: "채팅방 참여자만 나갈 수 있습니다." };

  const updateData = isOwner ? { owner_left: true } : { sitter_left: true };
  const { data: updated, error: updateError } = await supabase
    .from("chat_rooms")
    .update(updateData)
    .eq("id", roomId)
    .select("owner_left, sitter_left")
    .single();
  if (updateError) return { ok: false, error: updateError.message };

  if (updated.owner_left && updated.sitter_left) {
    await supabase.from("chat_rooms").delete().eq("id", roomId);
  }

  return { ok: true, data: { id: roomId } };
}

export async function markRoomRead(roomId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitter = room.sitters as unknown as { user_id: string };
  if (room.owner_id !== user.id && sitter.user_id !== user.id) {
    return { ok: false, error: "채팅방 참여자만 읽음 처리할 수 있습니다." };
  }

  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("room_id", roomId)
    .neq("sender_id", user.id)
    .eq("is_read", false);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

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

  await supabase
    .from("chat_rooms")
    .update({ last_message: "예약 수정 요청", last_message_at: new Date().toISOString() })
    .eq("id", roomId);

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

export async function getReservationsByRoom(
  roomId: string,
): Promise<ActionResult<ReservationByRoomItem[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("owner_id, sitter_id, reservation_id, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();
  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sitterRow = room.sitters as unknown as { user_id: string };
  if (room.owner_id !== user.id && sitterRow.user_id !== user.id) {
    return { ok: false, error: "채팅방 참여자만 조회할 수 있습니다." };
  }

  const reservationsQuery = supabase
    .from("reservations")
    .select(
      `id, start_datetime, end_datetime, total_price, status, memo,
       reservation_items(pets(id, name, animal_type))`,
    )
    .in("status", [
      RESERVATION_STATUS.PENDING,
      RESERVATION_STATUS.ACCEPTED,
      RESERVATION_STATUS.PAID,
      RESERVATION_STATUS.IN_PROGRESS,
    ])
    .order("created_at", { ascending: false });

  const { data, error } = room.reservation_id
    ? await reservationsQuery.eq("id", room.reservation_id)
    : await reservationsQuery.eq("owner_id", room.owner_id).eq("sitter_id", room.sitter_id);

  if (error) return { ok: false, error: "예약 정보를 불러오지 못했습니다." };

  type ItemRow = { pets: { id: string; name: string; animal_type: string } | null };

  const reservations: ReservationByRoomItem[] = (data ?? []).map((item) => {
    const items = (item.reservation_items as unknown as ItemRow[] | null) ?? [];
    return {
      id: item.id,
      start_datetime: item.start_datetime,
      end_datetime: item.end_datetime,
      total_price: item.total_price,
      status: item.status,
      memo: item.memo,
      pets: items.map((ri) => ri.pets).filter((p): p is { id: string; name: string; animal_type: string } => p != null),
    };
  });

  return { ok: true, data: reservations };
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
  await supabase
    .from("chat_rooms")
    .update({ last_message: lastMsg, last_message_at: new Date().toISOString() })
    .eq("id", roomId);

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
