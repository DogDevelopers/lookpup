"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trash2, Flag } from "lucide-react";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import { CustomModal } from "@/components/common/CustomModal";
import SectionCard from "@/components/common/SectionCard";
import Avatar from "@/components/ui/Avatar";
import { ImageGallery } from "@/components/common/ImageGallery";
import { deleteReview } from "@/features/reviews/actions";
import type { WrittenReview, ReceivedReview } from "@/features/reviews/types";

type TabId = "written" | "received";
type Accent = "orange" | "brown";

const TABS: { id: TabId; label: string }[] = [
  { id: "written", label: "작성한 후기" },
  { id: "received", label: "받은 후기" },
];

const ACCENT: Record<Accent, { star: string; starMuted: string; bg: string; border: string; text: string }> = {
  orange: { star: "fill-orange-400 text-orange-400", starMuted: "fill-orange-100 text-orange-100", bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-500" },
  brown: { star: "fill-orange-300 text-orange-300", starMuted: "fill-orange-300/20 text-orange-300/20", bg: "bg-orange-300/10", border: "border-orange-300/20", text: "text-orange-300" },
};

function MiniStarRating({ value, accent }: { value: number; accent: Accent }) {
  const a = ACCENT[accent];
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={11} className={i <= value ? a.star : a.starMuted} />
      ))}
    </div>
  );
}

function RatingBlock({ rating, accent }: { rating: number; accent: Accent }) {
  const a = ACCENT[accent];
  return (
    <div className={`flex items-center gap-1.5 ${a.bg} border ${a.border} rounded-xl px-3 py-1.5 shrink-0`}>
      <Star size={15} className={a.star} />
      <span className={`text-base font-bold ${a.text} leading-none`}>{rating}.0</span>
    </div>
  );
}

function WrittenReviewCard({
  review,
  onDelete,
  accent,
}: {
  review: WrittenReview;
  onDelete: (id: string) => void;
  accent: Accent;
}) {
  const a = ACCENT[accent];
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    setShowDeleteModal(false);
    setIsDeleting(true);
    const result = await deleteReview(review.id);
    if (!result.ok) {
      setErrorMessage(result.error);
      setIsDeleting(false);
    } else {
      onDelete(review.id);
    }
  };

  return (
    <>
      <SectionCard className="overflow-hidden p-0 gap-0">
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <Avatar initial={review.sitter_full_name?.charAt(0) ?? "?"} src={review.sitter_profile_image} />
            <div>
              <p className="font-semibold text-stone-900 text-sm">{review.sitter_full_name}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {new Date(review.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
          <RatingBlock rating={review.rating} accent={accent} />
        </div>

        {Object.keys(review.detail_ratings).length > 0 && (
          <div className={`px-5 pb-4 border-t ${a.border} pt-3 space-y-2`}>
            {Object.entries(review.detail_ratings).map(([label, val]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-stone-500">{label}</span>
                <MiniStarRating value={val} accent={accent} />
              </div>
            ))}
          </div>
        )}

        <div className={`px-5 pt-4 border-t ${a.border} space-y-3`}>
          {review.image_urls.length > 0 && <ImageGallery urls={review.image_urls} />}
          <p className="text-sm text-stone-900 leading-relaxed">{review.content}</p>
        </div>

        <div className={`px-5 py-3 border-t ${a.border} mt-4 flex items-center justify-between gap-2`}>
          <div className="flex flex-wrap gap-1.5">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2.5 py-1 ${a.bg} ${a.text} text-xs font-medium rounded-full border ${a.border}`}
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
          >
            <Trash2 size={12} /> {isDeleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </SectionCard>

      <CustomModal
        open={showDeleteModal}
        type="danger"
        title="후기를 삭제하시겠습니까?"
        description="삭제한 후기는 복구할 수 없습니다."
        cancelText="취소"
        confirmText="삭제하기"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />

      <CustomModal
        open={errorMessage !== null}
        type="error"
        title="삭제에 실패했습니다."
        description={errorMessage ?? ""}
        confirmText="확인"
        onClose={() => setErrorMessage(null)}
        onConfirm={() => setErrorMessage(null)}
      />
    </>
  );
}

function ReceivedReviewCard({ review }: { review: ReceivedReview }) {
  return (
    <SectionCard className="overflow-hidden p-0 gap-0">
      <div className="flex items-start justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <Avatar initial={review.owner_full_name?.charAt(0) ?? "?"} src={review.owner_profile_image} />
          <div>
            <p className="font-semibold text-stone-900 text-sm">{review.owner_full_name}</p>
            <p className="text-xs text-stone-400 mt-0.5">
              {new Date(review.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
        <RatingBlock rating={review.rating} accent="orange" />
      </div>

      {Object.keys(review.detail_ratings).length > 0 && (
        <div className="px-5 pb-4 border-t border-orange-100 pt-3 space-y-2">
          {Object.entries(review.detail_ratings).map(([label, val]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-stone-500">{label}</span>
              <MiniStarRating value={val} accent="orange" />
            </div>
          ))}
        </div>
      )}

      <div className="px-5 pt-4 pb-5 border-t border-orange-100 space-y-3">
        {review.image_urls.length > 0 && <ImageGallery urls={review.image_urls} />}
        <p className="text-sm text-stone-900 leading-relaxed">{review.content}</p>
      </div>

      <div className="px-5 py-3 border-t border-orange-100 mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-orange-50 text-orange-500 text-xs font-medium rounded-full border border-orange-200"
            >
              {tag}
            </span>
          ))}
        </div>
        <Link
          href={`/myprofile/report?targetId=${review.owner_id}&targetName=${encodeURIComponent(review.owner_full_name)}${review.owner_profile_image ? `&targetImage=${encodeURIComponent(review.owner_profile_image)}` : ""}`}
          className="flex items-center gap-1 text-xs text-stone-400 hover:text-red-400 transition-colors shrink-0"
        >
          <Flag size={12} /> 신고
        </Link>
      </div>
    </SectionCard>
  );
}

export default function ReviewsClient({
  isSitter,
  initialWrittenReviews,
  initialReceivedReviews,
  mode = "both",
  embedded = false,
}: {
  isSitter: boolean;
  initialWrittenReviews: WrittenReview[];
  initialReceivedReviews: ReceivedReview[];
  mode?: TabId | "both";
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>(mode === "received" ? "received" : "written");
  const [writtenReviews, setWrittenReviews] = useState(initialWrittenReviews);

  const handleDeleteWritten = (id: string) => {
    setWrittenReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const writtenCount = writtenReviews.length;
  const receivedCount = initialReceivedReviews.length;
  const visibleTabs = mode === "both" ? TABS : TABS.filter((tab) => tab.id === mode);
  const accent: Accent = mode === "written" ? "brown" : "orange";
  const a = ACCENT[accent];

  return (
    <div className={embedded ? "" : "min-h-screen bg-orange-50"}>
      {!embedded && (
        <div className="md:hidden sticky top-16 z-50 bg-white border-b border-orange-100">
          <div className="h-14 px-5 flex items-center gap-3">
            <MobileBackButton />
            <span className="flex-1 font-semibold text-stone-900">후기 관리</span>
          </div>
        </div>
      )}

      <main className={embedded ? "w-full" : "w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 md:pt-12 pb-10 md:pb-20"}>
        {!embedded && (
          <div className="hidden md:flex items-center gap-4 mb-8">
            <DesktopBackButton />
            <div>
              <h2 className="text-2xl font-bold text-stone-900">후기 관리</h2>
              <p className="text-sm text-gray-500 mt-1">작성한 후기와 받은 후기를 확인하세요</p>
            </div>
          </div>
        )}

        {visibleTabs.length > 1 && (
          <div className="flex gap-1 mb-6 bg-white border border-orange-100 rounded-2xl p-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id ? "bg-orange-500 text-white" : "text-orange-500 hover:text-orange-600"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${activeTab === tab.id ? "text-white/80" : "text-orange-500/70"}`}>
                  {tab.id === "written" ? writtenCount : receivedCount}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTab === "written" ? (
          writtenReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`w-16 h-16 ${a.bg} rounded-full flex items-center justify-center mb-4`}>
                <Star size={28} className={accent === "brown" ? "text-orange-300/40" : "text-orange-200"} />
              </div>
              <p className="font-semibold text-stone-900 mb-1">작성한 후기가 없어요</p>
              <p className="text-sm text-gray-500 mb-6">서비스를 이용하고 후기를 남겨보세요</p>
              <Link
                href="/petsitters"
                className={`px-6 py-3 ${accent === "brown" ? "bg-orange-300 hover:bg-orange-500" : "bg-orange-500 hover:bg-orange-600"} text-white rounded-xl text-sm font-semibold transition-colors`}
              >
                펫시터 찾기
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {writtenReviews.map((review) => (
                <WrittenReviewCard key={review.id} review={review} onDelete={handleDeleteWritten} accent={accent} />
              ))}
            </div>
          )
        ) : initialReceivedReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <Star size={28} className="text-orange-200" />
            </div>
            <p className="font-semibold text-stone-900 mb-1">받은 후기가 없어요</p>
            <p className="text-sm text-gray-500">
              {isSitter ? "펫시터로 활동하고 첫 후기를 받아보세요" : "펫시터로 등록하면 후기를 받을 수 있어요"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {initialReceivedReviews.map((review) => (
              <ReceivedReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
