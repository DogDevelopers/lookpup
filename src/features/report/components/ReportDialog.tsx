"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CustomModal } from "@/components/common/CustomModal";
import { createReport } from "@/features/report/actions";
import type { ReportCreateInput } from "@/features/report/schema";

export const REPORT_REASONS = ["부적절한 언행", "허위 정보", "예약 불이행", "반려동물 학대 의심", "사기 의심", "기타"];

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportCreateInput["target_type"];
  targetId: string;
  targetLabel?: string;
};

export function ReportDialog({ open, onOpenChange, targetType, targetId, targetLabel }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isValid = selectedReason !== "";

  const reset = () => {
    setSelectedReason("");
    setContent("");
    setSubmitError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await createReport({
      target_type: targetType,
      target_id: targetId,
      reason: selectedReason,
      content: content || null,
      image_urls: [],
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    toast.success("신고가 접수되었습니다.");
    reset();
    onOpenChange(false);
  };

  return (
    <CustomModal
      open={open}
      onClose={handleClose}
      onConfirm={handleSubmit}
      type="report"
      title="신고하기"
      description={targetLabel ? `"${targetLabel}"에 대해 신고합니다.` : undefined}
      confirmText={isSubmitting ? "접수 중..." : "신고 접수"}
      cancelText="취소"
    >
      <div className="flex flex-col gap-4">
        <fieldset>
          <legend className="sr-only">신고 사유</legend>
          <div className="flex flex-col gap-2">
            {REPORT_REASONS.map((reason) => (
              <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="report-reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
                <span className="text-stone-900 text-sm leading-5 group-hover:text-orange-600 transition-colors">
                  {reason}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 1000))}
          placeholder="추가 내용을 직접 입력해 주세요. (선택)"
          rows={4}
          className="w-full px-4 py-3 bg-orange-50 rounded-xl outline outline-1 outline-offset-[-1px] outline-orange-100 text-sm text-stone-900 placeholder:text-stone-400 leading-5 resize-none focus:outline-orange-300 transition-colors"
        />

        {submitError && <p className="text-sm text-red-500">{submitError}</p>}
      </div>
    </CustomModal>
  );
}
