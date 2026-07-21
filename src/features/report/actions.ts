"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { reportCreateSchema, type ReportCreateInput } from "@/features/report/schema";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function createReport(input: ReportCreateInput): Promise<ActionResult> {
  const parsed = reportCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

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
