import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Supabase = SupabaseClient<Database>;

export type PublicProfile = {
  full_name: string;
  profile_image: string;
  is_verified: boolean;
  created_at: string;
};

export async function fetchPublicProfiles(
  supabase: Supabase,
  userIds: (string | null | undefined)[],
): Promise<Map<string, PublicProfile>> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  if (!ids.length) return new Map();

  const { data } = await supabase.rpc("get_public_user_profiles", { user_ids: ids });
  return new Map((data ?? []).map((p) => [p.id, p]));
}
