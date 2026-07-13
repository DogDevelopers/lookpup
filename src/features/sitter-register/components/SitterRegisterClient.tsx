"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CustomModal } from "@/components/common/CustomModal";
import { Progress } from "@/components/ui/progress";
import { createSitter } from "../actions";
import { useSitterRegisterForm } from "../hooks/useSitterRegisterForm";
import SitterRegisterStep1 from "./SitterRegisterStep1";
import SitterRegisterStep2 from "./SitterRegisterStep2";
import SitterRegisterStep3 from "./SitterRegisterStep3";
import type { SitterRegisterFormValues } from "../types";

export default function SitterRegisterClient() {
  const router = useRouter();
  const { form, step, goNext, goPrev, totalSteps } = useSitterRegisterForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const handleSubmit = form.handleSubmit(async (values: SitterRegisterFormValues) => {
    if (!values.location) {
      setSubmitError("활동 지역을 검색해주세요.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // TODO: 사진 업로드(Cloudinary) 연동 후 프로필/자격증/활동 사진 전달.
    const result = await createSitter({
      introduction: values.introduction,
      career: values.career,
      location: values.location,
      selectedServices: values.selectedServices,
      selectedAnimals: values.selectedAnimals,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    setShowApprovalModal(true);
  });

  const goToMyProfile = () => router.push("/myprofile");

  return (
    <>
      <Progress
        value={(step / totalSteps) * 100}
        className="h-1 rounded-none bg-orange-100 [&>div]:bg-orange-500 [&>div]:transition-all [&>div]:duration-500"
      />

      <main className="flex-1 bg-[#fff8f3] min-h-screen pb-28">
        <div className="max-w-205 mx-auto px-6 pt-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-xl border border-[#ffe9d6] flex items-center justify-center text-[#281a0e] hover:bg-[#fff8f3] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-[#281a0e]">펫시터 등록</h1>
          </div>

          <div className="flex flex-col gap-4 pt-8">
            {step === 1 && <SitterRegisterStep1 form={form} />}
            {step === 2 && <SitterRegisterStep2 form={form} />}
            {step === 3 && (
              <SitterRegisterStep3
                form={form}
                submitError={submitError}
              />
            )}
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 bg-white border-t border-[#ffe9d6] z-10">
        <div className="max-w-205 mx-auto flex items-center justify-between h-19 px-6">
          <button
            type="button"
            onClick={() => (step > 1 ? goPrev() : window.history.back())}
            className="h-11 px-6 rounded-xl border border-[#ffe9d6] flex items-center gap-1.5 text-gray-500 text-[15px] font-medium hover:bg-[#fff8f3] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            이전
          </button>

          <span className="text-sm text-gray-500">
            {step} / {totalSteps}
          </span>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={goNext}
              className="h-11 px-6 rounded-xl bg-[var(--color-orange-500)] text-white text-[15px] font-semibold flex items-center gap-1.5 hover:bg-orange-600 transition-colors"
            >
              다음 단계
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl bg-[var(--color-orange-500)] text-white text-[15px] font-semibold flex items-center gap-1.5 hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "등록 중..." : "등록 완료"}
            </button>
          )}
        </div>
      </div>

      <CustomModal
        open={showApprovalModal}
        preset="sitterRegisterPending"
        onClose={goToMyProfile}
        onConfirm={goToMyProfile}
      />
    </>
  );
}
