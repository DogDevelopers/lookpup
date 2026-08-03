"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth-guard";
import { getServerEnv } from "@/lib/env";
import { RESERVATION_STATUS, EXTRA_CHARGE_STATUS, PAYMENT_STATUS } from "@/lib/constants";
import { fetchPublicProfiles } from "@/lib/public-profiles";

type PayMethod = "CARD" | "VIRTUAL_ACCOUNT" | "TRANSFER";

type ActionResult = { ok: true } | { ok: false; error: string };

export type CreatePaymentResult =
  | { ok: true; paymentId: string; amount: number; orderName: string }
  | { ok: false; error: string };

export type CreateExtraPaymentResult =
  | { ok: true; paymentId: string; amount: number; orderName: string; reason: string }
  | { ok: false; error: string };

export type CancelPaymentResult =
  | { ok: true; canceledAmount: number }
  | { ok: false; error: string };

async function sitterName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sitters: unknown,
): Promise<string> {
  const sitter = sitters as { user_id: string } | null;
  if (!sitter) return "펫시터";

  const profiles = await fetchPublicProfiles(supabase, [sitter.user_id]);
  return profiles.get(sitter.user_id)?.full_name ?? "펫시터";
}

export async function getActiveReservationBySitter(
  sitterId: string,
  options?: { includePaid?: boolean },
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const statuses = options?.includePaid
    ? [RESERVATION_STATUS.ACCEPTED, RESERVATION_STATUS.IN_PROGRESS, RESERVATION_STATUS.PAID]
    : [RESERVATION_STATUS.ACCEPTED, RESERVATION_STATUS.IN_PROGRESS];

  const { data } = await supabase
    .from("reservations")
    .select("id")
    .eq("owner_id", user.id)
    .eq("sitter_id", sitterId)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function createPayment(
  reservationId: string,
  payMethod: PayMethod,
): Promise<CreatePaymentResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, owner_id, sitter_id, total_price, status, sitters(user_id)")
    .eq("id", reservationId)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };
  if (reservation.owner_id !== user.id) return { ok: false, error: "결제 권한이 없습니다." };
  if (reservation.status !== RESERVATION_STATUS.ACCEPTED) {
    return { ok: false, error: "수락된 예약만 결제할 수 있습니다." };
  }

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("status", PAYMENT_STATUS.PAID)
    .maybeSingle();
  if (existingPayment) return { ok: false, error: "이미 결제된 예약입니다." };

  const amount = reservation.total_price;
  if (amount < 1000) {
    return { ok: false, error: "예약 금액이 올바르지 않습니다. 관리자에게 문의해주세요." };
  }

  const paymentId = `pay_${reservationId.replace(/-/g, "")}_${Date.now()}`;

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert({
      reservation_id: reservationId,
      payment_id: paymentId,
      owner_id: user.id,
      sitter_id: reservation.sitter_id,
      amount,
      pay_method: payMethod,
      status: PAYMENT_STATUS.READY,
    })
    .select("id, fee_rate")
    .single();

  if (error || !inserted) return { ok: false, error: "결제 생성에 실패했습니다." };

  const platformFee = Math.floor(amount * inserted.fee_rate);
  const settleAmount = amount - platformFee;
  await supabase
    .from("payments")
    .update({ platform_fee: platformFee, settle_amount: settleAmount })
    .eq("id", inserted.id);

  const orderName = `${await sitterName(supabase, reservation.sitters)} 펫시팅 서비스`;

  return { ok: true, paymentId, amount, orderName };
}

export async function createExtraPayment(
  extraChargeId: string,
  payMethod: PayMethod = "CARD",
): Promise<CreateExtraPaymentResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: pendingCharge } = await supabase
    .from("extra_charges")
    .select("id, amount, reason, reservation_id, owner_id")
    .eq("id", extraChargeId)
    .eq("status", EXTRA_CHARGE_STATUS.PENDING)
    .maybeSingle();

  if (!pendingCharge) {
    return { ok: false, error: "결제할 추가금 요청을 찾을 수 없습니다. 새로고침 후 다시 시도해주세요." };
  }
  if (pendingCharge.owner_id !== user.id) return { ok: false, error: "결제 권한이 없습니다." };

  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, sitter_id, status, sitters(user_id)")
    .eq("id", pendingCharge.reservation_id)
    .maybeSingle();

  if (!reservation) return { ok: false, error: "예약을 찾을 수 없습니다." };
  if (![RESERVATION_STATUS.IN_PROGRESS, RESERVATION_STATUS.PAID].includes(
    reservation.status as typeof RESERVATION_STATUS.IN_PROGRESS,
  )) {
    return { ok: false, error: "진행 중인 예약에만 추가금을 결제할 수 있습니다." };
  }

  const amount = pendingCharge.amount;
  if (amount < 1000 || amount > 500000) {
    return { ok: false, error: "추가금은 1,000원 이상 500,000원 이하여야 합니다." };
  }

  const paymentId = `extra_${pendingCharge.reservation_id.replace(/-/g, "")}_${Date.now()}`;

  const { data: inserted, error } = await supabase
    .from("payments")
    .insert({
      reservation_id: pendingCharge.reservation_id,
      payment_id: paymentId,
      owner_id: user.id,
      sitter_id: reservation.sitter_id,
      amount,
      pay_method: payMethod,
      status: PAYMENT_STATUS.READY,
    })
    .select("id, fee_rate")
    .single();

  if (error || !inserted) return { ok: false, error: "결제 생성에 실패했습니다." };

  const platformFee = Math.floor(amount * inserted.fee_rate);
  const settleAmount = amount - platformFee;
  await supabase
    .from("payments")
    .update({ platform_fee: platformFee, settle_amount: settleAmount })
    .eq("id", inserted.id);

  await supabase
    .from("extra_charges")
    .update({
      status: EXTRA_CHARGE_STATUS.ACCEPTED,
      payment_id: inserted.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", pendingCharge.id);

  const orderName = `${await sitterName(supabase, reservation.sitters)} 펫시팅 추가 서비스`;

  return { ok: true, paymentId, amount, orderName, reason: pendingCharge.reason };
}

export async function cancelPendingPayment(paymentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, owner_id, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (!payment || payment.owner_id !== user.id) return { ok: true };
  if (payment.status !== PAYMENT_STATUS.READY) return { ok: true };

  await supabase.from("payments").update({ status: PAYMENT_STATUS.FAILED }).eq("id", payment.id);
  await supabase
    .from("extra_charges")
    .update({ status: EXTRA_CHARGE_STATUS.PENDING, payment_id: null })
    .eq("payment_id", payment.id)
    .eq("status", EXTRA_CHARGE_STATUS.ACCEPTED);

  return { ok: true };
}

export async function verifyAndConfirmPayment(paymentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, reservation_id, owner_id, amount, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, error: "결제 정보를 찾을 수 없습니다." };
  if (payment.owner_id !== user.id) return { ok: false, error: "권한이 없습니다." };
  if (payment.status === PAYMENT_STATUS.PAID) return { ok: true };

  const { PORTONE_API_SECRET } = getServerEnv();
  const portoneRes = await fetch(`https://api.portone.io/payments/${paymentId}`, {
    headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` },
    cache: "no-store",
  });

  if (!portoneRes.ok) return { ok: false, error: "PortOne 결제 조회 실패" };

  const portonePayment: { amount?: { total?: number } } = await portoneRes.json();
  const paidAmount = portonePayment?.amount?.total;

  if (paidAmount !== payment.amount) {
    return { ok: false, error: "결제 금액이 일치하지 않습니다." };
  }

  const now = new Date().toISOString();
  await supabase.from("payments").update({ status: PAYMENT_STATUS.PAID, paid_at: now }).eq("id", payment.id);

  const { data: paidPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("reservation_id", payment.reservation_id)
    .eq("status", PAYMENT_STATUS.PAID);

  const totalPrice = (paidPayments ?? []).reduce((sum, p) => sum + p.amount, 0);

  const { data: reservation } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", payment.reservation_id)
    .maybeSingle();

  if (reservation?.status === RESERVATION_STATUS.ACCEPTED) {
    await supabase
      .from("reservations")
      .update({ status: RESERVATION_STATUS.PAID, paid_at: now, total_price: totalPrice })
      .eq("id", payment.reservation_id);
  } else {
    await supabase.from("reservations").update({ total_price: totalPrice }).eq("id", payment.reservation_id);
  }

  return { ok: true };
}

export async function cancelPayment(paymentId: string, reason: string): Promise<CancelPaymentResult> {
  const supabase = await createClient();
  const auth = await requireActiveUser(supabase);
  if (!auth.ok) return auth;
  const { user } = auth;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, payment_id, amount, status, reservations(id, owner_id, start_datetime, status)")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (!payment) return { ok: false, error: "결제 정보를 찾을 수 없습니다." };

  const reservation = payment.reservations as unknown as {
    id: string;
    owner_id: string;
    start_datetime: string | null;
    status: string;
  } | null;

  if (!reservation || reservation.owner_id !== user.id) return { ok: false, error: "취소 권한이 없습니다." };
  if (payment.status !== PAYMENT_STATUS.PAID) return { ok: false, error: "결제 완료 상태만 취소할 수 있습니다." };
  if (reservation.start_datetime && new Date(reservation.start_datetime) <= new Date()) {
    return { ok: false, error: "서비스 시작 후에는 취소할 수 없습니다." };
  }

  const { PORTONE_API_SECRET } = getServerEnv();
  const portoneRes = await fetch(`https://api.portone.io/payments/${paymentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `PortOne ${PORTONE_API_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
    cache: "no-store",
  });

  if (!portoneRes.ok) {
    const errorBody: { message?: string } = await portoneRes.json().catch(() => ({}));
    return { ok: false, error: errorBody.message ?? "결제 취소 요청에 실패했습니다." };
  }

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from("payments")
      .update({ status: PAYMENT_STATUS.CANCELED, canceled_at: now })
      .eq("payment_id", paymentId),
    supabase
      .from("reservations")
      .update({ status: RESERVATION_STATUS.CANCELED, canceled_at: now })
      .eq("id", reservation.id),
  ]);

  return { ok: true, canceledAmount: payment.amount };
}
