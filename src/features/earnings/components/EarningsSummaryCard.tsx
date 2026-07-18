import { ChevronRight, Wallet } from "lucide-react";
import { formatWon } from "@/features/earnings/utils";
import type { EarningsData } from "@/features/earnings/types";

export default function EarningsSummaryCard({
  data,
  onViewDetail,
}: {
  data: EarningsData;
  onViewDetail: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onViewDetail}
      className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/30"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <Wallet size={16} className="text-orange-500" />
          </div>
          <p className="text-sm font-semibold text-stone-900">수익 관리</p>
        </div>
        <div className="flex items-center gap-0.5 text-xs text-gray-400">
          상세보기
          <ChevronRight size={14} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">출금 가능 금액</p>
          <p className="text-base font-bold text-stone-900 tabular-nums">
            {formatWon(data.availableBalance)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">이번 달 확정 수익</p>
          <p className="text-base font-bold text-stone-900 tabular-nums">
            {formatWon(data.thisMonthEarnings)}
          </p>
        </div>
      </div>
    </button>
  );
}
