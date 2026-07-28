export type SettlementStatus = "pending" | "completed" | "canceled";

export interface EarningsPaymentRow {
  id: string;
  reservationId: string;
  bookingNo: string;
  careDate: string | null;
  ownerName: string;
  serviceType: string;
  amount: number;
  settleAmount: number;
  platformFee: number;
  status: string;
  settlementStatus: SettlementStatus;
  paidAt: string | null;
  settledAt: string | null;
  autoConfirmAt: string | null;
}

export interface EarningsMonthPoint {
  key: string;
  label: string;
  amount: number;
}

export interface EarningsYearPoint {
  key: string;
  label: string;
  amount: number;
}

export interface EarningsBankAccount {
  bankName: string;
  accountNumberLast4: string;
}

export interface EarningsData {
  /** 출금 가능 금액: 현재는 별도 출금 이력이 없어 누적 정산 금액과 동일하게 계산 */
  availableBalance: number;
  /** 누적 정산 금액 (정산 완료 건의 정산 금액 합계) */
  totalEarnings: number;
  /** 이번 달 확정 수익 */
  thisMonthEarnings: number;
  /** 정산 예정 금액 */
  pendingSettlement: number;
  bankAccount: EarningsBankAccount | null;
  monthly: EarningsMonthPoint[];
  yearly: EarningsYearPoint[];
  rows: EarningsPaymentRow[];
}
