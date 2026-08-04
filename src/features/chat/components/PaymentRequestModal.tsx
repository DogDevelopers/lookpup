"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/hooks/useMounted";
import { CreditCard, X } from "lucide-react";

type RequestType = "extra" | "base";

const REQUEST_TYPES: { value: RequestType; label: string; sub: string }[] = [
  { value: "base", label: "결제 요청", sub: "예약 연장 등" },
  { value: "extra", label: "추가금 요청", sub: "추가 서비스 발생 시" },
];

interface PaymentRequestModalProps {
  open: boolean;
  onClose: () => void;
  paymentAmount?: number;
  isAlreadyPaid?: boolean;
  onSubmit: (data: { type: "base" | "extra"; amount: number; reason: string }) => Promise<void> | void;
}

export function PaymentRequestModal({
  open,
  onClose,
  paymentAmount,
  isAlreadyPaid = false,
  onSubmit,
}: PaymentRequestModalProps) {
  const mounted = useMounted();
  const [requestType, setRequestType] = useState<RequestType>("base");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevIsAlreadyPaid, setPrevIsAlreadyPaid] = useState(isAlreadyPaid);
  if (open !== prevOpen || isAlreadyPaid !== prevIsAlreadyPaid) {
    setPrevOpen(open);
    setPrevIsAlreadyPaid(isAlreadyPaid);
    if (open) {
      setRequestType(isAlreadyPaid ? "extra" : "base");
    } else {
      setAmount("");
      setReason("");
      setSubmitError(null);
      setSubmitting(false);
    }
  }

  if (!open || !mounted) return null;

  const isBaseType = requestType === "base";
  const amountNum = Number(amount.replace(/,/g, ""));
  const typedAmount = amount && !isNaN(amountNum) && amountNum > 0 ? amountNum : null;
  // 금액 미정(협의 가능) 예약이면 시터가 합의 금액을 직접 입력한다
  const hasFixedAmount = !!paymentAmount && paymentAmount > 0;
  const amountLocked = isBaseType && hasFixedAmount;
  const total = amountLocked ? paymentAmount : typedAmount;
  const displayAmount = amountLocked ? paymentAmount.toLocaleString("ko-KR") : amount;
  // 서버(sendPaymentRequestMessage)의 협의 금액 범위와 맞춘다
  const amountOutOfRange = !amountLocked && total !== null && (total < 1000 || total > 500000);

  function handleAmountChange(value: string) {
    const digits = value.replace(/[^0-9]/g, "");
    setAmount(digits ? Number(digits).toLocaleString("ko-KR") : "");
  }

  async function handleSubmit() {
    if (!total || (requestType === "extra" && !reason.trim()) || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit({ type: requestType, amount: total, reason });
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-[calc(100%-32px)] max-w-130 bg-white rounded-[20px] shadow-[0px_20px_60px_0px_rgba(249,115,22,0.30)] flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-orange-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
              <CreditCard size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[#281A0E] text-lg font-bold leading-[22.5px]">결제 요청</p>
              <p className="text-gray-500 text-xs mt-0.5">보호자에게 결제 또는 추가 비용을 요청합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <div className="bg-amber-50 rounded-xl px-4 py-3 text-amber-700 text-xs leading-relaxed">
            결제가 완료되어야 서비스를 시작할 수 있습니다.
            <br />
            결제 비용이 변동되거나 서비스 중 추가 비용이 발생하면 추가금 요청을 보내주세요.
            <br />
            결제가 끝나면 채팅창에서 <span className="font-semibold">서비스 시작</span>을 꼭 눌러주세요.
          </div>

          <div>
            <p className="text-[#281A0E] text-sm font-semibold mb-3">요청 유형</p>
            <div className="flex gap-3">
              {REQUEST_TYPES.map(({ value, label, sub }) => {
                const selected = requestType === value;
                const blocked = isAlreadyPaid ? value === "base" : value === "extra";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => !blocked && setRequestType(value)}
                    disabled={blocked}
                    className={`flex-1 p-4 rounded-xl flex items-start gap-3 text-left transition-colors ${
                      blocked
                        ? "bg-gray-50 outline-[1.11px] outline-gray-200 opacity-40 cursor-not-allowed"
                        : selected
                          ? "bg-orange-100 outline-[1.11px] outline-orange-500"
                          : "bg-white outline-[1.11px] outline-orange-200 hover:bg-orange-50"
                    }`}
                  >
                    <div
                      className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center outline-[1.11px] outline-offset-[-1.11px] transition-colors"
                      style={{ outlineColor: selected && !blocked ? "#f97316" : "#D1D5DB" }}
                    >
                      {selected && !blocked && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold leading-5 ${selected && !blocked ? "text-orange-500" : "text-[#281A0E]"}`}
                      >
                        {label}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">{sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[#281A0E] text-sm font-semibold mb-2">
              요청 금액<span className="text-red-500">*</span>
            </p>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={displayAmount}
                onChange={(e) => !amountLocked && handleAmountChange(e.target.value)}
                readOnly={amountLocked}
                placeholder="20,000"
                className={`w-full h-13.5 pl-4 pr-10 rounded-xl outline outline-orange-200 outline-offset-[-1.11px] text-[15px] text-[#281A0E] placeholder-[rgba(40,26,14,0.50)] transition-colors ${amountLocked ? "bg-gray-50 cursor-default" : "focus:outline-orange-500"}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">원</span>
            </div>
            <p className="text-[#9CA3AF] text-xs mt-1.5">
              {amountLocked
                ? "예약 시 확정된 금액입니다"
                : isBaseType
                  ? "금액 미정 예약입니다. 보호자와 합의한 금액을 입력해주세요 (1,000원 ~ 500,000원)"
                  : "0원보다 큰 금액을 입력해주세요"}
            </p>
          </div>

          {requestType === "extra" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#281A0E] text-sm font-semibold">
                  요청 사유<span className="text-red-500">*</span>
                </p>
                <span className="text-[#9CA3AF] text-xs">{reason.length} / 300</span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 300))}
                placeholder={
                  "추가 비용이 발생한 이유를 작성해주세요.\n예) 산책 시간 연장 30분\n예) 추가 목욕 서비스 제공"
                }
                rows={4}
                className="w-full px-4 py-3.5 rounded-xl outline outline-orange-200 outline-offset-[-1.11px] text-[15px] text-[#281A0E] placeholder-[rgba(40,26,14,0.50)] resize-none focus:outline-orange-500 transition-colors leading-relaxed"
              />
            </div>
          )}

          <div className="bg-orange-50 rounded-2xl border border-orange-200 px-5 py-5 flex items-center justify-between">
            <span className="text-orange-900 text-sm font-semibold">총 요청 금액</span>
            <span className="text-orange-500 text-2xl font-bold">
              {total ? total.toLocaleString("ko-KR") + "원" : "—"}
            </span>
          </div>

          {isBaseType && isAlreadyPaid && (
            <p className="text-amber-600 text-sm text-center bg-amber-50 rounded-xl px-4 py-3">
              이미 결제된 예약입니다. 추가 비용은 추가금 요청을 이용해주세요.
            </p>
          )}
          {!isBaseType && !isAlreadyPaid && (
            <p className="text-amber-600 text-sm text-center bg-amber-50 rounded-xl px-4 py-3">
              기본 결제가 완료된 후 추가금 요청이 가능합니다.
            </p>
          )}

          {amountOutOfRange && (
            <p className="text-red-500 text-sm text-center">
              금액은 1,000원 이상 500,000원 이하로 입력해주세요.
            </p>
          )}

          {submitError && <p className="text-red-500 text-sm text-center">{submitError}</p>}
        </div>

        <div className="px-6 pt-4 pb-6 border-t border-orange-200 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-13 rounded-xl border border-orange-200 text-orange-500 text-[15px] font-semibold hover:bg-orange-50 transition-colors disabled:opacity-40"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !total ||
              amountOutOfRange ||
              (requestType === "extra" && !reason.trim()) ||
              (isBaseType && isAlreadyPaid) ||
              submitting
            }
            className="flex-1 h-13 rounded-xl bg-orange-500 flex items-center justify-center gap-2 text-white text-[15px] font-semibold hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            <CreditCard size={17} className="text-white" />
            {submitting ? "처리 중..." : "결제 요청 보내기"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
