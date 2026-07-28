"use client";

import { memo, useMemo } from "react";
import { type Message, type ReservationEditActionState } from "@/features/chat/types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  senderInitial: string;
  senderProfileImage: string | null;
  isCurrentUserSitter: boolean;
  selectedApplicantPostId: string | undefined;
  payingNow: boolean;
  isPaymentPending: boolean;
  confirmedServiceIds: Set<string>;
  reviewedReservationIds: Set<string>;
  isServiceConfirming: boolean;
  confirmedEditIds: Set<string>;
  reservationEditAction: ReservationEditActionState;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onPaymentRequest: (data: {
    amount: number;
    reason: string;
    messageId: string;
    extraChargeId?: string;
  }) => void;
  onNavigateToPost: (postId: string) => void;
  onGoToChat: () => void;
  onServiceConfirm: (id: string) => void;
  onReservationEditConfirm: (
    messageId: string,
    reservationId: string,
    proposed: {
      start_datetime: string;
      end_datetime: string;
      memo?: string | null;
    },
  ) => void;
  onReservationEditReject: (messageId: string) => void;
  onWriteReview: (reservationId: string) => void;
  onLeaveChat: () => void;
  onReportMessage: (messageId: string) => void;
}

function MessageListImpl({
  messages,
  senderInitial,
  senderProfileImage,
  isCurrentUserSitter,
  selectedApplicantPostId,
  payingNow,
  isPaymentPending,
  confirmedServiceIds,
  reviewedReservationIds,
  isServiceConfirming,
  confirmedEditIds,
  reservationEditAction,
  hasMore,
  loadingMore,
  onLoadMore,
  onPaymentRequest,
  onNavigateToPost,
  onGoToChat,
  onServiceConfirm,
  onReservationEditConfirm,
  onReservationEditReject,
  onWriteReview,
  onLeaveChat,
  onReportMessage,
}: MessageListProps) {
  const dedupedMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  const paymentPaidByMessageId = useMemo(() => {
    const hasBasePaymentComplete = dedupedMessages.some((m) => {
      if (m.from !== "payment_complete") return false;
      if (!m.paymentRequestMessageId) return true;
      const ref = dedupedMessages.find(
        (r) => r.id === m.paymentRequestMessageId,
      );
      return ref?.paymentData?.isExtra !== true;
    });
    const map = new Map<string, boolean>();
    for (const msg of dedupedMessages) {
      if (msg.from !== "payment_request") continue;
      const isPaid =
        dedupedMessages.some(
          (m) =>
            m.from === "payment_complete" &&
            m.paymentRequestMessageId === msg.id,
        ) ||
        (msg.paymentData?.isExtra !== true && hasBasePaymentComplete);
      map.set(msg.id, isPaid);
    }
    return map;
  }, [dedupedMessages]);

  const lastBaseRequestId = useMemo(() => {
    for (let i = dedupedMessages.length - 1; i >= 0; i--) {
      const m = dedupedMessages[i];
      if (m.from === "payment_request" && m.paymentData?.isExtra !== true) {
        return m.id;
      }
    }
    return null;
  }, [dedupedMessages]);

  return (
    <>
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-sm text-orange-500 disabled:text-stone-400"
          >
            {loadingMore ? "불러오는 중..." : "이전 메시지 더 보기"}
          </button>
        </div>
      )}
      {dedupedMessages.map((msg) => {
        const postId =
          msg.applicationData?.postId ||
          msg.paymentData?.postId ||
          selectedApplicantPostId;
        const isThisPaymentPaid =
          msg.from === "payment_request" &&
          (paymentPaidByMessageId.get(msg.id) ?? false);
        return (
          <MessageBubble
            key={msg.id}
            msg={msg}
            senderInitial={senderInitial}
            senderProfileImage={senderProfileImage}
            isCurrentUserSitter={isCurrentUserSitter}
            onPaymentRequest={
              msg.from === "payment_request" &&
              msg.paymentData &&
              msg.paymentData.amount > 0 &&
              (msg.paymentData.isExtra === true || msg.id === lastBaseRequestId)
                ? () =>
                    onPaymentRequest({
                      amount: msg.paymentData!.amount,
                      reason: msg.paymentData!.reason,
                      messageId: msg.id,
                      extraChargeId: msg.paymentData!.extraChargeId,
                    })
                : undefined
            }
            isPaymentPending={payingNow || isPaymentPending}
            isPaymentPaid={isThisPaymentPaid}
            onPostClick={postId ? () => onNavigateToPost(postId) : undefined}
            onGoToChat={onGoToChat}
            onServiceConfirm={onServiceConfirm}
            isServiceConfirmed={
              !!msg.serviceCompleteData?.reservationId &&
              confirmedServiceIds.has(msg.serviceCompleteData.reservationId)
            }
            isServiceConfirming={isServiceConfirming}
            isReviewWritten={
              !!msg.serviceCompleteConfirmedData?.reservationId &&
              reviewedReservationIds.has(
                msg.serviceCompleteConfirmedData.reservationId,
              )
            }
            onReservationEditConfirm={onReservationEditConfirm}
            onReservationEditReject={onReservationEditReject}
            confirmedEditIds={confirmedEditIds}
            reservationEditAction={reservationEditAction}
            onWriteReview={onWriteReview}
            onLeaveChat={onLeaveChat}
            onReportMessage={
              msg.from === "other" ? () => onReportMessage(msg.id) : undefined
            }
          />
        );
      })}
    </>
  );
}

export const MessageList = memo(MessageListImpl);
