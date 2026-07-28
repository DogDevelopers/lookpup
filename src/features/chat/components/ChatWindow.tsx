"use client";

import { memo, useState } from "react";
import { ChevronLeft, MoreVertical, Plus, Send } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type Message,
  type Badge,
  type Tab,
  type ReservationEditActionState,
} from "@/features/chat/types";
import { ChatWindowHeader } from "./ChatWindowHeader";
import { ChatInput, ChatPlusPanel } from "./ChatInputBar";
import { MessageList } from "./MessageList";

export interface ChatWindowProps {
  isMobile: boolean;

  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  hasSelection: boolean;

  roomName: string;
  roomInitial: string;
  roomProfileImage: string | null;
  headerSub: string;
  headerBadge: Badge;
  activeTab: Tab;
  selectedApplicantPostId: string | undefined;

  messages: Message[];
  mobileScrollRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loadingMore: boolean;
  confirmedEditIds: Set<string>;
  reservationEditAction: ReservationEditActionState;
  confirmedServiceIds: Set<string>;
  reviewedReservationIds: Set<string>;
  payingNow: boolean;
  isPaymentPending: boolean;
  isServiceConfirming: boolean;
  isCurrentUserSitter: boolean;
  isPaymentComplete: boolean;
  hasServiceStarted: boolean;
  hasServiceCompleted: boolean;
  canLeaveChat: boolean;
  canViewProfile: boolean;
  canStartService: boolean;

  input: string;
  sending: boolean;
  sendError: string | null;
  isRejectedApplicant: boolean;
  isRecipientLeft: boolean;
  showApplicantActions: boolean;
  applicationActionError: string | null;
  actioningId: string | null;

  onBack: () => void;
  onGoToProfile: () => void;
  onLeaveChat: () => void;
  onReport: () => void;
  onReportMessage: (messageId: string) => void;
  onNavigateToPost: (postId: string) => void;
  onGoToChat: () => void;

  onSetInput: (v: string) => void;
  onSend: () => void;
  onLoadMore: () => void;

  onPayNow: (data: {
    amount: number;
    reason: string;
    messageId: string;
    extraChargeId?: string;
  }) => void;
  onOpenPaymentModal: () => void;
  onOpenCareRecord: () => void;
  onServiceStart: () => void;
  onServiceComplete: () => void;
  onOpenReservationEdit: () => void;
  onPhotoClick: () => void;
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

  onRejectApplicant: () => void;
  onConfirmApplicant: () => void;
}

function ChatWindowImpl({
  isMobile,
  loading,
  error,
  isEmpty,
  hasSelection,
  roomName,
  roomInitial,
  roomProfileImage,
  headerSub,
  headerBadge,
  activeTab,
  selectedApplicantPostId,
  messages,
  mobileScrollRef,
  messagesEndRef,
  hasMore,
  loadingMore,
  confirmedEditIds,
  reservationEditAction,
  confirmedServiceIds,
  reviewedReservationIds,
  payingNow,
  isPaymentPending,
  isServiceConfirming,
  isCurrentUserSitter,
  isPaymentComplete,
  hasServiceStarted,
  hasServiceCompleted,
  canLeaveChat,
  canViewProfile,
  canStartService,
  input,
  sending,
  sendError,
  isRejectedApplicant,
  isRecipientLeft,
  showApplicantActions,
  applicationActionError,
  actioningId,
  onBack,
  onGoToProfile,
  onLeaveChat,
  onReport,
  onReportMessage,
  onNavigateToPost,
  onGoToChat,
  onSetInput,
  onSend,
  onLoadMore,
  onPayNow,
  onOpenPaymentModal,
  onOpenCareRecord,
  onServiceStart,
  onServiceComplete,
  onOpenReservationEdit,
  onPhotoClick,
  onServiceConfirm,
  onReservationEditConfirm,
  onReservationEditReject,
  onWriteReview,
  onRejectApplicant,
  onConfirmApplicant,
}: ChatWindowProps) {
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const plusPanel = plusMenuOpen && (
    <ChatPlusPanel
      onPaymentRequest={
        isCurrentUserSitter
          ? () => {
              setPlusMenuOpen(false);
              onOpenPaymentModal();
            }
          : undefined
      }
      onSendCareRecord={
        isCurrentUserSitter && hasServiceStarted && !hasServiceCompleted
          ? () => {
              setPlusMenuOpen(false);
              onOpenCareRecord();
            }
          : undefined
      }
      onServiceStart={
        isCurrentUserSitter &&
        isPaymentComplete &&
        !hasServiceStarted &&
        canStartService
          ? () => {
              setPlusMenuOpen(false);
              onServiceStart();
            }
          : undefined
      }
      onServiceComplete={
        isCurrentUserSitter && hasServiceStarted
          ? () => {
              setPlusMenuOpen(false);
              onServiceComplete();
            }
          : undefined
      }
      onReservationEdit={
        activeTab === "one_on_one" && !hasServiceStarted
          ? () => {
              setPlusMenuOpen(false);
              onOpenReservationEdit();
            }
          : undefined
      }
      onSendPhoto={() => {
        setPlusMenuOpen(false);
        onPhotoClick();
      }}
    />
  );

  const messageListEl = (
    <MessageList
      messages={messages}
      senderInitial={roomInitial}
      senderProfileImage={roomProfileImage}
      isCurrentUserSitter={isCurrentUserSitter}
      selectedApplicantPostId={selectedApplicantPostId}
      payingNow={payingNow}
      isPaymentPending={isPaymentPending}
      confirmedServiceIds={confirmedServiceIds}
      reviewedReservationIds={reviewedReservationIds}
      isServiceConfirming={isServiceConfirming}
      confirmedEditIds={confirmedEditIds}
      reservationEditAction={reservationEditAction}
      hasMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
      onPaymentRequest={onPayNow}
      onNavigateToPost={onNavigateToPost}
      onGoToChat={onGoToChat}
      onServiceConfirm={onServiceConfirm}
      onReservationEditConfirm={onReservationEditConfirm}
      onReservationEditReject={onReservationEditReject}
      onWriteReview={onWriteReview}
      onLeaveChat={onLeaveChat}
      onReportMessage={onReportMessage}
    />
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 px-4 bg-white border-b border-orange-100 flex items-center gap-3 shrink-0">
          <button onClick={onBack} className="p-1 -ml-1">
            <ChevronLeft size={24} className="text-stone-900" />
          </button>
          <Avatar initial={roomInitial} src={roomProfileImage} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-stone-900 truncate">
              {roomName}
            </p>
            <p className="text-xs text-stone-400 truncate">{headerSub}</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${headerBadge.className}`}
          >
            {headerBadge.label}
          </span>
          <div className="relative">
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-1"
            >
              <MoreVertical size={20} className="text-stone-500" />
            </button>
            {mobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-orange-100 z-20 overflow-hidden divide-y divide-orange-50">
                  {canViewProfile && (
                    <button
                      onClick={() => {
                        onGoToProfile();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-orange-50 transition-colors"
                    >
                      프로필로 이동하기
                    </button>
                  )}
                  {canLeaveChat && (
                    <button
                      onClick={() => {
                        onLeaveChat();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-orange-50 transition-colors"
                    >
                      채팅 나가기
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onReport();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    신고하기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          ref={mobileScrollRef}
          className="flex-1 min-h-0 overflow-y-auto bg-white"
        >
          <div
            className="px-4 py-4 flex flex-col gap-4"
            onClick={() => {
              if (plusMenuOpen) setPlusMenuOpen(false);
            }}
          >
            {messageListEl}
          </div>
        </div>

        {showApplicantActions && (
          <div className="px-4 py-2.5 bg-white border-t border-orange-100 flex flex-col gap-1 shrink-0">
            {applicationActionError && (
              <p className="text-xs text-red-500 px-1">
                {applicationActionError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onRejectApplicant}
                disabled={!!actioningId}
                className="flex-1 py-2 text-sm text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                거절
              </button>
              <button
                onClick={onConfirmApplicant}
                disabled={!!actioningId}
                className="flex-1 py-2 text-sm text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
              >
                선택 확정
              </button>
            </div>
          </div>
        )}

        {plusPanel}

        {isRejectedApplicant ? (
          <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-center text-xs text-stone-400 shrink-0">
            지원이 거절되어 메시지를 보낼 수 없습니다.
          </div>
        ) : isRecipientLeft ? (
          <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 text-center text-xs text-stone-400 shrink-0">
            상대방이 채팅을 종료하여 메시지를 보낼 수 없습니다.
          </div>
        ) : (
          <>
            {sendError && (
              <p className="px-4 py-1 text-xs text-red-500 bg-red-50 border-t border-red-100 shrink-0">
                {sendError}
              </p>
            )}
            <div className="px-4 py-3 bg-white border-t border-orange-100 flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setPlusMenuOpen((v) => !v)}
                className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-orange-50 transition-colors shrink-0"
              >
                <Plus
                  size={22}
                  className={`text-stone-500 transition-transform duration-200 ${plusMenuOpen ? "rotate-45" : ""}`}
                />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => onSetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) onSend();
                }}
                placeholder="메시지를 입력하세요"
                className="flex-1 h-11 px-4 bg-orange-50 rounded-2xl text-sm text-stone-900 placeholder-stone-900/50 outline-none"
              />
              <button
                onClick={onSend}
                disabled={sending}
                className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-400 text-sm">불러오는 중...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-400 text-sm">{error}</p>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-stone-400 text-sm">
          새로운 채팅이 존재하지 않습니다
        </p>
      </div>
    );
  }
  if (!hasSelection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-base mb-2 text-stone-500">채팅방을 선택해주세요</p>
          <p className="text-sm text-stone-400">
            왼쪽 목록에서 대화를 시작할 상대를 선택하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ChatWindowHeader
        initial={roomInitial}
        src={roomProfileImage}
        name={roomName}
        sub={headerSub}
        badge={headerBadge}
        onGoToProfile={onGoToProfile}
        onLeaveChat={onLeaveChat}
        canLeaveChat={canLeaveChat}
        canViewProfile={canViewProfile}
        onReport={onReport}
      />

      <ScrollArea className="flex-1 min-h-0">
        <div
          className="px-8 py-6 flex flex-col gap-6"
          onClick={() => {
            if (plusMenuOpen) setPlusMenuOpen(false);
          }}
        >
          {messageListEl}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {plusPanel}

      {applicationActionError && (
        <p className="px-8 py-1 text-xs text-red-500 bg-red-50 border-t border-red-100 shrink-0">
          {applicationActionError}
        </p>
      )}

      {isRejectedApplicant ? (
        <div className="px-8 py-4 bg-stone-50 border-t border-stone-200 text-center text-sm text-stone-400 shrink-0">
          지원이 거절되어 메시지를 보낼 수 없습니다.
        </div>
      ) : isRecipientLeft ? (
        <div className="px-8 py-4 bg-stone-50 border-t border-stone-200 text-center text-sm text-stone-400 shrink-0">
          상대방이 채팅을 종료하여 메시지를 보낼 수 없습니다.
        </div>
      ) : (
        <>
          {sendError && (
            <p className="px-8 py-1 text-xs text-red-500 bg-red-50 border-t border-red-100 shrink-0">
              {sendError}
            </p>
          )}
          <ChatInput
            input={input}
            onChange={onSetInput}
            onSend={onSend}
            showPlusButton={true}
            plusOpen={plusMenuOpen}
            onPlusToggle={() => setPlusMenuOpen((v) => !v)}
            disabled={sending}
          />
        </>
      )}
    </div>
  );
}

export const ChatWindow = memo(ChatWindowImpl);
