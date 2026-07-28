import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { ROOM_TYPE, type RoomType } from "@/lib/constants";

/**
 * chat_rooms 데이터 접근 원시함수 모음.
 *
 * 방 조회·생성·room_type 전이·미리보기 갱신 로직을 한 곳에 모아, 이 로직이
 * chat/reservations/applications feature에 흩어져 생기던 하이재킹·중복 방 버그를
 * 구조적으로 차단한다. 각 함수는 요청 스코프의 supabase 클라이언트를 받아
 * 호출 액션의 인증 컨텍스트(RLS)를 그대로 쓴다.
 *
 * 주의: 이 모듈은 데이터 접근 계층이지 인가(authz) 경계가 아니다. 호출하는
 * 각 Server Action이 getUser() + 소유권/역할 검사를 먼저 하고 나서 부른다.
 */

type Supabase = SupabaseClient<Database>;

/** 방의 last_message/last_message_at 미리보기를 현재 시각으로 갱신한다. */
export async function touchRoomPreview(
  supabase: Supabase,
  roomId: string,
  label: string,
): Promise<void> {
  await supabase
    .from("chat_rooms")
    .update({ last_message: label, last_message_at: new Date().toISOString() })
    .eq("id", roomId);
}

/**
 * 예약에 연결된 방을 찾는다. roomType을 주면 그 타입으로 한정한다.
 * 여러 개가 있으면 가장 최근 생성된 것을 반환(일관되게 order+limit).
 */
export async function findRoomByReservation(
  supabase: Supabase,
  reservationId: string,
  opts?: { roomType?: RoomType },
): Promise<{ id: string } | null> {
  let query = supabase
    .from("chat_rooms")
    .select("id")
    .eq("reservation_id", reservationId);
  if (opts?.roomType) query = query.eq("room_type", opts.roomType);
  const { data } = await query.order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

/** 보호자-시터 쌍의 direct 방을 찾는다(가장 최근 것). */
export async function findDirectRoomByParties(
  supabase: Supabase,
  ownerId: string,
  sitterId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("sitter_id", sitterId)
    .eq("room_type", ROOM_TYPE.DIRECT)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

/**
 * 구인글 지원(request) 방을 찾는다. (request_id, sitter_id)는 DB에서 unique라
 * 최대 한 행만 매칭된다.
 */
export async function findRequestRoom(
  supabase: Supabase,
  requestId: string,
  sitterId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("request_id", requestId)
    .eq("sitter_id", sitterId)
    .maybeSingle();
  return data ?? null;
}

/**
 * 구인글 지원 시 방을 찾거나 만든다. 없으면 room_type="request"로 생성.
 * 실패 시 null 반환 — 호출부가 롤백 여부를 판단한다.
 */
export async function findOrCreateRequestRoom(
  supabase: Supabase,
  params: { requestId: string; sitterId: string; ownerId: string },
): Promise<{ id: string } | null> {
  const existing = await findRequestRoom(supabase, params.requestId, params.sitterId);
  if (existing) return existing;

  const { data: newRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      room_type: ROOM_TYPE.REQUEST,
      owner_id: params.ownerId,
      sitter_id: params.sitterId,
      request_id: params.requestId,
    })
    .select("id")
    .single();
  if (error || !newRoom) return null;
  return newRoom;
}

/**
 * 지원 수락 시 방을 direct로 만든다. 방은 "지원(신청) 건당 하나"이므로,
 * 같은 보호자-시터 쌍에 다른 지원/예약 건으로 만들어진 direct 방이 이미
 * 있더라도 재사용하지 않는다 — 이 지원 자신의 지원 스레드(request 방,
 * request_id 기준)만 direct로 승격한다. 그 방이 없으면(비정상 케이스) 이
 * 지원 전용의 새 direct 방을 만든다.
 * 실패 시 null 반환 — 호출부가 이미 커밋된 예약의 롤백 여부를 판단한다.
 */
export async function promoteApplicationRoomToDirect(
  supabase: Supabase,
  params: {
    requestId: string;
    sitterId: string;
    ownerId: string;
    reservationId: string;
    applicationId: string;
  },
): Promise<{ id: string } | null> {
  const requestRoom = await findRequestRoom(supabase, params.requestId, params.sitterId);

  if (!requestRoom) {
    const { data: newRoom, error } = await supabase
      .from("chat_rooms")
      .insert({
        room_type: ROOM_TYPE.DIRECT,
        owner_id: params.ownerId,
        sitter_id: params.sitterId,
        request_id: params.requestId,
        reservation_id: params.reservationId,
        application_id: params.applicationId,
      })
      .select("id")
      .single();
    if (error || !newRoom) return null;
    return newRoom;
  }

  const { error } = await supabase
    .from("chat_rooms")
    .update({
      room_type: ROOM_TYPE.DIRECT,
      reservation_id: params.reservationId,
      application_id: params.applicationId,
      owner_left: false,
      sitter_left: false,
    })
    .eq("id", requestRoom.id);
  if (error) return null;
  return requestRoom;
}

/**
 * 예약 요청("예약하기") 시 이 예약 전용의 새 방을 만든다. 방은 예약 건당
 * 하나이므로, 같은 보호자-시터 쌍에 다른 예약으로 만들어진 방이 있어도
 * 재사용하지 않는다. 실패 시 null 반환.
 */
export async function createReservationRequestRoom(
  supabase: Supabase,
  params: {
    ownerId: string;
    sitterId: string;
    reservationId: string;
  },
): Promise<{ id: string } | null> {
  const { data: newRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      room_type: ROOM_TYPE.RESERVATION_REQUEST,
      owner_id: params.ownerId,
      sitter_id: params.sitterId,
      reservation_id: params.reservationId,
    })
    .select("id")
    .single();
  if (error || !newRoom) return null;
  return newRoom;
}

/** 예약 요청 수락 시 방을 direct로 전환한다. */
export async function flipReservationRequestToDirect(
  supabase: Supabase,
  roomId: string,
): Promise<void> {
  await supabase.from("chat_rooms").update({ room_type: ROOM_TYPE.DIRECT }).eq("id", roomId);
}
