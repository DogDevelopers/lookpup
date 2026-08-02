import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ActiveUserResult = { ok: true; user: User } | { ok: false; error: string };

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
