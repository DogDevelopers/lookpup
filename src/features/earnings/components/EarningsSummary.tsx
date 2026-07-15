import { CheckCircle2, Clock } from "lucide-react";
import AvailableBalanceCard from "@/features/earnings/components/AvailableBalanceCard";
import { formatWon } from "@/features/earnings/utils";
import type { EarningsData } from "@/features/earnings/types";

function MiniStatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex-1">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-gray-400" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-stone-900 tabular-nums mb-1">{value}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}

export default function EarningsSummary({ data }: { data: EarningsData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <AvailableBalanceCard availableBalance={data.availableBalance} bankAccount={data.bankAccount} />
      <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
        <MiniStatCard
          icon={CheckCircle2}
          label="이번 달 확정 수익"
          value={formatWon(data.thisMonthEarnings)}
          description="돌봄이 완료되어 확정된 금액이에요"
        />
        <MiniStatCard
          icon={Clock}
          label="정산 예정 금액"
          value={formatWon(data.pendingSettlement)}
          description="곧 정산되어 출금 가능해질 금액이에요"
        />
      </div>
    </div>
  );
}
