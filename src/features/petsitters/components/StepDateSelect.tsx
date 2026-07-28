"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useBookingStore } from "@/stores/booking-store";
import { CustomModal } from "@/components/common/CustomModal";
import RangePicker from "@/components/ui/RangePicker";
import SimpleTimePicker from "@/components/ui/SimpleTimePicker";
import BookingSummary from "./BookingSummary";
import type { Step1Values } from "../schema";
import type { SitterBookingInfo, BookedRange } from "../types";

function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return "-";
  if (!range.to || range.from.getTime() === range.to.getTime()) {
    return format(range.from, "yyyy년 M월 d일 (EEE)", { locale: ko });
  }
  return `${format(range.from, "yyyy년 M월 d일", { locale: ko })} ~ ${format(range.to, "M월 d일 (EEE)", { locale: ko })}`;
}

function formatTime12h(value: string): string {
  if (!value) return "--:--";
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "오후" : "오전";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function StepDateSelect({
  sitter,
  bookedRanges,
}: {
  sitter: SitterBookingInfo;
  bookedRanges: BookedRange[];
}) {
  const { watch, setValue, formState: { errors } } = useFormContext<Step1Values>();
  const { dateRange, setDateRange } = useBookingStore();
  const startTime = watch("startTime") ?? "";
  const endTime = watch("endTime") ?? "";
  const timeErrorMessage = errors.startTime?.message ?? errors.endTime?.message ?? null;
  const [dismissedTimeError, setDismissedTimeError] = useState<string | null>(null);
  const showTimeErrorModal = !!timeErrorMessage && timeErrorMessage !== dismissedTimeError;

  const days = dateRange?.from && dateRange?.to
    ? Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1)
    : 1;

  function handleDateChange(range: DateRange | undefined) {
    setDateRange(range);
    setValue("dateRange", range as Step1Values["dateRange"]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-orange-100 p-4 sm:p-7">
        <h2 className="text-lg font-semibold text-brown-900 mb-5">
          날짜를 선택해주세요
        </h2>

        <div className="overflow-x-auto">
          <RangePicker value={dateRange} onChange={handleDateChange} bookedRanges={bookedRanges} />
        </div>

        {errors.dateRange && (
          <p className="mt-2 text-red-500 text-xs">{errors.dateRange.from?.message}</p>
        )}

        {dateRange?.from && (
          <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-orange-500 shrink-0" />
              <span className="text-orange-500 text-sm sm:text-base font-semibold">
                {formatDateRange(dateRange)}
              </span>
              {days > 1 && (
                <span className="ml-auto text-orange-500 text-sm font-medium shrink-0">
                  {days}일
                </span>
              )}
            </div>
            {(startTime || endTime) && (
              <div className="flex items-center gap-1.5 pl-6 text-sm text-stone-500">
                <span>시간</span>
                <span className="text-brown-900 font-medium">
                  {startTime ? formatTime12h(startTime) : "--:--"}
                </span>
                <span>~</span>
                <span className="text-brown-900 font-medium">
                  {endTime ? formatTime12h(endTime) : "--:--"}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brown-900">시작 시간</label>
            <SimpleTimePicker
              value={startTime}
              onChange={(v) => setValue("startTime", v, { shouldValidate: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-brown-900">종료 시간</label>
            <SimpleTimePicker
              value={endTime}
              onChange={(v) => setValue("endTime", v, { shouldValidate: true })}
            />
          </div>
        </div>
      </div>

      <BookingSummary
        rows={[
          { label: "펫시터", value: sitter.name },
        ]}
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
    </div>
  );
}
