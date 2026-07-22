"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Report,
  ReportStatus,
  Reservation,
  ReservationStatus,
  SitterApplication,
  SitterStatus,
} from "@/features/admin/types";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, userId: null };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role !== "admin") return { supabase, userId: null };
  return { supabase, userId: user.id };
}

async function resolveUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetId: string,
  targetType: "user" | "sitter",
): Promise<string | null> {
  if (targetType === "user") return targetId;
  const { data: sitter } = await supabase.from("sitters").select("user_id").eq("id", targetId).maybeSingle();
  return sitter?.user_id ?? null;
}

async function resolveTargetNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reports: { target_type: string; target_id: string }[],
): Promise<Map<string, string>> {
  const idsByType = new Map<string, string[]>();
  for (const r of reports) {
    idsByType.set(r.target_type, [...(idsByType.get(r.target_type) ?? []), r.target_id]);
  }

  const names = new Map<string, string>();

  const userIds = idsByType.get("user") ?? [];
  if (userIds.length > 0) {
    const { data } = await supabase.from("users").select("id, full_name").in("id", userIds);
    (data ?? []).forEach((u) => names.set(u.id, u.full_name ?? "이름 없음"));
  }

  const sitterIds = idsByType.get("sitter") ?? [];
  if (sitterIds.length > 0) {
    const { data } = await supabase.from("sitters").select("id, users(full_name)").in("id", sitterIds);
    (data ?? []).forEach((s) => {
      const user = s.users as unknown as { full_name: string | null } | { full_name: string | null }[] | null;
      names.set(s.id, (Array.isArray(user) ? user[0]?.full_name : user?.full_name) ?? "이름 없음");
    });
  }

  const requestIds = idsByType.get("request") ?? [];
  if (requestIds.length > 0) {
    const { data } = await supabase.from("requests").select("id, title").in("id", requestIds);
    (data ?? []).forEach((r) => names.set(r.id, r.title));
  }

  const messageIds = idsByType.get("message") ?? [];
  if (messageIds.length > 0) {
    const { data } = await supabase.from("messages").select("id, sender_id").in("id", messageIds);
    const senderIds = [...new Set((data ?? []).map((m) => m.sender_id))];
    const { data: senders } =
      senderIds.length > 0 ? await supabase.from("users").select("id, full_name").in("id", senderIds) : { data: [] };
    const senderNames = new Map((senders ?? []).map((u) => [u.id, u.full_name ?? "이름 없음"]));
    (data ?? []).forEach((m) => names.set(m.id, senderNames.get(m.sender_id) ?? "이름 없음"));
  }

  return names;
}

export async function getAdminReports(): Promise<Report[]> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return [];

  const { data } = await supabase
    .from("reports")
    .select(
      `id, reporter_id, target_type, target_id, reason, content, status,
       image_urls, admin_memo, handled_by, handled_at, created_at, updated_at,
       reporter:users!reports_reporter_id_fkey(id, full_name, profile_image, email)`,
    )
    .order("created_at", { ascending: false });

  const reports = (data ?? []) as unknown as Report[];
  const names = await resolveTargetNames(supabase, reports);
  return reports.map((r) => ({ ...r, target_name: names.get(r.target_id) ?? null }));
}

export async function adminUpdateReport(
  id: string,
  status: ReportStatus,
  adminMemo: string | null,
): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase
    .from("reports")
    .update({
      status,
      admin_memo: adminMemo,
      handled_by: userId,
      handled_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: "신고 처리에 실패했습니다." };

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { ok: true };
}

export async function getAdminReservations(): Promise<Reservation[]> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return [];

  const { data } = await supabase
    .from("reservations")
    .select(
      `id, status, total_price, start_datetime, end_datetime,
       accepted_at, started_at, completed_at, canceled_at, paid_at, created_at,
       cancel_reason, memo,
       owner:users!reservations_owner_id_fkey(id, full_name, email, profile_image),
       sitter:sitters!reservations_sitter_id_fkey(id, user_id, users(id, full_name, email, profile_image))`,
    )
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as unknown as Reservation[];
}

export async function adminUpdateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  cancelReason?: string,
): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status };
  if (status === "accepted") updates.accepted_at = now;
  else if (status === "in_progress") updates.started_at = now;
  else if (status === "completed") updates.completed_at = now;
  else if (status === "canceled") {
    updates.canceled_at = now;
    updates.cancel_reason = cancelReason || null;
  }

  const { error } = await supabase.from("reservations").update(updates).eq("id", reservationId);

  if (error) return { ok: false, error: "예약 상태 변경에 실패했습니다." };

  revalidatePath("/admin");
  revalidatePath("/admin/state");
  return { ok: true };
}

export async function getAdminSitters(): Promise<SitterApplication[]> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return [];

  const { data } = await supabase
    .from("sitters")
    .select(
      `id, user_id, status, title, introduction, career, available_area, display_area,
       base_price, request_type, available_animals, certificate_urls, activity_photo_urls,
       created_at,
       users(id, full_name, email, phone_number, profile_image)`,
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as SitterApplication[];
}

export async function adminUpdateSitterStatus(sitterId: string, status: SitterStatus): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase.from("sitters").update({ status }).eq("id", sitterId);
  if (error) return { ok: false, error: "펫시터 상태 변경에 실패했습니다." };

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminSuspendUser(
  targetId: string,
  targetType: "user" | "sitter",
  suspendedUntil: string,
): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const targetUserId = await resolveUserId(supabase, targetId, targetType);
  if (!targetUserId) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const { error } = await supabase.from("users").update({ suspended_until: suspendedUntil }).eq("id", targetUserId);
  if (error) return { ok: false, error: "정지 처리에 실패했습니다." };

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminUnsuspendUser(targetId: string, targetType: "user" | "sitter"): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const targetUserId = await resolveUserId(supabase, targetId, targetType);
  if (!targetUserId) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const { error } = await supabase.from("users").update({ suspended_until: null }).eq("id", targetUserId);
  if (error) return { ok: false, error: "정지 해제에 실패했습니다." };

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminDemoteUser(targetId: string, targetType: "user" | "sitter"): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const targetUserId = await resolveUserId(supabase, targetId, targetType);
  if (!targetUserId) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const { data: target } = await supabase.from("users").select("role").eq("id", targetUserId).maybeSingle();
  if (!target) return { ok: false, error: "사용자를 찾을 수 없습니다." };
  if (target.role !== "both") return { ok: false, error: "펫시터 권한이 없는 사용자입니다." };

  const { error } = await supabase.from("users").update({ role: "owner" }).eq("id", targetUserId);
  if (error) return { ok: false, error: "권한 강등에 실패했습니다." };

  revalidatePath("/admin");
  return { ok: true };
}

export async function adminCancelRequest(requestId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const { data: request } = await supabase.from("requests").select("status").eq("id", requestId).maybeSingle();
  if (!request) return { ok: false, error: "구인글을 찾을 수 없습니다." };
  if (request.status === "canceled") return { ok: false, error: "이미 취소된 구인글입니다." };

  const { error } = await supabase.from("requests").update({ status: "canceled" }).eq("id", requestId);
  if (error) return { ok: false, error: "구인글 취소에 실패했습니다." };

  revalidatePath("/admin");
  revalidatePath("/board");
  return { ok: true };
}

export async function adminDeactivateService(serviceId: string): Promise<ActionResult> {
  const { supabase, userId } = await requireAdmin();
  if (!userId) return { ok: false, error: "권한이 없습니다." };

  const { data: service } = await supabase.from("services").select("is_active").eq("id", serviceId).maybeSingle();
  if (!service) return { ok: false, error: "서비스를 찾을 수 없습니다." };
  if (!service.is_active) return { ok: false, error: "이미 비활성화된 서비스입니다." };

  const { error } = await supabase.from("services").update({ is_active: false }).eq("id", serviceId);
  if (error) return { ok: false, error: "서비스 비활성화에 실패했습니다." };

  revalidatePath("/admin");
  return { ok: true };
}
