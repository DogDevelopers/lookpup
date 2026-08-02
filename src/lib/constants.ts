
export const REQUEST_STATUS = {
  OPEN: "open",
  MATCHED: "matched",
  CLOSED: "closed",
  CANCELED: "canceled",
} as const;

export const APPLICATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CANCELED: "canceled",
} as const;

export const WITHDRAW_REASON_VALUES = [
  "low_usage",
  "no_service",
  "inconvenient",
  "privacy",
  "other",
] as const;

export type WithdrawReason = (typeof WITHDRAW_REASON_VALUES)[number];

export const WITHDRAW_REASONS: { value: WithdrawReason; label: string }[] = [
  { value: "low_usage", label: "이용 빈도가 낮음" },
  { value: "no_service", label: "원하는 서비스가 없음" },
  { value: "inconvenient", label: "이용이 불편함" },
  { value: "privacy", label: "개인정보 보호 우려" },
  { value: "other", label: "기타" },
];

export const SITTER_STATUS_VALUES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;

export type SitterStatus = (typeof SITTER_STATUS_VALUES)[number];

export const RESERVATION_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PAID: "paid",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELED: "canceled",
} as const;

export type ReservationStatus =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const PAYMENT_STATUS = {
  READY: "ready",
  PAID: "paid",
  PARTIAL_CANCELED: "partial_canceled",
  CANCELED: "canceled",
  FAILED: "failed",
  SETTLED: "settled",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const EXTRA_CHARGE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  PAID: "paid",
  CANCELED: "canceled",
} as const;

export type ExtraChargeStatus =
  (typeof EXTRA_CHARGE_STATUS)[keyof typeof EXTRA_CHARGE_STATUS];

export const ROOM_TYPE = {
  REQUEST: "request",
  DIRECT: "direct",
  RESERVATION_REQUEST: "reservation_request",
} as const;

export type RoomType = (typeof ROOM_TYPE)[keyof typeof ROOM_TYPE];
