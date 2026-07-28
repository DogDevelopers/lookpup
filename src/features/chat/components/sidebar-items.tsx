"use client";

import { memo } from "react";
import { Star, Trash2, ChevronDown } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { canLeaveDirectRoom, canLeaveReservationRequest } from "@/features/chat/utils";
import type { ChatRoom, Applicant, ReservationRequest, Badge } from "@/features/chat/types";

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="w-6 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0">
      {count}
    </span>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-1 text-sm text-stone-400">
      <Star size={12} className="text-amber-400 fill-amber-400" />
      {rating.toFixed(1)}
    </span>
  );
}

type ChatRoomItemProps = {
  room: ChatRoom;
  isSelected: boolean;
  editMode: boolean;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  priority?: boolean;
};

function ChatRoomItemImpl({
  room,
  isSelected,
  editMode,
  onDelete,
  onClick,
  priority = false,
}: ChatRoomItemProps) {
  return (
    <div
      onClick={() => {
        if (!editMode) onClick(room.id);
      }}
      className={`flex items-start gap-4 p-5 border-b border-orange-100 transition-colors ${
        !editMode ? "cursor-pointer hover:bg-orange-50" : ""
      } ${isSelected && !editMode ? "bg-orange-50" : ""}`}
    >
      {editMode && canLeaveDirectRoom(room) && (
        <button
          onClick={() => onDelete(room.id)}
          className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0 mt-4"
        >
          <Trash2 size={12} className="text-white" />
        </button>
      )}
      <div className="relative shrink-0">
        <Avatar
          initial={room.initial}
          src={room.profileImage}
          size="lg"
          priority={priority}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-stone-900 text-base font-semibold">
            {room.name}
          </span>
          {!editMode && <UnreadBadge count={room.unread} />}
        </div>
        {room.sub && (
          <span className="inline-block max-w-full truncate text-xs font-medium px-2 py-0.5 my-1 rounded-full bg-orange-100 text-orange-600">
            {room.sub}
          </span>
        )}
        <p className="text-stone-500 text-sm leading-5 py-1 truncate">
          {room.lastMessage}
        </p>
        <span className="text-stone-500 text-xs">{room.time}</span>
      </div>
    </div>
  );
}

export const ChatRoomItem = memo(ChatRoomItemImpl);

type ApplicantCardProps = {
  applicant: Applicant;
  badge: Badge | null;
  isRejected: boolean;
  isConfirmed: boolean;
  isSelected: boolean;
  isOwner: boolean;
  confirmedId: string | null;
  editMode: boolean;
  onDelete: (id: string) => void;
  onReject: (id: string) => void;
  onConfirm: (id: string) => void;
  onSelect: (id: string) => void;
  onAvatarClick?: (id: string) => void;
};

function ApplicantCardImpl({
  applicant,
  badge,
  isRejected,
  isConfirmed,
  isSelected,
  isOwner,
  confirmedId,
  editMode,
  onDelete,
  onReject,
  onConfirm,
  onSelect,
  onAvatarClick,
}: ApplicantCardProps) {
  return (
    <div
      onClick={() => {
        if (!editMode) onSelect(applicant.id);
      }}
      className={`flex items-center border-b border-orange-100 transition-colors ${
        !editMode ? "cursor-pointer" : ""
      } ${isSelected && !editMode ? "bg-orange-50" : "hover:bg-stone-50"} ${isRejected ? "opacity-50" : ""}`}
    >
      {editMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(applicant.id);
          }}
          className="ml-5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0"
        >
          <Trash2 size={12} className="text-white" />
        </button>
      )}
      <div className="px-5 py-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={(e) => {
              if (!editMode && onAvatarClick) {
                e.stopPropagation();
                onAvatarClick(applicant.id);
              }
            }}
            className="shrink-0"
          >
            <Avatar
              initial={applicant.initial}
              src={applicant.profileImage}
              size="md"
            />
          </button>
          <span className="text-base font-semibold text-stone-900 flex-1 truncate">
            {applicant.name}
          </span>
          {badge && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
          <UnreadBadge count={applicant.unread} />
        </div>
        <p className="text-sm text-stone-400 truncate mb-1.5">
          &ldquo;{applicant.preview}&rdquo;
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-stone-400">{applicant.time}</span>
          <RatingDisplay rating={applicant.rating} />
        </div>
        {isRejected ? (
          <p className="text-xs text-stone-400">거절한 지원자</p>
        ) : isConfirmed ? (
          <p className="text-xs text-orange-500 font-medium">
            선택 확정된 지원자
          </p>
        ) : isOwner && !editMode ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject(applicant.id);
              }}
              disabled={confirmedId !== null}
              className="flex-1 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              거절
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirm(applicant.id);
              }}
              disabled={confirmedId !== null}
              className="flex-1 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-default transition-colors font-medium"
            >
              선택 확정
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const ApplicantCard = memo(ApplicantCardImpl);

type Post = {
  id: string;
  title: string;
  status: string;
};

type ApplicantPostGroupProps = {
  post: Post;
  applicants: Applicant[];
  isCollapsed: boolean;
  isOwner: boolean;
  selectedApplicantId: string | null;
  rejectedIds: Set<string>;
  confirmedId: string | null;
  editMode: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onReject: (id: string) => void;
  onConfirm: (id: string) => void;
  onSelect: (id: string) => void;
  onAvatarClick?: (id: string) => void;
  getApplicantBadge: (id: string) => Badge | null;
};

function ApplicantPostGroupImpl({
  post,
  applicants,
  isCollapsed,
  isOwner,
  selectedApplicantId,
  rejectedIds,
  confirmedId,
  editMode,
  onToggle,
  onDelete,
  onReject,
  onConfirm,
  onSelect,
  onAvatarClick,
  getApplicantBadge,
}: ApplicantPostGroupProps) {
  if (applicants.length === 0) return null;

  return (
    <div className="rounded-2xl border border-orange-100 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className={`w-full px-5 py-3 bg-orange-50 flex items-center justify-between hover:bg-orange-100 transition-colors shrink-0 sticky top-0 z-10 rounded-t-2xl ${
          isCollapsed ? "rounded-b-2xl" : "border-b border-orange-100"
        }`}
      >
        <div className="text-left flex-1 min-w-0 mr-2">
          <p className="text-sm font-medium text-stone-900 truncate">
            {post.title}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            지원자 {applicants.length}명 · {post.status}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`text-stone-400 shrink-0 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
        />
      </button>
      {!isCollapsed && (
        <div className="[&>*:last-child]:rounded-b-2xl [&>*:last-child]:border-b-0">
          {applicants.map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              badge={getApplicantBadge(applicant.id)}
              isRejected={rejectedIds.has(applicant.id)}
              isConfirmed={confirmedId === applicant.id}
              isSelected={selectedApplicantId === applicant.id}
              isOwner={isOwner}
              confirmedId={confirmedId}
              editMode={editMode}
              onDelete={onDelete}
              onReject={onReject}
              onConfirm={onConfirm}
              onSelect={onSelect}
              onAvatarClick={onAvatarClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const ApplicantPostGroup = memo(ApplicantPostGroupImpl);

type ReservationRequestCardProps = {
  reservationRequest: ReservationRequest;
  isSelected: boolean;
  editMode: boolean;
  isSitter: boolean;
  actioningId: string | null;
  onSelect: (id: string) => void;
  onReject: (id: string) => void;
  onAccept: (id: string) => void;
  onDelete: (id: string) => void;
  onAvatarClick?: (id: string) => void;
};

function ReservationRequestCardImpl({
  reservationRequest: rr,
  isSelected,
  editMode,
  isSitter,
  actioningId,
  onSelect,
  onReject,
  onAccept,
  onDelete,
  onAvatarClick,
}: ReservationRequestCardProps) {
  const isPending = rr.reservationStatus === "pending";
  const isAccepted = rr.reservationStatus === "accepted";
  const isCanceled = rr.reservationStatus === "canceled";
  const isActioning = actioningId === rr.id;

  return (
    <div
      onClick={() => {
        if (!editMode) onSelect(rr.id);
      }}
      className={`flex items-center border-b border-orange-100 transition-colors ${
        !editMode ? "cursor-pointer" : ""
      } ${isSelected && !editMode ? "bg-orange-50" : "hover:bg-stone-50"} ${
        isCanceled ? "opacity-50" : ""
      }`}
    >
      {editMode && canLeaveReservationRequest(rr) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(rr.id);
          }}
          className="ml-5 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0"
        >
          <Trash2 size={12} className="text-white" />
        </button>
      )}
      <div className="px-5 py-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={(e) => {
              if (!editMode && onAvatarClick) {
                e.stopPropagation();
                onAvatarClick(rr.id);
              }
            }}
            className="shrink-0"
          >
            <Avatar initial={rr.initial} src={rr.profileImage} size="md" />
          </button>
          <span className="text-base font-semibold text-stone-900 flex-1 truncate">
            {rr.name}
          </span>
          {isPending && !isSitter && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-400 shrink-0">
              대기 중
            </span>
          )}
          {isPending && isSitter && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-500 shrink-0">
              요청 도착
            </span>
          )}
          {isAccepted && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600 shrink-0">
              확정됨
            </span>
          )}
          {isCanceled && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-400 shrink-0">
              거절됨
            </span>
          )}
          <UnreadBadge count={rr.unread} />
        </div>
        {rr.sub && (
          <span className="inline-block max-w-full truncate text-xs font-medium px-2 py-0.5 mb-1.5 rounded-full bg-orange-100 text-orange-600">
            {rr.sub}
          </span>
        )}
        <p className="text-sm text-stone-400 truncate mb-1.5">
          &quot;{rr.preview}&quot;
        </p>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-stone-400">{rr.time}</span>
          <RatingDisplay rating={rr.rating} />
        </div>
        {isPending && isSitter && !editMode && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReject(rr.id);
              }}
              disabled={isActioning}
              className="flex-1 py-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              거절
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAccept(rr.id);
              }}
              disabled={isActioning}
              className="flex-1 py-1.5 text-xs text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-default transition-colors font-medium"
            >
              수락
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const ReservationRequestCard = memo(ReservationRequestCardImpl);
