"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import {
  ChevronLeft,
  Plus,
  Check,
  Save,
  Send,
  MapPin,
  LocateFixed,
  Download,
  X,
} from "lucide-react";
import Footer from "@/components/layout/Footer";
import { CustomModal } from "@/components/common/CustomModal";
import RangePicker from "@/components/ui/RangePicker";
import SimpleTimePicker from "@/components/ui/SimpleTimePicker";
import KakaoMap from "@/components/common/KakaoMap";
import { ImageUploadButton } from "@/components/common/ImageUploadButton";
import {
  searchAddressList,
  coordToAddress,
  coordToRegion,
  type AddressSuggestion,
} from "@/lib/kakao-geocode";
import { mergeConditions, appendConditionLine, getTimeErrorMessage } from "../utils";
import { useAddressSearch } from "../hooks/useAddressSearch";
import {
  SERVICE_TYPES,
  BUDGET_PRESETS,
  SITTER_CONDITIONS,
} from "../constants";
import { createRequest } from "../actions";
import type { Pet } from "../types";

function toDateTime(date: Date, time: string): string {
  const d = new Date(date);
  if (time) {
    const [h, m] = time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setSeconds(30, 0);
  }
  return d.toISOString();
}

const LOCATION_TABS = ["우리 집", "펫시터 집", "직접 입력"];

const TEMPLATES = [
  {
    label: "기본 산책 요청",
    text: "안녕하세요! 저희 아이 산책을 부탁드리고 싶어요.\n\n- 산책 시간: \n- 산책 코스/장소: \n- 주의사항: \n\n잘 부탁드립니다 :)",
  },
  {
    label: "장기 위탁 문의",
    text: "안녕하세요. 장기 위탁 돌봄을 문의드립니다.\n\n- 위탁 기간: \n- 식사/배변 습관: \n- 특이사항(질병·약 등): \n\n연락 기다리겠습니다.",
  },
];

type FormState = {
  service_type: string;
  budget: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  start_time: string;
  end_time: string;
  location_type: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  selected_pets: string[];
  title: string;
  content: string;
  conditions: string;
  image_urls: string[];
};

interface BoardWriteClientProps {
  // TODO: 로그인 여부 확인 후 리다이렉트, features/pet-register 이식 후 pets 실데이터 조회.
  userId?: string;
  pets?: Pet[];
  userLocation?: { lat: number; lng: number } | null;
}

export default function BoardWriteClient({
  userId,
  pets = [],
  userLocation = null,
}: BoardWriteClientProps) {
  const router = useRouter();

  const draftKey = userId ? `board-write-draft:${userId}` : null;
  const [hasDraft, setHasDraft] = useState(false);
  const [draftHidden, setDraftHidden] = useState(false);

  useEffect(() => {
    if (!draftKey) return;
    // localStorage는 브라우저 전용 API라 SSR 중엔 못 읽어서 effect가 맞는 위치
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasDraft(localStorage.getItem(draftKey) !== null);
  }, [draftKey]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissedTimeError, setDismissedTimeError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    service_type: "",
    budget: "",
    startDate: undefined,
    endDate: undefined,
    start_time: "",
    end_time: "",
    location_type: "우리 집",
    location: "",
    latitude: null,
    longitude: null,
    selected_pets: [],
    title: "",
    content: "",
    conditions: "",
    image_urls: [],
  });

  const {
    addressSearching,
    searchError,
    locationError,
    setSearchError,
    setLocationError,
    handleAddressSearch,
    handleUseCurrentLocation,
  } = useAddressSearch(setForm);

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLocationChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      location: value,
      latitude: null,
      longitude: null,
    }));
    setSearchError(null);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      const list = await searchAddressList(query);
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    }, 300);
  };

  const handleSelectSuggestion = (s: AddressSuggestion) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    setForm((prev) => ({
      ...prev,
      location: s.addressName,
      latitude: s.lat,
      longitude: s.lng,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
    setLocationError(null);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setShowSuggestions(false);
    setSearchError(null);
    setLocationError(null);
    const address = await coordToAddress(lat, lng);
    if (address) {
      setForm((prev) => ({ ...prev, location: address }));
    }
  };

  const handleLocationTypeChange = async (tab: string) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
    setLocationError(null);

    if (tab === "우리 집") {
      if (!userLocation) {
        setForm((prev) => ({
          ...prev,
          location_type: tab,
          location: "",
          latitude: null,
          longitude: null,
        }));
        setLocationError("등록된 주소가 없어요. 마이페이지에서 위치를 먼저 설정해주세요.");
        return;
      }
      const region = await coordToRegion(userLocation.lat, userLocation.lng);
      setForm((prev) => ({
        ...prev,
        location_type: tab,
        location: region ? `${region.sido} ${region.sigungu} ${region.dong}` : "우리 집",
        latitude: userLocation.lat,
        longitude: userLocation.lng,
      }));
      if (!region) {
        setLocationError("정확한 지역명을 불러오지 못했어요.");
      }
      return;
    }

    if (tab === "펫시터 집") {
      setForm((prev) => ({
        ...prev,
        location_type: tab,
        location: "펫시터 집",
        latitude: null,
        longitude: null,
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      location_type: tab,
      location: "",
      latitude: null,
      longitude: null,
    }));
  };

  const timeErrorMessage = getTimeErrorMessage(form.startDate, form.start_time, form.end_time);
  const showTimeErrorModal = !!timeErrorMessage && timeErrorMessage !== dismissedTimeError;

  const canSubmit = () =>
    !!form.service_type &&
    !!form.startDate &&
    form.selected_pets.length > 0 &&
    !!form.title.trim() &&
    !!form.content.trim() &&
    !timeErrorMessage;

  const handleSaveDraft = () => {
    if (!draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify(form));
    setHasDraft(true);
    setDraftHidden(false);
  };

  const handleLoadDraft = () => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      setHasDraft(false);
      return;
    }
    try {
      const saved = JSON.parse(raw) as FormState;
      setForm({
        ...saved,
        startDate: saved.startDate ? new Date(saved.startDate) : undefined,
        endDate: saved.endDate ? new Date(saved.endDate) : undefined,
        conditions: Array.isArray(saved.conditions)
          ? (saved.conditions as string[]).map((c) => `- ${c}`).join("\n")
          : (saved.conditions ?? ""),
      });
    } catch {
      // 손상된 초안은 무시
    }
    setDraftHidden(true);
  };

  const togglePet = (id: string) =>
    setForm((prev) => ({
      ...prev,
      selected_pets: prev.selected_pets.includes(id)
        ? prev.selected_pets.filter((p) => p !== id)
        : [...prev.selected_pets, id],
    }));

  const appendCondition = (sentence: string) =>
    setForm((prev) => ({
      ...prev,
      conditions: appendConditionLine(prev.conditions, sentence),
    }));

  const addImage = (url: string) =>
    setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, url] }));

  const removeImage = (url: string) =>
    setForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((u) => u !== url),
    }));

  const handleSubmit = async () => {
    if (!form.startDate || !canSubmit()) return;
    setIsSubmitting(true);

    const result = await createRequest({
      title: form.title,
      content: mergeConditions(form.content, form.conditions),
      request_type: form.service_type,
      budget: form.budget ? Number(form.budget) : null,
      start_datetime: toDateTime(form.startDate, form.start_time),
      end_datetime: toDateTime(form.endDate ?? form.startDate, form.end_time),
      location: form.location,
      latitude: form.latitude,
      longitude: form.longitude,
      pet_id: form.selected_pets[0] ?? null,
      sitter_conditions: [],
      image_urls: form.image_urls,
    });

    setIsSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }
    if (draftKey) localStorage.removeItem(draftKey);
    router.push("/board");
  };

  return (
    <>
      <div className="flex flex-col">
      <main className="flex-1 bg-white min-h-screen pb-28">
        <div className="max-w-205 mx-auto px-4 sm:px-6 pt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl border border-orange-100 flex items-center justify-center text-brown-900 hover:bg-orange-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-brown-900">
                돌봄 요청 게시글 작성
              </h1>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {hasDraft && !draftHidden && (
                <button
                  onClick={handleLoadDraft}
                  className="h-10 px-5 rounded-xl border border-[var(--color-orange-500)]/40 text-[var(--color-orange-500)] text-[15px] font-medium flex items-center gap-1.5 hover:bg-orange-50 active:scale-95 transition-all"
                >
                  <Download className="w-3.75 h-3.75" />
                  불러오기
                </button>
              )}
              <button
                onClick={handleSaveDraft}
                className="h-10 px-5 rounded-xl border border-[var(--color-orange-500)]/40 text-brown-900 text-[15px] font-medium flex items-center gap-1.5 hover:bg-orange-50 active:scale-95 transition-all"
              >
                <Save className="w-3.75 h-3.75" />
                임시저장
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit() || isSubmitting}
                className={`h-10 px-5 rounded-xl text-[15px] font-semibold flex items-center gap-1.5 bg-[var(--color-orange-500)] text-white transition-colors ${
                  canSubmit() && !isSubmitting ? "opacity-100" : "opacity-40"
                }`}
              >
                <Send className="w-3.75 h-3.75" />
                {isSubmitting ? "등록 중..." : "게시하기"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 pt-8">
            <div className="bg-white rounded-xl border border-orange-100 p-7">
              <h2 className="text-lg font-semibold text-brown-900">
                어떤 돌봄이 필요하신가요?
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {SERVICE_TYPES.map(({ label, icon: Icon, value }) => {
                  const selected = form.service_type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, service_type: value }))
                      }
                      className={`flex flex-col items-center justify-center gap-1.5 h-18 rounded-xl border transition-all ${
                        selected
                          ? "border-[var(--color-orange-500)] bg-orange-50"
                          : "border-orange-100 bg-white hover:border-[var(--color-orange-500)]/50"
                      }`}
                    >
                      <Icon
                        className={`w-4.5 h-4.5 ${selected ? "text-[var(--color-orange-500)]" : "text-brown-900"}`}
                      />
                      <span
                        className={`text-xs font-medium ${selected ? "text-[var(--color-orange-500)]" : "text-brown-900"}`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-orange-100 mt-6 pt-6">
                <h3 className="text-lg font-semibold text-brown-900">
                  예산을 입력해주세요
                </h3>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-full sm:w-80 h-12 flex items-center px-4 border border-orange-100 rounded-xl overflow-hidden">
                    <input
                      type="number"
                      value={form.budget}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          budget: e.target.value,
                        }))
                      }
                      placeholder="0"
                      min={0}
                      className="w-full text-lg text-stone-500 placeholder:text-stone-500 outline-none bg-transparent"
                    />
                  </div>
                  <span className="text-[15px] font-medium text-brown-900">
                    원
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {BUDGET_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          budget: String(amount),
                        }))
                      }
                      className={`h-8.5 px-4 rounded-full border text-sm transition-colors ${
                        form.budget === String(amount)
                          ? "bg-[var(--color-orange-500)] text-white border-[var(--color-orange-500)]"
                          : "bg-orange-50 text-brown-900 border-orange-100 hover:border-[var(--color-orange-500)]/50"
                      }`}
                    >
                      {amount.toLocaleString()}원
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, budget: "" }))}
                    className={`h-8.5 px-4 rounded-full border text-sm transition-colors ${
                      form.budget === ""
                        ? "bg-[var(--color-orange-500)] text-white border-[var(--color-orange-500)]"
                        : "bg-orange-50 text-brown-900 border-orange-100 hover:border-[var(--color-orange-500)]/50"
                    }`}
                  >
                    협의 가능
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-orange-100 p-4 sm:p-7">
              <h2 className="text-lg font-semibold text-brown-900">
                날짜 · 시간
              </h2>

              <div className="mt-5 p-3 sm:p-5 bg-orange-50 rounded-xl border border-orange-100">
                <RangePicker
                  value={
                    { from: form.startDate, to: form.endDate } as DateRange
                  }
                  onChange={(range) =>
                    setForm((prev) => ({
                      ...prev,
                      startDate: range?.from,
                      endDate: range?.to,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-brown-900">
                    시작 시간
                  </span>
                  <SimpleTimePicker
                    value={form.start_time}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, start_time: value }))
                    }
                    placeholder="시작 시간 선택"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-brown-900">
                    종료 시간
                  </span>
                  <SimpleTimePicker
                    value={form.end_time}
                    onChange={(value) =>
                      setForm((prev) => ({ ...prev, end_time: value }))
                    }
                    placeholder="종료 시간 선택"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-orange-100 p-7">
              <h2 className="text-lg font-semibold text-brown-900">
                돌봄 장소
              </h2>

              <div className="flex gap-2 mt-4">
                {LOCATION_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleLocationTypeChange(tab)}
                    className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${
                      form.location_type === tab
                        ? "bg-[var(--color-orange-500)] text-white"
                        : "border border-orange-100 text-stone-500 bg-white hover:bg-orange-50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {form.location_type === "직접 입력" ? (
                <>
                  <div className="relative mt-3">
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 150)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setShowSuggestions(false);
                          handleAddressSearch(form.location);
                        } else if (e.key === "Escape") {
                          setShowSuggestions(false);
                        }
                      }}
                      placeholder="도로명 주소를 입력하면 추천이 떠요"
                      className="w-full h-12 pl-9 pr-20 bg-white border border-orange-100 rounded-xl text-brown-900 placeholder:text-stone-400 outline-none focus:border-[var(--color-orange-500)] transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddressSearch(form.location)}
                      disabled={addressSearching}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-3 rounded-lg bg-[var(--color-orange-500)] text-white text-xs font-medium disabled:opacity-50 transition-opacity"
                    >
                      검색
                    </button>

                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-60 overflow-y-auto bg-white border border-orange-100 rounded-xl shadow-lg py-1">
                        {suggestions.map((s, i) => (
                          <li key={`${s.addressName}-${i}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectSuggestion(s);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors"
                            >
                              <div className="text-sm text-brown-900">
                                {s.roadAddress ?? s.addressName}
                              </div>
                              {s.jibunAddress &&
                                s.jibunAddress !== s.roadAddress && (
                                  <div className="text-xs text-stone-400 mt-0.5">
                                    {s.jibunAddress}
                                  </div>
                                )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <p className="text-stone-400 text-xs mt-2">
                    도로명 주소를 입력하거나, 지도를 누르거나 마커를 드래그해 위치를
                    지정하세요.
                  </p>

                  <div className="relative w-full h-56 rounded-xl overflow-hidden border border-orange-100 mt-3">
                    <KakaoMap
                      markers={
                        form.latitude !== null && form.longitude !== null
                          ? [
                              {
                                id: "selected-location",
                                lat: form.latitude,
                                lng: form.longitude,
                                name: form.location || "선택한 위치",
                              },
                            ]
                          : []
                      }
                      center={
                        form.latitude !== null && form.longitude !== null
                          ? { lat: form.latitude, lng: form.longitude }
                          : { lat: 37.5665, lng: 126.978 }
                      }
                      level={4}
                      className="w-full h-full"
                      onMapClick={handleMapClick}
                      draggable
                      onMarkerDragEnd={handleMapClick}
                    />
                    {form.latitude === null && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-9 h-9 bg-[var(--color-orange-500)] rounded-full flex items-center justify-center shadow-md">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <span className="px-3 py-1 bg-white rounded-full text-xs text-brown-900 shadow-sm">
                            위치를 검색해주세요
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {(searchError || locationError) && (
                    <p className="text-red-500 text-xs mt-3">
                      {searchError ?? locationError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={addressSearching}
                    className="flex items-center gap-1.5 text-[var(--color-orange-500)] text-sm font-medium mt-3 hover:opacity-80 disabled:opacity-50 transition-opacity"
                  >
                    <LocateFixed className="w-4 h-4" />
                    {addressSearching ? "위치 확인 중..." : "현재 위치 사용"}
                  </button>

                  <p className="text-xs text-stone-400 mt-2">
                    개인정보 보호를 위해 좌표는 약 100m 오차 내로 저장돼요. 지도 핀
                    위치가 입력한 주소와 약간 다르게 보일 수 있어요.
                  </p>
                </>
              ) : (
                <div className="mt-4 flex items-center gap-2 px-4 py-3.5 bg-orange-50 rounded-xl">
                  <MapPin className="w-4 h-4 text-[var(--color-orange-500)] shrink-0" />
                  <p className="text-sm text-brown-900">
                    {form.location_type === "우리 집"
                      ? form.location || "위치를 불러오는 중이에요"
                      : "펫시터 자택에서 진행돼요. 매칭 후 정확한 주소를 공유해주세요."}
                  </p>
                </div>
              )}

              {locationError && form.location_type !== "직접 입력" && (
                <p className="text-red-500 text-xs mt-2">{locationError}</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-orange-100 p-7">
              <h2 className="text-xl font-bold text-brown-900 mb-1">
                함께할 반려동물을 선택해주세요
              </h2>
              <p className="text-stone-400 text-sm mb-5">
                등록된 반려동물 중 선택하거나 새로 등록하세요
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pets.map((pet) => {
                  const isSelected = form.selected_pets.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => togglePet(pet.id)}
                      className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                        isSelected
                          ? "border-[var(--color-orange-500)]"
                          : "border-orange-100 hover:border-[var(--color-orange-500)]/50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--color-orange-500)] rounded-full flex items-center justify-center z-10">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="relative bg-orange-50 h-30 flex items-center justify-center">
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-white border border-orange-100 rounded-full text-xs font-medium text-[var(--color-orange-500)] z-10">
                          {pet.type}
                        </span>
                        {pet.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pet.image_url}
                            alt={pet.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl">{pet.emoji}</span>
                        )}
                      </div>
                      <div className="py-3 text-center">
                        <div className="text-brown-900 text-base font-bold">
                          {pet.name}
                        </div>
                        <div className="text-stone-400 text-xs mt-0.5">
                          {pet.age}살 · {pet.weight}kg
                        </div>
                      </div>
                    </button>
                  );
                })}

                <Link
                  href="/pet-register"
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-orange-100 hover:border-[var(--color-orange-500)]/50 transition-colors text-stone-400 hover:text-[var(--color-orange-500)] min-h-35"
                >
                  <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">새 반려동물 등록</span>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-orange-100 p-7">
              <div className="flex flex-col gap-2 mb-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-brown-900">
                    게시글 제목
                  </label>
                  <span className="text-xs text-stone-400">
                    {form.title.length} / 50
                  </span>
                </div>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    if (e.target.value.length <= 50)
                      setForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }));
                  }}
                  placeholder="예: 이번 주말 강아지 산책 펫시터 구해요"
                  className="w-full h-12 px-4 bg-white border border-orange-100 rounded-xl text-brown-900 placeholder:text-stone-400 outline-none focus:border-[var(--color-orange-500)] transition"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-brown-900">
                    상세 내용
                  </label>
                  <span className="text-xs text-stone-400">
                    {form.content.length} / 500
                  </span>
                </div>
                <p className="text-xs text-stone-400 -mt-1">
                  펫시터에게 전달할 내용을 자유롭게 작성하세요
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-stone-400">
                    템플릿으로 시작하기
                  </span>
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          content: t.text.slice(0, 500),
                        }))
                      }
                      className="px-3 py-1 rounded-full text-xs font-medium border border-orange-100 text-stone-500 hover:border-[var(--color-orange-500)]/50 hover:text-[var(--color-orange-500)] transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={form.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 500)
                      setForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }));
                  }}
                  placeholder="펫시터에게 전달하고 싶은 내용을 입력해주세요"
                  rows={7}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-xl text-brown-900 placeholder:text-stone-400 outline-none resize-none focus:border-[var(--color-orange-500)] transition mt-1"
                />
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <label className="text-sm font-bold text-brown-900">
                  사진
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {form.image_urls.map((url) => (
                    <div key={url} className="relative w-20 h-20 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        aria-label="사진 삭제"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-brown-900 text-white flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {form.image_urls.length < 5 && (
                    <ImageUploadButton multiple maxFiles={5 - form.image_urls.length} onUploaded={addImage} />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-orange-100 p-7">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-brown-900 flex items-center gap-2">
                    펫시터 조건
                    <span className="px-2 py-0.5 bg-orange-50 rounded-full text-xs font-medium text-[var(--color-orange-500)]">
                      선택
                    </span>
                  </label>
                  <span className="text-xs text-stone-400">
                    {form.conditions.length} / 500
                  </span>
                </div>
                <p className="text-xs text-stone-400 -mt-1">
                  원하는 펫시터 조건을 자유롭게 작성하세요
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-stone-400">조건 추가하기</span>
                  {SITTER_CONDITIONS.map((condition) => (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => appendCondition(condition)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-orange-100 text-stone-500 hover:border-[var(--color-orange-500)]/50 hover:text-[var(--color-orange-500)] transition-colors"
                    >
                      {condition}
                    </button>
                  ))}
                </div>
                <textarea
                  value={form.conditions}
                  onChange={(e) => {
                    if (e.target.value.length <= 500)
                      setForm((prev) => ({
                        ...prev,
                        conditions: e.target.value,
                      }));
                  }}
                  placeholder="예: - 책임감 있고 성실하신 분"
                  rows={6}
                  className="w-full px-4 py-3 bg-white border border-orange-100 rounded-xl text-brown-900 placeholder:text-stone-400 outline-none resize-none focus:border-[var(--color-orange-500)] transition mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 bg-white border-t border-orange-100 z-10">
        <div className="max-w-205 mx-auto flex items-center justify-end h-19 px-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting}
            className={`h-11 px-6 rounded-xl flex items-center gap-1.5 text-[15px] font-semibold bg-[var(--color-orange-500)] text-white transition-colors ${
              canSubmit() && !isSubmitting
                ? "opacity-100 hover:bg-orange-600"
                : "opacity-40"
            }`}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "등록 중..." : "게시하기"}
          </button>
        </div>
      </div>
      </div>

      <Footer />

      <CustomModal
        open={!!errorMessage}
        type="error"
        title="오류가 발생했습니다."
        description={errorMessage ?? undefined}
        confirmText="확인"
        onConfirm={() => setErrorMessage(null)}
        onClose={() => setErrorMessage(null)}
        showCloseButton={false}
      />

      <CustomModal
        open={showTimeErrorModal}
        type="error"
        title="시간을 확인해주세요"
        description={timeErrorMessage ?? undefined}
        confirmText="확인"
        onConfirm={() => setDismissedTimeError(timeErrorMessage)}
        onClose={() => setDismissedTimeError(timeErrorMessage)}
        showCloseButton={false}
      />
    </>
  );
}
