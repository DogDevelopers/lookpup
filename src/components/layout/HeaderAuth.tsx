"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getNotificationIcon } from "@/lib/notification-icons";
import type { HeaderNotification, HeaderUser } from "./types";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const HOVER_CARD_CLS =
  "bg-white border border-orange-100 rounded-xl ring-0 shadow-[0px_4px_20px_0px_rgba(232,116,42,0.15)]";

interface HeaderAuthProps {
  user: HeaderUser | null;
  isLoading?: boolean;
  unreadCount?: number;
  notifications?: HeaderNotification[];
  onNotificationsOpen?: () => void;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notification: HeaderNotification) => void;
  onLogout?: () => void;
}

export default function HeaderAuth({
  user,
  isLoading = false,
  unreadCount = 0,
  notifications = [],
  onNotificationsOpen,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onLogout,
}: HeaderAuthProps) {
  const [open, setOpen] = useState(false);

  if (isLoading) return <div className="w-24 shrink-0" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/auth/login"
          className="h-9 px-4 inline-flex items-center justify-center rounded-[10px] border border-orange-500 bg-white text-orange-500 text-xs font-normal leading-5 hover:bg-orange-50 transition-colors"
        >
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <HoverCard
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) onNotificationsOpen?.();
        }}
      >
        <HoverCardTrigger
          delay={120}
          closeDelay={150}
          render={
            <button
              type="button"
              aria-label="알림 보기"
              className="relative p-2 rounded-full hover:bg-orange-50 transition-colors"
            >
              <Bell size={20} className="text-stone-500" strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold leading-4">
                  {unreadCount}
                </span>
              )}
            </button>
          }
        />
        <HoverCardContent
          align="end"
          sideOffset={8}
          className={`w-80 p-0 overflow-hidden ${HOVER_CARD_CLS}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100">
            <span className="text-stone-900 text-sm font-semibold">알림</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => onMarkAllNotificationsRead?.()}
                className="text-xs text-orange-500 hover:text-orange-600 transition-colors"
              >
                모두 읽음 처리
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-stone-400">
                <Bell size={24} strokeWidth={1.5} />
                <p className="text-xs">새로운 알림이 없습니다</p>
              </div>
            ) : (
              notifications.map((notif, i) => {
                const { icon, iconBg } = getNotificationIcon(notif.type, 14);
                return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => onNotificationClick?.(notif)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-orange-50/50 transition-colors ${i < notifications.length - 1 ? "border-b border-orange-100" : ""} ${notif.isRead ? "opacity-70" : ""}`}
                >
                  <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs leading-4 truncate ${notif.isRead ? "text-stone-500" : "text-stone-900 font-medium"}`}
                    >
                      {notif.title}
                    </p>
                    <p className="text-xs text-stone-400 leading-4 mt-0.5 truncate">
                      {notif.content}
                    </p>
                    <p className="text-[10px] text-stone-300 mt-1">
                      {relativeTime(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shrink-0 mt-1.5" />
                  )}
                </button>
                );
              })
            )}
          </div>
          <div className="border-t border-orange-100">
            <Link
              href="/notifications"
              className="flex items-center justify-center gap-1 py-3 text-xs text-orange-500 font-medium hover:bg-orange-50 transition-colors"
            >
              전체 알림 보기
              <ChevronRight size={12} strokeWidth={2} />
            </Link>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger
          delay={80}
          closeDelay={100}
          render={
            <button
              type="button"
              aria-label="계정 메뉴 열기"
              className="ml-1 size-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-300 flex items-center justify-center text-white text-sm font-bold leading-5 hover:ring-2 hover:ring-orange-200 transition cursor-pointer"
            >
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt=""
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                user.fullName?.charAt(0) ?? "?"
              )}
            </button>
          }
        />
        <HoverCardContent align="end" sideOffset={8} className={`w-44 p-1 ${HOVER_CARD_CLS}`}>
          <Link
            href="/myprofile"
            className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-stone-900 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <User size={16} className="text-orange-500 shrink-0" strokeWidth={1.8} />
            마이페이지
          </Link>
          <Link
            href="/chat"
            className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-stone-900 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <MessageSquare size={16} className="text-orange-500 shrink-0" strokeWidth={1.8} />
            채팅
          </Link>
          <Link
            href="/myprofile/settings"
            className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-stone-900 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Settings size={16} className="text-orange-500 shrink-0" strokeWidth={1.8} />
            설정
          </Link>
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-stone-900 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <ShieldCheck size={16} className="text-orange-500 shrink-0" strokeWidth={1.8} />
              관리자 페이지
            </Link>
          )}
          <div className="mx-2 my-1 h-px bg-orange-100" />
          <button
            type="button"
            onClick={() => onLogout?.()}
            className="w-full px-3 py-2.5 flex items-center gap-3 text-sm text-stone-500 rounded-lg hover:bg-orange-50 transition-colors"
          >
            <LogOut size={16} className="text-stone-400 shrink-0" strokeWidth={1.8} />
            로그아웃
          </button>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
