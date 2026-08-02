"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Subscribe = (supabase: SupabaseClient<Database>) => RealtimeChannel;

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
