"use server";

import { differenceInCalendarDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SERVICE_KEY_TO_TITLE: Record<string, string> = {
  visit: "방문돌봄",
  home: "위탁돌봄",
  walk: "산책",
  pickup: "픽업",
};

type CreateReservationResult = { ok: true; id: string } | { ok: false; error: string };

interface CreateReservationInput {
  sitterId: string;
  petIds: string[];
  selectedService: string;
  startDatetime: string;
  endDatetime: string;
  memo?: string;
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (input.petIds.length === 0) {
    return { ok: false, error: "반려동물을 선택해주세요." };
  }

  const start = new Date(input.startDatetime);
  const end = new Date(input.endDatetime);
  if (start <= new Date()) {
    return { ok: false, error: "시작일은 오늘 이후여야 합니다." };
  }
  if (end <= start) {
    return { ok: false, error: "종료일은 시작일 이후여야 합니다." };
  }

  const { count: ownedCount } = await supabase
    .from("pets")
    .select("id", { count: "exact", head: true })
    .in("id", input.petIds)
    .eq("owner_id", user.id)
    .is("deleted_at", null);

  if ((ownedCount ?? 0) !== new Set(input.petIds).size) {
    return { ok: false, error: "본인의 반려동물만 예약에 추가할 수 있습니다." };
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, title, price")
    .eq("sitter_id", input.sitterId)
    .eq("is_active", true);

  if (!services || services.length === 0) {
    return { ok: false, error: "이용 가능한 서비스가 없습니다." };
  }

  // StepPetService.tsx의 표시 금액 계산과 동일한 매칭/폴백을 사용해
  // 화면에 보여준 금액과 실제 청구 금액이 항상 같도록 보장한다.
  const targetTitle = SERVICE_KEY_TO_TITLE[input.selectedService];
  const matchedService = services.find((s) => s.title === targetTitle) ?? services[0];

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const totalPrice = matchedService.price * days;

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      owner_id: user.id,
      sitter_id: input.sitterId,
      service_id: matchedService.id,
      start_datetime: input.startDatetime,
      end_datetime: input.endDatetime,
      total_price: totalPrice,
      status: "pending",
      memo: input.memo || null,
    })
    .select("id")
    .single();

  if (reservationError || !reservation) {
    return { ok: false, error: "예약 생성에 실패했습니다." };
  }

  const { error: itemsError } = await supabase.from("reservation_items").insert(
    input.petIds.map((petId) => ({ reservation_id: reservation.id, pet_id: petId })),
  );

  if (itemsError) {
    await supabase.from("reservations").delete().eq("id", reservation.id);
    return { ok: false, error: "예약 생성에 실패했습니다." };
  }

  revalidatePath("/myprofile/booking-history");
  return { ok: true, id: reservation.id };
}

const CANCELABLE_STATUSES = ["pending", "accepted"];

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
      status: "canceled",
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

export type ReservationUiStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "completed"
  | "cancelled";

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

export interface MyReservation {
  id: string;
  bookingNo: string;
  serviceType: string;
  status: ReservationUiStatus;
  sitterName: string;
  sitterImage: string | null;
  sitterRating: number;
  date: string;
  time: string;
  location: string;
  petName: string;
  petType: string;
  price: number;
  reviewWritten: boolean;
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

export interface ReservationDetail {
  id: string;
  bookingNo: string;
  serviceType: string;
  status: ReservationUiStatus;
  sitter: {
    name: string;
    image: string | null;
    rating: number;
    reviewCount: number;
    certified: boolean;
  };
  date: string;
  time: string;
  location: string;
  pet: {
    name: string;
    breed: string;
    age: number;
    weight: number;
    imageUrl: string | null;
  };
  price: number;
  reviewWritten: boolean;
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
      age: firstPet?.age ?? 0,
      weight: firstPet?.weight != null ? Number(firstPet.weight) : 0,
      imageUrl: firstPet?.image_url ?? null,
    },
    price: row.total_price,
    reviewWritten: reviewWasWritten(row.reviews),
  };
}
