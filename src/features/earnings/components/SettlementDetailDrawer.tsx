"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate, formatWon } from "@/features/earnings/utils";
import type { EarningsPaymentRow } from "@/features/earnings/types";

const STATUS_LABEL: Record<EarningsPaymentRow["settlementStatus"], string> = {
  pending: "정산 예정",
  completed: "정산 완료",
  canceled: "취소·조정",
};

function DetailRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm tabular-nums ${emphasis ? "font-bold text-stone-900" : "text-stone-900"}`}>
        {value}
      </span>
    </div>
  );
}

export default function SettlementDetailDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: EarningsPaymentRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>정산 상세 내역</DialogTitle>
          <DialogDescription>예약과 정산에 대한 자세한 내용을 확인할 수 있어요.</DialogDescription>
        </DialogHeader>

        {row && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-1 border-b border-gray-100">
              <span className="text-sm font-medium text-stone-900">{row.bookingNo}</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                {STATUS_LABEL[row.settlementStatus]}
              </span>
            </div>

            <DetailRow label="서비스 종류" value={row.serviceType} />
            <DetailRow label="돌봄 날짜" value={formatDate(row.careDate)} />
            <DetailRow label="보호자" value={row.ownerName} />
            <DetailRow label="결제 금액" value={formatWon(row.amount)} />
            <DetailRow label="추가 요금" value={formatWon(0)} />
            <DetailRow label="할인 금액" value={formatWon(0)} />
            <DetailRow label="플랫폼 수수료" value={`- ${formatWon(row.platformFee)}`} />
            <DetailRow label="최종 정산 금액" value={formatWon(row.settleAmount)} emphasis />
            <DetailRow
              label={row.settlementStatus === "completed" ? "정산 완료일" : "정산 예정일"}
              value={formatDate(row.settledAt ?? row.autoConfirmAt)}
            />

            <p className="mt-3 text-xs text-gray-400 leading-relaxed">
              정산 금액 = 결제 금액 - 플랫폼 수수료
              <br />
              {formatWon(row.amount)} - {formatWon(row.platformFee)} = {formatWon(row.settleAmount)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
