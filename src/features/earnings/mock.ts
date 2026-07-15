import type { EarningsData, EarningsPaymentRow } from "@/features/earnings/types";

const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const OWNER_NAMES = ["김보호", "이산책", "박댕댕", "최냥냥", "정펫"];
const SERVICE_TYPES = ["방문돌봄", "산책", "위탁돌봄", "픽업"];

export type MockEarningsScenario = "full" | "empty" | "no-account" | "zero-balance";

export function buildMockEarnings(scenario: MockEarningsScenario = "full"): EarningsData {
  if (scenario === "empty") {
    return {
      availableBalance: 0,
      totalEarnings: 0,
      thisMonthEarnings: 0,
      pendingSettlement: 0,
      bankAccount: null,
      monthly: Array.from({ length: 12 }, (_, i) => ({
        key: `2026-${String(i + 1).padStart(2, "0")}`,
        label: MONTH_LABELS[i],
        amount: 0,
      })),
      yearly: [{ key: "2026", label: "2026년", amount: 0 }],
      rows: [],
    };
  }

  const now = new Date();

  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const base = 200000 + Math.round(Math.sin(i / 2) * 80000) + i * 15000;
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: MONTH_LABELS[d.getMonth()],
      amount: Math.max(0, base),
    };
  });

  const yearly = [
    { key: "2024", label: "2024년", amount: 1850000 },
    { key: "2025", label: "2025년", amount: 3120000 },
    { key: "2026", label: "2026년", amount: monthly.reduce((sum, m) => sum + m.amount, 0) },
  ];

  const makeRow = (i: number, kind: "pending" | "completed" | "canceled"): EarningsPaymentRow => {
    const amount = 30000 + (i % 5) * 12000;
    const platformFee = Math.floor(amount * 0.1);
    const settleAmount = amount - platformFee;
    const daysAgo = kind === "completed" ? 10 + i * 4 : kind === "canceled" ? 5 + i * 3 : -(i + 1) * 2;
    const at = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `${kind}-${i}`,
      reservationId: `mock-reservation-${kind}-${i}`,
      bookingNo: `BK-20260${(i % 9) + 1}0${(i % 2) + 1}-${String(100 + i)}`,
      careDate: at,
      ownerName: OWNER_NAMES[i % OWNER_NAMES.length],
      serviceType: SERVICE_TYPES[i % SERVICE_TYPES.length],
      amount,
      settleAmount,
      platformFee,
      status: kind === "pending" ? "paid" : kind === "completed" ? "settled" : "canceled",
      settlementStatus: kind,
      paidAt: at,
      settledAt: kind === "completed" ? at : null,
      autoConfirmAt: kind === "pending" ? at : null,
    };
  };

  const pending = Array.from({ length: 4 }, (_, i) => makeRow(i, "pending"));
  const completed = Array.from({ length: 6 }, (_, i) => makeRow(i, "completed"));
  const canceled = Array.from({ length: 2 }, (_, i) => makeRow(i, "canceled"));
  const rows = [...pending, ...completed, ...canceled];

  return {
    availableBalance: scenario === "zero-balance" ? 0 : completed.reduce((sum, r) => sum + r.settleAmount, 0),
    totalEarnings: completed.reduce((sum, r) => sum + r.settleAmount, 0),
    thisMonthEarnings: monthly[monthly.length - 1]?.amount ?? 0,
    pendingSettlement: pending.reduce((sum, r) => sum + r.settleAmount, 0),
    bankAccount: scenario === "no-account" ? null : { bankName: "국민은행", accountNumberLast4: "4821" },
    monthly,
    yearly,
    rows,
  };
}
