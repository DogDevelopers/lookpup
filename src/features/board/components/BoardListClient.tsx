"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import Footer from "@/components/layout/Footer";
import LoadingPage from "@/components/common/LoadingPage";
import { SERVICE_TYPES } from "../constants";
import type { PostListItem } from "../types";

const CATEGORIES = ["전체", ...SERVICE_TYPES.map((s) => s.label)];

const ITEMS_PER_PAGE = 5;
const PAGE_WINDOW_SIZE = 5;

// 컬럼 헤더와 목록 행이 동일한 폭으로 정렬되도록 그리드 템플릿을 공유
const ROW_GRID_COLS = "sm:grid-cols-[100px_1fr_110px_150px_100px_90px_20px]";

function PostRow({ post, index = 0 }: { post: PostListItem; index?: number }) {
  return (
    <Link
      href={`/board/${post.id}`}
      style={{ animationDelay: `${0.2 + Math.min(index, 8) * 0.05}s` }}
      className={`animate-list-fade-in group grid grid-cols-[auto_1fr_auto] ${ROW_GRID_COLS} items-center gap-x-5 gap-y-1 px-3 sm:px-4 py-4 sm:py-5 hover:bg-orange-50/60 transition-colors`}
    >
      <span className="hidden sm:inline text-orange-500 text-xs font-medium bg-orange-50 rounded px-2 py-1 w-fit">
        {post.category}
      </span>

      <div className="min-w-0 col-span-2 sm:col-span-1">
        <div className="flex items-center gap-2 sm:hidden mb-1">
          <span className="text-orange-500 text-xs font-medium bg-orange-50 rounded px-2 py-0.5">
            {post.category}
          </span>
        </div>
        <p className="text-brown-900 text-base font-semibold truncate">
          {post.title}
        </p>
        <p className="text-stone-400 text-xs mt-0.5 truncate sm:hidden">
          {post.location} · {post.period}
        </p>
      </div>

      <span className="hidden sm:block text-stone-500 text-sm truncate">
        {post.location}
      </span>
      <span className="hidden sm:block text-stone-500 text-sm truncate">
        {post.period}
      </span>
      <span className="hidden sm:block text-orange-500 text-sm font-semibold truncate">
        {post.price}
      </span>
      <span className="hidden sm:block text-stone-400 text-xs truncate">
        {post.createdAt}
      </span>

      <div className="flex sm:hidden col-start-2 items-center justify-between text-xs">
        <span className="text-orange-500 font-semibold">{post.price}</span>
        <span className="text-stone-400">{post.createdAt}</span>
      </div>

      <ChevronRight className="hidden sm:block w-4 h-4 text-stone-300 group-hover:text-orange-400 transition-colors" />
    </Link>
  );
}

interface BoardListClientProps {
  posts?: PostListItem[];
  postsLoading?: boolean;
  isLoggedIn?: boolean;
}

export default function BoardListClient({
  posts = [],
  postsLoading = false,
  isLoggedIn = false,
}: BoardListClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(() => {
    const cat = searchParams.get("category");
    return cat && CATEGORIES.includes(cat) ? cat : "전체";
  });

  function handleCategoryChange(cat: string) {
    setActiveCategory(cat);
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "전체") {
      params.delete("category");
    } else {
      params.set("category", cat);
    }
    const qs = params.toString();
    router.replace(`/board${qs ? `?${qs}` : ""}`, { scroll: false });
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [prevFilters, setPrevFilters] = useState({ activeCategory, searchQuery });
  if (
    activeCategory !== prevFilters.activeCategory ||
    searchQuery !== prevFilters.searchQuery
  ) {
    setPrevFilters({ activeCategory, searchQuery });
    setCurrentPage(1);
  }

  function submitSearch() {
    setSearchQuery(searchInput);
  }

  const filtered = posts.filter((p) => {
    const matchCategory =
      activeCategory === "전체" || p.category === activeCategory;
    const matchSearch =
      searchQuery === "" ||
      p.title.includes(searchQuery) ||
      p.desc.includes(searchQuery);
    // 모집 완료(matched) 글은 구인게시판 목록에는 숨기되, 검색 중일 때는 계속 찾을 수 있어야 함
    const visible = searchQuery !== "" || p.status !== "matched";
    return matchCategory && matchSearch && visible;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  let windowStart = Math.max(1, safePage - Math.floor(PAGE_WINDOW_SIZE / 2));
  const windowEnd = Math.min(totalPages, windowStart + PAGE_WINDOW_SIZE - 1);
  windowStart = Math.max(1, windowEnd - PAGE_WINDOW_SIZE + 1);
  const pageNumbers = Array.from(
    { length: windowEnd - windowStart + 1 },
    (_, i) => windowStart + i,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-white">
        {postsLoading ? (
          <LoadingPage fullScreen />
        ) : (
          <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10 md:py-16">
            <div className="animate-list-fade-in text-center mb-14">
              <h1 className="text-3xl md:text-4xl font-bold text-brown-900">
                구인게시판
              </h1>
              <div className="w-10 h-[3px] bg-orange-500 rounded-full mx-auto mt-3" />
              <p className="text-stone-400 text-sm mt-3">
                펫시터를 찾거나 구인 정보를 확인하세요
              </p>
            </div>

            <nav
              aria-label="카테고리"
              style={{ animationDelay: "0.05s" }}
              className="animate-list-fade-in flex flex-wrap justify-center items-center gap-x-1 gap-y-2 mb-16"
            >
              {CATEGORIES.map((cat, i) => (
                <div key={cat} className="flex items-center">
                  {i > 0 && <span className="text-stone-200 mx-3 hidden sm:inline">|</span>}
                  <button
                    onClick={() => handleCategoryChange(cat)}
                    aria-current={activeCategory === cat}
                    className={`px-2 py-1 text-sm transition-colors ${
                      activeCategory === cat
                        ? "text-orange-500 font-semibold"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    {cat}
                  </button>
                </div>
              ))}
            </nav>

            <div
              style={{ animationDelay: "0.1s" }}
              className="animate-list-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"
            >
              <span className="text-stone-500 text-sm">
                총 {filtered.length}개의 구인글
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-initial flex items-center gap-1.5 min-w-0">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitSearch();
                    }}
                    placeholder="제목 또는 내용으로 검색"
                    aria-label="제목 또는 내용으로 검색"
                    className="flex-1 sm:w-80 min-w-0 h-8 px-3 bg-white border border-stone-200 rounded-md text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-400"
                  />
                  <button
                    onClick={submitSearch}
                    aria-label="검색"
                    className="shrink-0 h-8 px-3 bg-white border border-stone-200 rounded-md text-stone-500 hover:bg-stone-50 transition-colors flex items-center justify-center"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                <Link
                  href="/board/write"
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      e.preventDefault();
                      router.push("/auth/login");
                    }
                  }}
                  className="shrink-0 h-9 px-4 bg-orange-500 text-white text-sm font-semibold rounded-md flex items-center transition-colors hover:bg-orange-600"
                >
                  글쓰기
                </Link>
              </div>
            </div>

            <div
              style={{ animationDelay: "0.15s" }}
              className={`animate-list-fade-in hidden sm:grid ${ROW_GRID_COLS} gap-x-5 px-4 py-3 border-b border-orange-200 text-xs text-stone-400`}
            >
              <span>유형</span>
              <span>제목</span>
              <span>지역</span>
              <span>날짜</span>
              <span>금액</span>
              <span>등록일</span>
              <span />
            </div>

            <div className="border-t border-orange-200 sm:border-t-0 divide-y divide-orange-100 border-b border-orange-200">
              {paginated.length > 0 ? (
                paginated.map((post, i) => (
                  <PostRow key={post.id} post={post} index={i} />
                ))
              ) : (
                <div className="py-20 text-center text-stone-400 text-sm">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="이전 페이지"
                  className="text-stone-400 hover:text-stone-600 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCurrentPage(n)}
                    aria-current={n === safePage}
                    className={`text-sm transition-colors ${
                      n === safePage
                        ? "text-orange-500 font-bold"
                        : "text-stone-400 hover:text-stone-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={safePage === totalPages}
                  aria-label="다음 페이지"
                  className="text-stone-400 hover:text-stone-600 disabled:opacity-30 disabled:hover:text-stone-400 transition-colors flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
