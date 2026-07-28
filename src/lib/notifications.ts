import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export async function createNotification(
  supabase: SupabaseClient<Database>,
  {
    userId,
    type,
    title,
    content,
    linkUrl,
  }: {
    userId: string;
    type: string;
    title: string;
    content: string;
    linkUrl?: string;
  },
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    content,
    link_url: linkUrl ?? null,
  });
}
