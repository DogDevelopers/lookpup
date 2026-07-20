"use client";

import { useState, memo } from "react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Message, ReservationEditActionState } from "@/features/chat/types";
import {
  SitterServiceStartCard,
  ServiceStartCard,
  SitterServiceCompleteCard,
  ServiceCompleteCard,
  ServiceCompletedCard,
  SitterPaymentRequestCard,
  PaymentRequestCard,
  PaymentCompleteCard,
} from "./cards/service-cards";
import {
  ConfirmationCard,
  SitterConfirmationCard,
  OwnerRejectionCard,
  SitterRejectionCard,
  ReservationCanceledCard,
  ReservationRequestMessageCard,
  ReservationAcceptedMessageCard,
  ReservationRejectedMessageCard,
  ReservationEditAcceptedCard,
  ReservationEditRejectedCard,
  ReservationEditCard,
} from "./cards/reservation-cards";

function ChatImageLightbox({
  url,
  onClose,
}: {
  url: string | null;
  onClose: () => void;
}) {
  return (
    <DialogPrimitive.Root
      open={url !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200" />
        <DialogPrimitive.Popup
          className="fixed inset-0 z-50 flex items-center justify-center outline-none cursor-pointer data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 duration-200"
          onClick={onClose}
        >
          <DialogPrimitive.Title className="sr-only">
            이미지 보기
          </DialogPrimitive.Title>
          <div
            className="absolute top-4 right-4"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogPrimitive.Close className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer">
              <X size={18} />
              <span className="sr-only">닫기</span>
            </DialogPrimitive.Close>
          </div>
          {url && (
            <div
              className="w-full max-w-4xl px-4 md:px-6 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="w-full object-contain max-h-[78vh] rounded-2xl"
              />
            </div>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type MessageBubbleProps = {
  msg: Message;
  senderInitial: string;
  senderProfileImage?: string | null;
  isCurrentUserSitter?: boolean;
  onPaymentRequest?: () => void;
  isPaymentPending?: boolean;
  isPaymentPaid?: boolean;
  onPostClick?: () => void;
  onGoToChat?: () => void;
  onServiceConfirm?: (reservationId: string) => void;
  isServiceConfirmed?: boolean;
  isServiceConfirming?: boolean;
  isReviewWritten?: boolean;
  onReservationEditConfirm?: (
    messageId: string,
    reservationId: string,
    proposed: {
      start_datetime: string;
      end_datetime: string;
      memo?: string | null;
    },
  ) => void;
  onReservationEditReject?: (messageId: string) => void;
  confirmedEditIds?: Set<string>;
  reservationEditAction?: ReservationEditActionState;
  onWriteReview?: (reservationId: string) => void;
  onLeaveChat?: () => void;
};

function MessageBubbleImpl({
  msg,
  senderInitial,
  senderProfileImage,
  isCurrentUserSitter,
  onPaymentRequest,
  isPaymentPending,
  isPaymentPaid,
  onPostClick,
  onGoToChat,
  onServiceConfirm,
  isServiceConfirmed,
  isServiceConfirming,
  isReviewWritten,
  onReservationEditConfirm,
  onReservationEditReject,
  confirmedEditIds,
  reservationEditAction,
  onWriteReview,
  onLeaveChat,
}: MessageBubbleProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (msg.from === "reservation_edit_response") {
    const data = msg.reservationEditResponseData;
    if (!data) return null;
    return (
      <div
        className={`flex ${data.sentByMe ? "justify-end" : "items-start gap-3"}`}
      >
        {!data.sentByMe && (
          <Avatar initial={senderInitial} src={senderProfileImage} size="sm" />
        )}
        <div>
          {data.accepted ? (
            <ReservationEditAcceptedCard sentByMe={data.sentByMe ?? false} />
          ) : (
            <ReservationEditRejectedCard sentByMe={data.sentByMe ?? false} />
          )}
          {msg.time && (
            <p
              className={`text-stone-500 text-xs mt-1 ${data.sentByMe ? "text-right pr-3" : "text-left pl-3"}`}
            >
              {msg.time}
            </p>
          )}
        </div>
      </div>
    );
  }
  if (msg.from === "reservation_edit") {
    const data = msg.reservationEditData;
    if (!data) return null;
    const isProcessed = confirmedEditIds?.has(msg.id);
    return (
      <div
        className={`flex ${data.sentByMe ? "justify-end" : "items-start gap-3"}`}
      >
        {!data.sentByMe && (
          <Avatar initial={senderInitial} src={senderProfileImage} size="sm" />
        )}
        <div>
          <ReservationEditCard
            messageId={msg.id}
            data={data}
            isProcessed={isProcessed ?? false}
            reservationEditAction={reservationEditAction ?? null}
            onConfirm={onReservationEditConfirm}
            onReject={onReservationEditReject}
          />
          {msg.time && (
            <p
              className={`text-stone-500 text-xs mt-1 ${data.sentByMe ? "text-right pr-3" : "text-left pl-3"}`}
            >
              {msg.time}
            </p>
          )}
        </div>
      </div>
    );
  }
  if (msg.from === "service_start") {
    if (isCurrentUserSitter && msg.sentByMe) {
      return (
        <div>
          <SitterServiceStartCard data={msg.serviceStartData} />
          {msg.time && (
            <p className="text-right text-stone-500 text-xs pr-3 mt-1">
              {msg.time}
            </p>
          )}
        </div>
      );
    }
    return (
      <div>
        <ServiceStartCard
          otherInitial={senderInitial}
          otherProfileImage={senderProfileImage}
          data={msg.serviceStartData}
        />
        {msg.time && (
          <p className="text-left text-stone-500 text-xs pl-11 mt-1">
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "reservation_request") {
    const data = msg.reservationRequestData;
    if (!data) return null;
    return (
      <div>
        <ReservationRequestMessageCard
          data={data}
          senderInitial={senderInitial}
          senderProfileImage={senderProfileImage}
        />
        {msg.time && (
          <p
            className={`text-stone-500 text-xs mt-1 ${data.sentByMe ? "text-right pr-3" : "text-left pl-11"}`}
          >
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "reservation_accepted") {
    const data = msg.reservationAcceptedData;
    if (!data) return null;
    return (
      <div>
        <ReservationAcceptedMessageCard
          data={data}
          senderInitial={senderInitial}
          senderProfileImage={senderProfileImage}
        />
        {msg.time && (
          <p
            className={`text-stone-500 text-xs mt-1 ${data.sentByMe ? "text-right pr-3" : "text-left pl-11"}`}
          >
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "reservation_rejected") {
    return (
      <div>
        <ReservationRejectedMessageCard sentByMe={msg.sentByMe ?? false} />
        {msg.time && (
          <p
            className={`text-stone-500 text-xs mt-1 ${msg.sentByMe ? "text-right pr-3" : "text-left"}`}
          >
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "application_selected") {
    const data = msg.applicationData;
    if (!data) return null;
    return (
      <div>
        {data.sentByMe ? (
          <ConfirmationCard
            postTitle={data.postTitle}
            sitterInitial={senderInitial}
            sitterProfileImage={senderProfileImage}
            onPostClick={onPostClick}
            onGoToChat={onGoToChat ?? (() => {})}
          />
        ) : (
          <SitterConfirmationCard
            postTitle={data.postTitle}
            ownerInitial={senderInitial}
            ownerProfileImage={senderProfileImage}
            onPostClick={onPostClick}
            onGoToChat={onGoToChat}
          />
        )}
        {msg.time && (
          <p className="text-right text-stone-500 text-xs pr-3 mt-1">
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "application_rejected") {
    return (
      <div>
        {msg.applicationData?.sentByMe ? (
          <OwnerRejectionCard />
        ) : (
          <SitterRejectionCard />
        )}
        {msg.time && (
          <p className="text-right text-stone-500 text-xs pr-3 mt-1">
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "reservation_canceled") {
    return (
      <div>
        <ReservationCanceledCard sentByMe={msg.sentByMe ?? false} />
        {msg.time && (
          <p className="text-right text-stone-500 text-xs pr-3 mt-1">
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "service_complete") {
    if (msg.sentByMe) {
      return (
        <div>
          <SitterServiceCompleteCard data={msg.serviceCompleteData} />
          {msg.time && (
            <p className="text-right text-stone-500 text-xs pr-3 mt-1">
              {msg.time}
            </p>
          )}
        </div>
      );
    }
    const reservationId = msg.serviceCompleteData?.reservationId ?? "";
    return (
      <div>
        <ServiceCompleteCard
          confirmed={isServiceConfirmed ?? false}
          onConfirm={() => onServiceConfirm?.(reservationId)}
          isConfirming={isServiceConfirming ?? false}
          otherInitial={senderInitial}
          otherProfileImage={senderProfileImage}
          data={msg.serviceCompleteData}
        />
        {msg.time && (
          <p className="text-left text-stone-500 text-xs pl-11 mt-1">
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "service_complete_confirmed") {
    const confirmedReservationId =
      msg.serviceCompleteConfirmedData?.reservationId ?? "";
    const sentByMe = msg.sentByMe ?? false;
    return (
      <div>
        <ServiceCompletedCard
          sentByMe={sentByMe}
          senderInitial={senderInitial}
          senderProfileImage={senderProfileImage}
          data={msg.serviceCompleteConfirmedData}
          canWriteReview={sentByMe && !isReviewWritten}
          onWriteReview={() => onWriteReview?.(confirmedReservationId)}
          onLeaveChat={onLeaveChat}
        />
        {msg.time && (
          <p
            className={`text-stone-500 text-xs mt-1 ${msg.sentByMe ? "text-right pr-3" : "text-left pl-11"}`}
          >
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "payment_request") {
    const data = msg.paymentData;
    if (!data) return null;
    return (
      <div>
        {data.sentByMe ? (
          <SitterPaymentRequestCard
            amount={data.amount}
            reason={data.reason}
            otherInitial={senderInitial}
            otherProfileImage={senderProfileImage}
            onPostClick={onPostClick}
            costItems={data.costItems}
            isExtra={data.isExtra}
          />
        ) : (
          <PaymentRequestCard
            amount={data.amount}
            reason={data.reason}
            deadline={data.deadline}
            paid={isPaymentPaid ?? false}
            onPay={onPaymentRequest}
            isPaying={isPaymentPending ?? false}
            otherInitial={senderInitial}
            otherProfileImage={senderProfileImage}
            onPostClick={onPostClick}
            isExtra={data.isExtra}
            costItems={data.costItems}
          />
        )}
        {msg.time && (
          <p
            className={`text-stone-500 text-xs mt-1 ${data.sentByMe ? "text-right pr-3" : "text-left pl-11"}`}
          >
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "payment_complete") {
    const sentByMe = msg.paymentData?.sentByMe ?? msg.sentByMe ?? true;
    return (
      <div>
        <PaymentCompleteCard
          amount={msg.paymentData?.amount ?? 0}
          sentByMe={sentByMe}
          otherInitial={senderInitial}
          otherProfileImage={senderProfileImage}
        />
        {msg.time && (
          <p
            className={`text-stone-500 text-xs mt-1 ${sentByMe ? "text-right pr-3" : "text-left pl-11"}`}
          >
            {msg.time}
          </p>
        )}
      </div>
    );
  }
  if (msg.from === "date_separator") {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 shrink-0">{msg.text}</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
    );
  }
  if (msg.from === "divider") {
    if (msg.text.startsWith("[돌봄기록]")) {
      return (
        <div className="flex justify-center">
          <span className="px-4 py-1 bg-orange-300 rounded-full text-white text-sm">
            {msg.text}
          </span>
        </div>
      );
    }
    return (
      <div className="flex justify-center">
        <span className="px-4 py-1 bg-white rounded-full text-stone-500 text-sm">
          {msg.text}
        </span>
      </div>
    );
  }
  if (msg.from === "other") {
    return (
      <div className="flex items-start gap-3">
        <Avatar initial={senderInitial} src={senderProfileImage} size="sm" />
        <div>
          {msg.imageUrl ? (
            <>
              <button
                onClick={() => setLightboxUrl(msg.imageUrl!)}
                className="max-w-xs overflow-hidden rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-sm block focus:outline-none cursor-pointer"
              >
                <Image
                  src={msg.imageUrl}
                  alt="사진"
                  width={240}
                  height={240}
                  className="object-cover w-60 h-auto"
                />
              </button>
              <ChatImageLightbox
                url={lightboxUrl}
                onClose={() => setLightboxUrl(null)}
              />
            </>
          ) : (
            <div className="max-w-xs px-5 py-4 bg-orange-500 rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-sm">
              <p className="text-white text-sm leading-6">{msg.text}</p>
            </div>
          )}
          <p className="text-stone-500 text-xs mt-1 pl-3">{msg.time}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      {msg.imageUrl ? (
        <>
          <button
            onClick={() => setLightboxUrl(msg.imageUrl!)}
            className="max-w-xs overflow-hidden rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl block focus:outline-none cursor-pointer"
          >
            <Image
              src={msg.imageUrl}
              alt="사진"
              width={240}
              height={240}
              className="object-cover w-60 h-auto"
            />
          </button>
          <ChatImageLightbox
            url={lightboxUrl}
            onClose={() => setLightboxUrl(null)}
          />
        </>
      ) : (
        <div className="max-w-xs px-5 py-4 bg-orange-500 rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl">
          <p className="text-white text-sm leading-6">{msg.text}</p>
        </div>
      )}
      <p className="text-stone-500 text-xs pr-3">{msg.time}</p>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
