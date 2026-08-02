import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { ROOM_TYPE, type RoomType } from "@/lib/constants";

type Supabase = SupabaseClient<Database>;

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

export async function flipReservationRequestToDirect(
  supabase: Supabase,
  roomId: string,
): Promise<void> {
  await supabase.from("chat_rooms").update({ room_type: ROOM_TYPE.DIRECT }).eq("id", roomId);
}
