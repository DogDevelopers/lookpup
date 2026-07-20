"use client";

import Image from "next/image";
import { CheckCircle, PlayCircle } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { formatServiceDate } from "@/features/chat/utils";
import type { CostItem, ServiceCompleteData } from "@/features/chat/types";

type PaymentRequestCardProps = {
  amount: number;
  reason: string;
  deadline: string;
  paid: boolean;
  onPay?: () => void;
  isPaying: boolean;
  otherInitial: string;
  otherProfileImage?: string | null;
  onPostClick?: () => void;
  costItems?: CostItem[];
  isExtra?: boolean;
};

export function PaymentRequestCard({
  amount,
  reason,
  deadline,
  paid,
  onPay,
  isPaying,
  otherInitial,
  otherProfileImage,
  onPostClick,
  costItems,
  isExtra,
}: PaymentRequestCardProps) {
  return (
    <div className="flex items-start gap-3">
      <Avatar initial={otherInitial} src={otherProfileImage} size="sm" />
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col gap-3">
        <div className="flex flex-col">
          <span className="text-stone-500 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
            {isExtra ? "추가금 결제 요청" : "결제 요청"}
          </span>
          <span className="text-stone-900 text-sm leading-5 mt-0.5">
            {isExtra
              ? "추가금 결제 요청이 도착했어요."
              : "결제 요청이 도착했어요."}
          </span>
          <span className="text-stone-500 text-xs mt-1 leading-[19.5px]">
            완료될 때까지 봐주개가 결제 금액을 안전하게 보관해요.
          </span>
        </div>

        {onPostClick && (
          <button
            type="button"
            onClick={onPostClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-orange-100 rounded-xl text-left transition-colors hover:bg-orange-200"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-200 shrink-0 overflow-hidden flex items-center justify-center">
              {otherProfileImage ? (
                <Image
                  src={otherProfileImage}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-sm font-semibold text-orange-500">
                  {otherInitial}
                </span>
              )}
            </div>
            <span className="text-stone-700 text-sm leading-5 truncate flex-1">
              {reason}
            </span>
          </button>
        )}

        {costItems && costItems.length > 0 && (
          <div className="flex flex-col gap-1 px-1">
            <span className="text-stone-500 text-[10px] font-semibold uppercase tracking-[0.3px]">
              비용 상세 내역
            </span>
            <div className="flex flex-col gap-1 mt-0.5">
              {costItems.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-700 text-xs font-medium">
                      {item.name}
                    </span>
                    <span className="text-orange-500 text-xs font-medium">
                      {Number(item.amount.replace(/,/g, "")).toLocaleString(
                        "ko-KR",
                      )}
                      원
                    </span>
                  </div>
                  {item.description && (
                    <span className="text-stone-400 text-[10px] leading-4">
                      {item.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-orange-100 mt-1" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-xs">요청 금액</span>
            <span className="text-orange-500 text-xs">
              {amount.toLocaleString("ko-KR")} 원
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-xs">결제 기한</span>
            <span className="text-stone-700 text-xs">{deadline}</span>
          </div>
        </div>

        {paid ? (
          <button
            disabled
            className="w-full h-10 rounded-xl bg-orange-50 outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] text-orange-400 text-sm cursor-default"
          >
            완료되었어요
          </button>
        ) : onPay ? (
          <button
            type="button"
            onClick={onPay}
            disabled={isPaying}
            className="w-full h-10 rounded-xl outline-[1.11px] outline-orange-500 outline-offset-[-1.11px] text-orange-500 text-sm hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            {isPaying ? "결제 중..." : "결제하기"}
          </button>
        ) : amount <= 0 ? (
          <button
            disabled
            className="w-full h-10 rounded-xl bg-stone-50 outline-[1.11px] outline-stone-200 outline-offset-[-1.11px] text-stone-400 text-sm cursor-default"
          >
            결제할 수 없어요
          </button>
        ) : (
          <button
            disabled
            className="w-full h-10 rounded-xl bg-stone-50 outline-[1.11px] outline-stone-200 outline-offset-[-1.11px] text-stone-400 text-sm cursor-default"
          >
            새 결제 요청이 전송되었어요
          </button>
        )}
      </div>
    </div>
  );
}

type SitterPaymentRequestCardProps = {
  amount: number;
  reason: string;
  otherInitial: string;
  otherProfileImage?: string | null;
  onPostClick?: () => void;
  costItems?: CostItem[];
  isExtra?: boolean;
};

export function SitterPaymentRequestCard({
  amount,
  reason,
  otherInitial,
  otherProfileImage,
  onPostClick,
  costItems,
  isExtra,
}: SitterPaymentRequestCardProps) {
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-orange-100 rounded-2xl outline-[1.11px] outline-orange-400 outline-offset-[-1.11px] flex flex-col">
        <span className="text-orange-500 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
          {isExtra ? "추가금 결제 요청" : "결제 요청"}
        </span>
        <span className="text-stone-900 text-sm leading-5 mt-0.5">
          {isExtra ? "추가금 결제가 요청되었습니다." : "결제가 요청되었습니다."}
        </span>
        {onPostClick && (
          <button
            type="button"
            onClick={onPostClick}
            className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 bg-orange-200 rounded-xl text-left transition-colors hover:bg-orange-300"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-300 shrink-0 overflow-hidden flex items-center justify-center">
              {otherProfileImage ? (
                <Image
                  src={otherProfileImage}
                  alt=""
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-sm font-semibold text-orange-500">
                  {otherInitial}
                </span>
              )}
            </div>
            <span className="text-stone-700 text-sm leading-5 truncate flex-1">
              {reason}
            </span>
          </button>
        )}

        {costItems && costItems.length > 0 && (
          <div className="mt-3 flex flex-col gap-1 px-1">
            <span className="text-stone-500 text-[10px] font-semibold uppercase tracking-[0.3px]">
              비용 상세 내역
            </span>
            <div className="flex flex-col gap-1 mt-0.5">
              {costItems.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-700 text-xs font-medium">
                      {item.name}
                    </span>
                    <span className="text-orange-500 text-xs font-medium">
                      {Number(item.amount.replace(/,/g, "")).toLocaleString(
                        "ko-KR",
                      )}
                      원
                    </span>
                  </div>
                  {item.description && (
                    <span className="text-stone-400 text-[10px] leading-4">
                      {item.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-orange-300 mt-1" />
          </div>
        )}

        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <span className="text-stone-500 text-xs">요청 금액</span>
            <span className="text-orange-500 text-xs font-medium">
              {amount.toLocaleString("ko-KR")} 원
            </span>
          </div>
        </div>
        <p className="mt-3 text-stone-500 text-xs leading-relaxed">
          보호자가 결제를 완료하면 알림을 드릴게요.
        </p>
      </div>
    </div>
  );
}

type ServiceCompleteCardProps = {
  confirmed: boolean;
  onConfirm: () => void;
  isConfirming: boolean;
  otherInitial: string;
  otherProfileImage?: string | null;
  data?: ServiceCompleteData;
};

export function ServiceCompleteCard({
  confirmed,
  onConfirm,
  isConfirming,
  otherInitial,
  otherProfileImage,
  data,
}: ServiceCompleteCardProps) {
  const hasInfo =
    data?.serviceTitle ||
    data?.petName ||
    data?.startDatetime ||
    data?.totalPrice !== undefined;
  return (
    <div className="flex items-start gap-3">
      <Avatar initial={otherInitial} src={otherProfileImage} size="sm" />
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <div>
            <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              서비스 완료
            </span>
            <p className="text-stone-900 text-sm leading-5 mt-0.5">
              펫시터가 서비스를 완료했어요.
            </p>
          </div>
        </div>
        {hasInfo && (
          <div className="flex flex-col gap-2 px-3 py-2.5 bg-orange-50 rounded-xl">
            {(data?.serviceTitle || data?.petName) && (
              <div className="flex items-center gap-1.5">
                {data?.serviceTitle && (
                  <span className="text-xs text-stone-700 font-medium">
                    {data.serviceTitle}
                  </span>
                )}
                {data?.serviceTitle && data?.petName && (
                  <span className="text-stone-300 text-xs">·</span>
                )}
                {data?.petName && (
                  <span className="text-xs text-stone-500">{data.petName}</span>
                )}
              </div>
            )}
            {data?.startDatetime && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">일정</span>
                <span className="text-stone-700 text-xs">
                  {formatServiceDate(data.startDatetime)}
                  {data.endDatetime
                    ? ` ~ ${formatServiceDate(data.endDatetime)}`
                    : ""}
                </span>
              </div>
            )}
            {data?.totalPrice !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">금액</span>
                <span className="text-orange-500 text-xs font-medium">
                  {data.totalPrice.toLocaleString("ko-KR")}원
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-stone-500 text-xs leading-relaxed">
          서비스가 완료되었다면 확인 버튼을 눌러주세요.
        </p>
        {confirmed ? (
          <button
            disabled
            className="w-full h-10 rounded-xl bg-orange-50 outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] text-orange-400 text-sm cursor-default"
          >
            완료되었어요
          </button>
        ) : (
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="w-full h-10 rounded-xl outline-[1.11px] outline-orange-500 outline-offset-[-1.11px] text-orange-500 text-sm hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            {isConfirming ? "처리 중..." : "확인"}
          </button>
        )}
      </div>
    </div>
  );
}

export function SitterServiceCompleteCard({
  data,
}: {
  data?: ServiceCompleteData;
}) {
  const hasInfo =
    data?.serviceTitle ||
    data?.petName ||
    data?.startDatetime ||
    data?.totalPrice !== undefined;
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-orange-100 rounded-2xl outline-[1.11px] outline-orange-400 outline-offset-[-1.11px] flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <div>
            <span className="text-orange-500 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              서비스 완료
            </span>
            <p className="text-stone-900 text-sm leading-5 mt-0.5">
              서비스를 완료했습니다.
            </p>
          </div>
        </div>
        {hasInfo && (
          <div className="flex flex-col gap-2 px-3 py-2.5 bg-orange-200 rounded-xl">
            {(data?.serviceTitle || data?.petName) && (
              <div className="flex items-center gap-1.5">
                {data?.serviceTitle && (
                  <span className="text-xs text-stone-700 font-medium">
                    {data.serviceTitle}
                  </span>
                )}
                {data?.serviceTitle && data?.petName && (
                  <span className="text-orange-300 text-xs">·</span>
                )}
                {data?.petName && (
                  <span className="text-xs text-stone-500">{data.petName}</span>
                )}
              </div>
            )}
            {data?.startDatetime && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">일정</span>
                <span className="text-stone-700 text-xs">
                  {formatServiceDate(data.startDatetime)}
                  {data.endDatetime
                    ? ` ~ ${formatServiceDate(data.endDatetime)}`
                    : ""}
                </span>
              </div>
            )}
            {data?.totalPrice !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">금액</span>
                <span className="text-orange-500 text-xs font-medium">
                  {data.totalPrice.toLocaleString("ko-KR")}원
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-stone-500 text-xs leading-relaxed">
          보호자의 확인 후 서비스가 완료됩니다.
        </p>
      </div>
    </div>
  );
}

type ServiceCompletedCardProps = {
  sentByMe: boolean;
  senderInitial: string;
  senderProfileImage?: string | null;
  data?: ServiceCompleteData;
  canWriteReview?: boolean;
  onWriteReview?: () => void;
  onLeaveChat?: () => void;
};

export function ServiceCompletedCard({
  sentByMe,
  senderInitial,
  senderProfileImage,
  data,
  canWriteReview = false,
  onWriteReview,
  onLeaveChat,
}: ServiceCompletedCardProps) {
  const hasInfo =
    data?.serviceTitle ||
    data?.petName ||
    data?.startDatetime ||
    data?.totalPrice !== undefined;

  const inner = (
    <div
      className={`w-79.5 p-4 rounded-2xl flex flex-col gap-3 ${
        sentByMe
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
              sentByMe ? "text-orange-500" : "text-emerald-800"
            }`}
          >
            서비스 완료
          </span>
          <p className="text-stone-900 text-sm leading-5 mt-0.5">
            {sentByMe
              ? "서비스 완료를 확인했어요."
              : "보호자가 서비스 완료를 확인했어요."}
          </p>
        </div>
      </div>
      {hasInfo && (
        <div
          className={`flex flex-col gap-2 px-3 py-2.5 rounded-xl ${
            sentByMe ? "bg-orange-200" : "bg-orange-50"
          }`}
        >
          {(data?.serviceTitle || data?.petName) && (
            <div className="flex items-center gap-1.5">
              {data?.serviceTitle && (
                <span className="text-xs text-stone-700 font-medium">
                  {data.serviceTitle}
                </span>
              )}
              {data?.serviceTitle && data?.petName && (
                <span className="text-stone-300 text-xs">·</span>
              )}
              {data?.petName && (
                <span className="text-xs text-stone-500">{data.petName}</span>
              )}
            </div>
          )}
          {data?.startDatetime && (
            <div className="flex items-center gap-2">
              <span className="text-stone-500 text-xs shrink-0">일정</span>
              <span className="text-stone-700 text-xs">
                {formatServiceDate(data.startDatetime)}
                {data.endDatetime
                  ? ` ~ ${formatServiceDate(data.endDatetime)}`
                  : ""}
              </span>
            </div>
          )}
          {data?.totalPrice !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-stone-500 text-xs shrink-0">금액</span>
              <span className="text-orange-500 text-xs font-medium">
                {data.totalPrice.toLocaleString("ko-KR")}원
              </span>
            </div>
          )}
        </div>
      )}
      <p className="text-stone-500 text-xs leading-relaxed">
        {sentByMe
          ? "펫시터에게 완료 확인 소식이 전달되었어요."
          : "정산 및 리뷰 작성이 가능해요."}
      </p>
      <div className="flex flex-col gap-2">
        {canWriteReview && (
          <button
            type="button"
            onClick={onWriteReview}
            className="w-full h-10 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            후기 작성하기
          </button>
        )}
        <button
          type="button"
          onClick={onLeaveChat}
          className="w-full h-10 rounded-xl outline-[1.11px] outline-orange-500 outline-offset-[-1.11px] text-orange-500 text-sm hover:bg-orange-50 transition-colors"
        >
          채팅방 나가기
        </button>
      </div>
    </div>
  );

  if (sentByMe) {
    return <div className="flex justify-end">{inner}</div>;
  }
  return (
    <div className="flex items-start gap-3">
      <Avatar initial={senderInitial} src={senderProfileImage} size="sm" />
      {inner}
    </div>
  );
}

type ServiceStartCardProps = {
  otherInitial: string;
  otherProfileImage?: string | null;
  data?: ServiceCompleteData;
};

export function ServiceStartCard({
  otherInitial,
  otherProfileImage,
  data,
}: ServiceStartCardProps) {
  const hasInfo =
    data?.serviceTitle ||
    data?.petName ||
    data?.startDatetime ||
    data?.totalPrice !== undefined;
  return (
    <div className="flex items-start gap-3">
      <Avatar initial={otherInitial} src={otherProfileImage} size="sm" />
      <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
            <PlayCircle size={18} className="text-orange-500" />
          </div>
          <div>
            <span className="text-orange-600 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              서비스 시작
            </span>
            <p className="text-stone-900 text-sm leading-5 mt-0.5">
              서비스를 시작했습니다.
            </p>
          </div>
        </div>
        {hasInfo && (
          <div className="flex flex-col gap-2 px-3 py-2.5 bg-orange-50 rounded-xl">
            {(data?.serviceTitle || data?.petName) && (
              <div className="flex items-center gap-1.5">
                {data?.serviceTitle && (
                  <span className="text-xs text-stone-700 font-medium">
                    {data.serviceTitle}
                  </span>
                )}
                {data?.serviceTitle && data?.petName && (
                  <span className="text-stone-300 text-xs">·</span>
                )}
                {data?.petName && (
                  <span className="text-xs text-stone-500">{data.petName}</span>
                )}
              </div>
            )}
            {data?.startDatetime && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">일정</span>
                <span className="text-stone-700 text-xs">
                  {formatServiceDate(data.startDatetime)}
                  {data.endDatetime
                    ? ` ~ ${formatServiceDate(data.endDatetime)}`
                    : ""}
                </span>
              </div>
            )}
            {data?.totalPrice !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">금액</span>
                <span className="text-orange-500 text-xs font-medium">
                  {data.totalPrice.toLocaleString("ko-KR")}원
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SitterServiceStartCard({
  data,
}: {
  data?: ServiceCompleteData;
}) {
  const hasInfo =
    data?.serviceTitle ||
    data?.petName ||
    data?.startDatetime ||
    data?.totalPrice !== undefined;
  return (
    <div className="flex justify-end">
      <div className="w-79.5 p-4 bg-orange-100 rounded-2xl outline-[1.11px] outline-orange-400 outline-offset-[-1.11px] flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-orange-200 rounded-full flex items-center justify-center shrink-0">
            <PlayCircle size={18} className="text-orange-500" />
          </div>
          <div>
            <span className="text-orange-500 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
              서비스 시작
            </span>
            <p className="text-stone-900 text-sm leading-5 mt-0.5">
              서비스를 시작했습니다.
            </p>
          </div>
        </div>
        {hasInfo && (
          <div className="flex flex-col gap-2 px-3 py-2.5 bg-orange-200 rounded-xl">
            {(data?.serviceTitle || data?.petName) && (
              <div className="flex items-center gap-1.5">
                {data?.serviceTitle && (
                  <span className="text-xs text-stone-700 font-medium">
                    {data.serviceTitle}
                  </span>
                )}
                {data?.serviceTitle && data?.petName && (
                  <span className="text-orange-300 text-xs">·</span>
                )}
                {data?.petName && (
                  <span className="text-xs text-stone-500">{data.petName}</span>
                )}
              </div>
            )}
            {data?.startDatetime && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">일정</span>
                <span className="text-stone-700 text-xs">
                  {formatServiceDate(data.startDatetime)}
                  {data.endDatetime
                    ? ` ~ ${formatServiceDate(data.endDatetime)}`
                    : ""}
                </span>
              </div>
            )}
            {data?.totalPrice !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-xs shrink-0">금액</span>
                <span className="text-orange-500 text-xs font-medium">
                  {data.totalPrice.toLocaleString("ko-KR")}원
                </span>
              </div>
            )}
          </div>
        )}
        <p className="text-stone-500 text-xs leading-relaxed">
          서비스가 시작되었습니다.
        </p>
      </div>
    </div>
  );
}

type PaymentCompleteCardProps = {
  amount: number;
  sentByMe?: boolean;
  otherInitial?: string;
  otherProfileImage?: string | null;
};

export function PaymentCompleteCard({
  amount,
  sentByMe = true,
  otherInitial = "",
  otherProfileImage,
}: PaymentCompleteCardProps) {
  const inner = (
    <div className="w-79.5 p-4 bg-white rounded-2xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
          <CheckCircle size={18} className="text-emerald-500" />
        </div>
        <div>
          <span className="text-emerald-800 text-[10px] font-bold uppercase tracking-[0.3px] leading-4">
            결제 완료
          </span>
          <p className="text-stone-900 text-sm leading-5 mt-0.5">
            결제가 완료되었어요!
          </p>
        </div>
      </div>

      <div className="w-full px-3 py-2 bg-orange-100 rounded-xl outline-[1.11px] outline-orange-200 outline-offset-[-1.11px] flex justify-between items-center">
        <span className="text-stone-500 text-xs">결제 금액</span>
        <span className="text-orange-500 text-sm font-bold">
          {amount.toLocaleString("ko-KR")}원
        </span>
      </div>

      <div className="pt-3 border-t border-orange-200">
        <p className="text-stone-400 text-[11px] leading-[17.6px]">
          봐주개가 결제 금액을 안전하게 보관하고 있어요. 예약 완료 후 펫시터에게
          지급됩니다.
        </p>
      </div>
    </div>
  );

  if (!sentByMe) {
    return (
      <div className="flex items-start gap-3">
        <Avatar initial={otherInitial} src={otherProfileImage} size="sm" />
        {inner}
      </div>
    );
  }
  return <div className="flex justify-end">{inner}</div>;
}
