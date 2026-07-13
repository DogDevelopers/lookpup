"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DesktopBackButton } from "@/components/common/BackButton";
import SectionCard from "@/components/common/SectionCard";
import Avatar from "@/components/ui/Avatar";
import { CustomModal } from "@/components/common/CustomModal";
import { cancelReservation, type MyReservation, type ReservationUiStatus } from "@/features/petsitters/actions";

type TabId = "all" | "in-progress" | "confirmed" | "completed" | "cancelled";

const STATUS_CONFIG: Record<ReservationUiStatus, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "예약 요청", bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
  confirmed: { label: "예약 확정", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "in-progress": { label: "진행중", bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  completed: { label: "완료", bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  cancelled: { label: "취소", bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
};

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "in-progress", label: "진행중" },
  { id: "confirmed", label: "예약확정" },
  { id: "completed", label: "완료" },
  { id: "cancelled", label: "취소" },
];

const ITEMS_PER_PAGE = 6;

function BookingCard({
  booking,
  onCancel,
}: {
  booking: MyReservation;
  onCancel: (id: string) => void;
}) {
  const status = STATUS_CONFIG[booking.status];
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <SectionCard className="overflow-hidden p-0 gap-0">
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-orange-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-orange-50 text-stone-900">
            {booking.serviceType}
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full border"
            style={{ background: status.bg, color: status.text, borderColor: status.border }}
          >
            {status.label}
          </span>
        </div>
        <span className="text-xs text-gray-500">{booking.bookingNo}</span>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-start gap-4">
          <Avatar initial={booking.sitterName.charAt(0)} src={booking.sitterImage} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-stone-900">{booking.sitterName}</span>
              {booking.sitterRating > 0 && (
                <div className="flex items-center gap-0.5">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-xs text-gray-500">{booking.sitterRating}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={14} className="text-orange-500 shrink-0" />
                <span>{booking.date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={14} className="text-orange-500 shrink-0" />
                <span>{booking.time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={14} className="text-orange-500 shrink-0" />
                <span>{booking.location}</span>
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 border border-orange-100 rounded-full text-xs text-stone-900">
                🐾 {booking.petName} · {booking.petType}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-orange-500">{booking.price.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-5 flex gap-2 border-t border-orange-100 pt-4">
        <Link
          href={`/myprofile/booking-history/${booking.id}`}
          className="flex-1 h-10 rounded-xl border border-orange-100 text-stone-900 text-sm font-medium hover:border-orange-400 transition-colors flex items-center justify-center"
        >
          상세보기
        </Link>
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(booking.id)}
            className="flex-1 h-10 rounded-xl border border-orange-100 text-gray-500 text-sm font-medium hover:border-red-300 hover:text-red-500 transition-colors"
          >
            예약 취소
          </button>
        )}
        {booking.status === "completed" && (
          <button
            type="button"
            disabled
            className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
          >
            {booking.reviewWritten ? "후기 작성 완료" : "후기 작성 (준비 중)"}
          </button>
        )}
      </div>
    </SectionCard>
  );
}

export default function BookingHistoryClient({ bookings: initialBookings }: { bookings: MyReservation[] }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [page, setPage] = useState(1);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = bookings.filter((b) => activeTab === "all" || b.status === activeTab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const counts: Record<TabId, number> = {
    all: bookings.length,
    "in-progress": bookings.filter((b) => b.status === "in-progress").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const handleCancelConfirm = () => {
    if (!cancelingId) return;
    startTransition(async () => {
      const result = await cancelReservation(cancelingId);
      if (!result.ok) {
        toast.error(result.error);
        setCancelingId(null);
        return;
      }
      setBookings((prev) =>
        prev.map((b) => (b.id === cancelingId ? { ...b, status: "cancelled" as const } : b)),
      );
      setCancelingId(null);
      toast.success("예약이 취소되었습니다.");
    });
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-10 pt-6 pb-16">
      <div className="flex items-center gap-4 mb-8">
        <DesktopBackButton />
        <div>
          <h2 className="text-2xl font-bold text-stone-900">예약 내역</h2>
          <p className="text-sm text-gray-500 mt-1">진행 중인 예약과 지난 예약을 확인할 수 있어요</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-6 bg-white border border-orange-100 rounded-2xl p-1">
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
          <div className="w-16 h-16 bg-white border border-orange-100 rounded-full flex items-center justify-center mb-4">
            <Calendar size={28} className="text-orange-200" />
          </div>
          <p className="font-semibold text-stone-900 mb-1">예약 내역이 없어요</p>
          <p className="text-sm text-gray-500">새로운 예약을 만들어보세요</p>
          <Link
            href="/petsitters"
            className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            펫시터 찾기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {paged.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onCancel={setCancelingId} />
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
            className="w-9 h-9 rounded-xl border border-orange-100 flex items-center justify-center text-gray-500 hover:border-orange-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={page === p ? "page" : undefined}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                page === p
                  ? "bg-orange-500 text-white"
                  : "border border-orange-100 text-gray-500 hover:border-orange-300"
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
            className="w-9 h-9 rounded-xl border border-orange-100 flex items-center justify-center text-gray-500 hover:border-orange-300 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}

      <CustomModal
        open={cancelingId !== null}
        type="danger"
        size="medium"
        title="예약을 취소하시겠습니까?"
        description="취소한 예약은 되돌릴 수 없습니다."
        cancelText="아니요"
        confirmText={isPending ? "취소 중..." : "예약 취소"}
        onClose={() => setCancelingId(null)}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
