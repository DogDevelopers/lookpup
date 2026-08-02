"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import { loadNotificationPrefs, getNotificationCategory } from "@/lib/notification-prefs";

export default function NotificationToaster() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);

  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const subscribe = useCallback(
    (supabase: ReturnType<typeof createClient>) =>
      supabase
        .channel(`toast-notifications:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") return;
            const row = payload.new as {
              type: string;
              title: string;
              content: string;
              link_url: string | null;
              is_read: boolean;
            };
            if (row.is_read) return;
            const prefs = loadNotificationPrefs();
            const category = getNotificationCategory(row.type);
            if (category && !prefs[category]) return;
            if (row.type === "message" && pathnameRef.current.startsWith("/chat")) return;
            toast(row.title, {
              id: "app-notification",
              description: row.content,
              action: row.link_url
                ? {
                    label: "보기",
                    onClick: () => router.push(row.link_url as string),
                  }
                : undefined,
            });
          },
        )
        .subscribe(),
    [userId, router],
  );

  useRealtimeChannel(!!userId, subscribe);

  return null;
}
