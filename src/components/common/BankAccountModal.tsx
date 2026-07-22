"use client";

import { useState } from "react";
import { CustomModal } from "@/components/common/CustomModal";
import { upsertBankAccount } from "@/lib/bank-account/actions";
import type { BankAccount } from "@/lib/bank-account/schema";

const BANK_LIST = [
  "국민은행", "신한은행", "우리은행", "하나은행", "농협은행",
  "기업은행", "카카오뱅크", "토스뱅크", "케이뱅크", "SC제일은행",
  "씨티은행", "수협은행", "부산은행", "대구은행", "경남은행",
  "광주은행", "전북은행", "제주은행",
];

function initialForm(account: BankAccount | null) {
  return {
    bankName: account?.bankName ?? "",
    accountNumber: account?.accountNumber ?? "",
    accountHolder: account?.accountHolder ?? "",
  };
}

export default function BankAccountModal({
  open,
  initialBankAccount,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialBankAccount: BankAccount | null;
  onClose: () => void;
  onSaved: (account: BankAccount) => void;
}) {
  const [form, setForm] = useState(() => initialForm(initialBankAccount));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(initialForm(initialBankAccount));
      setError("");
    }
  }

  const handleSave = async () => {
    if (!form.bankName || !form.accountNumber || !form.accountHolder) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await upsertBankAccount(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(form);
    onClose();
  };

  return (
    <CustomModal
      open={open}
      type="payment"
      title="정산 계좌 등록"
      description="수익 정산에 사용할 계좌를 등록해주세요"
      confirmText={saving ? "저장 중..." : "저장"}
      cancelText="취소"
      onClose={onClose}
      onConfirm={handleSave}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1.5">은행 선택</label>
          <select
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            className="w-full h-11 px-3 rounded-xl border border-orange-100 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent"
          >
            <option value="">은행을 선택해주세요</option>
            {BANK_LIST.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1.5">계좌번호</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="- 없이 숫자만 입력"
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))}
            className="w-full h-11 px-3 rounded-xl border border-orange-100 bg-white text-stone-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-900 mb-1.5">예금주</label>
          <input
            type="text"
            placeholder="예금주명 입력"
            value={form.accountHolder}
            onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))}
            className="w-full h-11 px-3 rounded-xl border border-orange-100 bg-white text-stone-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange-500)] focus:border-transparent"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </CustomModal>
  );
}
