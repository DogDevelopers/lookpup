"use client";

import { memo } from "react";
import {
  Send,
  Plus,
  CreditCard,
  ClipboardList,
  Camera,
  CheckCircle,
  PlayCircle,
  CalendarRange,
} from "lucide-react";
import { CHAT_MESSAGE_MAX_LENGTH } from "@/lib/chat-message-prefixes";

type ChatPlusPanelProps = {
  onPaymentRequest?: () => void;
  onSendCareRecord?: () => void;
  onSendPhoto: () => void;
  onServiceStart?: () => void;
  onServiceComplete?: () => void;
  onReservationEdit?: () => void;
};

function ChatPlusPanelImpl({
  onPaymentRequest,
  onSendCareRecord,
  onSendPhoto,
  onServiceStart,
  onServiceComplete,
  onReservationEdit,
}: ChatPlusPanelProps) {
  const actions = [
    onPaymentRequest
      ? { icon: CreditCard, label: "결제 요청", onClick: onPaymentRequest }
      : null,
    onSendCareRecord
      ? {
          icon: ClipboardList,
          label: "돌봄 기록 전송",
          onClick: onSendCareRecord,
        }
      : null,
    onServiceStart
      ? { icon: PlayCircle, label: "서비스 시작", onClick: onServiceStart }
      : null,
    onServiceComplete
      ? { icon: CheckCircle, label: "서비스 완료", onClick: onServiceComplete }
      : null,
    onReservationEdit
      ? { icon: CalendarRange, label: "예약 수정", onClick: onReservationEdit }
      : null,
    { icon: Camera, label: "사진 전송", onClick: onSendPhoto },
  ].filter(Boolean) as {
    icon: typeof CreditCard;
    label: string;
    onClick: () => void;
  }[];

  return (
    <div className="bg-white border-t border-orange-100 px-6 py-5 shrink-0">
      <div className="flex">
        {actions.map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex flex-col items-center gap-2 flex-1"
          >
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center hover:bg-orange-100 transition-colors">
              <Icon size={24} className="text-orange-500" />
            </div>
            <span className="text-xs text-stone-500">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const ChatPlusPanel = memo(ChatPlusPanelImpl);

type ChatInputProps = {
  input: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  showPlusButton: boolean;
  plusOpen?: boolean;
  onPlusToggle?: () => void;
  disabled?: boolean;
};

function ChatInputImpl({
  input,
  onChange,
  onSend,
  showPlusButton,
  plusOpen,
  onPlusToggle,
  disabled,
}: ChatInputProps) {
  return (
    <div className="p-6 bg-white border-t border-orange-100 shrink-0">
      <div className="flex items-center gap-3">
        {showPlusButton && (
          <button
            onClick={onPlusToggle}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-orange-50 transition-colors"
          >
            <Plus
              size={24}
              className={`text-stone-500 transition-transform duration-200 ${plusOpen ? "rotate-45" : ""}`}
            />
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && !e.nativeEvent.isComposing && onSend?.()
          }
          placeholder="메시지를 입력하세요"
          maxLength={CHAT_MESSAGE_MAX_LENGTH}
          className="flex-1 h-14 px-5 py-4 bg-orange-50 rounded-2xl text-base text-stone-900 placeholder-stone-900/50 outline-none"
        />
        <button
          onClick={onSend}
          disabled={disabled}
          className="w-12 h-12 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <Send size={18} className="text-white" />
        </button>
      </div>
    </div>
  );
}

export const ChatInput = memo(ChatInputImpl);
