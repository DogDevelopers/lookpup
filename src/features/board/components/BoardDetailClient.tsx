"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Send,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/ui/Avatar";
import SectionCard from "@/components/common/SectionCard";
import { CustomModal } from "@/components/common/CustomModal";
import BackButton from "@/components/common/BackButton";
import KakaoMap from "@/components/common/KakaoMap";
import { ImageGallery } from "@/components/common/ImageGallery";
import { ReportDialog } from "@/features/report/components/ReportDialog";
import { splitConditions } from "../utils";
import { closeRequest, deleteRequest } from "../actions";
import { createApplication } from "@/features/applications/actions";
import type { OtherPost, RequestDetail } from "../types";

export type { OtherPost, RequestDetail };

const STATUS_MAP: Record<string, string> = {
  open: "모집중",
  matched: "매칭완료",
  completed: "완료",
  canceled: "취소",
};

function formatPeriod(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const sStr = `${s.getMonth() + 1}월 ${s.getDate()}일`;
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();
  if (sameDay) return `${sStr} (당일)`;
  return `${sStr} - ${e.getMonth() + 1}월 ${e.getDate()}일`;
}

function formatClock(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
}

function formatTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const startSet = s.getSeconds() !== 30;
  const endSet = e.getSeconds() !== 30;
  if (startSet && endSet) return `${formatClock(s)} - ${formatClock(e)}`;
  if (startSet) return formatClock(s);
  if (endSet) return formatClock(e);
  return "시간 협의";
}

function formatRelativeTime(dateStr: string) {
  const diffH = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 3600000,
  );
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

function formatJoinDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

interface BoardDetailClientProps {
  id: string;
  initialPost?: RequestDetail | null;
  initialOtherPosts?: OtherPost[];
  // TODO: features/auth 이식 후 실제 로그인/펫시터 상태로 교체.
  currentUserId?: string;
  isLoggedIn?: boolean;
  isSitter?: boolean;
  isUnapprovedSitter?: boolean;
}

export default function BoardDetailClient({
  id: _id,
  initialPost,
  initialOtherPosts,
  currentUserId,
  isLoggedIn = false,
  isSitter = false,
  isUnapprovedSitter = false,
}: BoardDetailClientProps) {
  const router = useRouter();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [post, setPost] = useState<RequestDetail | null>(initialPost ?? null);
  const [reportOpen, setReportOpen] = useState(false);
  const otherPosts = initialOtherPosts ?? null;

  const handleApply = async () => {
    if (!post?.id) return;
    setApplying(true);

    const result = await createApplication(post.id, {
      message: null,
      proposed_price: null,
    });

    setApplying(false);
    if (!result.ok) {
      setShowApplyModal(false);
      setErrorMessage(result.error);
      return;
    }
    setShowApplyModal(false);
    router.push(
      result.data.roomId
        ? `/chat?roomId=${result.data.roomId}&tab=applicants`
        : "/chat?tab=applicants",
    );
  };

  if (!post) {
    return (
      <>
        <main className="flex-1 bg-orange-50 min-h-screen">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-10 py-20 text-center text-stone-400">
            게시글을 찾을 수 없습니다.
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const parsed = splitConditions(post.content ?? "");
  const conditionsText = parsed.conditions.trim();

  const isAuthor = !!currentUserId && currentUserId === post.owner_id;

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }
    if (!isSitter) {
      router.push("/sitter-register");
      return;
    }
    if (isUnapprovedSitter) {
      setErrorMessage("승인 대기 중이거나 반려된 펫시터는 지원할 수 없습니다.");
      return;
    }
    setShowApplyModal(true);
  };

  const handleClose = async () => {
    const result = await closeRequest(post.id);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }
    setPost((prev) => (prev ? { ...prev, status: "matched" } : prev));
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const result = await deleteRequest(deleteTargetId);
    setDeleteTargetId(null);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }
    router.push("/board");
  };

  return (
    <>
      <main className="flex-1 bg-orange-50 min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-10 py-6 md:py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-6">
            <div className="flex-1 min-w-0">
              <BackButton href="/board" />
            </div>
            <div className="hidden lg:block lg:w-96 shrink-0" aria-hidden />
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            <div className="w-full flex-1 min-w-0 flex flex-col gap-6">
              <SectionCard className="overflow-hidden p-0 gap-0">
                <div className="h-64 bg-orange-50">
                  {post?.latitude && post?.longitude ? (
                    <KakaoMap
                      markers={[
                        {
                          id: post.id,
                          lat: post.latitude,
                          lng: post.longitude,
                          name: post.title,
                        },
                      ]}
                      center={{ lat: post.latitude, lng: post.longitude }}
                      level={5}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-7xl opacity-30">🐾</span>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-500 text-xs font-medium rounded-full">
                      {STATUS_MAP[post.status] ?? post.status}
                    </span>
                    <div className="flex items-center gap-3 md:gap-4 text-stone-500 text-sm">
                      <span>{formatRelativeTime(post.created_at)}</span>
                      <span>조회 {post.view_count}</span>
                      <span>지원 {post.applications.length}명</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-brown-900">
                      {post.title}
                    </h1>
                    {isAuthor && (
                      <div className="flex items-center gap-1.5 shrink-0 pt-1">
                        {post.status === "open" && (
                          <button
                            onClick={handleClose}
                            className="px-3 py-1.5 rounded-lg border border-orange-100 text-orange-500 text-xs font-medium hover:bg-orange-50 transition-colors"
                          >
                            모집마감
                          </button>
                        )}
                        <Link
                          href={`/board/${post.id}/edit`}
                          aria-label="게시글 수정"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-orange-100 text-stone-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTargetId(post.id)}
                          aria-label="게시글 삭제"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-orange-100 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {!isAuthor && isLoggedIn && (
                      <button
                        onClick={() => setReportOpen(true)}
                        aria-label="게시글 신고"
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-orange-100 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-1"
                      >
                        <Flag size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-stone-500 text-xs">위치</p>
                        <p className="text-brown-900 text-base font-medium">
                          {post.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-stone-500 text-xs">기간</p>
                        <p className="text-brown-900 text-base font-medium">
                          {formatPeriod(post.start_datetime, post.end_datetime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-stone-500 text-xs">시간</p>
                        <p className="text-brown-900 text-base font-medium">
                          {formatTimeRange(
                            post.start_datetime,
                            post.end_datetime,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-stone-500 text-xs">급여</p>
                        <p className="text-orange-500 text-base font-medium">
                          {post.budget
                            ? `${post.budget.toLocaleString()}원`
                            : "협의 가능"}
                        </p>
                      </div>
                    </div>
                    {!isAuthor && (
                      <div className="flex gap-3 sm:col-span-2">
                        <button
                          onClick={handleApplyClick}
                          className="flex-1 h-11 flex items-center justify-center gap-2 bg-orange-500 rounded-[10px] text-white text-base font-medium hover:bg-orange-600 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          지원하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard>
                <h2 className="text-brown-900 text-xl font-bold">상세 내용</h2>
                <p className="text-brown-900 text-base leading-7 whitespace-pre-line">
                  {parsed.content}
                </p>
                {post.image_urls.length > 0 && (
                  <ImageGallery urls={post.image_urls} />
                )}
              </SectionCard>

              {conditionsText && (
                <SectionCard>
                  <h2 className="text-brown-900 text-xl font-bold">
                    펫시터 조건
                  </h2>
                  <p className="text-brown-900 text-base leading-7 whitespace-pre-line">
                    {conditionsText}
                  </p>
                </SectionCard>
              )}

              {post.pets && (
                <SectionCard>
                  <h2 className="text-brown-900 text-xl font-bold">반려동물</h2>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 rounded-lg">
                      <span className="text-sm font-semibold text-brown-900">
                        {post.pets.name}
                      </span>
                      <span className="text-xs text-stone-500">
                        {post.pets.breed ?? post.pets.animal_type}
                      </span>
                    </div>
                  </div>
                </SectionCard>
              )}

              {post && (
                <SectionCard>
                  <h2 className="text-brown-900 text-xl font-bold">
                    지원자 {post.applications.length}명
                  </h2>
                  {post.applications.length === 0 ? (
                    <p className="text-stone-500 text-sm">
                      아직 지원자가 없습니다.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {post.applications.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg"
                        >
                          <Avatar
                            initial={app.sitters?.users?.full_name?.[0] ?? "?"}
                            src={app.sitters?.users?.profile_image}
                            size="md"
                            variant="orange"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-brown-900 text-sm font-semibold">
                                {app.sitters?.users?.full_name ?? "알 수 없음"}
                              </span>
                              {app.proposed_price != null && (
                                <span className="text-orange-500 text-sm font-semibold">
                                  {app.proposed_price.toLocaleString()}원
                                </span>
                              )}
                            </div>
                            {app.message && (
                              <p className="text-brown-900 text-sm leading-5">
                                {app.message}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              )}
            </div>

            <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6 lg:sticky lg:top-20">
              <SectionCard>
                <h3 className="text-brown-900 text-lg font-bold">
                  작성자 정보
                </h3>
                <div className="flex items-center gap-3">
                  <Avatar
                    initial={post.users?.full_name?.[0] ?? "?"}
                    src={post.users?.profile_image}
                    size="lg"
                    variant="orange"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-brown-900 text-base font-semibold">
                        {post.users?.full_name ?? "알 수 없음"}
                      </span>
                      {post.users?.is_verified && (
                        <span className="px-2 py-0.5 bg-orange-500 rounded text-white text-[9px] font-medium">
                          인증
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500 text-xs">
                        가입{" "}
                        {post.users?.created_at
                          ? formatJoinDate(post.users.created_at)
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard>
                <div className="flex items-center justify-between">
                  <h3 className="text-brown-900 text-lg font-bold">
                    {post.users?.full_name ?? "작성자"}님의 다른 게시물
                  </h3>
                  <Link
                    href="/board"
                    className="text-orange-500 text-xs font-medium hover:underline"
                  >
                    더보기
                  </Link>
                </div>
                <div className="flex flex-col gap-3">
                  {otherPosts === null ? (
                    <p className="text-stone-400 text-sm py-3 text-center">
                      불러오는 중...
                    </p>
                  ) : otherPosts.length === 0 ? (
                    <p className="text-stone-400 text-sm py-3 text-center">
                      다른 게시물이 없습니다.
                    </p>
                  ) : (
                    otherPosts
                      .map((p) => ({
                        id: p.id,
                        title: p.title,
                        district: p.location,
                        price: p.budget
                          ? `${p.budget.toLocaleString("ko-KR")}원`
                          : "협의 가능",
                        createdAt: formatRelativeTime(p.created_at),
                        status: STATUS_MAP[p.status] ?? p.status,
                      }))
                      .map((p) => (
                        <Link key={p.id} href={`/board/${p.id}`}>
                          <div className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between mb-1">
                              <p className="text-brown-900 text-sm font-medium flex-1 truncate pr-2">
                                {p.title}
                              </p>
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-medium ${
                                  p.status === "모집중"
                                    ? "bg-emerald-50 text-emerald-500"
                                    : "bg-orange-50 text-orange-500"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span className="text-stone-500 text-xs">
                                {p.district}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-orange-500 text-xs font-semibold">
                                {p.price}
                              </span>
                              <span className="text-stone-500 text-xs">
                                {p.createdAt}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <CustomModal
        open={showApplyModal}
        preset="warning"
        title="지원하시겠습니까?"
        description="지원 후 채팅으로 보호자와 상담을 진행하세요."
        cancelText="취소"
        confirmText={applying ? "지원 중..." : "지원하기"}
        closeOnOverlay={!applying}
        closeOnEsc={!applying}
        onClose={() => setShowApplyModal(false)}
        onConfirm={handleApply}
      />

      <CustomModal
        open={!!errorMessage}
        type="error"
        title={
          errorMessage === "이미 지원한 구인글입니다."
            ? "이미 지원하였던 게시글이에요"
            : "오류가 발생했습니다."
        }
        description={errorMessage ?? undefined}
        confirmText="확인"
        onConfirm={() => setErrorMessage(null)}
        onClose={() => setErrorMessage(null)}
        showCloseButton={false}
      />

      {deleteTargetId && (
        <CustomModal
          open={!!deleteTargetId}
          type="danger"
          title="게시글 삭제"
          description="게시글을 삭제하면 복구할 수 없어요. 정말 삭제하시겠어요?"
          confirmText="삭제하기"
          cancelText="취소"
          onClose={() => setDeleteTargetId(null)}
          onConfirm={confirmDelete}
        />
      )}

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="request"
        targetId={post.id}
        targetLabel={post.title}
      />
    </>
  );
}
