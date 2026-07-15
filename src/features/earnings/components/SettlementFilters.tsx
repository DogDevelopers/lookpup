"use client";

import { RotateCcw } from "lucide-react";
import type { SettlementStatus } from "@/features/earnings/types";

export type SettlementTab = "all" | SettlementStatus;
export type SortOrder = "latest" | "oldest";

export interface SettlementFilterValue {
  startDate: string;
  endDate: string;
  sort: SortOrder;
}

const TABS: { id: SettlementTab; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "pending", label: "정산 예정" },
  { id: "completed", label: "정산 완료" },
  { id: "canceled", label: "취소·조정" },
];

export default function SettlementFilters({
  activeTab,
  onTabChange,
  filters,
  onFiltersChange,
  onReset,
}: {
  activeTab: SettlementTab;
  onTabChange: (tab: SettlementTab) => void;
  filters: SettlementFilterValue;
  onFiltersChange: (filters: SettlementFilterValue) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-gray-50 border border-gray-200 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? "bg-orange-500 text-white" : "text-gray-500 hover:text-stone-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <label className="sr-only" htmlFor="settlement-start-date">시작일</label>
          <input
            id="settlement-start-date"
            type="date"
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className="h-9 flex-1 min-w-0 rounded-lg border border-gray-200 px-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          />
          <span className="text-xs text-gray-400 shrink-0">~</span>
          <label className="sr-only" htmlFor="settlement-end-date">종료일</label>
          <input
            id="settlement-end-date"
            type="date"
            value={filters.endDate}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className="h-9 flex-1 min-w-0 rounded-lg border border-gray-200 px-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="settlement-sort">정렬</label>
          <select
            id="settlement-sort"
            value={filters.sort}
            onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value as SortOrder })}
            className="h-9 rounded-lg border border-gray-200 px-2.5 text-xs text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>

          <button
            type="button"
            onClick={onReset}
            aria-label="필터 초기화"
            className="h-9 px-2.5 rounded-lg border border-gray-200 flex items-center gap-1 text-xs text-gray-500 hover:border-orange-300 hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            <RotateCcw size={13} />
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}
