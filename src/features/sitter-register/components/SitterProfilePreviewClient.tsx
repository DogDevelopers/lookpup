"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SectionCard from "@/components/common/SectionCard";
import Avatar from "@/components/ui/Avatar";
import SitterProfileCard from "@/components/common/SitterProfileCard";
import KakaoMap from "@/components/common/KakaoMap";
import Pill from "@/components/ui/Pill";
import { MapPin, ChevronLeft, Eye } from "lucide-react";
import StarRow from "@/components/ui/StarRow";
import StatGrid from "@/components/ui/StatGrid";
import { ImageLightbox } from "@/components/common/ImageGallery";
import type { SitterDetail } from "@/features/petsitters/types";

const TABS = ["소개", "서비스", "후기", "위치"] as const;
type Tab = (typeof TABS)[number];

export default function SitterProfilePreviewClient({ sitter }: { sitter: SitterDetail }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("소개");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const stats = [
    { label: "경력", value: sitter.career ?? "-" },
    { label: "완료", value: `${sitter.review_count}건` },
  ];

  const areaText = sitter.display_area ?? sitter.available_area ?? "-";
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({ r, count: 0 }));

  const renderTabContent = () => (
    <>
      {activeTab === "소개" && (
        <div className="flex flex-col gap-4">
          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-4">소개</h3>
            <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">
              {sitter.introduction ?? "소개글이 없습니다."}
            </p>
          </SectionCard>

          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-4">경력</h3>
            <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">
              {sitter.career ?? "등록된 경력 정보가 없습니다."}
            </p>
          </SectionCard>

          <SectionCard className="p-6 gap-0">
            <h3 className="font-bold text-stone-900 mb-4">사진</h3>
            {sitter.activity_photo_urls.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {sitter.activity_photo_urls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative aspect-square rounded-lg overflow-hidden focus:outline-none"
                  >
                    <Image
                      src={url}
                      alt={`사진 ${idx + 1}`}
                      fill
                      className="object-cover hover:opacity-90 transition-opacity"
                      sizes="200px"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">등록된 사진이 없습니다.</p>
            )}
          </SectionCard>

          <ImageLightbox
            urls={sitter.activity_photo_urls}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
          />
        </div>
      )}

      {activeTab === "서비스" && (
        <SectionCard className="p-6 gap-0">
          <h3 className="font-bold text-stone-900 mb-4">제공 서비스 및 가격</h3>
          {sitter.services.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sitter.services.map((sv, idx) => (
                <div key={idx} className="bg-orange-50 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-stone-900">{sv.title}</span>
                    {sv.description && <p className="text-xs text-gray-500 mt-1">{sv.description}</p>}
                  </div>
                  <span className="text-base font-bold text-orange-500 shrink-0">{sv.price.toLocaleString()}원~</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">등록된 서비스가 없습니다.</p>
          )}
        </SectionCard>
      )}

      {activeTab === "후기" && (
        <div className="flex flex-col gap-4">
          <SectionCard className="p-6 gap-0">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-5xl font-bold text-orange-500 mb-1">{sitter.rating.toFixed(1)}</p>
                <div className="flex items-center gap-0.5 justify-center mb-1">
                  <StarRow size={14} count={Math.round(sitter.rating)} />
                </div>
                <p className="text-xs text-gray-400">{sitter.review_count}개 리뷰</p>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {ratingCounts.map(({ r, count }) => (
                  <div key={r} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-6">{r}점</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: "0%" }} />
                    </div>
                    <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm">아직 후기가 없습니다.</div>
        </div>
      )}

      {activeTab === "위치" && (
        <SectionCard className="p-5 gap-0">
          <h3 className="text-stone-900 text-lg font-semibold mb-4">활동 지역</h3>
          {sitter.latitude != null && sitter.longitude != null ? (
            <div className="h-100 rounded-xl overflow-hidden">
              <KakaoMap
                markers={[{ lat: sitter.latitude, lng: sitter.longitude, id: sitter.id, certified: sitter.is_verified }]}
                center={{ lat: sitter.latitude, lng: sitter.longitude }}
                level={5}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">위치 정보가 없습니다.</p>
          )}
          <p className="mt-4 text-gray-500 text-sm flex items-center gap-1">
            <MapPin size={14} className="text-orange-500 shrink-0" />
            {areaText}
          </p>
        </SectionCard>
      )}
    </>
  );

  return (
    <>
      <div className="md:hidden flex flex-col bg-orange-50">
        <div className="px-5 pt-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-orange-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-stone-900" />
          </button>
        </div>

        <div className="px-5 pt-3 pb-5">
          <SitterProfileCard
            profile={{
              name: sitter.full_name ?? "-",
              initial: sitter.full_name?.[0] ?? "?",
              src: sitter.profile_image,
              verified: sitter.is_verified,
              location: areaText,
              rating: sitter.rating,
              reviewCount: sitter.review_count,
              services: sitter.services.map((s) => s.title ?? "-"),
              career: sitter.career ?? "-",
            }}
          />
        </div>

        <div className="bg-orange-50 border-b border-orange-100 px-5 sticky top-0 z-10">
          <div className="flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === tab ? "text-orange-500" : "text-gray-400"}`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 px-5 py-5 pb-24">{renderTabContent()}</div>

        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-orange-100 px-5 py-3">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-500/10 border border-orange-200 rounded-xl">
            <Eye size={15} className="text-orange-500 shrink-0" />
            <p className="text-xs text-orange-600 flex-1">이 페이지는 보호자에게 보이는 내 프로필 미리보기입니다.</p>
          </div>
        </div>
      </div>

      <main className="hidden md:flex flex-1 bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-10 py-12 w-full">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors w-fit mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base">뒤로 가기</span>
          </button>

          <div className="flex items-center gap-3 mb-8 px-4 py-3 bg-orange-500/10 border border-orange-200 rounded-xl">
            <Eye size={16} className="text-orange-500 shrink-0" />
            <p className="text-sm text-orange-600">이 페이지는 보호자에게 보이는 내 프로필 미리보기입니다.</p>
          </div>

          <div className="flex gap-8 items-start">
            <SectionCard className="w-85.25 shrink-0 items-center gap-0">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-4 bg-linear-to-br from-gray-100 to-gray-200">
                {sitter.profile_image ? (
                  <Image src={sitter.profile_image} alt={sitter.full_name ?? "-"} fill className="object-cover" sizes="342px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar initial={sitter.full_name?.[0] ?? "?"} size="2xl" variant="orange" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-stone-900 text-2xl font-bold">{sitter.full_name ?? "-"}</span>
                {sitter.is_verified && (
                  <span className="px-2 py-1 bg-orange-500 rounded-md text-white text-xs font-medium">인증</span>
                )}
              </div>

              <div className="flex items-center justify-center gap-1 text-gray-500 mb-3">
                <MapPin size={14} />
                <span className="text-sm">{areaText}</span>
              </div>

              <div className="flex items-center justify-center gap-1 mb-4">
                <StarRow size={18} count={Math.round(sitter.rating)} />
                <span className="text-stone-900 text-lg font-bold ml-1">{sitter.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({sitter.review_count})</span>
              </div>

              <div className="flex gap-2 flex-wrap justify-center mb-6">
                {sitter.services.map((s) => (
                  <Pill key={s.title}>{s.title}</Pill>
                ))}
              </div>

              <StatGrid stats={stats} className="w-full mb-6" />

              <div className="w-full h-13 bg-orange-500 text-white text-base font-semibold rounded-[10px] flex items-center justify-center">
                예약하기
              </div>
            </SectionCard>

            <div className="flex-1 min-w-0">
              <div className="border-b border-orange-100 flex gap-8 mb-6">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-lg font-semibold relative transition-colors ${activeTab === tab ? "text-orange-500" : "text-gray-400 hover:text-stone-900"}`}
                  >
                    {tab}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-t-full" />}
                  </button>
                ))}
              </div>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>

      <div className="h-16 md:hidden" />
    </>
  );
}
