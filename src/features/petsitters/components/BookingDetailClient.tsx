"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, MapPin, Star, MessageCircle, BadgeCheck, FileText } from "lucide-react";
import { toast } from "sonner";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import SectionCard from "@/components/common/SectionCard";
import Avatar from "@/components/ui/Avatar";
import CareRecordTimeline from "@/features/care-records/components/CareRecordTimeline";
import type { CareRecord } from "@/features/care-records/actions";
import { cancelReservation } from "@/features/reservations/actions";
import type { ReservationDetail, ReservationUiStatus } from "@/features/reservations/types";

const STATUS_CONFIG: Record<ReservationUiStatus, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "예약 요청", bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
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

const PET_VISUAL: Record<string, { emoji: string; gradient: string }> = {
  dog: { emoji: "🐶", gradient: "linear-gradient(135deg, #FDE8C4, #FAD7A0)" },
  cat: { emoji: "🐱", gradient: "linear-gradient(135deg, #D6EAF8, #AED6F1)" },
  other: { emoji: "🐾", gradient: "linear-gradient(135deg, #D5F5E3, #A9DFBF)" },
};

function ReviewSection({ reviewWritten, bookingId }: { reviewWritten: boolean; bookingId: string }) {
  if (!reviewWritten) {
    return (
      <div className="bg-white border-2 border-[var(--color-orange-500)] rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
            <Star size={20} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-stone-900 mb-1">후기를 남겨주세요</p>
            <p className="text-sm text-gray-500">소중한 경험을 다른 보호자와 공유해주세요</p>
          </div>
        </div>
        <Link
          href={`/myprofile/reviews/write?bookingId=${bookingId}`}
          className="w-full mt-5 h-12 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center"
        >
          후기 작성하기
        </Link>
      </div>
    );
  }

  return (
    <SectionCard className="p-6 gap-0">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} className="text-gray-500" />
        <span className="font-semibold text-stone-900">작성한 후기</span>
      </div>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={16} className="fill-yellow-400 text-yellow-400" />
        ))}
        <span className="text-sm text-gray-500 ml-1">5.0</span>
      </div>
    </SectionCard>
  );
}

export default function BookingDetailClient({
  booking: initialBooking,
  careRecords,
}: {
  booking: ReservationDetail;
  careRecords: CareRecord[];
}) {
  const [booking, setBooking] = useState(initialBooking);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const status = STATUS_CONFIG[booking.status];
  const petVisual = PET_VISUAL[booking.pet.animalType] ?? PET_VISUAL.other;

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelReservation(booking.id);
      if (!result.ok) {
        setCancelError(result.error);
        setCancelConfirm(false);
        return;
      }
      setBooking((prev) => ({ ...prev, status: "cancelled" }));
      setCancelConfirm(false);
      toast.success("예약이 취소되었습니다.");
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="md:hidden sticky top-16 z-50 bg-white border-b border-orange-100">
        <div className="h-14 px-5 flex items-center gap-3">
          <MobileBackButton />
          <span className="flex-1 font-semibold text-stone-900">예약 상세</span>
        </div>
      </div>

      <main className="w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 md:pt-12 pb-10 md:pb-20">
        <div className="hidden md:flex items-center gap-4 mb-8">
          <DesktopBackButton />
          <div>
            <h2 className="text-2xl font-bold text-stone-900">예약 상세</h2>
            <p className="text-sm text-gray-500 mt-1">{booking.bookingNo}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard className="px-6 py-5 gap-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full text-stone-900"
                  style={{ background: SERVICE_BADGE_COLOR[booking.serviceType] ?? "#FFF7ED" }}
                >
                  {booking.serviceType}
                </span>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full border"
                  style={{ background: status.bg, color: status.text, borderColor: status.border }}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-gray-500">총 결제 금액</span>
                <span className="font-bold text-orange-500">{booking.price.toLocaleString()}원</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Calendar size={15} className="text-orange-500 shrink-0" />
                <span>{booking.date}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Clock size={15} className="text-orange-500 shrink-0" />
                <span>{booking.time}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <MapPin size={15} className="text-orange-500 shrink-0" />
                <span>{booking.location}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="px-6 py-5 gap-0">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">반려동물 정보</h3>
            <div className="flex items-center gap-4">
              <div
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 overflow-hidden"
                style={{ background: petVisual.gradient }}
              >
                {booking.pet.imageUrl ? (
                  <Image
                    src={booking.pet.imageUrl}
                    alt={booking.pet.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  petVisual.emoji
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 flex-1">
                <div>
                  <p className="text-xs text-gray-500">이름</p>
                  <p className="text-sm font-semibold text-stone-900">{booking.pet.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">품종</p>
                  <p className="text-sm font-semibold text-stone-900">{booking.pet.breed}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">나이</p>
                  <p className="text-sm font-semibold text-stone-900">{booking.pet.age}살</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">몸무게</p>
                  <p className="text-sm font-semibold text-stone-900">{booking.pet.weight}kg</p>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="px-6 py-5 gap-0">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">펫시터 정보</h3>
            <div className="flex items-center gap-4">
              <Avatar initial={booking.sitter.name.charAt(0)} src={booking.sitter.image} size="md" variant="orange" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-stone-900">{booking.sitter.name}</span>
                  {booking.sitter.certified && (
                    <span className="flex items-center gap-1 text-xs text-[#1976D2] bg-[#E3F2FD] px-2 py-0.5 rounded-full">
                      <BadgeCheck size={11} />
                      인증 완료
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">{booking.sitter.rating}</span>
                  <span className="text-xs text-gray-500">({booking.sitter.reviewCount}건)</span>
                </div>
              </div>
              {(booking.status === "in-progress" ||
                booking.status === "confirmed" ||
                booking.status === "pending") && (
                <Link
                  href="/chat"
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-500 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors shrink-0"
                >
                  <MessageCircle size={15} />
                  채팅
                </Link>
              )}
            </div>
          </SectionCard>

          <CareRecordTimeline records={careRecords} />

          {booking.status === "completed" && <ReviewSection reviewWritten={booking.reviewWritten} bookingId={booking.id} />}

          {(booking.status === "pending" || booking.status === "confirmed") && (
            <>
              {cancelError && <p className="text-xs text-red-500 text-center">{cancelError}</p>}
              {cancelConfirm ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-center text-gray-500">정말 예약을 취소할까요? 되돌릴 수 없습니다.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelConfirm(false)}
                      disabled={isPending}
                      className="flex-1 h-12 rounded-xl border border-orange-100 text-gray-500 text-sm font-medium hover:bg-orange-50 transition-colors disabled:opacity-50"
                    >
                      돌아가기
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isPending}
                      className="flex-1 h-12 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isPending ? "처리 중..." : "취소 확인"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCancelConfirm(true);
                    setCancelError(null);
                  }}
                  className="w-full h-12 rounded-xl border border-orange-100 text-gray-500 text-sm font-medium hover:border-red-300 hover:text-red-500 transition-colors"
                >
                  예약 취소
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
