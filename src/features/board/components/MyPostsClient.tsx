"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dog,
  Calendar,
  Clock,
  MapPin,
  User,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  MobileBackButton,
  DesktopBackButton,
} from "@/components/common/BackButton";
import { CustomModal } from "@/components/common/CustomModal";
import SectionCard from "@/components/common/SectionCard";
import { deleteRequest, closeRequest } from "@/features/board/actions";
import { SERVICE_TYPES } from "@/features/board/constants";
import type { MyRequestRow } from "@/features/board/types";

const REQUEST_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_TYPES.map((s) => [s.value, s.label]),
);

function formatPeriod(start: string | null, end: string | null) {
  if (!start || !end) return "기간 협의";
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}월 ${s.getDate()}일 - ${e.getMonth() + 1}월 ${e.getDate()}일`;
}

function formatTimeRange(start: string | null, end: string | null) {
  if (!start || !end) return "-";
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(s)} – ${fmt(e)}`;
}

function formatRelativeTime(dateStr: string) {
  const diffH = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 3600000,
  );
  if (diffH < 1) return "방금 전";
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

type PostStatus = "open" | "matched" | "in-progress" | "completed" | "canceled";
type TabId = "all" | PostStatus;

interface Post {
  id: string;
  title: string;
  status: PostStatus;
  petName: string;
  serviceType: string;
  date: string;
  time: string;
  location: string;
  price: number;
  createdAt: string;
  createdAtRaw: string;
  applicantCount?: number;
  sitterName?: string;
}

function toPost(r: MyRequestRow): Post {
  const pet = r.pets;
  const accepted = r.applications.find((a) => a.status === "accepted");
  const reservationStatus = r.reservations[0]?.status;

  let effectiveStatus: PostStatus;
  if (r.status === "matched" && reservationStatus === "completed") {
    effectiveStatus = "completed";
  } else if (r.status === "matched" && reservationStatus === "in_progress") {
    effectiveStatus = "in-progress";
  } else if (
    r.status === "open" ||
    r.status === "matched" ||
    r.status === "canceled"
  ) {
    effectiveStatus = r.status;
  } else {
    effectiveStatus = "canceled";
  }

  return {
    id: r.id,
    title: r.title,
    status: effectiveStatus,
    petName: pet ? `${pet.name} (${pet.animal_type})` : "(반려동물 없음)",
    serviceType: REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type,
    date: formatPeriod(r.start_datetime, r.end_datetime),
    time: formatTimeRange(r.start_datetime, r.end_datetime),
    location: r.location ?? "위치 미정",
    price: r.budget ?? 0,
    createdAt: formatRelativeTime(r.created_at),
    createdAtRaw: r.created_at,
    applicantCount: r.status === "open" ? r.applications.length : undefined,
    sitterName: accepted?.sitters?.users?.full_name ?? undefined,
  };
}

const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; badgeBg: string; badgeText: string }
> = {
  open: {
    label: "모집중",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-500",
  },
  matched: {
    label: "예약완료",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-500",
  },
  "in-progress": {
    label: "진행중",
    badgeBg: "bg-brown-600/10",
    badgeText: "text-brown-600",
  },
  completed: {
    label: "완료",
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-500",
  },
  canceled: { label: "취소", badgeBg: "bg-red-100", badgeText: "text-red-500" },
};

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "open", label: "모집중" },
  { id: "in-progress", label: "진행중" },
  { id: "matched", label: "예약완료" },
  { id: "completed", label: "완료" },
  { id: "canceled", label: "취소" },
];

function formatPrice(price: number) {
  return price ? price.toLocaleString("ko-KR") + "원" : "협의 가능";
}

function countByStatus(posts: Post[], status: PostStatus) {
  return posts.filter((p) => p.status === status).length;
}

function PostCard({
  post,
  onDelete,
  onDetail,
  onEdit,
  onClose,
}: {
  post: Post;
  onDelete: (id: string) => void;
  onDetail: (id: string) => void;
  onEdit: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const config = STATUS_CONFIG[post.status];
  const isOpen = post.status === "open";

  return (
    <SectionCard>
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-sm font-bold text-stone-900 leading-5 flex-1 min-w-0">
          {post.title}
        </span>
        <span
          className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-xs flex items-center gap-1 ${config.badgeBg} ${config.badgeText}`}
        >
          {(post.status === "open" ||
            post.status === "matched" ||
            post.status === "completed") && <CheckCircle size={10} />}
          {post.status === "in-progress" && (
            <span className="size-2 rounded-full bg-brown-600 shrink-0" />
          )}
          {post.status === "canceled" && <XCircle size={10} />}
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <Dog size={12} className="text-brown-600 shrink-0" />
          <span className="text-xs text-gray-500">{post.petName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-brown-600 shrink-0" />
          <span className="text-xs text-gray-500">{post.serviceType}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-brown-600 shrink-0" />
          <span className="text-xs text-gray-500">{post.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-brown-600 shrink-0" />
          <span className="text-xs text-gray-500">{post.time}</span>
        </div>
        <div className="flex items-center gap-1.5 col-span-2">
          <MapPin size={12} className="text-brown-600 shrink-0" />
          <span className="text-xs text-gray-500">{post.location}</span>
        </div>
      </div>

      <div className="border-t border-brown-600/20" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-brown-600">
          {formatPrice(post.price)}
        </span>
        {post.applicantCount !== undefined ? (
          <div className="flex items-center gap-1">
            <User size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">
              지원자 {post.applicantCount}명
            </span>
          </div>
        ) : post.sitterName ? (
          <div className="flex items-center gap-1">
            <User size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">
              펫시터 {post.sitterName}
            </span>
          </div>
        ) : (
          <div />
        )}
        <span className="text-xs text-gray-400">작성 {post.createdAt}</span>
      </div>

      {isOpen ? (
        <div className="flex gap-2">
          <button
            onClick={() => onDetail(post.id)}
            className="flex-1 py-2 bg-brown-600/10 border border-brown-600/20 rounded-xl text-brown-600 text-xs hover:bg-brown-600/20 transition-colors"
          >
            상세보기
          </button>
          <button
            onClick={() => onEdit(post.id)}
            className="flex-1 py-2 bg-brown-600 rounded-xl text-white text-xs flex items-center justify-center gap-1 hover:bg-brown-900 transition-colors"
          >
            <Pencil size={10} />
            수정하기
          </button>
          <button
            onClick={() => onClose(post.id)}
            className="flex-1 py-2 bg-gray-100 rounded-xl text-gray-500 text-xs hover:bg-gray-200 transition-colors"
          >
            모집마감
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="flex-1 py-2 bg-red-100 rounded-xl text-red-500 text-xs flex items-center justify-center gap-1 hover:bg-red-200 transition-colors"
          >
            <Trash2 size={10} />
            삭제
          </button>
        </div>
      ) : (
        <button
          onClick={() => onDetail(post.id)}
          className="w-full py-2 bg-brown-600/10 border border-brown-600/20 rounded-xl text-brown-600 text-xs hover:bg-brown-600/20 transition-colors"
        >
          상세보기
        </button>
      )}
    </SectionCard>
  );
}

export default function MyPostsClient({
  posts: initialPosts,
  embedded = false,
}: {
  posts: MyRequestRow[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initialPosts.map(toPost));
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollTabs = (dir: "left" | "right") => {
    const el = tabsRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const filtered =
    activeTab === "all" ? posts : posts.filter((p) => p.status === activeTab);
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.createdAtRaw).getTime() - new Date(a.createdAtRaw).getTime(),
  );

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const result = await deleteRequest(deleteTargetId);
    if (result.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== deleteTargetId));
    } else {
      toast.error(result.error);
    }
    setDeleteTargetId(null);
  };

  const handleClose = async (id: string) => {
    const result = await closeRequest(id);
    if (result.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "matched" as PostStatus } : p,
        ),
      );
    } else {
      toast.error(result.error);
    }
  };

  const tabCounts: Record<TabId, number> = {
    all: posts.length,
    open: countByStatus(posts, "open"),
    matched: countByStatus(posts, "matched"),
    "in-progress": countByStatus(posts, "in-progress"),
    completed: countByStatus(posts, "completed"),
    canceled: countByStatus(posts, "canceled"),
  };

  return (
    <div
      className={
        embedded
          ? "flex flex-col"
          : "min-h-screen flex flex-col bg-brown-600/10"
      }
    >
      {!embedded && (
        <div className="md:hidden sticky top-16 z-50 bg-white border-b border-brown-600/20">
          <div className="h-14 px-5 flex items-center gap-3">
            <MobileBackButton />
            <span className="flex-1 font-semibold text-stone-900">
              게시글 관리
            </span>
          </div>
        </div>
      )}

      <main
        className={
          embedded
            ? "flex-1 w-full"
            : "flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 pb-10"
        }
      >
        {!embedded && (
          <div className="hidden md:flex items-center gap-3 mb-2">
            <DesktopBackButton />
            <div>
              <h1 className="text-2xl font-bold text-stone-900">게시글 관리</h1>
              <p className="text-sm text-gray-500 mt-1">
                작성한 돌봄 요청글을 확인하고 관리할 수 있어요.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-6">
          <button
            type="button"
            aria-label="이전 탭"
            onClick={() => scrollTabs("left")}
            disabled={!canScrollLeft}
            className="md:hidden shrink-0 w-8 h-8 rounded-full bg-white border border-brown-600/20 flex items-center justify-center text-gray-500 disabled:opacity-30 transition-opacity"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={tabsRef}
            className="flex-1 min-w-0 flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-white border border-brown-600/20 rounded-2xl p-1 scroll-smooth"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-fit px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[var(--color-brown-600)] text-white"
                      : "text-gray-500 hover:text-stone-900"
                  }`}
                >
                  {tab.label}
                  {tabCounts[tab.id] > 0 && (
                    <span
                      className={`ml-1.5 text-xs ${isActive ? "text-white/80" : "text-gray-400"}`}
                    >
                      {tabCounts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="다음 탭"
            onClick={() => scrollTabs("right")}
            disabled={!canScrollRight}
            className="md:hidden shrink-0 w-8 h-8 rounded-full bg-white border border-brown-600/20 flex items-center justify-center text-gray-500 disabled:opacity-30 transition-opacity"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-4 mb-3">
          <span className="text-xs text-gray-400">총 {sorted.length}건</span>
        </div>

        <div className="flex flex-col gap-3">
          {sorted.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">
              게시글이 없습니다.
            </div>
          ) : (
            sorted.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={(id) => setDeleteTargetId(id)}
                onDetail={(id) => router.push(`/board/${id}`)}
                onEdit={(id) => router.push(`/board/${id}/edit`)}
                onClose={handleClose}
              />
            ))
          )}
        </div>
      </main>

      <CustomModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="게시글 삭제"
        description="게시글을 삭제하면 복구할 수 없어요. 정말 삭제하시겠어요?"
        confirmText="삭제하기"
        cancelText="취소"
        type="danger"
      />
    </div>
  );
}
