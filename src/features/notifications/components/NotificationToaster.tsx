"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { loadNotificationPrefs, getNotificationCategory } from "@/lib/notification-prefs";

/**
 * 새 알림(notifications INSERT/UPDATE) 수신 시 토스트로 띄우는 전역 컴포넌트.
 * 렌더링 결과는 없고 구독만 담당한다 — 실제 토스트는 layout의 <Toaster />가 그린다.
 */
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

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const channel = supabase
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
          // 읽음 처리 등 안 읽은 새 알림이 아닌 변경은 토스트하지 않음
          if (row.is_read) return;
          // 설정에서 끈 카테고리는 토스트하지 않음(매핑 안 된 타입은 항상 노출)
          const prefs = loadNotificationPrefs();
          const category = getNotificationCategory(row.type);
          if (category && !prefs[category]) return;
          // 채팅 화면을 보고 있을 때는 채팅 알림만 토스트하지 않음
          if (row.type === "message" && pathnameRef.current.startsWith("/chat")) return;
          // 고정 id로 호출 → 새 알림이 오면 이전 토스트를 쌓지 않고 교체(항상 최신 1개만 표시)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
