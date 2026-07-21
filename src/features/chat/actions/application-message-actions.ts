"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { touchRoomPreview } from "@/lib/chat-rooms";
import { APPLICATION_SELECTED_PREFIX, APPLICATION_REJECTED_PREFIX } from "@/lib/chat-message-prefixes";
import { getAuthorizedChatRoom, type ActionResult } from "./shared";

export async function sendApplicationSelectedMessage(
  roomId: string,
  data: { postTitle: string; postId: string; sitterId: string },
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const authResult = await getAuthorizedChatRoom(supabase, roomId, user.id);
  if (!authResult.ok) return authResult;

  const content = `${APPLICATION_SELECTED_PREFIX}${JSON.stringify(data)}`;
  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "선택 확정");

  return { ok: true, data: message };
}

export async function sendApplicationRejectedMessage(
  roomId: string,
): Promise<ActionResult<{ id: string; room_id: string; sender_id: string; content: string; created_at: string | null }>> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const authResult = await getAuthorizedChatRoom(supabase, roomId, user.id);
  if (!authResult.ok) return authResult;

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, sender_id: user.id, content: APPLICATION_REJECTED_PREFIX })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  await touchRoomPreview(supabase, roomId, "지원 거절");

  return { ok: true, data: message };
}
