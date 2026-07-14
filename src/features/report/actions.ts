"use server";

import { createClient } from "@/lib/supabase/server";
import { reportCreateSchema, type ReportCreateInput } from "@/features/report/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createReport(input: ReportCreateInput): Promise<ActionResult> {
  const parsed = reportCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
    content: parsed.data.content,
    image_urls: parsed.data.image_urls,
    status: "pending",
  });

  if (error) return { ok: false, error: "신고 접수에 실패했습니다." };
  return { ok: true };
}

export interface ReportableUser {
  id: string;
  full_name: string | null;
  profile_image: string | null;
  role: string | null;
}

export async function searchReportableUsers(query: string): Promise<ReportableUser[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.rpc("search_reportable_users", { p_query: trimmed });
  return (data ?? []) as ReportableUser[];
}
