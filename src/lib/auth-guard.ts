import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ActiveUserResult = { ok: true; user: User } | { ok: false; error: string };

/**
 * getUser() 인증 확인 후 users.suspended_until이 현재 시각보다 미래면 거부한다.
 * 쓰기 Server Action은 소유권 확인 전에 이 헬퍼로 정지 여부를 먼저 걸러야 한다.
 */
export async function requireActiveUser(
  supabase: SupabaseClient<Database>,
): Promise<ActiveUserResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data: profile } = await supabase
    .from("users")
    .select("suspended_until")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.suspended_until && new Date(profile.suspended_until) > new Date()) {
    const until = new Date(profile.suspended_until).toLocaleString("ko-KR");
    return { ok: false, error: `정지된 계정입니다. (해제: ${until})` };
  }

  return { ok: true, user };
}
