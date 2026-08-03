"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { RESERVATION_STATUS } from "@/lib/constants";
import { fetchPublicProfiles } from "@/lib/public-profiles";
import type { RoomApiItem, ChatMessagesPage, ReservationByRoomItem } from "@/features/chat/types";
import type { ActionResult } from "./shared";

type SitterEmbed = { user_id: string; rating: number | null } | null;

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
       sitter:sitters!sitter_id(user_id, rating),
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

  const otherUserIdOf = (room: (typeof rooms)[number]) =>
    room.owner_id === user.id ? (room.sitter as unknown as SitterEmbed)?.user_id : room.owner_id;

  const profiles = await fetchPublicProfiles(supabase, rooms.map(otherUserIdOf));

  const result: RoomApiItem[] = rooms.map((room) => {
    const isOwner = room.owner_id === user.id;
    const sitter = room.sitter as unknown as SitterEmbed;
    const otherUserId = otherUserIdOf(room);
    const other = otherUserId ? profiles.get(otherUserId) : undefined;
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
      other_user_full_name: other?.full_name ?? "",
      other_user_profile_image: other?.profile_image ?? null,
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

export async function leaveRoom(roomId: string): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

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
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

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
