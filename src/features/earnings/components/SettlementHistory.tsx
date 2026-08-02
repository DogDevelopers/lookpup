"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import EarningsEmptyState from "@/features/earnings/components/EarningsEmptyState";
import SettlementFilters, {
  type SettlementFilterValue,
  type SettlementTab,
} from "@/features/earnings/components/SettlementFilters";
import SettlementDetailDrawer from "@/features/earnings/components/SettlementDetailDrawer";
import { formatDate, formatWon } from "@/features/earnings/utils";
import type { EarningsPaymentRow, SettlementStatus } from "@/features/earnings/types";

const STATUS_BADGE: Record<SettlementStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "정산 예정", bg: "#FFF7ED", text: "#C2410C" },
  completed: { label: "정산 완료", bg: "#F0FDF4", text: "#15803D" },
  canceled: { label: "취소·조정", bg: "#FEF2F2", text: "#B91C1C" },
};

function StatusBadge({ status }: { status: SettlementStatus }) {
  const config = STATUS_BADGE[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: config.bg, color: config.text }}
    >
      {config.label}
    </span>
  );
}

const DEFAULT_FILTERS: SettlementFilterValue = { startDate: "", endDate: "", sort: "latest" };

export default function SettlementHistory({
  rows,
  onViewReservations,
}: {
  rows: EarningsPaymentRow[];
  onViewReservations?: () => void;
}) {
  const [tab, setTab] = useState<SettlementTab>("all");
  const [filters, setFilters] = useState<SettlementFilterValue>(DEFAULT_FILTERS);
  const [selectedRow, setSelectedRow] = useState<EarningsPaymentRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (tab !== "all") {
      result = result.filter((r) => r.settlementStatus === tab);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      result = result.filter((r) => r.paidAt && new Date(r.paidAt).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      result = result.filter((r) => r.paidAt && new Date(r.paidAt).getTime() <= end);
    }

    const sorted = [...result].sort((a, b) => {
      const aTime = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const bTime = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      return filters.sort === "latest" ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [rows, tab, filters]);

  const handleRowClick = (row: EarningsPaymentRow) => {
    setSelectedRow(row);
    setDrawerOpen(true);
  };

  const handleReset = () => {
    setTab("all");
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h3 className="font-semibold text-stone-900 mb-4">수익 및 정산 내역</h3>

      <SettlementFilters
        activeTab={tab}
        onTabChange={setTab}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={handleReset}
      />

      <div className="mt-5">
        {rows.length === 0 ? (
          <EarningsEmptyState
            icon={Receipt}
            title="아직 수익 내역이 없어요"
            description="완료된 돌봄의 결제가 확정되면 이곳에 표시돼요"
            action={
              onViewReservations ? (
                <button
                  type="button"
                  onClick={onViewReservations}
                  className="inline-flex h-9 items-center px-4 rounded-lg border border-gray-200 text-sm font-medium text-stone-900 hover:border-orange-300 transition-colors"
                >
                  예약 내역 보기
                </button>
              ) : (
                <Link
                  href="/myprofile/works"
                  className="inline-flex h-9 items-center px-4 rounded-lg border border-gray-200 text-sm font-medium text-stone-900 hover:border-orange-300 transition-colors"
                >
                  예약 내역 보기
                </Link>
              )
            }
          />
        ) : filteredRows.length === 0 ? (
          <EarningsEmptyState
            icon={Receipt}
            title="조건에 맞는 내역이 없어요"
            description="필터를 초기화하고 다시 확인해보세요"
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                    <th className="py-2.5 pr-3 font-medium">발생일</th>
                    <th className="py-2.5 pr-3 font-medium">돌봄 서비스</th>
                    <th className="py-2.5 pr-3 font-medium">보호자</th>
                    <th className="py-2.5 pr-3 font-medium text-right">결제 금액</th>
                    <th className="py-2.5 pr-3 font-medium text-right">수수료</th>
                    <th className="py-2.5 pr-3 font-medium text-right">정산 금액</th>
                    <th className="py-2.5 pr-3 font-medium">정산 예정·완료일</th>
                    <th className="py-2.5 pr-3 font-medium">상태</th>
                    <th className="py-2.5 font-medium sr-only">상세 보기</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleRowClick(row)}
                      className="border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="py-3 pr-3 text-gray-500 tabular-nums whitespace-nowrap">
                        {formatDate(row.paidAt)}
                      </td>
                      <td className="py-3 pr-3 text-stone-900 whitespace-nowrap">{row.serviceType}</td>
                      <td className="py-3 pr-3 text-stone-900 whitespace-nowrap">{row.ownerName}</td>
                      <td className="py-3 pr-3 text-right text-stone-900 tabular-nums whitespace-nowrap">
                        {formatWon(row.amount)}
                      </td>
                      <td className="py-3 pr-3 text-right text-gray-500 tabular-nums whitespace-nowrap">
                        {formatWon(row.platformFee)}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-stone-900 tabular-nums whitespace-nowrap">
                        {formatWon(row.settleAmount)}
                      </td>
                      <td className="py-3 pr-3 text-gray-500 tabular-nums whitespace-nowrap">
                        {formatDate(row.settledAt ?? row.autoConfirmAt)}
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <StatusBadge status={row.settlementStatus} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(row);
                          }}
                          className="text-xs text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col gap-3">
              {filteredRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleRowClick(row)}
                  className="text-left rounded-xl border border-gray-200 p-4 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-900">{row.serviceType}</span>
                    <StatusBadge status={row.settlementStatus} />
                  </div>
                  <p className="text-lg font-bold text-stone-900 tabular-nums mb-2">
                    {formatWon(row.settleAmount)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>발생 {formatDate(row.paidAt)}</span>
                    <span>정산 {formatDate(row.settledAt ?? row.autoConfirmAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <SettlementDetailDrawer row={selectedRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
