"use client";

import Image from "next/image";
import { XCircle, CheckCircle, CalendarRange } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { formatAmPmTime, formatServiceDate } from "@/features/chat/utils";
import type {
  ReservationRequestData,
  ReservationAcceptedData,
  ReservationEditPayload,
  ReservationEditActionState,
} from "@/features/chat/types";

type ConfirmationCardProps = {
  postTitle: string;
  sitterInitial: string;
  sitterProfileImage?: string | null;
  onGoToChat: () => void;
  onPostClick?: () => void;
};

export function ConfirmationCard({
  postTitle,
  sitterInitial,
  sitterProfileImage,
  onGoToChat,
  onPostClick,
}: ConfirmationCardProps) {
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
        <div className="flex flex-col">
          <span className="text-stone-500 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
            예약 확정
          </span>
          <span className="text-stone-900 text-sm leading-5 mt-0.5">
            예약이 완료되었습니다!
            <br />
            1:1 채팅에서 결제를 진행해주세요.
          </span>
        </div>
        <div className="py-3">
          <button
            type="button"
            onClick={onPostClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-orange-100 rounded-xl hover:bg-orange-200 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-200 shrink-0 overflow-hidden flex items-center justify-center">
              {sitterProfileImage ? (
                <Image
                  src={sitterProfileImage}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-sm font-semibold text-orange-500">
                  {sitterInitial}
                </span>
              )}
            </div>
            <span className="text-stone-700 text-sm leading-5 truncate flex-1">
              {postTitle}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onGoToChat}
          className="w-full h-10 rounded-xl outline-[1.11px] outline-orange-500 outline-offset-[-1.11px] text-orange-500 text-sm font-medium hover:bg-orange-50 transition-colors"
        >
          1:1 채팅으로 이동
        </button>
      </div>
    </div>
  );
}

type SitterConfirmationCardProps = {
  postTitle: string;
  ownerInitial: string;
  ownerProfileImage?: string | null;
  onPostClick?: () => void;
  onGoToChat?: () => void;
};

export function SitterConfirmationCard({
  postTitle,
  ownerInitial,
  ownerProfileImage,
  onPostClick,
  onGoToChat,
}: SitterConfirmationCardProps) {
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-orange-100 rounded-2xl outline-[1.11px] outline-orange-400 outline-offset-[-1.11px] flex flex-col">
        <div className="flex flex-col">
          <span className="text-orange-500 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
            예약 확정
          </span>
          <span className="text-stone-900 text-sm leading-5 mt-0.5">
            예약이 완료되었습니다!
            <br />
            1:1 채팅에서 결제 내용을 확인해주세요.
          </span>
        </div>
        <div className="pt-3 pb-3">
          <button
            type="button"
            onClick={onPostClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-orange-200 rounded-xl hover:bg-orange-300 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-300 shrink-0 overflow-hidden flex items-center justify-center">
              {ownerProfileImage ? (
                <Image
                  src={ownerProfileImage}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-sm font-semibold text-orange-500">
                  {ownerInitial}
                </span>
              )}
            </div>
            <span className="text-stone-700 text-sm leading-5 truncate flex-1">
              {postTitle}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onGoToChat}
          className="w-full h-10 rounded-xl outline-[1.11px] outline-orange-500 outline-offset-[-1.11px] text-orange-500 text-sm font-medium hover:bg-orange-50 transition-colors"
        >
          1:1 채팅으로 이동
        </button>
      </div>
    </div>
  );
}

export function OwnerRejectionCard() {
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-red-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              지원 거절
            </span>
            <span className="text-stone-900 text-sm leading-5 mt-0.5">
              지원을 거절했습니다.
            </span>
          </div>
        </div>
        <p className="pt-3 text-stone-500 text-xs leading-5">
          아쉽게도 이번 지원은 거절되었습니다.
        </p>
      </div>
    </div>
  );
}

export function SitterRejectionCard() {
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-red-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              지원 거절
            </span>
            <span className="text-stone-900 text-sm leading-5 mt-0.5">
              지원이 거절되었습니다.
            </span>
          </div>
        </div>
        <p className="pt-3 text-stone-500 text-xs leading-5">
          아쉽게도 이번 지원은 거절되었습니다.
        </p>
        <div className="pt-3">
          <div className="pt-1 border-t border-red-200">
            <p className="text-red-400 text-[11px] leading-[17.6px]">
              다른 구인글에 지원해보세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReservationCanceledCard({ sentByMe }: { sentByMe: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-red-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              예약 취소
            </span>
            <span className="text-stone-900 text-sm leading-5 mt-0.5">
              {sentByMe ? "예약을 취소했습니다." : "예약이 취소되었습니다."}
            </span>
          </div>
        </div>
        <p className="pt-3 text-stone-500 text-xs leading-5">
          {sentByMe
            ? "취소된 예약은 되돌릴 수 없습니다."
            : "상대방이 예약을 취소했습니다."}
        </p>
      </div>
    </div>
  );
}

type ReservationRequestMessageCardProps = {
  data: ReservationRequestData;
  senderInitial: string;
  senderProfileImage?: string | null;
};

export function ReservationRequestMessageCard({
  data,
  senderInitial,
  senderProfileImage,
}: ReservationRequestMessageCardProps) {
  const inner = (
    <div
      className={`w-79.5 p-4 rounded-2xl flex flex-col gap-2 ${
        data.sentByMe
          ? "bg-orange-100 outline-[1.11px] outline-orange-400 outline-offset-[-1.11px]"
          : "bg-white outline-[1.11px] outline-orange-200 outline-offset-[-1.11px]"
      }`}
    >
      <div>
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.3px] leading-4 ${
            data.sentByMe ? "text-orange-500" : "text-stone-500"
          }`}
        >
          예약 요청
        </span>
        <p className="text-stone-900 text-sm leading-5 mt-0.5">
          {data.sentByMe ? "예약을 요청했습니다." : "예약 요청이 도착했어요."}
        </p>
      </div>
      <div
        className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-xl ${
          data.sentByMe ? "bg-orange-200" : "bg-orange-50"
        }`}
      >
        <div className="flex justify-between items-center">
          <span className="text-stone-500 text-xs shrink-0">서비스</span>
          <span className="text-stone-700 text-xs font-medium">
            {data.serviceTitle}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-stone-500 text-xs shrink-0">날짜</span>
          <span className="text-stone-700 text-xs">
            {formatServiceDate(data.startDatetime)}
            {data.endDatetime
              ? ` ~ ${formatServiceDate(data.endDatetime)}`
              : ""}
          </span>
        </div>
        {data.petNames.length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-xs shrink-0">반려동물</span>
            <span className="text-stone-700 text-xs">
              {data.petNames.join(", ")}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-stone-500 text-xs shrink-0">금액</span>
          <span className="text-orange-500 text-xs font-medium">
            {data.totalPrice.toLocaleString("ko-KR")}원
          </span>
        </div>
      </div>
    </div>
  );

  if (data.sentByMe) {
    return <div className="flex justify-end">{inner}</div>;
  }
  return (
    <div className="flex items-start gap-3">
      <Avatar initial={senderInitial} src={senderProfileImage} size="sm" />
      {inner}
    </div>
  );
}

type ReservationAcceptedMessageCardProps = {
  data: ReservationAcceptedData;
  senderInitial: string;
  senderProfileImage?: string | null;
};

export function ReservationAcceptedMessageCard({
  data,
  senderInitial,
  senderProfileImage,
}: ReservationAcceptedMessageCardProps) {
  const inner = (
    <div
      className={`w-79.5 p-4 rounded-2xl flex flex-col gap-2 ${
        data.sentByMe
          ? "bg-orange-100 outline-[1.11px] outline-orange-400 outline-offset-[-1.11px]"
          : "bg-white outline-[1.11px] outline-orange-200 outline-offset-[-1.11px]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle size={18} className="text-emerald-500" />
        </div>
        <div>
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.3px] leading-4 ${
              data.sentByMe ? "text-orange-500" : "text-emerald-800"
            }`}
          >
            예약 확정
          </span>
          <p className="text-stone-900 text-sm leading-5 mt-0.5">
            {data.sentByMe ? "예약을 수락했습니다." : "예약이 확정되었어요!"}
          </p>
        </div>
      </div>
      <div
        className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-xl ${
          data.sentByMe ? "bg-orange-200" : "bg-orange-50"
        }`}
      >
        {data.startDatetime && (
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-xs shrink-0">날짜</span>
            <span className="text-stone-700 text-xs">
              {formatServiceDate(data.startDatetime)}
              {data.endDatetime
                ? ` ~ ${formatServiceDate(data.endDatetime)}`
                : ""}
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-stone-500 text-xs shrink-0">금액</span>
          <span className="text-orange-500 text-xs font-medium">
            {data.totalPrice.toLocaleString("ko-KR")}원
          </span>
        </div>
      </div>
      {!data.sentByMe && (
        <p className="text-stone-500 text-xs leading-relaxed">
          채팅에서 결제를 진행해주세요.
        </p>
      )}
    </div>
  );

  if (data.sentByMe) {
    return <div className="flex justify-end">{inner}</div>;
  }
  return (
    <div className="flex items-start gap-3">
      <Avatar initial={senderInitial} src={senderProfileImage} size="sm" />
      {inner}
    </div>
  );
}

export function ReservationRejectedMessageCard({
  sentByMe,
}: {
  sentByMe: boolean;
}) {
  return (
    <div className={sentByMe ? "flex justify-end" : ""}>
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-red-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              예약 거절
            </span>
            <span className="text-stone-900 text-sm leading-5 mt-0.5">
              {sentByMe
                ? "예약 요청을 거절했습니다."
                : "예약 요청이 거절되었습니다."}
            </span>
          </div>
        </div>
        <p className="pt-3 text-stone-500 text-xs leading-5">
          {sentByMe
            ? "거절된 예약은 되돌릴 수 없습니다."
            : "다른 펫시터에게 예약을 요청해보세요."}
        </p>
      </div>
    </div>
  );
}

function fmtDt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${formatAmPmTime(d)}`;
}

export function ReservationEditAcceptedCard({
  sentByMe,
}: {
  sentByMe: boolean;
}) {
  return (
    <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle size={18} className="text-emerald-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
            예약 수정 승인
          </span>
          <span className="text-stone-900 text-sm leading-5 mt-0.5">
            {sentByMe
              ? "예약 수정 요청을 승인했습니다."
              : "예약 수정이 승인되었습니다."}
          </span>
        </div>
      </div>
      <p className="pt-3 text-stone-500 text-xs leading-5">
        {sentByMe
          ? "예약 정보가 변경되었습니다."
          : "예약 일정이 변경되었습니다."}
      </p>
    </div>
  );
}

export function ReservationEditRejectedCard({
  sentByMe,
}: {
  sentByMe: boolean;
}) {
  return (
    <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col">
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
          <XCircle size={18} className="text-red-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-red-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
            예약 수정 거절
          </span>
          <span className="text-stone-900 text-sm leading-5 mt-0.5">
            {sentByMe
              ? "예약 수정 요청을 거절했습니다."
              : "예약 수정 요청이 거절되었습니다."}
          </span>
        </div>
      </div>
      <p className="pt-3 text-stone-500 text-xs leading-5">
        기존 예약 일정이 유지됩니다.
      </p>
    </div>
  );
}

function EditDiffRow({
  label,
  original,
  proposed,
}: {
  label: string;
  original: string;
  proposed: string;
}) {
  const changed = original !== proposed;
  return (
    <div>
      <p className="text-[10px] text-stone-400 mb-0.5">{label}</p>
      {changed ? (
        <>
          <p className="text-xs text-stone-400 line-through">{original}</p>
          <p className="text-xs text-stone-900 font-medium">{proposed}</p>
        </>
      ) : (
        <p className="text-xs text-stone-600">{original}</p>
      )}
    </div>
  );
}

export function ReservationEditCard({
  messageId,
  data,
  isProcessed,
  reservationEditAction,
  onConfirm,
  onReject,
}: {
  messageId: string;
  data: ReservationEditPayload;
  isProcessed: boolean;
  reservationEditAction?: ReservationEditActionState;
  onConfirm?: (
    messageId: string,
    reservationId: string,
    proposed: {
      start_datetime: string;
      end_datetime: string;
      memo?: string | null;
    },
  ) => void;
  onReject?: (messageId: string) => void;
}) {
  const isConfirming =
    reservationEditAction?.messageId === messageId &&
    reservationEditAction.type === "confirm";
  const isRejecting =
    reservationEditAction?.messageId === messageId &&
    reservationEditAction.type === "reject";
  const actionLocked = !!reservationEditAction;
  return (
    <div
      className={`w-79.5 p-4 rounded-2xl flex flex-col gap-3 ${
        data.sentByMe
          ? "bg-orange-100 outline-[1.11px] outline-orange-400 outline-offset-[-1.11px]"
          : "bg-white outline-[1.11px] outline-orange-200 outline-offset-[-1.11px]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
          <CalendarRange size={16} className="text-orange-500" />
        </div>
        <div>
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.3px] leading-4 ${
              data.sentByMe ? "text-orange-500" : "text-stone-500"
            }`}
          >
            예약 수정 요청
          </span>
          <p className="text-stone-900 text-sm leading-5 mt-0.5">
            {data.sentByMe
              ? "예약 수정을 요청했습니다."
              : "예약 수정 요청이 도착했어요."}
          </p>
        </div>
      </div>
      <div
        className={`flex flex-col gap-2 px-3 py-2.5 rounded-xl ${
          data.sentByMe ? "bg-orange-200" : "bg-orange-50"
        }`}
      >
        <EditDiffRow
          label="시작 일시"
          original={fmtDt(data.original.start_datetime)}
          proposed={fmtDt(data.proposed.start_datetime)}
        />
        <EditDiffRow
          label="종료 일시"
          original={fmtDt(data.original.end_datetime)}
          proposed={fmtDt(data.proposed.end_datetime)}
        />
        {(data.original.memo || data.proposed.memo) && (
          <EditDiffRow
            label="메모"
            original={data.original.memo || "(없음)"}
            proposed={data.proposed.memo || "(없음)"}
          />
        )}
      </div>
      {isProcessed ? (
        <p className="text-center text-xs text-stone-400">처리 완료</p>
      ) : data.sentByMe ? (
        <p className="text-center text-xs text-stone-400">
          상대방의 확인을 기다리고 있습니다
        </p>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onReject?.(messageId)}
            disabled={actionLocked}
            className="flex-1 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRejecting ? "처리 중..." : "거절"}
          </button>
          <button
            onClick={() =>
              onConfirm?.(messageId, data.reservationId, data.proposed)
            }
            disabled={actionLocked}
            className="flex-1 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfirming ? "처리 중..." : "확인"}
          </button>
        </div>
      )}
    </div>
  );
}
