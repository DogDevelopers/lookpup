"use server";

import { createClient } from "@/lib/supabase/server";
import { PAYMENT_STATUS } from "@/lib/constants";
import type {
  EarningsData,
  EarningsPaymentRow,
  SettlementStatus,
} from "@/features/earnings/types";

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function bookingNumber(reservationId: string, createdAt: string | null) {
  const c = createdAt ? new Date(createdAt) : new Date();
  return `BK-${c.getFullYear()}${pad(c.getMonth() + 1)}${pad(c.getDate())}-${reservationId.slice(-3).toUpperCase()}`;
}

function toSettlementStatus(status: string): SettlementStatus {
  if (status === PAYMENT_STATUS.SETTLED) return "completed";
  if (status === PAYMENT_STATUS.CANCELED || status === PAYMENT_STATUS.PARTIAL_CANCELED) {
    return "canceled";
  }
  return "pending";
}

export async function getMyEarnings(): Promise<EarningsData> {
  const empty: EarningsData = {
    availableBalance: 0,
    totalEarnings: 0,
    thisMonthEarnings: 0,
    pendingSettlement: 0,
    bankAccount: null,
    monthly: [],
    yearly: [],
    rows: [],
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: sitter } = await supabase
    .from("sitters")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sitter) return empty;

  const [{ data: paymentRows }, { data: bankAccountRow }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        `id, reservation_id, amount, settle_amount, platform_fee, status, paid_at, settled_at, auto_confirm_at,
         reservations(created_at, start_datetime, services(title), owner:users!owner_id(full_name))`,
      )
      .eq("sitter_id", sitter.id)
      .in("status", [
        PAYMENT_STATUS.PAID,
        PAYMENT_STATUS.SETTLED,
        PAYMENT_STATUS.CANCELED,
        PAYMENT_STATUS.PARTIAL_CANCELED,
      ])
      .order("paid_at", { ascending: false }),
    supabase
      .from("bank_accounts")
      .select("bank_name, account_number")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const rows: EarningsPaymentRow[] = (paymentRows ?? []).map((row) => {
    const reservation = row.reservations as unknown as {
      created_at: string | null;
      start_datetime: string | null;
      services: { title: string | null } | null;
      owner: { full_name: string | null } | null;
    } | null;

    return {
      id: row.id,
      reservationId: row.reservation_id,
      bookingNo: bookingNumber(row.reservation_id, reservation?.created_at ?? null),
      careDate: reservation?.start_datetime ?? null,
      ownerName: reservation?.owner?.full_name ?? "-",
      serviceType: reservation?.services?.title ?? "-",
      amount: row.amount,
      settleAmount: row.settle_amount,
      platformFee: row.platform_fee,
      status: row.status,
      settlementStatus: toSettlementStatus(row.status),
      paidAt: row.paid_at,
      settledAt: row.settled_at,
      autoConfirmAt: row.auto_confirm_at,
    };
  });

  const completed = rows.filter((r) => r.settlementStatus === "completed");
  const pending = rows.filter((r) => r.settlementStatus === "pending");

  const totalEarnings = completed.reduce((sum, r) => sum + r.settleAmount, 0);
  const pendingSettlement = pending.reduce((sum, r) => sum + r.settleAmount, 0);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthEarnings = rows
    .filter((r) => r.settlementStatus !== "canceled")
    .filter((r) => {
      const at = r.settledAt ?? r.paidAt;
      if (!at) return false;
      const d = new Date(at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return key === thisMonthKey;
    })
    .reduce((sum, r) => sum + r.settleAmount, 0);

  const monthlyMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, 0);
  }
  for (const r of rows) {
    if (r.settlementStatus === "canceled") continue;
    const at = r.settledAt ?? r.paidAt;
    if (!at) continue;
    const d = new Date(at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + r.settleAmount);
    }
  }
  const monthly = Array.from(monthlyMap.entries()).map(([key, amount]) => {
    const month = Number(key.split("-")[1]) - 1;
    return { key, label: MONTH_LABELS[month], amount };
  });

  const yearlyMap = new Map<string, number>();
  for (const r of rows) {
    if (r.settlementStatus === "canceled") continue;
    const at = r.settledAt ?? r.paidAt;
    if (!at) continue;
    const year = String(new Date(at).getFullYear());
    yearlyMap.set(year, (yearlyMap.get(year) ?? 0) + r.settleAmount);
  }
  const yearly = Array.from(yearlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ key, label: `${key}년`, amount }));

  const bankAccount = bankAccountRow
    ? {
        bankName: bankAccountRow.bank_name,
        accountNumberLast4: bankAccountRow.account_number.slice(-4),
      }
    : null;

  return {
    availableBalance: totalEarnings,
    totalEarnings,
    thisMonthEarnings,
    pendingSettlement,
    bankAccount,
    monthly,
    yearly,
    rows,
  };
}
