"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";
import SectionCard from "@/components/common/SectionCard";
import { deleteUser, signOut } from "@/features/auth/actions";
import { WITHDRAW_REASONS } from "@/lib/constants";

export default function WithdrawClient() {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleWithdraw = () => {
    if (!reason) return;
    startTransition(async () => {
      const result = await deleteUser(reason, detail || undefined);
      if (!result.ok) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      setDone(true);
    });
  };

  if (done) {
    return (
      <SectionCard className="items-center text-center gap-3 py-10">
        <p className="text-lg font-bold text-stone-900">탈퇴가 완료되었습니다</p>
        <p className="text-sm text-gray-500">그동안 이용해주셔서 감사합니다.</p>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-4 h-12 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
        >
          메인으로 이동
        </button>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="gap-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <div>
          <h1 className="font-semibold text-stone-900 mb-1">정말 탈퇴하시겠어요?</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            탈퇴 후에도 같은 계정으로 다시 로그인하면 복구할 수 있어요. 단, 보안을 위해
            본인인증을 다시 진행해야 합니다.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {WITHDRAW_REASONS.map(({ value, label }) => (
          <label
            key={value}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
              reason === value
                ? "border-orange-500 bg-orange-50"
                : "border-gray-100 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="withdraw-reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="accent-orange-500"
            />
            <span className="text-sm text-stone-900">{label}</span>
          </label>
        ))}
      </div>

      {reason === "other" && (
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="자세한 사유를 알려주세요 (선택)"
          maxLength={500}
          className="w-full h-24 p-3 rounded-xl border border-gray-100 text-sm outline-none focus:border-orange-300 resize-none"
        />
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="accent-orange-500"
        />
        <span className="text-sm text-gray-600">위 내용을 확인했으며 탈퇴에 동의합니다.</span>
      </label>

      {!confirming ? (
        <button
          type="button"
          disabled={!reason || !agreed}
          onClick={() => setConfirming(true)}
          className="w-full h-14 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-base font-medium transition-colors"
        >
          회원탈퇴
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-500 text-center">
            정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 h-12 rounded-xl border border-gray-100 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={isPending}
              className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={16} />
              {isPending ? "처리 중..." : "탈퇴 확정"}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
