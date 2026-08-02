"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { findRequestRoom, findOrCreateRequestRoom, promoteApplicationRoomToDirect } from "@/lib/chat-rooms";
import { APPLICATION_STATUS, RESERVATION_STATUS } from "@/lib/constants";
import { isOverlapViolation } from "@/lib/db-errors";
import type { ApplicationRequestDetails } from "@/features/applications/types";

type CreateApplicationResult =
  | { ok: true; data: { applicationId: string; roomId: string | null } }
  | { ok: false; error: string };

export async function createApplication(
  requestId: string,
  input: { message?: string | null; proposed_price?: number | null },
): Promise<CreateApplicationResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  if (input.proposed_price != null && input.proposed_price < 1000) {
    return { ok: false, error: "제안 금액은 1,000원 이상이어야 합니다." };
  }

  const { data: sitter } = await supabase
    .from("sitters")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sitter) return { ok: false, error: "펫시터만 지원할 수 있습니다." };
  if (sitter.status !== "approved") {
    return { ok: false, error: "승인된 펫시터만 지원할 수 있습니다." };
  }

  const { data: requestRow } = await supabase
    .from("requests")
    .select("id, status, owner_id")
    .eq("id", requestId)
    .single();

  if (!requestRow) return { ok: false, error: "구인글을 찾을 수 없습니다." };
  if (requestRow.owner_id === user.id) {
    return { ok: false, error: "본인의 구인글에는 지원할 수 없습니다." };
  }
  if (requestRow.status !== "open") {
    return { ok: false, error: "모집 중인 구인글에만 지원할 수 있습니다." };
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("request_id", requestId)
    .eq("sitter_id", sitter.id)
    .maybeSingle();

  if (existing) return { ok: false, error: "이미 지원한 구인글입니다." };

  const { data: application, error } = await supabase
    .from("applications")
    .insert({
      request_id: requestId,
      sitter_id: sitter.id,
      message: input.message ?? null,
      proposed_price: input.proposed_price ?? null,
      status: APPLICATION_STATUS.PENDING,
    })
    .select("id")
    .single();

  if (error || !application) return { ok: false, error: "지원에 실패했습니다." };

  const room = await findOrCreateRequestRoom(supabase, {
    requestId,
    sitterId: sitter.id,
    ownerId: requestRow.owner_id,
  });
  if (!room) return { ok: false, error: "채팅방 개설에 실패했습니다." };
  const roomId = room.id;

  const { data: sitterUser } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const sitterName = sitterUser?.full_name ?? "펫시터";

  await supabase.from("notifications").insert({
    user_id: requestRow.owner_id,
    type: "application",
    title: "새로운 지원자가 도착했어요",
    content: `${sitterName}님이 구인글에 지원했습니다.`,
    link_url: roomId ? `/chat?roomId=${roomId}` : `/board/${requestId}`,
  });

  return { ok: true, data: { applicationId: application.id, roomId } };
}

export async function getRequestDetailsForReservation(
  roomId: string,
): Promise<{ ok: true; data: ApplicationRequestDetails } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("request_id, sitter_id")
    .eq("id", roomId)
    .single();

  if (!room?.request_id) return { ok: false, error: "구인글 정보를 찾을 수 없습니다." };

  const { data: request } = await supabase
    .from("requests")
    .select("id, title, start_datetime, end_datetime, request_type, location, budget, pet_id")
    .eq("id", room.request_id)
    .single();

  if (!request) return { ok: false, error: "구인글을 찾을 수 없습니다." };

  const { data: application } = await supabase
    .from("applications")
    .select("proposed_price")
    .eq("request_id", room.request_id)
    .eq("sitter_id", room.sitter_id)
    .maybeSingle();

  let petName: string | null = null;
  let petAnimalType: string | null = null;
  let petBreed: string | null = null;
  if (request.pet_id) {
    const { data: pet } = await supabase
      .from("pets")
      .select("name, animal_type, breed")
      .eq("id", request.pet_id)
      .maybeSingle();
    if (pet) {
      petName = pet.name;
      petAnimalType = pet.animal_type;
      petBreed = pet.breed;
    }
  }

  return {
    ok: true,
    data: {
      title: request.title,
      startDatetime: request.start_datetime,
      endDatetime: request.end_datetime,
      requestType: request.request_type,
      location: request.location,
      totalPrice: application?.proposed_price ?? request.budget,
      petName,
      petAnimalType,
      petBreed,
    },
  };
}

type UpdateApplicationResult =
  | {
      ok: true;
      data: { applicationId: string; reservationId: string | null; roomId: string | null };
    }
  | { ok: false; error: string };

export async function updateApplication(
  id: string,
  input: { status: "accepted" | "rejected" | "canceled" },
  overrides?: {
    startDatetime?: string | null;
    endDatetime?: string | null;
    totalPrice?: number | null;
    location?: string | null;
  },
): Promise<UpdateApplicationResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: application } = await supabase
    .from("applications")
    .select(
      `id, sitter_id, request_id, proposed_price, status,
       requests!inner(id, owner_id, start_datetime, end_datetime, budget, status, pet_id)`,
    )
    .eq("id", id)
    .single();

  if (!application) return { ok: false, error: "지원 정보를 찾을 수 없습니다." };

  const requestRow = application.requests;

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = requestRow.owner_id === user.id;
  const isSitter = sitterProfile?.id === application.sitter_id;

  if (input.status === "accepted" || input.status === "rejected") {
    if (!isOwner) return { ok: false, error: "구인글 작성자만 선택/거절할 수 있습니다." };
  } else if (input.status === "canceled") {
    if (!isSitter) return { ok: false, error: "지원한 펫시터만 취소할 수 있습니다." };
  }

  let reservationId: string | null = null;
  let roomId: string | null = null;

  if (input.status === "accepted") {
    if (requestRow.status !== "open") {
      return { ok: false, error: "이미 매칭된 구인글입니다." };
    }

    const { data: applicantSitter } = await supabase
      .from("sitters")
      .select("status")
      .eq("id", application.sitter_id)
      .single();

    if (applicantSitter?.status !== "approved") {
      return { ok: false, error: "승인된 펫시터만 선택할 수 있습니다." };
    }

    const totalPrice = overrides?.totalPrice ?? application.proposed_price ?? requestRow.budget ?? 0;
    const startDatetime = overrides?.startDatetime ?? requestRow.start_datetime;
    const endDatetime = overrides?.endDatetime ?? requestRow.end_datetime;

    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        owner_id: requestRow.owner_id,
        sitter_id: application.sitter_id,
        service_id: null,
        request_id: requestRow.id,
        application_id: id,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        total_price: totalPrice,
        status: RESERVATION_STATUS.ACCEPTED,
        accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (reservationError || !reservation) {
      if (isOverlapViolation(reservationError)) {
        return { ok: false, error: "해당 기간에 이미 확정된 예약이 있습니다. 기존 예약을 먼저 정리해주세요." };
      }
      return { ok: false, error: "예약 생성에 실패했습니다." };
    }

    reservationId = reservation.id;

    if (requestRow.pet_id) {
      const { error: itemsError } = await supabase
        .from("reservation_items")
        .insert({ reservation_id: reservation.id, pet_id: requestRow.pet_id });
      if (itemsError) {
        await supabase.from("reservations").delete().eq("id", reservation.id);
        return { ok: false, error: "예약 생성에 실패했습니다." };
      }
    }

    const room = await promoteApplicationRoomToDirect(supabase, {
      requestId: requestRow.id,
      sitterId: application.sitter_id,
      ownerId: requestRow.owner_id,
      reservationId: reservation.id,
      applicationId: id,
    });
    if (!room) {
      await supabase.from("reservation_items").delete().eq("reservation_id", reservation.id);
      await supabase.from("reservations").delete().eq("id", reservation.id);
      return { ok: false, error: "채팅방 생성/전환에 실패했습니다." };
    }
    roomId = room.id;

    // 이 시점부터는 chat_rooms.reservation_id가 이 예약을 참조하므로,
    // 이후 실패는 reservation_items/reservations를 롤백(삭제)할 수 없다
    // (FK 제약 위반). 에러만 반환하고 이미 만들어진 예약·채팅방은 남겨둔다.
    const { error: requestUpdateError } = await supabase
      .from("requests")
      .update({ status: "matched" })
      .eq("id", requestRow.id);
    if (requestUpdateError) {
      return { ok: false, error: "구인글 상태 갱신에 실패했습니다." };
    }
  }

  const { data, error } = await supabase
    .from("applications")
    .update({ status: input.status })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: "지원 상태 변경에 실패했습니다." };

  if (input.status === "accepted" || input.status === "rejected") {
    const { data: applicantSitter } = await supabase
      .from("sitters")
      .select("user_id")
      .eq("id", application.sitter_id)
      .single();

    if (applicantSitter?.user_id) {
      if (!roomId) {
        const chatRoom = await findRequestRoom(supabase, application.request_id, application.sitter_id);
        roomId = chatRoom?.id ?? null;
      }
      const chatLink = roomId ? `/chat?roomId=${roomId}` : undefined;

      if (input.status === "accepted") {
        await supabase.from("notifications").insert({
          user_id: applicantSitter.user_id,
          type: "application_selected",
          title: "지원이 수락되었어요",
          content: "구인글 작성자의 예약이 완료될 때까지 기다려주세요.",
          link_url: chatLink,
        });
      } else {
        await supabase.from("notifications").insert({
          user_id: applicantSitter.user_id,
          type: "application_rejected",
          title: "지원이 거절되었습니다",
          content: "아쉽지만 다음 기회를 기다려봐요. 다른 구인글도 확인해 보세요.",
          link_url: chatLink,
        });
      }
    }
  }

  return { ok: true, data: { applicationId: data.id, reservationId, roomId } };
}

export async function updateApplicationByRoom(
  roomId: string,
  status: "accepted" | "rejected",
  overrides?: {
    startDatetime?: string | null;
    endDatetime?: string | null;
    totalPrice?: number | null;
    location?: string | null;
  },
): Promise<UpdateApplicationResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("request_id, sitter_id")
    .eq("id", roomId)
    .single();

  if (!room?.request_id) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const { data: application } = await supabase
    .from("applications")
    .select("id")
    .eq("request_id", room.request_id)
    .eq("sitter_id", room.sitter_id)
    .maybeSingle();

  if (!application) return { ok: false, error: "지원 정보를 찾을 수 없습니다." };

  return updateApplication(application.id, { status }, overrides);
}
