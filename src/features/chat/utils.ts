import type { ChatMessageRow } from "./types";

export type RawMessageRow = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
};

export function toRow(m: RawMessageRow): ChatMessageRow {
  return {
    id: m.id,
    sender_id: m.sender_id,
    content: m.content,
    is_read: false,
    created_at: m.created_at ?? new Date().toISOString(),
  };
}

export function getPaymentDeadline() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const ACTIVE_RESERVATION_STATUSES = new Set([
  "pending",
  "accepted",
  "paid",
  "in_progress",
]);

export function canLeaveDirectRoom(room: {
  reservationId: string | null;
  reservationStatus: string | null;
}): boolean {
  if (!room.reservationId) return true;
  if (!room.reservationStatus) return false;
  return !ACTIVE_RESERVATION_STATUSES.has(room.reservationStatus);
}

export function canLeaveReservationRequest(rr: {
  reservationStatus: string | null;
}): boolean {
  return rr.reservationStatus !== "pending";
}

export function formatAmPmTime(d: Date): string {
  const hour24 = d.getHours();
  const period = hour24 < 12 ? "오전" : "오후";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${period} ${hour12}:${minute}`;
}

export function formatServiceDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${formatAmPmTime(d)}`;
}
