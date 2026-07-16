"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { RESERVATION_STATUS } from "@/lib/constants";
import {
  RESERVATION_REQUEST_PREFIX,
  RESERVATION_ACCEPTED_PREFIX,
  RESERVATION_REJECTED_PREFIX,
  RESERVATION_CANCELED_PREFIX,
  PAYMENT_REQUEST_PREFIX,
  SERVICE_COMPLETE_CONFIRMED_PREFIX,
} from "@/lib/chat-message-prefixes";
import type {
  ReservationUiStatus,
  MyReservation,
  MySitterReservation,
  ReservationDetail,
  ActiveReservation,
  ReservationRequestDetails,
  ReservationByRoomItem,
} from "@/features/reservations/types";
import type { TablesUpdate } from "@/types/database.types";

const SERVICE_TYPE_LABEL: Record<string, string> = {
  walk: "산책",
  care: "방문 돌봄",
  hotel: "위탁 돌봄",
  pickup: "픽업",
};

// ---------------------------------------------------------------------------
// petsitters/actions.ts에서 그대로 이동한 함수 (로직 변경 없음)
// ---------------------------------------------------------------------------

const CANCELABLE_STATUSES: string[] = [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.ACCEPTED];

type CancelReservationResult = { ok: true } | { ok: false; error: string };

export async function cancelReservation(
  id: string,
  reason?: string,
): Promise<CancelReservationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select("owner_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!reservation || reservation.owner_id !== user.id) {
    return { ok: false, error: "예약 정보를 찾을 수 없습니다." };
  }

  if (!CANCELABLE_STATUSES.includes(reservation.status)) {
    return { ok: false, error: "취소할 수 없는 예약 상태입니다." };
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      status: RESERVATION_STATUS.CANCELED,
      canceled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "예약 취소에 실패했습니다." };
  }

  revalidatePath("/myprofile/booking-history");
  revalidatePath(`/myprofile/booking-history/${id}`);
  return { ok: true };
}

const STATUS_MAP: Record<string, ReservationUiStatus> = {
  pending: "pending",
  accepted: "confirmed",
  paid: "confirmed",
  in_progress: "in-progress",
  completed: "completed",
  canceled: "cancelled",
};

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

function formatDate(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}

function formatTime(start: Date, end: Date) {
  return `${pad(start.getHours())}:${pad(start.getMinutes())} – ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function bookingNumber(id: string, createdAt: string) {
  const c = new Date(createdAt);
  return `BK-${c.getFullYear()}${pad(c.getMonth() + 1)}${pad(c.getDate())}-${id.slice(-3).toUpperCase()}`;
}

function reviewWasWritten(review: unknown): boolean {
  return Array.isArray(review) ? review.length > 0 : review != null;
}

const RESERVATION_LIST_SELECT = `
  id, status, start_datetime, end_datetime, total_price, created_at,
  services(title),
  sitters(available_area, rating, users(full_name, profile_image)),
  reservation_items(pets(name, breed, animal_type)),
  reviews(id)
`;

export async function getMyReservations(): Promise<MyReservation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("reservations")
    .select(RESERVATION_LIST_SELECT)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const start = new Date(row.start_datetime ?? "");
    const end = new Date(row.end_datetime ?? "");
    // Supabase는 Database 제네릭 없이는 to-one 조인도 배열 타입으로 추론한다 —
    // 실제로는 단일 행이므로 여기서 좁혀준다.
    const service = row.services as unknown as { title: string | null } | null;
    const sitter = row.sitters as unknown as {
      available_area: string | null;
      rating: number | null;
      users: { full_name: string | null; profile_image: string | null } | null;
    } | null;
    const items = row.reservation_items as unknown as {
      pets: { name: string; breed: string | null; animal_type: string } | null;
    }[];
    const firstPet = items?.[0]?.pets ?? null;

    return {
      id: row.id,
      bookingNo: bookingNumber(row.id, row.created_at ?? ""),
      serviceType: service?.title ?? "-",
      status: STATUS_MAP[row.status] ?? "pending",
      sitterName: sitter?.users?.full_name ?? "-",
      sitterImage: sitter?.users?.profile_image ?? null,
      sitterRating: sitter?.rating ?? 0,
      date: formatDate(start),
      time: formatTime(start, end),
      location: sitter?.available_area ?? "-",
      petName: firstPet?.name ?? "-",
      petType: firstPet?.breed ?? firstPet?.animal_type ?? "-",
      price: row.total_price,
      reviewWritten: reviewWasWritten(row.reviews),
    };
  });
}

export async function getMySitterReservations(): Promise<MySitterReservation[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: sitter } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sitter) return [];

  const { data } = await supabase
    .from("reservations")
    .select(
      `id, status, start_datetime, end_datetime, total_price, created_at,
       services(title),
       owner:users!owner_id(full_name, profile_image),
       reservation_items(pets(name, breed, animal_type))`,
    )
    .eq("sitter_id", sitter.id)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const start = new Date(row.start_datetime ?? "");
    const end = new Date(row.end_datetime ?? "");
    const service = row.services as unknown as { title: string | null } | null;
    const owner = row.owner as unknown as { full_name: string | null; profile_image: string | null } | null;
    const items = row.reservation_items as unknown as {
      pets: { name: string; breed: string | null; animal_type: string } | null;
    }[];
    const firstPet = items?.[0]?.pets ?? null;

    return {
      id: row.id,
      bookingNo: bookingNumber(row.id, row.created_at ?? ""),
      serviceType: service?.title ?? "-",
      status: STATUS_MAP[row.status] ?? "pending",
      ownerName: owner?.full_name ?? "-",
      ownerImage: owner?.profile_image ?? null,
      date: formatDate(start),
      time: formatTime(start, end),
      petName: firstPet?.name ?? "-",
      petType: firstPet?.breed ?? firstPet?.animal_type ?? "-",
      price: row.total_price,
    };
  });
}

export async function getReservationById(id: string): Promise<ReservationDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: row } = await supabase
    .from("reservations")
    .select(
      `id, status, start_datetime, end_datetime, total_price, created_at, owner_id, sitter_id,
       services(title),
       sitters(available_area, rating, users(full_name, is_verified, profile_image)),
       reservation_items(pets(name, breed, animal_type, age, weight, image_url)),
       reviews(id)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!row || row.owner_id !== user.id) return null;

  const { count: reviewCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("sitter_id", row.sitter_id);

  const start = new Date(row.start_datetime ?? "");
  const end = new Date(row.end_datetime ?? "");
  const service = row.services as unknown as { title: string | null } | null;
  const sitter = row.sitters as unknown as {
    available_area: string | null;
    rating: number | null;
    users: {
      full_name: string | null;
      is_verified: boolean | null;
      profile_image: string | null;
    } | null;
  } | null;
  const items = row.reservation_items as unknown as {
    pets: {
      name: string;
      breed: string | null;
      animal_type: string;
      age: number | null;
      weight: number | null;
      image_url: string | null;
    } | null;
  }[];
  const firstPet = items?.[0]?.pets ?? null;

  return {
    id: row.id,
    bookingNo: bookingNumber(row.id, row.created_at ?? ""),
    serviceType: service?.title ?? "-",
    status: STATUS_MAP[row.status] ?? "pending",
    sitter: {
      name: sitter?.users?.full_name ?? "-",
      image: sitter?.users?.profile_image ?? null,
      rating: sitter?.rating ?? 0,
      reviewCount: reviewCount ?? 0,
      certified: sitter?.users?.is_verified ?? false,
    },
    date: formatDate(start),
    time: formatTime(start, end),
    location: sitter?.available_area ?? "-",
    pet: {
      name: firstPet?.name ?? "-",
      breed: firstPet?.breed ?? firstPet?.animal_type ?? "-",
      animalType: firstPet?.animal_type ?? "other",
      age: firstPet?.age ?? 0,
      weight: firstPet?.weight != null ? Number(firstPet.weight) : 0,
      imageUrl: firstPet?.image_url ?? null,
    },
    price: row.total_price,
    reviewWritten: reviewWasWritten(row.reviews),
  };
}

// ---------------------------------------------------------------------------
// 채팅이 필요로 하는 예약 생애주기 함수 이식
// (react/lookpup의 actions/reservations.ts 이식, service-role → RLS 준수 클라이언트로 조정)
// ---------------------------------------------------------------------------

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

async function verifyPetOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  petIds: string[],
  userId: string,
) {
  const { count } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .in("id", petIds)
    .eq("owner_id", userId)
    .is("deleted_at", null);

  return (count ?? 0) === new Set(petIds).size;
}

type UpdateStatus =
  | typeof RESERVATION_STATUS.ACCEPTED
  | typeof RESERVATION_STATUS.IN_PROGRESS
  | typeof RESERVATION_STATUS.COMPLETED
  | typeof RESERVATION_STATUS.CANCELED;

const VALID_TRANSITIONS: Record<UpdateStatus, string[]> = {
  [RESERVATION_STATUS.ACCEPTED]: [RESERVATION_STATUS.PENDING],
  [RESERVATION_STATUS.IN_PROGRESS]: [RESERVATION_STATUS.PAID],
  [RESERVATION_STATUS.COMPLETED]: [RESERVATION_STATUS.IN_PROGRESS],
  [RESERVATION_STATUS.CANCELED]: [
    RESERVATION_STATUS.PENDING,
    RESERVATION_STATUS.ACCEPTED,
    RESERVATION_STATUS.PAID,
  ],
};

export async function updateReservation(
  id: string,
  input: { status: UpdateStatus; cancel_reason?: string | null },
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, status")
    .eq("id", id)
    .single();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  if (!VALID_TRANSITIONS[input.status].includes(reservation.status)) {
    return {
      ok: false,
      error: `${reservation.status} 상태에서 ${input.status}로 변경할 수 없습니다.`,
    };
  }

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = reservation.owner_id === user.id;
  const isSitter = sitterProfile?.id === reservation.sitter_id;

  if (
    input.status === RESERVATION_STATUS.ACCEPTED ||
    input.status === RESERVATION_STATUS.IN_PROGRESS ||
    input.status === RESERVATION_STATUS.COMPLETED
  ) {
    if (!isSitter) return { ok: false, error: "펫시터만 처리할 수 있습니다." };
  } else if (input.status === RESERVATION_STATUS.CANCELED) {
    if (!isOwner && !isSitter) return { ok: false, error: "예약 당사자만 취소할 수 있습니다." };
  }

  const now = new Date().toISOString();
  const updatePayload: TablesUpdate<"reservations"> = { status: input.status };
  if (input.status === RESERVATION_STATUS.ACCEPTED) updatePayload.accepted_at = now;
  else if (input.status === RESERVATION_STATUS.COMPLETED) updatePayload.completed_at = now;
  else if (input.status === RESERVATION_STATUS.CANCELED) updatePayload.canceled_at = now;
  if (input.status === RESERVATION_STATUS.CANCELED && input.cancel_reason) {
    updatePayload.cancel_reason = input.cancel_reason;
  }

  const { error } = await supabase.from("reservations").update(updatePayload).eq("id", id);
  if (error) return { ok: false, error: "예약 상태 변경에 실패했습니다." };

  return { ok: true, data: { id } };
}

export async function cancelReservationAndNotify(
  id: string,
  cancelReason?: string | null,
): Promise<ActionResult<{ id: string; chatRoomId?: string }>> {
  const result = await updateReservation(id, {
    status: RESERVATION_STATUS.CANCELED,
    cancel_reason: cancelReason,
  });
  if (!result.ok) return result;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return result;

  const { data: roomsByReservation } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("reservation_id", id)
    .eq("room_type", "direct")
    .order("created_at", { ascending: false })
    .limit(1);

  let room = roomsByReservation?.[0] ?? null;
  if (!room) {
    const { data: reservation } = await supabase
      .from("reservations")
      .select("owner_id, sitter_id")
      .eq("id", id)
      .single();
    if (reservation) {
      const { data: fallbackRooms } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("owner_id", reservation.owner_id)
        .eq("sitter_id", reservation.sitter_id)
        .eq("room_type", "direct")
        .order("created_at", { ascending: false })
        .limit(1);
      room = fallbackRooms?.[0] ?? null;
    }
  }

  if (!room) return result;

  const now = new Date().toISOString();
  await supabase.from("messages").insert({
    room_id: room.id,
    sender_id: user.id,
    content: RESERVATION_CANCELED_PREFIX,
  });
  await supabase
    .from("chat_rooms")
    .update({ last_message: "예약 취소", last_message_at: now })
    .eq("id", room.id);

  return { ok: true, data: { id, chatRoomId: room.id } };
}

export async function getActiveReservationsForRoom(
  roomId: string,
): Promise<ActionResult<ActiveReservation[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, sitter_id, reservation_id, sitters!inner(user_id)")
    .eq("id", roomId)
    .single();

  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const sittersRow = room.sitters as unknown as { user_id: string };
  if (sittersRow.user_id !== user.id) {
    return { ok: false, error: "펫시터만 조회할 수 있습니다." };
  }

  const activeQuery = supabase
    .from("reservations")
    .select(
      `
      id, status, start_datetime, end_datetime, total_price,
      services(title, service_type),
      reservation_items(pets(name, animal_type)),
      payments(amount, status)
    `,
    )
    .in("status", [
      RESERVATION_STATUS.ACCEPTED,
      RESERVATION_STATUS.PAID,
      RESERVATION_STATUS.IN_PROGRESS,
    ])
    .order("created_at", { ascending: false });

  const { data, error } = room.reservation_id
    ? await activeQuery.eq("id", room.reservation_id)
    : await activeQuery.eq("owner_id", room.owner_id).eq("sitter_id", room.sitter_id);

  if (error) return { ok: false, error: "예약 정보를 불러오지 못했습니다." };

  type ServiceRow = { title: string | null; service_type: string | null } | null;
  type PetRow = { name: string; animal_type: string } | null;
  type ItemRow = { pets: PetRow };
  type PaymentRow = { amount: number; status: string };

  const reservations: ActiveReservation[] = (data ?? []).map((r) => {
    const service = r.services as unknown as ServiceRow;
    const items = (r.reservation_items as unknown as ItemRow[]) ?? [];
    const firstPet = items[0]?.pets;
    const serviceTitle =
      service?.title ||
      (service?.service_type ? (SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type) : null) ||
      "펫시팅 서비스";
    const paidPayments = (r.payments as unknown as PaymentRow[] | null) ?? [];
    const paidTotal = paidPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      id: r.id,
      status: r.status,
      startDatetime: r.start_datetime ?? null,
      endDatetime: r.end_datetime ?? null,
      totalPrice: paidTotal || (r.total_price ?? 0),
      isBasePaid: r.status === RESERVATION_STATUS.PAID || r.status === RESERVATION_STATUS.IN_PROGRESS || paidTotal > 0,
      serviceTitle,
      petName: firstPet?.name ?? null,
    };
  });

  return { ok: true, data: reservations };
}

export async function getReadyReservationsForRoom(
  roomId: string,
): Promise<ActionResult<ActiveReservation[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, owner_id, sitter_id, reservation_id")
    .eq("id", roomId)
    .single();

  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const readyQuery = supabase
    .from("reservations")
    .select(
      `
      id, status, start_datetime, end_datetime, total_price,
      services(title, service_type),
      reservation_items(pets(name, animal_type)),
      payments(amount, status)
    `,
    )
    .in("status", [RESERVATION_STATUS.ACCEPTED, RESERVATION_STATUS.PAID])
    .order("created_at", { ascending: false });

  const { data, error } = room.reservation_id
    ? await readyQuery.eq("id", room.reservation_id)
    : await readyQuery.eq("owner_id", room.owner_id).eq("sitter_id", room.sitter_id);

  if (error) return { ok: false, error: "예약 정보를 불러오지 못했습니다." };

  type ServiceRow = { title: string | null; service_type: string | null } | null;
  type PetRow = { name: string; animal_type: string } | null;
  type ItemRow = { pets: PetRow };
  type PaymentRow = { amount: number; status: string };

  const reservations: ActiveReservation[] = (data ?? []).map((r) => {
    const service = r.services as unknown as ServiceRow;
    const items = (r.reservation_items as unknown as ItemRow[]) ?? [];
    const firstPet = items[0]?.pets;
    const serviceTitle =
      service?.title ||
      (service?.service_type ? (SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type) : null) ||
      "펫시팅 서비스";
    const paidPayments = (r.payments as unknown as PaymentRow[] | null) ?? [];
    const paidTotal = paidPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      id: r.id,
      status: r.status,
      startDatetime: r.start_datetime ?? null,
      endDatetime: r.end_datetime ?? null,
      totalPrice: paidTotal || (r.total_price ?? 0),
      serviceTitle,
      petName: firstPet?.name ?? null,
    };
  });

  return { ok: true, data: reservations };
}

export async function getReservationStatuses(
  ids: string[],
): Promise<ActionResult<Record<string, string>>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || ids.length === 0) return { ok: true, data: {} };

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const orFilter = sitterProfile?.id
    ? `owner_id.eq.${user.id},sitter_id.eq.${sitterProfile.id}`
    : `owner_id.eq.${user.id}`;

  const { data } = await supabase.from("reservations").select("id, status").in("id", ids).or(orFilter);

  const result: Record<string, string> = {};
  for (const r of data ?? []) result[r.id] = r.status;
  return { ok: true, data: result };
}

export async function ownerConfirmServiceComplete(
  reservationId: string,
): Promise<ActionResult<{ id: string; completionMessage: unknown }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, status, sitter_id, service_id, start_datetime, end_datetime, total_price")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };
  if (reservation.owner_id !== user.id) {
    return { ok: false, error: "보호자만 서비스 완료를 확인할 수 있습니다." };
  }
  if (
    ![RESERVATION_STATUS.ACCEPTED, RESERVATION_STATUS.PAID, RESERVATION_STATUS.IN_PROGRESS].includes(
      reservation.status as never,
    )
  ) {
    return { ok: false, error: "결제 완료 또는 진행 중인 서비스만 완료 처리할 수 있습니다." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reservations")
    .update({ status: RESERVATION_STATUS.COMPLETED, completed_at: now })
    .eq("id", reservationId);

  if (error) return { ok: false, error: "서비스 완료 처리에 실패했습니다." };

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("user_id")
    .eq("id", reservation.sitter_id)
    .single();

  const { data: roomsByReservation } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: false })
    .limit(1);

  let room = roomsByReservation?.[0] ?? null;
  if (!room) {
    const { data: fallbackRooms } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("owner_id", reservation.owner_id)
      .eq("sitter_id", reservation.sitter_id)
      .eq("room_type", "direct")
      .order("created_at", { ascending: false })
      .limit(1);
    room = fallbackRooms?.[0] ?? null;
  }

  let completionMessage: unknown = null;

  if (!room) {
    console.error(
      `[ownerConfirmServiceComplete] 예약(${reservationId})에 연결된 채팅방을 찾지 못해 완료 안내 메시지를 생성하지 못했습니다.`,
    );
  }

  if (room) {
    const { data: service } = reservation.service_id
      ? await supabase.from("services").select("title, service_type").eq("id", reservation.service_id).maybeSingle()
      : { data: null };
    const { data: items } = await supabase
      .from("reservation_items")
      .select("pets(name)")
      .eq("reservation_id", reservationId);

    const serviceTitle = service?.title || SERVICE_TYPE_LABEL[service?.service_type ?? ""] || "펫시팅 서비스";
    const petName = (items?.[0]?.pets as unknown as { name: string } | null | undefined)?.name;

    const completionContent = `${SERVICE_COMPLETE_CONFIRMED_PREFIX}${JSON.stringify({
      reservationId,
      serviceTitle,
      petName,
      startDatetime: reservation.start_datetime,
      endDatetime: reservation.end_datetime,
      totalPrice: reservation.total_price,
    })}`;

    const { data: insertedMessage, error: messageError } = await supabase
      .from("messages")
      .insert({ room_id: room.id, sender_id: user.id, content: completionContent })
      .select()
      .single();
    if (messageError) {
      console.error("[ownerConfirmServiceComplete] 완료 안내 메시지 생성 실패:", messageError.message);
    }
    completionMessage = insertedMessage;

    await supabase
      .from("chat_rooms")
      .update({ last_message: "서비스 완료 확정", last_message_at: now })
      .eq("id", room.id);
  }

  if (sitterProfile?.user_id) {
    await createNotification(supabase, {
      userId: sitterProfile.user_id,
      type: "reservation",
      title: "서비스 완료 확인되었어요",
      content: "보호자가 서비스 완료를 확인했습니다.",
      linkUrl: room ? `/chat?roomId=${room.id}` : `/myprofile`,
    });
  }

  await createNotification(supabase, {
    userId: reservation.owner_id,
    type: "reservation",
    title: "서비스 완료를 확인했어요",
    content: "펫시터에게 서비스 완료 확인 소식이 전달되었습니다.",
    linkUrl: room ? `/chat?roomId=${room.id}` : `/myprofile`,
  });

  return { ok: true, data: { id: reservationId, completionMessage } };
}

interface ReservationRequestInput {
  sitter_id: string;
  service_id: string;
  pet_ids: string[];
  start_datetime: string;
  end_datetime: string;
  memo?: string | null;
}

export async function createPetsitterReservationRequest(
  input: ReservationRequestInput,
): Promise<ActionResult<{ reservation_id: string; room_id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!input.pet_ids.length) return { ok: false, error: "반려동물을 선택해주세요." };

  const now = new Date();
  if (new Date(input.start_datetime) <= now) {
    return { ok: false, error: "시작일은 오늘 이후여야 합니다." };
  }
  if (new Date(input.end_datetime) <= new Date(input.start_datetime)) {
    return { ok: false, error: "종료일은 시작일 이후여야 합니다." };
  }

  if (!(await verifyPetOwnership(supabase, input.pet_ids, user.id))) {
    return { ok: false, error: "본인의 반려동물만 예약에 추가할 수 있습니다." };
  }

  // room_type을 "direct"/"reservation_request"로 좁혀서, 아직 수락되지 않은
  // 구인글 지원 방("request")은 재사용 대상에서 제외한다 — 그 방은 별개의
  // 지원 스레드이므로 무관한 예약 요청이 가로채면 안 된다.
  const { data: existingRooms } = await supabase
    .from("chat_rooms")
    .select("id, reservations(status)")
    .eq("owner_id", user.id)
    .eq("sitter_id", input.sitter_id)
    .in("room_type", ["direct", "reservation_request"])
    .order("created_at", { ascending: false })
    .limit(1);
  const existingRoom = existingRooms?.[0] ?? null;

  const activeStatuses: string[] = [
    RESERVATION_STATUS.PENDING,
    RESERVATION_STATUS.ACCEPTED,
    RESERVATION_STATUS.PAID,
    RESERVATION_STATUS.IN_PROGRESS,
  ];
  const reservationStatus = (existingRoom?.reservations as unknown as { status: string } | null)?.status;
  if (existingRoom && reservationStatus && activeStatuses.includes(reservationStatus)) {
    return { ok: false, error: "이미 해당 펫시터에게 예약 요청을 보냈습니다." };
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, sitter_id, price, title, service_type, is_active, sitters!inner(user_id)")
    .eq("id", input.service_id)
    .single();

  if (!service) return { ok: false, error: "서비스를 찾을 수 없습니다." };
  if (service.sitter_id !== input.sitter_id) return { ok: false, error: "해당 시터의 서비스가 아닙니다." };
  if (!service.is_active) return { ok: false, error: "비활성화된 서비스입니다." };
  if (!service.price || service.price <= 0) {
    return { ok: false, error: "서비스 가격이 설정되지 않았습니다." };
  }

  const sitterUserId = (service.sitters as unknown as { user_id: string }).user_id;
  if (sitterUserId === user.id) return { ok: false, error: "본인에게는 예약할 수 없습니다." };

  // 실제 예약 금액 = 1일 단가 × 이용 일수 (KST 달력일 기준, 시작·종료일 포함)
  const DAY_MS = 24 * 60 * 60 * 1000;
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9
  const toKstDayIndex = (iso: string) => Math.floor((new Date(iso).getTime() + KST_OFFSET_MS) / DAY_MS);
  const days = Math.max(1, toKstDayIndex(input.end_datetime) - toKstDayIndex(input.start_datetime) + 1);
  const totalPrice = service.price * days;

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      owner_id: user.id,
      sitter_id: input.sitter_id,
      service_id: input.service_id,
      start_datetime: input.start_datetime,
      end_datetime: input.end_datetime,
      total_price: totalPrice,
      status: RESERVATION_STATUS.PENDING,
      memo: input.memo ?? null,
    })
    .select()
    .single();

  if (reservationError || !reservation) return { ok: false, error: "예약 요청 생성에 실패했습니다." };

  const { error: itemsError } = await supabase
    .from("reservation_items")
    .insert(input.pet_ids.map((pet_id) => ({ reservation_id: reservation.id, pet_id })));

  if (itemsError) {
    await supabase.from("reservations").delete().eq("id", reservation.id);
    return { ok: false, error: "예약 요청 생성에 실패했습니다." };
  }

  // 기존 방을 재사용할 때는 이전 소유 흐름(구인글 지원 등)의 흔적을 지운다 —
  // 안 지우면 채팅목록에 이번 예약과 무관한 옛 구인글 제목이 표시된다.
  const { data: room, error: roomError } = existingRoom
    ? await supabase
        .from("chat_rooms")
        .update({
          room_type: "reservation_request",
          reservation_id: reservation.id,
          request_id: null,
          application_id: null,
        })
        .eq("id", existingRoom.id)
        .select("id")
        .single()
    : await supabase
        .from("chat_rooms")
        .insert({
          room_type: "reservation_request",
          owner_id: user.id,
          sitter_id: input.sitter_id,
          reservation_id: reservation.id,
        })
        .select("id")
        .single();

  if (roomError || !room) {
    await supabase.from("reservation_items").delete().eq("reservation_id", reservation.id);
    await supabase.from("reservations").delete().eq("id", reservation.id);
    return { ok: false, error: "예약 요청 생성에 실패했습니다." };
  }

  const { data: pets } = await supabase.from("pets").select("name").in("id", input.pet_ids);
  const petNames = (pets ?? []).map((p) => p.name);

  const serviceTitle = service.title || SERVICE_TYPE_LABEL[service.service_type ?? ""] || "펫시팅 서비스";

  const msgNow = new Date().toISOString();
  const msgContent = `${RESERVATION_REQUEST_PREFIX}${JSON.stringify({
    reservationId: reservation.id,
    serviceTitle,
    startDatetime: input.start_datetime,
    endDatetime: input.end_datetime,
    totalPrice,
    petNames,
  })}`;

  await supabase.from("messages").insert({ room_id: room.id, sender_id: user.id, content: msgContent });
  await supabase
    .from("chat_rooms")
    .update({ last_message: "예약 요청", last_message_at: msgNow })
    .eq("id", room.id);

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("user_id")
    .eq("id", input.sitter_id)
    .single();

  if (sitterProfile?.user_id) {
    await createNotification(supabase, {
      userId: sitterProfile.user_id,
      type: "reservation",
      title: "새로운 예약 요청이 도착했어요",
      content: "보호자가 예약을 요청했습니다. 확인해주세요.",
      linkUrl: `/chat?roomId=${room.id}`,
    });
  }

  return { ok: true, data: { reservation_id: reservation.id, room_id: room.id } };
}

export async function acceptReservationRequest(
  reservationId: string,
): Promise<ActionResult<{ room_id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, service_id, status, total_price, start_datetime, end_datetime")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sitterProfile?.id !== reservation.sitter_id) return { ok: false, error: "펫시터만 처리할 수 있습니다." };
  if (reservation.status !== RESERVATION_STATUS.PENDING) {
    return { ok: false, error: "대기 중인 예약만 수락할 수 있습니다." };
  }

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("room_type", "reservation_request")
    .maybeSingle();

  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const now = new Date().toISOString();

  const { error: reservationError } = await supabase
    .from("reservations")
    .update({ status: RESERVATION_STATUS.ACCEPTED, accepted_at: now })
    .eq("id", reservationId);

  if (reservationError) return { ok: false, error: "예약 수락에 실패했습니다." };

  await supabase.from("chat_rooms").update({ room_type: "direct" }).eq("id", room.id);
  const directRoomId = room.id;

  const msgContent = `${RESERVATION_ACCEPTED_PREFIX}${JSON.stringify({
    reservationId,
    totalPrice: reservation.total_price,
    startDatetime: reservation.start_datetime,
    endDatetime: reservation.end_datetime,
  })}`;

  await supabase.from("messages").insert({ room_id: directRoomId, sender_id: user.id, content: msgContent });
  await supabase
    .from("chat_rooms")
    .update({ last_message: "예약 확정", last_message_at: now })
    .eq("id", directRoomId);

  if (reservation.total_price && reservation.total_price > 0) {
    const { data: service } = reservation.service_id
      ? await supabase.from("services").select("title, service_type").eq("id", reservation.service_id).maybeSingle()
      : { data: null };

    const reason = service?.title || SERVICE_TYPE_LABEL[service?.service_type ?? ""] || "펫시팅 서비스";

    const deadlineDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const deadline = `${deadlineDate.getFullYear()}-${pad(deadlineDate.getMonth() + 1)}-${pad(deadlineDate.getDate())} ${pad(deadlineDate.getHours())}:${pad(deadlineDate.getMinutes())}`;

    const paymentContent = `${PAYMENT_REQUEST_PREFIX}${JSON.stringify({
      amount: reservation.total_price,
      reason,
      deadline,
    })}`;

    await supabase.from("messages").insert({ room_id: directRoomId, sender_id: user.id, content: paymentContent });
    await supabase
      .from("chat_rooms")
      .update({ last_message: "결제 요청", last_message_at: now })
      .eq("id", directRoomId);
  }

  await createNotification(supabase, {
    userId: reservation.owner_id,
    type: "reservation",
    title: "예약이 확정되었어요!",
    content: "펫시터가 예약을 수락했습니다. 채팅에서 결제를 진행해주세요.",
    linkUrl: `/chat?roomId=${directRoomId}`,
  });

  return { ok: true, data: { room_id: directRoomId } };
}

export async function rejectReservationRequest(
  reservationId: string,
): Promise<ActionResult<{ message: unknown }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, status")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sitterProfile?.id !== reservation.sitter_id) return { ok: false, error: "펫시터만 처리할 수 있습니다." };
  if (reservation.status !== RESERVATION_STATUS.PENDING) {
    return { ok: false, error: "대기 중인 예약만 거절할 수 있습니다." };
  }

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("room_type", "reservation_request")
    .maybeSingle();

  if (!room) return { ok: false, error: "채팅방을 찾을 수 없습니다." };

  const now = new Date().toISOString();

  const { error: reservationError } = await supabase
    .from("reservations")
    .update({ status: RESERVATION_STATUS.CANCELED, canceled_at: now })
    .eq("id", reservationId);

  if (reservationError) return { ok: false, error: "예약 거절에 실패했습니다." };

  const { data: insertedMessage } = await supabase
    .from("messages")
    .insert({ room_id: room.id, sender_id: user.id, content: RESERVATION_REJECTED_PREFIX })
    .select("id, sender_id, content, created_at")
    .single();
  // room_type은 "reservation_request"로 유지한다 — "direct"로 바꾸면
  // use-chat-rooms.ts의 수락 감지 리스너(room_type이 direct로 바뀌는 걸
  // "수락됨"으로 해석)가 거절도 수락으로 오인해서 상대방을 잘못 이동시킨다.
  await supabase
    .from("chat_rooms")
    .update({ last_message: "예약 거절", last_message_at: now })
    .eq("id", room.id);

  await createNotification(supabase, {
    userId: reservation.owner_id,
    type: "reservation",
    title: "예약 요청이 거절되었어요",
    content: "펫시터가 예약 요청을 거절했습니다.",
    linkUrl: `/chat?roomId=${room.id}`,
  });

  return { ok: true, data: { message: insertedMessage } };
}

export async function getReservationRequestDetails(
  reservationId: string,
): Promise<ActionResult<ReservationRequestDetails>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  type ServiceRow = { title: string | null; service_type: string | null };
  type PetRow = { name: string; animal_type: string | null; breed: string | null } | null;
  type ItemRow = { pets: PetRow };

  const { data: reservation } = await supabase
    .from("reservations")
    .select(
      "owner_id, sitter_id, start_datetime, end_datetime, total_price, services(title, service_type), reservation_items(pets(name, animal_type, breed))",
    )
    .eq("id", reservationId)
    .single();

  if (!reservation) return { ok: false, error: "예약 정보를 찾을 수 없습니다." };

  const isOwner = reservation.owner_id === user.id;
  if (!isOwner) {
    const { data: sitterProfile } = await supabase
      .from("sitters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sitterProfile?.id !== reservation.sitter_id) return { ok: false, error: "접근 권한이 없습니다." };
  }

  const rawService = reservation.services;
  const service = (Array.isArray(rawService) ? rawService[0] : rawService) as ServiceRow | null;
  const items = (reservation.reservation_items as unknown as ItemRow[]) ?? [];
  const firstPet = items[0]?.pets ?? null;

  return {
    ok: true,
    data: {
      title: service?.title ?? service?.service_type ?? "예약 서비스",
      startDatetime: reservation.start_datetime,
      endDatetime: reservation.end_datetime,
      requestType: service?.service_type ?? null,
      location: null,
      totalPrice: reservation.total_price,
      petName: firstPet?.name ?? null,
      petAnimalType: firstPet?.animal_type ?? null,
      petBreed: firstPet?.breed ?? null,
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

export async function updateReservationDetails(
  reservationId: string,
  input: { start_datetime: string; end_datetime: string; memo?: string | null },
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (new Date(input.end_datetime) <= new Date(input.start_datetime)) {
    return { ok: false, error: "종료일은 시작일 이후여야 합니다." };
  }

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, status")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  if (
    ![
      RESERVATION_STATUS.PENDING,
      RESERVATION_STATUS.ACCEPTED,
      RESERVATION_STATUS.PAID,
      RESERVATION_STATUS.IN_PROGRESS,
    ].includes(reservation.status as never)
  ) {
    return { ok: false, error: "완료되거나 취소된 예약은 수정할 수 없습니다." };
  }

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = reservation.owner_id === user.id;
  const isSitter = sitterProfile?.id === reservation.sitter_id;

  if (!isOwner && !isSitter) return { ok: false, error: "예약 당사자만 수정할 수 있습니다." };

  const { error } = await supabase
    .from("reservations")
    .update({
      start_datetime: input.start_datetime,
      end_datetime: input.end_datetime,
      memo: input.memo ?? null,
    })
    .eq("id", reservationId);

  if (error) return { ok: false, error: "예약 수정에 실패했습니다." };

  return { ok: true, data: { id: reservationId } };
}

export async function sitterStartService(
  reservationId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, status")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };

  const { data: sitterProfile } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sitterProfile?.id !== reservation.sitter_id) {
    return { ok: false, error: "펫시터만 서비스를 시작할 수 있습니다." };
  }

  if (![RESERVATION_STATUS.ACCEPTED, RESERVATION_STATUS.PAID].includes(reservation.status as never)) {
    return { ok: false, error: "예약확정 상태의 예약만 시작할 수 있습니다." };
  }

  const { error } = await supabase
    .from("reservations")
    .update({ status: RESERVATION_STATUS.IN_PROGRESS })
    .eq("id", reservationId);

  if (error) return { ok: false, error: "서비스 시작 처리에 실패했습니다." };

  return { ok: true, data: { id: reservationId } };
}
