"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { notificationKeys } from "@/lib/query-keys";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationsData,
} from "@/features/notifications/actions";
import { loadNotificationPrefs, getNotificationCategory } from "@/lib/notification-prefs";

const EMPTY_DATA: NotificationsData = { notifications: [], unreadTotal: 0, unreadByType: {} };

export function useNotifications(limit = 20) {
  const queryClient = useQueryClient();
  const instanceId = useId();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const query = useQuery({
    queryKey: notificationKeys.list(limit),
    queryFn: async () => {
      const res = await getNotifications(limit);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: userId !== null,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }, [queryClient]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, instanceId, refresh]);

  const data = query.data ?? EMPTY_DATA;

  const prefs = loadNotificationPrefs();
  const unreadCount = Object.entries(data.unreadByType).reduce((sum, [type, count]) => {
    const category = getNotificationCategory(type);
    if (category && !prefs[category]) return sum;
    return sum + count;
  }, 0);

  const markRead = useCallback(
    async (id: string) => {
      queryClient.setQueryData<NotificationsData>(notificationKeys.list(limit), (prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true } : n,
              ),
            }
          : prev,
      );
      const res = await markNotificationRead(id);
      if (!res.ok) console.error("알림 읽음 처리 실패:", res.error);
      refresh();
    },
    [queryClient, limit, refresh],
  );

  const markAllRead = useCallback(async () => {
    queryClient.setQueryData<NotificationsData>(notificationKeys.list(limit), (prev) =>
      prev
        ? {
            ...prev,
            notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
            unreadTotal: 0,
            unreadByType: {},
          }
        : prev,
    );
    const res = await markAllNotificationsRead();
    if (!res.ok) console.error("모두 읽음 처리 실패:", res.error);
    refresh();
  }, [queryClient, limit, refresh]);

  return {
    notifications: data.notifications,
    unreadCount,
    isLoading: query.isLoading,
    markRead,
    markAllRead,
    refresh,
  };
}
