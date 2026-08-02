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
  availableBalance: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  pendingSettlement: number;
  bankAccount: EarningsBankAccount | null;
  monthly: EarningsMonthPoint[];
  yearly: EarningsYearPoint[];
  rows: EarningsPaymentRow[];
}
