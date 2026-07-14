"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { RESERVATION_STATUS } from "@/lib/constants";
import type { Database } from "@/types/database.types";
import type { CareRecordPayload } from "@/features/care-records/types";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

export type CareRecord = Database["public"]["Tables"]["care_records"]["Row"];

export async function createCareRecord(
  payload: CareRecordPayload,
): Promise<ActionResult<CareRecord>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!payload.reservationId) {
    return { ok: false, error: "예약 정보가 필요합니다." };
  }

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sitterProfile) {
    return { ok: false, error: "펫시터만 돌봄기록을 작성할 수 있습니다." };
  }
  if (sitterProfile.status !== "approved") {
    return { ok: false, error: "승인된 펫시터만 돌봄기록을 작성할 수 있습니다." };
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id")
    .eq("id", payload.reservationId)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };
  if (reservation.sitter_id !== sitterProfile.id) {
    return { ok: false, error: "본인이 담당하는 예약에만 돌봄기록을 작성할 수 있습니다." };
  }

  const { data, error } = await supabase
    .from("care_records")
    .insert({
      reservation_id: payload.reservationId,
      sitter_id: sitterProfile.id,
      type: payload.type,
      service_type: payload.serviceType ?? null,
      title: payload.title,
      status_text: payload.statusText,
      content: payload.content,
      fields: payload.fields,
      image_urls: payload.imageUrls,
    })
    .select()
    .single();

  if (error || !data) return { ok: false, error: "돌봄기록 등록에 실패했습니다." };

  const { data: sitterUser } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const sitterName = sitterUser?.full_name ?? "펫시터";

  await createNotification(supabase, {
    userId: reservation.owner_id,
    type: "care_record",
    title: "돌봄기록이 도착했어요",
    content: `${sitterName}님이 '${payload.title}'을 기록했습니다.`,
    linkUrl: `/myprofile/booking-history/${payload.reservationId}`,
  });

  return { ok: true, data };
}

export async function getInProgressReservationByOwnerAndSitter(
  ownerId: string,
  sitterId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("reservations")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("sitter_id", sitterId)
    .eq("status", RESERVATION_STATUS.IN_PROGRESS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: "예약 조회에 실패했습니다." };
  if (!data) return { ok: false, error: "진행 중인 예약이 없습니다." };

  return { ok: true, data: { id: data.id } };
}

export async function getCareRecordsByReservationId(
  reservationId: string,
): Promise<ActionResult<CareRecord[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("owner_id, sitter_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  const isOwner = reservation.owner_id === user.id;

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isSitter = sitterProfile?.id === reservation.sitter_id;

  if (!isOwner && !isSitter) {
    return { ok: false, error: "권한이 없습니다." };
  }

  const { data, error } = await supabase
    .from("care_records")
    .select("*")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: true });

  if (error) return { ok: false, error: "돌봄기록 조회에 실패했습니다." };

  return { ok: true, data: data ?? [] };
}
