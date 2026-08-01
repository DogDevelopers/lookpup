"use client";

import { Fragment, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useBookingStore } from "@/stores/booking-store";
import Footer from "@/components/layout/Footer";
import { createPetsitterReservationRequest } from "@/features/reservations/actions";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  type Step1Values,
  type Step2Values,
  type Step3Values,
} from "../schema";
import type { BookedRange, Pet, SitterBookingInfo } from "../types";

// 네 스텝 모두 code split — StepDateSelect는 react-day-picker/date-fns를
// 물고 있어 초기 진입(1단계)에도 무거운 JS를 그대로 내려보내던 문제.
// SSR은 유지되므로(ssr:false 아님) 최초 페인트는 그대로 서버 렌더 HTML로 나가고,
// 해당 청크만 별도로 분리되어 book 페이지의 초기 JS 전송량이 줄어든다.
const StepDateSelect = dynamic(() => import("./StepDateSelect"));
const StepPetService = dynamic(() => import("./StepPetService"));
const StepNotes = dynamic(() => import("./StepNotes"));
const StepConfirm = dynamic(() => import("./StepConfirm"));

const STEP_LABELS = ["날짜 선택", "반려동물·서비스", "특이사항", "완료"];
const TOTAL_STEPS = 4;

export type ServiceKey = "visit" | "home" | "walk" | "pickup";

const SERVICE_KEY_TO_TYPE: Record<ServiceKey, string> = {
  visit: "방문돌봄",
  home: "위탁돌봄",
  walk: "산책",
  pickup: "픽업",
};

export { SERVICE_KEY_TO_TYPE };

interface BookingClientProps {
  sitterId: string;
  sitter?: SitterBookingInfo | null;
  sitterLoading?: boolean;
  bookedRanges?: BookedRange[];
  pets?: Pet[];
}

export default function BookingClient({
  sitterId,
  sitter = null,
  sitterLoading = false,
  bookedRanges = [],
  pets = [],
}: BookingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { dateRange, petIds } = useBookingStore();

  const step1Form = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    mode: "onChange",
    defaultValues: {
      dateRange: dateRange ?? { from: undefined, to: undefined },
      startTime: "",
      endTime: "",
    },
  });

  const step2Form = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { petIds: [], selectedService: "" },
  });

  const step3Form = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
    defaultValues: { note: "" },
  });

  // react-hook-form의 watch()는 메모이제이션 불가능한 함수를 반환하는 걸로 알려진 라이브러리 제약
  // eslint-disable-next-line react-hooks/incompatible-library
  const startTime = step1Form.watch("startTime") ?? "";
  const endTime = step1Form.watch("endTime") ?? "";
  const selectedService = (step2Form.watch("selectedService") ||
    null) as ServiceKey | null;

  async function handleNext() {
    if (step === 1) {
      const ok = await step1Form.trigger();
      if (!ok) return;
    }
    if (step === 2) {
      step2Form.setValue("petIds", petIds);
      const ok = await step2Form.trigger();
      if (!ok) return;
    }
    setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

  async function handleSubmit() {
    const ok = await step3Form.trigger();
    if (!ok || isSubmitting || !sitter || !dateRange?.from) return;

    setIsSubmitting(true);

    const start = new Date(dateRange.from);
    if (startTime) {
      const [h, m] = startTime.split(":").map(Number);
      start.setHours(h, m, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
    }

    const end = new Date(dateRange.to ?? dateRange.from);
    if (endTime) {
      const [h, m] = endTime.split(":").map(Number);
      end.setHours(h, m, 0, 0);
    } else {
      end.setHours(23, 59, 0, 0);
    }

    const matchedService =
      sitter.services.find(
        (s) => s.title === SERVICE_KEY_TO_TYPE[selectedService ?? "visit"],
      ) ?? sitter.services[0];

    if (!matchedService) {
      setIsSubmitting(false);
      toast.error("이용 가능한 서비스가 없습니다.");
      return;
    }

    const result = await createPetsitterReservationRequest({
      sitter_id: sitterId,
      service_id: matchedService.id,
      pet_ids: petIds,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      memo: step3Form.getValues("note"),
    });

    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setStep(4);
    setChatRoomId(result.data.room_id);
  }

  function canProceed(): boolean {
    if (step === 1) {
      if (!dateRange?.from) return false;
      if (startTime && endTime && startTime >= endTime) return false;
      const effectiveTime = startTime || "00:00";
      const [h, m] = effectiveTime.split(":").map(Number);
      const startDt = new Date(dateRange.from);
      startDt.setHours(h, m, 0, 0);
      if (startDt <= new Date()) return false;
      return true;
    }
    if (step === 2) return petIds.length > 0 && !!selectedService;
    return true;
  }

  if (sitterLoading) {
    return (
      <>
        <main className="flex-1 bg-white min-h-screen flex items-center justify-center">
          <p className="text-stone-400 text-sm">불러오는 중...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!sitter) {
    return (
      <>
        <main className="flex-1 bg-white min-h-screen flex items-center justify-center">
          <p className="text-stone-400 text-sm">
            시터 정보를 불러올 수 없습니다.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="flex-1 bg-white min-h-screen pb-28">
        <div className="max-w-205 mx-auto px-4 sm:px-6 pt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-10 h-10 rounded-xl border border-orange-100 flex items-center justify-center text-brown-900 hover:bg-orange-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-brown-900">
                {step === 4 ? "예약 완료" : "펫시터 예약"}
              </h1>
            </div>
            {step < 4 && (
              <span className="text-sm text-stone-500">
                {step} / {TOTAL_STEPS}
              </span>
            )}
          </div>

          {step < 4 && (
            <div className="flex items-start w-full pt-8">
              {STEP_LABELS.map((label, i) => {
                const num = i + 1;
                const isActive = step === num;
                const isDone = step > num;
                return (
                  <Fragment key={label}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                          isActive || isDone
                            ? "bg-orange-500 text-white"
                            : "border-2 border-orange-100 text-stone-500"
                        }`}
                      >
                        {isDone ? <Check className="size-3.5" /> : num}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs text-center leading-tight ${
                          isActive
                            ? "font-bold text-brown-900"
                            : "font-normal text-stone-500"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`flex-1 h-px mt-4 mx-2 ${isDone ? "bg-orange-500" : "bg-orange-100"}`}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          )}

          <div className="pt-8">
            {step === 1 && (
              <FormProvider {...step1Form}>
                <StepDateSelect sitter={sitter} bookedRanges={bookedRanges} />
              </FormProvider>
            )}
            {step === 2 && (
              <FormProvider {...step2Form}>
                <StepPetService
                  pets={pets}
                  sitterServices={sitter.services}
                  sitter={sitter}
                />
              </FormProvider>
            )}
            {step === 3 && (
              <FormProvider {...step3Form}>
                <StepNotes pets={pets} selectedService={selectedService} />
              </FormProvider>
            )}
            {step === 4 && (
              <StepConfirm
                sitter={sitter}
                pets={pets}
                selectedService={selectedService}
                chatRoomId={chatRoomId}
              />
            )}
          </div>
        </div>
      </main>

      {step < 4 && (
        <div className="sticky bottom-0 bg-white border-t border-orange-100 z-10">
          <div className="max-w-205 mx-auto flex items-center justify-between h-19 px-6">
            <button
              type="button"
              onClick={handleBack}
              className="h-11 px-6 rounded-xl border border-orange-100 flex items-center gap-1.5 text-stone-500 text-[15px] font-medium hover:bg-orange-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>

            <span className="text-sm text-stone-500">
              {step} / {TOTAL_STEPS}
            </span>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className={`h-11 px-6 rounded-xl flex items-center gap-1.5 text-[15px] font-semibold transition-colors ${
                  canProceed()
                    ? "bg-orange-500 text-white hover:opacity-90"
                    : "bg-orange-100 text-stone-500 cursor-default"
                }`}
              >
                다음 단계
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl bg-orange-500 text-white text-[15px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSubmitting ? "예약 중..." : "예약하기"}
              </button>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
