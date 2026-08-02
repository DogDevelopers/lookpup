"use client";

import dynamic from "next/dynamic";
import { MobileBackButton, DesktopBackButton } from "@/components/common/BackButton";
import EarningsSummary from "@/features/earnings/components/EarningsSummary";
import SettlementHistory from "@/features/earnings/components/SettlementHistory";
import type { EarningsData } from "@/features/earnings/types";

const EarningsStatsChart = dynamic(
  () => import("@/features/earnings/components/EarningsStatsChart"),
  { ssr: false, loading: () => <div className="h-[400px] rounded-2xl border border-gray-200 bg-white animate-pulse" /> },
);

export default function EarningsClient({
  data,
  embedded = false,
  onViewReservations,
}: {
  data: EarningsData;
  embedded?: boolean;
  onViewReservations?: () => void;
}) {
  return (
    <div className={embedded ? "" : "min-h-screen bg-white"}>
      {!embedded && (
        <div className="md:hidden sticky top-16 z-50 bg-white border-b border-gray-100">
          <div className="h-14 px-5 flex items-center gap-3">
            <MobileBackButton />
            <span className="flex-1 font-semibold text-stone-900">수익 관리</span>
          </div>
        </div>
      )}

      <main
        className={
          embedded ? "w-full" : "w-full max-w-[1280px] mx-auto px-4 sm:px-10 pt-6 md:pt-12 pb-10 md:pb-20"
        }
      >
        {!embedded && (
          <div className="hidden md:flex items-center gap-4 mb-8">
            <DesktopBackButton />
            <div>
              <h2 className="text-2xl font-bold text-stone-900">수익 관리</h2>
              <p className="text-sm text-gray-500 mt-1">
                펫시팅 활동으로 발생한 수익과 정산 내역을 확인할 수 있어요.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 md:gap-8">
          <EarningsSummary data={data} />
          <EarningsStatsChart monthly={data.monthly} yearly={data.yearly} />
          <SettlementHistory rows={data.rows} onViewReservations={onViewReservations} />
        </div>
      </main>
    </div>
  );
}
