"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Subscribe = (supabase: SupabaseClient<Database>) => RealtimeChannel;

// 열려 있는 Supabase Realtime WebSocket은 Chrome의 뒤로/앞으로가기 캐시(bfcache)
// 복원을 차단한다. 페이지가 숨겨질 때(pagehide) 채널을 닫고 bfcache에 들어가게 하고,
// 복원될 때(pageshow, persisted)만 다시 구독해 실시간 갱신 기능은 그대로 유지한다.
export function useRealtimeChannel(enabled: boolean, subscribe: Subscribe) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();

    function connect() {
      channelRef.current = subscribe(supabase);
    }
    function disconnect() {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    connect();

    function handlePageHide() {
      disconnect();
    }
    function handlePageShow(e: PageTransitionEvent) {
      if (e.persisted) connect();
    }

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      disconnect();
    };
  }, [enabled, subscribe]);
}
