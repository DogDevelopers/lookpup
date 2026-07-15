"use client";

import Link from "next/link";
import { useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatWon } from "@/features/earnings/utils";
import type { EarningsBankAccount } from "@/features/earnings/types";

export default function AvailableBalanceCard({
  availableBalance,
  bankAccount,
}: {
  availableBalance: number;
  bankAccount: EarningsBankAccount | null;
}) {
  const [withdrawing, setWithdrawing] = useState(false);
  const hasBalance = availableBalance > 0;

  const handleWithdraw = () => {
    setWithdrawing(true);
    // 실제 출금 처리(계좌 이체) 연동 전 단계이므로, 신청 접수만 안내합니다.
    setTimeout(() => {
      setWithdrawing(false);
      toast.success("출금 신청이 접수되었어요. 영업일 기준 1~2일 내 입금돼요.");
    }, 600);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
          <Wallet size={18} className="text-orange-500" />
        </div>
        <p className="text-sm font-medium text-gray-500">출금 가능 금액</p>
      </div>

      <p className="text-[2rem] leading-tight font-bold text-stone-900 tabular-nums mb-1">
        {formatWon(availableBalance)}
      </p>

      <p className="text-xs text-gray-400 mb-6">
        최소 출금 금액 10,000원 · 신청 후 영업일 기준 1~2일 내 입금돼요
      </p>

      <div className="mt-auto flex flex-col gap-3">
        {bankAccount ? (
          <p className="text-xs text-gray-500">
            {bankAccount.bankName} · <span className="tabular-nums">{bankAccount.accountNumberLast4}</span>
          </p>
        ) : (
          <p className="text-xs text-gray-500">정산받을 계좌가 등록되어 있지 않아요</p>
        )}

        {bankAccount ? (
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={!hasBalance || withdrawing}
            aria-label="출금 신청"
            className="h-11 w-full rounded-xl bg-orange-500 text-white text-sm font-semibold transition-colors hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2"
          >
            {withdrawing ? "처리 중..." : "출금 신청"}
          </button>
        ) : (
          <Link
            href="/myprofile/settings?tab=bank"
            className="h-11 w-full rounded-xl bg-orange-500 text-white text-sm font-semibold flex items-center justify-center transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2"
          >
            정산 계좌 등록
          </Link>
        )}
      </div>
    </div>
  );
}
