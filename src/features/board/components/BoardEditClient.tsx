"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import {
  ChevronLeft,
  Check,
  Send,
  MapPin,
  LocateFixed,
  X,
} from "lucide-react";
import Footer from "@/components/layout/Footer";
import { CustomModal } from "@/components/common/CustomModal";
import RangePicker from "@/components/ui/RangePicker";
import SimpleTimePicker from "@/components/ui/SimpleTimePicker";
import KakaoMap from "@/components/common/KakaoMap";
import { ImageUploadButton } from "@/components/common/ImageUploadButton";
import { coordToAddress } from "@/lib/kakao-geocode";
import {
  mergeConditions,
  splitConditions,
  appendConditionLine,
  getTimeErrorMessage,
} from "../utils";
import { useAddressSearch } from "../hooks/useAddressSearch";
import {
  SERVICE_TYPES,
  BUDGET_PRESETS,
  SITTER_CONDITIONS,
} from "../constants";
import { updateRequest } from "../actions";
import type { Pet, PostData } from "../types";

export type { PostData };

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

type FormState = {
  service_type: string;
  budget: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  start_time: string;
  end_time: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  selected_pets: string[];
  title: string;
  content: string;
  conditions: string;
  image_urls: string[];
};

export default function BoardEditClient({
  id,
  initialData,
  initialPets,
}: {
  id: string;
  initialData?: PostData | null;
  initialPets?: Pet[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissedTimeError, setDismissedTimeError] = useState<string | null>(null);
  const [timeTouched, setTimeTouched] = useState(false);
  const [pets] = useState<Pet[]>(initialPets ?? []);
  const [form, setForm] = useState<FormState>({
    service_type: "",
    budget: "",
    startDate: undefined,
    endDate: undefined,
    start_time: "",
    end_time: "",
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
    handleAddressSearch,
    handleUseCurrentLocation,
  } = useAddressSearch(setForm);

  const handleMapClick = async (lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    const address = await coordToAddress(lat, lng);
    if (address) {
      setForm((prev) => ({ ...prev, location: address }));
    }
  };

  const formInitialized = useRef(false);

  useEffect(() => {
    if (formInitialized.current || !initialData) return;
    formInitialized.current = true;

    if (initialData.status === "matched") {
      // 최초 1회만 실행되는 초기화 (props로 받은 데이터를 폼에 반영)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMatched(true);
      return;
    }
    const start = new Date(initialData.start_datetime);
    const end = new Date(initialData.end_datetime);
    const split = splitConditions(initialData.content ?? "");
    setForm({
      service_type: initialData.request_type,
      budget: String(initialData.budget),
      startDate: start,
      endDate: end,
      start_time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
      end_time: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      location: initialData.location,
      latitude: initialData.latitude ?? null,
      longitude: initialData.longitude ?? null,
      selected_pets: initialData.pets ? [initialData.pets.id] : [],
      title: initialData.title,
      content: split.content,
      conditions: split.conditions,
      image_urls: initialData.image_urls,
    });
  }, [initialData]);

  const timeErrorMessage = getTimeErrorMessage(form.startDate, form.start_time, form.end_time);
  const showTimeErrorModal =
    timeTouched && !!timeErrorMessage && timeErrorMessage !== dismissedTimeError;

  const togglePet = (petId: string) =>
    setForm((prev) => ({
      ...prev,
      selected_pets: prev.selected_pets.includes(petId)
        ? prev.selected_pets.filter((p) => p !== petId)
        : [...prev.selected_pets, petId],
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
    if (!form.startDate) return;
    setIsSubmitting(true);

    const result = await updateRequest(id, {
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
    router.push(`/board/${id}`);
  };

  if (isMatched) {
    return (
      <>
        <main className="flex-1 bg-white min-h-screen flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-4">
            <p className="text-brown-900 text-lg font-semibold">
              예약 완료된 게시글은 수정할 수 없습니다.
            </p>
            <Link
              href={`/board/${id}`}
              className="h-11 px-6 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center"
            >
              상세 페이지로 돌아가기
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const canSubmit =
    !!form.title.trim() &&
    !!form.startDate &&
    !!form.service_type &&
    !timeErrorMessage;

  return (
    <>
      <main className="flex-1 bg-white min-h-screen pb-10">
        <div className="max-w-205 mx-auto px-4 sm:px-6 pt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 rounded-xl border border-orange-100 flex items-center justify-center text-brown-900 hover:bg-orange-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-brown-900">
                돌봄 요청 수정
              </h1>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`h-10 px-5 rounded-xl text-[15px] font-semibold flex items-center gap-1.5 bg-[var(--color-orange-500)] text-white transition-colors ${
                canSubmit && !isSubmitting ? "opacity-100" : "opacity-40"
              }`}
            >
              <Send className="w-3.75 h-3.75" />
              {isSubmitting ? "저장 중..." : "저장하기"}
            </button>
          </div>

          <div className="flex flex-col gap-4 pt-8">
            <div className="bg-white rounded-2xl border border-orange-100 p-7">
              <h2 className="text-lg font-semibold text-brown-900">
                어떤 돌봄이 필요하신가요?
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {SERVICE_TYPES.map(({ label, icon: Icon, value }) => {
                  const selected = form.service_type === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, service_type: value }))
                      }
                      className={`flex flex-col items-center justify-center gap-2 h-25 rounded-xl border transition-all ${
                        selected
                          ? "border-[var(--color-orange-500)] bg-orange-50"
                          : "border-orange-100 bg-white hover:border-[var(--color-orange-500)]/50"
                      }`}
                    >
                      <Icon
                        className={`w-5.5 h-5.5 ${selected ? "text-[var(--color-orange-500)]" : "text-brown-900"}`}
                      />
                      <span
                        className={`text-sm font-medium ${selected ? "text-[var(--color-orange-500)]" : "text-brown-900"}`}
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
                        setForm((prev) => ({ ...prev, budget: e.target.value }))
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
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-orange-100 p-4 sm:p-7">
              <h2 className="text-lg font-semibold text-brown-900">
                날짜 · 시간
              </h2>
              <div className="mt-5 p-3 sm:p-5 bg-orange-50 rounded-2xl border border-orange-100">
                <RangePicker
                  value={
                    { from: form.startDate, to: form.endDate } as DateRange
                  }
                  onChange={(range) => {
                    setTimeTouched(true);
                    setForm((prev) => ({
                      ...prev,
                      startDate: range?.from,
                      endDate: range?.to,
                    }));
                  }}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-brown-900">
                    시작 시간
                  </span>
                  <SimpleTimePicker
                    value={form.start_time}
                    onChange={(value) => {
                      setTimeTouched(true);
                      setForm((prev) => ({ ...prev, start_time: value }));
                    }}
                    placeholder="시작 시간 선택"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-brown-900">
                    종료 시간
                  </span>
                  <SimpleTimePicker
                    value={form.end_time}
                    onChange={(value) => {
                      setTimeTouched(true);
                      setForm((prev) => ({ ...prev, end_time: value }));
                    }}
                    placeholder="종료 시간 선택"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-orange-100 p-7">
              <h2 className="text-lg font-semibold text-brown-900">
                돌봄 장소
              </h2>

              <div className="relative mt-4">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                      latitude: null,
                      longitude: null,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddressSearch(form.location);
                    }
                  }}
                  placeholder="주소 검색 후 Enter"
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
            </div>

            <div className="bg-white rounded-2xl border border-orange-100 p-7">
              <h2 className="text-xl font-bold text-brown-900 mb-1">
                함께할 반려동물을 선택해주세요
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {pets.map((pet) => {
                  const isSelected = form.selected_pets.includes(pet.id);
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => togglePet(pet.id)}
                      className={`relative rounded-2xl border-2 overflow-hidden transition-all ${
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
                          <Image
                            src={pet.image_url}
                            alt={pet.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 33vw"
                            className="object-cover"
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
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-orange-100 p-7">
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
                      setForm((prev) => ({ ...prev, title: e.target.value }));
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
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="80px"
                        className="rounded-xl object-cover"
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

            <div className="bg-white rounded-2xl border border-orange-100 p-7">
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
