"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import LocationPickerWithMap, { type LocationValue } from "@/components/common/LocationPickerWithMap";
import SectionCard from "@/components/common/SectionCard";
import { SERVICES, ANIMALS, type SitterAnimalId } from "@/lib/sitter-options";
import { CAREER_OPTIONS } from "@/features/sitter-register/constants";
import { updateSitterProfile, type SitterServiceRow } from "@/features/sitter-register/actions";
import type { SitterDetail } from "@/features/petsitters/types";

type Tab = "intro" | "services" | "location";

const TABS: { id: Tab; label: string }[] = [
  { id: "intro", label: "소개" },
  { id: "services", label: "서비스" },
  { id: "location", label: "위치" },
];

interface ServiceFormRow {
  dbId?: string;
  title: string;
  enabled: boolean;
  price: string;
  description: string;
}

function buildInitialServices(existing: SitterServiceRow[]): ServiceFormRow[] {
  return SERVICES.map((option) => {
    const match = existing.find((s) => s.title === option.title);
    return {
      dbId: match?.id,
      title: option.title,
      enabled: !!match,
      price: match ? String(match.price) : "10000",
      description: match?.description ?? "",
    };
  });
}

const inputCls =
  "h-11 px-3 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300";

export default function SitterEditClient({
  sitter,
  initialServices,
}: {
  sitter: SitterDetail;
  initialServices: SitterServiceRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("intro");
  const [introduction, setIntroduction] = useState(sitter.introduction ?? "");
  const [career, setCareer] = useState(sitter.career ?? CAREER_OPTIONS[0].value);
  const [location, setLocation] = useState<LocationValue | null>(
    sitter.available_area
      ? {
          address: sitter.available_area,
          lat: sitter.latitude ?? 0,
          lng: sitter.longitude ?? 0,
          displayArea: sitter.display_area ?? sitter.available_area,
        }
      : null,
  );
  const [animals, setAnimals] = useState<SitterAnimalId[]>(
    sitter.available_animals as SitterAnimalId[],
  );
  const [services, setServices] = useState<ServiceFormRow[]>(() =>
    buildInitialServices(initialServices),
  );
  const [isPending, startTransition] = useTransition();

  const toggleAnimal = (id: SitterAnimalId) => {
    setAnimals((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const updateService = (index: number, patch: Partial<ServiceFormRow>) => {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const handleSave = () => {
    if (!location) {
      toast.error("활동 지역을 입력해주세요.");
      return;
    }
    if (animals.length === 0) {
      toast.error("돌봄 가능 동물을 1개 이상 선택해주세요.");
      return;
    }

    const deletedServiceIds = services
      .filter((s) => !s.enabled && s.dbId)
      .map((s) => s.dbId as string);

    startTransition(async () => {
      const result = await updateSitterProfile({
        introduction,
        career,
        availableArea: location.address,
        displayArea: location.displayArea,
        latitude: location.lat,
        longitude: location.lng,
        availableAnimals: animals,
        activityPhotoUrls: sitter.activity_photo_urls,
        services: services
          .filter((s) => s.enabled)
          .map((s) => ({
            id: s.dbId,
            title: s.title,
            price: Number(s.price) || 0,
            description: s.description,
          })),
        deletedServiceIds,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("프로필이 저장되었습니다.");
      router.push("/myprofile/sitter-profile");
    });
  };

  return (
    <div className="w-full max-w-[720px] mx-auto px-5 py-8 flex flex-col gap-5">
      <h1 className="text-xl font-bold text-stone-900">시터 프로필 수정</h1>

      <div className="flex gap-1 border-b border-orange-100">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-gray-500 hover:text-stone-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "intro" && (
        <SectionCard>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">소개글</span>
            <textarea
              value={introduction}
              onChange={(e) => setIntroduction(e.target.value)}
              maxLength={500}
              className="w-full h-32 p-3 rounded-xl border border-orange-100 text-sm outline-none focus:border-orange-300 resize-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">경력</span>
            <select
              value={career}
              onChange={(e) => setCareer(e.target.value)}
              className={inputCls}
            >
              {CAREER_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-gray-400">돌봄 가능 동물</span>
            <div className="grid grid-cols-2 gap-2">
              {ANIMALS.map(({ id, label }) => {
                const selected = animals.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleAnimal(id)}
                    className={`h-11 px-3 rounded-xl border-2 flex items-center gap-2 text-sm font-medium transition-colors ${
                      selected
                        ? "bg-orange-50 border-orange-500 text-orange-500"
                        : "bg-white border-orange-100 text-stone-900"
                    }`}
                  >
                    {selected && <Check size={14} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>
      )}

      {tab === "services" && (
        <SectionCard>
          {services.map((service, index) => (
            <div key={service.title} className="border border-orange-100 rounded-xl p-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => updateService(index, { enabled: !service.enabled })}
                className="flex items-center justify-between"
              >
                <span className="text-sm font-semibold text-stone-900">{service.title}</span>
                <span
                  className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                    service.enabled ? "bg-orange-500 justify-end" : "bg-gray-200 justify-start"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow" />
                </span>
              </button>
              {service.enabled && (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={service.price}
                    onChange={(e) =>
                      updateService(index, { price: e.target.value.replace(/[^0-9]/g, "") })
                    }
                    placeholder="가격(원)"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={service.description}
                    onChange={(e) => updateService(index, { description: e.target.value })}
                    placeholder="설명 (선택)"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          ))}
        </SectionCard>
      )}

      {tab === "location" && (
        <SectionCard>
          <LocationPickerWithMap value={location} onChange={setLocation} />
        </SectionCard>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/myprofile/sitter-profile")}
          className="flex-1 h-12 rounded-xl border border-orange-100 text-gray-500 text-sm font-medium hover:bg-orange-50 transition-colors"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
