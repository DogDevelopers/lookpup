"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { reviewCreateSchema, type ReviewCreateInput } from "@/features/reviews/schema";
import type { WrittenReview, ReceivedReview, ReservationReview } from "@/features/reviews/types";

type ActionResult = { ok: true } | { ok: false; error: string };

const REVIEW_WINDOW_DAYS = 7;

async function recalculateSitterRating(sitterId: string): Promise<void> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("reviews").select("rating").eq("sitter_id", sitterId);
  if (!rows) return;

  const avg = rows.length > 0 ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0;
  await supabase
    .from("sitters")
    .update({ rating: Math.round(avg * 10) / 10 })
    .eq("id", sitterId);
}

export async function createReview(input: ReviewCreateInput): Promise<ActionResult> {
  const parsed = reviewCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, status, completed_at")
    .eq("id", parsed.data.reservation_id)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };
  if (reservation.owner_id !== user.id) return { ok: false, error: "예약자만 후기를 작성할 수 있습니다." };
  if (reservation.status !== "completed") return { ok: false, error: "완료된 예약에만 후기를 작성할 수 있습니다." };

  if (reservation.completed_at) {
    const days = (Date.now() - new Date(reservation.completed_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days > REVIEW_WINDOW_DAYS) {
      return { ok: false, error: "완료 후 7일 이내에만 후기를 작성할 수 있습니다." };
    }
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("reservation_id", parsed.data.reservation_id)
    .maybeSingle();
  if (existing) return { ok: false, error: "이미 후기를 작성했습니다." };

  const { error } = await supabase.from("reviews").insert({
    reservation_id: parsed.data.reservation_id,
    owner_id: user.id,
    sitter_id: reservation.sitter_id,
    rating: parsed.data.rating,
    content: parsed.data.content,
    image_urls: parsed.data.image_urls,
    tags: parsed.data.tags,
    detail_ratings: parsed.data.detail_ratings,
  });

  if (error) return { ok: false, error: "후기 등록에 실패했습니다." };

  await recalculateSitterRating(reservation.sitter_id);

  revalidatePath("/myprofile/reviews");
  revalidatePath("/myprofile/booking-history");
  revalidatePath(`/myprofile/booking-history/${reservation.id}`);
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: review } = await supabase.from("reviews").select("id, owner_id, sitter_id").eq("id", id).maybeSingle();
  if (!review) return { ok: false, error: "후기를 찾을 수 없습니다." };

  if (review.owner_id !== user.id) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return { ok: false, error: "삭제 권한이 없습니다." };
  }

  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: "후기 삭제에 실패했습니다." };

  await recalculateSitterRating(review.sitter_id);

  revalidatePath("/myprofile/reviews");
  return { ok: true };
}

export async function getMyWrittenReviews(): Promise<WrittenReview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("reviews")
    .select("id, rating, content, image_urls, tags, detail_ratings, created_at, sitters(users(full_name, profile_image))")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const sitter = row.sitters as unknown as {
      users: { full_name: string | null; profile_image: string | null } | null;
    } | null;
    return {
      id: row.id,
      rating: row.rating,
      content: row.content,
      image_urls: (row.image_urls as string[]) ?? [],
      tags: (row.tags as string[]) ?? [],
      detail_ratings: (row.detail_ratings as Record<string, number>) ?? {},
      created_at: row.created_at ?? "",
      sitter_full_name: sitter?.users?.full_name ?? "알 수 없음",
      sitter_profile_image: sitter?.users?.profile_image ?? null,
    };
  });
}

export async function getReviewByReservationId(reservationId: string): Promise<ReservationReview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("reviews")
    .select("id, rating, content, image_urls, tags, detail_ratings, created_at")
    .eq("reservation_id", reservationId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    rating: data.rating,
    content: data.content,
    image_urls: (data.image_urls as string[]) ?? [],
    tags: (data.tags as string[]) ?? [],
    detail_ratings: (data.detail_ratings as Record<string, number>) ?? {},
    created_at: data.created_at ?? "",
  };
}

export async function getReviewedReservationIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("reviews")
    .select("reservation_id")
    .eq("owner_id", user.id)
    .in("reservation_id", ids);

  return (data ?? []).map((row) => row.reservation_id);
}

export async function getReceivedReviews(): Promise<ReceivedReview[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: sitter } = await supabase.from("sitters").select("id").eq("user_id", user.id).maybeSingle();
  if (!sitter) return [];

  const { data } = await supabase
    .from("reviews")
    .select("id, owner_id, rating, content, image_urls, tags, detail_ratings, created_at, users(full_name, profile_image)")
    .eq("sitter_id", sitter.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const owner = row.users as unknown as { full_name: string | null; profile_image: string | null } | null;
    return {
      id: row.id,
      owner_id: row.owner_id,
      owner_full_name: owner?.full_name ?? "알 수 없음",
      owner_profile_image: owner?.profile_image ?? null,
      rating: row.rating,
      content: row.content,
      image_urls: (row.image_urls as string[]) ?? [],
      tags: (row.tags as string[]) ?? [],
      detail_ratings: (row.detail_ratings as Record<string, number>) ?? {},
      created_at: row.created_at ?? "",
    };
  });
}
