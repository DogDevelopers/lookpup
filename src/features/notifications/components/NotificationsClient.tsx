"use client";

import Link from "next/link";
import { ChevronLeft, Bell } from "lucide-react";
import LoadingPage from "@/components/common/LoadingPage";
import Footer from "@/components/layout/Footer";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";
import { NotificationItem } from "./NotificationItem";

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const toKST = (d: Date) => new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const kstDate = toKST(new Date(dateStr));
  const kstNow = toKST(new Date());
  return (
    kstDate.getFullYear() === kstNow.getFullYear() &&
    kstDate.getMonth() === kstNow.getMonth() &&
    kstDate.getDate() === kstNow.getDate()
  );
}

export default function NotificationsClient() {
  const { notifications, isLoading, markRead, markAllRead } = useNotifications(50);

  const todayList = notifications.filter((n) => isToday(n.updatedAt ?? n.createdAt));
  const prevList = notifications.filter((n) => !isToday(n.updatedAt ?? n.createdAt));
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <>
    <main className="flex-1 bg-orange-50 min-h-screen">
      <div className="max-w-[720px] mx-auto px-6 pt-12 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl border border-orange-100 flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronLeft size={20} className="text-stone-900" />
            </Link>
            <div>
              <h1 className="text-stone-900 text-2xl font-bold leading-8">알림</h1>
              <p className="text-stone-500 text-sm mt-1">새로운 소식을 확인하세요</p>
            </div>
          </div>
          {hasUnread && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-orange-500 text-sm font-medium hover:text-orange-600 transition-colors"
            >
              모두 읽음 처리
            </button>
          )}
        </div>

        {isLoading && (
          <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
            <LoadingPage className="py-10" />
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
            <div className="py-10 flex flex-col items-center gap-2 text-stone-400">
              <Bell size={28} strokeWidth={1.5} />
              <p className="text-sm">아직 알림이 없어요</p>
            </div>
          </div>
        )}

        {!isLoading && todayList.length > 0 && (
          <div className="mb-6">
            <p className="px-1 text-stone-500 text-xs uppercase tracking-tight mb-3">오늘</p>
            <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
              {todayList.map((n, i) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  type={n.type}
                  title={n.title}
                  content={n.content}
                  time={formatRelativeTime(n.updatedAt ?? n.createdAt)}
                  isRead={n.isRead}
                  linkUrl={n.linkUrl}
                  last={i === todayList.length - 1}
                  onRead={markRead}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && prevList.length > 0 && (
          <div>
            <p className="px-1 text-stone-500 text-xs uppercase tracking-tight mb-3">이전 알림</p>
            <div className="bg-white rounded-2xl border border-orange-100 overflow-hidden">
              {prevList.map((n, i) => (
                <NotificationItem
                  key={n.id}
                  id={n.id}
                  type={n.type}
                  title={n.title}
                  content={n.content}
                  time={formatRelativeTime(n.updatedAt ?? n.createdAt)}
                  isRead={n.isRead}
                  linkUrl={n.linkUrl}
                  last={i === prevList.length - 1}
                  onRead={markRead}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
    <Footer />
    </>
  );
}
