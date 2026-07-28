"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import SectionCard from "@/components/common/SectionCard";
import Avatar from "@/components/ui/Avatar";
import Footer from "@/components/layout/Footer";
import type { MySitterReservation, ReservationUiStatus } from "@/features/reservations/types";

type TabId = "all" | "pending" | "in-progress" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<ReservationUiStatus, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "요청 대기", bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
  confirmed: { label: "예약 확정", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "in-progress": { label: "진행중", bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  completed: { label: "완료", bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  cancelled: { label: "취소", bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
};

const SERVICE_BADGE_COLOR: Record<string, string> = {
  방문돌봄: "#FFF0E8",
  산책: "#E8F5FF",
  위탁돌봄: "#F0FDF4",
};

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "pending", label: "요청 대기" },
  { id: "in-progress", label: "진행중" },
  { id: "confirmed", label: "예약확정" },
  { id: "completed", label: "완료" },
  { id: "cancelled", label: "취소" },
];

const ITEMS_PER_PAGE = 6;

function WorkCard({ work }: { work: MySitterReservation }) {
  const status = STATUS_CONFIG[work.status];

  return (
    <SectionCard className="overflow-hidden p-0 gap-0">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full text-stone-900"
            style={{ background: SERVICE_BADGE_COLOR[work.serviceType] ?? "#FFF7ED" }}
          >
            {work.serviceType}
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full border"
            style={{ background: status.bg, color: status.text, borderColor: status.border }}
          >
            {status.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">{work.bookingNo}</span>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-start gap-4">
          <Avatar initial={work.ownerName.charAt(0)} src={work.ownerImage} />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-stone-900">{work.ownerName}</span>
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={14} className="text-orange-500 shrink-0" />
                <span>{work.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} className="text-orange-500 shrink-0" />
                <span>{work.time}</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 border border-orange-100 rounded-full text-xs text-stone-900">
                🐾 {work.petName} · {work.petType}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-orange-500">{work.price.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-5 flex gap-2 border-t border-gray-100 pt-4">
        <Link
          href="/chat"
          className="flex-1 h-10 rounded-xl border border-gray-100 text-stone-900 text-sm font-medium hover:border-orange-400 transition-colors flex items-center justify-center gap-1.5"
        >
          <MessageCircle size={15} />
          채팅하기
        </Link>
      </div>
    </SectionCard>
  );
}

export default function WorksHistoryClient({
  works,
  embedded = false,
}: {
  works: MySitterReservation[];
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [page, setPage] = useState(1);

  const filtered = works.filter((w) => activeTab === "all" || w.status === activeTab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const counts: Record<TabId, number> = {
    all: works.length,
    pending: works.filter((w) => w.status === "pending").length,
    "in-progress": works.filter((w) => w.status === "in-progress").length,
    confirmed: works.filter((w) => w.status === "confirmed").length,
    completed: works.filter((w) => w.status === "completed").length,
    cancelled: works.filter((w) => w.status === "cancelled").length,
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-white"}>
      {!embedded && (
        <div className="md:hidden sticky top-16 z-50 bg-white border-b border-gray-100">
          <div className="h-14 px-5 flex items-center gap-3">
            <MobileBackButton />
            <span className="flex-1 font-semibold text-stone-900">작업 관리</span>
          </div>
        </div>
      )}

      <main className={embedded ? "w-full" : "w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 md:pt-12 pb-10 md:pb-20"}>
        {!embedded && (
          <div className="hidden md:flex items-center gap-4 mb-8">
            <DesktopBackButton />
            <div>
              <h2 className="text-2xl font-bold text-stone-900">작업 관리</h2>
              <p className="text-sm text-gray-500 mt-1">보호자로부터 받은 요청과 진행 중인 작업을 확인할 수 있어요</p>
            </div>
          </div>
        )}

        <div className="flex gap-1 overflow-x-auto scrollbar-hide mb-6 bg-gray-50 border border-gray-100 rounded-2xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`flex-1 min-w-fit px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-orange-500 text-white" : "text-gray-500 hover:text-stone-900"
              }`}
            >
              {tab.label}
              {counts[tab.id] > 0 && (
                <span className={`ml-1.5 text-xs ${activeTab === tab.id ? "text-white/80" : "text-gray-400"}`}>
                  {counts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar size={28} className="text-orange-200" />
            </div>
            <p className="font-semibold text-stone-900 mb-1">작업 내역이 없어요</p>
            <p className="text-sm text-gray-500">보호자의 예약 요청이 오면 여기에 표시돼요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {paged.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="페이지네이션" className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="이전 페이지"
              className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gray-500 hover:border-orange-300 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                aria-label={`${p}페이지로 이동`}
                aria-current={page === p ? "page" : undefined}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                  page === p
                    ? "bg-[var(--color-orange-500)] text-white"
                    : "border border-gray-100 text-gray-500 hover:border-orange-300"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="다음 페이지"
              className="w-9 h-9 rounded-xl border border-gray-100 flex items-center justify-center text-gray-500 hover:border-orange-300 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </main>

      {!embedded && <Footer />}
    </div>
  );
}
