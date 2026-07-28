"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import EarningsEmptyState from "@/features/earnings/components/EarningsEmptyState";
import { formatWon } from "@/features/earnings/utils";
import type { EarningsMonthPoint, EarningsYearPoint } from "@/features/earnings/types";

type Period = "monthly" | "yearly";

const chartConfig = {
  amount: {
    label: "수익",
    color: "var(--color-orange-500)",
  },
} satisfies ChartConfig;

const WINDOW_SIZE: Record<Period, number> = { monthly: 6, yearly: 3 };

export default function EarningsStatsChart({
  monthly,
  yearly,
}: {
  monthly: EarningsMonthPoint[];
  yearly: EarningsYearPoint[];
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [offset, setOffset] = useState(0);

  const source = period === "monthly" ? monthly : yearly;
  const windowSize = WINDOW_SIZE[period];
  const maxOffset = Math.max(0, source.length - windowSize);
  const clampedOffset = Math.min(offset, maxOffset);
  const start = Math.max(0, source.length - windowSize - clampedOffset);
  const windowData = source.slice(start, start + windowSize);

  const hasData = windowData.some((d) => d.amount > 0);
  const periodLabel = useMemo(() => {
    if (windowData.length === 0) return "-";
    const first = windowData[0]?.label;
    const last = windowData[windowData.length - 1]?.label;
    return first === last ? first : `${first} - ${last}`;
  }, [windowData]);

  const handlePeriodChange = (next: Period) => {
    setPeriod(next);
    setOffset(0);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-stone-900">수익 통계</h3>
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1 self-start sm:self-auto">
          {(["monthly", "yearly"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                period === p ? "bg-orange-500 text-white" : "text-gray-500 hover:text-stone-900"
              }`}
            >
              {p === "monthly" ? "월간" : "연간"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
          disabled={clampedOffset >= maxOffset}
          aria-label="이전 기간"
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-stone-900 tabular-nums min-w-[120px] text-center">
          {periodLabel}
        </span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={clampedOffset <= 0}
          aria-label="다음 기간"
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:border-orange-300 disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {!hasData ? (
        <EarningsEmptyState
          icon={BarChart3}
          title="아직 집계된 수익이 없어요"
          description="돌봄이 완료되면 수익 통계를 확인할 수 있어요"
          className="h-[260px] justify-center"
        />
      ) : (
        <ChartContainer config={chartConfig} className="w-full h-[280px]">
          <BarChart data={windowData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-gray-100, #f3f4f6)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(value) => formatWon(Number(value))} />}
            />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={[6, 6, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
