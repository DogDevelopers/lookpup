"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { chatKeys } from "@/lib/query-keys";
import { APPLICATION_STATUS } from "@/lib/constants";
import { getChatRoomsData, leaveRoom } from "@/features/chat/actions";
import type { RoomApiItem } from "@/features/chat/types";
import type {
  ChatRoom,
  Applicant,
  ReservationRequest,
} from "@/features/chat/components/chat_components";
import {
  SYSTEM_MSG_PREFIX,
  IMAGE_MSG_PREFIX,
  PAYMENT_REQUEST_PREFIX,
  PAYMENT_COMPLETE_PREFIX,
  APPLICATION_SELECTED_PREFIX,
  APPLICATION_REJECTED_PREFIX,
  RESERVATION_CANCELED_PREFIX,
  SERVICE_COMPLETE_PREFIX,
  SERVICE_COMPLETE_CONFIRMED_PREFIX,
  SERVICE_START_PREFIX,
  RESERVATION_REQUEST_PREFIX,
  RESERVATION_ACCEPTED_PREFIX,
  RESERVATION_REJECTED_PREFIX,
  RESERVATION_EDIT_PREFIX,
  RESERVATION_EDIT_RESPONSE_PREFIX,
  truncatePreview,
} from "@/lib/chat-message-prefixes";

function isReservationStatusChangeMessage(content: string): boolean {
  return (
    content.startsWith(SERVICE_COMPLETE_CONFIRMED_PREFIX) ||
    content.startsWith(RESERVATION_CANCELED_PREFIX) ||
    content.startsWith(SERVICE_START_PREFIX) ||
    content.startsWith(RESERVATION_EDIT_RESPONSE_PREFIX)
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface Post {
  id: string;
  title: string;
  status: string;
  createdAt: string | null;
}

function formatRoomSub(r: RoomApiItem, fallback = "1:1 채팅"): string {
  if (r.request_title) return r.request_title;
  if (!r.reservation_service_title && r.reservation_pet_names.length === 0) {
    return fallback;
  }
  const date = r.reservation_start_datetime
    ? new Date(r.reservation_start_datetime).toLocaleDateString("ko-KR", {
        month: "numeric",
        day: "numeric",
      })
    : null;
  const parts = [
    r.reservation_service_title,
    r.reservation_pet_names.join(", ") || null,
    date,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : fallback;
}

function formatPreview(content: string): string {
  if (content.startsWith(SYSTEM_MSG_PREFIX))
    return content.slice(SYSTEM_MSG_PREFIX.length);
  if (content.startsWith(IMAGE_MSG_PREFIX)) return "사진";
  if (content.startsWith(PAYMENT_REQUEST_PREFIX)) return "결제 요청";
  if (content.startsWith(PAYMENT_COMPLETE_PREFIX)) return "결제 완료";
  if (content.startsWith(APPLICATION_SELECTED_PREFIX)) return "선택 확정";
  if (content.startsWith(APPLICATION_REJECTED_PREFIX)) return "지원 거절";
  if (content.startsWith(RESERVATION_CANCELED_PREFIX)) return "예약 취소";
  if (content.startsWith(SERVICE_COMPLETE_CONFIRMED_PREFIX))
    return "서비스 완료 확정";
  if (content.startsWith(SERVICE_COMPLETE_PREFIX)) return "서비스 완료";
  if (content.startsWith(SERVICE_START_PREFIX)) return "서비스 시작";
  if (content.startsWith(RESERVATION_REQUEST_PREFIX)) return "예약 요청";
  if (content.startsWith(RESERVATION_ACCEPTED_PREFIX)) return "예약 확정";
  if (content === RESERVATION_REJECTED_PREFIX) return "예약 거절";
  if (content.startsWith(RESERVATION_EDIT_PREFIX)) return "예약 수정 요청";
  if (content.startsWith(RESERVATION_EDIT_RESPONSE_PREFIX)) {
    try {
      const payload = JSON.parse(
        content.slice(RESERVATION_EDIT_RESPONSE_PREFIX.length),
      ) as { accepted: boolean };
      return payload.accepted ? "예약 수정 승인" : "예약 수정 거절";
    } catch {
      return "예약 수정 응답";
    }
  }
  return truncatePreview(content);
}

function transformRoomsData(data: RoomApiItem[]): {
  rooms: ChatRoom[];
  applicants: Applicant[];
  reservationRequests: ReservationRequest[];
  posts: Post[];
} {
  const directRooms: ChatRoom[] = data
    .filter((r) => r.room_type === "direct")
    .map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
      sitterId: r.sitter_id,
      reservationId: r.reservation_id,
      reservationStatus: r.reservation_status,
      name: r.other_user_full_name ?? "",
      initial: (r.other_user_full_name ?? "?")[0],
      profileImage: r.other_user_profile_image,
      sub: formatRoomSub(r),
      lastMessage: formatPreview(r.last_message ?? ""),
      time: formatTime(r.last_message_at),
      unread: r.unread_count ?? 0,
      recipientLeft: r.recipient_left,
    }));

  const requestRooms = data.filter((r) => r.room_type === "request");
  const applicantList: Applicant[] = requestRooms.map((r) => ({
    id: r.id,
    sitterId: r.sitter_id,
    ownerId: r.owner_id,
    postId: r.request_id ?? "",
    name: r.other_user_full_name ?? "",
    initial: (r.other_user_full_name ?? "?")[0],
    profileImage: r.other_user_profile_image,
    rating: r.sitter_rating ?? 0,
    preview: formatPreview(r.last_message ?? ""),
    time: formatTime(r.last_message_at),
    unread: r.unread_count ?? 0,
    applicationStatus: r.application_status,
    recipientLeft: r.recipient_left,
  }));

  const reservationRequestList: ReservationRequest[] = data
    .filter((r) => r.room_type === "reservation_request")
    .map((r) => ({
      id: r.id,
      sitterId: r.sitter_id,
      ownerId: r.owner_id,
      reservationId: r.reservation_id,
      name: r.other_user_full_name ?? "",
      initial: (r.other_user_full_name ?? "?")[0],
      profileImage: r.other_user_profile_image,
      rating: r.sitter_rating ?? 0,
      sub: formatRoomSub(r, "예약 요청"),
      preview: formatPreview(r.last_message ?? ""),
      time: formatTime(r.last_message_at),
      unread: r.unread_count ?? 0,
      reservationStatus: r.reservation_status,
      recipientLeft: r.recipient_left,
    }));

  const seen = new Set<string>();
  const posts: Post[] = [];
  for (const r of requestRooms) {
    if (r.request_id && !seen.has(r.request_id)) {
      seen.add(r.request_id);
      posts.push({
        id: r.request_id,
        title: r.request_title ?? "구인글",
        status: r.request_status ?? "open",
        createdAt: r.request_created_at,
      });
    }
  }
  posts.sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return {
    rooms: directRooms,
    applicants: applicantList,
    reservationRequests: reservationRequestList,
    posts,
  };
}

export function useChatRooms(
  activeRoomId: string | null,
  initialRoomsData?: RoomApiItem[],
) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [mySitterId, setMySitterId] = useState<string | null>(null);
  const [acceptedDirectRoomId, setAcceptedDirectRoomId] = useState<
    string | null
  >(null);

  const activeRoomIdRef = useRef(activeRoomId);
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const query = useQuery({
    queryKey: chatKeys.rooms(),
    queryFn: async () => {
      const res = await getChatRoomsData();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    initialData: initialRoomsData,
  });

  const data = useMemo(() => query.data ?? [], [query.data]);
  const { rooms, applicants, reservationRequests, posts } = useMemo(
    () => transformRoomsData(data),
    [data],
  );

  const myRoomIdsRef = useRef(new Set<string>());
  useEffect(() => {
    myRoomIdsRef.current = new Set(data.map((r) => r.id));
  }, [data]);

  const reservationRequestIdsRef = useRef(new Set<string>());
  useEffect(() => {
    reservationRequestIdsRef.current = new Set(
      reservationRequests.map((rr) => rr.id),
    );
  }, [reservationRequests]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (!user) return;
      const { data: sitter } = await supabase
        .from("sitters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setMySitterId(sitter?.id ?? null);
    });
  }, []);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: chatKeys.rooms() });
  }, [queryClient]);

  const updateRoomPreview = useCallback(
    (roomId: string, content: string, createdAt: string) => {
      queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
        (prev ?? []).map((r) =>
          r.id === roomId
            ? { ...r, last_message: content, last_message_at: createdAt }
            : r,
        ),
      );
    },
    [queryClient],
  );

  const incrementUnread = useCallback(
    (roomId: string) => {
      queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
        (prev ?? []).map((r) =>
          r.id === roomId
            ? { ...r, unread_count: (r.unread_count ?? 0) + 1 }
            : r,
        ),
      );
    },
    [queryClient],
  );

  // 신규/변경된 채팅방 추적 — 참고: 원본은 sitter 측 필터를 `sitter_id=eq.${userId}`로 걸어
  // chat_rooms.sitter_id(sitters.id 참조)와 사용자 auth id를 비교하는 버그가 있었음.
  // 여기서는 실제 sitters.id로 필터링하도록 수정.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    let channel = supabase.channel("new-rooms-tracker").on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chat_rooms",
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => {
        refresh();
        const newRoom = payload.new as { id?: string; room_type?: string };
        if (newRoom?.room_type === "direct" && newRoom.id) {
          setAcceptedDirectRoomId(newRoom.id);
        }
      },
    );

    if (mySitterId) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_rooms",
          filter: `sitter_id=eq.${mySitterId}`,
        },
        () => refresh(),
      );
    }

    channel = channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chat_rooms",
        filter: `owner_id=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as { id?: string; room_type?: string };
        if (
          updated?.room_type === "direct" &&
          updated.id &&
          reservationRequestIdsRef.current.has(updated.id)
        ) {
          refresh();
          setAcceptedDirectRoomId(updated.id);
        }
      },
    );

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mySitterId, refresh]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("unread-tracker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const { room_id, content, created_at } = payload.new as {
            room_id: string;
            content: string;
            created_at: string;
          };
          if (!myRoomIdsRef.current.has(room_id)) return;
          updateRoomPreview(room_id, formatPreview(content), created_at);
          if (isReservationStatusChangeMessage(content)) refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, updateRoomPreview]);

  const broadcastChannelsRef = useRef<RealtimeChannel[]>([]);
  const broadcastSupabaseRef = useRef<ReturnType<typeof createClient> | null>(
    null,
  );
  const subscribedRoomIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;
    const allIds = data.map((r) => r.id);
    const newIds = allIds.filter((id) => !subscribedRoomIdsRef.current.has(id));
    if (newIds.length === 0) return;

    if (!broadcastSupabaseRef.current) {
      broadcastSupabaseRef.current = createClient();
    }
    const supabase = broadcastSupabaseRef.current;

    newIds.forEach((roomId) => {
      subscribedRoomIdsRef.current.add(roomId);
      const ch = supabase
        .channel(`room-${roomId}`)
        .on("broadcast", { event: "new_message" }, ({ payload }) => {
          const m = payload as {
            sender_id: string;
            content: string;
            created_at: string;
          };
          updateRoomPreview(roomId, formatPreview(m.content), m.created_at);
          if (
            m.sender_id !== userIdRef.current &&
            roomId !== activeRoomIdRef.current
          ) {
            incrementUnread(roomId);
          }
          if (isReservationStatusChangeMessage(m.content)) refresh();
        })
        .on("broadcast", { event: "application_confirmed" }, () => {
          queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
            (prev ?? []).map((r) =>
              r.id === roomId
                ? { ...r, application_status: APPLICATION_STATUS.ACCEPTED }
                : r,
            ),
          );
        })
        .on("broadcast", { event: "reservation_accepted" }, ({ payload }) => {
          refresh();
          const rid = (payload as { room_id?: string }).room_id;
          if (rid) setAcceptedDirectRoomId(rid);
        })
        .subscribe();
      broadcastChannelsRef.current.push(ch);
    });
  }, [data, userId, refresh, incrementUnread, updateRoomPreview, queryClient]);

  useEffect(() => {
    return () => {
      const supabase = broadcastSupabaseRef.current;
      if (supabase) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        broadcastChannelsRef.current.forEach((ch) =>
          supabase.removeChannel(ch),
        );
      }
    };
  }, []);

  const markRoomAsRead = useCallback(
    (roomId: string) => {
      queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
        (prev ?? []).map((r) => (r.id === roomId ? { ...r, unread_count: 0 } : r)),
      );
    },
    [queryClient],
  );

  const removeRoom = useCallback(
    (id: string) => {
      queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
        (prev ?? []).filter((r) => r.id !== id),
      );
    },
    [queryClient],
  );

  const deleteRoom = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      const res = await leaveRoom(id);
      if (!res.ok) return { error: res.error };
      removeRoom(id);
      return {};
    },
    [removeRoom],
  );

  const deleteApplicant = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      const res = await leaveRoom(id);
      if (!res.ok) return { error: res.error };
      removeRoom(id);
      return {};
    },
    [removeRoom],
  );

  const deleteReservationRequest = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      const res = await leaveRoom(id);
      if (!res.ok) return { error: res.error };
      removeRoom(id);
      return {};
    },
    [removeRoom],
  );

  const updateApplicantStatus = useCallback(
    (roomId: string, status: string) => {
      queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
        (prev ?? []).map((r) =>
          r.id === roomId ? { ...r, application_status: status } : r,
        ),
      );
    },
    [queryClient],
  );

  const updateReservationRequestStatus = useCallback(
    (roomId: string, status: string) => {
      queryClient.setQueryData<RoomApiItem[]>(chatKeys.rooms(), (prev) =>
        (prev ?? []).map((r) =>
          r.id === roomId ? { ...r, reservation_status: status } : r,
        ),
      );
    },
    [queryClient],
  );

  const clearAcceptedDirectRoomId = useCallback(
    () => setAcceptedDirectRoomId(null),
    [],
  );

  return {
    rooms,
    applicants,
    reservationRequests,
    posts,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    userId,
    deleteRoom,
    deleteApplicant,
    deleteReservationRequest,
    markRoomAsRead,
    updatePreview: updateRoomPreview,
    updateApplicantStatus,
    updateReservationRequestStatus,
    refresh,
    acceptedDirectRoomId,
    clearAcceptedDirectRoomId,
  };
}
