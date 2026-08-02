"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { chatKeys } from "@/lib/query-keys";
import { getChatMessages } from "@/features/chat/actions/room-actions";
import type {
  ChatMessageRow,
  Message,
  PaymentData,
  ApplicationData,
  ServiceCompleteData,
  ReservationRequestData,
  ReservationAcceptedData,
  ReservationEditPayload,
  ReservationEditResponsePayload,
} from "@/features/chat/types";
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
} from "@/lib/chat-message-prefixes";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toMessage(m: ChatMessageRow, userId: string): Message {
  if (m.content.startsWith(SYSTEM_MSG_PREFIX)) {
    return {
      id: m.id,
      from: "divider",
      text: m.content.slice(SYSTEM_MSG_PREFIX.length),
    };
  }
  if (m.content.startsWith(IMAGE_MSG_PREFIX)) {
    return {
      id: m.id,
      from: m.sender_id === userId ? "me" : "other",
      text: "",
      imageUrl: m.content.slice(IMAGE_MSG_PREFIX.length),
      time: m.created_at ? formatTime(m.created_at) : "",
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(PAYMENT_REQUEST_PREFIX)) {
    try {
      const data = JSON.parse(
        m.content.slice(PAYMENT_REQUEST_PREFIX.length),
      ) as PaymentData;
      return {
        id: m.id,
        from: "payment_request" as const,
        text: "",
        paymentData: { ...data, sentByMe: m.sender_id === userId },
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "결제 요청" };
    }
  }
  if (m.content.startsWith(PAYMENT_COMPLETE_PREFIX)) {
    try {
      const data = JSON.parse(
        m.content.slice(PAYMENT_COMPLETE_PREFIX.length),
      ) as { amount: number; paymentRequestMessageId?: string };
      return {
        id: m.id,
        from: "payment_complete" as const,
        text: "",
        paymentData: {
          amount: data.amount,
          reason: "",
          deadline: "",
          sentByMe: m.sender_id === userId,
        },
        paymentRequestMessageId: data.paymentRequestMessageId,
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "결제 완료" };
    }
  }
  if (m.content.startsWith(APPLICATION_SELECTED_PREFIX)) {
    try {
      const data = JSON.parse(
        m.content.slice(APPLICATION_SELECTED_PREFIX.length),
      ) as ApplicationData;
      return {
        id: m.id,
        from: "application_selected" as const,
        text: "",
        applicationData: { ...data, sentByMe: m.sender_id === userId },
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "선택 확정" };
    }
  }
  if (m.content.startsWith(APPLICATION_REJECTED_PREFIX)) {
    return {
      id: m.id,
      from: "application_rejected" as const,
      text: "",
      applicationData: {
        postTitle: "",
        postId: "",
        sitterId: "",
        sentByMe: m.sender_id === userId,
      },
      time: m.created_at ? formatTime(m.created_at) : undefined,
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(RESERVATION_CANCELED_PREFIX)) {
    return {
      id: m.id,
      from: "reservation_canceled" as const,
      text: "",
      sentByMe: m.sender_id === userId,
      time: m.created_at ? formatTime(m.created_at) : undefined,
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(SERVICE_COMPLETE_PREFIX)) {
    let serviceCompleteData: ServiceCompleteData | undefined;
    const jsonPart = m.content.slice(SERVICE_COMPLETE_PREFIX.length);
    if (jsonPart) {
      try {
        serviceCompleteData = JSON.parse(jsonPart) as ServiceCompleteData;
      } catch {
      }
    }
    return {
      id: m.id,
      from: "service_complete" as const,
      text: "",
      sentByMe: m.sender_id === userId,
      serviceCompleteData,
      time: m.created_at ? formatTime(m.created_at) : undefined,
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(SERVICE_COMPLETE_CONFIRMED_PREFIX)) {
    let serviceCompleteConfirmedData: ServiceCompleteData | undefined;
    const jsonPart = m.content.slice(SERVICE_COMPLETE_CONFIRMED_PREFIX.length);
    if (jsonPart) {
      try {
        serviceCompleteConfirmedData = JSON.parse(
          jsonPart,
        ) as ServiceCompleteData;
      } catch {
      }
    }
    return {
      id: m.id,
      from: "service_complete_confirmed" as const,
      text: "",
      sentByMe: m.sender_id === userId,
      serviceCompleteConfirmedData,
      time: m.created_at ? formatTime(m.created_at) : undefined,
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(SERVICE_START_PREFIX)) {
    let serviceStartData: ServiceCompleteData | undefined;
    const jsonPart = m.content.slice(SERVICE_START_PREFIX.length);
    if (jsonPart) {
      try {
        serviceStartData = JSON.parse(jsonPart) as ServiceCompleteData;
      } catch {
      }
    }
    return {
      id: m.id,
      from: "service_start" as const,
      text: "",
      sentByMe: m.sender_id === userId,
      serviceStartData,
      time: m.created_at ? formatTime(m.created_at) : undefined,
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(RESERVATION_REQUEST_PREFIX)) {
    try {
      const data = JSON.parse(
        m.content.slice(RESERVATION_REQUEST_PREFIX.length),
      ) as ReservationRequestData;
      return {
        id: m.id,
        from: "reservation_request" as const,
        text: "",
        reservationRequestData: { ...data, sentByMe: m.sender_id === userId },
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "예약 요청" };
    }
  }
  if (m.content.startsWith(RESERVATION_ACCEPTED_PREFIX)) {
    try {
      const data = JSON.parse(
        m.content.slice(RESERVATION_ACCEPTED_PREFIX.length),
      ) as ReservationAcceptedData;
      return {
        id: m.id,
        from: "reservation_accepted" as const,
        text: "",
        reservationAcceptedData: { ...data, sentByMe: m.sender_id === userId },
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "예약 확정" };
    }
  }
  if (m.content === RESERVATION_REJECTED_PREFIX) {
    return {
      id: m.id,
      from: "reservation_rejected" as const,
      text: "",
      sentByMe: m.sender_id === userId,
      time: m.created_at ? formatTime(m.created_at) : undefined,
      rawDate: m.created_at ?? undefined,
    };
  }
  if (m.content.startsWith(RESERVATION_EDIT_PREFIX)) {
    try {
      const payload = JSON.parse(
        m.content.slice(RESERVATION_EDIT_PREFIX.length),
      ) as Omit<ReservationEditPayload, "sentByMe">;
      return {
        id: m.id,
        from: "reservation_edit" as const,
        text: "",
        reservationEditData: { ...payload, sentByMe: m.sender_id === userId },
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "예약 수정 요청" };
    }
  }
  if (m.content.startsWith(RESERVATION_EDIT_RESPONSE_PREFIX)) {
    try {
      const payload = JSON.parse(
        m.content.slice(RESERVATION_EDIT_RESPONSE_PREFIX.length),
      ) as Omit<ReservationEditResponsePayload, "sentByMe">;
      return {
        id: m.id,
        from: "reservation_edit_response" as const,
        text: "",
        reservationEditResponseData: {
          ...payload,
          sentByMe: m.sender_id === userId,
        },
        time: m.created_at ? formatTime(m.created_at) : undefined,
        rawDate: m.created_at ?? undefined,
      };
    } catch {
      return { id: m.id, from: "divider", text: "예약 수정 응답" };
    }
  }
  return {
    id: m.id,
    from: m.sender_id === userId ? "me" : "other",
    text: m.content,
    time: m.created_at ? formatTime(m.created_at) : "",
    rawDate: m.created_at ?? undefined,
  };
}

export interface PaymentStateInfo {
  amount: number;
  reason: string;
  deadline: string;
  paid: boolean;
  sentByMe: boolean;
}

function derivePaymentState(messages: Message[]): PaymentStateInfo | null {
  const reqIdx = messages.findLastIndex((m) => m.from === "payment_request");
  if (reqIdx === -1) return null;
  const paid = messages.some((m) => {
    if (m.from !== "payment_complete") return false;
    if (!m.paymentRequestMessageId) return true;
    const ref = messages.find((r) => r.id === m.paymentRequestMessageId);
    return !ref?.paymentData?.isExtra;
  });
  const data = messages[reqIdx].paymentData!;
  return {
    amount: data.amount,
    reason: data.reason,
    deadline: data.deadline,
    paid,
    sentByMe: data.sentByMe ?? false,
  };
}

export function useChatMessages(
  activeRoomId: string | null,
  userId: string | null,
  refreshKey?: number,
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const queryKey = activeRoomId
    ? chatKeys.messages(activeRoomId)
    : chatKeys.messages("__none__");

  const query = useQuery({
    queryKey: [...queryKey, refreshKey ?? 0],
    queryFn: async () => {
      if (!activeRoomId) return { messages: [] as ChatMessageRow[], nextCursor: null as string | null };
      const res = await getChatMessages(activeRoomId);
      if (!res.ok) throw new Error(res.error);
      return {
        messages: res.data.messages.slice().reverse(),
        nextCursor: res.data.next_cursor,
      };
    },
    enabled: !!activeRoomId && !!userId,
  });

  const rows = useMemo(() => query.data?.messages ?? [], [query.data]);
  const nextCursor = query.data?.nextCursor ?? null;
  const hasMore = nextCursor !== null;

  const messages = useMemo(
    () => (userId ? rows.map((m) => toMessage(m, userId)) : []),
    [rows, userId],
  );

  useEffect(() => {
    if (!activeRoomId || !userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`room-${activeRoomId}`)
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        const m = payload as ChatMessageRow;
        if (m.sender_id === userId) return;
        queryClient.setQueryData<{
          messages: ChatMessageRow[];
          nextCursor: string | null;
        }>([...chatKeys.messages(activeRoomId), refreshKey ?? 0], (prev) => {
          if (!prev) return prev;
          if (prev.messages.some((msg) => msg.id === m.id)) return prev;
          return { ...prev, messages: [...prev.messages, m] };
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeRoomId, userId, queryClient, refreshKey]);

  useEffect(() => {
    if (!activeRoomId || !userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`room-db-${activeRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${activeRoomId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessageRow;
          if (m.sender_id === userId) return;
          queryClient.setQueryData<{
            messages: ChatMessageRow[];
            nextCursor: string | null;
          }>([...chatKeys.messages(activeRoomId), refreshKey ?? 0], (prev) => {
            if (!prev) return prev;
            if (prev.messages.some((msg) => msg.id === m.id)) return prev;
            return { ...prev, messages: [...prev.messages, m] };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, userId, queryClient, refreshKey]);

  const addMessage = useCallback(
    (m: ChatMessageRow) => {
      if (!activeRoomId) return;
      queryClient.setQueryData<{
        messages: ChatMessageRow[];
        nextCursor: string | null;
      }>([...chatKeys.messages(activeRoomId), refreshKey ?? 0], (prev) => {
        if (!prev) return { messages: [m], nextCursor: null };
        return { ...prev, messages: [...prev.messages, m] };
      });
    },
    [activeRoomId, queryClient, refreshKey],
  );

  const broadcastMessage = useCallback(
    (roomId: string, m: ChatMessageRow) => {
      if (roomId === activeRoomId) {
        channelRef.current?.send({
          type: "broadcast",
          event: "new_message",
          payload: m,
        });
        return;
      }
      const supabase = createClient();
      const channel = supabase.channel(`room-${roomId}`);
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        channel
          .send({ type: "broadcast", event: "new_message", payload: m })
          .finally(() => supabase.removeChannel(channel));
      });
    },
    [activeRoomId],
  );

  const broadcastConfirmation = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "application_confirmed",
      payload: {},
    });
  }, []);

  const broadcastReservationAccepted = useCallback((roomId: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "reservation_accepted",
      payload: { room_id: roomId },
    });
  }, []);

  const paymentState = useMemo(() => derivePaymentState(messages), [messages]);

  const confirmedEditIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      if (
        m.from === "reservation_edit_response" &&
        m.reservationEditResponseData?.originalMessageId
      ) {
        ids.add(m.reservationEditResponseData.originalMessageId);
      }
    }
    return ids;
  }, [messages]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !activeRoomId || !userId || query.isFetching) return;
    const res = await getChatMessages(activeRoomId, nextCursor);
    if (!res.ok) return;
    const older = res.data.messages.slice().reverse();
    queryClient.setQueryData<{
      messages: ChatMessageRow[];
      nextCursor: string | null;
    }>([...chatKeys.messages(activeRoomId), refreshKey ?? 0], (prev) => ({
      messages: [...older, ...(prev?.messages ?? [])],
      nextCursor: res.data.next_cursor,
    }));
  }, [nextCursor, activeRoomId, userId, query.isFetching, queryClient, refreshKey]);

  return {
    messages,
    addMessage,
    broadcastMessage,
    broadcastConfirmation,
    broadcastReservationAccepted,
    loadMore,
    hasMore,
    loadingMore: query.isFetching && rows.length > 0,
    paymentState,
    confirmedEditIds,
  };
}
