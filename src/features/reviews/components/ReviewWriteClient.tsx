"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Camera, AlertCircle, PawPrint, BadgeCheck } from "lucide-react";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import { CustomModal } from "@/components/common/CustomModal";
import Avatar from "@/components/ui/Avatar";
import { createReview } from "@/features/reviews/actions";
import type { ReservationDetail } from "@/features/reservations/types";

const RATING_LABELS: Record<number, string> = {
  1: "별로였어요",
  2: "그저 그랬어요",
  3: "괜찮았어요",
  4: "좋았어요",
  5: "최고였어요!",
};

const DETAIL_RATINGS = ["소통이 원활했어요", "약속을 잘 지켰어요", "반려동물을 잘 돌봐줬어요"];

const QUICK_TAGS = ["친절해요", "꼼꼼해요", "시간을 잘 지켜요", "소통이 잘 돼요", "또 맡기고 싶어요", "반려동물을 좋아해요"];

const MAX_REVIEW_PHOTOS = 5;

interface ReviewState {
  overallRating: number;
  detailRatings: Record<string, number>;
  tags: string[];
  content: string;
}

function StarRating({
  value,
  onChange,
  starSize,
  gap = 8,
}: {
  value: number;
  onChange: (v: number) => void;
  starSize: number;
  gap?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex" style={{ gap }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i}점: ${RATING_LABELS[i]}`}
          aria-pressed={i <= value}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1"
          style={{ padding: 0, background: "none", border: "none" }}
        >
          <Star size={starSize} fill={i <= display ? "#f97316" : "none"} stroke={i <= display ? "#f97316" : "#ffedd5"} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function DetailRatingRow({
  label,
  value,
  onChange,
  starSize = 24,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  starSize?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-900">{label}</span>
      <StarRating value={value} onChange={onChange} starSize={starSize} gap={4} />
    </div>
  );
}

function PhotoUploadSlots({ onAdd, maxPhotos = 5, columns = 4, slotWidth = 129, slotHeight = 136 }: {
  onAdd: () => void;
  maxPhotos?: number;
  columns?: number;
  slotWidth?: number;
  slotHeight?: number;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, ${slotWidth}px)` }}>
      <button
        type="button"
        onClick={onAdd}
        style={{ width: slotWidth, height: slotHeight }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-100 hover:border-orange-500/60 hover:bg-orange-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        <Camera size={28} className="text-orange-500" />
        <span className="text-xs text-gray-500">사진 추가</span>
      </button>
      {Array.from({ length: maxPhotos - 1 }).map((_, idx) => (
        <div key={idx} style={{ width: slotWidth, height: slotHeight }} className="rounded-xl border-2 border-dashed border-orange-100 bg-orange-50" />
      ))}
    </div>
  );
}

function PhotoUploadHScroll({ onAdd, maxPhotos = MAX_REVIEW_PHOTOS }: { onAdd: () => void; maxPhotos?: number }) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onAdd}
        className="relative w-[calc((100%-24px)/3)] rounded-xl border-2 border-dashed border-orange-100 bg-white hover:border-orange-500/60 hover:bg-orange-50 transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
      >
        <div className="pb-[100%]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera size={24} className="text-orange-500" />
          <span className="text-xs text-gray-500">사진 추가</span>
        </div>
      </button>
      {Array.from({ length: maxPhotos - 1 }).map((_, i) => (
        <div key={i} className="relative w-[calc((100%-24px)/3)] rounded-xl border-2 border-dashed border-orange-100 bg-orange-50">
          <div className="pb-[100%]" />
        </div>
      ))}
    </div>
  );
}

function BookingSummaryCard({ booking }: { booking: ReservationDetail }) {
  return (
    <div className="bg-white border border-orange-100 rounded-2xl p-5 flex items-center gap-5">
      <div className="relative shrink-0">
        <Avatar initial={booking.sitter.name.charAt(0)} src={booking.sitter.image} size="lg" variant="dark" />
        {booking.sitter.certified && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow">
            <BadgeCheck size={12} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-stone-900">{booking.sitter.name}</span>
          <span className="text-sm text-gray-500">펫시터</span>
        </div>
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-xs px-2.5 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-orange-500 font-medium">
            {booking.serviceType}
          </span>
          <span className="text-sm text-gray-500">
            {booking.date} {booking.time}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <PawPrint size={13} className="text-orange-500" />
          <span className="text-sm text-stone-900 font-medium">{booking.pet.name}</span>
        </div>
      </div>
    </div>
  );
}

export default function ReviewWriteClient({
  reservationId,
  booking,
}: {
  reservationId: string;
  booking: ReservationDetail | null;
}) {
  const router = useRouter();
  const [mobileScreen, setMobileScreen] = useState<1 | 2>(1);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<ReviewState>({
    overallRating: 0,
    detailRatings: {},
    tags: [],
    content: "",
  });

  const toggleTag = (tag: string) =>
    setReviewData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));

  const setDetailRating = (label: string, val: number) =>
    setReviewData((prev) => ({ ...prev, detailRatings: { ...prev.detailRatings, [label]: val } }));

  const notifyPhotoStub = () => toast.error("사진 업로드는 아직 준비 중이에요.");

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createReview({
      reservation_id: reservationId,
      rating: reviewData.overallRating,
      content: reviewData.content,
      image_urls: [],
      tags: reviewData.tags,
      detail_ratings: reviewData.detailRatings,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      setShowSubmitModal(false);
      return;
    }

    setShowSubmitModal(false);
    router.back();
  };

  const bookingError = booking ? null : "예약 정보를 찾을 수 없습니다.";
  const canSubmit = reviewData.overallRating > 0 && !isSubmitting;

  return (
    <div className="min-h-screen bg-orange-50">
      <main>
        <div className="md:hidden sticky top-16 z-50 bg-white border-b border-orange-100">
          <div className="h-14 px-5 flex items-center">
            <MobileBackButton
              onClick={() => (mobileScreen === 2 ? setMobileScreen(1) : router.back())}
              className="mr-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1"
            />
            <span className="flex-1 text-center font-semibold text-stone-900 pr-8">후기 작성</span>
            <span className="absolute right-5 text-xs text-gray-500 font-medium">{mobileScreen} / 2</span>
          </div>
        </div>

        {(bookingError || submitError) && (
          <div className="max-w-160 mx-auto px-4 pt-3">
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{submitError ?? bookingError}</p>
            </div>
          </div>
        )}

        {booking && (
          <>
            <div className="hidden md:block w-full max-w-160 mx-auto px-4 pt-12 pb-20">
              <div className="flex items-center gap-4 mb-8">
                <DesktopBackButton onClick={() => router.back()} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2" />
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 mb-0.5">후기를 남겨주세요</h2>
                  <p className="text-sm text-gray-500">솔직한 후기가 더 좋은 돌봄 문화를 만들어요</p>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <BookingSummaryCard booking={booking} />

                <div className="bg-white border border-orange-100 rounded-2xl p-7">
                  <div className="flex flex-col items-center mb-6">
                    <h3 className="font-semibold text-stone-900 mb-5 text-center">
                      전반적인 만족도<span className="text-red-500 ml-0.5">*</span>
                    </h3>
                    <StarRating value={reviewData.overallRating} onChange={(v) => setReviewData((p) => ({ ...p, overallRating: v }))} starSize={48} gap={10} />
                    <div className="h-7 mt-3 flex items-center justify-center">
                      {reviewData.overallRating > 0 && (
                        <span className="text-base font-semibold text-orange-500 transition-all">{RATING_LABELS[reviewData.overallRating]}</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-orange-100 my-2" />
                  <div className="pt-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-sm font-medium text-gray-500">세부 평가</span>
                      <span className="text-xs px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-gray-500">선택</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {DETAIL_RATINGS.map((label) => (
                        <DetailRatingRow key={label} label={label} value={reviewData.detailRatings[label] ?? 0} onChange={(v) => setDetailRating(label, v)} starSize={24} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-orange-100 rounded-2xl p-7">
                  <h3 className="font-semibold text-stone-900 mb-5">
                    후기 내용<span className="text-red-500 ml-0.5">*</span>
                  </h3>
                  <div className="mb-5">
                    <p className="text-sm font-medium text-stone-900 mb-3">좋았던 점을 선택해주세요</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-4 py-2 rounded-full text-sm border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
                            reviewData.tags.includes(tag)
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-orange-50 text-gray-500 border-orange-100 hover:border-orange-500/40"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-end mb-1">
                      <span className="text-xs text-gray-500">{reviewData.content.length} / 1000</span>
                    </div>
                    <textarea
                      value={reviewData.content}
                      onChange={(e) => e.target.value.length <= 1000 && setReviewData((p) => ({ ...p, content: e.target.value }))}
                      placeholder={"펫시터와의 경험을 자세히 공유해주세요.\n예) 몽이가 낯을 많이 가리는데 잘 적응할 수 있게 도와주셨어요 :)"}
                      className="w-full px-4 py-3 border border-orange-100 rounded-xl text-stone-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                      style={{ minHeight: 160 }}
                    />
                  </div>
                </div>

                <div className="bg-white border border-orange-100 rounded-2xl p-7">
                  <div className="flex items-center gap-2 mb-5">
                    <h3 className="font-semibold text-stone-900">사진 첨부</h3>
                    <span className="text-xs px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-gray-500">선택</span>
                    <span className="ml-auto text-xs text-gray-500">최대 {MAX_REVIEW_PHOTOS}장</span>
                  </div>
                  <PhotoUploadSlots onAdd={notifyPhotoStub} maxPhotos={MAX_REVIEW_PHOTOS} columns={4} slotWidth={129} slotHeight={136} />
                </div>

                <div className="flex flex-col items-center gap-1.5 py-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-orange-400 shrink-0" />
                    <p className="text-sm text-gray-500 text-center">후기는 작성 후 수정이 불가합니다. 신중하게 작성해주세요.</p>
                  </div>
                  <p className="text-xs text-orange-400">서비스 완료 후 7일 이내에만 작성 가능해요.</p>
                </div>

                <div className="flex flex-col gap-3 pb-4">
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => setShowSubmitModal(true)}
                    className="w-full h-14 rounded-xl bg-orange-500 text-white font-semibold text-base hover:bg-orange-600 transition-colors shadow-sm disabled:bg-orange-100 disabled:text-gray-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                  >
                    {isSubmitting ? "등록 중..." : "후기 등록하기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full h-12 rounded-xl border border-orange-100 text-gray-500 font-medium hover:border-orange-500/50 hover:text-orange-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                  >
                    나중에 작성하기
                  </button>
                </div>
              </div>
            </div>

            <div className="md:hidden px-5 pt-4">
              {mobileScreen === 1 ? (
                <div className="flex flex-col gap-4 pb-39">
                  <div className="bg-orange-50 rounded-xl p-3 flex items-center gap-3 border border-orange-100">
                    <Avatar initial={booking.sitter.name.charAt(0)} src={booking.sitter.image} size="md" variant="dark" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold text-stone-900">{booking.sitter.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-white border border-orange-100 rounded-full text-orange-500 font-medium">
                          {booking.serviceType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {booking.date} {booking.time}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <PawPrint size={11} className="text-orange-500" />
                        <span className="text-xs text-stone-900 font-medium">{booking.pet.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-orange-100 rounded-2xl p-6 flex flex-col items-center">
                    <p className="text-sm font-semibold text-stone-900 mb-4 text-center">
                      전반적인 만족도<span className="text-red-500 ml-0.5">*</span>
                    </p>
                    <StarRating value={reviewData.overallRating} onChange={(v) => setReviewData((p) => ({ ...p, overallRating: v }))} starSize={44} gap={8} />
                    <div className="h-6 mt-3 flex items-center">
                      {reviewData.overallRating > 0 && (
                        <span className="text-sm font-semibold text-orange-500">{RATING_LABELS[reviewData.overallRating]}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-orange-100 rounded-2xl p-5">
                    <p className="text-sm font-semibold text-stone-900 mb-3">좋았던 점을 선택해주세요</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3.5 py-2 rounded-full text-sm border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
                            reviewData.tags.includes(tag) ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-gray-500 border-orange-100"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-orange-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-sm font-semibold text-stone-900">세부 평가</p>
                      <span className="text-xs px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-gray-500">선택</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      {DETAIL_RATINGS.map((label) => (
                        <DetailRatingRow key={label} label={label} value={reviewData.detailRatings[label] ?? 0} onChange={(v) => setDetailRating(label, v)} starSize={20} />
                      ))}
                    </div>
                  </div>

                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-40">
                    <button
                      type="button"
                      disabled={reviewData.overallRating === 0}
                      onClick={() => {
                        setMobileScreen(2);
                        window.scrollTo(0, 0);
                      }}
                      className="w-full h-13 rounded-xl bg-orange-500 text-white font-semibold text-base disabled:bg-orange-100 disabled:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      다음
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-50">
                  <div className="bg-white border border-orange-100 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-stone-900">
                        후기 내용<span className="text-red-500 ml-0.5">*</span>
                      </h3>
                      <span className="text-xs text-gray-500">{reviewData.content.length} / 1000</span>
                    </div>
                    <textarea
                      value={reviewData.content}
                      onChange={(e) => e.target.value.length <= 1000 && setReviewData((p) => ({ ...p, content: e.target.value }))}
                      placeholder={"펫시터와의 경험을 자세히 공유해주세요.\n예) 몽이가 낯을 많이 가리는데 잘 적응할 수 있게 도와주셨어요 :)"}
                      className="w-full px-4 py-3 border border-orange-100 rounded-xl text-stone-900 placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                      style={{ minHeight: 180 }}
                    />
                  </div>

                  <div className="bg-white border border-orange-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-semibold text-stone-900">사진 첨부</h3>
                      <span className="text-xs px-2 py-0.5 bg-orange-50 border border-orange-100 rounded-full text-gray-500">선택</span>
                      <span className="ml-auto text-xs text-gray-500">최대 {MAX_REVIEW_PHOTOS}장</span>
                    </div>
                    <PhotoUploadHScroll onAdd={notifyPhotoStub} maxPhotos={MAX_REVIEW_PHOTOS} />
                  </div>

                  <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <AlertCircle size={15} className="text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">후기는 수정이 불가합니다.</p>
                      <p className="text-xs text-orange-400 mt-0.5">서비스 완료 후 7일 이내에만 작성 가능해요.</p>
                    </div>
                  </div>

                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] z-40">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowSubmitModal(true)}
                      className="w-full h-13 rounded-xl bg-orange-500 text-white font-semibold text-base mb-3 hover:bg-orange-600 transition-colors disabled:bg-orange-100 disabled:text-gray-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      {isSubmitting ? "등록 중..." : "후기 등록하기"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="w-full text-sm text-gray-500 font-medium text-center hover:text-orange-500 transition-colors py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                    >
                      나중에 작성하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <CustomModal
        open={showSubmitModal}
        type="confirm"
        title="후기를 등록하시겠습니까?"
        description="후기는 작성 후 수정이 불가합니다. 신중하게 확인해주세요."
        cancelText="취소"
        confirmText={isSubmitting ? "등록 중..." : "등록하기"}
        onClose={() => {
          if (!isSubmitting) setShowSubmitModal(false);
        }}
        onConfirm={handleSubmit}
      />
    </div>
  );
}
