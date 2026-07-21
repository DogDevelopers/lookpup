"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import type { NotificationRow } from "./types";

type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

export interface NotificationsData {
  notifications: NotificationRow[];
  unreadTotal: number;
  unreadByType: Record<string, number>;
}

export async function getNotifications(
  limit = 20,
): Promise<ActionResult<NotificationsData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data, error }, { data: unreadTypeRows }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, content, is_read, link_url, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("type")
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  if (error) return { ok: false, error: error.message };

  const unreadByType: Record<string, number> = {};
  for (const row of unreadTypeRows ?? []) {
    unreadByType[row.type] = (unreadByType[row.type] ?? 0) + 1;
  }

  const notifications: NotificationRow[] = (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content,
    isRead: n.is_read,
    linkUrl: n.link_url,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));

  return {
    ok: true,
    data: {
      notifications,
      unreadTotal: (unreadTypeRows ?? []).length,
      unreadByType,
    },
  };
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: notification } = await supabase
    .from("notifications")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!notification) return { ok: false, error: "알림을 찾을 수 없습니다." };
  if (notification.user_id !== user.id) return { ok: false, error: "권한이 없습니다." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
